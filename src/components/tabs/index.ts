/**
 * StickerNest v2 - Tabs Components
 * Exports for tab content components and utilities
 */

// Types
export * from './types';

// Hooks
export { useCanvasTab } from './hooks/useCanvasTab';

// Components
export { WidgetDockerTab } from './WidgetDockerTab';
export { UrlPreviewTab } from './UrlPreviewTab';
export { CanvasTab } from './CanvasTab';
export { TabContentRenderer } from './TabContentRenderer';

// Default export
export { TabContentRenderer as default } from './TabContentRenderer';
