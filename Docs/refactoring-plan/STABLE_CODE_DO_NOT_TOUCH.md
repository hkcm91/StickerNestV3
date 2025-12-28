# STABLE CODE - DO NOT TOUCH

> **CRITICAL**: The files and code sections listed here are STABLE and WORKING.
> Do NOT refactor, modify, or "improve" these unless fixing a critical bug.
> The canvas interactions are finally working - protect them!

## Last Updated: December 2024

---

## 1. CORE COORDINATE SYSTEM

### `src/canvas/CoordinateService.ts`
**Status**: CORE STABLE - NEVER TOUCH

This is the **single source of truth** for all coordinate transformations:
- `screenToCanvas()` - Convert screen coordinates to canvas space
- `canvasToScreen()` - Convert canvas coordinates to screen space
- `screenDeltaToCanvas()` - Convert screen deltas accounting for zoom
- `canvasDeltaToScreen()` - Convert canvas deltas to screen space

**Used by**: ALL drag/resize operations, gesture handlers, widget positioning

**Risk**: ANY changes break widget positioning across all zoom levels

---

## 2. UNIFIED INTERACTION SYSTEM

### `src/canvas/interactions/useUnifiedInteraction.ts`
**Status**: CORE STABLE - NEVER TOUCH

Provides unified drag/resize/rotate with proper viewport zoom handling:
- Grid snapping
- Aspect ratio locking
- Canvas bounds constraints
- Coordinate transformation integration

**Risk**: Geometry calculation breaks cause ghosting or position jumps

### `src/canvas/interactions/useDragController.ts`
**Status**: STABLE

RAF-batched drag operations with undo/redo integration.

### `src/canvas/interactions/useResizeController.ts`
**Status**: STABLE

Resize handling with aspect ratio support.

---

## 3. COMMAND/HISTORY SYSTEM

### `src/canvas/history/CommandStack.ts`
**Status**: CORE STABLE - NEVER TOUCH

Undo/redo system using command pattern. All state changes flow through here.

### `src/canvas/history/Command.ts`
**Status**: STABLE

Base command class.

### `src/canvas/history/commands/*.ts`
**Status**: STABLE

- `MoveCommand.ts`
- `ResizeCommand.ts`
- `PropertyCommand.ts`

**Risk**: Command pattern violations corrupt undo/redo state

---

## 4. MAIN CANVAS CORE SECTIONS

### `src/canvas/MainCanvas.tsx`

**PROTECTED LINES - DO NOT MODIFY:**

```
Lines 30-32: Hook imports
  - useCanvasGestures
  - useViewportIsolation
  - useCanvasController

Lines 245-256: Gesture initialization
  - Touch/wheel/pinch integration
  - Momentum panning setup

Lines 273-422: Drag/resize handlers
  - Zoom-aware calculations
  - Coordinate transformation calls
  - Event handler wiring
```

**Safe to modify**: UI elements, styling, new features that don't touch interaction code

---

## 5. GESTURE SYSTEM

### `src/hooks/useCanvasGestures.ts`
**Status**: RECENTLY STABILIZED - HIGH RISK TO MODIFY

Core gesture handling:
- Pinch zoom
- Wheel zoom
- Pan gestures
- Momentum physics

**Risk**: Breaking gestures destroys mobile experience

### `src/hooks/useMomentum.ts`
**Status**: STABLE

Momentum panning physics.

### `src/hooks/useViewportIsolation.ts`
**Status**: STABLE

Prevents browser zoom interference.

---

## 6. DOMAIN TYPES

### `src/types/domain.ts`

**PROTECTED INTERFACES - DO NOT CHANGE SHAPE:**

```typescript
// Line ~131 - Widget instance structure
interface WidgetInstance {
  id: string;
  // ... all properties are consumed everywhere
}

// Line ~661 - Sticker instance structure
interface StickerInstance {
  // ... used by all sticker operations
}

// CanvasSettings interface
// WidgetScaleMode type
```

**Risk**: Type changes cascade through entire codebase

---

## 7. RECENT STABLE COMMITS

These commits represent stable, working features. Do not revert or significantly alter:

| Commit | Description | Date |
|--------|-------------|------|
| `376b5fa` | Build version marker for Vercel | Recent |
| `c24b0b3` | Cache control headers fix | Recent |
| `3d1a8ff` | Widget system update (V2 widgets) | Recent |
| `befc364` | Canvas property control via widgets | Recent |
| `c77bafe` | Scroll behavior (wheel=zoom, side=pan) | Recent |
| `67cf2f0` | Canvas consolidation (Canvas2→MainCanvas) | Recent |

---

## 8. SAFE DEPRECATIONS

These files are deprecated but kept for backwards compatibility:

### `src/canvas/Canvas2.tsx`
**Status**: DEPRECATED - Safe to ignore

Pure re-export wrapper. Will be removed after migration period.
Currently just imports from MainCanvas.

### `src/components/editor/Canvas.tsx`
**Status**: DEPRECATED - Do not use

Old canvas component. Use MainCanvas instead.

---

## MODIFICATION CHECKLIST

Before modifying ANY file in this document:

- [ ] Is this fixing a critical bug? (If no, STOP)
- [ ] Have you read and understood the existing code?
- [ ] Have you tested ALL interaction modes? (view, edit, preview)
- [ ] Have you tested on mobile devices? (touch, pinch, momentum)
- [ ] Have you tested with different zoom levels? (0.1x to 5x)
- [ ] Have you tested drag/resize/rotate operations?
- [ ] Have you tested undo/redo after changes?
- [ ] Have you run the E2E test suite?

---

## REPORTING ISSUES

If you find a bug in stable code:
1. Document the exact reproduction steps
2. Note which zoom level / viewport state
3. Check if it's a regression from recent commits
4. Create a minimal fix without refactoring
