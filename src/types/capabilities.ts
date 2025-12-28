/**
 * StickerNest v2 - Capability Types
 * Defines the capability system for AI-driven widget wiring and evolution
 * Capabilities declare what a widget can receive (inputs) and emit (outputs)
 */

import type { EntityType } from './entities';

// ==================
// Capability Identifiers
// ==================

/**
 * Standard input capability IDs
 * Format: <domain>.<action>
 */
export type StandardInputCapability =
  // Text capabilities
  | 'text.set'
  | 'text.append'
  | 'text.clear'
  | 'text.style'
  // Animation capabilities
  | 'animation.play'
  | 'animation.pause'
  | 'animation.stop'
  | 'animation.seek'
  | 'animation.setSpeed'
  // Timer capabilities
  | 'timer.start'
  | 'timer.pause'
  | 'timer.reset'
  | 'timer.setDuration'
  // Data capabilities
  | 'data.set'
  | 'data.update'
  | 'data.clear'
  | 'data.refresh'
  // UI capabilities
  | 'ui.show'
  | 'ui.hide'
  | 'ui.toggle'
  | 'ui.highlight'
  | 'ui.focus'
  // Audio capabilities
  | 'audio.play'
  | 'audio.pause'
  | 'audio.stop'
  | 'audio.setVolume'
  | 'audio.mute'
  // Video capabilities
  | 'video.play'
  | 'video.pause'
  | 'video.stop'
  | 'video.seek'
  // Image capabilities
  | 'image.set'
  | 'image.filter'
  // Generic capabilities
  | 'state.set'
  | 'state.patch'
  | 'action.trigger';

/**
 * Standard output capability IDs
 * Format: <domain>.<event>
 */
export type StandardOutputCapability =
  // Text events
  | 'text.changed'
  | 'text.submitted'
  // Animation events
  | 'animation.started'
  | 'animation.completed'
  | 'animation.frame'
  // Timer events
  | 'timer.tick'
  | 'timer.complete'
  | 'timer.started'
  | 'timer.paused'
  | 'timer.progress'
  // Data events
  | 'data.changed'
  | 'data.loaded'
  | 'data.error'
  // UI events
  | 'ui.clicked'
  | 'ui.hovered'
  | 'ui.focused'
  | 'ui.blurred'
  | 'ui.resized'
  // Button events
  | 'button.pressed'
  | 'button.released'
  | 'button.longPress'
  // Form events
  | 'form.submitted'
  | 'form.changed'
  | 'form.validated'
  // Selection events
  | 'selection.changed'
  | 'selection.cleared'
  // List events
  | 'list.itemSelected'
  | 'list.itemRemoved'
  | 'list.reordered'
  // Generic events
  | 'state.changed'
  | 'error.occurred'
  | 'ready';

/** Combined capability ID type */
export type CapabilityId = StandardInputCapability | StandardOutputCapability | string;

// ==================
// Capability Definitions
// ==================

/** Payload schema for a capability */
export interface CapabilityPayload {
  /** Payload field name */
  name: string;
  /** Payload field type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** Whether the field is required */
  required?: boolean;
  /** Default value */
  default?: unknown;
  /** Description */
  description?: string;
}

/** Full capability definition */
export interface CapabilityDefinition {
  /** Unique capability ID */
  id: CapabilityId;
  /** Human-readable name */
  name: string;
  /** Description of what this capability does */
  description: string;
  /** Capability direction */
  direction: 'input' | 'output';
  /** Payload schema */
  payload: CapabilityPayload[];
  /** Entity types this capability works with */
  entityTypes?: EntityType[];
  /** Tags for categorization */
  tags?: string[];
  /** Whether this is a standard capability */
  isStandard?: boolean;
}

// ==================
// Widget Capability Declaration
// ==================

/** 
 * Capability declaration for a widget manifest
 * This is what widgets declare in their manifest
 */
export interface WidgetCapabilityDeclaration {
  /** Input capabilities this widget can receive */
  inputs: CapabilityId[];
  /** Output capabilities this widget can emit */
  outputs: CapabilityId[];
  /** Entity types this widget works with */
  entityTypes?: EntityType[];
  /** Custom input definitions (for non-standard capabilities) */
  customInputs?: CapabilityDefinition[];
  /** Custom output definitions (for non-standard capabilities) */
  customOutputs?: CapabilityDefinition[];
}

/** 
 * Extended widget capabilities including both UI flags and I/O capabilities
 * This extends the existing WidgetCapabilities type
 */
export interface ExtendedWidgetCapabilities {
  // UI capabilities (existing)
  draggable: boolean;
  resizable: boolean;
  rotatable?: boolean;
  supports3d?: boolean;
  supportsAudio?: boolean;
  
  // I/O capabilities (new)
  io?: WidgetCapabilityDeclaration;
}

// ==================
// Capability Matching
// ==================

/** Result of checking capability compatibility */
export interface CapabilityMatch {
  /** Source capability (output) */
  source: CapabilityId;
  /** Target capability (input) */
  target: CapabilityId;
  /** Match confidence (0-1) */
  confidence: number;
  /** Whether types are compatible */
  typeCompatible: boolean;
  /** Suggested type conversion if needed */
  conversion?: string;
}

/** Result of scanning widget capabilities */
export interface CapabilityScanResult {
  /** Widget ID */
  widgetId: string;
  /** Widget name */
  widgetName: string;
  /** All input capabilities */
  inputs: CapabilityId[];
  /** All output capabilities */
  outputs: CapabilityId[];
  /** Entity types */
  entityTypes: EntityType[];
  /** Missing standard capabilities that could be added */
  suggestedInputs?: CapabilityId[];
  /** Missing standard outputs that could be added */
  suggestedOutputs?: CapabilityId[];
}

/** Result of analyzing capability gaps */
export interface CapabilityGapAnalysis {
  /** Connection that needs capabilities */
  connection: {
    sourceWidget: string;
    sourceOutput: CapabilityId;
    targetWidget: string;
    targetInput: CapabilityId;
  };
  /** Whether the connection is possible */
  possible: boolean;
  /** If not possible, what's missing */
  missingSource?: CapabilityId[];
  /** If not possible, what's missing on target */
  missingTarget?: CapabilityId[];
  /** Suggested widget upgrades */
  suggestedUpgrades?: WidgetUpgrade[];
}

/** Suggested upgrade for a widget */
export interface WidgetUpgrade {
  /** Widget ID to upgrade */
  widgetId: string;
  /** New inputs to add */
  addInputs?: CapabilityId[];
  /** New outputs to add */
  addOutputs?: CapabilityId[];
  /** Code changes required */
  codeChanges?: CodeChange[];
  /** Estimated complexity */
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex';
}

/** Code change for widget upgrade */
export interface CodeChange {
  /** Type of change */
  type: 'add-handler' | 'add-emitter' | 'modify-manifest' | 'add-state';
  /** Description of change */
  description: string;
  /** Code snippet to add/modify */
  code?: string;
  /** Location in widget code */
  location?: string;
}

// ==================
// Standard Capability Registry Data
// ==================

/** Standard input capability definitions */
export const STANDARD_INPUT_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'text.set',
    name: 'Set Text',
    description: 'Set the text content',
    direction: 'input',
    payload: [{ name: 'content', type: 'string', required: true, description: 'Text content to set' }],
    entityTypes: ['text'],
    isStandard: true,
  },
  {
    id: 'text.append',
    name: 'Append Text',
    description: 'Append text to existing content',
    direction: 'input',
    payload: [{ name: 'content', type: 'string', required: true, description: 'Text to append' }],
    entityTypes: ['text'],
    isStandard: true,
  },
  {
    id: 'animation.play',
    name: 'Play Animation',
    description: 'Start playing the animation',
    direction: 'input',
    payload: [],
    entityTypes: ['lottie'],
    isStandard: true,
  },
  {
    id: 'animation.pause',
    name: 'Pause Animation',
    description: 'Pause the animation',
    direction: 'input',
    payload: [],
    entityTypes: ['lottie'],
    isStandard: true,
  },
  {
    id: 'animation.stop',
    name: 'Stop Animation',
    description: 'Stop the animation and reset',
    direction: 'input',
    payload: [],
    entityTypes: ['lottie'],
    isStandard: true,
  },
  {
    id: 'timer.start',
    name: 'Start Timer',
    description: 'Start the timer',
    direction: 'input',
    payload: [{ name: 'duration', type: 'number', required: false, description: 'Duration in ms (optional)' }],
    entityTypes: ['timer'],
    isStandard: true,
  },
  {
    id: 'timer.pause',
    name: 'Pause Timer',
    description: 'Pause the timer',
    direction: 'input',
    payload: [],
    entityTypes: ['timer'],
    isStandard: true,
  },
  {
    id: 'timer.reset',
    name: 'Reset Timer',
    description: 'Reset the timer to initial state',
    direction: 'input',
    payload: [],
    entityTypes: ['timer'],
    isStandard: true,
  },
  {
    id: 'data.set',
    name: 'Set Data',
    description: 'Set the data value',
    direction: 'input',
    payload: [{ name: 'value', type: 'any', required: true, description: 'Data value to set' }],
    entityTypes: ['data'],
    isStandard: true,
  },
  {
    id: 'ui.show',
    name: 'Show',
    description: 'Show the widget',
    direction: 'input',
    payload: [],
    isStandard: true,
  },
  {
    id: 'ui.hide',
    name: 'Hide',
    description: 'Hide the widget',
    direction: 'input',
    payload: [],
    isStandard: true,
  },
  {
    id: 'state.set',
    name: 'Set State',
    description: 'Set the widget state',
    direction: 'input',
    payload: [{ name: 'state', type: 'object', required: true, description: 'State object to set' }],
    isStandard: true,
  },
  {
    id: 'action.trigger',
    name: 'Trigger Action',
    description: 'Trigger a custom action',
    direction: 'input',
    payload: [{ name: 'action', type: 'string', required: true, description: 'Action name' }],
    isStandard: true,
  },
];

/** Standard output capability definitions */
export const STANDARD_OUTPUT_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 'text.changed',
    name: 'Text Changed',
    description: 'Emitted when text content changes',
    direction: 'output',
    payload: [{ name: 'content', type: 'string', required: true, description: 'New text content' }],
    entityTypes: ['text'],
    isStandard: true,
  },
  {
    id: 'text.submitted',
    name: 'Text Submitted',
    description: 'Emitted when text is submitted (e.g., Enter key)',
    direction: 'output',
    payload: [{ name: 'content', type: 'string', required: true, description: 'Submitted text' }],
    entityTypes: ['text'],
    isStandard: true,
  },
  {
    id: 'timer.tick',
    name: 'Timer Tick',
    description: 'Emitted on each timer tick',
    direction: 'output',
    payload: [
      { name: 'elapsed', type: 'number', required: true, description: 'Elapsed time in ms' },
      { name: 'remaining', type: 'number', required: true, description: 'Remaining time in ms' },
      { name: 'progress', type: 'number', required: true, description: 'Progress 0-1' },
    ],
    entityTypes: ['timer'],
    isStandard: true,
  },
  {
    id: 'timer.complete',
    name: 'Timer Complete',
    description: 'Emitted when timer completes',
    direction: 'output',
    payload: [{ name: 'duration', type: 'number', required: true, description: 'Total duration' }],
    entityTypes: ['timer'],
    isStandard: true,
  },
  {
    id: 'animation.completed',
    name: 'Animation Completed',
    description: 'Emitted when animation completes',
    direction: 'output',
    payload: [],
    entityTypes: ['lottie'],
    isStandard: true,
  },
  {
    id: 'button.pressed',
    name: 'Button Pressed',
    description: 'Emitted when a button is pressed',
    direction: 'output',
    payload: [
      { name: 'buttonId', type: 'string', required: true, description: 'Button identifier' },
      { name: 'label', type: 'string', required: false, description: 'Button label' },
    ],
    isStandard: true,
  },
  {
    id: 'data.changed',
    name: 'Data Changed',
    description: 'Emitted when data changes',
    direction: 'output',
    payload: [
      { name: 'value', type: 'any', required: true, description: 'New data value' },
      { name: 'previous', type: 'any', required: false, description: 'Previous value' },
    ],
    entityTypes: ['data'],
    isStandard: true,
  },
  {
    id: 'ui.clicked',
    name: 'Clicked',
    description: 'Emitted when widget is clicked',
    direction: 'output',
    payload: [
      { name: 'x', type: 'number', required: false, description: 'Click X position' },
      { name: 'y', type: 'number', required: false, description: 'Click Y position' },
    ],
    isStandard: true,
  },
  {
    id: 'selection.changed',
    name: 'Selection Changed',
    description: 'Emitted when selection changes',
    direction: 'output',
    payload: [
      { name: 'selected', type: 'any', required: true, description: 'Selected value(s)' },
      { name: 'previous', type: 'any', required: false, description: 'Previous selection' },
    ],
    isStandard: true,
  },
  {
    id: 'state.changed',
    name: 'State Changed',
    description: 'Emitted when widget state changes',
    direction: 'output',
    payload: [{ name: 'state', type: 'object', required: true, description: 'New state' }],
    isStandard: true,
  },
  {
    id: 'ready',
    name: 'Ready',
    description: 'Emitted when widget is ready',
    direction: 'output',
    payload: [],
    isStandard: true,
  },
];

/** All standard capabilities */
export const STANDARD_CAPABILITIES: CapabilityDefinition[] = [
  ...STANDARD_INPUT_CAPABILITIES,
  ...STANDARD_OUTPUT_CAPABILITIES,
];

// ==================
// Helper Functions
// ==================

/** Get a standard capability by ID */
export function getStandardCapability(id: CapabilityId): CapabilityDefinition | undefined {
  return STANDARD_CAPABILITIES.find(c => c.id === id);
}

/** Check if a capability ID is standard */
export function isStandardCapability(id: CapabilityId): boolean {
  return STANDARD_CAPABILITIES.some(c => c.id === id);
}

/** Get standard capabilities by direction */
export function getStandardCapabilitiesByDirection(direction: 'input' | 'output'): CapabilityDefinition[] {
  return STANDARD_CAPABILITIES.filter(c => c.direction === direction);
}

/** Get standard capabilities by entity type */
export function getStandardCapabilitiesByEntityType(entityType: EntityType): CapabilityDefinition[] {
  return STANDARD_CAPABILITIES.filter(c => c.entityTypes?.includes(entityType));
}

/** Create a custom capability definition */
export function createCustomCapability(
  id: string,
  name: string,
  description: string,
  direction: 'input' | 'output',
  payload: CapabilityPayload[] = []
): CapabilityDefinition {
  return {
    id,
    name,
    description,
    direction,
    payload,
    isStandard: false,
  };
}

/** Parse capability ID to extract domain and action */
export function parseCapabilityId(id: CapabilityId): { domain: string; action: string } {
  const parts = id.split('.');
  return {
    domain: parts[0] || 'unknown',
    action: parts.slice(1).join('.') || 'unknown',
  };
}

/** Check if two capabilities are compatible for connection */
export function areCapabilitiesCompatible(
  outputId: CapabilityId,
  inputId: CapabilityId
): CapabilityMatch {
  const output = getStandardCapability(outputId);
  const input = getStandardCapability(inputId);
  
  // If both are standard, check payload compatibility
  if (output && input) {
    const outputPayloadTypes = output.payload.map(p => p.type);
    const inputPayloadTypes = input.payload.filter(p => p.required).map(p => p.type);
    
    // Check if output provides all required input types
    const typeCompatible = inputPayloadTypes.every(t => 
      t === 'any' || outputPayloadTypes.includes(t) || outputPayloadTypes.includes('any')
    );
    
    // Calculate confidence based on domain matching and payload compatibility
    const { domain: outDomain } = parseCapabilityId(outputId);
    const { domain: inDomain } = parseCapabilityId(inputId);
    const domainMatch = outDomain === inDomain;
    
    const confidence = (typeCompatible ? 0.5 : 0.2) + (domainMatch ? 0.3 : 0) + 
      (output.entityTypes?.some(e => input.entityTypes?.includes(e)) ? 0.2 : 0);
    
    return {
      source: outputId,
      target: inputId,
      confidence: Math.min(1, confidence),
      typeCompatible,
    };
  }
  
  // For custom capabilities, assume compatible if IDs match
  const exactMatch = outputId === inputId;
  const { domain: outDomain } = parseCapabilityId(outputId);
  const { domain: inDomain } = parseCapabilityId(inputId);
  
  return {
    source: outputId,
    target: inputId,
    confidence: exactMatch ? 1 : (outDomain === inDomain ? 0.5 : 0.2),
    typeCompatible: exactMatch,
  };
}

