/**
 * StickerNest v2 - Library Pipelines Tab
 *
 * Displays pre-configured widget pipelines for common use cases.
 * Features:
 * - Pipeline preset cards
 * - Add all widgets at once
 * - Pipeline descriptions and widget lists
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  Gamepad2,
  BarChart3,
  Image,
  MessageSquare,
  Palette,
  Clock,
  Workflow,
  Zap,
  Search,
  Users,
  Tv,
  PenTool,
  Bug,
  Camera,
  Music,
  FileText,
  Sparkles,
  Grid3X3,
  Bell,
  Box,
  MousePointer2,
  Video,
  Folder,
  Wand2,
  Sliders,
  PanelTop,
  PanelTopOpen,
  ShoppingCart,
  Mic,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useResponsive';
import type { WidgetManifest } from '../../types/manifest';
import { useCanvasStore } from '../../state/useCanvasStore';
import { usePanelsStore } from '../../state/usePanelsStore';

// ============================================
// Types
// ============================================

interface PipelinePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  widgetIds: string[];
  accentColor: string;
}

interface LibraryPipelinesTabProps {
  widgetManifests: Map<string, WidgetManifest>;
  onAddWidget?: (widgetId: string) => void;
  onAddMultipleWidgets?: (widgetIds: string[]) => void;
}

// ============================================
// Pipeline Presets
// ============================================

const PIPELINE_PRESETS: PipelinePreset[] = [
  // ============================================
  // Connected Data Flow Pipelines
  // ============================================
  {
    id: 'color-flow',
    name: 'Color Flow Pipeline',
    description: 'Color picker → data display with color sync',
    icon: <Sliders size={24} />,
    category: 'Data Flow',
    widgetIds: [
      'stickernest.color-picker',
      'stickernest.color-sync',
      'stickernest.data-display',
    ],
    accentColor: '#f43f5e',
  },
  {
    id: 'ping-notification',
    name: 'Counter → Notification',
    description: 'Counter clicks trigger notification alerts',
    icon: <Bell size={24} />,
    category: 'Data Flow',
    widgetIds: [
      'stickernest.counter',
      'stickernest.notification',
      'stickernest.data-display',
    ],
    accentColor: '#f97316',
  },
  {
    id: 'timer-progress',
    name: 'Timer → Progress Bar',
    description: 'Timer output drives progress bar visualization',
    icon: <Clock size={24} />,
    category: 'Data Flow',
    widgetIds: [
      'stickernest.timer',
      'stickernest.progress-bar',
      'stickernest.data-display',
    ],
    accentColor: '#06b6d4',
  },
  {
    id: 'button-echo',
    name: 'Counter → Text Display',
    description: 'Counter clicks update text display',
    icon: <MousePointer2 size={24} />,
    category: 'Data Flow',
    widgetIds: [
      'stickernest.counter',
      'stickernest.basic-text',
      'stickernest.data-display',
    ],
    accentColor: '#8b5cf6',
  },
  {
    id: 'cross-canvas-sync',
    name: 'Cross-Canvas Sync',
    description: 'Broadcast events between canvases',
    icon: <Users size={24} />,
    category: 'Data Flow',
    widgetIds: [
      'stickernest.cross-canvas-broadcaster',
      'stickernest.cross-canvas-listener',
      'stickernest.color-sync',
    ],
    accentColor: '#14b8a6',
  },

  // ============================================
  // AI & Generation Pipelines
  // ============================================
  {
    id: 'ai-image-pipeline',
    name: 'AI Image Generation',
    description: 'AI brain → image generator → preview export',
    icon: <Wand2 size={24} />,
    category: 'AI Pipeline',
    widgetIds: [
      'stickernest.ai-brain',
      'stickernest.ai-image-generator',
      'stickernest.preview-export',
    ],
    accentColor: '#a855f7',
  },
  {
    id: 'ai-template-pipeline',
    name: 'AI Template Engine',
    description: 'Template loader → engine → compositor output',
    icon: <Wand2 size={24} />,
    category: 'AI Pipeline',
    widgetIds: [
      'stickernest.template-loader',
      'stickernest.template-engine',
      'stickernest.compositor',
    ],
    accentColor: '#dc2626',
  },
  {
    id: 'ai-config-flow',
    name: 'AI Configuration Pipeline',
    description: 'AI configurator → pipeline controller → preview',
    icon: <Wand2 size={24} />,
    category: 'AI Pipeline',
    widgetIds: [
      'stickernest.ai-configurator',
      'stickernest.pipeline-controller',
      'stickernest.preview-export',
    ],
    accentColor: '#7c3aed',
  },

  // ============================================
  // Media Processing Pipelines
  // ============================================
  {
    id: 'image-editing',
    name: 'Image Editing Suite',
    description: 'Image tool → effects → transform → export',
    icon: <Camera size={24} />,
    category: 'Media Pipeline',
    widgetIds: [
      'stickernest.image-tool-v2',
      'stickernest.effects',
      'stickernest.transform',
      'stickernest.preview-export',
    ],
    accentColor: '#0ea5e9',
  },
  {
    id: 'retro-media',
    name: 'Retro Media Display',
    description: 'TikTok playlist → retro TV → lottie effects',
    icon: <Video size={24} />,
    category: 'Media Pipeline',
    widgetIds: [
      'stickernest.tiktok-playlist',
      'stickernest.retro-tv',
      'stickernest.lottie-player',
    ],
    accentColor: '#ef4444',
  },
  {
    id: 'webcam-stream',
    name: 'Webcam Stream Setup',
    description: 'Webcam → frame overlay → retro TV display',
    icon: <Tv size={24} />,
    category: 'Media Pipeline',
    widgetIds: [
      'stickernest.webcam',
      'stickernest.webcam-frame',
      'stickernest.retro-tv',
    ],
    accentColor: '#8b5cf6',
  },
  {
    id: 'media-display',
    name: 'Media Display Pack',
    description: 'Image sticker → lottie → speech bubble',
    icon: <Music size={24} />,
    category: 'Media Pipeline',
    widgetIds: [
      'stickernest.image-sticker',
      'stickernest.lottie-player',
      'stickernest.speech-bubble',
    ],
    accentColor: '#22c55e',
  },

  // ============================================
  // Game & Interactive Pipelines
  // ============================================
  {
    id: 'interactive-games',
    name: 'Interactive Game Pack',
    description: 'Bubble hunter → bubbles → counter for scoring',
    icon: <Gamepad2 size={24} />,
    category: 'Games',
    widgetIds: [
      'stickernest.bubble-hunter',
      'stickernest.bubbles',
      'stickernest.counter',
    ],
    accentColor: '#22c55e',
  },
  {
    id: 'interactive-controls',
    name: 'Interactive Controls',
    description: 'Counter → progress bar → notification feedback',
    icon: <MousePointer2 size={24} />,
    category: 'Controls',
    widgetIds: [
      'stickernest.counter',
      'stickernest.progress-bar',
      'stickernest.notification',
    ],
    accentColor: '#0891b2',
  },

  // ============================================
  // Design Tools Pipelines
  // ============================================
  {
    id: 'design-tools',
    name: 'Design Toolbar Suite',
    description: 'Design toolbar → color picker → typography',
    icon: <PenTool size={24} />,
    category: 'Design Pipeline',
    widgetIds: [
      'stickernest.design-toolbar',
      'stickernest.color-picker-v2',
      'stickernest.typography',
    ],
    accentColor: '#f472b6',
  },
  {
    id: 'shape-text-tools',
    name: 'Shape & Text Tools',
    description: 'Shape tool → text tool → effects panel',
    icon: <Box size={24} />,
    category: 'Design Pipeline',
    widgetIds: [
      'stickernest.shape-tool-v2',
      'stickernest.text-tool-v2',
      'stickernest.effects',
    ],
    accentColor: '#7c3aed',
  },
  {
    id: 'canvas-tools',
    name: 'Canvas Control Suite',
    description: 'Canvas control → transform → view switcher',
    icon: <Grid3X3 size={24} />,
    category: 'Design Pipeline',
    widgetIds: [
      'stickernest.canvas-control-v2',
      'stickernest.transform',
      'stickernest.view-switcher',
    ],
    accentColor: '#64748b',
  },

  // ============================================
  // Social & Collaboration Pipelines
  // ============================================
  {
    id: 'live-chat-feed',
    name: 'Live Chat + Feed',
    description: 'Chat messages → feed display → notifications',
    icon: <MessageSquare size={24} />,
    category: 'Social',
    widgetIds: [
      'stickernest.live-chat',
      'stickernest.live-feed',
      'stickernest.notification',
    ],
    accentColor: '#3b82f6',
  },
  {
    id: 'user-presence',
    name: 'User Presence System',
    description: 'User card → presence indicator → collaborator list',
    icon: <Users size={24} />,
    category: 'Social',
    widgetIds: [
      'stickernest.user-card',
      'stickernest.presence',
      'stickernest.collaborator-list',
    ],
    accentColor: '#14b8a6',
  },
  {
    id: 'social-interaction',
    name: 'Social Interaction Kit',
    description: 'Comments → user cards → live feed',
    icon: <MessageSquare size={24} />,
    category: 'Social',
    widgetIds: [
      'stickernest.comment-widget',
      'stickernest.user-card',
      'stickernest.live-feed',
    ],
    accentColor: '#ec4899',
  },

  // ============================================
  // Streaming Pipelines
  // ============================================
  {
    id: 'stream-alerts',
    name: 'Stream Alert System',
    description: 'Viewer count → alerts → OBS control',
    icon: <Tv size={24} />,
    category: 'Streaming',
    widgetIds: [
      'stickernest.viewer-count',
      'stickernest.stream-alert',
      'stickernest.obs-control',
    ],
    accentColor: '#8b5cf6',
  },
  {
    id: 'stream-overlay',
    name: 'Stream Overlay Pack',
    description: 'Webcam frame → speech bubble → viewer count',
    icon: <Tv size={24} />,
    category: 'Streaming',
    widgetIds: [
      'stickernest.webcam-frame',
      'stickernest.speech-bubble',
      'stickernest.viewer-count',
    ],
    accentColor: '#a855f7',
  },

  // ============================================
  // Commerce Pipelines
  // ============================================
  {
    id: 'storefront',
    name: 'Storefront Setup',
    description: 'Product gallery → checkout flow → customer dashboard',
    icon: <BarChart3 size={24} />,
    category: 'Commerce',
    widgetIds: [
      'stickernest.product-gallery',
      'stickernest.checkout-flow',
      'stickernest.customer-dashboard',
    ],
    accentColor: '#10b981',
  },
  {
    id: 'product-display',
    name: 'Product Display Kit',
    description: 'Product card → lead capture → customer gate',
    icon: <BarChart3 size={24} />,
    category: 'Commerce',
    widgetIds: [
      'stickernest.product-card',
      'stickernest.lead-capture',
      'stickernest.customer-gate',
    ],
    accentColor: '#f59e0b',
  },

  // ============================================
  // Productivity Pipelines
  // ============================================
  {
    id: 'notes-workflow',
    name: 'Notes Workflow',
    description: 'Notes → bookmarks → quote collection',
    icon: <FileText size={24} />,
    category: 'Productivity',
    widgetIds: [
      'stickernest.notes',
      'stickernest.bookmark',
      'stickernest.quote',
    ],
    accentColor: '#6366f1',
  },
  {
    id: 'time-management',
    name: 'Time Management',
    description: 'Clock → timer → todo list',
    icon: <Clock size={24} />,
    category: 'Productivity',
    widgetIds: [
      'stickernest.clock',
      'stickernest.timer',
      'stickernest.todo-list',
    ],
    accentColor: '#06b6d4',
  },
  {
    id: 'task-tracking',
    name: 'Task Tracking Suite',
    description: 'Todo list → progress bar → counter',
    icon: <BarChart3 size={24} />,
    category: 'Productivity',
    widgetIds: [
      'stickernest.todo-list',
      'stickernest.progress-bar',
      'stickernest.counter',
    ],
    accentColor: '#f59e0b',
  },
  {
    id: 'halos-widgets-pipeline',
    name: "Halo's Widgets",
    description: 'Personal document management with OCR, voice notes, and export to Word/LibreOffice',
    icon: <Mic size={24} />,
    category: 'Productivity',
    widgetIds: [
      'stickernest.ocr-scanner',
      'stickernest.voice-notes',
      'stickernest.document-editor',
      'stickernest.note-hub',
    ],
    accentColor: '#8b5cf6',
  },

  // ============================================
  // Home & Lifestyle Pipelines
  // ============================================
  {
    id: 'grocery-management-pipeline',
    name: 'Grocery Management',
    description: 'Complete grocery management with shopping lists, pantry tracking, recipes, AI meal suggestions, and meal planning',
    icon: <ShoppingCart size={24} />,
    category: 'Home',
    widgetIds: [
      'stickernest.shopping-list',
      'stickernest.pantry',
      'stickernest.receipt-scanner',
      'stickernest.price-tracker',
      'stickernest.recipe-manager',
      'stickernest.ai-meal-suggester',
      'stickernest.meal-planner',
    ],
    accentColor: '#22c55e',
  },

  // ============================================
  // Quick Start & Essentials
  // ============================================
  {
    id: 'quick-start',
    name: 'Quick Start Kit',
    description: 'Essential standalone widgets to get started',
    icon: <Zap size={24} />,
    category: 'Essentials',
    widgetIds: [
      'stickernest.basic-text',
      'stickernest.notes',
      'stickernest.clock',
      'stickernest.weather',
    ],
    accentColor: '#10b981',
  },
  {
    id: 'dashboard-basics',
    name: 'Dashboard Basics',
    description: 'Data display → counter → progress bar',
    icon: <BarChart3 size={24} />,
    category: 'Essentials',
    widgetIds: [
      'stickernest.data-display',
      'stickernest.counter',
      'stickernest.progress-bar',
    ],
    accentColor: '#f59e0b',
  },
  {
    id: 'display-widgets',
    name: 'Display Widget Pack',
    description: 'Basic text → image sticker → quote → shelf',
    icon: <Layers size={24} />,
    category: 'Essentials',
    widgetIds: [
      'stickernest.basic-text',
      'stickernest.image-sticker',
      'stickernest.quote',
      'stickernest.shelf',
    ],
    accentColor: '#8b5cf6',
  },
  {
    id: 'fun-interactive',
    name: 'Fun & Interactive',
    description: 'Bubbles → bubble hunter → AI brain',
    icon: <Sparkles size={24} />,
    category: 'Essentials',
    widgetIds: [
      'stickernest.bubbles',
      'stickernest.bubble-hunter',
      'stickernest.ai-brain',
    ],
    accentColor: '#ec4899',
  },
];

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  header: {
    padding: '16px',
    borderBottom: '1px solid var(--sn-border-secondary)',
  },

  headerTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
  },

  searchContainer: {
    padding: '0 16px 12px',
    borderBottom: '1px solid var(--sn-border-secondary)',
  },

  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 10,
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'var(--sn-transition-fast)',
  },

  searchIcon: {
    position: 'absolute',
    left: 28,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--sn-text-muted)',
    pointerEvents: 'none',
  },

  categoryChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '8px 16px',
    borderBottom: '1px solid var(--sn-border-secondary)',
  },

  categoryChip: {
    padding: '6px 12px',
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
    border: '1px solid var(--sn-border-secondary)',
    background: 'transparent',
    color: 'var(--sn-text-secondary)',
  },

  categoryChipActive: {
    background: 'var(--sn-accent-primary)',
    borderColor: 'var(--sn-accent-primary)',
    color: '#fff',
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: 12,
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },

  // Mobile grid (single column)
  gridMobile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },

  pipelineCard: {
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },

  cardInfo: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 4,
  },

  cardDescription: {
    fontSize: 12,
    color: 'var(--sn-text-secondary)',
    lineHeight: 1.4,
  },

  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  categoryBadge: {
    fontSize: 10,
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'var(--sn-bg-elevated)',
    color: 'var(--sn-text-secondary)',
  },

  widgetCount: {
    fontSize: 11,
    color: 'var(--sn-text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },

  widgetList: {
    marginBottom: 12,
  },

  widgetListToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: 'var(--sn-text-muted)',
    cursor: 'pointer',
    marginBottom: 8,
  },

  widgetListItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },

  widgetTag: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'var(--sn-bg-secondary)',
    color: 'var(--sn-text-secondary)',
    border: '1px solid var(--sn-border-secondary)',
  },

  addAllButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'var(--sn-accent-primary)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  // Mobile button (larger touch target)
  addAllButtonMobile: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 20px',
    minHeight: 52,
    background: 'var(--sn-accent-primary)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  buttonRow: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },

  dockButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'var(--sn-bg-elevated)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 8,
    color: 'var(--sn-text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  dockButtonMobile: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 16px',
    minHeight: 44,
    background: 'var(--sn-bg-elevated)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 10,
    color: 'var(--sn-text-secondary)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
  },

  dockDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: 'var(--sn-bg-secondary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 8,
    padding: 8,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },

  dockOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast)',
    color: 'var(--sn-text-primary)',
    fontSize: 13,
  },

  dockOptionHover: {
    background: 'var(--sn-bg-tertiary)',
  },

  dockOptionNew: {
    borderTop: '1px solid var(--sn-border-secondary)',
    marginTop: 4,
    paddingTop: 12,
    color: 'var(--sn-accent-primary)',
  },

  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: 'var(--sn-text-muted)',
  },

  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 12,
  },
};

// ============================================
// Pipeline Card Component
// ============================================

interface PipelineCardProps {
  pipeline: PipelinePreset;
  availableWidgets: string[];
  existingWidgets: Set<string>;
  onAddAll: (widgetIds: string[]) => void;
  onDockToPanel: (widgetIds: string[], panelId: string | null, panelName?: string) => void;
  existingPanels: Array<{ id: string; title: string }>;
  isMobile?: boolean;
}

const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline,
  availableWidgets,
  existingWidgets,
  onAddAll,
  onDockToPanel,
  existingPanels,
  isMobile = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDockDropdown, setShowDockDropdown] = useState(false);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  // Use mobile button style
  const buttonStyle = isMobile ? styles.addAllButtonMobile : styles.addAllButton;
  const dockButtonStyle = isMobile ? styles.dockButtonMobile : styles.dockButton;

  // Filter to only available widgets
  const availableInPipeline = pipeline.widgetIds.filter((id) =>
    availableWidgets.includes(id)
  );

  // Count new widgets (not already on canvas)
  const newWidgets = availableInPipeline.filter((id) => !existingWidgets.has(id));
  const newCount = newWidgets.length;
  const existingCount = availableInPipeline.length - newCount;
  const totalCount = pipeline.widgetIds.length;

  const handleAddAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddAll(availableInPipeline);
    },
    [availableInPipeline, onAddAll]
  );

  return (
    <div
      style={{
        ...styles.pipelineCard,
        borderColor: isHovered
          ? pipeline.accentColor
          : 'var(--sn-border-secondary)',
        boxShadow: isHovered
          ? `0 4px 12px ${pipeline.accentColor}20`
          : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div style={styles.cardHeader}>
        <div
          style={{
            ...styles.iconContainer,
            background: pipeline.accentColor,
          }}
        >
          {pipeline.icon}
        </div>
        <div style={styles.cardInfo}>
          <div style={styles.cardTitle}>{pipeline.name}</div>
          <div style={styles.cardDescription}>{pipeline.description}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={styles.cardMeta}>
        <span style={styles.categoryBadge}>{pipeline.category}</span>
        <span style={styles.widgetCount}>
          <Layers size={12} />
          {newCount} new{existingCount > 0 ? ` (${existingCount} on canvas)` : ''} / {totalCount} total
        </span>
      </div>

      {/* Widget List */}
      <div style={styles.widgetList}>
        <div
          style={styles.widgetListToggle}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {isExpanded ? 'Hide widgets' : 'Show widgets'}
        </div>
        {isExpanded && (
          <div style={styles.widgetListItems}>
            {pipeline.widgetIds.map((id) => {
              const isAvailable = availableWidgets.includes(id);
              const isOnCanvas = existingWidgets.has(id);
              return (
                <span
                  key={id}
                  style={{
                    ...styles.widgetTag,
                    opacity: isAvailable ? 1 : 0.5,
                    textDecoration: isAvailable ? 'none' : 'line-through',
                    background: isOnCanvas
                      ? 'var(--sn-accent-primary)'
                      : 'var(--sn-bg-secondary)',
                    color: isOnCanvas ? '#fff' : 'var(--sn-text-secondary)',
                    borderColor: isOnCanvas
                      ? 'var(--sn-accent-primary)'
                      : 'var(--sn-border-secondary)',
                  }}
                  title={
                    !isAvailable
                      ? `${id} (not available)`
                      : isOnCanvas
                        ? `${id} (already on canvas)`
                        : id
                  }
                >
                  {isOnCanvas ? '✓ ' : ''}{id.replace(/-widget$/, '')}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Add All Button */}
      <button
        style={{
          ...buttonStyle,
          background: newCount > 0 ? pipeline.accentColor : 'var(--sn-bg-elevated)',
          cursor: newCount > 0 ? 'pointer' : 'not-allowed',
          opacity: newCount > 0 ? 1 : 0.5,
        }}
        onClick={handleAddAll}
        disabled={newCount === 0}
      >
        <Plus size={isMobile ? 20 : 16} />
        {newCount > 0
          ? `Add ${newCount} Widget${newCount !== 1 ? 's' : ''} to Canvas`
          : 'All Widgets on Canvas'}
      </button>

      {/* Dock to Panel Button Row */}
      <div style={{ ...styles.buttonRow, position: 'relative' }}>
        <button
          style={{
            ...dockButtonStyle,
            borderColor: showDockDropdown ? pipeline.accentColor : 'var(--sn-border-secondary)',
            color: showDockDropdown ? pipeline.accentColor : 'var(--sn-text-secondary)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowDockDropdown(!showDockDropdown);
          }}
        >
          <PanelTop size={isMobile ? 18 : 14} />
          Dock to Panel
          <ChevronDown size={isMobile ? 16 : 12} style={{ marginLeft: 'auto' }} />
        </button>

        {/* Dock Dropdown */}
        {showDockDropdown && (
          <div style={styles.dockDropdown as React.CSSProperties}>
            {existingPanels.length > 0 && (
              <>
                <div style={{
                  fontSize: 10,
                  color: 'var(--sn-text-muted)',
                  padding: '4px 12px',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Existing Panels
                </div>
                {existingPanels.map((panel) => (
                  <div
                    key={panel.id}
                    style={{
                      ...styles.dockOption,
                      ...(hoveredOption === panel.id ? styles.dockOptionHover : {}),
                    }}
                    onMouseEnter={() => setHoveredOption(panel.id)}
                    onMouseLeave={() => setHoveredOption(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDockToPanel(availableInPipeline, panel.id);
                      setShowDockDropdown(false);
                    }}
                  >
                    <PanelTop size={14} />
                    {panel.title}
                  </div>
                ))}
              </>
            )}
            <div
              style={{
                ...styles.dockOption,
                ...styles.dockOptionNew,
                ...(hoveredOption === 'new' ? styles.dockOptionHover : {}),
              }}
              onMouseEnter={() => setHoveredOption('new')}
              onMouseLeave={() => setHoveredOption(null)}
              onClick={(e) => {
                e.stopPropagation();
                onDockToPanel(availableInPipeline, null, pipeline.name);
                setShowDockDropdown(false);
              }}
            >
              <PanelTopOpen size={14} />
              Create New Panel
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const LibraryPipelinesTab: React.FC<LibraryPipelinesTabProps> = ({
  widgetManifests,
  onAddWidget,
  onAddMultipleWidgets,
}) => {
  // Mobile detection
  const isMobile = useIsMobile();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get existing widget definition IDs from the canvas (for deduplication)
  const canvasWidgets = useCanvasStore((state) => state.widgets);
  const currentCanvasId = useCanvasStore((state) => state.canvasId);
  const existingWidgetDefIds = useMemo(() => {
    const ids = new Set<string>();
    canvasWidgets.forEach((widget) => {
      ids.add(widget.widgetDefId);
    });
    return ids;
  }, [canvasWidgets]);

  // Get panels store for docking functionality
  const panelsMap = usePanelsStore((state) => state.panels);
  const createPanel = usePanelsStore((state) => state.createPanel);
  const addWidgetToPanelTab = usePanelsStore((state) => state.addWidgetToPanelTab);
  const addTab = usePanelsStore((state) => state.addTab);

  // Get existing panels for the current canvas
  const existingPanels = useMemo(() => {
    const panels: Array<{ id: string; title: string }> = [];
    panelsMap.forEach((panel) => {
      if (panel.canvasId === currentCanvasId && panel.visible) {
        panels.push({ id: panel.id, title: panel.title });
      }
    });
    return panels;
  }, [panelsMap, currentCanvasId]);

  // Get list of available widget IDs
  const availableWidgetIds = Array.from(widgetManifests.keys());

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(PIPELINE_PRESETS.map(p => p.category));
    return Array.from(cats);
  }, []);

  // Filter pipelines based on search and category
  const filteredPipelines = useMemo(() => {
    return PIPELINE_PRESETS.filter(pipeline => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = pipeline.name.toLowerCase().includes(query);
        const matchesDescription = pipeline.description.toLowerCase().includes(query);
        const matchesCategory = pipeline.category.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesCategory) {
          return false;
        }
      }
      // Category filter
      if (selectedCategory && pipeline.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const handleAddAll = useCallback(
    (widgetIds: string[]) => {
      // Filter out widgets that already exist on the canvas
      const newWidgetIds = widgetIds.filter((id) => !existingWidgetDefIds.has(id));

      if (newWidgetIds.length === 0) {
        // All widgets already exist on canvas
        return;
      }

      if (onAddMultipleWidgets) {
        onAddMultipleWidgets(newWidgetIds);
      } else if (onAddWidget) {
        // Fall back to adding one at a time
        newWidgetIds.forEach((id) => onAddWidget(id));
      }
    },
    [onAddWidget, onAddMultipleWidgets, existingWidgetDefIds]
  );

  // Handle docking widgets to a panel
  const handleDockToPanel = useCallback(
    (widgetIds: string[], panelId: string | null, panelName?: string) => {
      if (!currentCanvasId) return;

      // First add widgets to canvas if they don't exist
      const newWidgetDefIds = widgetIds.filter((id) => !existingWidgetDefIds.has(id));

      // Add widgets to canvas first
      if (newWidgetDefIds.length > 0) {
        if (onAddMultipleWidgets) {
          onAddMultipleWidgets(newWidgetDefIds);
        } else if (onAddWidget) {
          newWidgetDefIds.forEach((id) => onAddWidget(id));
        }
      }

      // Create or use existing panel
      let targetPanelId = panelId;
      let targetTabId: string | undefined;

      if (!targetPanelId) {
        // Create a new panel
        const newPanel = createPanel({
          canvasId: currentCanvasId,
          title: panelName || 'Pipeline Panel',
          position: { x: 100, y: 100 },
          size: { width: 400, height: 300 },
        });
        targetPanelId = newPanel.id;
        targetTabId = newPanel.activeTab;
      } else {
        // Use existing panel - add a new tab for this pipeline
        const panel = panelsMap.get(targetPanelId);
        if (panel) {
          const newTab = addTab(targetPanelId, {
            label: panelName || 'Pipeline',
          });
          targetTabId = newTab?.id;
        }
      }

      // Wait for widgets to be added to canvas, then dock them
      // Using setTimeout to let React state update propagate
      setTimeout(() => {
        // Get all widget instance IDs that match the definition IDs we want to dock
        const currentWidgets = useCanvasStore.getState().widgets;
        const widgetsToDock: Array<{
          instanceId: string;
          position: { x: number; y: number };
          width: number;
          height: number;
          zIndex: number;
          rotation: number;
        }> = [];

        currentWidgets.forEach((widget) => {
          if (widgetIds.includes(widget.widgetDefId)) {
            widgetsToDock.push({
              instanceId: widget.id,
              position: widget.position,
              width: widget.width,
              height: widget.height,
              zIndex: widget.zIndex,
              rotation: widget.rotation,
            });
          }
        });

        // Dock each widget to the panel tab
        if (targetPanelId && targetTabId) {
          widgetsToDock.forEach((widget) => {
            addWidgetToPanelTab(targetPanelId!, targetTabId!, widget.instanceId, {
              position: widget.position,
              size: { width: widget.width, height: widget.height },
              zIndex: widget.zIndex,
              rotation: widget.rotation,
            });
          });
        }
      }, 100); // Small delay to ensure state has propagated
    },
    [currentCanvasId, existingWidgetDefIds, onAddWidget, onAddMultipleWidgets, createPanel, addTab, addWidgetToPanelTab, panelsMap]
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Package size={16} />
          Widget Pipelines
        </div>
        <div style={styles.headerSubtitle}>
          Pre-configured widget collections for common use cases
        </div>
      </div>

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={styles.searchIcon as React.CSSProperties} />
          <input
            type="text"
            placeholder="Search pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div style={styles.categoryChips}>
        <button
          style={{
            ...styles.categoryChip,
            ...(selectedCategory === null ? styles.categoryChipActive : {}),
          }}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            style={{
              ...styles.categoryChip,
              ...(selectedCategory === category ? styles.categoryChipActive : {}),
            }}
            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {filteredPipelines.length > 0 ? (
          <div style={isMobile ? styles.gridMobile : styles.grid}>
            {filteredPipelines.map((pipeline) => (
              <PipelineCard
                key={pipeline.id}
                pipeline={pipeline}
                availableWidgets={availableWidgetIds}
                existingWidgets={existingWidgetDefIds}
                onAddAll={handleAddAll}
                onDockToPanel={handleDockToPanel}
                existingPanels={existingPanels}
                isMobile={isMobile}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <Search size={48} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>No Pipelines Found</div>
            <div style={styles.emptyText}>
              {searchQuery
                ? `No pipelines match "${searchQuery}"`
                : 'No pipelines available in this category'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPipelinesTab;
