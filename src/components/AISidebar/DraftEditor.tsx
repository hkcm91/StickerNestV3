/**
 * StickerNest v2 - Draft Editor
 * Tabbed view for editing widget code, preview, and manifest
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { DraftWidget } from '../../ai/DraftManager';
import { getDraftManager } from '../../ai/DraftManager';
import { CodeEditor } from './CodeEditor';

export interface DraftEditorProps {
  draft: DraftWidget;
  onUpdate: (draft: DraftWidget) => void;
  onClose: () => void;
  height?: number | string;
}

type EditorTab = 'code' | 'preview' | 'manifest';

export const DraftEditor: React.FC<DraftEditorProps> = ({
  draft,
  onUpdate,
  onClose,
  height = 400,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('code');
  const [htmlContent, setHtmlContent] = useState(draft.html);
  const [manifestJson, setManifestJson] = useState(JSON.stringify(draft.manifest, null, 2));
  const [hasChanges, setHasChanges] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [manifestError, setManifestError] = useState<string | null>(null);

  // Update local state when draft changes
  useEffect(() => {
    setHtmlContent(draft.html);
    setManifestJson(JSON.stringify(draft.manifest, null, 2));
    setHasChanges(false);
  }, [draft.id]);

  // Handle HTML changes
  const handleHtmlChange = useCallback((value: string) => {
    setHtmlContent(value);
    setHasChanges(true);
  }, []);

  // Handle manifest changes
  const handleManifestChange = useCallback((value: string) => {
    setManifestJson(value);
    setHasChanges(true);
    
    // Validate JSON
    try {
      JSON.parse(value);
      setManifestError(null);
    } catch (e) {
      setManifestError('Invalid JSON');
    }
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    try {
      const newManifest = JSON.parse(manifestJson);
      
      const draftManager = getDraftManager();
      draftManager.updateDraft(draft.id, {
        html: htmlContent,
        manifest: newManifest,
      });

      const updatedDraft = draftManager.getDraft(draft.id);
      if (updatedDraft) {
        onUpdate(updatedDraft);
      }
      
      setHasChanges(false);
      setPreviewKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [draft.id, htmlContent, manifestJson, onUpdate]);

  // Refresh preview
  const refreshPreview = useCallback(() => {
    setPreviewKey(prev => prev + 1);
  }, []);

  // Generate preview content with mock WidgetAPI
  const previewContent = useCallback(() => {
    const mockWidgetAPI = `
      <script>
        window.WidgetAPI = {
          emitEvent: function(e) { },
          onEvent: function(t, h) { return function(){}; },
          emitOutput: function(n, v) { },
          onInput: function(n, h) { return function(){}; },
          getState: function() { return {}; },
          setState: function(s) { },
          getAssetUrl: function(p) { return p; },
          log: function(...a) { },
          info: function(...a) { console.info('[Widget]', ...a); },
          warn: function(...a) { console.warn('[Widget]', ...a); },
          error: function(...a) { console.error('[Widget]', ...a); },
          debugLog: function(...a) { },
        };
      </script>
    `;
    
    let html = htmlContent;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${mockWidgetAPI}`);
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', `<body>${mockWidgetAPI}`);
    } else {
      html = mockWidgetAPI + html;
    }
    
    return html;
  }, [htmlContent]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: typeof height === 'number' ? `${height}px` : height,
        background: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>✏️</span>
          <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
            {draft.manifest.name || draft.id}
          </span>
          {hasChanges && (
            <span
              style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                background: 'rgba(251, 191, 36, 0.2)',
                borderRadius: 4,
                color: '#fbbf24',
              }}
            >
              unsaved
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 6 }}>
          {hasChanges && (
            <button
              onClick={handleSave}
              style={{
                padding: '4px 10px',
                background: '#10b981',
                border: 'none',
                borderRadius: 4,
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              💾 Save
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: 4,
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.1)',
        }}
      >
        {([
          { id: 'code' as const, label: '📝 Code', icon: '📝' },
          { id: 'preview' as const, label: '👁️ Preview', icon: '👁️' },
          { id: 'manifest' as const, label: '📋 Manifest', icon: '📋' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeTab === tab.id ? '#e2e8f0' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Code Tab */}
        {activeTab === 'code' && (
          <CodeEditor
            value={htmlContent}
            onChange={handleHtmlChange}
            language="html"
            height="100%"
            onSave={handleSave}
          />
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Live Preview
              </span>
              <button
                onClick={refreshPreview}
                style={{
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 4,
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >
                🔄 Refresh
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <iframe
                key={previewKey}
                srcDoc={previewContent()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: '#1a1a2e',
                }}
                sandbox="allow-scripts"
                title="Widget Preview"
              />
            </div>
          </div>
        )}

        {/* Manifest Tab */}
        {activeTab === 'manifest' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {manifestError && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                }}
              >
                ⚠️ {manifestError}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <CodeEditor
                value={manifestJson}
                onChange={handleManifestChange}
                language="json"
                height="100%"
                onSave={handleSave}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.65rem',
          color: '#64748b',
        }}
      >
        <span>ID: {draft.manifest.id}</span>
        <span>v{draft.manifest.version}</span>
      </div>
    </div>
  );
};

export default DraftEditor;

