# StickerNest v2 — Canvas Editor Guide

This document describes the Canvas Editor UI, its modes, tools, and features for creating and managing widget layouts.

---

## Overview

The Canvas Editor provides a visual interface for:

- Placing and arranging widgets on the canvas
- Connecting widgets via the pipeline I/O system
- Editing widget properties and settings
- Managing widget layers and visibility
- Running and testing widget interactions

---

## Editor Modes

The editor operates in three distinct modes:

### Edit Mode

**Purpose:** Design and arrange widgets on the canvas.

**Features:**
- Drag widgets to reposition
- Resize widgets using handles
- Multi-select with Shift+Click or selection rectangle
- Access Properties Panel for editing
- Copy/paste widgets
- Undo/redo operations

**Toolbar:** Selection, Move, Resize tools active

### Run Mode

**Purpose:** Interact with widgets in their running state.

**Features:**
- Widgets are fully interactive
- Events flow between connected widgets
- Canvas is read-only (no repositioning)
- Real-time state updates

**Toolbar:** View-only, zoom controls available

### Connect Mode

**Purpose:** Create data connections between widgets.

**Features:**
- Visual port indicators on widgets
- Drag from output port to input port
- Connection lines show data flow
- Edit/delete existing connections

**Toolbar:** Connection tools active

---

## Keyboard Shortcuts

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected widgets |
| `Ctrl+V` | Paste widgets |
| `Ctrl+X` | Cut selected widgets |
| `Delete` | Delete selected widgets |
| `Ctrl+A` | Select all widgets |
| `Escape` | Clear selection / Cancel operation |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+0` | Reset zoom to 100% |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+F` | Fit all widgets in view |
| `Space+Drag` | Pan canvas |

### Selection

| Shortcut | Action |
|----------|--------|
| `Shift+Click` | Add/remove from selection |
| `Ctrl+Click` | Toggle selection |
| `Click+Drag` | Selection rectangle |

### Layers

| Shortcut | Action |
|----------|--------|
| `Ctrl+]` | Bring to front |
| `Ctrl+[` | Send to back |
| `Ctrl+Shift+]` | Bring forward |
| `Ctrl+Shift+[` | Send backward |

### Mode Switching

| Shortcut | Action |
|----------|--------|
| `1` | Edit mode |
| `2` | Run mode |
| `3` | Connect mode |

---

## Editor Panels

### Properties Panel

Located on the right side, shows properties for selected widget(s).

**Sections:**

1. **Transform**
   - Position (X, Y)
   - Size (Width, Height)
   - Rotation (degrees)

2. **Appearance**
   - Opacity
   - Visibility toggle
   - Lock toggle

3. **Widget Settings**
   - Dynamic properties from manifest
   - Type-appropriate editors (text, number, color, select)

4. **State**
   - Current widget state (read-only in edit mode)
   - State editor (in debug mode)

**Multi-Selection:**
When multiple widgets are selected, shows common properties that can be edited together.

### Layers Panel

Located on the left side, shows widget hierarchy.

**Features:**

- Drag to reorder z-index
- Eye icon to toggle visibility
- Lock icon to prevent editing
- Search/filter widgets
- Expand/collapse groups

**Context Menu:**
- Rename widget
- Duplicate
- Delete
- Lock/Unlock
- Show/Hide
- Group selection

### Widget Library Panel

Located on the left side, shows available widgets.

**Categories:**
- Built-in widgets
- User-created widgets
- Marketplace widgets
- Recently used

**Actions:**
- Click to add to canvas
- Drag to place at position
- Search by name/tag
- Filter by category

---

## Tools

### Selection Tool (V)

Default tool for selecting and manipulating widgets.

**Behaviors:**
- Click widget to select
- Shift+Click to add to selection
- Click empty space to deselect all
- Drag selected widget(s) to move
- Drag corner handles to resize

### Move Tool (M)

Dedicated tool for repositioning widgets.

**Behaviors:**
- Drag any part of widget to move
- Constrain to axis with Shift
- Enable snapping with Alt

### Resize Tool (S)

Dedicated tool for resizing widgets.

**Behaviors:**
- 8 handles: corners and edges
- Corner handles resize proportionally
- Edge handles resize in one dimension
- Shift constrains aspect ratio
- Alt resizes from center

### Pan Tool (H)

Navigate the canvas.

**Behaviors:**
- Drag to pan canvas
- Scroll wheel to zoom
- Double-click to reset view

---

## Grid and Snapping

### Grid Options

| Setting | Description |
|---------|-------------|
| Show Grid | Toggle grid visibility |
| Grid Size | Spacing in pixels (8, 16, 32, 64) |
| Grid Color | Grid line color |
| Subdivisions | Minor grid lines |

### Snap Options

| Setting | Description |
|---------|-------------|
| Snap to Grid | Align to grid lines |
| Snap to Objects | Align to other widgets |
| Snap to Guides | Align to custom guides |
| Smart Guides | Dynamic alignment hints |

**Snap Indicators:**
- Blue lines show alignment
- Distance labels when near other widgets
- Center point alignment

---

## Viewport Controls

### Zoom

- Range: 10% to 400%
- Zoom slider in toolbar
- Zoom dropdown for presets
- Fit to screen option

### Pan

- Space+Drag to pan
- Middle mouse button drag
- Touch: two-finger pan

### Minimap

Optional minimap in bottom-right corner:
- Shows entire canvas overview
- Click to navigate
- Drag viewport rectangle

---

## State Management

### Editor State

The editor uses Zustand for state management:

```typescript
interface EditorState {
    mode: 'edit' | 'run' | 'connect';
    activeTool: 'select' | 'pan' | 'move' | 'resize' | 'connect';
    selection: Set<string>;
    clipboard: WidgetInstance[];
    grid: {
        visible: boolean;
        size: number;
        snap: boolean;
    };
    viewport: {
        zoom: number;
        offsetX: number;
        offsetY: number;
    };
    history: {
        past: CanvasState[];
        future: CanvasState[];
    };
}
```

### Actions

```typescript
// Selection
selectWidget(id: string): void
addToSelection(id: string): void
removeFromSelection(id: string): void
clearSelection(): void
selectAll(): void

// Clipboard
copy(): void
cut(): void
paste(): void

// History
undo(): void
redo(): void
pushHistory(state: CanvasState): void

// Viewport
setZoom(zoom: number): void
panTo(x: number, y: number): void
fitToScreen(): void
resetView(): void

// Grid
toggleGrid(): void
setGridSize(size: number): void
toggleSnap(): void

// Mode
setMode(mode: EditorMode): void
setTool(tool: EditorTool): void
```

---

## Widget Operations

### Adding Widgets

1. **From Library:** Click or drag widget from library panel
2. **From Clipboard:** Ctrl+V to paste copied widgets
3. **Programmatic:** Use canvas API to add widgets

### Transforming Widgets

```typescript
// Update widget transform
updateWidget(id: string, {
    position: { x: 100, y: 200 },
    width: 300,
    height: 200,
    rotation: 45,
    zIndex: 10
});
```

### Grouping Widgets

1. Select multiple widgets
2. Right-click → Group
3. Group acts as single widget for transforms
4. Double-click to enter group
5. Click outside to exit group

### Locking Widgets

- Lock prevents selection and modification
- Useful for background elements
- Locked widgets still run in Run mode

---

## Connection Mode

### Creating Connections

1. Enter Connect mode (press `3`)
2. Click output port on source widget
3. Drag to input port on target widget
4. Release to create connection

### Port Types

| Type | Color | Description |
|------|-------|-------------|
| `any` | Gray | Accepts any data |
| `string` | Blue | Text data |
| `number` | Green | Numeric data |
| `boolean` | Yellow | True/false |
| `object` | Purple | Structured data |
| `array` | Orange | Lists |
| `event` | Red | Trigger signals |

### Connection Rules

- Compatible types only (or `any`)
- No circular connections
- One input can have multiple sources
- One output can connect to multiple inputs

### Managing Connections

- Click connection line to select
- Press Delete to remove
- Right-click for context menu
- Drag endpoint to reconnect

---

## Responsive Design

### Breakpoints

Define different layouts for screen sizes:

```typescript
interface Breakpoint {
    name: string;
    minWidth: number;
    maxWidth: number;
}

const breakpoints = [
    { name: 'mobile', minWidth: 0, maxWidth: 767 },
    { name: 'tablet', minWidth: 768, maxWidth: 1023 },
    { name: 'desktop', minWidth: 1024, maxWidth: Infinity }
];
```

### Per-Breakpoint Properties

- Position and size
- Visibility
- Widget settings

### Preview Mode

- Dropdown to select breakpoint
- Resize canvas to match
- Test responsive behavior

---

## Performance

### Optimization Settings

| Setting | Description |
|---------|-------------|
| Render Quality | Low/Medium/High |
| Animation FPS | Frame rate limit |
| Lazy Loading | Load widgets on scroll |
| Memory Limit | Max cached widgets |

### Best Practices

1. Limit widgets per canvas (recommended: <50)
2. Use grouping for complex layouts
3. Disable unused widgets
4. Optimize widget code

---

## Integration

### React Usage

```tsx
import {
    EditorProvider,
    EditorToolbar,
    PropertiesPanel,
    LayersPanel,
    WidgetLibraryPanel,
    Canvas
} from '@/components/editor';

function CanvasEditor() {
    return (
        <EditorProvider canvasId="my-canvas">
            <div className="editor-layout">
                <EditorToolbar />
                <div className="editor-body">
                    <LayersPanel />
                    <WidgetLibraryPanel />
                    <Canvas />
                    <PropertiesPanel />
                </div>
            </div>
        </EditorProvider>
    );
}
```

### Using Editor Store

```typescript
import { useEditorStore } from '@/editor';

function MyComponent() {
    const { mode, selection, setMode, selectWidget } = useEditorStore();

    return (
        <div>
            <p>Mode: {mode}</p>
            <p>Selected: {selection.size} widgets</p>
            <button onClick={() => setMode('run')}>Run</button>
        </div>
    );
}
```

---

## Customization

### Custom Tools

Extend the editor with custom tools:

```typescript
interface CustomTool {
    id: string;
    name: string;
    icon: React.ReactNode;
    cursor: string;
    onActivate?: () => void;
    onDeactivate?: () => void;
    onMouseDown?: (e: MouseEvent) => void;
    onMouseMove?: (e: MouseEvent) => void;
    onMouseUp?: (e: MouseEvent) => void;
}
```

### Custom Panels

Add custom panels to the editor:

```tsx
function CustomPanel() {
    return (
        <EditorPanel title="My Panel" position="left">
            {/* Panel content */}
        </EditorPanel>
    );
}
```

---

## Accessibility

### Keyboard Navigation

- Tab through widgets
- Arrow keys to move selected
- Enter to activate widget
- Escape to deselect

### Screen Reader Support

- ARIA labels for widgets
- Live regions for notifications
- Role annotations

### High Contrast Mode

- Respects system settings
- Custom high contrast theme

---

## Related Documentation

- [Widget Runtime API](./WIDGET-RUNTIME-API.md) - Widget API reference
- [Widget Development](./WIDGET-DEVELOPMENT.md) - Creating widgets
- [Architecture](./ARCHITECTURE.md) - System design
