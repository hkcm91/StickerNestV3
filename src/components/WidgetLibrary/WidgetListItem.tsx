/**
 * StickerNest v2 - Widget List Item (Redesigned)
 *
 * A premium glassmorphic widget list item with:
 * - Custom SVG icons (no emojis!)
 * - I/O capability indicators
 * - Smooth animations and hover effects
 */

import React, { useCallback, useMemo } from 'react';
import type { WidgetListItem as WidgetItemType } from '../../utils/libraryUtils';
import { useLibraryStore } from '../../state/useLibraryStore';
import {
  Plus,
  Info,
  ArrowLeft,
  ArrowRight,
  Type,
  Image,
  Clock,
  MessageSquare,
  Play,
  BarChart3,
  CheckSquare,
  Quote,
  Bookmark,
  Users,
  Bell,
  Radio,
  Palette,
  Box,
  Eye,
  Send,
  Zap,
  Cpu,
  Link2,
} from 'lucide-react';

interface Props {
  widget: WidgetItemType;
  onAdd: (widget: WidgetItemType) => void;
  onOpenDetails: (widget: WidgetItemType) => void;
  isCompact?: boolean;
}

// Icon mapping for different widget types
const WIDGET_ICONS: Record<string, React.FC<{ size?: number }>> = {
  'basic-text': ({ size = 18 }) => <Type size={size} strokeWidth={1.5} />,
  'text': ({ size = 18 }) => <Type size={size} strokeWidth={1.5} />,
  'notes': ({ size = 18 }) => <MessageSquare size={size} strokeWidth={1.5} />,
  'data-display': ({ size = 18 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'image': ({ size = 18 }) => <Image size={size} strokeWidth={1.5} />,
  'image-sticker': ({ size = 18 }) => <Image size={size} strokeWidth={1.5} />,
  'lottie': ({ size = 18 }) => <Play size={size} strokeWidth={1.5} />,
  'clock': ({ size = 18 }) => <Clock size={size} strokeWidth={1.5} />,
  'timer': ({ size = 18 }) => <Clock size={size} strokeWidth={1.5} />,
  'todo': ({ size = 18 }) => <CheckSquare size={size} strokeWidth={1.5} />,
  'counter': ({ size = 18 }) => <Plus size={size} strokeWidth={1.5} />,
  'progress': ({ size = 18 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'quote': ({ size = 18 }) => <Quote size={size} strokeWidth={1.5} />,
  'bookmark': ({ size = 18 }) => <Bookmark size={size} strokeWidth={1.5} />,
  'weather': ({ size = 18 }) => <Eye size={size} strokeWidth={1.5} />,
  'comment': ({ size = 18 }) => <MessageSquare size={size} strokeWidth={1.5} />,
  'live-feed': ({ size = 18 }) => <Radio size={size} strokeWidth={1.5} />,
  'user-card': ({ size = 18 }) => <Users size={size} strokeWidth={1.5} />,
  'presence': ({ size = 18 }) => <Eye size={size} strokeWidth={1.5} />,
  'notification': ({ size = 18 }) => <Bell size={size} strokeWidth={1.5} />,
  'live-chat': ({ size = 18 }) => <Send size={size} strokeWidth={1.5} />,
  'broadcaster': ({ size = 18 }) => <Radio size={size} strokeWidth={1.5} />,
  'listener': ({ size = 18 }) => <Radio size={size} strokeWidth={1.5} />,
  'color-sync': ({ size = 18 }) => <Palette size={size} strokeWidth={1.5} />,
  'container': ({ size = 18 }) => <Box size={size} strokeWidth={1.5} />,
  'default': ({ size = 18 }) => <Box size={size} strokeWidth={1.5} />,
};

// Category gradient colors
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; glow: string }> = {
  display: { from: '#60a5fa', to: '#3b82f6', glow: 'rgba(96, 165, 250, 0.3)' },
  interactive: { from: '#34d399', to: '#10b981', glow: 'rgba(52, 211, 153, 0.3)' },
  container: { from: '#a78bfa', to: '#8b5cf6', glow: 'rgba(167, 139, 250, 0.3)' },
  data: { from: '#f472b6', to: '#ec4899', glow: 'rgba(244, 114, 182, 0.3)' },
  media: { from: '#fb923c', to: '#f97316', glow: 'rgba(251, 146, 60, 0.3)' },
  timers: { from: '#fbbf24', to: '#f59e0b', glow: 'rgba(251, 191, 36, 0.3)' },
  communication: { from: '#22d3ee', to: '#06b6d4', glow: 'rgba(34, 211, 238, 0.3)' },
  social: { from: '#e879f9', to: '#d946ef', glow: 'rgba(232, 121, 249, 0.3)' },
  'ai-tools': { from: '#c084fc', to: '#a855f7', glow: 'rgba(192, 132, 252, 0.3)' },
  utility: { from: '#94a3b8', to: '#64748b', glow: 'rgba(148, 163, 184, 0.3)' },
};

function getWidgetIcon(widget: WidgetItemType): React.FC<{ size?: number }> {
  const id = widget.id.toLowerCase();
  const name = widget.manifest?.name?.toLowerCase() || '';
  
  for (const [key, icon] of Object.entries(WIDGET_ICONS)) {
    if (id.includes(key) || name.includes(key)) {
      return icon;
    }
  }
  
  return WIDGET_ICONS['default'];
}

function getCategoryGradient(widget: WidgetItemType): { from: string; to: string; glow: string } {
  const id = widget.id.toLowerCase();
  const tags = widget.manifest?.tags || [];
  
  if (id.includes('social') || tags.includes('social')) return CATEGORY_GRADIENTS.social;
  if (id.includes('timer') || id.includes('clock')) return CATEGORY_GRADIENTS.timers;
  if (id.includes('broadcast') || id.includes('listener') || id.includes('sync')) return CATEGORY_GRADIENTS.communication;
  if (widget.manifest?.kind === 'display') return CATEGORY_GRADIENTS.display;
  if (widget.manifest?.kind === 'interactive') return CATEGORY_GRADIENTS.interactive;
  if (widget.manifest?.kind === 'container') return CATEGORY_GRADIENTS.container;
  if (widget.manifest?.kind === 'data') return CATEGORY_GRADIENTS.data;
  
  return CATEGORY_GRADIENTS.utility;
}

function getIOSummary(widget: WidgetItemType): { inputs: number; outputs: number } {
  const inputs = Object.keys(widget.manifest?.inputs || {}).length;
  const outputs = Object.keys(widget.manifest?.outputs || {}).length;
  return { inputs, outputs };
}

const styles = `
  .wli-v2 {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.04) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    user-select: none;
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .wli-v2::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    opacity: 0;
    transition: opacity 0.25s ease;
  }

  .wli-v2:hover {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.04) 100%
    );
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  }

  .wli-v2:hover::before {
    opacity: 1;
  }

  .wli-v2.compact {
    padding: 10px 12px;
    gap: 10px;
  }

  /* Icon Orb */
  .wli-icon-orb {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.25s ease;
    box-shadow: 
      0 4px 16px var(--glow-color),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }

  .wli-v2:hover .wli-icon-orb {
    transform: scale(1.05);
    box-shadow: 
      0 6px 24px var(--glow-color),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .wli-icon-orb svg {
    color: white;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  .compact .wli-icon-orb {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  /* Content */
  .wli-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .wli-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wli-name {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact .wli-name {
    font-size: 12px;
  }

  .wli-badges {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .wli-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px 6px;
    border-radius: 5px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    gap: 3px;
  }

  .wli-badge svg {
    width: 10px;
    height: 10px;
  }

  .wli-description {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }

  /* I/O Indicators */
  .wli-io {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }

  .wli-io-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }

  .wli-io-item svg {
    width: 12px;
    height: 12px;
  }

  .wli-io-item.inputs svg {
    color: #34d399;
  }

  .wli-io-item.outputs svg {
    color: #fb923c;
  }

  .wli-io-item span {
    font-weight: 500;
  }

  /* Tags */
  .wli-tags {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }

  .wli-tag {
    padding: 3px 7px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Actions */
  .wli-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    opacity: 0;
    transform: translateX(8px);
    transition: all 0.2s ease;
  }

  .wli-v2:hover .wli-actions {
    opacity: 1;
    transform: translateX(0);
  }

  .wli-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wli-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .wli-btn.primary {
    background: linear-gradient(135deg, var(--accent-from) 0%, var(--accent-to) 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 2px 8px var(--glow-color);
  }

  .wli-btn.primary:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 16px var(--glow-color);
  }

  .compact .wli-btn {
    width: 28px;
    height: 28px;
  }
`;

export const WidgetListItem: React.FC<Props> = ({
  widget,
  onAdd,
  onOpenDetails,
  isCompact = false,
}) => {
  const recordWidgetUsage = useLibraryStore((s) => s.recordWidgetUsage);

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      recordWidgetUsage(widget.id);
      onAdd(widget);
    },
    [widget, onAdd, recordWidgetUsage]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/widget-def-id', widget.id);
      e.dataTransfer.setData('text/widget-source', widget.source);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [widget]
  );

  const IconComponent = useMemo(() => getWidgetIcon(widget), [widget]);
  const gradient = useMemo(() => getCategoryGradient(widget), [widget]);
  const ioSummary = useMemo(() => getIOSummary(widget), [widget]);

  // Get badges
  const badges: { icon: React.ReactNode; color: string; label: string }[] = [];

  if (widget.isAI || widget.source === 'generated') {
    badges.push({ icon: <Cpu size={10} />, color: '#a78bfa', label: 'AI' });
  }

  if (widget.manifest?.io?.inputs?.some(i => i.includes('ai.')) || 
      widget.manifest?.io?.outputs?.some(o => o.includes('ai.'))) {
    badges.push({ icon: <Zap size={10} />, color: '#fbbf24', label: 'AI Ready' });
  }

  const cssVars = {
    '--accent-from': gradient.from,
    '--accent-to': gradient.to,
    '--glow-color': gradient.glow,
  } as React.CSSProperties;

  return (
    <>
      <style>{styles}</style>
      <div
        className={`wli-v2 ${isCompact ? 'compact' : ''}`}
        style={cssVars}
        onClick={() => onOpenDetails(widget)}
        draggable
        onDragStart={handleDragStart}
      >
        <div
          className="wli-icon-orb"
          style={{
            background: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
          }}
        >
          <IconComponent size={isCompact ? 16 : 20} />
        </div>

        <div className="wli-content">
          <div className="wli-header">
            <span className="wli-name">{widget.manifest?.name || widget.id}</span>
            {badges.length > 0 && (
              <div className="wli-badges">
                {badges.map((badge, i) => (
                  <span
                    key={i}
                    className="wli-badge"
                    style={{ background: `${badge.color}20`, color: badge.color }}
                    title={badge.label}
                  >
                    {badge.icon}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!isCompact && widget.manifest?.description && (
            <div className="wli-description">{widget.manifest.description}</div>
          )}

          {!isCompact && (ioSummary.inputs > 0 || ioSummary.outputs > 0) && (
            <div className="wli-io">
              {ioSummary.inputs > 0 && (
                <div className="wli-io-item inputs">
                  <ArrowLeft />
                  <span>{ioSummary.inputs}</span> inputs
                </div>
              )}
              {ioSummary.outputs > 0 && (
                <div className="wli-io-item outputs">
                  <ArrowRight />
                  <span>{ioSummary.outputs}</span> outputs
                </div>
              )}
              {(ioSummary.inputs > 0 || ioSummary.outputs > 0) && (
                <div className="wli-io-item" style={{ color: '#8b5cf6' }}>
                  <Link2 size={10} />
                  connectable
                </div>
              )}
            </div>
          )}

          {!isCompact && widget.manifest?.tags && widget.manifest.tags.length > 0 && (
            <div className="wli-tags">
              {widget.manifest.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="wli-tag">
                  {tag}
                </span>
              ))}
              {widget.manifest.tags.length > 3 && (
                <span className="wli-tag">+{widget.manifest.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="wli-actions">
          <button
            className="wli-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(widget);
            }}
            title="View Details"
          >
            <Info size={14} />
          </button>
          <button className="wli-btn primary" onClick={handleAdd} title="Add to Canvas">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </>
  );
};

export default WidgetListItem;
