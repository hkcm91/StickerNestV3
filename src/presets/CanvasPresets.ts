/**
 * StickerNest v2 - Canvas Presets
 * Pre-built canvas configurations for common workflows
 */

import type { CanvasSnapshot } from '../runtime/UndoManager';

// ==================
// Types
// ==================

export interface CanvasPreset {
  /** Unique preset ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: PresetCategory;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Tags for filtering */
  tags: string[];
  /** The canvas snapshot */
  snapshot: CanvasSnapshot;
  /** Widget definitions needed (IDs) */
  requiredWidgets: string[];
  /** AI prompts to generate missing widgets */
  widgetPrompts?: WidgetPrompt[];
}

export type PresetCategory =
  | 'productivity'
  | 'creative'
  | 'data'
  | 'social'
  | 'gaming'
  | 'utility'
  | 'template';

export interface WidgetPrompt {
  /** Widget ID this prompt creates */
  widgetId: string;
  /** Widget name */
  name: string;
  /** AI generation prompt */
  prompt: string;
  /** Suggested dimensions */
  dimensions?: { width: number; height: number };
}

// ==================
// Sample Widget Prompts
// ==================

export const SAMPLE_WIDGET_PROMPTS: WidgetPrompt[] = [
  {
    widgetId: 'pomodoro-timer',
    name: 'Pomodoro Timer',
    prompt: `Create a Pomodoro timer widget with:
- 25-minute work sessions, 5-minute breaks
- Start/pause/reset buttons
- Visual countdown display with circular progress
- Session counter showing completed pomodoros
- Sound notification when timer completes
- Emits: timer.tick, timer.complete, session.complete
- Receives: timer.start, timer.pause, timer.reset`,
    dimensions: { width: 280, height: 320 },
  },
  {
    widgetId: 'task-list',
    name: 'Task List',
    prompt: `Create a task list widget with:
- Add new tasks with text input
- Check off completed tasks (strikethrough)
- Delete tasks with X button
- Drag to reorder tasks
- Filter: All / Active / Completed
- Task count display
- Dark theme styling
- Emits: task.added, task.completed, task.deleted
- Receives: task.add (with text payload)`,
    dimensions: { width: 300, height: 400 },
  },
  {
    widgetId: 'music-player',
    name: 'Mini Music Player',
    prompt: `Create a mini music player widget with:
- Play/pause button
- Progress bar (clickable to seek)
- Volume slider
- Current time / duration display
- Track title display
- Previous/next buttons
- Visualizer bars that react to playback
- Emits: audio.playing, audio.paused, track.changed
- Receives: audio.play, audio.pause, audio.setVolume`,
    dimensions: { width: 320, height: 120 },
  },
  {
    widgetId: 'weather-card',
    name: 'Weather Card',
    prompt: `Create a weather display widget with:
- Current temperature (large display)
- Weather icon/emoji based on conditions
- High/low temperatures
- Humidity and wind speed
- Location name
- "Last updated" timestamp
- Refresh button
- Accepts weather data via data.set event
- Emits: data.refresh when refresh clicked`,
    dimensions: { width: 240, height: 280 },
  },
  {
    widgetId: 'quote-display',
    name: 'Inspirational Quote',
    prompt: `Create a quote display widget with:
- Large quote text with quotation marks
- Author attribution
- Elegant typography
- "New quote" button
- Copy to clipboard button
- Subtle fade animation on quote change
- Receives: text.set to update quote
- Emits: button.pressed when new quote requested`,
    dimensions: { width: 400, height: 200 },
  },
  {
    widgetId: 'habit-tracker',
    name: 'Habit Tracker',
    prompt: `Create a weekly habit tracker widget with:
- 7 day columns (Mon-Sun)
- Multiple habit rows
- Click to toggle completion (checkmark)
- Streak counter per habit
- Progress bar showing weekly completion
- Add new habit button
- Delete habit with long press
- Emits: habit.completed, habit.added
- Persists state locally`,
    dimensions: { width: 400, height: 300 },
  },
  {
    widgetId: 'sticky-note',
    name: 'Sticky Note',
    prompt: `Create a sticky note widget with:
- Editable text area
- Multiple color options (yellow, pink, blue, green)
- Color picker in corner
- Auto-save content
- Subtle paper texture/shadow
- Character count
- Pin/unpin toggle
- Emits: text.changed on edit
- Receives: text.set, ui.highlight`,
    dimensions: { width: 200, height: 200 },
  },
  {
    widgetId: 'countdown-event',
    name: 'Event Countdown',
    prompt: `Create an event countdown widget with:
- Days, hours, minutes, seconds display
- Event name (editable)
- Target date picker
- Celebration animation when reaching zero
- Progress indicator
- Share button
- Dark theme with accent color
- Emits: timer.complete when countdown ends
- Receives: data.set with target date`,
    dimensions: { width: 320, height: 180 },
  },
];

// ==================
// Canvas Presets
// ==================

export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    id: 'pomodoro-board',
    name: 'Pomodoro Focus Board',
    description: 'A productivity dashboard with timer, task list, and break reminders',
    category: 'productivity',
    tags: ['focus', 'timer', 'tasks', 'productivity'],
    requiredWidgets: ['pomodoro-timer', 'task-list', 'quote-display'],
    widgetPrompts: SAMPLE_WIDGET_PROMPTS.filter(p =>
      ['pomodoro-timer', 'task-list', 'quote-display'].includes(p.widgetId)
    ),
    snapshot: {
      widgets: [
        {
          id: 'widget-1',
          widgetDefId: 'pomodoro-timer',
          x: 50,
          y: 50,
          width: 280,
          height: 320,
        },
        {
          id: 'widget-2',
          widgetDefId: 'task-list',
          x: 360,
          y: 50,
          width: 300,
          height: 400,
        },
        {
          id: 'widget-3',
          widgetDefId: 'quote-display',
          x: 50,
          y: 400,
          width: 400,
          height: 200,
        },
      ],
      pipelines: [
        {
          id: 'pipe-1',
          from: { widgetId: 'widget-1', port: 'timer.complete' },
          to: { widgetId: 'widget-3', port: 'button.pressed' },
        },
      ],
      settings: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    },
  },
  {
    id: 'habit-dashboard',
    name: 'Daily Habit Dashboard',
    description: 'Track your daily habits and stay motivated with quotes',
    category: 'productivity',
    tags: ['habits', 'tracking', 'daily', 'motivation'],
    requiredWidgets: ['habit-tracker', 'quote-display', 'countdown-event'],
    widgetPrompts: SAMPLE_WIDGET_PROMPTS.filter(p =>
      ['habit-tracker', 'quote-display', 'countdown-event'].includes(p.widgetId)
    ),
    snapshot: {
      widgets: [
        {
          id: 'widget-1',
          widgetDefId: 'habit-tracker',
          x: 50,
          y: 50,
          width: 400,
          height: 300,
        },
        {
          id: 'widget-2',
          widgetDefId: 'quote-display',
          x: 480,
          y: 50,
          width: 350,
          height: 180,
        },
        {
          id: 'widget-3',
          widgetDefId: 'countdown-event',
          x: 480,
          y: 260,
          width: 320,
          height: 180,
        },
      ],
      pipelines: [],
      settings: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    },
  },
  {
    id: 'music-mood-board',
    name: 'Music & Mood Board',
    description: 'Ambient workspace with music player and sticky notes',
    category: 'creative',
    tags: ['music', 'notes', 'ambient', 'creative'],
    requiredWidgets: ['music-player', 'sticky-note'],
    widgetPrompts: SAMPLE_WIDGET_PROMPTS.filter(p =>
      ['music-player', 'sticky-note'].includes(p.widgetId)
    ),
    snapshot: {
      widgets: [
        {
          id: 'widget-1',
          widgetDefId: 'music-player',
          x: 50,
          y: 50,
          width: 320,
          height: 120,
        },
        {
          id: 'widget-2',
          widgetDefId: 'sticky-note',
          x: 400,
          y: 50,
          width: 200,
          height: 200,
          config: { color: 'yellow' },
        },
        {
          id: 'widget-3',
          widgetDefId: 'sticky-note',
          x: 620,
          y: 50,
          width: 200,
          height: 200,
          config: { color: 'pink' },
        },
        {
          id: 'widget-4',
          widgetDefId: 'sticky-note',
          x: 400,
          y: 270,
          width: 200,
          height: 200,
          config: { color: 'blue' },
        },
      ],
      pipelines: [],
      settings: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    },
  },
  {
    id: 'weather-station',
    name: 'Weather Station',
    description: 'Monitor weather with countdown to events',
    category: 'utility',
    tags: ['weather', 'data', 'utility'],
    requiredWidgets: ['weather-card', 'countdown-event'],
    widgetPrompts: SAMPLE_WIDGET_PROMPTS.filter(p =>
      ['weather-card', 'countdown-event'].includes(p.widgetId)
    ),
    snapshot: {
      widgets: [
        {
          id: 'widget-1',
          widgetDefId: 'weather-card',
          x: 50,
          y: 50,
          width: 240,
          height: 280,
        },
        {
          id: 'widget-2',
          widgetDefId: 'countdown-event',
          x: 320,
          y: 50,
          width: 320,
          height: 180,
          config: { eventName: 'Weekend!' },
        },
      ],
      pipelines: [],
      settings: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    },
  },
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    description: 'Start fresh with an empty canvas',
    category: 'template',
    tags: ['empty', 'start', 'new'],
    requiredWidgets: [],
    snapshot: {
      widgets: [],
      pipelines: [],
      settings: {
        zoom: 1,
        panX: 0,
        panY: 0,
      },
    },
  },
];

// ==================
// Helper Functions
// ==================

/**
 * Get all presets
 */
export function getAllPresets(): CanvasPreset[] {
  return CANVAS_PRESETS;
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): CanvasPreset[] {
  return CANVAS_PRESETS.filter(p => p.category === category);
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): CanvasPreset | undefined {
  return CANVAS_PRESETS.find(p => p.id === id);
}

/**
 * Search presets by tags or name
 */
export function searchPresets(query: string): CanvasPreset[] {
  const lowerQuery = query.toLowerCase();
  return CANVAS_PRESETS.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all sample widget prompts
 */
export function getSampleWidgetPrompts(): WidgetPrompt[] {
  return SAMPLE_WIDGET_PROMPTS;
}

/**
 * Get widget prompt by ID
 */
export function getWidgetPromptById(widgetId: string): WidgetPrompt | undefined {
  return SAMPLE_WIDGET_PROMPTS.find(p => p.widgetId === widgetId);
}

/**
 * Get all unique categories
 */
export function getPresetCategories(): PresetCategory[] {
  return [...new Set(CANVAS_PRESETS.map(p => p.category))];
}

export default {
  CANVAS_PRESETS,
  SAMPLE_WIDGET_PROMPTS,
  getAllPresets,
  getPresetsByCategory,
  getPresetById,
  searchPresets,
  getSampleWidgetPrompts,
  getWidgetPromptById,
  getPresetCategories,
};
