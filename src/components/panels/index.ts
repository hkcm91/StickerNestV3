/**
 * StickerNest v2 - Floating Panel Components
 * Exports all panel-related components
 */

export { FloatingPanelContainer } from './FloatingPanelContainer';
export { FloatingPanelTabStrip } from './FloatingPanelTabStrip';
export { FloatingPanelWidgetSlot } from './FloatingPanelWidgetSlot';
export { FloatingPanelOverlay } from './FloatingPanelOverlay';

// Re-export types for convenience
export type {
  FloatingPanel,
  PanelPreset,
  PanelTab,
  PanelId,
  WidgetInstanceId,
  DockedPanelWidgetState,
  PanelStyleConfig,
  CreatePanelOptions,
} from '../../types/panels';
