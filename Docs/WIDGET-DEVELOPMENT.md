# StickerNest v2 — Widget Development Guide

This guide covers how to create widgets and common issues/fixes encountered during development.

---

## Widget Protocol v3.0 Overview

Widgets in StickerNest v2 are self-contained HTML/JS applications that run in sandboxed iframes and communicate with the host application via the **postMessage API**. This is a critical change from earlier versions.

**Key Principles:**
1. **Isolation**: Widgets run in iframes with `sandbox="allow-scripts allow-same-origin"`
2. **Communication**: All messaging uses `window.parent.postMessage()`
3. **Handshake**: Widgets MUST signal readiness with a `READY` message
4. **Port Matching**: Event types MUST match manifest `io.inputs[]` and `io.outputs[]` IDs

---

## Quick Start: Creating a Widget

### 1. File Structure

```
public/test-widgets/my-widget/
  manifest.json
  index.html
```

### 2. Manifest Template (v3.0 - io format)

```json
{
    "id": "my-widget",
    "name": "My Widget",
    "version": "1.0.0",
    "description": "What this widget does",
    "entry": "index.html",
    "category": "utility",
    "size": {
        "defaultWidth": 220,
        "defaultHeight": 200,
        "minWidth": 160,
        "minHeight": 140
    },
    "io": {
        "inputs": [
            { "id": "trigger", "name": "Trigger", "type": "event", "description": "Triggers this widget" },
            { "id": "data", "name": "Data", "type": "any", "description": "Receives data from other widgets" }
        ],
        "outputs": [
            { "id": "result", "name": "Result", "type": "any", "description": "Output from this widget" },
            { "id": "clicked", "name": "Clicked", "type": "void", "description": "Emitted when clicked" }
        ]
    }
}
```

**Important Manifest Fields:**
- `id`: Lowercase, alphanumeric with hyphens only (e.g., `my-cool-widget`)
- `version`: Semantic version format (X.Y.Z)
- `entry`: Usually `index.html`
- `size`: Recommended for proper layout
- `io.inputs[]`: Events this widget can RECEIVE
- `io.outputs[]`: Events this widget can EMIT

### 3. Widget HTML Template (Protocol v3.0)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        :root {
            /* StickerNest theme tokens */
            --sn-bg-primary: #0f0f19;
            --sn-bg-secondary: #1a1a2e;
            --sn-bg-tertiary: #252538;
            --sn-text-primary: #e2e8f0;
            --sn-text-secondary: #94a3b8;
            --sn-accent-primary: #8b5cf6;
            --sn-success: #22c55e;
            --sn-error: #ef4444;
            --sn-border-primary: rgba(139, 92, 246, 0.2);
            --sn-radius-md: 6px;
            --sn-radius-lg: 8px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--sn-bg-primary);
            color: var(--sn-text-primary);
            min-height: 100vh;
            padding: 12px;
        }
        .sn-panel {
            background: var(--sn-bg-secondary);
            border: 1px solid var(--sn-border-primary);
            border-radius: var(--sn-radius-md);
            padding: 16px;
        }
        .sn-button {
            background: var(--sn-accent-primary);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: var(--sn-radius-md);
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="sn-panel">
        <div id="content">My Widget</div>
        <button class="sn-button" id="actionBtn">Click Me</button>
    </div>

    <script>
        // ========================================
        // PROTOCOL v3.0: postMessage Communication
        // ========================================

        /**
         * Emit an event to other widgets
         * CRITICAL: portId MUST match one of your io.outputs[].id values!
         */
        function emit(portId, data) {
            window.parent.postMessage({
                type: 'widget:emit',
                payload: {
                    type: portId,    // Must match io.outputs[].id
                    payload: data
                }
            }, '*');
        }

        /**
         * Listen for events from other widgets
         * Event types will match io.inputs[].id values
         */
        window.addEventListener('message', (event) => {
            // Handle widget events (matches io.inputs[].id)
            if (event.data.type === 'widget:event') {
                const eventType = event.data.payload?.type;
                const eventPayload = event.data.payload?.payload;

                // Handle based on your declared inputs
                if (eventType === 'trigger') {
                    // Handle trigger input
                    console.log('Triggered!');
                }
                if (eventType === 'data') {
                    // Handle data input
                    document.getElementById('content').textContent = JSON.stringify(eventPayload);
                }
            }

            // Handle direct pipeline inputs (alternative format)
            if (event.data.type === 'pipeline:input') {
                const portName = event.data.portName;
                const value = event.data.value;
                // Handle input
            }
        });

        // Button click handler - emit to declared output port
        document.getElementById('actionBtn').addEventListener('click', () => {
            emit('clicked', { timestamp: Date.now() });
            emit('result', { action: 'button_clicked' });
        });

        // ========================================
        // REQUIRED: Signal that widget is ready
        // ========================================
        window.parent.postMessage({ type: 'READY' }, '*');
    </script>
</body>
</html>
```

### 4. Register for Local Testing

For local development, add your widget to `src/components/WidgetLibrary.tsx`:

```typescript
const LOCAL_TEST_WIDGETS: LocalWidget[] = [
    // ... existing widgets
    { id: 'my-widget', name: 'My Widget', category: 'custom' },
];
```

---

## Protocol v3.0 Reference

### Communication Methods

| Direction | Message Type | Purpose |
|-----------|--------------|---------|
| Widget → Host | `{ type: 'READY' }` | Signal widget is initialized |
| Widget → Host | `{ type: 'widget:emit', payload: {...} }` | Emit output event |
| Host → Widget | `{ type: 'widget:event', payload: {...} }` | Receive input event |
| Host → Widget | `{ type: 'pipeline:input', portName, value }` | Receive pipeline input |

### Emitting Events (Widget → Other Widgets)

```javascript
function emit(portId, data) {
    window.parent.postMessage({
        type: 'widget:emit',
        payload: {
            type: portId,      // MUST match io.outputs[].id
            payload: data
        }
    }, '*');
}

// Example: emit to 'result' output port
emit('result', { value: 42 });
```

### Receiving Events (From Other Widgets)

```javascript
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};

        // 'type' matches io.inputs[].id
        switch (type) {
            case 'trigger':
                handleTrigger();
                break;
            case 'data':
                handleData(payload);
                break;
        }
    }
});
```

### READY Signal (REQUIRED)

Every widget MUST send this after initialization:

```javascript
window.parent.postMessage({ type: 'READY' }, '*');
```

**Timeout**: If no READY signal is received within 5 seconds, the widget is marked as failed.

---

## Avoiding Errors & Library Loading Issues

This section covers validation rules and common mistakes that prevent widgets from working correctly or being added to the library.

### Validation Rules (What Gets Checked)

When a widget is added to the library (generated, uploaded, or preset), it goes through validation:

#### Manifest Validation

| Check | Severity | Requirement |
|-------|----------|-------------|
| `id` present | ERROR | Required - must exist |
| `id` format | ERROR | Lowercase alphanumeric with hyphens only (e.g., `my-widget`) |
| `name` present | ERROR | Required |
| `entry` present | ERROR | Required (usually `index.html`) |
| `version` format | WARNING | Should be semver (X.Y.Z) |
| `size` config | SUGGESTION | Recommended for proper layout |
| `io` ports defined | WARNING | Required for cross-widget communication |
| Event registry match | WARNING | Input/output IDs should match known events |

#### HTML Validation

| Check | Severity | Requirement |
|-------|----------|-------------|
| READY signal | ERROR | Must include `postMessage({ type: 'READY' }, '*')` |
| Uses deprecated WidgetAPI | ERROR | Must use postMessage, not `window.WidgetAPI` |
| Event listener | WARNING | Should have `addEventListener('message', ...)` |
| Handles `widget:event` | WARNING | Should check for `event.data.type === 'widget:event'` |
| Contains `eval()` | WARNING | Security risk - avoid |
| Template literals in innerHTML | WARNING | Potential XSS - ensure proper escaping |

### Critical Errors That Block Library Loading

#### 1. Missing READY Signal (Most Common)

```javascript
// ❌ WRONG - Widget never signals ready, times out after 5 seconds
// (no postMessage call)

// ✅ CORRECT - Signal ready at end of script
window.parent.postMessage({ type: 'READY' }, '*');
```

#### 2. Using Deprecated WidgetAPI

```javascript
// ❌ WRONG - Old protocol, will be rejected
if (window.WidgetAPI) {
    window.WidgetAPI.emitEvent({ type: 'clicked', scope: 'canvas', payload: {} });
}

// ✅ CORRECT - Protocol v3.0
window.parent.postMessage({
    type: 'widget:emit',
    payload: { type: 'clicked', payload: {} }
}, '*');
```

#### 3. Invalid Manifest ID

```json
// ❌ WRONG - uppercase, spaces, special chars
{ "id": "My Cool Widget!" }

// ✅ CORRECT - lowercase, hyphens only
{ "id": "my-cool-widget" }
```

#### 4. Missing Required Manifest Fields

```json
// ❌ WRONG - missing id, name, entry
{ "version": "1.0.0" }

// ✅ CORRECT - all required fields present
{
    "id": "my-widget",
    "name": "My Widget",
    "version": "1.0.0",
    "entry": "index.html"
}
```

### Port ID Mismatch (Silent Failures)

This causes events to not be routed correctly:

```json
// manifest.json
{
    "io": {
        "outputs": [
            { "id": "buttonClicked", "type": "void" }
        ]
    }
}
```

```javascript
// ❌ WRONG - emit type doesn't match manifest io.outputs[].id
emit('clicked', {});  // "clicked" ≠ "buttonClicked"

// ✅ CORRECT - emit type matches exactly
emit('buttonClicked', {});  // Matches manifest
```

### No Message Event Listener

```javascript
// ❌ WRONG - can't receive events from other widgets
// (no addEventListener)

// ✅ CORRECT - listen for incoming messages
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};
        // Handle events matching io.inputs[].id
    }
});
```

### Quality Score Factors

The library calculates a quality score (0-100) that affects widget ranking:

| Factor | Impact |
|--------|--------|
| Validation errors | -20 each |
| Validation warnings | -5 each |
| Missing description | -10 |
| Missing size config | -5 |
| Missing category | -5 |
| Missing READY signal | -20 |
| Contains eval() | -15 |
| No event listener | -10 |
| Uses CSS variables | +5 |
| Has try/catch | +5 |
| Has io declarations | +10 |

**Widgets with quality score < 50 may be flagged or hidden in the library.**

---

## Common Issues & Fixes

### Issue 1: Widget UI Doesn't Update (Events Work but Display is Static)

**Symptom**: Debug panel shows events flowing correctly, widget logs show it's processing events, but the visual display never changes.

**Cause**: The `CanvasRenderer` was cloning iframes instead of moving them. `cloneNode(true)` on an iframe only clones the element, not its document/state.

**Fix** (in `src/components/CanvasRenderer.tsx`):
```typescript
// WRONG - cloning loses state
el.appendChild(iframe.cloneNode(true));

// CORRECT - moving preserves state
if (iframe && iframe.parentElement !== el) {
    el.appendChild(iframe);
}
```

---

### Issue 2: Debug Panel Loses Events When Switching Tabs

**Symptom**: Events show briefly in Debug panel, then disappear when navigating to other tabs (Library, Canvas) and returning.

**Cause**: DebugPanel was conditionally rendered with `{activeTab === 'debug' && <DebugPanel />}`, causing it to unmount and lose its event subscriptions.

**Fix** (in `src/App.tsx`):
```tsx
// WRONG - conditional render causes unmount
{activeTab === 'debug' && (
    <DebugPanel eventBus={runtime.eventBus} isOpen={true} />
)}

// CORRECT - always mount, control visibility with CSS
<div style={{ display: activeTab === 'debug' ? 'block' : 'none' }}>
    <DebugPanel eventBus={runtime.eventBus} isOpen={true} />
</div>
```

---

### Issue 3: Widget Events Not Reaching Other Widgets

**Symptom**: Widget A emits an event, but Widget B doesn't receive it.

**Cause**: EventBus wasn't forwarding wildcard subscriptions, or WidgetSandboxHost wasn't routing canvas-scope events.

**Fix**: Ensure `EventBus.ts` supports wildcard handlers:
```typescript
emit(event: Event): void {
    // Call specific handlers
    const handlers = this.listeners.get(event.type);
    if (handlers) { ... }

    // Also call wildcard handlers
    if (!event.type.startsWith('bridge:')) {
        const wildcardHandlers = this.listeners.get('*');
        if (wildcardHandlers) { ... }
    }
}
```

And ensure `WidgetSandboxHost.ts` forwards canvas-scope events:
```typescript
if (event.scope === 'canvas') {
    this.sendEventToWidget(event);
}
```

---

### Issue 4: Widget Won't Load (404 or Manifest Error)

**Symptom**: Widget appears as placeholder with ID but no content.

**Checklist**:
1. Widget files are in `public/test-widgets/{widget-id}/`
2. `manifest.json` exists and is valid JSON
3. `entry` field in manifest matches actual file (usually `index.html`)
4. Widget is added to `LOCAL_TEST_WIDGETS` in WidgetLibrary.tsx
5. Vite dev server is running

---

### Issue 5: Widget Loads But Never Becomes "Active"

**Symptom**: Widget appears on canvas but stays in "loading" state, doesn't respond to events.

**Cause**: Missing or incorrect READY signal.

**Fix**:
```javascript
// Make sure this is at the END of your script, after all setup
window.parent.postMessage({ type: 'READY' }, '*');

// NOT inside a setTimeout or async callback that might not execute
// ❌ WRONG
setTimeout(() => {
    window.parent.postMessage({ type: 'READY' }, '*');
}, 10000);  // 10 second delay causes timeout!
```

---

### Issue 6: Widget Added to Library But Marked as Low Quality

**Symptom**: Widget works but has low quality score, may be hidden.

**Fix**: Address validation warnings:

```json
// Add description
"description": "A button widget that emits click events"

// Add size configuration
"size": {
    "defaultWidth": 200,
    "defaultHeight": 150,
    "minWidth": 100,
    "minHeight": 80
}

// Add category
"category": "controls"

// Declare io ports
"io": {
    "inputs": [...],
    "outputs": [...]
}
```

---

### Issue 7: Widget Rejected as "Redundant"

**Symptom**: Widget validation fails with "Very similar to existing widget".

**Cause**: Library redundancy detection found >80% event overlap with existing widget.

**Options**:
1. **Skip**: Use the existing widget instead
2. **Differentiate**: Add unique capabilities not in the existing widget
3. **Replace**: If your widget is better, remove the old one first

---

## Cross-Widget Communication Patterns (Protocol v3.0)

### Broadcasting to All Widgets

```javascript
// Emit to your declared output port
emit('weather', { sunny: true, rainy: false });
```

All widgets with matching input ports will receive this via pipeline connections.

### Receiving Events (Protocol v3.0)

```javascript
// Listen for incoming messages
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};

        // Handle specific event types (must match your io.inputs[].id)
        if (type === 'harvest') {
            const { crop, quality } = payload;
            // Handle harvest event
        }
    }
});
```

### Handling Multiple Event Types

```javascript
window.addEventListener('message', (event) => {
    if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};

        switch (type) {
            case 'weather':
                handleWeather(payload);
                break;
            case 'harvest':
                handleHarvest(payload);
                break;
            case 'trigger':
                handleTrigger();
                break;
        }
    }
});
```

---

## Testing Widgets

### Manual Testing
1. Add widget to canvas from Library
2. Open Debug tab to monitor events
3. Interact with widget and verify events emit
4. Add related widgets and verify cross-communication

### Playwright Testing (Automated)
See `tests/` directory for E2E tests that verify:
- Widget loading
- Event emission
- Cross-widget communication
- UI updates

Run tests:
```bash
npx playwright test
```

---

## Duplicate Widgets

Multiple instances of the same widget type are fully supported:
- Each instance has a unique `instanceId`
- Each instance maintains its own state
- Events include `sourceWidgetId` to identify origin
- Widgets receive ALL canvas-scope events (they can filter by source if needed)

**Example**: Having 3 Crop Plot widgets:
- Each grows crops independently
- All receive `water` events from Sprinkler via pipeline
- Each can filter events if needed: `if (event.targetWidgetId === myId) { ... }`

---

## Troubleshooting Checklist

Use this checklist when a widget isn't working correctly:

### Widget Not Loading at All

- [ ] Files exist in `public/test-widgets/{widget-id}/`
- [ ] `manifest.json` is valid JSON (check for trailing commas, missing quotes)
- [ ] `id` in manifest is lowercase with hyphens only
- [ ] `entry` field matches the actual filename (`index.html`)
- [ ] Widget is registered in `LOCAL_TEST_WIDGETS` (for local dev)
- [ ] Vite dev server is running

### Widget Loads But Stays in "Loading" State

- [ ] Script includes `window.parent.postMessage({ type: 'READY' }, '*')`
- [ ] READY signal is NOT inside a setTimeout or delayed callback
- [ ] READY signal is at the END of the script, after all setup
- [ ] No JavaScript errors in browser console (check iframe console)

### Widget Doesn't Receive Events

- [ ] Has `window.addEventListener('message', ...)` listener
- [ ] Checks for `event.data.type === 'widget:event'`
- [ ] Input port IDs in manifest match what the sending widget emits
- [ ] Pipeline connection exists between widgets

### Widget Emits Events But Others Don't Receive

- [ ] Uses `emit(portId, data)` function with postMessage
- [ ] `portId` exactly matches `io.outputs[].id` in manifest
- [ ] Receiving widget has matching `io.inputs[].id`
- [ ] Pipeline connection exists between the widgets

### Widget Rejected From Library

- [ ] No validation errors (check console output)
- [ ] Has READY signal in HTML
- [ ] Not using deprecated `WidgetAPI`
- [ ] Manifest has required fields: `id`, `name`, `entry`
- [ ] `id` format is valid (lowercase, hyphens only)
- [ ] Not >80% similar to existing widget

### Low Quality Score

- [ ] Add `description` field to manifest
- [ ] Add `size` configuration
- [ ] Add `category` field
- [ ] Declare `io.inputs` and `io.outputs`
- [ ] Remove `eval()` usage
- [ ] Add proper error handling with try/catch
- [ ] Use CSS variables for theming

---

## Complete Working Example

Here's a complete, validated widget that follows all best practices:

**manifest.json**:
```json
{
    "id": "example-counter",
    "name": "Example Counter",
    "version": "1.0.0",
    "description": "A counter widget that increments on click and emits count updates",
    "entry": "index.html",
    "category": "controls",
    "size": {
        "defaultWidth": 200,
        "defaultHeight": 160,
        "minWidth": 140,
        "minHeight": 120
    },
    "io": {
        "inputs": [
            { "id": "reset", "name": "Reset", "type": "void", "description": "Resets counter to 0" },
            { "id": "increment", "name": "Increment", "type": "number", "description": "Adds value to counter" }
        ],
        "outputs": [
            { "id": "countChanged", "name": "Count Changed", "type": "number", "description": "Current count value" },
            { "id": "clicked", "name": "Clicked", "type": "void", "description": "Emitted on each click" }
        ]
    }
}
```

**index.html**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        :root {
            --sn-bg-primary: #0f0f19;
            --sn-bg-secondary: #1a1a2e;
            --sn-text-primary: #e2e8f0;
            --sn-text-secondary: #94a3b8;
            --sn-accent-primary: #8b5cf6;
            --sn-border-primary: rgba(139, 92, 246, 0.2);
            --sn-radius-md: 6px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--sn-bg-primary);
            color: var(--sn-text-primary);
            min-height: 100vh;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .count {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 16px;
            color: var(--sn-accent-primary);
        }
        .btn {
            background: var(--sn-accent-primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: var(--sn-radius-md);
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.1s;
        }
        .btn:hover { transform: scale(1.05); }
        .btn:active { transform: scale(0.95); }
        .label {
            font-size: 11px;
            color: var(--sn-text-secondary);
            text-transform: uppercase;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="label">Counter</div>
    <div class="count" id="count">0</div>
    <button class="btn" id="incrementBtn">+1</button>

    <script>
        // State
        let count = 0;

        // Protocol v3.0: Emit to output ports
        function emit(portId, data) {
            window.parent.postMessage({
                type: 'widget:emit',
                payload: { type: portId, payload: data }
            }, '*');
        }

        // Update display
        function updateDisplay() {
            document.getElementById('count').textContent = count;
        }

        // Handle button click
        document.getElementById('incrementBtn').addEventListener('click', () => {
            count++;
            updateDisplay();
            emit('clicked', {});
            emit('countChanged', { value: count });
        });

        // Protocol v3.0: Listen for input events
        window.addEventListener('message', (event) => {
            if (event.data.type === 'widget:event') {
                const { type, payload } = event.data.payload || {};

                if (type === 'reset') {
                    count = 0;
                    updateDisplay();
                    emit('countChanged', { value: count });
                }

                if (type === 'increment') {
                    count += (payload?.value ?? 1);
                    updateDisplay();
                    emit('countChanged', { value: count });
                }
            }
        });

        // REQUIRED: Signal ready
        window.parent.postMessage({ type: 'READY' }, '*');
    </script>
</body>
</html>
```

This widget:
- ✅ Follows Protocol v3.0 (postMessage)
- ✅ Sends READY signal immediately
- ✅ Has complete manifest with all recommended fields
- ✅ Matches port IDs between manifest and code
- ✅ Uses StickerNest theme tokens
- ✅ Has proper error handling scope
- ✅ Will pass validation with high quality score
