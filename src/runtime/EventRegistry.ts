/**
 * StickerNest v2 - Event Registry
 * Central registry of all supported events in the ecosystem
 *
 * This solves the problem of:
 * 1. AI generator not knowing what events exist
 * 2. Widgets emitting events that nothing handles
 * 3. No validation of event compatibility
 */

export interface EventDefinition {
  /** Event ID (e.g., 'vector:set-shadow') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category for grouping */
  category: 'vector' | 'timer' | 'data' | 'ui' | 'system' | 'custom';
  /** Direction: what this event does */
  direction: 'input' | 'output' | 'bidirectional';
  /** Description of what this event does */
  description: string;
  /** Expected payload schema */
  payload: {
    type: 'object' | 'string' | 'number' | 'boolean' | 'any' | 'void';
    properties?: Record<string, {
      type: string;
      description?: string;
      required?: boolean;
      default?: any;
    }>;
  };
  /** Which widgets handle this event */
  handlers?: string[];
  /** Which widgets emit this event */
  emitters?: string[];
}

/**
 * VECTOR EVENTS - All events for vector graphics manipulation
 */
export const VECTOR_EVENTS: EventDefinition[] = [
  // Shape spawning
  {
    id: 'vector:spawn-shape',
    name: 'Spawn Shape',
    category: 'vector',
    direction: 'input',
    description: 'Create a new shape on the vector canvas',
    payload: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Shape type: rect, circle, ellipse, polygon, line, path, star', required: true },
        x: { type: 'number', description: 'X position', default: 100 },
        y: { type: 'number', description: 'Y position', default: 100 },
        fill: { type: 'string', description: 'Fill color', default: '#3b82f6' },
        stroke: { type: 'string', description: 'Stroke color', default: '#1e40af' },
        strokeWidth: { type: 'number', description: 'Stroke width', default: 2 },
      }
    },
    handlers: ['vector-canvas'],
  },
  // Style events
  {
    id: 'vector:set-fill',
    name: 'Set Fill Color',
    category: 'vector',
    direction: 'input',
    description: 'Set the fill color of the selected entity',
    payload: {
      type: 'object',
      properties: {
        fill: { type: 'string', description: 'Fill color (hex, rgb, or named)', required: true },
      }
    },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:set-stroke',
    name: 'Set Stroke Color',
    category: 'vector',
    direction: 'input',
    description: 'Set the stroke color of the selected entity',
    payload: {
      type: 'object',
      properties: {
        stroke: { type: 'string', description: 'Stroke color', required: true },
      }
    },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:set-stroke-width',
    name: 'Set Stroke Width',
    category: 'vector',
    direction: 'input',
    description: 'Set the stroke width of the selected entity',
    payload: {
      type: 'object',
      properties: {
        strokeWidth: { type: 'number', description: 'Stroke width in pixels', required: true },
        width: { type: 'number', description: 'Alternative property name for stroke width' },
      }
    },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:set-opacity',
    name: 'Set Opacity',
    category: 'vector',
    direction: 'input',
    description: 'Set the opacity of the selected entity',
    payload: {
      type: 'object',
      properties: {
        opacity: { type: 'number', description: 'Opacity value 0-1', required: true },
      }
    },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:set-shadow',
    name: 'Set Shadow',
    category: 'vector',
    direction: 'input',
    description: 'Set shadow effect on the selected entity',
    payload: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable shadow', default: true },
        offsetX: { type: 'number', description: 'Shadow X offset', default: 4 },
        offsetY: { type: 'number', description: 'Shadow Y offset', default: 4 },
        blur: { type: 'number', description: 'Shadow blur radius', default: 8 },
        color: { type: 'string', description: 'Shadow color', default: 'rgba(0,0,0,0.5)' },
        opacity: { type: 'number', description: 'Shadow opacity 0-1', default: 0.5 },
      }
    },
    handlers: ['vector-canvas'],
  },
  // Transform events
  {
    id: 'vector:transform',
    name: 'Transform Entity',
    category: 'vector',
    direction: 'input',
    description: 'Apply transformations (scale, rotate, move) to selected entity',
    payload: {
      type: 'object',
      properties: {
        scaleX: { type: 'number', description: 'Scale factor X' },
        scaleY: { type: 'number', description: 'Scale factor Y' },
        rotate: { type: 'number', description: 'Rotation in degrees' },
        moveX: { type: 'number', description: 'Move X pixels' },
        moveY: { type: 'number', description: 'Move Y pixels' },
        flipH: { type: 'boolean', description: 'Flip horizontally' },
        flipV: { type: 'boolean', description: 'Flip vertically' },
      }
    },
    handlers: ['vector-canvas'],
  },
  // Entity operations
  {
    id: 'vector:delete-selected',
    name: 'Delete Selected',
    category: 'vector',
    direction: 'input',
    description: 'Delete the currently selected entity',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:duplicate-selected',
    name: 'Duplicate Selected',
    category: 'vector',
    direction: 'input',
    description: 'Duplicate the currently selected entity',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  // Layer operations
  {
    id: 'vector:bring-forward',
    name: 'Bring Forward',
    category: 'vector',
    direction: 'input',
    description: 'Move selected entity one layer forward',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:send-backward',
    name: 'Send Backward',
    category: 'vector',
    direction: 'input',
    description: 'Move selected entity one layer backward',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:bring-to-front',
    name: 'Bring to Front',
    category: 'vector',
    direction: 'input',
    description: 'Move selected entity to front',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:send-to-back',
    name: 'Send to Back',
    category: 'vector',
    direction: 'input',
    description: 'Move selected entity to back',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  // Query events
  {
    id: 'vector:get-entities',
    name: 'Get Entities',
    category: 'vector',
    direction: 'input',
    description: 'Request list of all entities on canvas',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  {
    id: 'vector:get-svg',
    name: 'Get SVG',
    category: 'vector',
    direction: 'input',
    description: 'Request SVG export of canvas',
    payload: { type: 'void' },
    handlers: ['vector-canvas'],
  },
  // Output events (emitted by vector-canvas)
  {
    id: 'vector:selection-changed',
    name: 'Selection Changed',
    category: 'vector',
    direction: 'output',
    description: 'Emitted when entity selection changes',
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entity ID' },
        type: { type: 'string', description: 'Entity type' },
        fill: { type: 'string', description: 'Current fill color' },
        stroke: { type: 'string', description: 'Current stroke color' },
        strokeWidth: { type: 'number', description: 'Current stroke width' },
        opacity: { type: 'number', description: 'Current opacity' },
        shadow: { type: 'object', description: 'Current shadow settings' },
        selected: { type: 'boolean', description: 'Selection state' },
      }
    },
    emitters: ['vector-canvas'],
  },
  {
    id: 'vector:entity-added',
    name: 'Entity Added',
    category: 'vector',
    direction: 'output',
    description: 'Emitted when a new entity is created',
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entity ID' },
        entity: { type: 'object', description: 'Full entity data' },
      }
    },
    emitters: ['vector-canvas'],
  },
  {
    id: 'vector:entity-updated',
    name: 'Entity Updated',
    category: 'vector',
    direction: 'output',
    description: 'Emitted when an entity is modified',
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entity ID' },
        entity: { type: 'object', description: 'Updated entity data' },
      }
    },
    emitters: ['vector-canvas'],
  },
  {
    id: 'vector:entity-deleted',
    name: 'Entity Deleted',
    category: 'vector',
    direction: 'output',
    description: 'Emitted when an entity is deleted',
    payload: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Deleted entity ID' },
      }
    },
    emitters: ['vector-canvas'],
  },
  {
    id: 'vector:entities-list',
    name: 'Entities List',
    category: 'vector',
    direction: 'output',
    description: 'Response to get-entities request',
    payload: {
      type: 'object',
      properties: {
        entities: { type: 'array', description: 'Array of all entities' },
      }
    },
    emitters: ['vector-canvas'],
  },
  {
    id: 'vector:svg-data',
    name: 'SVG Data',
    category: 'vector',
    direction: 'output',
    description: 'Response to get-svg request',
    payload: {
      type: 'object',
      properties: {
        svg: { type: 'string', description: 'SVG markup string' },
      }
    },
    emitters: ['vector-canvas'],
  },
];

/**
 * TIMER EVENTS - All events for timer/countdown widgets
 */
export const TIMER_EVENTS: EventDefinition[] = [
  {
    id: 'timer:start',
    name: 'Start Timer',
    category: 'timer',
    direction: 'input',
    description: 'Start the timer',
    payload: { type: 'void' },
  },
  {
    id: 'timer:pause',
    name: 'Pause Timer',
    category: 'timer',
    direction: 'input',
    description: 'Pause the timer',
    payload: { type: 'void' },
  },
  {
    id: 'timer:reset',
    name: 'Reset Timer',
    category: 'timer',
    direction: 'input',
    description: 'Reset the timer to initial value',
    payload: { type: 'void' },
  },
  {
    id: 'timer:set',
    name: 'Set Timer',
    category: 'timer',
    direction: 'input',
    description: 'Set timer duration',
    payload: {
      type: 'object',
      properties: {
        seconds: { type: 'number', description: 'Duration in seconds' },
        minutes: { type: 'number', description: 'Duration in minutes' },
      }
    },
  },
  {
    id: 'timer:tick',
    name: 'Timer Tick',
    category: 'timer',
    direction: 'output',
    description: 'Emitted on each timer tick',
    payload: {
      type: 'object',
      properties: {
        remaining: { type: 'number', description: 'Seconds remaining' },
        elapsed: { type: 'number', description: 'Seconds elapsed' },
        progress: { type: 'number', description: 'Progress 0-1' },
      }
    },
  },
  {
    id: 'timer:complete',
    name: 'Timer Complete',
    category: 'timer',
    direction: 'output',
    description: 'Emitted when timer completes',
    payload: { type: 'void' },
  },
];

/**
 * UI EVENTS - Generic UI interaction events
 */
export const UI_EVENTS: EventDefinition[] = [
  {
    id: 'trigger',
    name: 'Trigger',
    category: 'ui',
    direction: 'bidirectional',
    description: 'Generic trigger event',
    payload: { type: 'any' },
  },
  {
    id: 'clicked',
    name: 'Clicked',
    category: 'ui',
    direction: 'output',
    description: 'Button or element was clicked',
    payload: { type: 'void' },
  },
  {
    id: 'valueChanged',
    name: 'Value Changed',
    category: 'ui',
    direction: 'output',
    description: 'A value was changed (slider, input, etc)',
    payload: {
      type: 'object',
      properties: {
        value: { type: 'any', description: 'The new value' },
        previous: { type: 'any', description: 'The previous value' },
      }
    },
  },
  {
    id: 'colorChanged',
    name: 'Color Changed',
    category: 'ui',
    direction: 'output',
    description: 'A color was selected/changed',
    payload: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Color value (hex, rgb, etc)' },
        hex: { type: 'string', description: 'Hex color value' },
        rgb: { type: 'object', description: 'RGB object {r,g,b}' },
      }
    },
  },
  {
    id: 'textChanged',
    name: 'Text Changed',
    category: 'ui',
    direction: 'output',
    description: 'Text content was changed',
    payload: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The new text value' },
      }
    },
  },
];

/**
 * FORM FLOW EVENTS
 */
export const FORM_FLOW_EVENTS: EventDefinition[] = [
  {
    id: 'formflow:changed',
    name: 'Form Changed',
    category: 'data',
    direction: 'output',
    description: 'Emitted when form values change',
    payload: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID' },
        values: { type: 'object', description: 'Form values' },
        valid: { type: 'boolean', description: 'Validation status' },
      }
    },
  },
  {
    id: 'formflow:submitted',
    name: 'Form Submitted',
    category: 'data',
    direction: 'output',
    description: 'Emitted when form is submitted',
    payload: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID' },
        values: { type: 'object', description: 'Form values' },
        valid: { type: 'boolean', description: 'Validation status' },
      }
    },
  },
  {
    id: 'formflow:completed',
    name: 'Form Completed',
    category: 'data',
    direction: 'output',
    description: 'Emitted when multi-step form is completed',
    payload: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID' },
        values: { type: 'object', description: 'Form values' },
        valid: { type: 'boolean', description: 'Validation status' },
      }
    },
  }
];

/**
 * PIPELINE EVENTS
 */
export const PIPELINE_EVENTS: EventDefinition[] = [
  {
    id: 'businesscard:layout.ready',
    name: 'Layout Ready',
    category: 'data',
    direction: 'output',
    description: 'Emitted when layout is generated',
    payload: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID' },
        layoutConfig: { type: 'object', description: 'Layout configuration' },
      }
    },
  },
  {
    id: 'businesscard:image.ready',
    name: 'Image Ready',
    category: 'data',
    direction: 'output',
    description: 'Emitted when image is generated',
    payload: {
      type: 'object',
      properties: {
        widgetId: { type: 'string', description: 'Widget ID' },
        imageUrl: { type: 'string', description: 'Generated image URL' },
        metadata: { type: 'object', description: 'Generation metadata' },
      }
    },
  },
  {
    id: 'preview:export.request',
    name: 'Export Request',
    category: 'ui',
    direction: 'output',
    description: 'Emitted when export is requested',
    payload: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Export format (png, jpg, pdf)' },
        imageUrl: { type: 'string', description: 'Image URL to export' },
      }
    },
  },
  {
    id: 'preview:export.completed',
    name: 'Export Completed',
    category: 'ui',
    direction: 'output',
    description: 'Emitted when export is completed',
    payload: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Export format' },
        success: { type: 'boolean', description: 'Success status' },
      }
    },
  }
];

/**
 * All registered events
 */
export const ALL_EVENTS: EventDefinition[] = [
  ...VECTOR_EVENTS,
  ...TIMER_EVENTS,
  ...UI_EVENTS,
  ...FORM_FLOW_EVENTS,
  ...PIPELINE_EVENTS,
];

/**
 * Event Registry API
 */
export class EventRegistry {
  private events: Map<string, EventDefinition> = new Map();

  constructor() {
    // Register all built-in events
    for (const event of ALL_EVENTS) {
      this.events.set(event.id, event);
    }
  }

  /**
   * Get event definition by ID
   */
  get(eventId: string): EventDefinition | undefined {
    return this.events.get(eventId);
  }

  /**
   * Check if an event is registered
   */
  has(eventId: string): boolean {
    return this.events.has(eventId);
  }

  /**
   * Get all events in a category
   */
  getByCategory(category: EventDefinition['category']): EventDefinition[] {
    return Array.from(this.events.values()).filter(e => e.category === category);
  }

  /**
   * Get all input events (can be received)
   */
  getInputEvents(): EventDefinition[] {
    return Array.from(this.events.values()).filter(
      e => e.direction === 'input' || e.direction === 'bidirectional'
    );
  }

  /**
   * Get all output events (can be emitted)
   */
  getOutputEvents(): EventDefinition[] {
    return Array.from(this.events.values()).filter(
      e => e.direction === 'output' || e.direction === 'bidirectional'
    );
  }

  /**
   * Get events that a specific widget handles
   */
  getEventsForHandler(widgetId: string): EventDefinition[] {
    return Array.from(this.events.values()).filter(
      e => e.handlers?.includes(widgetId)
    );
  }

  /**
   * Register a custom event
   */
  register(event: EventDefinition): void {
    this.events.set(event.id, event);
  }

  /**
   * Generate documentation for AI prompt
   */
  generatePromptDocs(category?: EventDefinition['category']): string {
    const events = category ? this.getByCategory(category) : Array.from(this.events.values());

    let docs = '## Available Events\n\n';

    const grouped = new Map<string, EventDefinition[]>();
    for (const event of events) {
      const cat = event.category;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(event);
    }

    for (const [cat, catEvents] of grouped) {
      docs += `### ${cat.toUpperCase()} Events\n`;
      for (const event of catEvents) {
        docs += `- **${event.id}** (${event.direction}): ${event.description}\n`;
        if (event.payload.type !== 'void' && event.payload.properties) {
          docs += `  Payload: { ${Object.entries(event.payload.properties)
            .map(([k, v]) => `${k}: ${v.type}`)
            .join(', ')} }\n`;
        }
      }
      docs += '\n';
    }

    return docs;
  }

  /**
   * Validate that widget events are supported
   */
  validateWidgetEvents(
    inputs: string[],
    outputs: string[]
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const input of inputs) {
      const event = this.get(input);
      if (!event) {
        warnings.push(`Unknown input event: ${input} (may not be handled by any widget)`);
      } else if (event.direction === 'output') {
        errors.push(`Event ${input} is output-only, cannot be used as input`);
      }
    }

    for (const output of outputs) {
      const event = this.get(output);
      if (!event) {
        warnings.push(`Unknown output event: ${output} (custom event)`);
      } else if (event.direction === 'input') {
        errors.push(`Event ${output} is input-only, cannot be used as output`);
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }
}

// Singleton instance
let registryInstance: EventRegistry | null = null;

export function getEventRegistry(): EventRegistry {
  if (!registryInstance) {
    registryInstance = new EventRegistry();
  }
  return registryInstance;
}

/**
 * Quick helpers for common use cases
 */
export const getVectorInputEvents = () => VECTOR_EVENTS.filter(e => e.direction === 'input');
export const getVectorOutputEvents = () => VECTOR_EVENTS.filter(e => e.direction === 'output');
export const getTimerEvents = () => TIMER_EVENTS;
export const getUIEvents = () => UI_EVENTS;
