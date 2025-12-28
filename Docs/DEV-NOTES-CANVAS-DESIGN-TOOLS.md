# Development Notes: Canvas Design Tools

> Notes taken during implementation to help future development.

## Key Insights from Codebase Audit

### Existing Infrastructure We're Building On

1. **Entity Types** (`src/types/entities.ts`) - 10 types already defined
   - TextEntity, ImageEntity, VectorShapeEntity, Object3DEntity
   - Each has defaults and factory functions via `createEntity()`

2. **Tool Store** (`src/state/useToolStore.ts`) - Tool categories exist
   - `ToolCategory = 'select' | 'pan' | 'shape' | 'line' | 'text' | 'image' | 'object3d' | 'more' | 'container'`
   - Has `shapeDefaults`, `textDefaults`, `object3dDefaults`

3. **Skin System** (`src/state/useSkinStore.ts`) - Full theming infrastructure
   - `SkinSlot` in manifest declares customizable CSS variables
   - `useWidgetSkin` hook for widgets to consume/override styles
   - Built-in skins registered in `src/skins/`

4. **Tool Canvas Interaction** (`src/hooks/useToolCanvasInteraction.ts`)
   - Emits events: `canvas:add-shape`, `canvas:add-text`, `canvas:add-image`
   - Has SVG generators for shapes
   - **GAP**: Nothing listens to these events!

### The Architecture Gap

Current flow is broken:
```
Tool click → useToolCanvasInteraction emits event → ??? → Nothing happens
```

We need to complete:
```
Tool click → emit event → Canvas listener → Create CanvasEntity → Render on canvas
```

### Why Not Wrap Entities in Widgets?

We considered making each entity a lightweight widget, but:
- **Iframe overhead** - Too heavy for simple shapes
- **Selection mismatch** - Widget selection ≠ entity selection
- **Performance** - 100 shapes = 100 iframes = bad

Instead: **Direct canvas rendering** with a new `CanvasEntity` layer.

---

## Implementation Patterns

### Pattern: CanvasEntity vs Entity

```typescript
// Entity = pure data (no position)
interface TextEntity {
  id: string;
  type: 'text';
  content: string;
  fontFamily: string;
  // ... data properties
}

// CanvasEntity = renderable (has position)
interface CanvasEntity {
  id: string;
  entityId: string;  // Links to Entity
  type: EntityType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // ... render properties
}
```

This separation allows:
- Same entity data to render in multiple places
- Entity data to sync to backend without canvas state
- Clean undo/redo on canvas transforms vs data changes

### Pattern: Widget Skinning

Toolbar will be the first fully skinnable widget. Pattern:

```typescript
// In manifest
skin: {
  themeable: true,
  slots: [
    { name: 'toolbar-bg', type: 'color', defaultValue: '#1a1a2e' },
    { name: 'tool-active', type: 'color', defaultValue: '#8b5cf6' },
    { name: 'tool-hover', type: 'color', defaultValue: 'rgba(139, 92, 246, 0.2)' },
  ],
  usesVariables: ['--sn-bg-secondary', '--sn-accent-primary'],
}

// In HTML
<style>
  :root {
    --toolbar-bg: var(--sn-toolbar-bg, var(--sn-bg-secondary, #1a1a2e));
    --tool-active: var(--sn-tool-active, var(--sn-accent-primary, #8b5cf6));
  }
</style>
```

### Pattern: Tool Event Flow

```
1. User clicks tool in toolbar
2. Toolbar emits: tools.activated = 'shape:rectangle'
3. useToolStore updates activeTool
4. User clicks canvas
5. useToolCanvasInteraction calls createShapeAtPosition()
6. EventBus emits canvas:add-shape
7. Canvas listener creates CanvasEntity + Entity
8. Canvas re-renders
9. Tool resets to 'select' (one-shot creation)
```

---

## File Size Guidelines

Keep files under 500-600 lines by splitting:

| Large File | Split Into |
|------------|------------|
| `useCanvasEntityStore.ts` | types + store + selectors (if needed) |
| `DesignToolbarWidget.ts` | manifest + html (separate template file if > 300 lines) |
| `Canvas.tsx` | Already 960 lines - extract entity layer to `CanvasEntityLayer.tsx` |

---

## Skinning Foundation for AI Pipeline

The DesignToolbarWidget is the **FIRST fully skinnable widget** and establishes patterns for AI-generated widgets.

### Complete Skin Slot Pattern

```typescript
// In widget manifest
skin: {
  themeable: true,
  defaultSkin: 'toolbar-default',

  slots: [
    // Each slot defines a customizable CSS variable
    {
      name: 'toolbar-bg',           // CSS var: --sn-toolbar-bg
      type: 'color',                // Types: color, size, font, shadow, border
      defaultValue: '#1a1a2e',      // Fallback value
      description: 'Background',    // For AI/user understanding
    },
    {
      name: 'tool-bg-hover',
      type: 'color',
      defaultValue: 'rgba(139, 92, 246, 0.2)',
      description: 'Tool hover background',
    },
    // ... more slots
  ],

  // Document which global theme variables the widget uses
  usesVariables: [
    '--sn-bg-secondary',
    '--sn-accent-primary',
    '--sn-text-primary',
    '--sn-text-secondary',
  ],
}
```

### CSS Variable Fallback Chain

The **triple-fallback pattern** ensures widgets work in any theme context:

```css
/* Pattern: var(--slot-specific, var(--global-theme, #hardcoded-fallback)) */

:root {
  /* Slot-specific → Global theme → Hardcoded default */
  --toolbar-bg: var(--sn-toolbar-bg, var(--sn-bg-secondary, #1a1a2e));
  --tool-color: var(--sn-tool-color, var(--sn-text-secondary, #94a3b8));
  --tool-color-active: var(--sn-tool-color-active, var(--sn-accent-primary, #8b5cf6));
  --tool-bg-hover: var(--sn-tool-bg-hover, rgba(139, 92, 246, 0.2));
}
```

**Why triple-fallback?**
1. `--sn-toolbar-bg` - Allows per-widget skin customization
2. `--sn-bg-secondary` - Falls back to current global theme
3. `#1a1a2e` - Works even with no theme loaded

### Skin Input Port

Widgets can receive runtime skin overrides via the `skin.apply` input:

```typescript
// In manifest inputs
inputs: {
  'skin.apply': {
    type: 'object',
    description: 'Apply skin overrides { variable: value }',
  },
}

// In widget JS
API.onInput('skin.apply', function(overrides) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(overrides)) {
    const varName = key.startsWith('--') ? key : '--' + key;
    root.style.setProperty(varName, value);
  }
});
```

This enables:
- Pipeline widgets to send color picks to toolbar
- Theme preview widgets to test skins
- AI to dynamically adjust widget appearance

### 16 Toolbar Skin Slots Reference

| Slot Name | Type | Purpose |
|-----------|------|---------|
| toolbar-bg | color | Toolbar background |
| toolbar-border | border | Toolbar border style |
| toolbar-shadow | shadow | Toolbar drop shadow |
| tool-bg-hover | color | Tool button hover state |
| tool-bg-active | color | Active tool background |
| tool-color | color | Tool icon default color |
| tool-color-hover | color | Tool icon hover color |
| tool-color-active | color | Active tool icon color |
| divider-color | color | Separator line color |
| dropdown-bg | color | Dropdown menu background |
| dropdown-item-hover | color | Dropdown item hover |
| dropdown-item-selected | color | Selected dropdown item |
| tooltip-bg | color | Tooltip background |
| tooltip-color | color | Tooltip text |
| slot-border | border | Empty tool slot border |
| slot-border-hover | border | Tool slot hover border |

### AI Widget Generation Flow

```
1. AI generates widget manifest with skin slots
2. AI generates HTML with CSS using triple-fallback pattern
3. AI optionally generates skin preset JSON
4. User imports widget → skin slots appear in skin editor
5. User customizes or AI generates variations
```

### Creating Skin Presets

```typescript
// Skin preset file: skins/toolbar-dark-purple.json
{
  "id": "toolbar-dark-purple",
  "name": "Dark Purple",
  "targetWidget": "stickernest.design-toolbar",
  "values": {
    "--sn-toolbar-bg": "#1e1b4b",
    "--sn-tool-bg-active": "#7c3aed",
    "--sn-tool-color-active": "#ffffff",
    "--sn-dropdown-bg": "#2e1065"
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
- `useCanvasEntityStore.test.ts` - CRUD, selection, z-ordering
- Entity renderers - snapshot tests

### E2E Tests (Playwright)
- Draw shape on canvas
- Select and move entity
- Change entity properties via tool widgets
- Toolbar skin switching

---

## Key Decisions Log

| Decision | Rationale |
|----------|-----------|
| Direct entity rendering | Performance, avoids iframe overhead |
| Separate CanvasEntity from Entity | Clean separation of data vs render state |
| Toolbar as first skinnable widget | Establishes pattern, high visibility |
| Tool events via EventBus | Consistent with existing architecture |
| One-shot tool mode | Matches industry standard (Figma, Canva) |

---

## Completed Implementation

- [x] **Part 1: Canvas Entity Foundation**
  - `src/types/canvasEntity.ts` - CanvasEntity types, guards, factories
  - `src/state/useCanvasEntityStore.ts` - Zustand store with CRUD, selection, z-ordering, clipboard
  - `src/components/editor/entities/` - VectorShapeRenderer, TextEntityRenderer, ImageEntityRenderer, CanvasEntityWrapper
  - `src/components/editor/CanvasEntityLayer.tsx` - Canvas layer for rendering entities
  - `src/hooks/useCanvasEntityEvents.ts` - Event listener to create entities from tool interactions
  - Modified `Canvas.tsx` to integrate entity layer

- [x] **Part 3: Toolbar Widget with Skinning**
  - `src/widgets/builtin/DesignToolbarWidget.ts` - First fully skinnable widget
  - 16 skin slots documented and implemented
  - Tools: Select (V), Pan (H), Shape dropdown (U), Text (T), Line (L), Image (I)
  - Keyboard shortcuts for all tools
  - Empty tool slot for dockable widgets
  - Skin input port for runtime customization

## TODO for Future Sessions

- [ ] **Part 2: Tool System Architecture** - Extend useToolStore with drawing state, tool modes
- [ ] **Part 4: Design Tool Widgets** - ColorPicker, Typography, Transform, Effects, Gradient, Pen, ShapeBuilder
- [ ] Consider undo/redo for entity transforms (CommandStack exists)
- [ ] Entity grouping (multiple entities as one selection)
- [ ] Copy/paste entities across canvases
- [ ] Alignment/distribution tools
- [ ] Path editing mode for pen tool
- [ ] 3D entity renderer (Three.js integration)
- [ ] Audio entity renderer (waveform visualization)
