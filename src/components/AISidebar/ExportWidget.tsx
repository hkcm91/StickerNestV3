/**
 * StickerNest v2 - Export Widget
 * UI for exporting widgets in various formats
 */

import React, { useState, useCallback } from 'react';
import type { DraftWidget } from '../../ai/DraftManager';
import { 
  exportAndDownload, 
  type ExportFormat, 
  type ExportOptions,
} from '../../services/widgetExporter';

export interface ExportWidgetProps {
  draft: DraftWidget;
  onClose: () => void;
  onExportComplete?: (success: boolean, format: ExportFormat) => void;
}

const FORMAT_INFO: Record<ExportFormat, { 
  icon: string; 
  label: string; 
  description: string;
  extension: string;
}> = {
  html: {
    icon: '📄',
    label: 'HTML File',
    description: 'Single self-contained HTML file',
    extension: '.html',
  },
  bundle: {
    icon: '📦',
    label: 'Widget Bundle',
    description: 'JSON bundle with manifest and HTML',
    extension: '.json',
  },
  zip: {
    icon: '🗜️',
    label: 'Archive',
    description: 'Complete widget archive (.snw)',
    extension: '.snw',
  },
};

export const ExportWidget: React.FC<ExportWidgetProps> = ({
  draft,
  onClose,
  onExportComplete,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('html');
  const [includeWidgetAPI, setIncludeWidgetAPI] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [minify, setMinify] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<boolean | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportSuccess(null);

    const options: ExportOptions = {
      format: selectedFormat,
      includeWidgetAPI,
      includeMetadata,
      minify,
    };

    try {
      const success = await exportAndDownload(draft, options);
      setExportSuccess(success);
      onExportComplete?.(success, selectedFormat);
    } catch (error) {
      console.error('Export failed:', error);
      setExportSuccess(false);
    } finally {
      setIsExporting(false);
    }
  }, [draft, selectedFormat, includeWidgetAPI, includeMetadata, minify, onExportComplete]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.95rem' }}>
          📤 Export Widget
        </h4>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ✕
        </button>
      </div>

      {/* Widget Info */}
      <div style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
          Exporting
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 500 }}>
          {draft.manifest.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
          ID: {draft.manifest.id} • v{draft.manifest.version}
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
          Export Format
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO[ExportFormat]][]).map(
            ([format, info]) => (
              <div
                key={format}
                onClick={() => setSelectedFormat(format)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px',
                  background: selectedFormat === format 
                    ? 'rgba(139, 92, 246, 0.15)' 
                    : 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: selectedFormat === format
                    ? '1px solid rgba(139, 92, 246, 0.4)'
                    : '1px solid rgba(255,255,255,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="format"
                  checked={selectedFormat === format}
                  onChange={() => setSelectedFormat(format)}
                  style={{ accentColor: '#8b5cf6' }}
                />
                <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
                    {info.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {info.description}
                  </div>
                </div>
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: '#64748b',
                  padding: '2px 6px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 4,
                }}>
                  {info.extension}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Options */}
      <div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 8 }}>
          Options
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={includeWidgetAPI}
              onChange={(e) => setIncludeWidgetAPI(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                Include WidgetAPI Mock
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Allows widget to run standalone outside StickerNest
              </div>
            </div>
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                Include Metadata Comments
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Add widget info as HTML comments
              </div>
            </div>
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={minify}
              onChange={(e) => setMinify(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                Minify Output
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Remove whitespace and reduce file size
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Status */}
      {exportSuccess !== null && (
        <div style={{
          padding: '10px 12px',
          background: exportSuccess 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          borderRadius: 6,
          border: `1px solid ${exportSuccess 
            ? 'rgba(16, 185, 129, 0.3)' 
            : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: '1rem' }}>
            {exportSuccess ? '✅' : '❌'}
          </span>
          <span style={{ 
            fontSize: '0.8rem', 
            color: exportSuccess ? '#10b981' : '#ef4444' 
          }}>
            {exportSuccess 
              ? 'Export successful! Check your downloads.' 
              : 'Export failed. Please try again.'}
          </span>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          padding: '12px',
          background: isExporting ? 'rgba(139, 92, 246, 0.3)' : '#8b5cf6',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          cursor: isExporting ? 'default' : 'pointer',
          fontSize: '0.9rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {isExporting ? (
          <>⏳ Exporting...</>
        ) : (
          <>
            {FORMAT_INFO[selectedFormat].icon} Export as {FORMAT_INFO[selectedFormat].label}
          </>
        )}
      </button>

      {/* Help text */}
      <div style={{ 
        fontSize: '0.7rem', 
        color: '#64748b', 
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        Exported widgets can be imported into other StickerNest instances
        or used standalone with the WidgetAPI mock.
      </div>
    </div>
  );
};

export default ExportWidget;

