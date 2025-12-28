# Alpha Canvas Design Tools - Audit & Implementation Plan

## Executive Summary

This document outlines the path to building Canva/Illustrator-inspired design tools for StickerNest Alpha. The goal is to create **modular design software** where:

- Entities (shapes, text, images, vectors) spawn **directly onto the canvas** (not inside another widget)
- Tool widgets can **manipulate canvas entities** like a real design program
- A **dockable toolbar** holds design tools that slot together like Lego bricks
- UI is clean, professional, and functional - no half-built previews or confusing interfaces

---

## Current State Audit

### What We Already Have

| Component | Status | Location |
|-----------|--------|----------|
| **Entity Types** (10 types) | Defined | `src/types/entities.ts` |
| **Tool Store** | Functional | `src/state/useToolStore.ts` |
| **Tool Canvas Interaction** | Partial | `src/hooks/useToolCanvasInteraction.ts` |
| **Entity Store** | Full CRUD | `src/state/entityStore.ts` |
| **Canvas Component** | Widget rendering | `src/components/editor/Canvas.tsx` |
| **Widget Protocol v3.0** | Stable | `src/runtime/WidgetAPI.ts` |
| **Pipeline System** | Working | `src/runtime/PipelineRuntime.ts` |
| **18 Builtin Widgets** | Reference | `src/widgets/builtin/` |

### Entity Types Already Defined

```typescript
// From src/types/entities.ts
EntityType = 'text' | 'image' | 'lottie' | 'widget' | 'timer' | 'data' | 'audio' | 'video' | 'vector' | 'object3d';

// VectorShapeEntity supports: rectangle, circle, triangle, polygon, star, ellipse, line, arrow
// Object3DEntity supports: cube, sphere, cylinder, cone, torus, plane, custom
```

### Tool Categories Already Defined

```typescript
// From src/state/useToolStore.ts
ToolCategory = 'select' | 'pan' | 'shape' | 'line' | 'text' | 'image' | 'object3d' | 'more' | 'container';
```

### The Critical Gap

**Entities exist but are NOT canvas-renderable:**

1. `Entity` types have no `x, y` position - they're pure data
2. `Canvas.tsx` only renders `WidgetInstance` objects in iframes
3. `useToolCanvasInteraction` emits events (`canvas:add-text`, `canvas:add-shape`) but nothing listens
4. No system connects Tool -> Entity -> Canvas rendering

---

## Architecture Decision

### Option A: Direct Entity Rendering (Recommended)

Add a **CanvasEntity** layer that:
- Extends entities with `x, y, width, height, rotation, zIndex`
- Renders directly in Canvas transform container (no iframes)
- Uses the same selection/manipulation as widgets
- Tools create/modify these canvas entities

**Pros:** Lightweight, performant, native canvas integration
**Cons:** New rendering layer to build

### Option B: Wrapper Widget Approach

Create special "entity widgets" that wrap entities in minimal widgets.

**Pros:** Uses existing widget infrastructure
**Cons:** Iframe overhead, overkill for simple shapes

**Decision: Option A** - Direct canvas entity rendering for design objects.

---

## Implementation Plan (4 Parts)

### Part 1: Canvas Entity Foundation

**Goal:** Make entities spawnable and renderable directly on the canvas.

#### 1.1 Create CanvasEntity Type
```typescript
// New: src/types/canvasEntity.ts
interface CanvasEntity {
  id: string;
  entityId: string;              // Reference to Entity in entityStore
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
}
```

#### 1.2 Create Canvas Entity Store
```typescript
// New: src/state/useCanvasEntityStore.ts
interface CanvasEntityStore {
  entities: Map<string, CanvasEntity>;
  selectedIds: Set<string>;

  // CRUD
  addEntity(entity: CanvasEntity): void;
  updateEntity(id: string, updates: Partial<CanvasEntity>): void;
  deleteEntity(id: string): void;

  // Selection
  selectEntity(id: string, additive?: boolean): void;
  deselectAll(): void;

  // Z-ordering
  bringToFront(id: string): void;
  sendToBack(id: string): void;
}
```

#### 1.3 Add Entity Rendering to Canvas
- Extend `Canvas.tsx` to render `CanvasEntity` objects alongside widgets
- Create `<CanvasEntityRenderer>` component for each entity type:
  - `<TextEntityRenderer>`
  - `<VectorShapeRenderer>` (SVG-based)
  - `<ImageEntityRenderer>`
  - `<Object3DEntityRenderer>` (Three.js mini-canvas)

#### 1.4 Wire Tool Events to Entity Creation
- Listen for `canvas:add-text`, `canvas:add-shape`, `canvas:add-image` events
- Create both `Entity` (data) and `CanvasEntity` (position/render)

---

### Part 2: Tool System Architecture

**Goal:** Create a robust tool system that widgets can plug into.

#### 2.1 Extend Tool Store
```typescript
// Extend src/state/useToolStore.ts
interface ToolState {
  activeTool: ActiveTool;
  activeToolWidgetId: string | null;  // NEW: Which widget owns active tool

  // Tool modes
  isDrawing: boolean;
  drawStart: { x: number; y: number } | null;

  // Tool-specific state
  penState: PenToolState | null;
  selectionState: SelectionToolState | null;
}
```

#### 2.2 Create Tool API for Widgets
```typescript
// New: Widget capability for tools
interface ToolCapability {
  type: 'tool';
  toolId: string;
  toolCategory: ToolCategory;
  cursor: string;

  // Tool behavior
  onCanvasClick?: (x: number, y: number) => void;
  onCanvasDrag?: (start: Point, end: Point) => void;
  onCanvasHover?: (x: number, y: number) => void;
}
```

#### 2.3 Canvas Tool Modes
- **Select Mode:** Click to select entities, drag to move
- **Draw Mode:** Click-drag to create shapes
- **Transform Mode:** Resize/rotate selected entities
- **Path Mode:** Click to add path points (pen tool)

#### 2.4 Entity Manipulation API
```typescript
// Events widgets can emit to manipulate canvas entities
'entity:create' -> { type, data, position }
'entity:update' -> { entityId, updates }
'entity:delete' -> { entityId }
'entity:select' -> { entityId, additive }
'entity:transform' -> { entityId, transform }
```

---

### Part 3: Toolbar Widget

**Goal:** Create a professional dockable toolbar with empty tool slots.

#### 3.1 Toolbar Widget Design

```
+------------------------------------------+
|  [Select] [Hand]  |  [Shape v]  [Text]   |  <- Row 1: Primary tools
+------------------------------------------+
|  [Pen]  [Line]  [Image]  [...]           |  <- Row 2: Drawing tools
+------------------------------------------+
|  Dock Zone (drag tools here)             |  <- Expandable dock
+------------------------------------------+
```

#### 3.2 Toolbar Manifest
```typescript
manifest: {
  id: 'stickernest.design-toolbar',
  name: 'Design Toolbar',
  kind: 'interactive',
  inputs: {
    'tools.register': { type: 'object', description: 'Register a tool' },
    'tools.activate': { type: 'string', description: 'Activate tool by ID' },
  },
  outputs: {
    'tools.activated': { type: 'string', description: 'Currently active tool' },
    'tools.action': { type: 'object', description: 'Tool action event' },
  }
}
```

#### 3.3 Tool Slots
- Empty slots widgets can dock into
- Slot types: `primary`, `drawing`, `modifier`, `custom`
- Drag-and-drop tool arrangement
- Collapsible sections

#### 3.4 Built-in Tools (Render in Toolbar)
These are NOT separate widgets - they're built into the toolbar:
- Select/Move (V)
- Hand/Pan (H)
- Zoom (Z)
- Shape dropdown (U)
- Text (T)
- Pen (P)
- Line (L)

---

### Part 4: Design Tool Widgets

**Goal:** Create modular design tool widgets that plug into the system.

#### 4.1 Tool Widgets (Can dock in toolbar or float)

| Widget | Function | Toolbar Icon |
|--------|----------|--------------|
| **Shape Tool** | Draw shapes on canvas | Rectangle icon |
| **Text Tool** | Add/edit text | T icon |
| **Pen Tool** | Draw vector paths | Pen nib icon |
| **Color Picker** | Set fill/stroke color | Color swatch |
| **Gradient Tool** | Apply gradients | Gradient icon |
| **Image Tool** | Add photos to canvas | Image icon |

#### 4.2 Property Panel Widgets (Float or dock to side)

| Widget | Function |
|--------|----------|
| **Fill & Stroke** | Color, opacity, stroke settings |
| **Typography** | Font, size, weight, spacing |
| **Transform** | Position, size, rotation |
| **Effects** | Shadow, blur, opacity |
| **Layers** | Z-order, visibility, lock |

#### 4.3 Shape Tool Widget
```typescript
manifest: {
  id: 'stickernest.shape-tool',
  name: 'Shape Tool',
  kind: 'interactive',
  size: { width: 48, height: 48 },  // Toolbar icon size
  inputs: {
    'shape.type': { type: 'string' },
  },
  outputs: {
    'shape.draw': { type: 'object' },  // { type, fill, stroke, position, size }
  }
}
```

#### 4.4 Color Picker Widget
```typescript
manifest: {
  id: 'stickernest.color-picker',
  name: 'Color Picker',
  kind: 'interactive',
  size: { width: 240, height: 320 },
  inputs: {
    'color.set': { type: 'string' },
    'mode.set': { type: 'string' },  // 'fill' | 'stroke'
  },
  outputs: {
    'color.changed': { type: 'string' },
    'fill.changed': { type: 'string' },
    'stroke.changed': { type: 'string' },
  }
}
```

#### 4.5 Typography Widget
```typescript
manifest: {
  id: 'stickernest.typography',
  name: 'Typography',
  kind: 'interactive',
  size: { width: 280, height: 200 },
  inputs: {
    'selection.text': { type: 'object' },
  },
  outputs: {
    'font.family': { type: 'string' },
    'font.size': { type: 'number' },
    'font.weight': { type: 'string' },
    'text.align': { type: 'string' },
    'line.height': { type: 'number' },
    'letter.spacing': { type: 'number' },
  }
}
```

#### 4.6 Effects Widget (Shadow, Outline, Blur)
```typescript
manifest: {
  id: 'stickernest.effects',
  name: 'Effects',
  kind: 'interactive',
  inputs: {
    'selection.entity': { type: 'object' },
  },
  outputs: {
    'shadow.settings': { type: 'object' },
    'outline.settings': { type: 'object' },
    'blur.amount': { type: 'number' },
    'opacity.value': { type: 'number' },
  }
}
```

---

## Widgets to Build (Priority Order)

### Phase 1: Foundation (Required for Alpha)
1. **Design Toolbar** - Dockable toolbar with tool slots
2. **Shape Tool** (built into toolbar + dropdown)
3. **Text Tool** (built into toolbar)
4. **Color Picker** - Essential for any design work

### Phase 2: Core Tools
5. **Fill & Stroke Panel** - Color, opacity, stroke settings
6. **Typography Panel** - Font settings
7. **Transform Panel** - Position, size, rotation
8. **Image Tool** - Add photos

### Phase 3: Advanced
9. **Pen Tool** - Vector path drawing
10. **Gradient Tool** - Linear/radial gradients
11. **Effects Panel** - Shadow, outline, blur
12. **Layers Panel** - Z-order management

### Phase 4: Polish
13. **Shape Builder** - Boolean operations
14. **Blend Modes** - Multiply, screen, etc.
15. **Alignment Tools** - Align/distribute

---

## Technical Notes

### Entity-to-Canvas Binding

```
User clicks canvas with Shape tool
  ↓
useToolCanvasInteraction emits 'canvas:add-shape'
  ↓
Canvas event listener creates:
  1. Entity in EntityStore (data: fill, stroke, type)
  2. CanvasEntity in CanvasEntityStore (position, size, zIndex)
  ↓
Canvas re-renders with new CanvasEntityRenderer
  ↓
User can select/move/resize the shape
```

### Widget-to-Entity Communication

```
Widget emits 'entity:update' with { entityId, updates }
  ↓
EventBus routes to Canvas
  ↓
Canvas updates EntityStore and CanvasEntityStore
  ↓
Entity re-renders with new properties
```

### Selection System

```
Current: selection.selectedIds (for WidgetInstances)
New: entitySelection.selectedIds (for CanvasEntities)

Both can coexist - selection mode determines which is active.
```

---

## UI/UX Guidelines

### Design Principles
1. **Clean & Minimal** - No cluttered toolbars or confusing nested panels
2. **Familiar** - Match Adobe/Canva conventions where possible
3. **Responsive** - Tools adapt to available space
4. **Keyboard-first** - Single-key shortcuts for common tools (V, H, T, etc.)

### Toolbar Layout
- Compact mode: Single row with dropdowns
- Expanded mode: Multiple rows for touch/beginners
- Floating tools: Can be dragged off toolbar

### Property Panels
- Context-sensitive: Show relevant properties for selection
- Collapsible sections: Don't overwhelm with options
- Live preview: Changes apply immediately

---

## File Structure

```
src/
├── types/
│   ├── entities.ts          # Existing entity types
│   └── canvasEntity.ts      # NEW: Canvas-renderable entities
├── state/
│   ├── useToolStore.ts      # Existing tool state (extend)
│   └── useCanvasEntityStore.ts  # NEW: Canvas entity state
├── components/
│   └── editor/
│       ├── Canvas.tsx       # Extend for entity rendering
│       └── entities/        # NEW: Entity renderers
│           ├── TextEntityRenderer.tsx
│           ├── VectorShapeRenderer.tsx
│           ├── ImageEntityRenderer.tsx
│           └── CanvasEntityWrapper.tsx
├── widgets/
│   └── builtin/
│       ├── DesignToolbarWidget.ts    # NEW
│       ├── ColorPickerWidget.ts      # NEW
│       ├── TypographyWidget.ts       # NEW
│       ├── FillStrokeWidget.ts       # NEW
│       ├── TransformWidget.ts        # NEW
│       └── EffectsWidget.ts          # NEW
└── hooks/
    ├── useToolCanvasInteraction.ts   # Extend for entity creation
    └── useEntitySelection.ts          # NEW: Entity selection
```

---

## Success Criteria

For Alpha release, users should be able to:

1. Select the Shape tool from toolbar
2. Click-drag on canvas to draw a rectangle
3. Select the shape on canvas
4. Use Color Picker to change fill color
5. Use Transform panel to resize/rotate
6. Add text with Text tool
7. Style text with Typography panel
8. Add images with Image tool
9. Layer multiple elements with z-order controls
10. Save and reload canvas with all entities

---

## Next Steps

1. Review this plan for architectural approval
2. Start Part 1: Canvas Entity Foundation
3. Build incrementally with E2E tests for each feature
4. Ship minimal viable toolbar for Alpha testing
