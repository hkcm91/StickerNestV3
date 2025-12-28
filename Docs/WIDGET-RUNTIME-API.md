# StickerNest v2 — Widget Runtime API Reference

This document describes the stable Widget Runtime API (v1.0.0) that provides a consistent interface between widgets and the host application.

---

## Overview

The Widget Runtime API enables widgets to:

- Communicate with the host application via a structured message protocol
- Manage widget lifecycle (mount, resize, destroy)
- Access capabilities (storage, network, settings, canvas)
- Emit and receive events through the pipeline I/O system
- Manage internal widget state

---

## API Version

```javascript
// Current API version
WIDGET_API_VERSION = '1.0.0'
WIDGET_PROTOCOL_VERSION = '1.0.0'
```

---

## Quick Start

### Using the Widget SDK (Recommended)

The SDK is automatically injected into widget iframes:

```html
<!DOCTYPE html>
<html>
<body>
    <div id="content">My Widget</div>

    <script>
        // The WidgetAPI is automatically available
        const api = window.WidgetAPI;

        // Handle mount event
        api.onMount((context) => {
            console.log('Widget mounted with context:', context);
            document.getElementById('content').textContent = 'Hello, ' + context.manifest.name;
        });

        // Handle input from connected widgets
        api.onInput('data', (value, source) => {
            console.log('Received data from', source?.widgetId, ':', value);
        });

        // Emit output to connected widgets
        document.getElementById('content').addEventListener('click', () => {
            api.emitOutput('clicked', { timestamp: Date.now() });
        });

        // Handle cleanup
        api.onDestroy(() => {
            console.log('Widget destroying, cleanup here');
        });
    </script>
</body>
</html>
```

---

## Core API Methods

### Lifecycle Hooks

#### `onMount(handler)`

Called when the widget is mounted and ready to receive events.

```typescript
api.onMount((context: MountEventData) => void): UnsubscribeFn

interface MountEventData {
    manifest: WidgetManifest;
    state: Record<string, unknown>;
    settings: Record<string, unknown>;
    assetBaseUrl: string;
    debugEnabled: boolean;
    canvasMode: 'view' | 'edit' | 'connect';
    capabilities: string[];
}
```

**Example:**

```javascript
api.onMount((ctx) => {
    // Access initial state
    const savedCount = ctx.state.count ?? 0;

    // Check canvas mode
    if (ctx.canvasMode === 'edit') {
        showEditOverlay();
    }

    // Load assets
    const imagePath = api.getAssetUrl('images/icon.png');
});
```

#### `onDestroy(handler)`

Called before the widget is removed from the canvas.

```typescript
api.onDestroy(() => void): UnsubscribeFn
```

**Example:**

```javascript
api.onDestroy(() => {
    // Cleanup timers
    clearInterval(myTimer);

    // Save final state
    api.setState({ finalValue: currentValue });

    // Release resources
    mediaPlayer.dispose();
});
```

#### `onResize(handler)`

Called when the widget is resized.

```typescript
api.onResize((data: ResizeEventData) => void): UnsubscribeFn

interface ResizeEventData {
    width: number;
    height: number;
    previousWidth?: number;
    previousHeight?: number;
}
```

**Example:**

```javascript
api.onResize((data) => {
    if (data.width < 200) {
        enableCompactMode();
    } else {
        enableFullMode();
    }

    // Re-render charts or visualizations
    chart.resize(data.width, data.height);
});
```

---

### Pipeline I/O

#### `onInput(portName, handler)`

Listen for data on a specific input port.

```typescript
api.onInput(
    portName: string,
    handler: (value: unknown, source?: { widgetId: string; portName: string }) => void
): UnsubscribeFn
```

**Example:**

```javascript
// Listen for 'text' input
api.onInput('text', (value, source) => {
    document.getElementById('display').textContent = value;
    console.log(`Received from ${source?.widgetId}`);
});

// Listen for 'trigger' input
api.onInput('trigger', () => {
    performAction();
});
```

#### `emitOutput(portName, value)`

Emit data to a specific output port.

```typescript
api.emitOutput(portName: string, value: unknown): void
```

**Example:**

```javascript
// Emit computed result
api.emitOutput('result', { sum: 42, timestamp: Date.now() });

// Emit status event
api.emitOutput('status', 'completed');

// Emit trigger (no data)
api.emitOutput('clicked');
```

---

### State Management

#### `getState()`

Get the current widget state.

```typescript
api.getState<T = Record<string, unknown>>(): T
```

**Example:**

```javascript
const state = api.getState();
console.log('Current count:', state.count);
```

#### `setState(patch)`

Update widget state with a partial patch.

```typescript
api.setState(patch: Record<string, unknown>): void
```

**Example:**

```javascript
// Update specific values
api.setState({ count: 10 });

// Update nested values
api.setState({
    user: {
        ...api.getState().user,
        lastActive: Date.now()
    }
});
```

#### `replaceState(newState)`

Replace the entire widget state.

```typescript
api.replaceState(newState: Record<string, unknown>): void
```

**Example:**

```javascript
// Reset to initial state
api.replaceState({ count: 0, items: [] });
```

#### `onStateChange(handler)`

Listen for state changes.

```typescript
api.onStateChange((state: Record<string, unknown>) => void): UnsubscribeFn
```

**Example:**

```javascript
api.onStateChange((state) => {
    renderUI(state);
    saveToLocalCache(state);
});
```

---

### Events

#### `onEvent(type, handler)`

Listen for events of a specific type.

```typescript
api.onEvent(type: string, handler: EventHandler): UnsubscribeFn

type EventHandler = (event: Event) => void;

interface Event {
    type: string;
    payload?: unknown;
    scope: 'widget' | 'canvas' | 'broadcast';
    sourceWidgetId?: string;
    timestamp: number;
}
```

**Example:**

```javascript
api.onEvent('user:action', (event) => {
    console.log('User action:', event.payload);
});

// Listen for all events (wildcard)
api.onEvent('*', (event) => {
    console.log('Any event:', event.type, event.payload);
});
```

#### `emit(type, payload?, scope?)`

Emit an event.

```typescript
api.emit(type: string, payload?: unknown, scope?: EventScope): void

type EventScope = 'widget' | 'canvas' | 'broadcast';
```

**Example:**

```javascript
// Emit to canvas (default)
api.emit('button:clicked', { buttonId: 'submit' });

// Emit only within this widget
api.emit('internal:update', { value: 42 }, 'widget');

// Broadcast to all canvases
api.emit('notification:show', { message: 'Hello!' }, 'broadcast');
```

#### `emitEvent(event)`

Emit a full event object.

```typescript
api.emitEvent(event: Omit<Event, 'sourceWidgetId' | 'timestamp'>): void
```

**Example:**

```javascript
api.emitEvent({
    type: 'data:exported',
    payload: { format: 'json', size: 1024 },
    scope: 'canvas'
});
```

---

### Assets

#### `getAssetUrl(path)`

Get the full URL for a widget asset.

```typescript
api.getAssetUrl(path: string): string
```

**Example:**

```javascript
// Get asset URLs
const iconUrl = api.getAssetUrl('icons/logo.svg');
const soundUrl = api.getAssetUrl('sounds/notification.mp3');

// Use in HTML
document.getElementById('icon').src = api.getAssetUrl('images/avatar.png');
```

---

### Canvas Requests

#### `requestMove(x, y)`

Request to move the widget to a new position.

```typescript
api.requestMove(x: number, y: number): void
```

#### `requestResize(width, height)`

Request to resize the widget.

```typescript
api.requestResize(width: number, height: number): void
```

#### `requestBringToFront()`

Request to bring the widget to the front (highest z-index).

```typescript
api.requestBringToFront(): void
```

#### `requestClose()`

Request to close/remove the widget.

```typescript
api.requestClose(): void
```

**Example:**

```javascript
// Expand widget on double-click
element.addEventListener('dblclick', () => {
    api.requestResize(400, 300);
    api.requestBringToFront();
});

// Close widget on X button
closeBtn.addEventListener('click', () => {
    api.requestClose();
});
```

---

### Logging

Debug logging methods that appear in the Debug panel:

```typescript
api.log(message: string, data?: unknown): void
api.info(message: string, data?: unknown): void
api.warn(message: string, data?: unknown): void
api.error(message: string, data?: unknown): void
```

**Example:**

```javascript
api.log('Processing started');
api.info('Loaded 42 items', { count: 42 });
api.warn('Rate limit approaching', { remaining: 10 });
api.error('Failed to connect', { error: err.message });
```

---

## Capabilities

### Checking Capabilities

```typescript
api.hasCapability(name: string): boolean
```

**Example:**

```javascript
if (api.hasCapability('storage')) {
    const storage = api.getStorage();
    // Use storage API
}
```

### Storage Capability

```typescript
interface StorageAPIContract {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
    clear(): Promise<void>;
}

// Access
const storage = api.getStorage();
```

**Example:**

```javascript
const storage = api.getStorage();

// Save data
await storage.set('preferences', { theme: 'dark', fontSize: 14 });

// Load data
const prefs = await storage.get('preferences');

// List keys
const allKeys = await storage.keys();

// Remove specific key
await storage.remove('tempData');
```

### Network Capability

```typescript
interface NetworkAPIContract {
    fetch(url: string, options?: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        headers?: Record<string, string>;
        body?: string | object;
        timeout?: number;
    }): Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        data: unknown;
    }>;
    isOnline(): boolean;
    onStatusChange(handler: (online: boolean) => void): UnsubscribeFn;
}

// Access
const network = api.getNetwork();
```

**Example:**

```javascript
const network = api.getNetwork();

// Fetch data
const response = await network.fetch('https://api.example.com/data', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' },
    timeout: 5000
});

if (response.ok) {
    console.log('Data:', response.data);
}

// Check connectivity
if (!network.isOnline()) {
    showOfflineMessage();
}

// Listen for connectivity changes
network.onStatusChange((online) => {
    updateConnectionIndicator(online);
});
```

### Settings Capability

```typescript
interface SettingsAPIContract {
    getAll(): Record<string, unknown>;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    onChange(handler: (settings: Record<string, unknown>) => void): UnsubscribeFn;
}

// Access
const settings = api.getSettings();
```

**Example:**

```javascript
const settings = api.getSettings();

// Get setting
const autoSave = settings.get('autoSave') ?? true;

// Update setting
settings.set('refreshInterval', 5000);

// Listen for changes
settings.onChange((allSettings) => {
    applySettings(allSettings);
});
```

### Canvas Capability

```typescript
interface CanvasAPIContract {
    getSize(): { width: number; height: number };
    getMode(): 'view' | 'edit' | 'connect';
    getZoom(): number;
    getTheme(): string;
    onModeChange(handler: (mode: string) => void): UnsubscribeFn;
}

// Access
const canvas = api.getCanvas();
```

**Example:**

```javascript
const canvas = api.getCanvas();

// Get canvas dimensions
const { width, height } = canvas.getSize();

// Check current mode
if (canvas.getMode() === 'edit') {
    showEditControls();
}

// Respond to mode changes
canvas.onModeChange((mode) => {
    if (mode === 'view') {
        hideEditControls();
    }
});
```

---

## Message Protocol (Advanced)

For advanced use cases, you can use the raw message protocol:

### Parent to Widget Messages (P2W)

```typescript
type P2WMessageType =
    | 'INIT'         // Initialize widget
    | 'EVENT'        // Incoming event
    | 'STATE_UPDATE' // State update from host
    | 'SETTINGS_UPDATE' // Settings changed
    | 'RESIZE'       // Widget resized
    | 'CAPABILITY'   // Capability response
    | 'DESTROY';     // Widget being destroyed
```

### Widget to Parent Messages (W2P)

```typescript
type W2PMessageType =
    | 'READY'            // Widget ready
    | 'EVENT'            // Outgoing event
    | 'OUTPUT'           // Pipeline output
    | 'STATE_PATCH'      // State change
    | 'CAPABILITY_REQUEST' // Request capability
    | 'CANVAS_REQUEST'   // Request canvas action
    | 'DEBUG_LOG'        // Debug message
    | 'ERROR';           // Error report
```

### Raw Message Example

```javascript
// Send raw message
window.parent.postMessage({
    type: 'OUTPUT',
    instanceId: widgetInstanceId,
    payload: {
        portName: 'result',
        value: { computed: 42 }
    },
    timestamp: Date.now(),
    version: '1.0.0'
}, '*');

// Listen for raw messages
window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.type === 'EVENT') {
        handleEvent(msg.payload);
    }
});
```

---

## Best Practices

### 1. Always Signal Ready

```javascript
// At the end of your initialization
window.parent.postMessage({ type: 'READY' }, '*');
// Or if using the SDK, this is automatic after onMount
```

### 2. Handle All Lifecycle Events

```javascript
api.onMount((ctx) => {
    initialize(ctx.state);
});

api.onResize((data) => {
    adjustLayout(data.width, data.height);
});

api.onDestroy(() => {
    cleanup();
});
```

### 3. Manage State Properly

```javascript
// Persist important state
api.setState({ lastValue: currentValue });

// Listen for external state changes
api.onStateChange((state) => {
    if (state.lastValue !== currentValue) {
        currentValue = state.lastValue;
        updateUI();
    }
});
```

### 4. Use Typed Ports

```javascript
// Declare ports in manifest
{
    "io": {
        "inputs": [
            { "id": "text.set", "type": "string" }
        ],
        "outputs": [
            { "id": "text.changed", "type": "string" }
        ]
    }
}

// Use matching port names in code
api.onInput('text.set', (value) => { /* ... */ });
api.emitOutput('text.changed', newText);
```

### 5. Check Capabilities Before Use

```javascript
if (api.hasCapability('storage')) {
    const storage = api.getStorage();
    await storage.set('data', myData);
} else {
    // Fallback to in-memory only
    localData = myData;
}
```

---

## TypeScript Support

The Widget API is fully typed. Import types from:

```typescript
import type {
    WidgetAPIContract,
    MountEventData,
    ResizeEventData,
    Event,
    EventScope,
    StorageAPIContract,
    NetworkAPIContract,
    SettingsAPIContract,
    CanvasAPIContract,
} from '@/types/widget';
```

---

## Migration from Legacy Protocol

If you have widgets using the old protocol:

### Old (Legacy)

```javascript
// Old way
if (window.WidgetAPI) {
    window.WidgetAPI.emitEvent({ type: 'clicked', scope: 'canvas', payload: {} });
}
```

### New (v1.0.0)

```javascript
// New way with SDK
api.emit('clicked', {}, 'canvas');

// Or new way with raw messages
window.parent.postMessage({
    type: 'EVENT',
    instanceId: 'widget-123',
    payload: { type: 'clicked', payload: {}, scope: 'canvas' },
    timestamp: Date.now()
}, '*');
```

The new API maintains backwards compatibility with legacy `widget:emit` messages.

---

## Troubleshooting

### Widget Not Receiving Events

1. Check that the widget has sent `READY` message
2. Verify port names match exactly between manifest and code
3. Ensure pipeline connections exist in connect mode

### State Not Persisting

1. Call `api.setState()` before widget destruction
2. Check that state changes are being sent to host
3. Verify the host is saving widget states

### Capabilities Not Working

1. Check if capability is declared in manifest
2. Verify user has granted permission
3. Use `api.hasCapability()` before accessing

---

## Related Documentation

- [Widget Development Guide](./WIDGET-DEVELOPMENT.md) - Creating widgets
- [Widget System](./WIDGET-SYSTEM.md) - System architecture
- [Runtime Architecture](./RUNTIME_ARCHITECTURE.md) - Runtime internals
