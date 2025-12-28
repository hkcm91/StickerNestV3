/**
 * StickerNest v2 - Export Options Component
 * Options for exporting generated widgets
 */

import React, { useState, useCallback } from 'react';
import { theme } from '../../theme';
import type { DraftWidget } from '../../../ai/DraftManager';

interface ExportOptionsProps {
  widget: DraftWidget;
  onAddToCanvas?: (widget: DraftWidget) => void;
  onAddToLibrary?: (widget: DraftWidget) => void;
  onDownload?: (widget: DraftWidget) => void;
  onSwitchToCanvas?: () => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  widget,
  onAddToCanvas,
  onAddToLibrary,
  onDownload,
  onSwitchToCanvas,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Download widget as HTML file
  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([widget.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widget.manifest.name.replace(/\s+/g, '-').toLowerCase()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus({
        type: 'success',
        message: 'Widget downloaded successfully!',
      });
      onDownload?.(widget);

      // Clear status after 3s
      setTimeout(() => setExportStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Download failed. Please try again.',
      });
    }
  }, [widget, onDownload]);

  // Download manifest as JSON
  const handleDownloadManifest = useCallback(() => {
    try {
      const blob = new Blob(
        [JSON.stringify(widget.manifest, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widget.manifest.name.replace(/\s+/g, '-').toLowerCase()}-manifest.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus({
        type: 'success',
        message: 'Manifest downloaded!',
      });
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Download failed.',
      });
    }
  }, [widget]);

  // Add to library
  const handleAddToLibrary = useCallback(() => {
    try {
      onAddToLibrary?.(widget);
      setExportStatus({
        type: 'success',
        message: 'Added to library!',
      });
      setTimeout(() => setExportStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Failed to add to library.',
      });
    }
  }, [widget, onAddToLibrary]);

  // Add to canvas
  const handleAddToCanvas = useCallback(() => {
    try {
      onAddToCanvas?.(widget);
      setExportStatus({
        type: 'success',
        message: 'Added to canvas!',
      });
      setTimeout(() => {
        setExportStatus({ type: null, message: '' });
        onSwitchToCanvas?.();
      }, 1500);
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Failed to add to canvas.',
      });
    }
  }, [widget, onAddToCanvas, onSwitchToCanvas]);

  // Copy HTML to clipboard
  const handleCopyHTML = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(widget.html);
      setExportStatus({
        type: 'success',
        message: 'HTML copied to clipboard!',
      });
      setTimeout(() => setExportStatus({ type: null, message: '' }), 3000);
    } catch (error) {
      setExportStatus({
        type: 'error',
        message: 'Failed to copy to clipboard.',
      });
    }
  }, [widget]);

  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: 'none',
          borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>📤</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            Export Options
          </span>
        </div>
        <span style={{
          fontSize: '12px',
          color: theme.text.tertiary,
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
          transition: 'transform 0.2s ease',
        }}>
          ▶
        </span>
      </button>

      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {/* Status message */}
          {exportStatus.type && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '12px',
              borderRadius: '8px',
              background: exportStatus.type === 'success'
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${exportStatus.type === 'success'
                ? 'rgba(34, 197, 94, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'
              }`,
              fontSize: '12px',
              color: exportStatus.type === 'success' ? '#4ade80' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>{exportStatus.type === 'success' ? '✓' : '✕'}</span>
              {exportStatus.message}
            </div>
          )}

          {/* Export buttons grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}>
            {/* Add to Canvas */}
            {onAddToCanvas && (
              <ExportButton
                icon="🎨"
                label="Add to Canvas"
                description="Place on your canvas"
                onClick={handleAddToCanvas}
                primary
              />
            )}

            {/* Add to Library */}
            {onAddToLibrary && (
              <ExportButton
                icon="📚"
                label="Add to Library"
                description="Save for later use"
                onClick={handleAddToLibrary}
              />
            )}

            {/* Download HTML */}
            <ExportButton
              icon="💾"
              label="Download HTML"
              description="Save as .html file"
              onClick={handleDownload}
            />

            {/* Download Manifest */}
            <ExportButton
              icon="📋"
              label="Download Manifest"
              description="Save as .json file"
              onClick={handleDownloadManifest}
            />

            {/* Copy HTML */}
            <ExportButton
              icon="📑"
              label="Copy HTML"
              description="Copy to clipboard"
              onClick={handleCopyHTML}
            />
          </div>

          {/* Widget info */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: theme.bg.tertiary,
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: theme.text.tertiary,
              marginBottom: '8px',
            }}>
              Widget Details
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              fontSize: '11px',
            }}>
              <div>
                <span style={{ color: theme.text.tertiary }}>Name: </span>
                <span style={{ color: theme.text.secondary }}>
                  {widget.manifest.name}
                </span>
              </div>
              <div>
                <span style={{ color: theme.text.tertiary }}>Version: </span>
                <span style={{ color: theme.text.secondary }}>
                  {widget.manifest.version}
                </span>
              </div>
              <div>
                <span style={{ color: theme.text.tertiary }}>Size: </span>
                <span style={{ color: theme.text.secondary }}>
                  {(widget.html.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <div>
                <span style={{ color: theme.text.tertiary }}>Protocol: </span>
                <span style={{ color: theme.text.secondary }}>
                  {widget.manifest.protocol || 'v3.0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export button component
const ExportButton: React.FC<{
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}> = ({ icon, label, description, onClick, primary = false }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px',
      background: primary
        ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)'
        : theme.bg.tertiary,
      border: `1px solid ${primary ? 'transparent' : theme.border}`,
      borderRadius: '10px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.15s ease',
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '4px',
    }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{
        fontSize: '12px',
        fontWeight: 600,
        color: primary ? 'white' : theme.text.primary,
      }}>
        {label}
      </span>
    </div>
    <div style={{
      fontSize: '10px',
      color: primary ? 'rgba(255,255,255,0.7)' : theme.text.tertiary,
      marginLeft: '24px',
    }}>
      {description}
    </div>
  </button>
);

export default ExportOptions;
