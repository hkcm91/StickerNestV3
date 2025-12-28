/**
 * StickerNest v2 - Widget Preview Modal
 * 
 * A glass neumorphic modal for previewing widgets before adding to canvas.
 * Shows widget icon, name, description, inputs/outputs, and properties.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  ArrowRight,
  ArrowLeft,
  Zap,
  Tag,
  User,
  Box,
  Settings,
  Layers,
  Link2,
  Info,
  Maximize2,
  Star,
  // Icon imports for categories
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
  Eye,
  Send,
  Download,
  Calendar,
  Hash,
  FileText,
  Globe,
  Music,
  Video,
  Mic,
  Camera,
  Map,
  Grid3x3,
  Database,
  Terminal,
  Code,
  Cpu,
  Wifi,
  Cloud,
  Activity,
  Target,
  Compass,
  PenTool,
  Filter,
  Flag,
  Gift,
  Heart,
  Home,
  Key,
  Lock,
  Mail,
  Package,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Smile,
  Thermometer,
  Trophy,
  Upload,
  Watch,
  Wrench,
  Sparkles,
  Wand2,
  Rocket,
  Lightbulb,
  Gauge,
  Fingerprint,
  Bot,
  Hexagon,
  CircleDot,
  MousePointer2,
  Move,
  AlignCenter,
  Binary,
  Braces,
  Network,
  Share2,
  Workflow,
} from 'lucide-react';
import type { WidgetManifest } from '../../types/manifest';
import type { WidgetSource, WidgetCategory } from '../../types/library';

interface WidgetPreviewModalProps {
  widget: {
    id: string;
    manifest: WidgetManifest;
    source?: WidgetSource;
    category?: WidgetCategory;
    thumbnailUrl?: string;
    useCount?: number;
    isNew?: boolean;
    isFeatured?: boolean;
    qualityScore?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onAdd: (widgetId: string) => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (widgetId: string) => void;
}

// Icon mapping
const WIDGET_ICONS: Record<string, React.FC<{ size?: number }>> = {
  'basic-text': ({ size = 20 }) => <Type size={size} strokeWidth={1.5} />,
  'text': ({ size = 20 }) => <FileText size={size} strokeWidth={1.5} />,
  'notes': ({ size = 20 }) => <PenTool size={size} strokeWidth={1.5} />,
  'data-display': ({ size = 20 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'label': ({ size = 20 }) => <Type size={size} strokeWidth={1.5} />,
  'markdown': ({ size = 20 }) => <Hash size={size} strokeWidth={1.5} />,
  'code': ({ size = 20 }) => <Code size={size} strokeWidth={1.5} />,
  'terminal': ({ size = 20 }) => <Terminal size={size} strokeWidth={1.5} />,
  'image': ({ size = 20 }) => <Image size={size} strokeWidth={1.5} />,
  'image-sticker': ({ size = 20 }) => <Camera size={size} strokeWidth={1.5} />,
  'lottie': ({ size = 20 }) => <Sparkles size={size} strokeWidth={1.5} />,
  'video': ({ size = 20 }) => <Video size={size} strokeWidth={1.5} />,
  'audio': ({ size = 20 }) => <Music size={size} strokeWidth={1.5} />,
  'clock': ({ size = 20 }) => <Clock size={size} strokeWidth={1.5} />,
  'timer': ({ size = 20 }) => <Watch size={size} strokeWidth={1.5} />,
  'calendar': ({ size = 20 }) => <Calendar size={size} strokeWidth={1.5} />,
  'todo': ({ size = 20 }) => <CheckSquare size={size} strokeWidth={1.5} />,
  'counter': ({ size = 20 }) => <Hash size={size} strokeWidth={1.5} />,
  'progress': ({ size = 20 }) => <Gauge size={size} strokeWidth={1.5} />,
  'slider': ({ size = 20 }) => <Sliders size={size} strokeWidth={1.5} />,
  'button': ({ size = 20 }) => <MousePointer2 size={size} strokeWidth={1.5} />,
  'quote': ({ size = 20 }) => <Quote size={size} strokeWidth={1.5} />,
  'bookmark': ({ size = 20 }) => <Bookmark size={size} strokeWidth={1.5} />,
  'weather': ({ size = 20 }) => <Cloud size={size} strokeWidth={1.5} />,
  'map': ({ size = 20 }) => <Map size={size} strokeWidth={1.5} />,
  'search': ({ size = 20 }) => <Search size={size} strokeWidth={1.5} />,
  'comment': ({ size = 20 }) => <MessageSquare size={size} strokeWidth={1.5} />,
  'live-feed': ({ size = 20 }) => <Activity size={size} strokeWidth={1.5} />,
  'user-card': ({ size = 20 }) => <Users size={size} strokeWidth={1.5} />,
  'presence': ({ size = 20 }) => <CircleDot size={size} strokeWidth={1.5} />,
  'notification': ({ size = 20 }) => <Bell size={size} strokeWidth={1.5} />,
  'live-chat': ({ size = 20 }) => <Send size={size} strokeWidth={1.5} />,
  'profile': ({ size = 20 }) => <Fingerprint size={size} strokeWidth={1.5} />,
  'avatar': ({ size = 20 }) => <Smile size={size} strokeWidth={1.5} />,
  'mail': ({ size = 20 }) => <Mail size={size} strokeWidth={1.5} />,
  'broadcaster': ({ size = 20 }) => <Radio size={size} strokeWidth={1.5} />,
  'listener': ({ size = 20 }) => <Wifi size={size} strokeWidth={1.5} />,
  'color-sync': ({ size = 20 }) => <Palette size={size} strokeWidth={1.5} />,
  'sync': ({ size = 20 }) => <RefreshCw size={size} strokeWidth={1.5} />,
  'share': ({ size = 20 }) => <Share2 size={size} strokeWidth={1.5} />,
  'network': ({ size = 20 }) => <Network size={size} strokeWidth={1.5} />,
  'chart': ({ size = 20 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'analytics': ({ size = 20 }) => <Activity size={size} strokeWidth={1.5} />,
  'database': ({ size = 20 }) => <Database size={size} strokeWidth={1.5} />,
  'table': ({ size = 20 }) => <Grid3x3 size={size} strokeWidth={1.5} />,
  'json': ({ size = 20 }) => <Braces size={size} strokeWidth={1.5} />,
  'ai': ({ size = 20 }) => <Bot size={size} strokeWidth={1.5} />,
  'smart': ({ size = 20 }) => <Lightbulb size={size} strokeWidth={1.5} />,
  'magic': ({ size = 20 }) => <Wand2 size={size} strokeWidth={1.5} />,
  'automation': ({ size = 20 }) => <Workflow size={size} strokeWidth={1.5} />,
  'container': ({ size = 20 }) => <Hexagon size={size} strokeWidth={1.5} />,
  'form': ({ size = 20 }) => <Settings size={size} strokeWidth={1.5} />,
  'layout': ({ size = 20 }) => <Layers size={size} strokeWidth={1.5} />,
  'pipeline': ({ size = 20 }) => <Workflow size={size} strokeWidth={1.5} />,
  'preview': ({ size = 20 }) => <Eye size={size} strokeWidth={1.5} />,
  'export': ({ size = 20 }) => <Download size={size} strokeWidth={1.5} />,
  'import': ({ size = 20 }) => <Upload size={size} strokeWidth={1.5} />,
  'settings': ({ size = 20 }) => <Wrench size={size} strokeWidth={1.5} />,
  'resize': ({ size = 20 }) => <Maximize2 size={size} strokeWidth={1.5} />,
  'move': ({ size = 20 }) => <Move size={size} strokeWidth={1.5} />,
  'secure': ({ size = 20 }) => <Shield size={size} strokeWidth={1.5} />,
  'lock': ({ size = 20 }) => <Lock size={size} strokeWidth={1.5} />,
  'key': ({ size = 20 }) => <Key size={size} strokeWidth={1.5} />,
  'achievement': ({ size = 20 }) => <Trophy size={size} strokeWidth={1.5} />,
  'reward': ({ size = 20 }) => <Gift size={size} strokeWidth={1.5} />,
  'favorite': ({ size = 20 }) => <Heart size={size} strokeWidth={1.5} />,
  'flag': ({ size = 20 }) => <Flag size={size} strokeWidth={1.5} />,
  'target': ({ size = 20 }) => <Target size={size} strokeWidth={1.5} />,
  'launch': ({ size = 20 }) => <Rocket size={size} strokeWidth={1.5} />,
  'home': ({ size = 20 }) => <Home size={size} strokeWidth={1.5} />,
  'globe': ({ size = 20 }) => <Globe size={size} strokeWidth={1.5} />,
  'temperature': ({ size = 20 }) => <Thermometer size={size} strokeWidth={1.5} />,
  'cpu': ({ size = 20 }) => <Cpu size={size} strokeWidth={1.5} />,
  'package': ({ size = 20 }) => <Package size={size} strokeWidth={1.5} />,
  'default': ({ size = 20 }) => <Box size={size} strokeWidth={1.5} />,
};

// Category gradients
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; glow: string }> = {
  display: { from: '#60a5fa', to: '#3b82f6', glow: 'rgba(96, 165, 250, 0.4)' },
  interactive: { from: '#34d399', to: '#10b981', glow: 'rgba(52, 211, 153, 0.4)' },
  container: { from: '#a78bfa', to: '#8b5cf6', glow: 'rgba(167, 139, 250, 0.4)' },
  data: { from: '#f472b6', to: '#ec4899', glow: 'rgba(244, 114, 182, 0.4)' },
  media: { from: '#fb923c', to: '#f97316', glow: 'rgba(251, 146, 60, 0.4)' },
  timers: { from: '#fbbf24', to: '#f59e0b', glow: 'rgba(251, 191, 36, 0.4)' },
  communication: { from: '#22d3ee', to: '#06b6d4', glow: 'rgba(34, 211, 238, 0.4)' },
  social: { from: '#e879f9', to: '#d946ef', glow: 'rgba(232, 121, 249, 0.4)' },
  'ai-tools': { from: '#c084fc', to: '#a855f7', glow: 'rgba(192, 132, 252, 0.4)' },
  utility: { from: '#94a3b8', to: '#64748b', glow: 'rgba(148, 163, 184, 0.4)' },
};

const SOURCE_CONFIG: Record<WidgetSource, { label: string; color: string; bg: string }> = {
  builtin: { label: 'Core', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  official: { label: 'Official', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  community: { label: 'Community', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  user: { label: 'Custom', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'ai-generated': { label: 'AI', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
};

// Styles
const styles = `
  .wpm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: wpm-fade-in 0.2s ease;
  }

  @keyframes wpm-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes wpm-slide-in {
    from { 
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to { 
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .wpm-modal {
    position: relative;
    width: 90%;
    max-width: 560px;
    max-height: 85vh;
    overflow: hidden;
    /* Glass Neumorphism */
    background: linear-gradient(
      145deg,
      rgba(30, 30, 40, 0.95) 0%,
      rgba(20, 20, 30, 0.98) 100%
    );
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    box-shadow: 
      0 32px 64px rgba(0, 0, 0, 0.5),
      0 0 120px var(--glow-color, rgba(139, 92, 246, 0.15)),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: wpm-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .wpm-modal::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 10%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 90%
    );
  }

  .wpm-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 10;
  }

  .wpm-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  /* Header Section */
  .wpm-header {
    padding: 24px 24px 20px;
    display: flex;
    gap: 20px;
    align-items: flex-start;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .wpm-icon-container {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      145deg,
      var(--accent-from) 0%,
      var(--accent-to) 100%
    );
    box-shadow: 
      0 8px 32px var(--glow-color),
      inset 0 2px 4px rgba(255, 255, 255, 0.25),
      inset 0 -2px 4px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
  }

  .wpm-icon-container svg {
    color: white;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .wpm-header-info {
    flex: 1;
    min-width: 0;
  }

  .wpm-title {
    font-size: 22px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 6px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .wpm-description {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .wpm-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .wpm-meta-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
  }

  .wpm-meta-badge svg {
    width: 12px;
    height: 12px;
    opacity: 0.7;
  }

  .wpm-source-badge {
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Content Section */
  .wpm-content {
    padding: 20px 24px;
    overflow-y: auto;
    max-height: calc(85vh - 280px);
  }

  .wpm-section {
    margin-bottom: 20px;
  }

  .wpm-section:last-child {
    margin-bottom: 0;
  }

  .wpm-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wpm-section-title svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }

  /* I/O Grid */
  .wpm-io-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .wpm-io-panel {
    padding: 14px;
    background: linear-gradient(
      145deg,
      rgba(0, 0, 0, 0.25) 0%,
      rgba(0, 0, 0, 0.15) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    box-shadow: inset 2px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .wpm-io-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .wpm-io-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wpm-io-icon.inputs {
    background: linear-gradient(145deg, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0.15) 100%);
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.25);
  }

  .wpm-io-icon.outputs {
    background: linear-gradient(145deg, rgba(251, 146, 60, 0.25) 0%, rgba(251, 146, 60, 0.15) 100%);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.25);
  }

  .wpm-io-title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
  }

  .wpm-io-count {
    margin-left: auto;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
  }

  .wpm-io-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .wpm-io-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    font-size: 12px;
  }

  .wpm-io-item-name {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
  }

  .wpm-io-item-type {
    margin-left: auto;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    font-family: monospace;
  }

  .wpm-io-empty {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
    padding: 8px 0;
  }

  /* Tags */
  .wpm-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wpm-tag {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.04) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .wpm-tag svg {
    width: 12px;
    height: 12px;
    opacity: 0.6;
  }

  /* Size Info */
  .wpm-size-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .wpm-size-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    text-align: center;
  }

  .wpm-size-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .wpm-size-value {
    font-size: 16px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
  }

  /* Capabilities */
  .wpm-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wpm-capability {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(
      145deg,
      rgba(139, 92, 246, 0.15) 0%,
      rgba(139, 92, 246, 0.08) 100%
    );
    border: 1px solid rgba(139, 92, 246, 0.25);
    border-radius: 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }

  .wpm-capability svg {
    width: 14px;
    height: 14px;
    color: #a78bfa;
  }

  /* Footer Actions */
  .wpm-footer {
    padding: 20px 24px;
    display: flex;
    gap: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.2);
  }

  .wpm-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wpm-btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .wpm-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.12);
    color: white;
  }

  .wpm-btn-primary {
    background: linear-gradient(145deg, var(--accent-from) 0%, var(--accent-to) 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 
      0 4px 20px var(--glow-color),
      inset 0 2px 3px rgba(255, 255, 255, 0.25),
      inset 0 -1px 3px rgba(0, 0, 0, 0.15);
  }

  .wpm-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 32px var(--glow-color),
      inset 0 2px 4px rgba(255, 255, 255, 0.3),
      inset 0 -1px 4px rgba(0, 0, 0, 0.2);
  }

  .wpm-favorite-btn {
    width: 48px;
    flex: none;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wpm-favorite-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .wpm-favorite-btn.active {
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
  }

  /* Mobile Responsive Styles */
  @media (max-width: 768px) {
    .wpm-overlay {
      align-items: flex-end;
      justify-content: center;
    }

    .wpm-modal {
      width: 100%;
      max-width: 100%;
      max-height: 90vh;
      border-radius: 24px 24px 0 0;
      animation: wpm-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes wpm-slide-up {
      from {
        opacity: 0;
        transform: translateY(100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .wpm-header {
      padding: 20px 16px 16px;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .wpm-icon-container {
      width: 64px;
      height: 64px;
      border-radius: 16px;
    }

    .wpm-title {
      font-size: 18px;
    }

    .wpm-description {
      font-size: 13px;
    }

    .wpm-meta {
      justify-content: center;
      flex-wrap: wrap;
    }

    .wpm-content {
      padding: 16px;
      max-height: calc(90vh - 280px);
    }

    .wpm-io-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .wpm-section {
      margin-bottom: 16px;
    }

    .wpm-section-title {
      font-size: 11px;
    }

    .wpm-footer {
      padding: 16px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    }

    .wpm-btn {
      padding: 16px 20px;
      min-height: 52px;
      font-size: 15px;
    }

    .wpm-close {
      width: 44px;
      height: 44px;
      top: 12px;
      right: 12px;
    }

    .wpm-favorite-btn {
      width: 52px;
      min-height: 52px;
    }
  }

  @media (max-width: 480px) {
    .wpm-header {
      gap: 12px;
      padding: 16px 12px 12px;
    }

    .wpm-icon-container {
      width: 56px;
      height: 56px;
    }

    .wpm-content {
      padding: 12px;
    }

    .wpm-title {
      font-size: 16px;
    }

    .wpm-tags-grid {
      gap: 4px;
    }

    .wpm-tag {
      font-size: 10px;
      padding: 4px 8px;
    }
  }
`;

// Helper functions
function getWidgetIcon(manifest: WidgetManifest): React.FC<{ size?: number }> {
  const id = manifest.id.toLowerCase();
  const name = manifest.name.toLowerCase();
  
  for (const [key, icon] of Object.entries(WIDGET_ICONS)) {
    if (id.includes(key) || name.includes(key)) {
      return icon;
    }
  }
  
  if (manifest.kind === 'display') return WIDGET_ICONS['text'];
  if (manifest.kind === 'interactive') return WIDGET_ICONS['default'];
  if (manifest.kind === 'container') return WIDGET_ICONS['container'];
  if (manifest.kind === 'data') return WIDGET_ICONS['data-display'];
  
  return WIDGET_ICONS['default'];
}

function getCategoryFromManifest(manifest: WidgetManifest): string {
  const tags = manifest.tags || [];
  const id = manifest.id.toLowerCase();
  
  if (id.includes('social') || tags.includes('social')) return 'social';
  if (id.includes('timer') || id.includes('clock')) return 'timers';
  if (id.includes('broadcast') || id.includes('listener') || id.includes('sync')) return 'communication';
  if (manifest.kind === 'display') return 'display';
  if (manifest.kind === 'interactive') return 'interactive';
  if (manifest.kind === 'container') return 'container';
  if (manifest.kind === 'data') return 'data';
  
  return 'utility';
}

export const WidgetPreviewModal: React.FC<WidgetPreviewModalProps> = ({
  widget,
  isOpen,
  onClose,
  onAdd,
  isFavorite = false,
  onFavoriteToggle,
}) => {
  const { manifest } = widget;
  const category = widget.category || getCategoryFromManifest(manifest);
  const gradient = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.utility;
  const source = widget.source || 'builtin';
  const sourceConfig = SOURCE_CONFIG[source];
  const IconComponent = getWidgetIcon(manifest);

  const inputs = useMemo(() => Object.entries(manifest.inputs || {}), [manifest.inputs]);
  const outputs = useMemo(() => Object.entries(manifest.outputs || {}), [manifest.outputs]);
  const tags = manifest.tags || [];
  const capabilities = manifest.capabilities || {};
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleAdd = useCallback(() => {
    onAdd(widget.id);
    onClose();
  }, [widget.id, onAdd, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleFavorite = useCallback(() => {
    onFavoriteToggle?.(widget.id);
  }, [widget.id, onFavoriteToggle]);

  if (!isOpen) return null;

  const cssVars = {
    '--accent-from': gradient.from,
    '--accent-to': gradient.to,
    '--glow-color': gradient.glow,
  } as React.CSSProperties;

  return (
    <>
      <style>{styles}</style>
      <div className="wpm-overlay" onClick={handleOverlayClick}>
        <div className="wpm-modal" style={cssVars}>
          {/* Close Button */}
          <button className="wpm-close" onClick={onClose}>
            <X size={18} />
          </button>

          {/* Header */}
          <div className="wpm-header">
            <div className="wpm-icon-container">
              <IconComponent size={40} />
            </div>
            <div className="wpm-header-info">
              <h2 className="wpm-title">{manifest.name}</h2>
              <p className="wpm-description">
                {manifest.description || 'No description available'}
              </p>
              <div className="wpm-meta">
                <span
                  className="wpm-source-badge"
                  style={{ background: sourceConfig.bg, color: sourceConfig.color }}
                >
                  {sourceConfig.label}
                </span>
                <span className="wpm-meta-badge">
                  <Layers size={12} />
                  {manifest.kind}
                </span>
                <span className="wpm-meta-badge">
                  <Tag size={12} />
                  v{manifest.version}
                </span>
                {manifest.author && (
                  <span className="wpm-meta-badge">
                    <User size={12} />
                    {manifest.author}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="wpm-content">
            {/* Inputs & Outputs */}
            <div className="wpm-section">
              <div className="wpm-section-title">
                <Link2 size={14} />
                Inputs & Outputs
              </div>
              <div className="wpm-io-grid">
                {/* Inputs Panel */}
                <div className="wpm-io-panel">
                  <div className="wpm-io-header">
                    <div className="wpm-io-icon inputs">
                      <ArrowLeft size={14} />
                    </div>
                    <span className="wpm-io-title">Inputs</span>
                    <span className="wpm-io-count">{inputs.length}</span>
                  </div>
                  <div className="wpm-io-list">
                    {inputs.length > 0 ? (
                      inputs.map(([name, schema]) => (
                        <div key={name} className="wpm-io-item">
                          <span className="wpm-io-item-name">{name}</span>
                          <span className="wpm-io-item-type">{schema.type}</span>
                        </div>
                      ))
                    ) : (
                      <div className="wpm-io-empty">No inputs</div>
                    )}
                  </div>
                </div>

                {/* Outputs Panel */}
                <div className="wpm-io-panel">
                  <div className="wpm-io-header">
                    <div className="wpm-io-icon outputs">
                      <ArrowRight size={14} />
                    </div>
                    <span className="wpm-io-title">Outputs</span>
                    <span className="wpm-io-count">{outputs.length}</span>
                  </div>
                  <div className="wpm-io-list">
                    {outputs.length > 0 ? (
                      outputs.map(([name, schema]) => (
                        <div key={name} className="wpm-io-item">
                          <span className="wpm-io-item-name">{name}</span>
                          <span className="wpm-io-item-type">{schema.type}</span>
                        </div>
                      ))
                    ) : (
                      <div className="wpm-io-empty">No outputs</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Default Size */}
            {manifest.size && (
              <div className="wpm-section">
                <div className="wpm-section-title">
                  <Maximize2 size={14} />
                  Default Size
                </div>
                <div className="wpm-size-grid">
                  {manifest.size.width && (
                    <div className="wpm-size-item">
                      <div className="wpm-size-label">Width</div>
                      <div className="wpm-size-value">{manifest.size.width}px</div>
                    </div>
                  )}
                  {manifest.size.height && (
                    <div className="wpm-size-item">
                      <div className="wpm-size-label">Height</div>
                      <div className="wpm-size-value">{manifest.size.height}px</div>
                    </div>
                  )}
                  {manifest.size.aspectRatio && (
                    <div className="wpm-size-item">
                      <div className="wpm-size-label">Aspect</div>
                      <div className="wpm-size-value">{manifest.size.aspectRatio}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {Object.keys(capabilities).length > 0 && (
              <div className="wpm-section">
                <div className="wpm-section-title">
                  <Zap size={14} />
                  Capabilities
                </div>
                <div className="wpm-capabilities">
                  {Object.entries(capabilities).map(([key, value]) => (
                    value && (
                      <span key={key} className="wpm-capability">
                        <Zap size={14} />
                        {key}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="wpm-section">
                <div className="wpm-section-title">
                  <Tag size={14} />
                  Tags
                </div>
                <div className="wpm-tags">
                  {tags.map((tag) => (
                    <span key={tag} className="wpm-tag">
                      <Tag size={12} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="wpm-footer">
            {onFavoriteToggle && (
              <button
                className={`wpm-favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={handleFavorite}
              >
                <Star
                  size={20}
                  fill={isFavorite ? '#fbbf24' : 'none'}
                  color={isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)'}
                />
              </button>
            )}
            <button className="wpm-btn wpm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="wpm-btn wpm-btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              Add to Canvas
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WidgetPreviewModal;











