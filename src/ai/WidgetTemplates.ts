/**
 * StickerNest v2 - Widget Templates
 * Pre-built templates for common widget patterns
 * Used by AI to generate widgets with proper structure
 */

import type { WidgetManifest } from '../types/manifest';
import type { WidgetKind } from '../types/domain';

/** Template category */
export type TemplateCategory = 
  | 'data-display'
  | 'input'
  | 'communication'
  | 'pipeline'
  | 'utility'
  | 'visualization';

/** Widget template definition */
export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  kind: WidgetKind;
  /** Manifest template with placeholders */
  manifest: Partial<WidgetManifest>;
  /** HTML template with placeholders */
  html: string;
  /** Variables that need to be filled */
  variables: TemplateVariable[];
  /** Example use cases */
  examples: string[];
}

/** Variable to be filled in template */
export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: any;
  required: boolean;
}

/**
 * Base HTML template with WidgetAPI setup
 */
const BASE_HTML = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            min-height: 100vh;
            padding: 12px;
            color: #e2e8f0;
        }
        {{STYLES}}
    </style>
</head>
<body>
    {{CONTENT}}

    <script>
        // State management
        let state = {{INITIAL_STATE}};

        // Emit events to other widgets
        function emit(type, payload) {
            if (window.WidgetAPI) {
                window.WidgetAPI.emitEvent({ type, scope: 'canvas', payload });
            }
        }

        // Log to debug panel
        function log(msg, data) {
            if (window.WidgetAPI) window.WidgetAPI.log(msg, data);
        }

        // Render UI
        function render() {
            {{RENDER_LOGIC}}
        }

        // Initialize - MUST wait for WidgetAPI
        function init() {
            if (!window.WidgetAPI) {
                setTimeout(init, 50);
                return;
            }

            log('{{WIDGET_NAME}} ready');

            // Subscribe to events
            window.WidgetAPI.onEvent('*', (event) => {
                {{EVENT_HANDLERS}}
            });

            // Initial render
            render();
        }

        init();
    </script>
</body>
</html>`;

/**
 * Collection of widget templates
 */
export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // =====================
  // DATA DISPLAY TEMPLATES
  // =====================
  {
    id: 'data-list',
    name: 'Data List',
    description: 'Displays a list of items with optional actions',
    category: 'data-display',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'items': { type: 'array', description: 'Array of items to display' },
        'refresh': { type: 'event', description: 'Trigger data refresh' },
      },
      outputs: {
        'item-selected': { type: 'event', description: 'Emitted when an item is clicked' },
        'item-action': { type: 'event', description: 'Emitted when an action button is clicked' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'itemType', description: 'Type of items (e.g., "tasks", "users")', type: 'string', required: true },
      { name: 'showActions', description: 'Show action buttons per item', type: 'boolean', default: true, required: false },
    ],
    examples: [
      'Task list showing todos with complete/delete buttons',
      'User list with profile links',
      'File browser with download actions',
    ],
  },

  {
    id: 'data-card',
    name: 'Data Card',
    description: 'Displays a single data object with key-value pairs',
    category: 'data-display',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'data': { type: 'object', description: 'Data object to display' },
      },
      outputs: {
        'field-clicked': { type: 'event', description: 'Emitted when a field is clicked' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'title', description: 'Card title', type: 'string', required: true },
      { name: 'fields', description: 'Fields to display', type: 'array', required: true },
    ],
    examples: [
      'User profile card',
      'Stats summary card',
      'Settings display',
    ],
  },

  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Tabular data display with sorting and filtering',
    category: 'data-display',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'rows': { type: 'array', description: 'Table rows data' },
        'filter': { type: 'string', description: 'Filter string' },
      },
      outputs: {
        'row-selected': { type: 'event', description: 'Row selection event' },
        'sort-changed': { type: 'event', description: 'Sort column changed' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'columns', description: 'Column definitions', type: 'array', required: true },
      { name: 'sortable', description: 'Enable column sorting', type: 'boolean', default: true, required: false },
    ],
    examples: [
      'Product inventory table',
      'User management table',
      'Log viewer',
    ],
  },

  // =====================
  // CONTROL TEMPLATES
  // =====================
  {
    id: 'button-pad',
    name: 'Button Pad',
    description: 'Configurable grid of buttons for triggering actions (StreamDeck-style)',
    category: 'input',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'config': { type: 'object', description: 'Button configuration: { buttons: [...], columns: number }' },
        'setButtons': { type: 'array', description: 'Array of button configurations' },
      },
      outputs: {
        'buttonPressed': { type: 'event', description: 'Emitted when a button is pressed: { buttonId, label, index }' },
        'buttonReleased': { type: 'event', description: 'Emitted when a button is released' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'buttons', description: 'Button definitions: [{ id, label, icon, color }]', type: 'array', required: true },
      { name: 'columns', description: 'Number of columns', type: 'number', default: 3, required: false },
    ],
    examples: [
      'StreamDeck-style control panel',
      'Media playback controls',
      'Scene switcher for streaming',
      'Quick actions panel',
    ],
  },

  // =====================
  // INPUT TEMPLATES
  // =====================
  {
    id: 'input-form',
    name: 'Input Form',
    description: 'Form with multiple input fields',
    category: 'input',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'defaults': { type: 'object', description: 'Default form values' },
        'reset': { type: 'event', description: 'Reset form to defaults' },
      },
      outputs: {
        'submit': { type: 'event', description: 'Form submission with all values' },
        'change': { type: 'event', description: 'Individual field change' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'fields', description: 'Form field definitions', type: 'array', required: true },
      { name: 'submitLabel', description: 'Submit button text', type: 'string', default: 'Submit', required: false },
    ],
    examples: [
      'Task creation form',
      'Settings editor',
      'Search form with filters',
    ],
  },

  {
    id: 'input-selector',
    name: 'Selector',
    description: 'Single or multi-select from options',
    category: 'input',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'options': { type: 'array', description: 'Available options' },
        'selected': { type: 'any', description: 'Current selection' },
      },
      outputs: {
        'selection-changed': { type: 'event', description: 'Selection changed event' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'multiSelect', description: 'Allow multiple selections', type: 'boolean', default: false, required: false },
      { name: 'style', description: 'Display style (dropdown, buttons, chips)', type: 'string', default: 'dropdown', required: false },
    ],
    examples: [
      'Category picker',
      'Tag selector',
      'Priority chooser',
    ],
  },

  // =====================
  // COMMUNICATION TEMPLATES
  // =====================
  {
    id: 'notification-display',
    name: 'Notification Display',
    description: 'Shows notifications and alerts',
    category: 'communication',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'notification': { type: 'object', description: 'Notification to display' },
        'clear-all': { type: 'event', description: 'Clear all notifications' },
      },
      outputs: {
        'notification-clicked': { type: 'event', description: 'Notification clicked' },
        'notification-dismissed': { type: 'event', description: 'Notification dismissed' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'maxVisible', description: 'Maximum visible notifications', type: 'number', default: 5, required: false },
      { name: 'autoHide', description: 'Auto-hide after seconds (0 = never)', type: 'number', default: 5, required: false },
    ],
    examples: [
      'System alerts',
      'Task reminders',
      'Chat notifications',
    ],
  },

  {
    id: 'chat-interface',
    name: 'Chat Interface',
    description: 'Simple chat/message interface',
    category: 'communication',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'message': { type: 'object', description: 'Incoming message' },
        'history': { type: 'array', description: 'Message history' },
      },
      outputs: {
        'message-sent': { type: 'event', description: 'User sent a message' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'placeholder', description: 'Input placeholder text', type: 'string', default: 'Type a message...', required: false },
    ],
    examples: [
      'Team chat widget',
      'AI assistant interface',
      'Support chat',
    ],
  },

  // =====================
  // PIPELINE TEMPLATES
  // =====================
  {
    id: 'pipeline-filter',
    name: 'Data Filter',
    description: 'Filters data stream based on conditions',
    category: 'pipeline',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'data': { type: 'any', description: 'Incoming data to filter' },
      },
      outputs: {
        'passed': { type: 'any', description: 'Data that passed the filter' },
        'rejected': { type: 'any', description: 'Data that was rejected' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'condition', description: 'Filter condition expression', type: 'string', required: true },
    ],
    examples: [
      'Filter completed tasks',
      'Filter by date range',
      'Filter by user role',
    ],
  },

  {
    id: 'pipeline-transformer',
    name: 'Data Transformer',
    description: 'Transforms data from one format to another',
    category: 'pipeline',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'input': { type: 'any', description: 'Data to transform' },
      },
      outputs: {
        'output': { type: 'any', description: 'Transformed data' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'transformation', description: 'Transformation logic', type: 'string', required: true },
    ],
    examples: [
      'Format dates',
      'Calculate totals',
      'Merge fields',
    ],
  },

  {
    id: 'pipeline-aggregator',
    name: 'Data Aggregator',
    description: 'Collects and aggregates multiple data inputs',
    category: 'pipeline',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'item': { type: 'any', description: 'Individual items to aggregate' },
        'flush': { type: 'event', description: 'Emit current aggregation and reset' },
      },
      outputs: {
        'aggregated': { type: 'array', description: 'Aggregated result' },
      },
    },
    html: BASE_HTML,
    variables: [
      { name: 'maxItems', description: 'Maximum items before auto-flush', type: 'number', default: 100, required: false },
    ],
    examples: [
      'Collect log entries',
      'Batch updates',
      'Buffer events',
    ],
  },

  // =====================
  // VISUALIZATION TEMPLATES
  // =====================
  {
    id: 'viz-counter',
    name: 'Counter Display',
    description: 'Animated counter with optional trend indicator',
    category: 'visualization',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'value': { type: 'number', description: 'Current value' },
        'previous': { type: 'number', description: 'Previous value for trend' },
      },
      outputs: {},
    },
    html: BASE_HTML,
    variables: [
      { name: 'label', description: 'Counter label', type: 'string', required: true },
      { name: 'format', description: 'Number format (number, currency, percent)', type: 'string', default: 'number', required: false },
    ],
    examples: [
      'Total revenue counter',
      'Active users count',
      'Progress percentage',
    ],
  },

  {
    id: 'viz-progress',
    name: 'Progress Indicator',
    description: 'Progress bar or ring visualization',
    category: 'visualization',
    kind: '2d',
    manifest: {
      capabilities: { draggable: true, resizable: true },
      inputs: {
        'progress': { type: 'number', description: 'Progress value 0-100' },
        'status': { type: 'string', description: 'Status message' },
      },
      outputs: {},
    },
    html: BASE_HTML,
    variables: [
      { name: 'style', description: 'Display style (bar, ring, steps)', type: 'string', default: 'bar', required: false },
      { name: 'showLabel', description: 'Show percentage label', type: 'boolean', default: true, required: false },
    ],
    examples: [
      'File upload progress',
      'Task completion progress',
      'Multi-step wizard progress',
    ],
  },
];

/**
 * Get template by ID
 */
export function getTemplate(id: string): WidgetTemplate | undefined {
  return WIDGET_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): WidgetTemplate[] {
  return WIDGET_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): TemplateCategory[] {
  return [...new Set(WIDGET_TEMPLATES.map(t => t.category))];
}

/**
 * Find templates matching a description
 */
export function findMatchingTemplates(description: string): WidgetTemplate[] {
  const lowerDesc = description.toLowerCase();
  
  return WIDGET_TEMPLATES.filter(template => {
    const searchText = [
      template.name,
      template.description,
      ...template.examples,
    ].join(' ').toLowerCase();
    
    // Simple keyword matching
    const words = lowerDesc.split(/\s+/);
    return words.some(word => searchText.includes(word));
  });
}

/**
 * Get base HTML template
 */
export function getBaseHtmlTemplate(): string {
  return BASE_HTML;
}

