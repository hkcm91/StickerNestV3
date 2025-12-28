/**
 * StickerNest v2 - Presence Store (Zustand)
 * Real-time tracking of collaborator cursors, selections, and interactions
 * Optimized for smooth 60fps cursor rendering with interpolation
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

/** 2D point */
export interface Point {
  x: number;
  y: number;
}

/** Cursor state for a collaborator */
export interface CursorState {
  /** User ID */
  userId: string;
  /** Display name for label */
  displayName: string;
  /** Cursor color */
  color: string;
  /** Current position (canvas coordinates) */
  position: Point;
  /** Previous position for interpolation */
  previousPosition: Point;
  /** Timestamp of last update */
  timestamp: number;
  /** Is cursor visible */
  visible: boolean;
  /** Cursor mode/tool */
  tool: 'select' | 'pan' | 'draw' | 'text' | 'resize' | 'rotate';
  /** Is user currently clicking/dragging */
  isPressed: boolean;
  /** Canvas ID cursor is on */
  canvasId: string;
}

/** Selection highlight for a collaborator */
export interface SelectionState {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Selection color */
  color: string;
  /** Selected widget IDs */
  widgetIds: string[];
  /** Selection bounds (for visual highlight) */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Canvas ID */
  canvasId: string;
  /** Timestamp */
  timestamp: number;
}

/** Typing indicator for text editing */
export interface TypingState {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Widget being edited */
  widgetId: string;
  /** Field being edited */
  fieldName: string;
  /** Timestamp */
  timestamp: number;
}

/** Drawing stroke in progress */
export interface DrawingState {
  /** User ID */
  userId: string;
  /** Stroke color */
  color: string;
  /** Stroke width */
  strokeWidth: number;
  /** Points in the stroke */
  points: Point[];
  /** Canvas ID */
  canvasId: string;
  /** Timestamp started */
  startTime: number;
}

/** Cursor trail point */
export interface TrailPoint extends Point {
  timestamp: number;
  opacity: number;
}

/** Reaction/emoji burst */
export interface Reaction {
  /** Unique ID */
  id: string;
  /** User ID who reacted */
  userId: string;
  /** Emoji */
  emoji: string;
  /** Position */
  position: Point;
  /** Canvas ID */
  canvasId: string;
  /** Creation time */
  createdAt: number;
}

// ==================
// Configuration
// ==================

/** How often to broadcast cursor position (ms) */
export const CURSOR_BROADCAST_INTERVAL = 50; // 20 Hz

/** How long until cursor is considered stale (ms) */
export const CURSOR_STALE_THRESHOLD = 3000;

/** How long to show cursor trails (ms) */
export const TRAIL_DURATION = 500;

/** Max trail points */
export const MAX_TRAIL_POINTS = 20;

/** How long reactions stay visible (ms) */
export const REACTION_DURATION = 3000;

// ==================
// Store State
// ==================

export interface PresenceState {
  // Cursors
  cursors: Map<string, CursorState>;
  cursorTrails: Map<string, TrailPoint[]>;
  showTrails: boolean;

  // Selections
  selections: Map<string, SelectionState>;
  showSelections: boolean;

  // Typing indicators
  typingIndicators: Map<string, TypingState>;

  // Active drawings
  activeDrawings: Map<string, DrawingState>;

  // Reactions
  reactions: Reaction[];

  // Local state (what we're broadcasting)
  localCursor: CursorState | null;
  localSelection: SelectionState | null;
  localTyping: TypingState | null;

  // Settings
  cursorSmoothingEnabled: boolean;
  interpolationFactor: number; // 0-1, higher = smoother but more latency
}

// ==================
// Store Actions
// ==================

export interface PresenceActions {
  // Remote cursor management
  updateRemoteCursor: (cursor: Omit<CursorState, 'previousPosition'>) => void;
  removeRemoteCursor: (userId: string) => void;
  cleanupStaleCursors: () => void;

  // Local cursor
  setLocalCursor: (position: Point, canvasId: string, tool?: CursorState['tool']) => void;
  setLocalCursorPressed: (pressed: boolean) => void;
  hideLocalCursor: () => void;

  // Remote selection management
  updateRemoteSelection: (selection: SelectionState) => void;
  removeRemoteSelection: (userId: string) => void;

  // Local selection
  setLocalSelection: (widgetIds: string[], canvasId: string, bounds?: SelectionState['bounds']) => void;
  clearLocalSelection: () => void;

  // Typing indicators
  setTypingIndicator: (indicator: TypingState) => void;
  removeTypingIndicator: (userId: string) => void;
  setLocalTyping: (widgetId: string, fieldName: string) => void;
  clearLocalTyping: () => void;

  // Drawings
  updateDrawing: (drawing: DrawingState) => void;
  removeDrawing: (userId: string) => void;

  // Reactions
  addReaction: (reaction: Omit<Reaction, 'id' | 'createdAt'>) => void;
  removeReaction: (reactionId: string) => void;
  cleanupExpiredReactions: () => void;

  // Cursor trails
  updateCursorTrail: (userId: string, point: Point) => void;
  cleanupTrails: () => void;
  toggleTrails: (show: boolean) => void;

  // Interpolation
  getInterpolatedPosition: (userId: string, currentTime: number) => Point | null;
  setCursorSmoothing: (enabled: boolean) => void;
  setInterpolationFactor: (factor: number) => void;

  // Selections visibility
  toggleSelections: (show: boolean) => void;

  // Canvas filtering
  getCursorsOnCanvas: (canvasId: string) => CursorState[];
  getSelectionsOnCanvas: (canvasId: string) => SelectionState[];

  // Reset
  reset: () => void;
  resetForCanvas: (canvasId: string) => void;
}

// ==================
// Initial State
// ==================

const initialState: PresenceState = {
  cursors: new Map(),
  cursorTrails: new Map(),
  showTrails: true,
  selections: new Map(),
  showSelections: true,
  typingIndicators: new Map(),
  activeDrawings: new Map(),
  reactions: [],
  localCursor: null,
  localSelection: null,
  localTyping: null,
  cursorSmoothingEnabled: true,
  interpolationFactor: 0.3,
};

// ==================
// Store Implementation
// ==================

export const usePresenceStore = create<PresenceState & PresenceActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Remote Cursor Management
      // ==================

      updateRemoteCursor: (cursor) => {
        const { cursors } = get();
        const existing = cursors.get(cursor.userId);
        const newCursors = new Map(cursors);

        const newCursor: CursorState = {
          ...cursor,
          previousPosition: existing?.position || cursor.position,
        };

        newCursors.set(cursor.userId, newCursor);
        set({ cursors: newCursors });

        // Update trail if enabled
        if (get().showTrails) {
          get().updateCursorTrail(cursor.userId, cursor.position);
        }
      },

      removeRemoteCursor: (userId: string) => {
        const { cursors, cursorTrails } = get();
        const newCursors = new Map(cursors);
        const newTrails = new Map(cursorTrails);

        newCursors.delete(userId);
        newTrails.delete(userId);

        set({ cursors: newCursors, cursorTrails: newTrails });
      },

      cleanupStaleCursors: () => {
        const { cursors } = get();
        const now = Date.now();
        const newCursors = new Map(cursors);
        let changed = false;

        for (const [userId, cursor] of newCursors) {
          if (now - cursor.timestamp > CURSOR_STALE_THRESHOLD) {
            newCursors.delete(userId);
            changed = true;
          }
        }

        if (changed) {
          set({ cursors: newCursors });
        }
      },

      // ==================
      // Local Cursor
      // ==================

      setLocalCursor: (position: Point, canvasId: string, tool = 'select') => {
        const { localCursor } = get();

        const newCursor: CursorState = {
          userId: 'local',
          displayName: '',
          color: '',
          position,
          previousPosition: localCursor?.position || position,
          timestamp: Date.now(),
          visible: true,
          tool,
          isPressed: localCursor?.isPressed || false,
          canvasId,
        };

        set({ localCursor: newCursor });
      },

      setLocalCursorPressed: (pressed: boolean) => {
        const { localCursor } = get();
        if (localCursor) {
          set({
            localCursor: {
              ...localCursor,
              isPressed: pressed,
              timestamp: Date.now(),
            },
          });
        }
      },

      hideLocalCursor: () => {
        const { localCursor } = get();
        if (localCursor) {
          set({
            localCursor: {
              ...localCursor,
              visible: false,
            },
          });
        }
      },

      // ==================
      // Remote Selection Management
      // ==================

      updateRemoteSelection: (selection: SelectionState) => {
        const { selections } = get();
        const newSelections = new Map(selections);
        newSelections.set(selection.userId, selection);
        set({ selections: newSelections });
      },

      removeRemoteSelection: (userId: string) => {
        const { selections } = get();
        const newSelections = new Map(selections);
        newSelections.delete(userId);
        set({ selections: newSelections });
      },

      // ==================
      // Local Selection
      // ==================

      setLocalSelection: (widgetIds: string[], canvasId: string, bounds?) => {
        set({
          localSelection: {
            userId: 'local',
            displayName: '',
            color: '',
            widgetIds,
            bounds,
            canvasId,
            timestamp: Date.now(),
          },
        });
      },

      clearLocalSelection: () => {
        set({ localSelection: null });
      },

      // ==================
      // Typing Indicators
      // ==================

      setTypingIndicator: (indicator: TypingState) => {
        const { typingIndicators } = get();
        const newIndicators = new Map(typingIndicators);
        newIndicators.set(indicator.userId, indicator);
        set({ typingIndicators: newIndicators });
      },

      removeTypingIndicator: (userId: string) => {
        const { typingIndicators } = get();
        const newIndicators = new Map(typingIndicators);
        newIndicators.delete(userId);
        set({ typingIndicators: newIndicators });
      },

      setLocalTyping: (widgetId: string, fieldName: string) => {
        set({
          localTyping: {
            userId: 'local',
            displayName: '',
            widgetId,
            fieldName,
            timestamp: Date.now(),
          },
        });
      },

      clearLocalTyping: () => {
        set({ localTyping: null });
      },

      // ==================
      // Drawings
      // ==================

      updateDrawing: (drawing: DrawingState) => {
        const { activeDrawings } = get();
        const newDrawings = new Map(activeDrawings);
        newDrawings.set(drawing.userId, drawing);
        set({ activeDrawings: newDrawings });
      },

      removeDrawing: (userId: string) => {
        const { activeDrawings } = get();
        const newDrawings = new Map(activeDrawings);
        newDrawings.delete(userId);
        set({ activeDrawings: newDrawings });
      },

      // ==================
      // Reactions
      // ==================

      addReaction: (reaction) => {
        const { reactions } = get();
        const newReaction: Reaction = {
          ...reaction,
          id: `reaction_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          createdAt: Date.now(),
        };
        set({ reactions: [...reactions, newReaction] });

        // Auto-cleanup after duration
        setTimeout(() => {
          get().removeReaction(newReaction.id);
        }, REACTION_DURATION);
      },

      removeReaction: (reactionId: string) => {
        const { reactions } = get();
        set({ reactions: reactions.filter((r) => r.id !== reactionId) });
      },

      cleanupExpiredReactions: () => {
        const { reactions } = get();
        const now = Date.now();
        set({
          reactions: reactions.filter(
            (r) => now - r.createdAt < REACTION_DURATION
          ),
        });
      },

      // ==================
      // Cursor Trails
      // ==================

      updateCursorTrail: (userId: string, point: Point) => {
        const { cursorTrails } = get();
        const newTrails = new Map(cursorTrails);
        const existingTrail = newTrails.get(userId) || [];

        const newPoint: TrailPoint = {
          ...point,
          timestamp: Date.now(),
          opacity: 1,
        };

        // Add new point and limit trail length
        const updatedTrail = [...existingTrail, newPoint].slice(-MAX_TRAIL_POINTS);
        newTrails.set(userId, updatedTrail);

        set({ cursorTrails: newTrails });
      },

      cleanupTrails: () => {
        const { cursorTrails } = get();
        const now = Date.now();
        const newTrails = new Map(cursorTrails);
        let changed = false;

        for (const [userId, trail] of newTrails) {
          const filteredTrail = trail.filter(
            (p) => now - p.timestamp < TRAIL_DURATION
          );

          if (filteredTrail.length !== trail.length) {
            if (filteredTrail.length === 0) {
              newTrails.delete(userId);
            } else {
              // Update opacity based on age
              const updatedTrail = filteredTrail.map((p) => ({
                ...p,
                opacity: 1 - (now - p.timestamp) / TRAIL_DURATION,
              }));
              newTrails.set(userId, updatedTrail);
            }
            changed = true;
          }
        }

        if (changed) {
          set({ cursorTrails: newTrails });
        }
      },

      toggleTrails: (show: boolean) => {
        set({ showTrails: show });
        if (!show) {
          set({ cursorTrails: new Map() });
        }
      },

      // ==================
      // Interpolation
      // ==================

      getInterpolatedPosition: (userId: string, currentTime: number) => {
        const { cursors, cursorSmoothingEnabled, interpolationFactor } = get();
        const cursor = cursors.get(userId);

        if (!cursor) return null;
        if (!cursorSmoothingEnabled) return cursor.position;

        // Time-based interpolation
        const timeDelta = currentTime - cursor.timestamp;
        const maxDelta = CURSOR_BROADCAST_INTERVAL * 2;

        // If cursor data is fresh, interpolate between previous and current
        if (timeDelta < maxDelta && cursor.previousPosition) {
          const t = Math.min(1, timeDelta / CURSOR_BROADCAST_INTERVAL) * interpolationFactor;
          return {
            x: cursor.previousPosition.x + (cursor.position.x - cursor.previousPosition.x) * t,
            y: cursor.previousPosition.y + (cursor.position.y - cursor.previousPosition.y) * t,
          };
        }

        return cursor.position;
      },

      setCursorSmoothing: (enabled: boolean) => {
        set({ cursorSmoothingEnabled: enabled });
      },

      setInterpolationFactor: (factor: number) => {
        set({ interpolationFactor: Math.max(0, Math.min(1, factor)) });
      },

      // ==================
      // Selections Visibility
      // ==================

      toggleSelections: (show: boolean) => {
        set({ showSelections: show });
      },

      // ==================
      // Canvas Filtering
      // ==================

      getCursorsOnCanvas: (canvasId: string) => {
        const { cursors } = get();
        return Array.from(cursors.values()).filter(
          (c) => c.canvasId === canvasId && c.visible
        );
      },

      getSelectionsOnCanvas: (canvasId: string) => {
        const { selections } = get();
        return Array.from(selections.values()).filter(
          (s) => s.canvasId === canvasId
        );
      },

      // ==================
      // Reset
      // ==================

      reset: () => {
        set(initialState);
      },

      resetForCanvas: (canvasId: string) => {
        const { cursors, selections, activeDrawings, cursorTrails, reactions } = get();

        // Filter out items for specific canvas
        const newCursors = new Map(cursors);
        const newSelections = new Map(selections);
        const newDrawings = new Map(activeDrawings);
        const newTrails = new Map(cursorTrails);

        for (const [userId, cursor] of newCursors) {
          if (cursor.canvasId === canvasId) {
            newCursors.delete(userId);
            newTrails.delete(userId);
          }
        }

        for (const [userId, selection] of newSelections) {
          if (selection.canvasId === canvasId) {
            newSelections.delete(userId);
          }
        }

        for (const [userId, drawing] of newDrawings) {
          if (drawing.canvasId === canvasId) {
            newDrawings.delete(userId);
          }
        }

        const newReactions = reactions.filter((r) => r.canvasId !== canvasId);

        set({
          cursors: newCursors,
          selections: newSelections,
          activeDrawings: newDrawings,
          cursorTrails: newTrails,
          reactions: newReactions,
        });
      },
    }),
    { name: 'PresenceStore' }
  )
);

// ==================
// Selectors
// ==================

/** Get all visible cursors */
export const selectVisibleCursors = (state: PresenceState) =>
  Array.from(state.cursors.values()).filter((c) => c.visible);

/** Get cursor count */
export const selectCursorCount = (state: PresenceState) =>
  state.cursors.size;

/** Get all selections */
export const selectAllSelections = (state: PresenceState) =>
  Array.from(state.selections.values());

/** Get typing indicators */
export const selectTypingIndicators = (state: PresenceState) =>
  Array.from(state.typingIndicators.values());

/** Get active reactions */
export const selectReactions = (state: PresenceState) =>
  state.reactions;

/** Check if trails are shown */
export const selectShowTrails = (state: PresenceState) =>
  state.showTrails;

/** Get local cursor */
export const selectLocalCursor = (state: PresenceState) =>
  state.localCursor;

/** Get local selection */
export const selectLocalSelection = (state: PresenceState) =>
  state.localSelection;

export default usePresenceStore;
