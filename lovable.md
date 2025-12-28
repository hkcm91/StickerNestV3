# Lovable Widget Factory - StickerNest Compatible Widget Development Environment

## Your Mission

Build a **Widget Factory** - a React web app for developing, testing, and exporting widgets that are compatible with StickerNest's Protocol v3.0. This app will serve as both:
1. A development environment for creating new widgets
2. A testing ground for widget-to-widget communication via the event bus
3. An export tool to download individual widgets as .zip files ready for StickerNest upload

---

## Core Architecture

### Tech Stack
- React + TypeScript + Vite
- Tailwind CSS (dark theme, purple accents)
- JSZip for widget export
- Monaco Editor or CodeMirror for code editing (optional, nice-to-have)

### App Structure

```
src/
  components/
    WidgetPreview.tsx       # Iframe wrapper that hosts widgets
    WidgetList.tsx          # Sidebar list of widgets in the factory
    EventLog.tsx            # Real-time event bus monitor
    PipelineEditor.tsx      # Visual connection editor (optional)
    ExportPanel.tsx         # Download widgets as .zip
  hooks/
    useEventBus.ts          # Central event bus implementation
    useWidgetRegistry.ts    # Track loaded widgets
  lib/
    eventBus.ts             # postMessage routing implementation
    widgetBundler.ts        # Create .zip bundles
  widgets/                  # Example widgets live here
    button-trigger/
    data-display/
    color-picker/
```

---

## The Event Bus (Critical - Must Match StickerNest Protocol v3.0)

### Message Types

Widgets communicate via `window.postMessage`. The host app acts as a message router.

```typescript
// Widget -> Host (widget emits an event)
{
  type: 'widget:emit',
  payload: {
    type: string,      // Event name, e.g., 'button:clicked', 'color:changed'
    payload: any       // Event data
  }
}

// Host -> Widget (widget receives an event)
{
  type: 'widget:event',
  payload: {
    type: string,      // Event name
    payload: any       // Event data
  }
}

// Widget -> Host (widget is ready)
{
  type: 'READY'
}
```

### Event Bus Implementation

```typescript
// useEventBus.ts
interface EventBusEvent {
  type: string;
  payload: any;
  sourceWidgetId: string;
  timestamp: number;
}

type EventHandler = (event: EventBusEvent) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private widgetIframes: Map<string, HTMLIFrameElement> = new Map();
  private eventLog: EventBusEvent[] = [];

  registerWidget(id: string, iframe: HTMLIFrameElement) {
    this.widgetIframes.set(id, iframe);
  }

  unregisterWidget(id: string) {
    this.widgetIframes.delete(id);
  }

  // Route event to all other widgets
  broadcast(event: EventBusEvent) {
    this.eventLog.push(event);

    this.widgetIframes.forEach((iframe, widgetId) => {
      if (widgetId !== event.sourceWidgetId) {
        iframe.contentWindow?.postMessage({
          type: 'widget:event',
          payload: {
            type: event.type,
            payload: event.payload
          }
        }, '*');
      }
    });

    // Notify UI handlers (for event log display)
    this.handlers.get(event.type)?.forEach(handler => handler(event));
    this.handlers.get('*')?.forEach(handler => handler(event));
  }

  subscribe(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  getEventLog() {
    return this.eventLog;
  }
}

export const eventBus = new EventBus();
```

---

## Widget Preview Component

Each widget runs in an iframe. The preview component manages the lifecycle.

```typescript
// WidgetPreview.tsx
interface WidgetPreviewProps {
  widgetId: string;
  html: string;
  width?: number;
  height?: number;
}

export function WidgetPreview({ widgetId, html, width = 300, height = 400 }: WidgetPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Write HTML content to iframe
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    // Register with event bus
    eventBus.registerWidget(widgetId, iframe);

    // Listen for messages from this widget
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      const data = event.data;

      if (data.type === 'READY') {
        setReady(true);
      }

      if (data.type === 'widget:emit') {
        eventBus.broadcast({
          type: data.payload.type,
          payload: data.payload.payload,
          sourceWidgetId: widgetId,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      eventBus.unregisterWidget(widgetId);
    };
  }, [widgetId, html]);

  return (
    <div className="widget-preview-container">
      <div className="widget-header">
        <span className="widget-name">{widgetId}</span>
        <span className={`status ${ready ? 'ready' : 'loading'}`}>
          {ready ? 'Ready' : 'Loading...'}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        className="widget-frame"
        style={{ width, height }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
```

---

## Widget Bundle Structure (For Export)

Each widget exports as a .zip containing:

```
my-widget/
  manifest.json    # Widget metadata
  index.html       # Entry point
```

### Manifest Schema (v3.0)

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "What this widget does",
  "entry": "index.html",
  "category": "utility",
  "author": "Your Name",
  "tags": ["tag1", "tag2"],
  "size": {
    "defaultWidth": 300,
    "defaultHeight": 200,
    "minWidth": 150,
    "minHeight": 100
  },
  "io": {
    "inputs": [
      { "id": "trigger", "name": "Trigger", "type": "void", "description": "Trigger this widget" },
      { "id": "data", "name": "Data", "type": "object", "description": "Incoming data" }
    ],
    "outputs": [
      { "id": "clicked", "name": "Clicked", "type": "void", "description": "Emitted on click" },
      { "id": "result", "name": "Result", "type": "object", "description": "Output data" }
    ]
  },
  "protocolVersion": 3
}
```

---

## Widget Template (Critical - All Widgets Must Follow This Pattern)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
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
    /* Add your styles here */
  </style>
</head>
<body>
  <!-- Your widget UI here -->
  <div id="app"></div>

  <script>
    // ============================================
    // PROTOCOL V3.0 - DO NOT MODIFY THIS SECTION
    // ============================================

    /**
     * Emit an event to other widgets
     * @param {string} eventType - Event name (must match io.outputs[].id in manifest)
     * @param {any} payload - Event data
     */
    function emit(eventType, payload) {
      window.parent.postMessage({
        type: 'widget:emit',
        payload: {
          type: eventType,
          payload: payload
        }
      }, '*');
      console.log('[Widget] Emit:', eventType, payload);
    }

    /**
     * Listen for events from other widgets
     * Override handleEvent() to process incoming events
     */
    window.addEventListener('message', (event) => {
      const data = event.data;

      if (data.type === 'widget:event') {
        const eventType = data.payload?.type;
        const eventPayload = data.payload?.payload;
        console.log('[Widget] Received:', eventType, eventPayload);
        handleEvent(eventType, eventPayload);
      }
    });

    /**
     * Handle incoming events - OVERRIDE THIS
     * @param {string} eventType - Event name (matches io.inputs[].id)
     * @param {any} payload - Event data
     */
    function handleEvent(eventType, payload) {
      switch (eventType) {
        case 'trigger':
          // Handle trigger input
          break;
        case 'data':
          // Handle data input
          break;
        default:
          console.log('[Widget] Unhandled event:', eventType);
      }
    }

    // ============================================
    // YOUR WIDGET CODE BELOW
    // ============================================

    // Initialize your widget here
    function init() {
      // Setup UI, event listeners, etc.
    }

    init();

    // REQUIRED: Signal ready when widget is loaded
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>
```

---

## Example Widgets to Include

### 1. Button Trigger Widget
- Emits: `button:clicked` with `{ timestamp, label }`
- Inputs: `trigger` (void) - programmatically click

### 2. Data Display Widget
- Listens for: `data:set` with any payload
- Displays the received data as formatted JSON

### 3. Color Picker Widget
- Emits: `color:changed` with `{ color: '#hex' }`
- Inputs: `color:set` to programmatically set color

### 4. Counter Widget
- Emits: `counter:changed` with `{ value: number }`
- Inputs: `counter:increment`, `counter:decrement`, `counter:reset`

### 5. Text Input Widget
- Emits: `text:changed` on every keystroke, `text:submitted` on Enter
- Inputs: `text:set`, `text:clear`

---

## Export to .zip Feature

```typescript
// widgetBundler.ts
import JSZip from 'jszip';

interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  html: string;
  category?: string;
  tags?: string[];
  size?: { defaultWidth: number; defaultHeight: number };
  inputs?: Array<{ id: string; name: string; type: string; description?: string }>;
  outputs?: Array<{ id: string; name: string; type: string; description?: string }>;
}

export async function exportWidget(widget: WidgetDefinition): Promise<Blob> {
  const zip = new JSZip();

  const manifest = {
    id: widget.id,
    name: widget.name,
    version: '1.0.0',
    description: widget.description,
    entry: 'index.html',
    category: widget.category || 'utility',
    tags: widget.tags || [],
    size: widget.size || { defaultWidth: 300, defaultHeight: 200 },
    io: {
      inputs: widget.inputs || [],
      outputs: widget.outputs || []
    },
    protocolVersion: 3
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('index.html', widget.html);

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## UI Layout

```
+------------------------------------------------------------------+
|  Widget Factory                              [+ New Widget] [Export All] |
+------------------------------------------------------------------+
|          |                                        |              |
| Widget   |     Widget Preview Area               |  Event Log   |
| List     |     (iframe grid)                     |              |
|          |                                        |  [clear]     |
| - btn    |  +--------+  +--------+  +--------+   |              |
| - data   |  | Widget |  | Widget |  | Widget |   | 12:00:01     |
| - color  |  |   1    |  |   2    |  |   3    |   | btn:clicked  |
| - count  |  +--------+  +--------+  +--------+   | {ts: 123}    |
| - text   |                                        |              |
|          |  +--------+  +--------+               | 12:00:02     |
| [+] Add  |  | Widget |  | Widget |               | color:changed|
|          |  |   4    |  |   5    |               | {color: #f00}|
+------------------------------------------------------------------+
```

---

## Dark Theme Colors (Match StickerNest)

```css
:root {
  --bg-primary: #0f0f19;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #252538;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent: #8b5cf6;
  --accent-hover: #7c3aed;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --border: rgba(139, 92, 246, 0.2);
}
```

---

## Event Types Reference

### Standard Events (use these for compatibility)
| Event Type | Direction | Payload | Description |
|------------|-----------|---------|-------------|
| `button:clicked` | output | `{ timestamp, label? }` | Button was clicked |
| `color:changed` | output | `{ color: string }` | Color selection changed |
| `text:changed` | output | `{ value: string }` | Text input changed |
| `text:submitted` | output | `{ value: string }` | Text submitted (Enter) |
| `data:set` | input | `any` | Set widget data |
| `counter:changed` | output | `{ value: number }` | Counter value changed |
| `trigger` | input | `void` | Trigger widget action |
| `selection:changed` | both | `{ id?, data? }` | Selection state changed |

### Custom Events
Use `namespace:action` format: `mywidget:custom-event`

---

## What to Build First

1. **Phase 1: Core Infrastructure**
   - Event bus implementation
   - Widget preview component (iframe host)
   - Basic app layout with widget list and preview area

2. **Phase 2: Example Widgets**
   - Button trigger widget
   - Data display widget
   - Create these as HTML strings stored in the app

3. **Phase 3: Event Monitoring**
   - Real-time event log panel
   - Show source widget, event type, payload, timestamp

4. **Phase 4: Export**
   - Generate manifest.json from widget metadata
   - Bundle as .zip
   - Download button per widget

5. **Phase 5: Widget Editor (Optional)**
   - In-app HTML/JS editor
   - Live preview as you type
   - Save widgets to localStorage

---

## Success Criteria

The app is complete when:
1. Multiple widgets can run side-by-side in iframes
2. Widgets can emit events that other widgets receive
3. An event log shows all events in real-time
4. Each widget can be exported as a .zip file
5. The exported .zip works when uploaded to StickerNest

---

## Remember

- **Protocol v3.0**: Always use `postMessage`, never `window.WidgetAPI`
- **READY signal**: Every widget MUST send `{ type: 'READY' }` when loaded
- **Event format**: `widget:emit` to send, `widget:event` to receive
- **Port IDs**: Event types must match `io.inputs[].id` and `io.outputs[].id` in manifest
- **Sandbox**: Widgets run in sandboxed iframes with `allow-scripts allow-same-origin`

---

Now build this Widget Factory app. Start with Phase 1 (event bus + preview component), then add example widgets. Make it beautiful with the dark purple theme.
