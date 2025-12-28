/**
 * StickerNest v2 - Slot Types
 * Types for the widget slot system (nested widgets)
 */

// ==================
// Slot Definitions
// ==================

/** Slot type defining what widgets can go in it */
export type SlotType = 'any' | 'image' | 'text' | 'button' | 'data' | 'custom';

/** Slot size constraints */
export interface SlotConstraints {
  /** Minimum width in pixels */
  minWidth?: number;
  /** Maximum width in pixels */
  maxWidth?: number;
  /** Minimum height in pixels */
  minHeight?: number;
  /** Maximum height in pixels */
  maxHeight?: number;
  /** Fixed aspect ratio */
  aspectRatio?: number;
}

/** Slot definition in manifest */
export interface SlotDefinition {
  /** Unique slot ID within the widget */
  id: string;
  /** Human-readable name */
  name: string;
  /** Slot type for filtering compatible widgets */
  type: SlotType;
  /** Description */
  description?: string;
  /** Size constraints */
  constraints?: SlotConstraints;
  /** Default widget ID to place in slot */
  defaultWidget?: string;
  /** Whether slot is required */
  required?: boolean;
  /** Whether multiple widgets can be placed (stacked) */
  multiple?: boolean;
  /** Tags for further filtering */
  tags?: string[];
  /** Position within parent widget (CSS-like) */
  position?: SlotPosition;
}

/** Slot position configuration */
export interface SlotPosition {
  /** Left offset (px or %) */
  left?: string | number;
  /** Top offset (px or %) */
  top?: string | number;
  /** Right offset (px or %) */
  right?: string | number;
  /** Bottom offset (px or %) */
  bottom?: string | number;
  /** Width (px or %) */
  width?: string | number;
  /** Height (px or %) */
  height?: string | number;
  /** Z-index */
  zIndex?: number;
}

// ==================
// Slot Instances
// ==================

/** A widget placed in a slot */
export interface SlotInstance {
  /** Slot ID this widget is placed in */
  slotId: string;
  /** Widget instance ID */
  widgetId: string;
  /** Widget definition ID */
  widgetDefId: string;
  /** Order in slot (if multiple allowed) */
  order?: number;
  /** Override position */
  positionOverride?: SlotPosition;
  /** Instance-specific config overrides */
  configOverrides?: Record<string, unknown>;
}

/** Complete slot state for a widget */
export interface WidgetSlotState {
  /** Parent widget instance ID */
  parentWidgetId: string;
  /** Slot instances */
  slots: Map<string, SlotInstance[]>;
}

// ==================
// Slot Communication
// ==================

/** Event emitted between parent and slotted widgets */
export interface SlotEvent {
  /** Event type */
  type: 'slot:mount' | 'slot:unmount' | 'slot:resize' | 'slot:data' | 'slot:action';
  /** Source (parent or child widget ID) */
  source: string;
  /** Target (parent or child widget ID) */
  target: string;
  /** Slot ID */
  slotId: string;
  /** Event payload */
  payload?: unknown;
}

/** Slot context passed to child widgets */
export interface SlotContext {
  /** Slot ID */
  slotId: string;
  /** Parent widget ID */
  parentWidgetId: string;
  /** Slot definition */
  definition: SlotDefinition;
  /** Current constraints */
  constraints: SlotConstraints;
  /** Whether in slot mode */
  isSlotted: boolean;
  /** Send event to parent */
  sendToParent: (eventType: string, payload?: unknown) => void;
}

// ==================
// Manifest Extension
// ==================

/** Slot configuration in widget manifest */
export interface WidgetSlotManifest {
  /** Slots this widget provides */
  slots?: SlotDefinition[];
  /** Whether this widget can be placed in slots */
  slottable?: boolean;
  /** Slot types this widget fits into */
  fitsSlotTypes?: SlotType[];
  /** Slot tags this widget matches */
  fitsSlotTags?: string[];
}

// ==================
// Helper Functions
// ==================

/** Check if a widget can fit in a slot */
export function canWidgetFitSlot(
  widgetSlotConfig: { fitsSlotTypes?: SlotType[]; fitsSlotTags?: string[] } | undefined,
  slotDef: SlotDefinition
): boolean {
  if (!widgetSlotConfig) return true; // No constraints means it fits

  // Check type compatibility
  if (slotDef.type !== 'any') {
    if (!widgetSlotConfig.fitsSlotTypes?.includes(slotDef.type)) {
      return false;
    }
  }

  // Check tag compatibility
  if (slotDef.tags && slotDef.tags.length > 0) {
    if (!widgetSlotConfig.fitsSlotTags) return false;
    const hasMatchingTag = slotDef.tags.some(tag =>
      widgetSlotConfig.fitsSlotTags!.includes(tag)
    );
    if (!hasMatchingTag) return false;
  }

  return true;
}

/** Calculate slot dimensions with constraints */
export function calculateSlotDimensions(
  constraints: SlotConstraints,
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  let width = containerWidth;
  let height = containerHeight;

  // Apply min/max constraints
  if (constraints.minWidth) width = Math.max(width, constraints.minWidth);
  if (constraints.maxWidth) width = Math.min(width, constraints.maxWidth);
  if (constraints.minHeight) height = Math.max(height, constraints.minHeight);
  if (constraints.maxHeight) height = Math.min(height, constraints.maxHeight);

  // Apply aspect ratio
  if (constraints.aspectRatio) {
    const currentRatio = width / height;
    if (currentRatio > constraints.aspectRatio) {
      width = height * constraints.aspectRatio;
    } else {
      height = width / constraints.aspectRatio;
    }
  }

  return { width, height };
}

/** Parse position value (handle px, %, auto) */
export function parsePositionValue(
  value: string | number | undefined,
  containerSize: number
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    return (parseFloat(trimmed) / 100) * containerSize;
  }
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed);
  }
  return parseFloat(trimmed);
}

/** Generate slot position styles */
export function getSlotPositionStyle(
  position: SlotPosition | undefined,
  containerWidth: number,
  containerHeight: number
): React.CSSProperties {
  if (!position) {
    return { position: 'relative', width: '100%', height: '100%' };
  }

  const style: React.CSSProperties = {
    position: 'absolute',
  };

  if (position.left !== undefined) {
    style.left = typeof position.left === 'number' ? position.left : position.left;
  }
  if (position.top !== undefined) {
    style.top = typeof position.top === 'number' ? position.top : position.top;
  }
  if (position.right !== undefined) {
    style.right = typeof position.right === 'number' ? position.right : position.right;
  }
  if (position.bottom !== undefined) {
    style.bottom = typeof position.bottom === 'number' ? position.bottom : position.bottom;
  }
  if (position.width !== undefined) {
    style.width = typeof position.width === 'number' ? position.width : position.width;
  }
  if (position.height !== undefined) {
    style.height = typeof position.height === 'number' ? position.height : position.height;
  }
  if (position.zIndex !== undefined) {
    style.zIndex = position.zIndex;
  }

  return style;
}

export default {
  canWidgetFitSlot,
  calculateSlotDimensions,
  parsePositionValue,
  getSlotPositionStyle,
};
