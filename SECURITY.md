# StickerNest Security Documentation

## Security Audit Summary (December 2024)

This document summarizes the security architecture and audit findings for StickerNest v2.

---

## 1. Widget Iframe Sandboxing

### Implementation
All widgets run in sandboxed iframes with restricted permissions:

```javascript
iframe.sandbox = 'allow-scripts';
```

### Security Properties
- **No `allow-same-origin`**: Prevents sandbox escape vulnerability where a widget could remove its own sandbox attribute
- **No `allow-forms`**: Prevents form submissions that could leak data
- **No `allow-popups`**: Prevents popup abuse
- **No `allow-top-navigation`**: Prevents navigation attacks

### CSP Headers
Widget iframes inject Content-Security-Policy meta tags:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
  frame-src 'none';
  object-src 'none';
  base-uri 'none';
">
```

---

## 2. PostMessage Security

### Origin Validation
All `postMessage` handlers validate message sources:

#### WidgetSandboxHost.ts
```javascript
// SECURITY: Origin validation
if (event.origin !== 'null' && event.origin !== window.location.origin) {
  return; // Reject unexpected origins
}

// SECURITY: Source validation
const isFromThisWidget = this.iframe?.contentWindow === event.source;
if (!isFromThisWidget) return;
```

#### WidgetIOBridge.ts
```javascript
// Verify the source iframe is registered
const matchingEntry = Array.from(this.iframeRegistry.entries()).find(
  ([, el]) => el.contentWindow === event.source
);
```

#### WidgetThemeInjector.ts
```javascript
// SECURITY: Validate that the message comes from the registered iframe
if (!iframe || iframe.contentWindow !== event.source) {
  return;
}
```

---

## 3. Cross-Canvas Communication

### BroadcastChannel Security
- BroadcastChannel API is same-origin only (browser enforced)
- Messages are validated using Zod schemas (`validateRuntimeMessage()`)
- Loop prevention via `seenBy` arrays and hop count limits (max 10)
- TTL expiration for stale messages

### Message Validation Schema
```typescript
const RuntimeMessageSchema = z.object({
  v: z.literal(1),
  id: z.string(),
  source: RuntimeMessageSourceSchema,
  target: RuntimeMessageTargetSchema,
  channel: RuntimeMessageChannelSchema,
  type: z.string(),
  payload: z.any(),
  timestamp: z.number(),
  identity: RuntimeMessageIdentitySchema,
  loopGuard: LoopGuardSchema,
  // ... additional fields
});
```

### Disabled Features
- **transformPayload**: Disabled due to code injection risk (previously used `new Function()`)

---

## 4. Sensitive Data Handling

### Known Storage Locations

| Data Type | Storage | Risk Level | Notes |
|-----------|---------|------------|-------|
| Auth Tokens | localStorage | Medium | Accessible to XSS attacks |
| User Profiles | localStorage | Low | PII cached locally |
| API Keys | sessionStorage | High | Accessible to page scripts |
| Canvas Data | localStorage | Low | User content stored locally |

### Recommendations

1. **API Keys**: Should be handled server-side. Client-side storage should be avoided.
2. **Auth Tokens**: Consider using HTTP-only cookies for both access and refresh tokens.
3. **Canvas Content**: Currently stored locally; sensitive content is not encrypted.

### Production Console Stripping
Console logs are stripped in production builds to prevent information leakage:
```javascript
// vite.config.ts
esbuild: {
  drop: mode === 'production' ? ['console', 'debugger'] : [],
}
```

---

## 5. External Embedding Security

If StickerNest is embedded in external sites (Notion, etc.):

### Protections in Place
1. All postMessage handlers validate `event.source` matches registered iframes
2. Origin validation rejects messages from unexpected sources
3. Widget iframes cannot access parent document (no `allow-same-origin`)

### Limitations
1. localStorage/sessionStorage is accessible to embedder if same-origin
2. Canvas data persisted in localStorage could be read by embedder

### Recommendation
For sensitive deployments, consider running StickerNest on a separate subdomain.

---

## 6. XSS Prevention

### Sanitization
- Text content uses `textContent` instead of `innerHTML` (TextEntityRenderer.tsx)
- SVG backgrounds sanitized via `sanitizeSvg()` function
- Code output escapes HTML entities

### Dangerous Patterns Removed
- `dangerouslySetInnerHTML` usage audited and secured
- No dynamic code execution via `eval()` or `new Function()`

---

## 7. Memory Management

### Widget Cleanup
WidgetSandboxHost properly cleans up resources:
```javascript
async unmount(): Promise<void> {
  // Unsubscribe from EventBus
  this.eventSubscriptions.forEach(unsub => unsub());

  // Remove message handler
  window.removeEventListener('message', this.messageHandler);

  // Remove iframe from DOM
  if (this.iframe?.parentElement) {
    this.iframe.parentElement.removeChild(this.iframe);
  }
}
```

### EventBus Subscriptions
All subscriptions return unsubscribe functions that must be called on cleanup.

---

## 8. Security Checklist for Developers

### Adding New PostMessage Handlers
- [ ] Validate `event.origin` is expected ('null' for sandboxed iframes, or same-origin)
- [ ] Validate `event.source` matches a registered iframe
- [ ] Validate message structure before processing
- [ ] Never use `eval()` or `new Function()` on message payloads

### Adding New Widget Features
- [ ] Widgets cannot access `window.parent` properties (only `postMessage`)
- [ ] Widgets cannot access `localStorage`/`sessionStorage`
- [ ] Widgets cannot navigate parent or top windows
- [ ] All communication goes through the bridge protocol

### Storing Sensitive Data
- [ ] Never store API keys in localStorage/sessionStorage
- [ ] Use HTTP-only cookies for authentication tokens when possible
- [ ] Avoid logging sensitive data (use secureLogger utility)

---

## 9. Vulnerability Response

If you discover a security vulnerability, please:

1. **Do not** disclose publicly until patched
2. Contact the security team
3. Provide detailed reproduction steps

---

## 10. Audit Log

| Date | Area | Finding | Status |
|------|------|---------|--------|
| Dec 2024 | CanvasRouter | Code injection via transformPayload | Fixed |
| Dec 2024 | WidgetSandboxHost | Missing allow-same-origin removal | Fixed |
| Dec 2024 | WidgetThemeInjector | Missing source validation | Fixed |
| Dec 2024 | TextEntityRenderer | XSS via innerHTML | Fixed |
| Dec 2024 | Console logs | Info leakage in production | Fixed |
| Dec 2024 | API Keys | Stored in sessionStorage | Documented |
