/**
 * StickerNest v2 - Halo's Widgets Pipeline
 *
 * Personal document management pipeline featuring:
 * - OCR Scanner for handwritten notes
 * - Voice Notes for speech-to-text
 * - Document Editor with export to DOCX/RTF/TXT
 * - Note Hub for document management
 *
 * All documents are stored persistently and survive widget/canvas deletion.
 */

import { OCRScannerWidget, HaloOCRWidget } from './HaloOCRWidget';
import { VoiceNotesWidget, HaloSpeechWidget } from './HaloSpeechWidget';
import { DocumentEditorWidget, HaloDocumentWidget } from './HaloDocumentWidget';
import { NoteHubWidget, HaloNoteHubWidget } from './HaloNoteHubWidget';
import type { BuiltinWidget } from '../index';

/**
 * All pipeline widgets as a record for easy registration
 */
export const HALO_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.ocr-scanner': OCRScannerWidget,
  'stickernest.voice-notes': VoiceNotesWidget,
  'stickernest.document-editor': DocumentEditorWidget,
  'stickernest.note-hub': NoteHubWidget,
};

/**
 * Widget IDs for this pipeline
 */
export const HALO_WIDGET_IDS = [
  'stickernest.ocr-scanner',
  'stickernest.voice-notes',
  'stickernest.document-editor',
  'stickernest.note-hub',
] as const;

/**
 * Halo's Widgets - Pipeline Preset
 *
 * A pre-configured pipeline for personal document management.
 * Connects OCR and Voice input to Document Editor and Note Hub.
 */
export const HALO_PIPELINE_PRESET = {
  id: 'halos-widgets-pipeline',
  name: "Halo's Widgets",
  description: 'Personal document management with OCR, voice notes, and export to Word/LibreOffice',
  version: '1.0.0',
  widgets: HALO_WIDGET_IDS,
  connections: [
    // OCR outputs text to Document Editor
    {
      from: { widgetId: 'stickernest.ocr-scanner', port: 'text.extracted' },
      to: { widgetId: 'stickernest.document-editor', port: 'text.append' },
    },
    // OCR saves to Note Hub
    {
      from: { widgetId: 'stickernest.ocr-scanner', port: 'document.saved' },
      to: { widgetId: 'stickernest.note-hub', port: 'document.save' },
    },
    // Voice Notes outputs to Document Editor
    {
      from: { widgetId: 'stickernest.voice-notes', port: 'text.transcribed' },
      to: { widgetId: 'stickernest.document-editor', port: 'text.append' },
    },
    // Voice Notes saves to Note Hub
    {
      from: { widgetId: 'stickernest.voice-notes', port: 'document.saved' },
      to: { widgetId: 'stickernest.note-hub', port: 'document.save' },
    },
    // Document Editor saves to Note Hub
    {
      from: { widgetId: 'stickernest.document-editor', port: 'document.saved' },
      to: { widgetId: 'stickernest.note-hub', port: 'document.save' },
    },
    // Note Hub opens documents in Document Editor
    {
      from: { widgetId: 'stickernest.note-hub', port: 'document.selected' },
      to: { widgetId: 'stickernest.document-editor', port: 'document.set' },
    },
  ],
  layout: {
    // Suggested layout positions for the widgets
    positions: [
      { widgetId: 'stickernest.ocr-scanner', x: 50, y: 50 },
      { widgetId: 'stickernest.voice-notes', x: 400, y: 50 },
      { widgetId: 'stickernest.document-editor', x: 225, y: 300 },
      { widgetId: 'stickernest.note-hub', x: 600, y: 300 },
    ],
  },
};

// Primary exports (generic names)
export { OCRScannerWidget } from './HaloOCRWidget';
export { VoiceNotesWidget } from './HaloSpeechWidget';
export { DocumentEditorWidget } from './HaloDocumentWidget';
export { NoteHubWidget } from './HaloNoteHubWidget';

// Legacy exports for backwards compatibility
export { HaloOCRWidget } from './HaloOCRWidget';
export { HaloSpeechWidget } from './HaloSpeechWidget';
export { HaloDocumentWidget } from './HaloDocumentWidget';
export { HaloNoteHubWidget } from './HaloNoteHubWidget';
