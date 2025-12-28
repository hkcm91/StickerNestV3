/**
 * StickerNest v2 - Widget Details Drawer
 * Shows detailed information about selected widget/sticker
 */

import React, { useMemo } from 'react';
import { useLibraryStore, StickerLibraryItem } from '../../state/useLibraryStore';
import type { WidgetListItem } from '../../utils/libraryUtils';
import { getCategoryDisplayName, getCategoryEmoji, detectPipelineGroup } from '../../utils/libraryUtils';
import { X, Plus, ExternalLink, Code, Layers, Zap } from 'lucide-react';
import type { RuntimeContext } from '../../runtime/RuntimeContext';

interface Props {
  widgets: WidgetListItem[];
  runtime?: RuntimeContext;
}

export const WidgetDetailsDrawer: React.FC<Props> = ({ widgets, runtime }) => {
  const selectedItemId = useLibraryStore((s) => s.selectedItemId);
  const selectedItemType = useLibraryStore((s) => s.selectedItemType);
  const stickerLibrary = useLibraryStore((s) => s.stickerLibrary);
  const closeDetailsDrawer = useLibraryStore((s) => s.closeDetailsDrawer);
  const recordWidgetUsage = useLibraryStore((s) => s.recordWidgetUsage);

  const selectedWidget = useMemo(() => {
    if (selectedItemType !== 'widget' || !selectedItemId) return null;
    return widgets.find((w) => w.id === selectedItemId);
  }, [widgets, selectedItemId, selectedItemType]);

  const selectedSticker = useMemo(() => {
    if (selectedItemType !== 'sticker' || !selectedItemId) return null;
    return stickerLibrary.find((s) => s.id === selectedItemId);
  }, [stickerLibrary, selectedItemId, selectedItemType]);

  const handleAddToCanvas = () => {
    if (selectedWidget && runtime?.eventBus) {
      recordWidgetUsage(selectedWidget.id);
      runtime.eventBus.emit({
        type: 'widget:add-request',
        scope: 'canvas',
        payload: {
          widgetDefId: selectedWidget.id,
          version: selectedWidget.manifest.version,
          source: selectedWidget.source,
        },
      });
      closeDetailsDrawer();
    }

    if (selectedSticker && runtime?.eventBus) {
      runtime.eventBus.emit({
        type: 'sticker:add-request',
        scope: 'canvas',
        payload: {
          stickerId: selectedSticker.id,
          url: selectedSticker.url,
          type: selectedSticker.type,
          name: selectedSticker.name,
        },
      });
      closeDetailsDrawer();
    }
  };

  if (!selectedWidget && !selectedSticker) return null;

  return (
    <>
      <style>{`
        .details-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }

        .details-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 380px;
          max-width: 100%;
          height: 100%;
          background: linear-gradient(180deg, #1e1e2e 0%, #1a1a2e 100%);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .details-drawer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .details-drawer-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 12px;
          font-size: 24px;
        }

        .details-drawer-title-section {
          flex: 1;
        }

        .details-drawer-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 2px;
        }

        .details-drawer-subtitle {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .details-drawer-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .details-drawer-close:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .details-drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .details-section {
          margin-bottom: 20px;
        }

        .details-section-title {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .details-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
        }

        .details-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .details-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .details-badge.category {
          background: rgba(102, 126, 234, 0.15);
          color: #a5b4fc;
        }

        .details-badge.pipeline {
          background: rgba(251, 191, 36, 0.15);
          color: #fcd34d;
        }

        .details-badge.ai {
          background: rgba(167, 139, 250, 0.15);
          color: #c4b5fd;
        }

        .details-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .details-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .details-list-item-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
        }

        .details-list-item-content {
          flex: 1;
        }

        .details-list-item-name {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2px;
        }

        .details-list-item-type {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
        }

        .details-drawer-footer {
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .details-add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .details-add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
        }

        .details-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .details-meta-item {
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .details-meta-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .details-meta-value {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          font-family: 'SF Mono', Monaco, monospace;
        }
      `}</style>

      <div className="details-drawer-overlay" onClick={closeDetailsDrawer} />

      <div className="details-drawer">
        {/* Header */}
        <div className="details-drawer-header">
          <div className="details-drawer-icon">
            {selectedWidget ? getCategoryEmoji(selectedWidget.category) : '🎨'}
          </div>
          <div className="details-drawer-title-section">
            <div className="details-drawer-title">
              {selectedWidget?.manifest.name || selectedSticker?.name}
            </div>
            <div className="details-drawer-subtitle">
              {selectedWidget
                ? `v${selectedWidget.manifest.version} • ${selectedWidget.source}`
                : selectedSticker?.type.toUpperCase()}
            </div>
          </div>
          <button className="details-drawer-close" onClick={closeDetailsDrawer}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="details-drawer-content">
          {/* Widget Details */}
          {selectedWidget && (
            <>
              {/* Description */}
              {selectedWidget.manifest.description && (
                <div className="details-section">
                  <div className="details-section-title">Description</div>
                  <div className="details-description">
                    {selectedWidget.manifest.description}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="details-section">
                <div className="details-section-title">Properties</div>
                <div className="details-badges">
                  <span className="details-badge category">
                    {getCategoryEmoji(selectedWidget.category)}{' '}
                    {getCategoryDisplayName(selectedWidget.category)}
                  </span>
                  <span className="details-badge pipeline">
                    <Zap size={10} />
                    {detectPipelineGroup(selectedWidget)}
                  </span>
                  <span className="details-badge">
                    {selectedWidget.manifest.kind}
                  </span>
                  {selectedWidget.isAI && (
                    <span className="details-badge ai">AI Generated</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedWidget.manifest.tags && selectedWidget.manifest.tags.length > 0 && (
                <div className="details-section">
                  <div className="details-section-title">Tags</div>
                  <div className="details-badges">
                    {selectedWidget.manifest.tags.map((tag) => (
                      <span key={tag} className="details-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inputs */}
              {Object.keys(selectedWidget.manifest.inputs || {}).length > 0 && (
                <div className="details-section">
                  <div className="details-section-title">Inputs</div>
                  <div className="details-list">
                    {Object.entries(selectedWidget.manifest.inputs).map(([name, schema]) => (
                      <div key={name} className="details-list-item">
                        <div className="details-list-item-icon">
                          <Code size={14} />
                        </div>
                        <div className="details-list-item-content">
                          <div className="details-list-item-name">{name}</div>
                          <div className="details-list-item-type">
                            {schema.type} {schema.required && '(required)'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outputs */}
              {Object.keys(selectedWidget.manifest.outputs || {}).length > 0 && (
                <div className="details-section">
                  <div className="details-section-title">Outputs</div>
                  <div className="details-list">
                    {Object.entries(selectedWidget.manifest.outputs).map(([name, schema]) => (
                      <div key={name} className="details-list-item">
                        <div className="details-list-item-icon">
                          <Layers size={14} />
                        </div>
                        <div className="details-list-item-content">
                          <div className="details-list-item-name">{name}</div>
                          <div className="details-list-item-type">{schema.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="details-section">
                <div className="details-section-title">Metadata</div>
                <div className="details-meta">
                  <div className="details-meta-item">
                    <div className="details-meta-label">ID</div>
                    <div className="details-meta-value">{selectedWidget.id}</div>
                  </div>
                  <div className="details-meta-item">
                    <div className="details-meta-label">Version</div>
                    <div className="details-meta-value">{selectedWidget.manifest.version}</div>
                  </div>
                  <div className="details-meta-item">
                    <div className="details-meta-label">Kind</div>
                    <div className="details-meta-value">{selectedWidget.manifest.kind}</div>
                  </div>
                  <div className="details-meta-item">
                    <div className="details-meta-label">Entry</div>
                    <div className="details-meta-value">{selectedWidget.manifest.entry}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sticker Details */}
          {selectedSticker && (
            <>
              {/* Preview */}
              <div className="details-section">
                <div className="details-section-title">Preview</div>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={selectedSticker.url}
                    alt={selectedSticker.name}
                    style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="details-section">
                <div className="details-section-title">Properties</div>
                <div className="details-badges">
                  <span className="details-badge">{selectedSticker.type.toUpperCase()}</span>
                  {selectedSticker.isAnimated && (
                    <span className="details-badge">Animated</span>
                  )}
                  {selectedSticker.pack && (
                    <span className="details-badge category">{selectedSticker.pack}</span>
                  )}
                  {selectedSticker.isFavorite && (
                    <span className="details-badge" style={{ color: '#fbbf24' }}>
                      Favorite
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedSticker.tags.length > 0 && (
                <div className="details-section">
                  <div className="details-section-title">Tags</div>
                  <div className="details-badges">
                    {selectedSticker.tags.map((tag) => (
                      <span key={tag} className="details-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="details-drawer-footer">
          <button className="details-add-btn" onClick={handleAddToCanvas}>
            <Plus size={18} />
            Add to Canvas
          </button>
        </div>
      </div>
    </>
  );
};

export default WidgetDetailsDrawer;
