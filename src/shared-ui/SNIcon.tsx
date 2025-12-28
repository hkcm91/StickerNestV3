/**
 * StickerNest v2 - SNIcon Component
 * Unified icon component using Lucide React icons
 */

import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ============================================
// Icon Size Types
// ============================================

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
};

// ============================================
// Common Icon Names Map
// ============================================

/**
 * Map common icon names to Lucide icons
 * This allows for easy swapping of icon libraries later
 */
export const iconMap = {
  // Navigation
  home: LucideIcons.Home,
  menu: LucideIcons.Menu,
  close: LucideIcons.X,
  back: LucideIcons.ArrowLeft,
  forward: LucideIcons.ArrowRight,
  up: LucideIcons.ArrowUp,
  down: LucideIcons.ArrowDown,
  arrowLeft: LucideIcons.ArrowLeft,
  arrowRight: LucideIcons.ArrowRight,
  chevronLeft: LucideIcons.ChevronLeft,
  chevronRight: LucideIcons.ChevronRight,
  chevronUp: LucideIcons.ChevronUp,
  chevronDown: LucideIcons.ChevronDown,
  moreHorizontal: LucideIcons.MoreHorizontal,
  moreVertical: LucideIcons.MoreVertical,

  // Actions
  add: LucideIcons.Plus,
  remove: LucideIcons.Minus,
  edit: LucideIcons.Pencil,
  delete: LucideIcons.Trash2,
  save: LucideIcons.Save,
  copy: LucideIcons.Copy,
  paste: LucideIcons.Clipboard,
  cut: LucideIcons.Scissors,
  undo: LucideIcons.Undo2,
  redo: LucideIcons.Redo2,
  refresh: LucideIcons.RefreshCw,
  download: LucideIcons.Download,
  upload: LucideIcons.Upload,
  share: LucideIcons.Share2,
  link: LucideIcons.Link,
  externalLink: LucideIcons.ExternalLink,

  // Canvas & Design
  canvas: LucideIcons.Layout,
  layers: LucideIcons.Layers,
  group: LucideIcons.Group,
  ungroup: LucideIcons.Ungroup,
  lock: LucideIcons.Lock,
  unlock: LucideIcons.Unlock,
  visible: LucideIcons.Eye,
  hidden: LucideIcons.EyeOff,
  grid: LucideIcons.Grid3X3,
  magnet: LucideIcons.Magnet,
  zoomIn: LucideIcons.ZoomIn,
  zoomOut: LucideIcons.ZoomOut,
  fitScreen: LucideIcons.Maximize2,
  move: LucideIcons.Move,
  resize: LucideIcons.Maximize,
  rotate: LucideIcons.RotateCw,
  flip: LucideIcons.FlipHorizontal,
  align: LucideIcons.AlignCenter,
  alignLeft: LucideIcons.AlignLeft,
  alignRight: LucideIcons.AlignRight,
  alignTop: LucideIcons.AlignStartVertical,
  alignBottom: LucideIcons.AlignEndVertical,
  distribute: LucideIcons.AlignHorizontalDistributeCenter,

  // Media
  image: LucideIcons.Image,
  images: LucideIcons.Images,
  video: LucideIcons.Video,
  camera: LucideIcons.Camera,
  music: LucideIcons.Music,
  file: LucideIcons.File,
  folder: LucideIcons.Folder,
  folderOpen: LucideIcons.FolderOpen,

  // Widgets
  widget: LucideIcons.Box,
  sticker: LucideIcons.Sticker,
  text: LucideIcons.Type,
  shapes: LucideIcons.Shapes,
  palette: LucideIcons.Palette,
  brush: LucideIcons.Paintbrush,
  pipette: LucideIcons.Pipette,
  flask: LucideIcons.FlaskConical,
  testTube: LucideIcons.TestTube2,
  library: LucideIcons.Library,

  // UI Elements
  settings: LucideIcons.Settings,
  sliders: LucideIcons.SlidersHorizontal,
  filter: LucideIcons.Filter,
  search: LucideIcons.Search,
  bell: LucideIcons.Bell,
  help: LucideIcons.HelpCircle,
  info: LucideIcons.Info,
  warning: LucideIcons.AlertTriangle,
  error: LucideIcons.AlertCircle,
  success: LucideIcons.CheckCircle,
  check: LucideIcons.Check,
  checkSquare: LucideIcons.CheckSquare,
  square: LucideIcons.Square,
  circle: LucideIcons.Circle,

  // Communication
  user: LucideIcons.User,
  users: LucideIcons.Users,
  userX: LucideIcons.UserX,
  userPlus: LucideIcons.UserPlus,
  userMinus: LucideIcons.UserMinus,
  userCheck: LucideIcons.UserCheck,
  login: LucideIcons.LogIn,
  logout: LucideIcons.LogOut,
  message: LucideIcons.MessageSquare,
  messageCircle: LucideIcons.MessageCircle,
  chat: LucideIcons.MessageCircle,
  mail: LucideIcons.Mail,
  send: LucideIcons.Send,

  // AI & Tech
  ai: LucideIcons.Sparkles,
  robot: LucideIcons.Bot,
  cpu: LucideIcons.Cpu,
  code: LucideIcons.Code,
  terminal: LucideIcons.Terminal,
  bug: LucideIcons.Bug,
  wand: LucideIcons.Wand2,

  // Theme
  sun: LucideIcons.Sun,
  moon: LucideIcons.Moon,
  theme: LucideIcons.Palette,
  rainbow: LucideIcons.Rainbow,

  // Data
  database: LucideIcons.Database,
  cloud: LucideIcons.Cloud,
  cloudUpload: LucideIcons.CloudUpload,
  cloudDownload: LucideIcons.CloudDownload,
  sync: LucideIcons.RefreshCcw,

  // Layout
  sidebar: LucideIcons.PanelLeft,
  sidebarRight: LucideIcons.PanelRight,
  panel: LucideIcons.PanelTop,
  panelBottom: LucideIcons.PanelBottom,
  columns: LucideIcons.Columns,
  rows: LucideIcons.Rows3,
  maximize: LucideIcons.Maximize2,
  minimize: LucideIcons.Minimize2,

  // Status
  loading: LucideIcons.Loader2,
  spinner: LucideIcons.LoaderCircle,
  star: LucideIcons.Star,
  starOutline: LucideIcons.Star, // Same icon, styled differently in use
  heart: LucideIcons.Heart,
  bookmark: LucideIcons.Bookmark,
  pin: LucideIcons.Pin,
  flag: LucideIcons.Flag,

  // Forms & Data
  forms: LucideIcons.ClipboardList,
  analytics: LucideIcons.BarChart3,
  chart: LucideIcons.LineChart,
  pieChart: LucideIcons.PieChart,

  // Commerce
  marketplace: LucideIcons.Store,
  store: LucideIcons.Store,
  shop: LucideIcons.ShoppingBag,
  cart: LucideIcons.ShoppingCart,
  wallet: LucideIcons.Wallet,
  creditCard: LucideIcons.CreditCard,

  // Misc
  play: LucideIcons.Play,
  pause: LucideIcons.Pause,
  stop: LucideIcons.StopCircle,
  power: LucideIcons.Power,
  trash: LucideIcons.Trash2,
  archive: LucideIcons.Archive,
  package: LucideIcons.Package,
  gift: LucideIcons.Gift,
  grip: LucideIcons.GripVertical,
  handle: LucideIcons.GripHorizontal,

  // Tools & Utilities
  wrench: LucideIcons.Wrench,
  tool: LucideIcons.Wrench,
  hammer: LucideIcons.Hammer,
  scissors: LucideIcons.Scissors,

  // Library & Collections (library defined above)
  books: LucideIcons.BookOpen,
  collection: LucideIcons.LayoutGrid,

  // Visibility (aliases)
  eye: LucideIcons.Eye,
  eyeOff: LucideIcons.EyeOff,
  preview: LucideIcons.Eye,

  // World & Network
  globe: LucideIcons.Globe,
  earth: LucideIcons.Globe,
  network: LucideIcons.Network,
  wifi: LucideIcons.Wifi,

  // History & Time
  history: LucideIcons.History,
  clock: LucideIcons.Clock,
  timer: LucideIcons.Timer,
  calendar: LucideIcons.Calendar,

  // Debug & Testing (flask defined above)
  debug: LucideIcons.Bug,
  test: LucideIcons.TestTube,

  // Connectors & Flow
  workflow: LucideIcons.Workflow,
  gitBranch: LucideIcons.GitBranch,
  merge: LucideIcons.GitMerge,
  split: LucideIcons.Split,
  plug: LucideIcons.Plug,
  cable: LucideIcons.Cable,

  // Export & Import
  export: LucideIcons.Download,
  import: LucideIcons.Upload,
  fileExport: LucideIcons.FileOutput,
  fileImport: LucideIcons.FileInput,

  // Queue & List
  queue: LucideIcons.ListOrdered,
  list: LucideIcons.List,
  listChecks: LucideIcons.ListChecks,

  // Scan & Detect
  scan: LucideIcons.Scan,
  radar: LucideIcons.Radar,
  target: LucideIcons.Target,
  crosshair: LucideIcons.Crosshair,

  // Model & AI extras
  brain: LucideIcons.Brain,
  lightbulb: LucideIcons.Lightbulb,
  zap: LucideIcons.Zap,

  // Floating & Position
  floating: LucideIcons.Square,
  dock: LucideIcons.PanelBottom,
  undock: LucideIcons.ExternalLink,
  popout: LucideIcons.Expand,

  // Additional icons needed for various components
  plus: LucideIcons.Plus,
  minus: LucideIcons.Minus,
  x: LucideIcons.X,
  crop: LucideIcons.Crop,
  rotateCcw: LucideIcons.RotateCcw,
  rotateCw: LucideIcons.RotateCw,
  flipHorizontal: LucideIcons.FlipHorizontal,
  flipVertical: LucideIcons.FlipVertical,
  alignMiddle: LucideIcons.AlignCenterVertical,
  layerUp: LucideIcons.ArrowUpToLine,
  layerDown: LucideIcons.ArrowDownToLine,
  fit: LucideIcons.Maximize2,
  layout: LucideIcons.LayoutGrid,
  shield: LucideIcons.Shield,
  shieldCheck: LucideIcons.ShieldCheck,
  percent: LucideIcons.Percent,
  bot: LucideIcons.Bot,
  alertTriangle: LucideIcons.AlertTriangle,
  calculator: LucideIcons.Calculator,
  drag: LucideIcons.GripVertical,
  bellOff: LucideIcons.BellOff,
  atSign: LucideIcons.AtSign,

  // Social Media
  twitter: LucideIcons.Twitter,
  github: LucideIcons.Github,
  instagram: LucideIcons.Instagram,
  linkedin: LucideIcons.Linkedin,
  youtube: LucideIcons.Youtube,
  facebook: LucideIcons.Facebook,

  // Profile & User Actions
  badgeCheck: LucideIcons.BadgeCheck,
  sparkles: LucideIcons.Sparkles,
  verified: LucideIcons.BadgeCheck,

  // Location & Links
  mapPin: LucideIcons.MapPin,
  location: LucideIcons.MapPin,

  // Other
  qrCode: LucideIcons.QrCode,
  heartFilled: LucideIcons.Heart,
  alertCircle: LucideIcons.AlertCircle,
  checkCircle: LucideIcons.CheckCircle,

  // Categories & Work
  briefcase: LucideIcons.Briefcase,
  compass: LucideIcons.Compass,
  film: LucideIcons.Film,
} as const;

export type IconName = keyof typeof iconMap;

// ============================================
// SNIcon Props
// ============================================

export interface SNIconProps extends Omit<LucideProps, 'size' | 'ref'> {
  /** Icon name from the icon map */
  name?: IconName;
  /** Direct Lucide icon component */
  icon?: LucideIcon;
  /** Icon size */
  size?: IconSize | number;
  /** Custom className */
  className?: string;
  /** Spin animation for loading icons */
  spin?: boolean;
  /** Pulse animation */
  pulse?: boolean;
  /** Whether to apply rainbow gradient */
  rainbow?: boolean;
}

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  spin: {
    animation: 'sn-spin 1s linear infinite',
  },
  pulse: {
    animation: 'sn-pulse 2s ease-in-out infinite',
  },
};

// Inject keyframes if not already present
if (typeof document !== 'undefined') {
  const styleId = 'sn-icon-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes sn-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes sn-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .sn-icon-rainbow {
        background: var(--sn-rainbow-gradient);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    `;
    document.head.appendChild(style);
  }
}

// ============================================
// Component
// ============================================

export const SNIcon = React.forwardRef<SVGSVGElement, SNIconProps>(
  ({ name, icon, size = 'md', className = '', spin, pulse, rainbow, style, ...props }, ref) => {
    // Get the icon component
    const IconComponent = icon || (name ? iconMap[name] : null);

    if (!IconComponent) {
      console.warn(`[SNIcon] Icon "${name}" not found`);
      return null;
    }

    // Calculate pixel size
    const pixelSize = typeof size === 'number' ? size : sizeMap[size];

    // Build style object
    const iconStyle: React.CSSProperties = {
      ...styles.icon,
      ...(spin ? styles.spin : {}),
      ...(pulse ? styles.pulse : {}),
      ...style,
    };

    // Build className
    const iconClassName = [
      'sn-icon',
      rainbow ? 'sn-icon-rainbow' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <IconComponent
        ref={ref}
        size={pixelSize}
        className={iconClassName}
        style={iconStyle}
        {...props}
      />
    );
  }
);

SNIcon.displayName = 'SNIcon';

// ============================================
// Utility: Get Icon by Name
// ============================================

export function getIconByName(name: IconName): LucideIcon {
  return iconMap[name];
}

// ============================================
// Utility: Check if Icon Exists
// ============================================

export function hasIcon(name: string): name is IconName {
  return name in iconMap;
}

export default SNIcon;
