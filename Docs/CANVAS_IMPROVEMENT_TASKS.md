# StickerNest v2 - Canvas Improvement Tasks

## Agent Instructions

### CRITICAL RULES - READ FIRST

1. **DO NOT DELETE EXISTING CODE** unless explicitly replacing it with working equivalent functionality. Comment out deprecated code with `// DEPRECATED: [reason]` instead of removing.

2. **DO NOT OVER-ENGINEER**. Each task should be completable in a focused session. No abstract factories, no excessive interfaces, no "future-proofing" that isn't explicitly requested.

3. **INCREMENTAL CHANGES ONLY**. Each commit should leave the app in a working state. Test that the canvas still loads and widgets can be dragged before moving on.

4. **PRESERVE EXISTING BEHAVIOR** while adding new features. If something works now, it should still work after your changes.

5. **USE EXISTING PATTERNS**. This codebase uses:
   - Zustand for state management
   - React functional components with hooks
   - TypeScript with explicit types
   - CSS-in-JS with style objects
   - SNIcon, SNIconButton, SNPanel from `../shared-ui/`

6. **NO NEW DEPENDENCIES** without explicit approval. Use what's already installed.

7. **MATCH EXISTING CODE STYLE**. Look at surrounding code and match formatting, naming conventions, and patterns.

---

## Pre-Flight Checklist

Before starting ANY task:
- [ ] Run `npm run dev` and verify the app loads
- [ ] Navigate to Gallery page and verify canvas works
- [ ] Verify you can drag, resize, and rotate a widget
- [ ] Check browser console for errors

After EACH task:
- [ ] Run the same checks above
- [ ] Commit with descriptive message
- [ ] Note any regressions in task notes

---

## TASK 0: Landing Page Sign-In Access (Do First)

**Goal**: Add a simple sign-in button on the landing page that navigates to the gallery. This is temporary for alpha testing.

**Location**: `src/pages/LandingPage.tsx`

**Requirements**:
1. Add a small, unobtrusive "Sign In" or "Enter Gallery" button in the top-right corner of the landing page header
2. Button should use existing SNButton or SNIconButton component
3. On click, navigate to `/gallery` using React Router's `useNavigate`
4. Style should be subtle (glass variant, small size) - NOT the hero CTA
5. Add a small comment: `// TODO: Remove for production launch - temporary alpha access`

**DO NOT**:
- Create a full authentication system
- Add user/password fields
- Modify any routing configuration
- Change the landing page layout significantly

**Example Implementation**:
```tsx
// In the header/nav section of LandingPage.tsx
// TODO: Remove for production launch - temporary alpha access
<SNButton
  variant="glass"
  size="sm"
  onClick={() => navigate('/gallery')}
>
  Enter Gallery
</SNButton>
```

---

## TASK 1: Coordinate Transformation Service

**Goal**: Create a single source of truth for coordinate transformations between screen, canvas, and widget spaces.

**Create File**: `src/canvas/CoordinateService.ts`

**Requirements**:
```typescript
// Minimal interface - DO NOT ADD MORE than needed
export interface CoordinateService {
  // Screen pixel → Canvas coordinate (accounting for zoom + pan)
  screenToCanvas(screenX: number, screenY: number, viewport: ViewportState): { x: number; y: number };

  // Canvas coordinate → Screen pixel
  canvasToScreen(canvasX: number, canvasY: number, viewport: ViewportState): { x: number; y: number };

  // Get delta in canvas space from screen delta
  screenDeltaToCanvas(deltaX: number, deltaY: number, zoom: number): { dx: number; dy: number };
}
```

**Implementation Notes**:
- Export as singleton: `export const coordinateService = { ... }`
- Keep math simple: `canvasX = (screenX - panX) / zoom`
- NO classes, NO complex abstractions
- Under 50 lines of code

**Then Update**: `src/components/WidgetFrame.tsx`
- Import coordinateService
- Replace inline calculations in `handleDragMove` (line ~288) with service calls
- Replace inline calculations in `handleResizeMove` (line ~338) with service calls
- Keep existing logic, just swap the math

**DO NOT**:
- Create transform matrices
- Add rotation to coordinate service yet
- Refactor the entire WidgetFrame component
- Change any component structure

---

## TASK 2: Command-Based Undo/Redo System

**Goal**: Replace snapshot-based history with efficient command pattern.

**Create Files**:
```
src/canvas/history/
├── Command.ts           # Interface + base types
├── CommandStack.ts      # Undo/redo stack management
└── commands/
    ├── MoveCommand.ts
    ├── ResizeCommand.ts
    └── PropertyCommand.ts  # Generic property changes
```

**Command Interface** (`Command.ts`):
```typescript
export interface Command {
  id: string;
  name: string;           // For display: "Move Widget", "Resize Widget"
  timestamp: number;
  execute(): void;        // Apply the change
  undo(): void;           // Reverse the change
  merge?(other: Command): Command | null;  // Combine with previous (optional)
}
```

**CommandStack** (`CommandStack.ts`):
```typescript
// Max 100 commands, simple array-based stack
// Methods: push(cmd), undo(), redo(), canUndo(), canRedo(), clear()
// Store in Zustand slice, NOT a separate store
```

**MoveCommand** (`commands/MoveCommand.ts`):
```typescript
export function createMoveCommand(
  widgetId: string,
  fromPosition: { x: number; y: number },
  toPosition: { x: number; y: number }
): Command {
  return {
    id: `move-${widgetId}-${Date.now()}`,
    name: 'Move Widget',
    timestamp: Date.now(),
    execute() {
      useCanvasStore.getState().updateWidget(widgetId, { position: toPosition });
    },
    undo() {
      useCanvasStore.getState().updateWidget(widgetId, { position: fromPosition });
    },
    merge(other) {
      // If same widget moved within 500ms, merge into single command
      if (other.id.startsWith(`move-${widgetId}`) &&
          Date.now() - other.timestamp < 500) {
        return createMoveCommand(widgetId, fromPosition, (other as any).toPosition);
      }
      return null;
    }
  };
}
```

**Integration with Store** (`useCanvasStore.ts`):
- Add `commandStack: Command[]`, `commandIndex: number` to state
- Update `undo()` and `redo()` to use command stack
- Keep `saveSnapshot()` working for backwards compatibility (deprecated)
- Add `executeCommand(cmd: Command)` action

**Update WidgetFrame.tsx**:
- On drag END (not during), create and execute MoveCommand
- On resize END, create and execute ResizeCommand
- Remove calls to `saveSnapshot()` in these handlers

**DO NOT**:
- Delete the existing snapshot system (mark as deprecated)
- Create command classes with inheritance hierarchies
- Add command serialization/persistence
- Build a visual history panel yet

---

## TASK 3: Improved Drag Controller

**Goal**: Make dragging feel smooth and professional with proper batching.

**Create File**: `src/canvas/interactions/useDragController.ts`

**Requirements**:
```typescript
export function useDragController(options: {
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: (startPos: Position, endPos: Position) => void;
}) {
  // Returns handlers to spread on element:
  // { onPointerDown, onPointerMove, onPointerUp }

  // Internally:
  // - Use requestAnimationFrame for batched updates
  // - Track isDragging state
  // - Calculate delta using CoordinateService
  // - Call store.updateWidget only in RAF callback
  // - On drag end, create MoveCommand with start/end positions
}
```

**Key Improvements Over Current**:
1. RAF batching: Only update store once per frame, not per mouse event
2. Proper capture: `setPointerCapture` on start, `releasePointerCapture` on end
3. Command creation: Create MoveCommand on drag end with original + final position
4. Multi-widget support: If widget is in selection, move all selected widgets

**Update WidgetFrame.tsx**:
- Import and use `useDragController` hook
- Remove inline drag handlers (`handleDragStart`, `handleDragMove`, `handleDragEnd`)
- Keep the existing JSX structure, just swap handler source

**DO NOT**:
- Create a complex state machine
- Add gesture recognition
- Handle touch events differently (pointer events work for both)
- Refactor resize or rotate handling in this task

---

## TASK 4: Improved Resize Controller

**Goal**: Make resizing feel professional with proper constraints.

**Create File**: `src/canvas/interactions/useResizeController.ts`

**Requirements**:
```typescript
export function useResizeController(options: {
  widgetId: string;
  minSize?: { width: number; height: number };  // Default 50x50
  onResizeEnd?: (startBounds: Bounds, endBounds: Bounds) => void;
}) {
  // Returns: getHandleProps(handle: ResizeHandle) => handler props

  // Handle types: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

  // Features:
  // - Shift key: maintain aspect ratio
  // - Alt key: resize from center (both sides move equally)
  // - Shift+Alt: both constraints
  // - Smooth min-size clamping (no jumping)
  // - Create ResizeCommand on end
}
```

**Resize From Center Logic**:
```typescript
// When Alt is held:
// - Calculate resize delta
// - Apply delta to both opposite sides
// - Adjust position to keep center point fixed
```

**Update WidgetFrame.tsx**:
- Import and use `useResizeController` hook
- Update resize handle rendering to use `getHandleProps`
- Remove inline resize handlers

**DO NOT**:
- Change the visual appearance of handles
- Add new handle types
- Modify the rotation system
- Touch the crop functionality

---

## TASK 5: Enhanced Crop Tool

**Goal**: Add corner handles and aspect ratio presets to cropping.

**Update File**: `src/components/CropHandles.tsx`

**Add Features**:
1. **Corner handles**: In addition to edge handles, add corner drag handles
2. **Aspect ratio presets**: Add prop for locked aspect ratio
3. **Better UI**: Show current crop dimensions during drag

**New Props**:
```typescript
interface CropHandlesProps {
  // ... existing props ...
  aspectRatio?: number | null;  // null = free, number = locked (e.g., 16/9)
  presets?: Array<{ label: string; ratio: number }>;  // For dropdown
  onPresetSelect?: (ratio: number | null) => void;
}
```

**Corner Handle Implementation**:
```typescript
// Corner handles resize crop from corner while maintaining opposite corner
// Use same math as widget resize but applied to crop percentages
// If aspectRatio is set, constrain accordingly
```

**Add Preset Dropdown** (when crop mode active):
```tsx
// Small dropdown next to close button
<select value={aspectRatio ?? 'free'} onChange={...}>
  <option value="free">Free</option>
  <option value={1}>Square (1:1)</option>
  <option value={16/9}>Landscape (16:9)</option>
  <option value={9/16}>Portrait (9:16)</option>
  <option value={4/3}>Classic (4:3)</option>
</select>
```

**DO NOT**:
- Rewrite the entire component
- Change the percentage-based crop storage
- Add rotation support to crop
- Create a separate crop tool/mode

---

## TASK 6: Toolbar Cleanup & Icons

**Goal**: Clean up the toolbar to be more intuitive without removing functionality.

**Update File**: `src/components/CanvasToolbar.tsx`

**Changes**:

1. **Group related tools visually**:
```
[Mode] | [Undo/Redo] | [Zoom] | [Grid/Snap] | [Selection Tools] | [Canvas]
```

2. **Add tooltips to ALL buttons** (many already have them, ensure consistency)

3. **Add zoom percentage display** that's clickable to reset to 100%

4. **Simplify panels**:
   - Layers panel: Only show if there are layers
   - Groups panel: Only show if there are groups
   - Remove badge counts if zero

5. **Add keyboard shortcut hints to tooltips**:
```tsx
tooltip="Undo (Ctrl+Z)"  // Instead of just "Undo"
```

**DO NOT**:
- Remove any existing functionality
- Change the overall toolbar position
- Create new panel types
- Redesign the entire component

---

## TASK 7: Properties Panel (Right Sidebar)

**Goal**: Add a collapsible properties panel for precise widget control.

**Create File**: `src/components/canvas/PropertiesPanel.tsx`

**Requirements**:
```tsx
// Panel that shows when widget(s) selected
// Collapsible, docked to right side of canvas area
// Shows:
// - Position: X, Y inputs
// - Size: W, H inputs with aspect lock toggle
// - Rotation: degrees input with preset buttons (0, 90, 180, 270)
// - Opacity: slider 0-100%
// - Scale Mode: dropdown (fit, fill, stretch, none)
// - Actions: Delete, Duplicate, Lock buttons
```

**Panel Structure**:
```tsx
<div className="properties-panel">
  <header>
    <h3>Properties</h3>
    <button onClick={onCollapse}>×</button>
  </header>

  <section>
    <label>Position</label>
    <div className="input-row">
      <input type="number" value={x} onChange={...} /> X
      <input type="number" value={y} onChange={...} /> Y
    </div>
  </section>

  <section>
    <label>Size</label>
    <div className="input-row">
      <input type="number" value={width} onChange={...} /> W
      <input type="number" value={height} onChange={...} /> H
      <SNIconButton icon={aspectLocked ? 'lock' : 'unlock'} onClick={...} />
    </div>
  </section>

  {/* ... more sections ... */}
</div>
```

**Integration**:
- Add to GalleryPage.tsx, positioned to right of canvas
- Show/hide based on selection (or always show with empty state)
- Update widget on input blur or Enter key (not on every keystroke)
- Debounce rapid changes

**Styling**:
- Use existing glass morphism style (copy from SNPanel)
- Width: 240px
- Match existing dark theme

**DO NOT**:
- Create a complex form library integration
- Add validation beyond number parsing
- Build a property system with schemas
- Handle multi-widget editing (show "Multiple selected" for now)

---

## TASK 8: Layers Panel Improvement

**Goal**: Make the layers panel a proper sidebar with drag-reorder.

**Update File**: `src/components/CanvasToolbar.tsx` (extract to new file)

**Create File**: `src/components/canvas/LayersPanel.tsx`

**Requirements**:
1. Extract LayersPanel from CanvasToolbar into its own component
2. Make it a right-docked panel (below or tabbed with Properties)
3. Add drag-to-reorder functionality for z-index
4. Show widget thumbnails or icons

**Drag Reorder Implementation**:
```tsx
// Use HTML5 drag and drop (already used elsewhere in codebase)
// On drop, call reorderLayers() from store
// Visual feedback: dragged item ghost, drop indicator line
```

**Layer Item Display**:
```tsx
<div className="layer-item" draggable onDragStart={...} onDrop={...}>
  <span className="layer-icon">{getWidgetIcon(widget.widgetDefId)}</span>
  <span className="layer-name">{widget.name || 'Widget'}</span>
  <SNIconButton icon={visible ? 'visible' : 'hidden'} />
  <SNIconButton icon={locked ? 'lock' : 'unlock'} />
</div>
```

**DO NOT**:
- Add nested layers/folders
- Create a complex tree structure
- Add layer colors or tags
- Build thumbnail generation

---

## TASK 9: Selection Improvements

**Goal**: Add marquee selection and better multi-select UX.

**Create File**: `src/components/canvas/MarqueeSelection.tsx`

**Marquee Selection**:
```tsx
// Activated when clicking on empty canvas area and dragging
// Draw rectangle from start to current mouse position
// On release, select all widgets that intersect rectangle
// Shift+marquee: add to existing selection
```

**Update CanvasRenderer or equivalent**:
- Add marquee state: `{ active: boolean; start: Point; end: Point }`
- Render MarqueeSelection component when active
- Calculate intersection with widget bounds
- Call `selectMultiple()` on release

**Marquee Rendering**:
```tsx
// Simple div with border
<div style={{
  position: 'absolute',
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
  border: '1px dashed var(--sn-accent-primary)',
  background: 'rgba(139, 92, 246, 0.1)',
  pointerEvents: 'none',
}} />
```

**Selection Count Badge**:
- When multiple widgets selected, show count badge on toolbar
- Add "X widgets selected" text in context area

**DO NOT**:
- Add lasso selection
- Create selection groups/sets
- Add selection history
- Build a selection manager class

---

## TASK 10: Polish & Animation

**Goal**: Add subtle animations that make interactions feel premium.

**Add CSS Transitions**:

1. **Widget selection highlight**: Fade in over 150ms
2. **Panel open/close**: Slide + fade over 200ms
3. **Toolbar button hover**: Scale 1.05 over 100ms
4. **Zoom level change**: Smooth zoom over 200ms

**Implementation** (add to relevant components):
```tsx
// Selection highlight
style={{
  outline: selected ? '2px solid #4a9eff' : 'none',
  transition: 'outline 150ms ease-out',
}}

// Panel
style={{
  transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
  opacity: isOpen ? 1 : 0,
  transition: 'transform 200ms ease-out, opacity 200ms ease-out',
}}
```

**Snap Feedback**:
- When widget snaps to guide, brief pulse on guide line
- Optional: subtle "click" visual feedback

**Loading States**:
- Add shimmer effect to widget frame while content loads
- Skeleton for properties panel when loading

**DO NOT**:
- Add spring physics
- Create an animation library
- Add particle effects
- Over-animate (keep it subtle)

---

## Completion Checklist

After all tasks:
- [ ] All original functionality still works
- [ ] Undo/redo works for move, resize, rotate
- [ ] Drag feels smooth (no jank)
- [ ] Resize with Shift maintains aspect ratio
- [ ] Crop tool has corner handles
- [ ] Properties panel shows and updates widgets
- [ ] Layers can be reordered
- [ ] Marquee selection works
- [ ] Landing page has "Enter Gallery" button
- [ ] No console errors
- [ ] Mobile touch still works (basic)

---

## File Reference

**Key files you'll modify**:
- `src/pages/LandingPage.tsx` - Task 0
- `src/components/WidgetFrame.tsx` - Tasks 1, 3, 4
- `src/state/useCanvasStore.ts` - Task 2
- `src/components/CropHandles.tsx` - Task 5
- `src/components/CanvasToolbar.tsx` - Tasks 6, 8
- `src/pages/GalleryPage.tsx` - Task 7

**New files you'll create**:
- `src/canvas/CoordinateService.ts` - Task 1
- `src/canvas/history/Command.ts` - Task 2
- `src/canvas/history/CommandStack.ts` - Task 2
- `src/canvas/history/commands/*.ts` - Task 2
- `src/canvas/interactions/useDragController.ts` - Task 3
- `src/canvas/interactions/useResizeController.ts` - Task 4
- `src/components/canvas/PropertiesPanel.tsx` - Task 7
- `src/components/canvas/LayersPanel.tsx` - Task 8
- `src/components/canvas/MarqueeSelection.tsx` - Task 9

---

## Notes for Agent

- Work through tasks IN ORDER (0 through 10)
- Commit after each task with message: `feat(canvas): Task X - [description]`
- If stuck on a task for more than reasonable time, leave a TODO comment and move on
- Test on both Chrome and Firefox if possible
- The user values working code over perfect architecture
- When in doubt, keep it simple
