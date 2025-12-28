# StickerNest Widget Protocol Specification

**Version:** 3.0.0
**Status:** Stable
**Last Updated:** 2025-12-03

---

## Table of Contents

1. [Overview](#1-overview)
2. [Widget Manifest](#2-widget-manifest)
3. [Capability System](#3-capability-system)
4. [Event Bus Contract](#4-event-bus-contract)
5. [Widget Lifecycle](#5-widget-lifecycle)
6. [Sandbox Communication](#6-sandbox-communication)
7. [Pipeline Connections](#7-pipeline-connections)
8. [Validation & Quality](#8-validation--quality)
9. [Versioning & Migration](#9-versioning--migration)

---

## 1. Overview

### 1.1 What is a Widget?

A **widget** is a self-contained, sandboxed UI component that runs inside an iframe. Widgets communicate with the host application (StickerNest) and other widgets through the **postMessage API**.

### 1.2 Protocol Goals

- **Isolation**: Widgets run in sandboxed iframes with `allow-scripts allow-same-origin`
- **Safety**: All communication is validated; deprecated APIs are rejected
- **Interoperability**: Widgets connect via typed input/output ports defined in `io`
- **Evolvability**: Protocol supports versioning for future changes

### 1.3 Protocol v3.0 Key Changes

| Change | Before (v1/v2) | After (v3.0) |
|--------|----------------|--------------|
| Communication | `window.WidgetAPI` | `window.parent.postMessage()` |
| Ready signal | Via WidgetAPI | `postMessage({ type: 'READY' }, '*')` |
| IO declaration | `inputs`/`outputs` objects | `io.inputs[]`/`io.outputs[]` arrays |
| Validation | Optional | Required for library |

### 1.4 Widget Sources

| Source | Location | Description |
|--------|----------|-------------|
| `local` | `/public/test-widgets/` | Built-in test widgets |
| `official` | Supabase `SystemWidgets` bucket | Curated official widgets |
| `user` | Supabase `UserWidgets` bucket | User-uploaded widgets |
| `generated` | In-memory | AI-generated widgets |

---

## 2. Widget Manifest

### 2.1 Manifest File

Every widget bundle MUST contain a `manifest.json` file at the root.

### 2.2 Manifest Schema (v3.0)

```typescript
interface WidgetManifest {
  // === REQUIRED FIELDS ===

  /** Unique widget identifier (lowercase, alphanumeric, hyphens only) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Entry file path (relative to bundle root) */
  entry: string;

  // === RECOMMENDED FIELDS (v3.0) ===

  /** Widget description for discovery and AI context */
  description?: string;

  /** Widget category for organization */
  category?: string;

  /** Size configuration */
  size?: {
    defaultWidth: number;
    defaultHeight: number;
    minWidth?: number;
    minHeight?: number;
  };

  /** I/O port declarations (v3.0 format) */
  io?: {
    inputs?: PortDefinition[];
    outputs?: PortDefinition[];
  };

  // === OPTIONAL FIELDS ===

  /** Widget kind (default: "2d") */
  kind?: "2d" | "3d" | "audio" | "video" | "hybrid";

  /** Author name or organization */
  author?: string;

  /** Categorization tags */
  tags?: string[];

  /** LEGACY: Input ports (use io.inputs instead) */
  inputs?: Record<string, PortSchema>;

  /** LEGACY: Output ports (use io.outputs instead) */
  outputs?: Record<string, PortSchema>;

  /** UI capability flags */
  capabilities?: WidgetCapabilities;

  /** Additional asset files */
  assets?: string[];

  /** Run in sandbox (default: true) */
  sandbox?: boolean;

  /** Skin/theme configuration */
  skin?: SkinManifest;

  /** Protocol version (default: 3) */
  protocolVersion?: number;
}

/** v3.0 Port Definition */
interface PortDefinition {
  /** Port identifier - MUST match event types in code */
  id: string;
  /** Human-readable name */
  name: string;
  /** Data type: string, number, boolean, object, array, void, any, event */
  type: string;
  /** Port description */
  description?: string;
}
```

### 2.3 Port Schema

Ports define widget inputs and outputs for pipeline connections.

```typescript
interface PortSchema {
  /** Data type: string, number, boolean, object, array, trigger, any */
  type: string;

  /** Port description */
  description?: string;

  /** Whether input is required (inputs only) */
  required?: boolean;

  /** Default value (inputs only) */
  default?: any;
}
```

### 2.4 Widget Capabilities

UI-level capability flags:

```typescript
interface WidgetCapabilities {
  /** Can be dragged on canvas */
  draggable: boolean;

  /** Can be resized */
  resizable: boolean;

  /** Can be rotated */
  rotatable?: boolean;

  /** Supports 3D rendering */
  supports3d?: boolean;

  /** Supports audio playback */
  supportsAudio?: boolean;
}
```

### 2.5 Example Manifest (v3.0)

```json
{
  "id": "pipeline-button",
  "name": "Pipeline Button",
  "version": "1.0.0",
  "description": "A button that emits click events for pipeline connections",
  "entry": "index.html",
  "category": "controls",
  "author": "StickerNest",
  "tags": ["input", "trigger", "pipeline"],
  "size": {
    "defaultWidth": 180,
    "defaultHeight": 120,
    "minWidth": 120,
    "minHeight": 80
  },
  "io": {
    "inputs": [
      { "id": "trigger", "name": "Trigger", "type": "void", "description": "Programmatically trigger click" }
    ],
    "outputs": [
      { "id": "clicked", "name": "Clicked", "type": "void", "description": "Emitted when button is clicked" },
      { "id": "clickData", "name": "Click Data", "type": "object", "description": "Click event data with timestamp" }
    ]
  },
  "protocolVersion": 3
}
```

---

## 3. Capability System

### 3.1 Overview

Capabilities are **semantic identifiers** that describe what a widget can receive (inputs) and emit (outputs). They enable AI-powered wiring and compatibility checking.

### 3.2 Capability ID Format

```
<domain>.<action>
```

**Examples:**
- `text.set` - Set text content (input)
- `timer.complete` - Timer finished (output)
- `button.pressed` - Button was pressed (output)

### 3.3 Capability Domains

| Domain | Description |
|--------|-------------|
| `text` | Text content manipulation |
| `animation` | Animation control |
| `timer` | Timer/countdown operations |
| `data` | Generic data operations |
| `ui` | UI visibility and focus |
| `audio` | Audio playback control |
| `video` | Video playback control |
| `image` | Image manipulation |
| `button` | Button interactions |
| `form` | Form events |
| `selection` | Selection changes |
| `list` | List operations |
| `state` | Generic state changes |

### 3.4 Standard Input Capabilities

| Capability ID | Description | Payload |
|---------------|-------------|---------|
| `text.set` | Set text content | `{ content: string }` |
| `text.append` | Append text | `{ content: string }` |
| `text.clear` | Clear text | `{}` |
| `animation.play` | Play animation | `{}` |
| `animation.pause` | Pause animation | `{}` |
| `animation.stop` | Stop animation | `{}` |
| `timer.start` | Start timer | `{ duration?: number }` |
| `timer.pause` | Pause timer | `{}` |
| `timer.reset` | Reset timer | `{}` |
| `data.set` | Set data value | `{ value: any }` |
| `ui.show` | Show widget | `{}` |
| `ui.hide` | Hide widget | `{}` |
| `state.set` | Set widget state | `{ state: object }` |
| `action.trigger` | Trigger action | `{ action: string }` |

### 3.5 Standard Output Capabilities

| Capability ID | Description | Payload |
|---------------|-------------|---------|
| `text.changed` | Text content changed | `{ content: string }` |
| `text.submitted` | Text submitted (Enter) | `{ content: string }` |
| `timer.tick` | Timer tick | `{ elapsed, remaining, progress }` |
| `timer.complete` | Timer finished | `{ duration: number }` |
| `animation.completed` | Animation finished | `{}` |
| `button.pressed` | Button pressed | `{ buttonId: string }` |
| `data.changed` | Data changed | `{ value: any, previous?: any }` |
| `ui.clicked` | Widget clicked | `{ x?: number, y?: number }` |
| `selection.changed` | Selection changed | `{ selected: any }` |
| `state.changed` | State changed | `{ state: object }` |
| `ready` | Widget ready | `{}` |

### 3.6 Custom Capabilities

Widgets can define custom capabilities using the same format:

```json
{
  "io": {
    "inputs": ["text.set", "mywidget.customAction"],
    "outputs": ["button.pressed", "mywidget.customEvent"],
    "customInputs": [
      {
        "id": "mywidget.customAction",
        "name": "Custom Action",
        "description": "Triggers a custom action",
        "direction": "input",
        "payload": [
          { "name": "actionType", "type": "string", "required": true }
        ]
      }
    ]
  }
}
```

### 3.7 Capability Matching

When connecting widgets, capabilities are matched by:

1. **Exact match**: Output ID equals input ID
2. **Domain match**: Same domain (e.g., `text.*` → `text.*`)
3. **Type compatibility**: Payload types are compatible

**Confidence Score:**
```
confidence = typeCompatible * 0.5 + domainMatch * 0.3 + entityMatch * 0.2
```

---

## 4. Event Bus Contract

### 4.1 Event Structure

All events on the bus follow this structure:

```typescript
interface Event {
  /** Event type (e.g., "widget:emit", "timer.tick") */
  type: string;

  /** Event scope */
  scope: "widget" | "canvas" | "system" | "global";

  /** Event payload (type-specific) */
  payload: any;

  /** Source widget instance ID (if applicable) */
  sourceWidgetId?: string;

  /** Target widget instance ID (if applicable) */
  targetWidgetId?: string;

  /** Event timestamp */
  timestamp?: number;

  /** Event metadata for cross-context sync */
  metadata?: EventMetadata;
}
```

### 4.2 Event Metadata

For cross-tab/cross-device synchronization:

```typescript
interface EventMetadata {
  /** Unique event ID */
  eventId: string;

  /** Origin tab ID */
  originTabId: string;

  /** Origin device ID */
  originDeviceId: string;

  /** Origin session ID */
  originSessionId: string;

  /** Tabs that have seen this event (loop prevention) */
  seenBy: string[];

  /** Number of hops (max 10) */
  hopCount: number;

  /** Original timestamp */
  originTimestamp: number;
}
```

### 4.3 Event Scopes

| Scope | Description | Example |
|-------|-------------|---------|
| `widget` | Widget-to-widget events | Port data flow |
| `canvas` | Canvas-level events | Selection, mode change |
| `system` | System events | Dashboard load/save |
| `global` | Cross-canvas events | Theme change |

### 4.4 Reserved Event Types

| Event Type | Scope | Description |
|------------|-------|-------------|
| `widget:ready` | widget | Widget initialization complete |
| `widget:emit` | widget | Widget output emission |
| `widget:event` | widget | Incoming data to widget |
| `widget:state` | widget | Widget state change |
| `widget:error` | widget | Widget error |
| `pipeline:execute` | canvas | Pipeline execution |
| `canvas:modeChanged` | canvas | Edit/view mode change |
| `selection:changed` | canvas | Widget selection change |
| `dashboard:saved` | system | Dashboard saved |
| `dashboard:loaded` | system | Dashboard loaded |

### 4.5 Loop Prevention

Events include hop count and seen-by tracking to prevent infinite loops:

```typescript
// Check if event should be processed
function shouldProcessEvent(event: Event): boolean {
  if (!event.metadata) return true;

  const currentTabId = getTabId();

  // Already seen by this tab
  if (event.metadata.seenBy.includes(currentTabId)) {
    return false;
  }

  // Hop count exceeded
  if (event.metadata.hopCount > 10) {
    return false;
  }

  return true;
}
```

---

## 5. Widget Lifecycle

### 5.1 Lifecycle Phases

```
1. LOADING     → Widget bundle being fetched
2. MOUNTING    → Iframe created, content loaded
3. HANDSHAKE   → Widget sends "ready" signal
4. ACTIVE      → Widget is interactive
5. SUSPENDED   → Widget in background (optional)
6. UNMOUNTING  → Widget being removed
7. DESTROYED   → Widget fully cleaned up
```

### 5.2 Handshake Protocol

Widgets MUST signal readiness to the host:

```javascript
// Widget sends when ready
window.parent.postMessage({ type: 'widget:ready' }, '*');
```

Host waits for ready signal before:
- Routing pipeline events to widget
- Considering widget "active"
- Showing widget as interactive

**Timeout:** If no ready signal within 5 seconds, widget is marked as failed.

### 5.3 State Persistence

Widget state is persisted in `WidgetInstance.state`:

```typescript
interface WidgetInstance {
  id: string;
  state: Record<string, any>;  // Persisted state
  // ...
}
```

Widgets can request state save:

```javascript
window.parent.postMessage({
  type: 'widget:setState',
  payload: { key: 'value' }
}, '*');
```

---

## 6. Sandbox Communication (Protocol v3.0)

### 6.1 Message Protocol

All widget ↔ host communication uses `postMessage`. **Do NOT use `window.WidgetAPI`** (deprecated).

```javascript
// Widget → Host (ALWAYS use this pattern)
window.parent.postMessage({
  type: '<message-type>',
  payload: { ... }
}, '*');

// Host → Widget (listen via message event)
window.addEventListener('message', (event) => {
  if (event.data.type === 'widget:event') {
    const { type, payload } = event.data.payload || {};
    // Handle incoming data based on type
  }
});
```

### 6.2 READY Signal (REQUIRED)

Every widget MUST send a READY signal after initialization:

```javascript
// REQUIRED: Send at end of script, after all setup
window.parent.postMessage({ type: 'READY' }, '*');
```

**Timeout**: Widgets that don't send READY within 5 seconds are marked as failed.

**Handshake retries**: Host retries up to 3 times with 500ms delay.

### 6.3 Widget → Host Messages

| Type | Payload | Description |
|------|---------|-------------|
| `READY` | `{}` | **REQUIRED**: Widget is ready |
| `widget:emit` | `{ type, payload }` | Emit output port data (`type` must match `io.outputs[].id`) |
| `widget:setState` | `{ ...state }` | Request state save |
| `widget:log` | `{ level, message }` | Log message |
| `widget:error` | `{ message, stack? }` | Report error |
| `widget:resize` | `{ width, height }` | Request size change |

### 6.4 Host → Widget Messages

| Type | Payload | Description |
|------|---------|-------------|
| `widget:event` | `{ type, payload }` | Incoming port data (`type` matches `io.inputs[].id`) |
| `pipeline:input` | `{ portName, value }` | Direct pipeline input |
| `widget:state` | `{ ...state }` | State hydration |
| `widget:theme` | `{ tokens }` | Theme variables |
| `widget:resize` | `{ width, height }` | Size changed |
| `widget:visibility` | `{ visible }` | Visibility changed |
| `widget:handshake-request` | `{}` | Request READY signal again |

### 6.5 Emitting Output (v3.0)

```javascript
// Standard emit function for widgets
function emit(portId, data) {
  window.parent.postMessage({
    type: 'widget:emit',
    payload: {
      type: portId,    // MUST match io.outputs[].id exactly!
      payload: data
    }
  }, '*');
}

// Example: Button widget emitting click
document.getElementById('btn').addEventListener('click', () => {
  emit('clicked', { timestamp: Date.now() });
  emit('clickData', { x: 10, y: 20, count: clickCount });
});
```

**CRITICAL**: The `portId` argument MUST exactly match one of your `io.outputs[].id` values in the manifest. Mismatches cause silent routing failures.

### 6.6 Receiving Input (v3.0)

```javascript
// Listen for incoming messages
window.addEventListener('message', (event) => {
  // Standard widget events (matches io.inputs[].id)
  if (event.data.type === 'widget:event') {
    const { type, payload } = event.data.payload || {};

    switch (type) {
      case 'trigger':
        handleTrigger();
        break;
      case 'data':
        handleData(payload);
        break;
      case 'reset':
        handleReset();
        break;
    }
  }

  // Alternative: Direct pipeline input
  if (event.data.type === 'pipeline:input') {
    const { portName, value } = event.data;
    // Handle based on portName
  }
});
```

### 6.7 Complete Widget Template

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --sn-bg-primary: #0f0f19;
      --sn-bg-secondary: #1a1a2e;
      --sn-text-primary: #e2e8f0;
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
      padding: 12px;
    }
  </style>
</head>
<body>
  <div id="content">Widget Content</div>

  <script>
    // Emit function - portId MUST match io.outputs[].id
    function emit(portId, data) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: { type: portId, payload: data }
      }, '*');
    }

    // Listen for events - type matches io.inputs[].id
    window.addEventListener('message', (event) => {
      if (event.data.type === 'widget:event') {
        const { type, payload } = event.data.payload || {};
        // Handle events based on type
      }
    });

    // REQUIRED: Signal ready
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>
```

---

## 7. Pipeline Connections

### 7.1 Pipeline Structure

```typescript
interface Pipeline {
  id: string;
  canvasId: string;
  name: string;
  nodes: PipelineNode[];
  connections: PipelineConnection[];
  enabled: boolean;
}

interface PipelineNode {
  id: string;
  widgetInstanceId: string | null;
  type: "widget" | "transform" | "system";
  inputs?: PipelinePort[];
  outputs?: PipelinePort[];
}

interface PipelineConnection {
  id: string;
  from: { nodeId: string; portName: string };
  to: { nodeId: string; portName: string };
  enabled?: boolean;
}
```

### 7.2 Connection Rules

1. **Output → Input only**: Connections flow from output ports to input ports
2. **Type compatibility**: Port types must be compatible
3. **No cycles**: Direct cycles (A→B→A) are discouraged
4. **Multiple connections**: One output can connect to multiple inputs

### 7.3 Event Routing

When a widget emits an output:

```
1. Widget emits: { type: 'clicked', payload: {...} }
2. Host receives widget:emit message
3. Pipeline engine finds matching connections
4. For each connection:
   a. Get target widget
   b. Send widget:event to target iframe
5. Target widget receives and handles event
```

---

## 8. Validation & Quality

### 8.1 Validation Overview

Widgets are validated when added to the library. Validation failures prevent the widget from being added.

### 8.2 Manifest Validation Rules

| Field | Severity | Rule |
|-------|----------|------|
| `id` | ERROR | Required, must be lowercase alphanumeric with hyphens only |
| `name` | ERROR | Required |
| `entry` | ERROR | Required, must match actual file (usually `index.html`) |
| `version` | WARNING | Should follow semver format (X.Y.Z) |
| `size` | SUGGESTION | Recommended for proper layout |
| `io` ports | WARNING | Required for cross-widget communication |
| Event registry | WARNING | Input/output IDs should match known events |

### 8.3 HTML Validation Rules

| Check | Severity | Rule |
|-------|----------|------|
| READY signal | ERROR | Must include `postMessage({ type: 'READY' }, '*')` |
| Deprecated API | ERROR | Must NOT use `window.WidgetAPI` |
| Event listener | WARNING | Should have `addEventListener('message', ...)` |
| widget:event handling | WARNING | Should check for `event.data.type === 'widget:event'` |
| eval() usage | WARNING | Security risk |
| Template literals + innerHTML | WARNING | Potential XSS risk |

### 8.4 Quality Score

The library calculates a quality score (0-100):

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

**Minimum viable score**: 50 (widgets below may be flagged)

### 8.5 Redundancy Detection

When adding widgets, the library checks for duplicates:

| Similarity | Action |
|------------|--------|
| >80% event overlap | Reject (unless replacing) |
| 50-80% overlap | Allow with warning |
| <50% overlap | Allow |

---

## 9. Versioning & Migration

### 9.1 Protocol Version

The `protocolVersion` field in manifest indicates compatibility:

```json
{
  "protocolVersion": 3
}
```

### 9.2 Version Compatibility

| Protocol Version | Status | Key Features |
|------------------|--------|--------------|
| 1 | Deprecated | Initial release, WidgetAPI-based |
| 2 | Deprecated | Transitional |
| 3 | **Current** | postMessage-only, io format, validation required |

### 9.3 Manifest Migration

When loading widgets with older manifests:

```typescript
function migrateManifest(manifest: any): WidgetManifest {
  const version = manifest.protocolVersion || 1;

  if (version < 3) {
    // Migrate legacy inputs/outputs to io format
    if (manifest.inputs && !manifest.io?.inputs) {
      manifest.io = manifest.io || {};
      manifest.io.inputs = Object.entries(manifest.inputs).map(([id, def]) => ({
        id,
        name: id,
        type: def.type || 'any',
        description: def.description
      }));
    }

    if (manifest.outputs && !manifest.io?.outputs) {
      manifest.io = manifest.io || {};
      manifest.io.outputs = Object.entries(manifest.outputs).map(([id, def]) => ({
        id,
        name: id,
        type: def.type || 'any',
        description: def.description
      }));
    }

    manifest.protocolVersion = 3;
  }

  return manifest;
}
```

### 9.4 Migration from WidgetAPI (v1/v2 → v3)

If your widget uses the deprecated `window.WidgetAPI`:

**Before (v1/v2):**
```javascript
// Old: Wait for WidgetAPI
function init() {
  if (!window.WidgetAPI) {
    setTimeout(init, 50);
    return;
  }
  window.WidgetAPI.emitEvent({ type: 'clicked', scope: 'canvas', payload: {} });
  window.WidgetAPI.onEvent('*', (event) => { ... });
}
init();
```

**After (v3.0):**
```javascript
// New: Use postMessage directly
function emit(portId, data) {
  window.parent.postMessage({
    type: 'widget:emit',
    payload: { type: portId, payload: data }
  }, '*');
}

window.addEventListener('message', (event) => {
  if (event.data.type === 'widget:event') {
    const { type, payload } = event.data.payload || {};
    // Handle events
  }
});

window.parent.postMessage({ type: 'READY' }, '*');
```

---

## Appendix A: Validation Checklist

### Manifest Validation

- [ ] `id` is lowercase, alphanumeric with hyphens
- [ ] `name` is present
- [ ] `entry` is present and matches actual file
- [ ] `version` follows semver format (X.Y.Z)
- [ ] `io.inputs[]` and `io.outputs[]` are declared
- [ ] Port IDs are unique within inputs/outputs

### HTML Validation

- [ ] Contains `postMessage({ type: 'READY' }, '*')`
- [ ] Does NOT use `window.WidgetAPI`
- [ ] Has `addEventListener('message', ...)`
- [ ] Handles `widget:event` type
- [ ] No `eval()` usage
- [ ] Properly escapes dynamic content

### Runtime Validation

- [ ] Widget sends READY within 5 seconds
- [ ] Output emissions use correct port IDs
- [ ] State updates are JSON-serializable

---

## Appendix B: Widget Bundle Structure

```
my-widget/
├── manifest.json      # Required: Widget manifest
├── index.html         # Entry point (if HTML widget)
├── index.js           # Entry point (if JS widget)
├── styles.css         # Optional: Styles
├── assets/            # Optional: Asset folder
│   ├── icon.svg
│   └── sounds/
└── README.md          # Optional: Documentation
```

---

## Appendix C: Theme Tokens

StickerNest provides CSS custom properties for consistent theming:

```css
:root {
  /* Background colors */
  --sn-bg-primary: #0f0f19;      /* Main background */
  --sn-bg-secondary: #1a1a2e;    /* Cards, panels */
  --sn-bg-tertiary: #252538;     /* Hover, active states */

  /* Text colors */
  --sn-text-primary: #e2e8f0;    /* Main text */
  --sn-text-secondary: #94a3b8;  /* Secondary text */

  /* Accent colors */
  --sn-accent-primary: #8b5cf6;  /* Purple accent */
  --sn-success: #22c55e;         /* Green */
  --sn-error: #ef4444;           /* Red */

  /* Borders */
  --sn-border-primary: rgba(139, 92, 246, 0.2);

  /* Spacing */
  --sn-space-2: 8px;
  --sn-space-3: 12px;
  --sn-space-4: 16px;

  /* Border radius */
  --sn-radius-md: 6px;
  --sn-radius-lg: 8px;
}
```

---

## Appendix D: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 3.0.0 | 2025-12-03 | Protocol v3.0: postMessage-only, io format, validation required |
| 1.0.0 | 2025-11-29 | Initial specification |
