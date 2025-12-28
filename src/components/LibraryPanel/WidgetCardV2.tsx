/**
 * StickerNest v2 - Enhanced Widget Card V2
 *
 * A premium glassmorphic widget card with:
 * - Beautiful custom SVG icons (no emojis!)
 * - I/O capability indicators
 * - Compatible widget connection badges
 * - Smooth animations and hover effects
 * - Rich visual hierarchy
 */

import React, { useCallback, useState, useMemo } from 'react';
import { WidgetPreviewModal } from './WidgetPreviewModal';
import {
  Plus,
  Star,
  Eye as EyeIcon,
  ArrowRight,
  ArrowLeft,
  Zap,
  Link2,
  Layers,
  Type,
  Image,
  Clock,
  MessageSquare,
  Settings,
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
  Download,
  ChevronRight,
  // Additional icons for variety
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
  Maximize2,
  Minimize2,
  AlignCenter,
  Binary,
  Braces,
  Network,
  Share2,
  Workflow,
} from 'lucide-react';
import type { LibraryViewMode, WidgetSource, WidgetCategory } from '../../types/library';
import type { WidgetManifest } from '../../types/manifest';
import { useLibraryStore } from '../../state/useLibraryStore';

// ============================================
// Types
// ============================================

interface WidgetCardV2Props {
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
  viewMode?: LibraryViewMode;
  isFavorite?: boolean;
  onAdd?: (widgetId: string) => void;
  onShowDetails?: (widgetId: string) => void;
  onFavoriteToggle?: (widgetId: string) => void;
}

// ============================================
// Icon System - Custom SVG Icons per Category
// ============================================

const WIDGET_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  // Display widgets
  'basic-text': ({ size = 20 }) => <Type size={size} strokeWidth={1.5} />,
  'text': ({ size = 20 }) => <FileText size={size} strokeWidth={1.5} />,
  'notes': ({ size = 20 }) => <PenTool size={size} strokeWidth={1.5} />,
  'data-display': ({ size = 20 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'label': ({ size = 20 }) => <Type size={size} strokeWidth={1.5} />,
  'markdown': ({ size = 20 }) => <Hash size={size} strokeWidth={1.5} />,
  'code': ({ size = 20 }) => <Code size={size} strokeWidth={1.5} />,
  'terminal': ({ size = 20 }) => <Terminal size={size} strokeWidth={1.5} />,
  
  // Media
  'image': ({ size = 20 }) => <Image size={size} strokeWidth={1.5} />,
  'image-sticker': ({ size = 20 }) => <Camera size={size} strokeWidth={1.5} />,
  'lottie': ({ size = 20 }) => <Sparkles size={size} strokeWidth={1.5} />,
  'video': ({ size = 20 }) => <Video size={size} strokeWidth={1.5} />,
  'audio': ({ size = 20 }) => <Music size={size} strokeWidth={1.5} />,
  'music': ({ size = 20 }) => <Music size={size} strokeWidth={1.5} />,
  'microphone': ({ size = 20 }) => <Mic size={size} strokeWidth={1.5} />,
  'camera': ({ size = 20 }) => <Camera size={size} strokeWidth={1.5} />,
  
  // Time
  'clock': ({ size = 20 }) => <Clock size={size} strokeWidth={1.5} />,
  'timer': ({ size = 20 }) => <Watch size={size} strokeWidth={1.5} />,
  'calendar': ({ size = 20 }) => <Calendar size={size} strokeWidth={1.5} />,
  'stopwatch': ({ size = 20 }) => <Activity size={size} strokeWidth={1.5} />,
  
  // Interactive
  'todo': ({ size = 20 }) => <CheckSquare size={size} strokeWidth={1.5} />,
  'counter': ({ size = 20 }) => <Hash size={size} strokeWidth={1.5} />,
  'progress': ({ size = 20 }) => <Gauge size={size} strokeWidth={1.5} />,
  'slider': ({ size = 20 }) => <Sliders size={size} strokeWidth={1.5} />,
  'button': ({ size = 20 }) => <MousePointer2 size={size} strokeWidth={1.5} />,
  'toggle': ({ size = 20 }) => <CircleDot size={size} strokeWidth={1.5} />,
  'input': ({ size = 20 }) => <Type size={size} strokeWidth={1.5} />,
  
  // Content
  'quote': ({ size = 20 }) => <Quote size={size} strokeWidth={1.5} />,
  'bookmark': ({ size = 20 }) => <Bookmark size={size} strokeWidth={1.5} />,
  'weather': ({ size = 20 }) => <Cloud size={size} strokeWidth={1.5} />,
  'map': ({ size = 20 }) => <Map size={size} strokeWidth={1.5} />,
  'location': ({ size = 20 }) => <Compass size={size} strokeWidth={1.5} />,
  'search': ({ size = 20 }) => <Search size={size} strokeWidth={1.5} />,
  'filter': ({ size = 20 }) => <Filter size={size} strokeWidth={1.5} />,
  
  // Social
  'comment': ({ size = 20 }) => <MessageSquare size={size} strokeWidth={1.5} />,
  'live-feed': ({ size = 20 }) => <Activity size={size} strokeWidth={1.5} />,
  'user-card': ({ size = 20 }) => <Users size={size} strokeWidth={1.5} />,
  'presence': ({ size = 20 }) => <CircleDot size={size} strokeWidth={1.5} />,
  'notification': ({ size = 20 }) => <Bell size={size} strokeWidth={1.5} />,
  'live-chat': ({ size = 20 }) => <Send size={size} strokeWidth={1.5} />,
  'profile': ({ size = 20 }) => <Fingerprint size={size} strokeWidth={1.5} />,
  'avatar': ({ size = 20 }) => <Smile size={size} strokeWidth={1.5} />,
  'mail': ({ size = 20 }) => <Mail size={size} strokeWidth={1.5} />,
  
  // Cross-canvas
  'broadcaster': ({ size = 20 }) => <Radio size={size} strokeWidth={1.5} />,
  'listener': ({ size = 20 }) => <Wifi size={size} strokeWidth={1.5} />,
  'color-sync': ({ size = 20 }) => <Palette size={size} strokeWidth={1.5} />,
  'sync': ({ size = 20 }) => <RefreshCw size={size} strokeWidth={1.5} />,
  'share': ({ size = 20 }) => <Share2 size={size} strokeWidth={1.5} />,
  'network': ({ size = 20 }) => <Network size={size} strokeWidth={1.5} />,
  
  // Data & Analytics
  'chart': ({ size = 20 }) => <BarChart3 size={size} strokeWidth={1.5} />,
  'analytics': ({ size = 20 }) => <Activity size={size} strokeWidth={1.5} />,
  'database': ({ size = 20 }) => <Database size={size} strokeWidth={1.5} />,
  'table': ({ size = 20 }) => <Grid3x3 size={size} strokeWidth={1.5} />,
  'json': ({ size = 20 }) => <Braces size={size} strokeWidth={1.5} />,
  'binary': ({ size = 20 }) => <Binary size={size} strokeWidth={1.5} />,
  
  // AI & Smart
  'ai': ({ size = 20 }) => <Bot size={size} strokeWidth={1.5} />,
  'smart': ({ size = 20 }) => <Lightbulb size={size} strokeWidth={1.5} />,
  'magic': ({ size = 20 }) => <Wand2 size={size} strokeWidth={1.5} />,
  'automation': ({ size = 20 }) => <Workflow size={size} strokeWidth={1.5} />,
  'suggestion': ({ size = 20 }) => <Sparkles size={size} strokeWidth={1.5} />,
  
  // System & Utility
  'container': ({ size = 20 }) => <Hexagon size={size} strokeWidth={1.5} />,
  'form': ({ size = 20 }) => <Settings size={size} strokeWidth={1.5} />,
  'layout': ({ size = 20 }) => <Layers size={size} strokeWidth={1.5} />,
  'pipeline': ({ size = 20 }) => <Workflow size={size} strokeWidth={1.5} />,
  'preview': ({ size = 20 }) => <Eye size={size} strokeWidth={1.5} />,
  'export': ({ size = 20 }) => <Download size={size} strokeWidth={1.5} />,
  'import': ({ size = 20 }) => <Upload size={size} strokeWidth={1.5} />,
  'settings': ({ size = 20 }) => <Wrench size={size} strokeWidth={1.5} />,
  'config': ({ size = 20 }) => <Sliders size={size} strokeWidth={1.5} />,
  
  // Layout & Transform
  'resize': ({ size = 20 }) => <Maximize2 size={size} strokeWidth={1.5} />,
  'minimize': ({ size = 20 }) => <Minimize2 size={size} strokeWidth={1.5} />,
  'align': ({ size = 20 }) => <AlignCenter size={size} strokeWidth={1.5} />,
  'move': ({ size = 20 }) => <Move size={size} strokeWidth={1.5} />,
  'drag': ({ size = 20 }) => <Move size={size} strokeWidth={1.5} />,
  
  // Security & Access
  'secure': ({ size = 20 }) => <Shield size={size} strokeWidth={1.5} />,
  'lock': ({ size = 20 }) => <Lock size={size} strokeWidth={1.5} />,
  'key': ({ size = 20 }) => <Key size={size} strokeWidth={1.5} />,
  'auth': ({ size = 20 }) => <Fingerprint size={size} strokeWidth={1.5} />,
  
  // Fun & Engagement
  'achievement': ({ size = 20 }) => <Trophy size={size} strokeWidth={1.5} />,
  'reward': ({ size = 20 }) => <Gift size={size} strokeWidth={1.5} />,
  'favorite': ({ size = 20 }) => <Heart size={size} strokeWidth={1.5} />,
  'flag': ({ size = 20 }) => <Flag size={size} strokeWidth={1.5} />,
  'target': ({ size = 20 }) => <Target size={size} strokeWidth={1.5} />,
  'launch': ({ size = 20 }) => <Rocket size={size} strokeWidth={1.5} />,
  
  // Environment & Home
  'home': ({ size = 20 }) => <Home size={size} strokeWidth={1.5} />,
  'globe': ({ size = 20 }) => <Globe size={size} strokeWidth={1.5} />,
  'temperature': ({ size = 20 }) => <Thermometer size={size} strokeWidth={1.5} />,
  
  // System
  'cpu': ({ size = 20 }) => <Cpu size={size} strokeWidth={1.5} />,
  'package': ({ size = 20 }) => <Package size={size} strokeWidth={1.5} />,
  
  // Default
  'default': ({ size = 20 }) => <Box size={size} strokeWidth={1.5} />,
};

// Category-based gradient colors (vibrant, glassy)
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; glow: string }> = {
  display: { from: '#60a5fa', to: '#3b82f6', glow: 'rgba(96, 165, 250, 0.15)' },
  interactive: { from: '#34d399', to: '#10b981', glow: 'rgba(52, 211, 153, 0.15)' },
  container: { from: '#a78bfa', to: '#8b5cf6', glow: 'rgba(167, 139, 250, 0.15)' },
  data: { from: '#f472b6', to: '#ec4899', glow: 'rgba(244, 114, 182, 0.15)' },
  media: { from: '#fb923c', to: '#f97316', glow: 'rgba(251, 146, 60, 0.15)' },
  timers: { from: '#fbbf24', to: '#f59e0b', glow: 'rgba(251, 191, 36, 0.15)' },
  communication: { from: '#22d3ee', to: '#06b6d4', glow: 'rgba(34, 211, 238, 0.15)' },
  social: { from: '#e879f9', to: '#d946ef', glow: 'rgba(232, 121, 249, 0.15)' },
  'ai-tools': { from: '#c084fc', to: '#a855f7', glow: 'rgba(192, 132, 252, 0.15)' },
  utility: { from: '#94a3b8', to: '#64748b', glow: 'rgba(148, 163, 184, 0.15)' },
};

const SOURCE_CONFIG: Record<WidgetSource, { label: string; color: string; bg: string }> = {
  builtin: { label: 'Core', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  official: { label: 'Official', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  community: { label: 'Community', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  user: { label: 'Custom', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'ai-generated': { label: 'AI', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  local: { label: 'Local', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
};

// ============================================
// Helper Functions
// ============================================

function getWidgetIcon(manifest: WidgetManifest): React.FC<{ size?: number; className?: string }> {
  const id = manifest.id.toLowerCase();
  const name = manifest.name.toLowerCase();
  
  // Try to match by ID fragments
  for (const [key, icon] of Object.entries(WIDGET_ICONS)) {
    if (id.includes(key) || name.includes(key)) {
      return icon;
    }
  }
  
  // Match by kind
  if (manifest.kind === 'display') return WIDGET_ICONS['text'];
  if (manifest.kind === 'interactive') return WIDGET_ICONS['default'];
  if (manifest.kind === 'container') return WIDGET_ICONS['container'];
  if (manifest.kind === 'data') return WIDGET_ICONS['data-display'];
  
  return WIDGET_ICONS['default'];
}

function getCategoryFromManifest(manifest: WidgetManifest): string {
  const tags = manifest.tags || [];
  const name = manifest.name.toLowerCase();
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

function getIOSummary(manifest: WidgetManifest): { inputs: number; outputs: number; ioTypes: string[] } {
  const inputs = Object.keys(manifest.inputs || {}).length;
  const outputs = Object.keys(manifest.outputs || {}).length;
  
  // Extract IO capability types for display
  const ioTypes: string[] = [];
  if (manifest.io?.inputs && Array.isArray(manifest.io.inputs)) {
    manifest.io.inputs.slice(0, 2).forEach(cap => {
      // Handle both string and object formats
      const capStr = typeof cap === 'string' ? cap : (cap?.type || cap?.id || '');
      if (capStr && typeof capStr === 'string') {
        const [domain] = capStr.split('.');
        if (domain && !ioTypes.includes(domain)) ioTypes.push(domain);
      }
    });
  }
  if (manifest.io?.outputs && Array.isArray(manifest.io.outputs)) {
    manifest.io.outputs.slice(0, 2).forEach(cap => {
      // Handle both string and object formats
      const capStr = typeof cap === 'string' ? cap : (cap?.type || cap?.id || '');
      if (capStr && typeof capStr === 'string') {
        const [domain] = capStr.split('.');
        if (domain && !ioTypes.includes(domain)) ioTypes.push(domain);
      }
    });
  }
  
  return { inputs, outputs, ioTypes };
}

// ============================================
// Styles
// ============================================

const styles = `
  .widget-card-v2 {
    position: relative;
    display: flex;
    flex-direction: column;
    /* ELONGATED CARD - taller to show more content */
    aspect-ratio: 0.75;
    min-width: 180px;
    min-height: 240px;
    /* Glass Neumorphism Base */
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.12) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    /* Neumorphic border with glass effect */
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    overflow: visible;
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    /* Glass neumorphism shadows - outer and inner */
    box-shadow: 
      /* Outer shadow - creates depth */
      8px 8px 24px rgba(0, 0, 0, 0.25),
      -4px -4px 16px rgba(255, 255, 255, 0.03),
      /* Inner glow - glass effect */
      inset 0 1px 1px rgba(255, 255, 255, 0.15),
      inset 0 -1px 1px rgba(0, 0, 0, 0.05);
  }

  .widget-card-v2:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 
      /* Enhanced outer shadow on hover */
      12px 12px 40px rgba(0, 0, 0, 0.35),
      -6px -6px 24px rgba(255, 255, 255, 0.04),
      /* Colored glow from category - toned down */
      0 0 20px var(--glow-color, rgba(139, 92, 246, 0.12)),
      /* Inner glass highlight */
      inset 0 2px 2px rgba(255, 255, 255, 0.2),
      inset 0 -1px 2px rgba(0, 0, 0, 0.08);
  }

  /* Top edge highlight */
  .widget-card-v2::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 10%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 90%
    );
    border-radius: 20px 20px 0 0;
    z-index: 1;
  }

  /* Inner glass reflection */
  .widget-card-v2::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0%,
      transparent 100%
    );
    pointer-events: none;
    border-radius: 20px 20px 0 0;
  }

  /* Icon Container */
  .wc2-icon-container {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    /* Glass inner panel */
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.06) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 20px 20px 0 0;
  }

  .wc2-icon-bg {
    position: absolute;
    inset: 0;
    opacity: 0.3;
    background: radial-gradient(
      circle at center,
      var(--accent-from) 0%,
      transparent 70%
    );
    filter: blur(30px);
    transition: all 0.3s ease;
  }

  .widget-card-v2:hover .wc2-icon-bg {
    opacity: 0.45;
  }

  .wc2-icon-orb {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Glass neumorphic icon container */
    background: linear-gradient(
      145deg,
      var(--accent-from) 0%,
      var(--accent-to) 100%
    );
    /* Neumorphic shadow stack */
    box-shadow: 
      /* Outer glow - toned down */
      0 4px 16px var(--glow-color),
      0 4px 16px rgba(0, 0, 0, 0.2),
      /* Inner glass highlights */
      inset 0 2px 4px rgba(255, 255, 255, 0.3),
      inset 0 -2px 4px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    /* Glass border */
    border: 1px solid rgba(255, 255, 255, 0.25);
  }

  .widget-card-v2:hover .wc2-icon-orb {
    transform: scale(1.08);
    box-shadow: 
      0 6px 20px var(--glow-color),
      0 6px 20px rgba(0, 0, 0, 0.25),
      inset 0 2px 5px rgba(255, 255, 255, 0.35),
      inset 0 -2px 5px rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.35);
  }

  .wc2-icon-orb svg {
    color: white;
    width: 32px;
    height: 32px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  /* Badges - Glass Style */
  .wc2-badges {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    gap: 6px;
    z-index: 2;
  }

  .wc2-badge {
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    /* Glass neumorphic badge */
    box-shadow: 
      2px 2px 8px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .wc2-badge-new {
    background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
    color: white;
    box-shadow: 
      2px 2px 8px rgba(34, 197, 94, 0.3),
      0 0 20px rgba(34, 197, 94, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.25);
  }

  /* Card Body */
  .wc2-body {
    padding: 14px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex-shrink: 0;
    flex: 1;
    min-height: 0;
    /* Subtle inner glass panel */
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.08) 0%,
      rgba(0, 0, 0, 0.04) 100%
    );
  }

  /* Header */
  .wc2-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .wc2-title-area {
    flex: 1;
    min-width: 0;
    overflow: visible;
  }

  .wc2-name {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: visible;
    text-overflow: ellipsis;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
    min-width: 0;
  }

  .wc2-description {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .wc2-favorite {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s ease;
    flex-shrink: 0;
    /* Neumorphic button */
    box-shadow: 
      2px 2px 6px rgba(0, 0, 0, 0.15),
      -1px -1px 4px rgba(255, 255, 255, 0.03),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
  }

  .wc2-favorite:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
    box-shadow: 
      3px 3px 8px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
  }

  /* I/O Section - Hidden in square grid view */
  .wc2-io-section {
    display: none;
  }

  .wc2-io-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 9px;
    /* Glass raised item */
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.07) 0%,
      rgba(255, 255, 255, 0.03) 100%
    );
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    box-shadow: 
      1px 1px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 1px rgba(255, 255, 255, 0.08);
  }

  .wc2-io-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wc2-io-icon.inputs {
    background: linear-gradient(145deg, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0.15) 100%);
    color: #34d399;
    box-shadow: 
      0 0 12px rgba(52, 211, 153, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(52, 211, 153, 0.2);
  }

  .wc2-io-icon.outputs {
    background: linear-gradient(145deg, rgba(251, 146, 60, 0.25) 0%, rgba(251, 146, 60, 0.15) 100%);
    color: #fb923c;
    box-shadow: 
      0 0 12px rgba(251, 146, 60, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(251, 146, 60, 0.2);
  }

  .wc2-io-label {
    flex: 1;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
  }

  .wc2-io-count {
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  /* Capability Pills - Hidden in square grid view */
  .wc2-capabilities {
    display: none;
  }

  .wc2-cap-pill {
    display: none;
  }

  /* Connectable Widgets - Hidden in square grid view */
  .wc2-connectable {
    display: none;
  }

  /* Actions - Glass Buttons */
  .wc2-actions {
    display: flex;
    gap: 8px;
    opacity: 1;
    transform: translateY(0);
    transition: all 0.2s ease;
    margin-top: auto;
    padding-top: 4px;
    flex-shrink: 0;
  }

  .widget-card-v2:hover .wc2-actions {
    opacity: 1;
    transform: translateY(0);
  }

  .wc2-action-btn {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 0;
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border: none;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .wc2-action-btn span {
    display: none;
  }

  .wc2-action-btn.secondary {
    /* Glass neumorphic secondary button */
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.04) 100%
    );
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 
      2px 2px 6px rgba(0, 0, 0, 0.15),
      inset 0 1px 1px rgba(255, 255, 255, 0.12);
  }

  .wc2-action-btn.secondary:hover {
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.08) 100%
    );
    color: white;
  }

  .wc2-action-btn.primary {
    /* Glass neumorphic primary button */
    background: linear-gradient(145deg, var(--accent-from) 0%, var(--accent-to) 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 
      0 2px 8px var(--glow-color),
      inset 0 1px 2px rgba(255, 255, 255, 0.25),
      inset 0 -1px 2px rgba(0, 0, 0, 0.15);
  }

  .wc2-action-btn.primary:hover {
    box-shadow: 
      0 3px 12px var(--glow-color),
      inset 0 2px 3px rgba(255, 255, 255, 0.3),
      inset 0 -1px 3px rgba(0, 0, 0, 0.2);
  }

  /* Source Badge - Glass Style */
  .wc2-source-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    z-index: 2;
    /* Glass badge */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 
      2px 2px 8px rgba(0, 0, 0, 0.2),
      inset 0 1px 1px rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* List View - Glass Row Style (not square) */
  .widget-card-v2.list-view {
    flex-direction: row;
    aspect-ratio: auto;
    min-height: 64px;
    height: auto;
    padding: 12px 14px;
    gap: 12px;
    border-radius: 16px;
    align-items: center;
    overflow: visible;
  }

  .widget-card-v2.list-view .wc2-icon-container {
    width: 48px;
    height: 48px;
    flex: none;
    background: transparent;
    border: none;
    border-radius: 12px;
  }

  .widget-card-v2.list-view .wc2-icon-orb {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .widget-card-v2.list-view .wc2-icon-orb svg {
    width: 22px;
    height: 22px;
  }

  .widget-card-v2.list-view .wc2-body {
    padding: 0;
    flex: 1;
    min-width: 0;
    background: transparent;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .widget-card-v2.list-view .wc2-header {
    margin: 0;
    width: 100%;
  }

  .widget-card-v2.list-view .wc2-title-area {
    flex: 1;
    min-width: 100px;
    overflow: visible;
  }

  .widget-card-v2.list-view .wc2-name {
    font-size: 13px;
    white-space: nowrap;
    overflow: visible;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .widget-card-v2.list-view .wc2-description {
    display: none;
  }

  .widget-card-v2.list-view .wc2-actions {
    flex-direction: row;
    gap: 6px;
    opacity: 1;
    flex-shrink: 0;
    margin-left: auto;
  }

  .widget-card-v2.list-view:hover .wc2-actions {
    opacity: 1;
  }

  .widget-card-v2.list-view .wc2-action-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    flex: none;
    border-radius: 8px;
  }

  /* Compact View - Square Glass Tile */
  .widget-card-v2.compact-view {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    min-width: 100px;
    min-height: 100px;
    padding: 16px;
    gap: 10px;
    /* Glass neumorphic compact tile */
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.03) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 
      6px 6px 20px rgba(0, 0, 0, 0.2),
      -3px -3px 12px rgba(255, 255, 255, 0.02),
      inset 0 1px 1px rgba(255, 255, 255, 0.12);
  }

  .widget-card-v2.compact-view::before {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 20%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 80%
    );
  }

  .widget-card-v2.compact-view:hover {
    transform: translateY(-3px);
    background: linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.14) 0%,
      rgba(255, 255, 255, 0.05) 100%
    );
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 
      8px 8px 28px rgba(0, 0, 0, 0.25),
      -4px -4px 16px rgba(255, 255, 255, 0.03),
      0 0 15px var(--glow-color, rgba(139, 92, 246, 0.1)),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
  }

  .widget-card-v2.compact-view .wc2-icon-container {
    width: 64px;
    height: 64px;
    min-height: 64px;
    flex: none;
    background: transparent;
    border: none;
    border-radius: 16px;
  }

  .widget-card-v2.compact-view .wc2-icon-orb {
    width: 64px;
    height: 64px;
    border-radius: 16px;
  }

  .widget-card-v2.compact-view .wc2-icon-orb svg {
    width: 30px;
    height: 30px;
  }

  .widget-card-v2.compact-view .wc2-body,
  .widget-card-v2.compact-view .wc2-badges,
  .widget-card-v2.compact-view .wc2-source-badge {
    display: none;
  }
  
  .widget-card-v2.compact-view .wc2-actions {
    display: flex;
    opacity: 1;
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
  }

  .widget-card-v2.compact-view .wc2-compact-name {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
`;

// ============================================
// Component
// ============================================

export const WidgetCardV2: React.FC<WidgetCardV2Props> = ({
  widget,
  viewMode = 'grid',
  isFavorite = false,
  onAdd,
  onShowDetails,
  onFavoriteToggle,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const trackItemAccess = useLibraryStore((s) => s.trackItemAccess);

  // Derived values
  const category = widget.category || getCategoryFromManifest(widget.manifest);
  const gradient = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.utility;
  const source = widget.source || 'builtin';
  const sourceConfig = SOURCE_CONFIG[source];
  const IconComponent = getWidgetIcon(widget.manifest);
  const ioSummary = useMemo(() => getIOSummary(widget.manifest), [widget.manifest]);

  // Handlers
  const handleClick = useCallback(() => {
    // Open preview modal instead of calling onShowDetails
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handleAdd = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      trackItemAccess(widget.id, 'widget');
      onAdd?.(widget.id);
    },
    [widget.id, onAdd, trackItemAccess]
  );

  const handleAddFromPreview = useCallback(
    (widgetId: string) => {
      trackItemAccess(widgetId, 'widget');
      onAdd?.(widgetId);
    },
    [onAdd, trackItemAccess]
  );

  const handleFavoriteToggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onFavoriteToggle?.(widget.id);
    },
    [widget.id, onFavoriteToggle]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/widget-def-id', widget.id);
      e.dataTransfer.setData('text/widget-source', source);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [widget.id, source]
  );

  const cssVars = {
    '--accent-from': gradient.from,
    '--accent-to': gradient.to,
    '--glow-color': gradient.glow,
  } as React.CSSProperties;

  // Compact View
  if (viewMode === 'compact') {
    return (
      <>
        <style>{styles}</style>
        <div
          className="widget-card-v2 compact-view"
          style={cssVars}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          draggable
          onDragStart={handleDragStart}
          title={widget.manifest.name}
        >
          <div className="wc2-icon-container">
            <div className="wc2-icon-bg" />
            <div className="wc2-icon-orb">
              <IconComponent size={30} />
            </div>
          </div>
          <span className="wc2-compact-name">{widget.manifest.name}</span>
          {/* Quick Add button for mobile touch */}
          <button
            className="wc2-compact-add-btn"
            onClick={handleAdd}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--sn-accent-primary, #8b5cf6)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#fff',
              opacity: isHovered ? 1 : 0.7,
              transition: 'var(--sn-transition-fast, 150ms ease)',
              zIndex: 10,
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <WidgetPreviewModal
          widget={widget}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onAdd={handleAddFromPreview}
          isFavorite={isFavorite}
          onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(widget.id) : undefined}
        />
      </>
    );
  }

  // List View
  if (viewMode === 'list') {
    return (
      <>
        <style>{styles}</style>
        <div
          className="widget-card-v2 list-view"
          style={cssVars}
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          draggable
          onDragStart={handleDragStart}
        >
          <div className="wc2-icon-container">
            <div className="wc2-icon-bg" />
            <div className="wc2-icon-orb">
              <IconComponent size={22} />
            </div>
          </div>

          <div className="wc2-body">
            <div className="wc2-header">
              <div className="wc2-title-area">
                <div className="wc2-name">{widget.manifest.name}</div>
                <div className="wc2-description">
                  {widget.manifest.description || 'No description available'}
                </div>
              </div>
            </div>
          </div>

          <div className="wc2-actions">
            <button
              className="wc2-favorite"
              style={{ color: isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)' }}
              onClick={handleFavoriteToggle}
            >
              <Star size={16} fill={isFavorite ? '#fbbf24' : 'none'} />
            </button>
            <button className="wc2-action-btn secondary" onClick={handleClick}>
              <EyeIcon size={14} />
            </button>
            <button className="wc2-action-btn primary" onClick={handleAdd}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <WidgetPreviewModal
          widget={widget}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onAdd={handleAddFromPreview}
          isFavorite={isFavorite}
          onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(widget.id) : undefined}
        />
      </>
    );
  }

  // Grid View (Default)
  return (
    <>
      <style>{styles}</style>
      <div
        className="widget-card-v2"
        style={cssVars}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
      >
        {/* Icon Area */}
        <div className="wc2-icon-container">
          <div className="wc2-icon-bg" />
          <div className="wc2-icon-orb">
            <IconComponent size={32} />
          </div>

          {/* Source Badge */}
          <div
            className="wc2-source-badge"
            style={{ background: sourceConfig.bg, color: sourceConfig.color }}
          >
            {sourceConfig.label}
          </div>

          {/* Badges */}
          <div className="wc2-badges">
            {widget.isNew && <span className="wc2-badge wc2-badge-new">New</span>}
          </div>
        </div>

        {/* Body */}
        <div className="wc2-body">
          {/* Header */}
          <div className="wc2-header">
            <div className="wc2-title-area">
              <div className="wc2-name">{widget.manifest.name}</div>
              <div className="wc2-description">
                {widget.manifest.description || 'No description available'}
              </div>
            </div>
            <button
              className="wc2-favorite"
              style={{ color: isFavorite ? '#fbbf24' : 'rgba(255, 255, 255, 0.3)' }}
              onClick={handleFavoriteToggle}
            >
              <Star size={16} fill={isFavorite ? '#fbbf24' : 'none'} />
            </button>
          </div>

          {/* I/O Section */}
          <div className="wc2-io-section">
            <div className="wc2-io-item">
              <div className="wc2-io-icon inputs">
                <ArrowLeft size={12} />
              </div>
              <span className="wc2-io-label">Inputs</span>
              <span className="wc2-io-count">{ioSummary.inputs}</span>
            </div>
            <div className="wc2-io-item">
              <div className="wc2-io-icon outputs">
                <ArrowRight size={12} />
              </div>
              <span className="wc2-io-label">Outputs</span>
              <span className="wc2-io-count">{ioSummary.outputs}</span>
            </div>
          </div>

          {/* Capability Pills */}
          {ioSummary.ioTypes.length > 0 && (
            <div className="wc2-capabilities">
              {ioSummary.ioTypes.slice(0, 4).map((type) => (
                <span key={type} className="wc2-cap-pill">
                  <Zap />
                  {type}
                </span>
              ))}
            </div>
          )}

          {/* Connectable indicator */}
          {(ioSummary.inputs > 0 || ioSummary.outputs > 0) && (
            <div className="wc2-connectable">
              <Link2 size={14} />
              <span className="wc2-connectable-text">
                {ioSummary.inputs > 0 && ioSummary.outputs > 0
                  ? 'Receives & sends data'
                  : ioSummary.inputs > 0
                  ? 'Receives data from widgets'
                  : 'Sends data to widgets'}
              </span>
              <ChevronRight size={12} />
            </div>
          )}

          {/* Actions */}
          <div className="wc2-actions">
            <button className="wc2-action-btn secondary" onClick={handleClick} title="Preview">
              <EyeIcon size={14} />
            </button>
            <button className="wc2-action-btn primary" onClick={handleAdd} title="Add">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
      <WidgetPreviewModal
        widget={widget}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onAdd={handleAddFromPreview}
        isFavorite={isFavorite}
        onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(widget.id) : undefined}
      />
    </>
  );
};

export default WidgetCardV2;

