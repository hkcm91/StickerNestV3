/**
 * StickerNest v2 - AI Sidebar Components
 */

// Core Components
export { AISidebar } from './AISidebar';
export { ChatInterface } from './ChatInterface';
export { QuickActions } from './QuickActions';
export { DraftPanel } from './DraftPanel';
export { ModelSelector } from './ModelSelector';

// Preview Components
export { FloatingPreview } from './FloatingPreview';
export { PreviewProvider, usePreview, usePreviewOptional } from './PreviewContext';

// Connection Components
export { WidgetConnector } from './WidgetConnector';

// Sharing Components
export { SharedWidgetBrowser } from './SharedWidgetBrowser';

// Editor Components
export { CodeEditor } from './CodeEditor';
export { DraftEditor } from './DraftEditor';

// Template Components
export { TemplateLibrary } from './TemplateLibrary';

// Batch Generation
export { BatchQueue } from './BatchQueue';

// Version History
export { VersionHistory } from './VersionHistory';

// Export
export { ExportWidget } from './ExportWidget';

// Event Debugging
export { EventDebugger } from './EventDebugger';

// Types
export type { FloatingPreviewProps, PreviewSize } from './FloatingPreview';
export type { PreviewState, PreviewContextValue, PreviewProviderProps } from './PreviewContext';
export type { WidgetConnectorProps } from './WidgetConnector';
export type { SharedWidgetBrowserProps } from './SharedWidgetBrowser';
export type { CodeEditorProps, EditorLanguage } from './CodeEditor';
export type { DraftEditorProps } from './DraftEditor';
export type { TemplateLibraryProps } from './TemplateLibrary';
export type { BatchQueueProps, BatchItem } from './BatchQueue';
export type { VersionHistoryProps } from './VersionHistory';
export type { ExportWidgetProps } from './ExportWidget';

