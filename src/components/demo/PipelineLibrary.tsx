/**
 * StickerNest v2 - Pipeline Library Component
 *
 * A slide-out tray showing 5 pre-built widget pipelines.
 * Each pipeline is a curated collection of widgets that work together.
 * Supports drag-and-drop and click-to-load functionality.
 */

import React, { useState, useCallback, useRef } from 'react';
import { RuntimeContext } from '../../runtime/RuntimeContext';

// =============================================================================
// Types
// =============================================================================

export interface WidgetPipeline {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  widgets: PipelineWidget[];
  preview?: string;
}

export interface PipelineWidget {
  id: string;
  name: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

interface PipelineLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onPipelineLoad?: (pipelineId: string) => void;
  runtime?: RuntimeContext | null;
  onModeChange?: (mode: 'edit') => void;
}

// =============================================================================
// Pipeline Definitions
// =============================================================================

export const WIDGET_PIPELINES: WidgetPipeline[] = [
  {
    id: 'canvas-control',
    name: 'Canvas Control',
    description: 'Control canvas background, filters & effects',
    icon: '🎛️',
    color: '#06b6d4',
    preview: 'Widgets that modify canvas properties in real-time',
    widgets: [
      { id: 'canvas-bg-color', name: 'Background Color', position: { x: 50, y: 50 }, size: { width: 200, height: 180 } },
      { id: 'canvas-bg-pattern', name: 'Background Pattern', position: { x: 280, y: 50 }, size: { width: 200, height: 180 } },
      { id: 'canvas-filters', name: 'Canvas Filters', position: { x: 510, y: 50 }, size: { width: 220, height: 200 } },
      { id: 'canvas-grid', name: 'Grid Controller', position: { x: 50, y: 260 }, size: { width: 200, height: 160 } },
      { id: 'gradient-maker', name: 'Gradient Maker', position: { x: 280, y: 260 }, size: { width: 220, height: 160 } },
    ],
  },
  {
    id: 'project-management',
    name: 'Project Tracker',
    description: 'Track tasks, time & get notifications',
    icon: '📋',
    color: '#3b82f6',
    preview: 'Kanban boards with integrated time tracking',
    widgets: [
      { id: 'project-tracker', name: 'Project Tracker', position: { x: 50, y: 50 }, size: { width: 400, height: 300 } },
      { id: 'time-tracker', name: 'Time Tracker', position: { x: 480, y: 50 }, size: { width: 250, height: 180 } },
      { id: 'notes-widget', name: 'Task Notes', position: { x: 480, y: 260 }, size: { width: 250, height: 200 } },
      { id: 'notification-center', name: 'Notifications', position: { x: 760, y: 50 }, size: { width: 200, height: 150 } },
      { id: 'activity-feed', name: 'Activity Feed', position: { x: 760, y: 230 }, size: { width: 200, height: 230 } },
    ],
  },
  {
    id: 'creative-suite',
    name: 'Creative Studio',
    description: 'Vector graphics, effects & filters',
    icon: '🎨',
    color: '#ec4899',
    preview: 'Full vector editing with layers and export',
    widgets: [
      { id: 'vector-canvas', name: 'Vector Canvas', position: { x: 50, y: 50 }, size: { width: 500, height: 400 } },
      { id: 'shape-spawner', name: 'Shape Spawner', position: { x: 580, y: 50 }, size: { width: 180, height: 200 } },
      { id: 'vector-color-picker', name: 'Color Picker', position: { x: 580, y: 280 }, size: { width: 180, height: 170 } },
      { id: 'vector-style-panel', name: 'Style Panel', position: { x: 790, y: 50 }, size: { width: 180, height: 200 } },
      { id: 'vector-layers', name: 'Layer Manager', position: { x: 790, y: 280 }, size: { width: 180, height: 170 } },
    ],
  },
  {
    id: 'ai-generator',
    name: 'AI Generator',
    description: 'Generate images & videos with AI',
    icon: '🤖',
    color: '#8b5cf6',
    preview: 'AI-powered content generation pipeline',
    widgets: [
      { id: 'ai-widget-generator', name: 'AI Generator', position: { x: 50, y: 50 }, size: { width: 350, height: 300 } },
      { id: 'photo-generation-widget', name: 'Photo Generator', position: { x: 430, y: 50 }, size: { width: 280, height: 220 } },
      { id: 'video-generation-widget', name: 'Video Generator', position: { x: 430, y: 300 }, size: { width: 280, height: 150 } },
      { id: 'prompt-options-widget', name: 'Prompt Options', position: { x: 740, y: 50 }, size: { width: 220, height: 200 } },
      { id: 'api-settings-widget', name: 'API Settings', position: { x: 740, y: 280 }, size: { width: 220, height: 170 } },
    ],
  },
  {
    id: 'data-pipeline',
    name: 'Data Flow',
    description: 'Connect widgets with data pipelines',
    icon: '🔗',
    color: '#22c55e',
    preview: 'Visual data flow between connected widgets',
    widgets: [
      { id: 'pipeline-button', name: 'Pipeline Button', position: { x: 50, y: 150 }, size: { width: 150, height: 100 } },
      { id: 'pipeline-text', name: 'Pipeline Text', position: { x: 250, y: 50 }, size: { width: 200, height: 120 } },
      { id: 'pipeline-timer', name: 'Pipeline Timer', position: { x: 250, y: 200 }, size: { width: 200, height: 150 } },
      { id: 'pipeline-progressbar', name: 'Progress Bar', position: { x: 500, y: 120 }, size: { width: 250, height: 80 } },
      { id: 'pipeline-visualizer', name: 'Visualizer', position: { x: 500, y: 230 }, size: { width: 250, height: 180 } },
    ],
  },
];

// =============================================================================
// Component
// =============================================================================

export const PipelineLibrary: React.FC<PipelineLibraryProps> = ({
  isOpen,
  onClose,
  onPipelineLoad,
  runtime,
  onModeChange,
}) => {
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [loadingPipeline, setLoadingPipeline] = useState<string | null>(null);
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
  const draggedPipelineRef = useRef<string | null>(null);

  // Handle pipeline click to load widgets
  const handlePipelineLoad = useCallback(async (pipeline: WidgetPipeline) => {
    if (!runtime) return;

    setLoadingPipeline(pipeline.id);
    setSelectedPipeline(pipeline.id);

    // Add each widget from the pipeline to the canvas
    for (const widget of pipeline.widgets) {
      runtime.eventBus.emit({
        type: 'widget:add-request',
        scope: 'canvas',
        payload: {
          widgetDefId: widget.id,
          version: '1.0.0',
          source: 'local',
          positionOffset: widget.position,
          sizeOverride: widget.size,
        },
      });

      // Small delay between widgets for visual effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLoadingPipeline(null);
    onPipelineLoad?.(pipeline.id);
    onModeChange?.('edit');
  }, [runtime, onPipelineLoad, onModeChange]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, pipeline: WidgetPipeline) => {
    draggedPipelineRef.current = pipeline.id;
    e.dataTransfer.setData('application/x-pipeline', pipeline.id);
    e.dataTransfer.effectAllowed = 'copy';

    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.textContent = `${pipeline.icon} ${pipeline.name}`;
    dragImage.style.cssText = `
      padding: 10px 16px;
      background: ${pipeline.color};
      color: white;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      position: absolute;
      top: -1000px;
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  // Toggle expanded state
  const toggleExpanded = useCallback((pipelineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPipeline(prev => prev === pipelineId ? null : pipelineId);
  }, []);

  return (
    <aside
      style={{
        ...styles.tray,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⚡</span>
          <h3 style={styles.title}>Widget Pipelines</h3>
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          ×
        </button>
      </div>

      {/* Description */}
      <p style={styles.description}>
        Pre-built widget collections that work together.
        <br />
        <span style={styles.descriptionHint}>Click to load or drag onto canvas</span>
      </p>

      {/* Pipeline List */}
      <div style={styles.pipelineList}>
        {WIDGET_PIPELINES.map((pipeline) => {
          const isLoading = loadingPipeline === pipeline.id;
          const isSelected = selectedPipeline === pipeline.id;
          const isExpanded = expandedPipeline === pipeline.id;

          return (
            <div
              key={pipeline.id}
              draggable
              onDragStart={(e) => handleDragStart(e, pipeline)}
              onClick={() => handlePipelineLoad(pipeline)}
              style={{
                ...styles.pipelineCard,
                borderColor: isSelected ? pipeline.color : 'rgba(255,255,255,0.08)',
                background: isSelected
                  ? `linear-gradient(135deg, ${pipeline.color}15 0%, ${pipeline.color}08 100%)`
                  : 'rgba(255,255,255,0.02)',
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? 'wait' : 'grab',
              }}
            >
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div
                  style={{
                    ...styles.iconContainer,
                    background: `${pipeline.color}20`,
                    boxShadow: isSelected ? `0 0 20px ${pipeline.color}40` : 'none',
                  }}
                >
                  <span style={styles.icon}>{pipeline.icon}</span>
                </div>
                <div style={styles.cardInfo}>
                  <span style={{ ...styles.cardName, color: isSelected ? pipeline.color : '#f1f5f9' }}>
                    {pipeline.name}
                  </span>
                  <span style={styles.cardDesc}>{pipeline.description}</span>
                </div>
                {isLoading && (
                  <div style={styles.loadingIndicator}>
                    <div style={styles.miniSpinner} />
                  </div>
                )}
              </div>

              {/* Widget Preview Pills */}
              <div style={styles.widgetPills}>
                {pipeline.widgets.slice(0, isExpanded ? undefined : 3).map((widget) => (
                  <span
                    key={widget.id}
                    style={{
                      ...styles.pill,
                      background: `${pipeline.color}15`,
                      borderColor: `${pipeline.color}30`,
                    }}
                  >
                    {widget.name.replace(' Widget', '')}
                  </span>
                ))}
                {!isExpanded && pipeline.widgets.length > 3 && (
                  <button
                    onClick={(e) => toggleExpanded(pipeline.id, e)}
                    style={styles.pillMore}
                  >
                    +{pipeline.widgets.length - 3} more
                  </button>
                )}
                {isExpanded && (
                  <button
                    onClick={(e) => toggleExpanded(pipeline.id, e)}
                    style={styles.pillCollapse}
                  >
                    Show less
                  </button>
                )}
              </div>

              {/* Pipeline Preview (when expanded) */}
              {isExpanded && (
                <div style={styles.previewSection}>
                  <div style={styles.previewLabel}>Layout Preview</div>
                  <div style={styles.previewCanvas}>
                    {pipeline.widgets.map((widget, i) => (
                      <div
                        key={widget.id}
                        style={{
                          ...styles.previewWidget,
                          left: `${(widget.position.x / 1000) * 100}%`,
                          top: `${(widget.position.y / 500) * 100}%`,
                          width: `${((widget.size?.width || 150) / 1000) * 100}%`,
                          height: `${((widget.size?.height || 100) / 500) * 100}%`,
                          background: `${pipeline.color}20`,
                          borderColor: `${pipeline.color}40`,
                        }}
                        title={widget.name}
                      >
                        <span style={styles.previewWidgetLabel}>{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePipelineLoad(pipeline);
                }}
                disabled={isLoading}
                style={{
                  ...styles.loadButton,
                  background: `linear-gradient(135deg, ${pipeline.color} 0%, ${pipeline.color}cc 100%)`,
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {isLoading ? 'Loading...' : 'Load Pipeline'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerTip}>
          <span style={styles.footerIcon}>💡</span>
          <span>Widgets are connected via data pipelines</span>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes miniSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  tray: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 360,
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%)',
    borderLeft: '1px solid rgba(139, 92, 246, 0.2)',
    boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.6)',
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 200,
    backdropFilter: 'blur(10px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
    background: 'rgba(139, 92, 246, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    margin: 0,
    color: '#f1f5f9',
    letterSpacing: '-0.3px',
  },
  closeButton: {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  description: {
    padding: '14px 20px',
    margin: 0,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 1.5,
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  descriptionHint: {
    fontSize: 11,
    color: '#64748b',
  },
  pipelineList: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  pipelineCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    cursor: 'grab',
    transition: 'all 0.25s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    transition: 'all 0.3s',
  },
  icon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    transition: 'color 0.2s',
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSpinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'miniSpin 0.8s linear infinite',
  },
  widgetPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    color: '#c4b5fd',
  },
  pillMore: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    color: '#64748b',
    cursor: 'pointer',
  },
  pillCollapse: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    color: '#64748b',
    cursor: 'pointer',
  },
  previewSection: {
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 8,
  },
  previewCanvas: {
    position: 'relative',
    width: '100%',
    height: 100,
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  previewWidget: {
    position: 'absolute',
    borderRadius: 4,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  previewWidgetLabel: {
    fontSize: 10,
    fontWeight: 700,
    opacity: 0.6,
  },
  loadButton: {
    padding: '10px 16px',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  footer: {
    padding: '14px 20px',
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  footerTip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    color: '#64748b',
  },
  footerIcon: {
    fontSize: 14,
  },
};

export default PipelineLibrary;
