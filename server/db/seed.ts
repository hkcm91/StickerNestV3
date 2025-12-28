import { PrismaClient, MarketplaceItemType, CanvasVisibility } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// Multi-User Test Data
// ============================================

const TEST_USERS = [
  {
    id: 'user_alice_001',
    username: 'alice',
    email: 'alice@test.dev',
    displayName: 'Alice Designer',
  },
  {
    id: 'user_bob_002',
    username: 'bob',
    email: 'bob@test.dev',
    displayName: 'Bob Creative',
  },
  {
    id: 'user_charlie_003',
    username: 'charlie',
    email: 'charlie@test.dev',
    displayName: 'Charlie Artist',
  },
  {
    id: 'user_diana_004',
    username: 'diana',
    email: 'diana@test.dev',
    displayName: 'Diana Developer',
  },
];

// Google OAuth users for real testing
const GOOGLE_USERS = [
  {
    id: 'user_kimber_goog_001',
    username: 'kimbermaddox',
    email: 'kimbermaddox@gmail.com',
    displayName: 'Kimber Maddox',
    isOAuth: true,
  },
  {
    id: 'user_nymfarious_goog_002',
    username: 'nymfarious',
    email: 'nymfarious@gmail.com',
    displayName: 'Nymfarious',
    isOAuth: true,
  },
  {
    id: 'user_woahitskimber_goog_003',
    username: 'woahitskimber',
    email: 'woahitskimber@gmail.com',
    displayName: 'Woah Its Kimber',
    isOAuth: true,
  },
];

// Canvases for Google OAuth users
const GOOGLE_USER_CANVASES = [
  // kimbermaddox@gmail.com canvases
  {
    id: 'canvas_kimber_001',
    userId: 'user_kimber_goog_001',
    name: 'Main Workspace',
    description: 'Primary creative workspace',
    visibility: 'public' as CanvasVisibility,
    slug: 'kimber-workspace',
    width: 2560,
    height: 1440,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#1a1a2e' },
          { offset: 1, color: '#16213e' },
        ],
      },
    },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 20 },
  },
  {
    id: 'canvas_kimber_002',
    userId: 'user_kimber_goog_001',
    name: 'Widget Sandbox',
    description: 'Testing new widgets and features',
    visibility: 'public' as CanvasVisibility,
    slug: 'kimber-sandbox',
    width: 1920,
    height: 1080,
    backgroundConfig: { type: 'solid', color: '#0f0f23' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 16 },
  },
  {
    id: 'canvas_kimber_003',
    userId: 'user_kimber_goog_001',
    name: 'Private Notes',
    description: 'Personal notes and ideas',
    visibility: 'private' as CanvasVisibility,
    slug: null,
    width: 1600,
    height: 900,
    backgroundConfig: { type: 'solid', color: '#1e1e2e' },
    settings: { gridEnabled: false, snapToGrid: false },
  },

  // nymfarious@gmail.com canvases
  {
    id: 'canvas_nym_001',
    userId: 'user_nymfarious_goog_002',
    name: 'Art Portfolio',
    description: 'Digital art showcase',
    visibility: 'public' as CanvasVisibility,
    slug: 'nym-portfolio',
    width: 3200,
    height: 2400,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'radial',
        stops: [
          { offset: 0, color: '#2d1b69' },
          { offset: 1, color: '#11001c' },
        ],
      },
    },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_nym_002',
    userId: 'user_nymfarious_goog_002',
    name: 'Streaming Dashboard',
    description: 'Stream overlays and widgets',
    visibility: 'public' as CanvasVisibility,
    slug: 'nym-stream',
    width: 1920,
    height: 1080,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { offset: 0, color: '#7f00ff' },
          { offset: 1, color: '#e100ff' },
        ],
      },
    },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 32 },
  },
  {
    id: 'canvas_nym_003',
    userId: 'user_nymfarious_goog_002',
    name: 'Collaboration Board',
    description: 'Shared workspace - unlisted',
    visibility: 'unlisted' as CanvasVisibility,
    slug: 'nym-collab',
    width: 2400,
    height: 1600,
    backgroundConfig: { type: 'solid', color: '#1a1a2e' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 24 },
  },

  // woahitskimber@gmail.com canvases
  {
    id: 'canvas_woah_001',
    userId: 'user_woahitskimber_goog_003',
    name: 'Creative Studio',
    description: 'Main creative space',
    visibility: 'public' as CanvasVisibility,
    slug: 'woah-studio',
    width: 2560,
    height: 1600,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#ff6b6b' },
          { offset: 0.5, color: '#feca57' },
          { offset: 1, color: '#48dbfb' },
        ],
      },
    },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_woah_002',
    userId: 'user_woahitskimber_goog_003',
    name: 'Mood Boards Collection',
    description: 'Aesthetic mood boards',
    visibility: 'public' as CanvasVisibility,
    slug: 'woah-moods',
    width: 2000,
    height: 1500,
    backgroundConfig: { type: 'solid', color: '#ffeaa7' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 20 },
  },
  {
    id: 'canvas_woah_003',
    userId: 'user_woahitskimber_goog_003',
    name: 'Project Drafts',
    description: 'Work in progress',
    visibility: 'private' as CanvasVisibility,
    slug: null,
    width: 1920,
    height: 1080,
    backgroundConfig: { type: 'solid', color: '#2d3436' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 16 },
  },
];

// Widgets for Google user canvases
const GOOGLE_USER_WIDGETS = [
  // Kimber's Main Workspace
  {
    id: 'widget_kimber_001_01',
    canvasId: 'canvas_kimber_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 100,
    positionY: 80,
    width: 400,
    height: 80,
    zIndex: 1,
    state: { content: '# Welcome to My Workspace', fontSize: 28 },
    metadata: { title: 'Welcome Header' },
  },
  {
    id: 'widget_kimber_001_02',
    canvasId: 'canvas_kimber_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 550,
    positionY: 100,
    width: 280,
    height: 200,
    zIndex: 2,
    state: { content: 'Quick Notes:\n- Review slideout feature\n- Test iframe proxy\n- Check canvas embedding', backgroundColor: '#74b9ff' },
    metadata: { title: 'Quick Notes' },
  },

  // Nymfarious's Art Portfolio
  {
    id: 'widget_nym_001_01',
    canvasId: 'canvas_nym_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 150,
    positionY: 100,
    width: 500,
    height: 100,
    zIndex: 1,
    state: { content: '# Digital Art Gallery\n*Nymfarious Collection*', fontSize: 36 },
    metadata: { title: 'Gallery Title' },
  },
  {
    id: 'widget_nym_001_02',
    canvasId: 'canvas_nym_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 150,
    positionY: 250,
    width: 300,
    height: 180,
    zIndex: 2,
    state: { content: 'Featured Works:\n- Abstract Series\n- Character Art\n- Landscapes', backgroundColor: '#a29bfe' },
    metadata: { title: 'Featured' },
  },

  // Woah's Creative Studio
  {
    id: 'widget_woah_001_01',
    canvasId: 'canvas_woah_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 100,
    positionY: 80,
    width: 450,
    height: 90,
    zIndex: 1,
    state: { content: '# Creative Studio\n✨ Where ideas come to life', fontSize: 32 },
    metadata: { title: 'Studio Header' },
  },
  {
    id: 'widget_woah_001_02',
    canvasId: 'canvas_woah_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 600,
    positionY: 100,
    width: 260,
    height: 180,
    zIndex: 2,
    state: { content: 'Today\'s Goals:\n- Finish design\n- Update portfolio\n- Stream prep', backgroundColor: '#fd79a8' },
    metadata: { title: 'Goals' },
  },
];

const TEST_CANVASES = [
  // Alice's canvases
  {
    id: 'canvas_alice_001',
    userId: 'user_alice_001',
    name: 'Mood Board - Spring 2025',
    description: 'A colorful mood board for spring design inspiration',
    visibility: 'public' as CanvasVisibility,
    slug: 'alice-spring-mood',
    width: 2400,
    height: 1600,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#ffecd2' },
          { offset: 1, color: '#fcb69f' },
        ],
      },
    },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_alice_002',
    userId: 'user_alice_001',
    name: 'Project Planning Board',
    description: 'Private project planning workspace',
    visibility: 'private' as CanvasVisibility,
    slug: null,
    width: 1920,
    height: 1080,
    backgroundConfig: { type: 'solid', color: '#1e1e2e' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 20 },
  },
  {
    id: 'canvas_alice_003',
    userId: 'user_alice_001',
    name: 'UI Components Library',
    description: 'Shared UI component showcase - password protected',
    visibility: 'unlisted' as CanvasVisibility,
    slug: 'alice-ui-components',
    hasPassword: true,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGL', // "demo123"
    width: 3000,
    height: 2000,
    backgroundConfig: { type: 'solid', color: '#0f0f1a' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 16 },
  },

  // Bob's canvases
  {
    id: 'canvas_bob_001',
    userId: 'user_bob_002',
    name: 'Game Asset Collection',
    description: 'Pixel art and game assets showcase',
    visibility: 'public' as CanvasVisibility,
    slug: 'bob-game-assets',
    width: 1920,
    height: 1080,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 180,
        stops: [
          { offset: 0, color: '#0f0c29' },
          { offset: 0.5, color: '#302b63' },
          { offset: 1, color: '#24243e' },
        ],
      },
    },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 32 },
  },
  {
    id: 'canvas_bob_002',
    userId: 'user_bob_002',
    name: 'Character Designs',
    description: 'Work in progress character concepts',
    visibility: 'public' as CanvasVisibility,
    slug: 'bob-characters',
    width: 2560,
    height: 1440,
    backgroundConfig: { type: 'solid', color: '#2d3436' },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_bob_003',
    userId: 'user_bob_002',
    name: 'Client Project - Confidential',
    description: 'Private client work',
    visibility: 'private' as CanvasVisibility,
    slug: null,
    width: 1920,
    height: 1080,
    backgroundConfig: { type: 'solid', color: '#1a1a2e' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 20 },
  },

  // Charlie's canvases
  {
    id: 'canvas_charlie_001',
    userId: 'user_charlie_003',
    name: 'Abstract Art Gallery',
    description: 'Experimental digital art pieces',
    visibility: 'public' as CanvasVisibility,
    slug: 'charlie-abstract',
    width: 3840,
    height: 2160,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'radial',
        stops: [
          { offset: 0, color: '#667eea' },
          { offset: 1, color: '#764ba2' },
        ],
      },
    },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_charlie_002',
    userId: 'user_charlie_003',
    name: 'Daily Sketches',
    description: 'Quick daily drawing practice',
    visibility: 'public' as CanvasVisibility,
    slug: 'charlie-daily',
    width: 1600,
    height: 900,
    backgroundConfig: { type: 'solid', color: '#f5f5f5' },
    settings: { gridEnabled: false, snapToGrid: false },
  },
  {
    id: 'canvas_charlie_003',
    userId: 'user_charlie_003',
    name: 'Commission Examples',
    description: 'Portfolio of commission work - password required',
    visibility: 'unlisted' as CanvasVisibility,
    slug: 'charlie-commissions',
    hasPassword: true,
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGL', // "demo123"
    width: 2000,
    height: 1500,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#11998e' },
          { offset: 1, color: '#38ef7d' },
        ],
      },
    },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 24 },
  },

  // Diana's canvases
  {
    id: 'canvas_diana_001',
    userId: 'user_diana_004',
    name: 'Code Snippets Dashboard',
    description: 'Useful code snippets and references',
    visibility: 'public' as CanvasVisibility,
    slug: 'diana-code-snippets',
    width: 2560,
    height: 1600,
    backgroundConfig: { type: 'solid', color: '#0d1117' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 16 },
  },
  {
    id: 'canvas_diana_002',
    userId: 'user_diana_004',
    name: 'Architecture Diagrams',
    description: 'System architecture and flow diagrams',
    visibility: 'public' as CanvasVisibility,
    slug: 'diana-architecture',
    width: 3200,
    height: 2400,
    backgroundConfig: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 135,
        stops: [
          { offset: 0, color: '#141e30' },
          { offset: 1, color: '#243b55' },
        ],
      },
    },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 40 },
  },
  {
    id: 'canvas_diana_003',
    userId: 'user_diana_004',
    name: 'API Documentation',
    description: 'Interactive API documentation board',
    visibility: 'unlisted' as CanvasVisibility,
    slug: 'diana-api-docs',
    width: 2400,
    height: 1800,
    backgroundConfig: { type: 'solid', color: '#1a1b26' },
    settings: { gridEnabled: true, snapToGrid: true, gridSize: 20 },
  },
];

// Sample widgets for test canvases
const TEST_WIDGETS = [
  // Alice's Spring Mood Board widgets
  {
    id: 'widget_alice_001_01',
    canvasId: 'canvas_alice_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 100,
    positionY: 80,
    width: 350,
    height: 80,
    zIndex: 1,
    state: { content: '# Spring 2025 Inspiration', fontSize: 24 },
    metadata: { title: 'Header' },
  },
  {
    id: 'widget_alice_001_02',
    canvasId: 'canvas_alice_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 500,
    positionY: 150,
    width: 250,
    height: 180,
    zIndex: 2,
    state: { content: 'Pastel colors\nFloral patterns\nSoft textures', backgroundColor: '#a8e6cf' },
    metadata: { title: 'Color Notes' },
  },
  {
    id: 'widget_alice_001_03',
    canvasId: 'canvas_alice_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 800,
    positionY: 200,
    width: 220,
    height: 160,
    zIndex: 3,
    state: { content: 'Fresh starts\nNew beginnings\nGrowth themes', backgroundColor: '#ffd3a5' },
    metadata: { title: 'Theme Ideas' },
  },

  // Bob's Game Assets widgets
  {
    id: 'widget_bob_001_01',
    canvasId: 'canvas_bob_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 50,
    positionY: 50,
    width: 400,
    height: 60,
    zIndex: 1,
    state: { content: '# Pixel Art Assets', fontSize: 28, color: '#ffffff' },
    metadata: { title: 'Title' },
  },
  {
    id: 'widget_bob_001_02',
    canvasId: 'canvas_bob_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 100,
    positionY: 150,
    width: 200,
    height: 200,
    zIndex: 2,
    state: { content: '16x16 Characters\n32x32 Props\n64x64 Tiles', backgroundColor: '#6c5ce7' },
    metadata: { title: 'Asset Sizes' },
  },

  // Charlie's Abstract Art widgets
  {
    id: 'widget_charlie_001_01',
    canvasId: 'canvas_charlie_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 200,
    positionY: 100,
    width: 500,
    height: 100,
    zIndex: 1,
    state: { content: '# Abstract Explorations\n*Digital Art Series*', fontSize: 32 },
    metadata: { title: 'Gallery Title' },
  },

  // Diana's Code Snippets widgets
  {
    id: 'widget_diana_001_01',
    canvasId: 'canvas_diana_001',
    widgetDefId: 'core/text',
    version: '1.0.0',
    positionX: 40,
    positionY: 40,
    width: 300,
    height: 50,
    zIndex: 1,
    state: { content: '# Code Snippets', fontSize: 24, color: '#58a6ff' },
    metadata: { title: 'Header' },
  },
  {
    id: 'widget_diana_001_02',
    canvasId: 'canvas_diana_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 40,
    positionY: 120,
    width: 400,
    height: 250,
    zIndex: 2,
    state: {
      content: '```typescript\nfunction debounce<T extends (...args: any[]) => any>(\n  fn: T,\n  delay: number\n): (...args: Parameters<T>) => void {\n  let timeoutId: ReturnType<typeof setTimeout>;\n  return (...args) => {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => fn(...args), delay);\n  };\n}\n```',
      backgroundColor: '#161b22',
    },
    metadata: { title: 'Debounce Function' },
  },
  {
    id: 'widget_diana_001_03',
    canvasId: 'canvas_diana_001',
    widgetDefId: 'core/note',
    version: '1.0.0',
    positionX: 480,
    positionY: 120,
    width: 400,
    height: 200,
    zIndex: 3,
    state: {
      content: '```typescript\nconst useLocalStorage = <T>(key: string, initial: T) => {\n  const [value, setValue] = useState<T>(() => {\n    const stored = localStorage.getItem(key);\n    return stored ? JSON.parse(stored) : initial;\n  });\n  // ...\n};\n```',
      backgroundColor: '#161b22',
    },
    metadata: { title: 'useLocalStorage Hook' },
  },
];

// Built-in widgets to seed into marketplace
const BUILTIN_MARKETPLACE_WIDGETS = [
  {
    id: 'mkt_timer_widget_001',
    widgetId: 'stickernest.timer',
    name: 'Timer Widget',
    slug: 'timer-widget',
    description: 'A beautiful countdown/stopwatch timer with circular progress display, start/pause/reset controls, and customizable duration. Perfect for pomodoro sessions, cooking timers, or any timed activity.',
    shortDescription: 'Countdown & stopwatch timer with visual progress',
    category: 'productivity',
    tags: ['timer', 'countdown', 'stopwatch', 'productivity', 'time', 'pomodoro'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.timer',
      name: 'Timer',
      version: '1.0.0',
      kind: 'interactive',
      entry: 'index.html',
      description: 'A countdown/stopwatch timer with controls',
      author: 'StickerNest',
      tags: ['timer', 'countdown', 'stopwatch', 'time', 'interactive', 'core'],
    },
  },
  {
    id: 'mkt_notes_widget_001',
    widgetId: 'stickernest.notes',
    name: 'Notes Widget',
    slug: 'notes-widget',
    description: 'A classic sticky note widget with rich text editing and auto-save. Features a warm yellow background, editable title, and supports formatted text. Perfect for quick notes, reminders, or ideas.',
    shortDescription: 'Editable sticky notes with auto-save',
    category: 'productivity',
    tags: ['notes', 'sticky', 'text', 'editor', 'reminders', 'productivity'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.notes',
      name: 'Notes',
      version: '1.0.0',
      kind: 'interactive',
      entry: 'index.html',
      description: 'An editable notes widget with rich text support',
      author: 'StickerNest',
      tags: ['notes', 'text', 'editor', 'interactive', 'core'],
    },
  },
  {
    id: 'mkt_todolist_widget_001',
    widgetId: 'stickernest.todo-list',
    name: 'Todo List Widget',
    slug: 'todo-list-widget',
    description: 'A beautiful gradient-styled task list with add, complete, and remove functionality. Features task counters, clear completed option, and smooth animations. Great for daily task management and productivity tracking.',
    shortDescription: 'Task management with add, complete & remove',
    category: 'productivity',
    tags: ['todo', 'tasks', 'list', 'productivity', 'checklist', 'organization'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.todo-list',
      name: 'Todo List',
      version: '1.0.0',
      kind: 'interactive',
      entry: 'index.html',
      description: 'A task list widget with add, complete, and remove functionality',
      author: 'StickerNest',
      tags: ['todo', 'list', 'tasks', 'productivity', 'interactive', 'core'],
    },
  },
  {
    id: 'mkt_lottie_widget_001',
    widgetId: 'stickernest.lottie-player',
    name: 'Lottie Animation Player',
    slug: 'lottie-player-widget',
    description: 'Display beautiful Lottie animations on your canvas. Supports playback controls, looping, and speed adjustment. Perfect for adding dynamic animated content to your designs.',
    shortDescription: 'Animated Lottie player with controls',
    category: 'media',
    tags: ['lottie', 'animation', 'player', 'media', 'motion', 'graphics'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.lottie-player',
      name: 'Lottie Player',
      version: '1.0.0',
      kind: '2d',
      entry: 'index.html',
      description: 'A Lottie animation player widget',
      author: 'StickerNest',
      tags: ['lottie', 'animation', 'player', 'media', 'core'],
    },
  },
  {
    id: 'mkt_image_widget_001',
    widgetId: 'stickernest.image-sticker',
    name: 'Image Sticker',
    slug: 'image-sticker-widget',
    description: 'Display images and stickers on your canvas with support for drag, resize, and rotation. Accepts various image formats including PNG, JPEG, WebP, and SVG.',
    shortDescription: 'Display images with drag, resize & rotate',
    category: 'media',
    tags: ['image', 'sticker', 'photo', 'media', 'visual'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.image-sticker',
      name: 'Image Sticker',
      version: '1.0.0',
      kind: '2d',
      entry: 'index.html',
      description: 'An image sticker widget',
      author: 'StickerNest',
      tags: ['image', 'sticker', 'photo', 'media', 'core'],
    },
  },
  {
    id: 'mkt_text_widget_001',
    widgetId: 'stickernest.basic-text',
    name: 'Basic Text Widget',
    slug: 'basic-text-widget',
    description: 'A simple text display widget for showing formatted text content. Supports basic styling and is perfect for labels, headings, and static text content.',
    shortDescription: 'Simple text display for labels & headings',
    category: 'utility',
    tags: ['text', 'label', 'display', 'basic', 'typography'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.basic-text',
      name: 'Basic Text',
      version: '1.0.0',
      kind: '2d',
      entry: 'index.html',
      description: 'A basic text display widget',
      author: 'StickerNest',
      tags: ['text', 'label', 'display', 'basic', 'core'],
    },
  },
  {
    id: 'mkt_data_widget_001',
    widgetId: 'stickernest.data-display',
    name: 'Data Display Widget',
    slug: 'data-display-widget',
    description: 'Display dynamic data in a formatted view. Perfect for showing metrics, statistics, or any structured data that updates in real-time.',
    shortDescription: 'Show dynamic data & metrics',
    category: 'data',
    tags: ['data', 'display', 'metrics', 'statistics', 'dashboard'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.data-display',
      name: 'Data Display',
      version: '1.0.0',
      kind: 'interactive',
      entry: 'index.html',
      description: 'A data display widget for showing dynamic content',
      author: 'StickerNest',
      tags: ['data', 'display', 'metrics', 'dashboard', 'core'],
    },
  },
  {
    id: 'mkt_container_widget_001',
    widgetId: 'stickernest.container',
    name: 'Container Widget',
    slug: 'container-widget',
    description: 'A flexible container widget for grouping and organizing other widgets. Supports nesting and provides a clean layout for widget collections.',
    shortDescription: 'Group and organize other widgets',
    category: 'layout',
    tags: ['container', 'layout', 'group', 'organize', 'structure'],
    version: '1.0.0',
    manifest: {
      id: 'stickernest.container',
      name: 'Container',
      version: '1.0.0',
      kind: '2d',
      entry: 'index.html',
      description: 'A container widget for grouping widgets',
      author: 'StickerNest',
      tags: ['container', 'layout', 'group', 'organize', 'core'],
    },
  },
];

/**
 * Seed data for development
 */
async function main() {
  console.log('Starting database seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo123!', 12);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@stickernest.dev' },
    update: {},
    create: {
      id: 'user_demo_000000001',
      username: 'demo',
      email: 'demo@stickernest.dev',
      password: hashedPassword,
    },
  });

  console.log(`Created demo user: ${demoUser.email}`);

  // ============================================
  // Alpha Test Users
  // ============================================
  const alphaUsers = [
    {
      id: 'user_alpha_kimber_001',
      username: 'kimber',
      email: 'kimbermaddox@gmail.com',
      password: hashedPassword, // Same as demo: Demo123!
    },
    {
      id: 'user_alpha_woahitskimber_002',
      username: 'woahitskimber',
      email: 'woahitskimber@gmail.com',
      password: hashedPassword,
    },
    {
      id: 'user_alpha_nymfarious_003',
      username: 'nymfarious',
      email: 'nymfarious@gmail.com',
      password: hashedPassword,
    },
    {
      id: 'user_alpha_tester_004',
      username: 'alpha-tester-4',
      email: 'alpha4@stickernest.dev',
      password: hashedPassword,
    },
  ];

  const createdAlphaUsers: Array<{ id: string; username: string; email: string }> = [];
  for (const alphaUser of alphaUsers) {
    const user = await prisma.user.upsert({
      where: { email: alphaUser.email },
      update: {},
      create: alphaUser,
    });
    createdAlphaUsers.push(user);
    console.log(`Created alpha user: ${user.email}`);
  }

  // Create official StickerNest user for marketplace items
  const officialUser = await prisma.user.upsert({
    where: { email: 'official@stickernest.dev' },
    update: {},
    create: {
      id: 'user_official_stickernest',
      username: 'StickerNest',
      email: 'official@stickernest.dev',
      password: null, // No login for official account
    },
  });

  console.log(`Created official user: ${officialUser.username}`);

  // Create sample canvas
  const demoCanvas = await prisma.canvas.upsert({
    where: { id: 'canvas_demo_000001' },
    update: {},
    create: {
      id: 'canvas_demo_000001',
      userId: demoUser.id,
      name: 'Welcome to StickerNest',
      description: 'A demo canvas showing off StickerNest features',
      visibility: 'public',
      slug: 'welcome-demo',
      width: 1920,
      height: 1080,
      backgroundConfig: {
        type: 'solid',
        color: '#1a1a2e',
      },
      settings: {
        gridEnabled: true,
        snapToGrid: true,
        gridSize: 20,
      },
    },
  });

  console.log(`Created demo canvas: ${demoCanvas.name}`);

  // ============================================
  // Alpha User Test Canvases
  // ============================================
  // Map emails to actual user IDs (handles existing OAuth users)
  const alphaUserMap = new Map(createdAlphaUsers.map(u => [u.email, u.id]));

  const alphaCanvasConfigs = [
    {
      id: 'canvas_alpha_kimber_001',
      userEmail: 'kimbermaddox@gmail.com',
      name: "Kimber's Test Canvas",
      description: 'Alpha testing canvas for multi-user widget testing',
      visibility: 'public',
      slug: 'kimber-alpha-test',
      backgroundColor: '#1e3a5f',
    },
    {
      id: 'canvas_alpha_woahitskimber_001',
      userEmail: 'woahitskimber@gmail.com',
      name: "WoahItsKimber's Canvas",
      description: 'Alpha testing canvas for woahitskimber',
      visibility: 'public',
      slug: 'woahitskimber-test',
      backgroundColor: '#2d4a3e',
    },
    {
      id: 'canvas_alpha_nymfarious_001',
      userEmail: 'nymfarious@gmail.com',
      name: "Nymfarious's Canvas",
      description: 'Alpha testing canvas for nymfarious',
      visibility: 'public',
      slug: 'nymfarious-test',
      backgroundColor: '#4a2d4a',
    },
    {
      id: 'canvas_alpha_tester4_001',
      userEmail: 'alpha4@stickernest.dev',
      name: 'Alpha Tester 4 Canvas',
      description: 'Testing canvas for alpha user 4',
      visibility: 'unlisted',
      slug: 'alpha4-test',
      backgroundColor: '#2d3436',
    },
  ];

  for (const canvasConfig of alphaCanvasConfigs) {
    const userId = alphaUserMap.get(canvasConfig.userEmail);
    if (!userId) {
      console.warn(`Skipping canvas for ${canvasConfig.userEmail} - user not found`);
      continue;
    }

    const alphaCanvas = await prisma.canvas.upsert({
      where: { id: canvasConfig.id },
      update: {},
      create: {
        id: canvasConfig.id,
        userId: userId,
        name: canvasConfig.name,
        description: canvasConfig.description,
        visibility: canvasConfig.visibility,
        slug: canvasConfig.slug,
        width: 1920,
        height: 1080,
        backgroundConfig: {
          type: 'solid',
          color: canvasConfig.backgroundColor,
        },
        settings: {
          gridEnabled: true,
          snapToGrid: true,
          gridSize: 20,
        },
      },
    });

    // Add test widgets to each alpha canvas
    const alphaWidgets = [
      {
        id: `widget_${canvasConfig.id}_text`,
        canvasId: alphaCanvas.id,
        widgetDefId: 'stickernest.basic-text',
        version: '1.0.0',
        positionX: 100,
        positionY: 80,
        width: 500,
        height: 80,
        zIndex: 1,
        state: {
          text: `Welcome to ${canvasConfig.name}`,
          fontSize: 28,
          fontFamily: 'system-ui',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#e2e8f0',
        },
        metadata: { title: 'Welcome Text' },
      },
      {
        id: `widget_${canvasConfig.id}_clock`,
        canvasId: alphaCanvas.id,
        widgetDefId: 'stickernest.clock',
        version: '1.0.0',
        positionX: 700,
        positionY: 80,
        width: 200,
        height: 120,
        zIndex: 2,
        state: { format: '12h', showSeconds: true, showDate: true },
        metadata: { title: 'Clock' },
      },
      {
        id: `widget_${canvasConfig.id}_todo`,
        canvasId: alphaCanvas.id,
        widgetDefId: 'stickernest.todo-list',
        version: '1.0.0',
        positionX: 100,
        positionY: 200,
        width: 350,
        height: 300,
        zIndex: 3,
        state: {
          title: 'Alpha Test Tasks',
          items: [
            { id: '1', text: 'Test widget rendering', completed: false },
            { id: '2', text: 'Test cross-user canvas access', completed: false },
            { id: '3', text: 'Verify widget state persistence', completed: false },
          ],
        },
        metadata: { title: 'Test Tasks' },
      },
      {
        id: `widget_${canvasConfig.id}_counter`,
        canvasId: alphaCanvas.id,
        widgetDefId: 'stickernest.counter',
        version: '1.0.0',
        positionX: 500,
        positionY: 220,
        width: 280,
        height: 180,
        zIndex: 4,
        state: { count: 0, label: 'Test Counter', step: 1 },
        metadata: { title: 'Counter' },
      },
      {
        id: `widget_${canvasConfig.id}_timer`,
        canvasId: alphaCanvas.id,
        widgetDefId: 'stickernest.timer',
        version: '1.0.0',
        positionX: 500,
        positionY: 420,
        width: 280,
        height: 180,
        zIndex: 5,
        state: { duration: 300, isRunning: false, showControls: true },
        metadata: { title: 'Timer' },
      },
    ];

    for (const widget of alphaWidgets) {
      await prisma.widgetInstance.upsert({
        where: { id: widget.id },
        update: {},
        create: widget,
      });
    }

    console.log(`Created alpha canvas: ${alphaCanvas.name} with ${alphaWidgets.length} widgets`);
  }

  // Create sample widgets on the canvas
  const widgets = [
    {
      id: 'widget_demo_000001',
      canvasId: demoCanvas.id,
      widgetDefId: 'core/text',
      version: '1.0.0',
      positionX: 100,
      positionY: 100,
      width: 400,
      height: 150,
      zIndex: 1,
      state: {
        content: '# Welcome to StickerNest!\n\nThis is a demo canvas showing off the platform.',
        fontSize: 16,
      },
      metadata: {
        title: 'Welcome Text',
      },
    },
    {
      id: 'widget_demo_000002',
      canvasId: demoCanvas.id,
      widgetDefId: 'core/note',
      version: '1.0.0',
      positionX: 550,
      positionY: 100,
      width: 300,
      height: 200,
      zIndex: 2,
      state: {
        content: 'Try dragging and resizing widgets!',
        backgroundColor: '#ffeaa7',
      },
      metadata: {
        title: 'Sticky Note',
      },
    },
  ];

  for (const widget of widgets) {
    await prisma.widgetInstance.upsert({
      where: { id: widget.id },
      update: {},
      create: widget,
    });
    console.log(`Created widget: ${widget.metadata.title}`);
  }

  // Create sample official widget package (legacy)
  const officialPackage = await prisma.widgetPackage.upsert({
    where: { packageId: 'core/text' },
    update: {},
    create: {
      id: 'pkg_core_text_0001',
      authorId: demoUser.id,
      packageId: 'core/text',
      name: 'Text Widget',
      description: 'A rich text widget with markdown support',
      category: 'productivity',
      tags: ['text', 'markdown', 'core'],
      isPublished: true,
      isOfficial: true,
    },
  });

  // Create version for the package
  await prisma.widgetPackageVersion.upsert({
    where: {
      packageId_version: {
        packageId: officialPackage.id,
        version: '1.0.0',
      },
    },
    update: {},
    create: {
      id: 'ver_core_text_100',
      packageId: officialPackage.id,
      version: '1.0.0',
      manifest: {
        id: 'core/text',
        name: 'Text Widget',
        version: '1.0.0',
        description: 'A rich text widget with markdown support',
        author: 'StickerNest',
        protocol: 3,
        sizePresets: ['sm', 'md', 'lg'],
        defaultSize: 'md',
        permissions: [],
      },
      bundlePath: 'system/core/text/1.0.0/',
      bundleSize: 15000,
      isLatest: true,
    },
  });

  console.log(`Created official widget package: ${officialPackage.name}`);

  // ============================================
  // Seed Multi-User Test Data
  // ============================================
  console.log('\nSeeding multi-user test data...');

  // Create test users
  for (const user of TEST_USERS) {
    const testUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        password: hashedPassword, // Same password as demo: Demo123!
        displayName: user.displayName,
      },
    });
    console.log(`  ✓ Created test user: ${testUser.username} (${testUser.email})`);
  }

  // Create test canvases
  for (const canvas of TEST_CANVASES) {
    const testCanvas = await prisma.canvas.upsert({
      where: { id: canvas.id },
      update: {},
      create: {
        id: canvas.id,
        userId: canvas.userId,
        name: canvas.name,
        description: canvas.description,
        visibility: canvas.visibility,
        slug: canvas.slug,
        width: canvas.width,
        height: canvas.height,
        hasPassword: canvas.hasPassword || false,
        passwordHash: canvas.passwordHash || null,
        backgroundConfig: canvas.backgroundConfig,
        settings: canvas.settings,
      },
    });
    console.log(`  ✓ Created canvas: "${testCanvas.name}" (${testCanvas.visibility}${testCanvas.hasPassword ? ', password-protected' : ''})`);
  }

  // Create widgets on test canvases
  for (const widget of TEST_WIDGETS) {
    await prisma.widgetInstance.upsert({
      where: { id: widget.id },
      update: {},
      create: widget,
    });
  }
  console.log(`  ✓ Created ${TEST_WIDGETS.length} widgets on test canvases`);

  console.log(`\nSeeded ${TEST_USERS.length} test users with ${TEST_CANVASES.length} canvases`);

  // ============================================
  // Seed Google OAuth User Test Data
  // ============================================
  console.log('\nSeeding Google OAuth test users...');

  // Map to store actual user IDs (in case they already exist from OAuth)
  const googleUserIdMap: Record<string, string> = {};

  // Create or find Google OAuth users
  for (const user of GOOGLE_USERS) {
    const googleUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
      },
      create: {
        id: user.id,
        username: user.username,
        email: user.email,
        password: null, // OAuth users don't have passwords
        displayName: user.displayName,
      },
    });
    // Store the actual user ID (might be different from our hardcoded one if they already logged in via OAuth)
    googleUserIdMap[user.id] = googleUser.id;
    console.log(`  ✓ Created/found Google user: ${googleUser.username} (${googleUser.email}) -> ID: ${googleUser.id}`);
  }

  // Create canvases for Google OAuth users (using actual user IDs)
  for (const canvas of GOOGLE_USER_CANVASES) {
    // Get the actual user ID from the map
    const actualUserId = googleUserIdMap[canvas.userId] || canvas.userId;

    const googleCanvas = await prisma.canvas.upsert({
      where: { id: canvas.id },
      update: {
        userId: actualUserId, // Update userId in case it changed
      },
      create: {
        id: canvas.id,
        userId: actualUserId,
        name: canvas.name,
        description: canvas.description,
        visibility: canvas.visibility,
        slug: canvas.slug,
        width: canvas.width,
        height: canvas.height,
        backgroundConfig: canvas.backgroundConfig,
        settings: canvas.settings,
      },
    });
    console.log(`  ✓ Created canvas: "${googleCanvas.name}" (${googleCanvas.visibility}) for user ${actualUserId}`);
  }

  // Create widgets on Google user canvases
  for (const widget of GOOGLE_USER_WIDGETS) {
    await prisma.widgetInstance.upsert({
      where: { id: widget.id },
      update: {},
      create: widget,
    });
  }
  console.log(`  ✓ Created ${GOOGLE_USER_WIDGETS.length} widgets on Google user canvases`);

  console.log(`\nSeeded ${GOOGLE_USERS.length} Google users with ${GOOGLE_USER_CANVASES.length} canvases`);

  // ============================================
  // Seed Marketplace Items (New Multi-Type System)
  // ============================================
  console.log('\nSeeding marketplace items...');

  for (const widget of BUILTIN_MARKETPLACE_WIDGETS) {
    // Create marketplace item
    const marketplaceItem = await prisma.marketplaceItem.upsert({
      where: { slug: widget.slug },
      update: {
        name: widget.name,
        description: widget.description,
        shortDescription: widget.shortDescription,
        category: widget.category,
        tags: widget.tags,
      },
      create: {
        id: widget.id,
        authorId: officialUser.id,
        slug: widget.slug,
        name: widget.name,
        description: widget.description,
        shortDescription: widget.shortDescription,
        itemType: MarketplaceItemType.canvas_widget,
        category: widget.category,
        tags: widget.tags,
        isPublished: true,
        isOfficial: true,
        isFeatured: true,
        isVerified: true,
        isFree: true, // All official widgets are free
        license: 'standard',
        metadata: {
          widgetId: widget.widgetId,
          builtin: true,
        },
      },
    });

    // Create initial version
    const versionId = `${widget.id}_v100`;
    await prisma.marketplaceItemVersion.upsert({
      where: { id: versionId },
      update: {},
      create: {
        id: versionId,
        itemId: marketplaceItem.id,
        version: widget.version,
        content: widget.manifest,
        changelog: 'Initial release',
        isLatest: true,
      },
    });

    console.log(`  ✓ Created marketplace item: ${widget.name}`);
  }

  console.log(`\nSeeded ${BUILTIN_MARKETPLACE_WIDGETS.length} marketplace widgets`);
  console.log('Database seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
