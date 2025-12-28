/**
 * StickerNest v2 - Widget Library
 * Smart library management for the alpha phase
 *
 * Features:
 * - Redundancy detection (don't create what already exists)
 * - Quality scoring (how well does it follow protocol?)
 * - Auto-categorization (organize widgets automatically)
 * - Capability mapping (what can each widget do?)
 * - Library persistence (save across sessions)
 * - AI recommendations (tell AI what exists)
 */

import { WidgetManifest } from '../types/manifest';
import { validateWidget, ValidationResult } from './WidgetValidation';
import { getEventRegistry, EventDefinition } from './EventRegistry';

// ================
// Types
// ================

export interface LibraryWidget {
  /** Unique ID */
  id: string;
  /** Widget manifest */
  manifest: WidgetManifest;
  /** Widget HTML */
  html: string;
  /** When added to library */
  addedAt: number;
  /** Last used */
  lastUsedAt?: number;
  /** Use count */
  useCount: number;
  /** Quality score 0-100 */
  qualityScore: number;
  /** Auto-detected category */
  category: WidgetCategory;
  /** Capabilities this widget provides */
  capabilities: WidgetCapability[];
  /** Events this widget can handle */
  handlesEvents: string[];
  /** Events this widget emits */
  emitsEvents: string[];
  /** Tags for searchability */
  tags: string[];
  /** Is this an official/tested widget? */
  isOfficial: boolean;
  /** Validation result */
  validation: ValidationResult;
  /** Source: generated, uploaded, preset */
  source: 'generated' | 'uploaded' | 'preset' | 'test';
}

export type WidgetCategory =
  | 'vector-tools'     // Tools for vector editing
  | 'data-display'     // Displays data/values
  | 'controls'         // Buttons, sliders, inputs
  | 'timers'           // Timers, clocks, countdowns
  | 'data-transform'   // Data processing/transformation
  | 'layout'           // Layout helpers
  | 'communication'    // Event bridges, relays
  | 'utility'          // General utilities
  | 'custom';          // Uncategorized

export interface WidgetCapability {
  /** Capability ID */
  id: string;
  /** Human name */
  name: string;
  /** What it does */
  description: string;
  /** Related events */
  events: string[];
}

export interface RedundancyCheck {
  /** Is this widget redundant? */
  isRedundant: boolean;
  /** Why it's redundant */
  reason?: string;
  /** Existing widgets that already do this */
  existingWidgets: LibraryWidget[];
  /** Similarity score 0-1 */
  similarityScore: number;
  /** Recommendation */
  recommendation: 'add' | 'skip' | 'merge' | 'replace';
}

export interface LibraryStats {
  totalWidgets: number;
  byCategory: Record<WidgetCategory, number>;
  bySource: Record<string, number>;
  averageQuality: number;
  mostUsed: LibraryWidget[];
  recentlyAdded: LibraryWidget[];
  coverageByEvent: Record<string, number>;
}

// ================
// Constants
// ================

const STORAGE_KEY = 'stickernest_widget_library';

// Standard capabilities we track
const STANDARD_CAPABILITIES: WidgetCapability[] = [
  { id: 'vector-fill', name: 'Set Fill Color', description: 'Can set fill color on vector entities', events: ['vector:set-fill'] },
  { id: 'vector-stroke', name: 'Set Stroke', description: 'Can set stroke color/width', events: ['vector:set-stroke', 'vector:set-stroke-width'] },
  { id: 'vector-shadow', name: 'Set Shadow', description: 'Can set shadow effects', events: ['vector:set-shadow'] },
  { id: 'vector-transform', name: 'Transform', description: 'Can transform (scale, rotate, move)', events: ['vector:transform'] },
  { id: 'vector-spawn', name: 'Create Shapes', description: 'Can create new shapes', events: ['vector:spawn-shape'] },
  { id: 'vector-delete', name: 'Delete Shapes', description: 'Can delete shapes', events: ['vector:delete-selected'] },
  { id: 'vector-layers', name: 'Layer Control', description: 'Can control layer order', events: ['vector:bring-forward', 'vector:send-backward'] },
  { id: 'timer-control', name: 'Timer Control', description: 'Emits timer events', events: ['timer:tick', 'timer:complete'] },
  { id: 'trigger-output', name: 'Trigger Output', description: 'Can trigger other widgets', events: ['trigger', 'clicked'] },
  { id: 'value-output', name: 'Value Output', description: 'Emits value changes', events: ['valueChanged'] },
  { id: 'color-output', name: 'Color Output', description: 'Emits color changes', events: ['colorChanged'] },
  { id: 'text-output', name: 'Text Output', description: 'Emits text changes', events: ['textChanged'] },
];

// ================
// Library Class
// ================

export class WidgetLibrary {
  private widgets: Map<string, LibraryWidget> = new Map();
  private eventRegistry = getEventRegistry();

  constructor() {
    this.load();
  }

  // ----------------
  // Core Operations
  // ----------------

  /**
   * Add a widget to the library
   */
  add(
    manifest: WidgetManifest,
    html: string,
    source: LibraryWidget['source'] = 'generated',
    isOfficial: boolean = false
  ): { success: boolean; widget?: LibraryWidget; error?: string; redundancy?: RedundancyCheck } {
    // Validate first
    const validation = validateWidget({ manifest, html });
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Check redundancy
    const redundancy = this.checkRedundancy(manifest, html);
    if (redundancy.isRedundant && redundancy.recommendation === 'skip') {
      return {
        success: false,
        error: redundancy.reason,
        redundancy,
      };
    }

    // Extract events from manifest
    const { inputs, outputs } = this.extractEvents(manifest);

    // Calculate quality score
    const qualityScore = this.calculateQuality(manifest, html, validation);

    // Auto-categorize
    const category = this.detectCategory(manifest, inputs, outputs);

    // Detect capabilities
    const capabilities = this.detectCapabilities(inputs, outputs);

    // Generate tags
    const tags = this.generateTags(manifest, category, capabilities);

    const widget: LibraryWidget = {
      id: manifest.id,
      manifest,
      html,
      addedAt: Date.now(),
      useCount: 0,
      qualityScore,
      category,
      capabilities,
      handlesEvents: inputs,
      emitsEvents: outputs,
      tags,
      isOfficial,
      validation,
      source,
    };

    this.widgets.set(widget.id, widget);
    this.save();

    console.log(`[WidgetLibrary] Added: ${manifest.name} (${category}, quality: ${qualityScore})`);

    return { success: true, widget, redundancy };
  }

  /**
   * Get a widget by ID
   */
  get(id: string): LibraryWidget | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all widgets
   */
  getAll(): LibraryWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   */
  getByCategory(category: WidgetCategory): LibraryWidget[] {
    return this.getAll().filter(w => w.category === category);
  }

  /**
   * Get widgets that handle a specific event
   */
  getByEvent(eventId: string, direction: 'input' | 'output'): LibraryWidget[] {
    return this.getAll().filter(w =>
      direction === 'input'
        ? w.handlesEvents.includes(eventId)
        : w.emitsEvents.includes(eventId)
    );
  }

  /**
   * Search widgets
   */
  search(query: string): LibraryWidget[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(w =>
      w.manifest.name.toLowerCase().includes(lower) ||
      w.manifest.description?.toLowerCase().includes(lower) ||
      w.tags.some(t => t.includes(lower)) ||
      w.category.includes(lower)
    );
  }

  /**
   * Remove a widget from library
   */
  remove(id: string): boolean {
    const result = this.widgets.delete(id);
    if (result) this.save();
    return result;
  }

  /**
   * Mark widget as used
   */
  markUsed(id: string): void {
    const widget = this.widgets.get(id);
    if (widget) {
      widget.useCount++;
      widget.lastUsedAt = Date.now();
      this.save();
    }
  }

  // ----------------
  // Redundancy Detection
  // ----------------

  /**
   * Check if a widget is redundant (already have something similar)
   */
  checkRedundancy(manifest: WidgetManifest, html: string): RedundancyCheck {
    const { inputs, outputs } = this.extractEvents(manifest);
    const allEvents = [...inputs, ...outputs];

    // Find widgets with similar capabilities
    const similar: Array<{ widget: LibraryWidget; score: number }> = [];

    for (const existing of this.widgets.values()) {
      const existingEvents = [...existing.handlesEvents, ...existing.emitsEvents];

      // Calculate overlap
      const overlap = allEvents.filter(e => existingEvents.includes(e)).length;
      const totalUnique = new Set([...allEvents, ...existingEvents]).size;
      const similarity = totalUnique > 0 ? overlap / totalUnique : 0;

      if (similarity > 0.3) {
        similar.push({ widget: existing, score: similarity });
      }
    }

    // Sort by similarity
    similar.sort((a, b) => b.score - a.score);

    // Check for exact match (same ID)
    const exactMatch = this.widgets.get(manifest.id);
    if (exactMatch) {
      return {
        isRedundant: true,
        reason: `Widget "${manifest.id}" already exists in library`,
        existingWidgets: [exactMatch],
        similarityScore: 1,
        recommendation: 'replace',
      };
    }

    // Check for high similarity
    if (similar.length > 0 && similar[0].score > 0.8) {
      return {
        isRedundant: true,
        reason: `Very similar to existing widget "${similar[0].widget.manifest.name}" (${Math.round(similar[0].score * 100)}% similar)`,
        existingWidgets: similar.map(s => s.widget),
        similarityScore: similar[0].score,
        recommendation: 'skip',
      };
    }

    // Check for moderate similarity
    if (similar.length > 0 && similar[0].score > 0.5) {
      return {
        isRedundant: false,
        reason: `Similar to "${similar[0].widget.manifest.name}" but adds unique features`,
        existingWidgets: similar.map(s => s.widget),
        similarityScore: similar[0].score,
        recommendation: 'add',
      };
    }

    return {
      isRedundant: false,
      existingWidgets: [],
      similarityScore: 0,
      recommendation: 'add',
    };
  }

  /**
   * Find gaps in library coverage
   */
  findCoverageGaps(): { event: EventDefinition; needsWidget: boolean }[] {
    const registry = getEventRegistry();
    const inputEvents = registry.getInputEvents();

    const gaps: { event: EventDefinition; needsWidget: boolean }[] = [];

    for (const event of inputEvents) {
      // Check if any widget emits this event
      const emitters = this.getByEvent(event.id, 'output');
      if (emitters.length === 0) {
        gaps.push({ event, needsWidget: true });
      }
    }

    return gaps;
  }

  // ----------------
  // Quality Scoring
  // ----------------

  /**
   * Calculate quality score for a widget
   */
  calculateQuality(
    manifest: WidgetManifest,
    html: string,
    validation: ValidationResult
  ): number {
    let score = 100;

    // Deduct for validation issues
    score -= validation.errors.length * 20;
    score -= validation.warnings.length * 5;

    // Check for good practices
    if (!manifest.description) score -= 10;
    if (!manifest.size) score -= 5;
    if (!manifest.category) score -= 5;

    // Check HTML quality
    if (!html.includes('READY')) score -= 20;
    if (html.includes('eval(')) score -= 15;
    if (!html.includes('addEventListener')) score -= 10;

    // Bonus for good practices
    if (html.includes('try') && html.includes('catch')) score += 5;
    if (html.includes(':root')) score += 5; // Uses CSS variables
    if (manifest.io?.inputs?.length || manifest.io?.outputs?.length) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  // ----------------
  // Auto-Categorization
  // ----------------

  /**
   * Auto-detect widget category from manifest and events
   */
  detectCategory(
    manifest: WidgetManifest,
    inputs: string[],
    outputs: string[]
  ): WidgetCategory {
    const allEvents = [...inputs, ...outputs];
    const desc = (manifest.description || '').toLowerCase();
    const name = manifest.name.toLowerCase();

    // Vector tools
    if (allEvents.some(e => e.startsWith('vector:'))) {
      return 'vector-tools';
    }

    // Timers
    if (allEvents.some(e => e.startsWith('timer:')) ||
        name.includes('timer') || name.includes('clock') || name.includes('countdown')) {
      return 'timers';
    }

    // Controls
    if (outputs.includes('clicked') || outputs.includes('trigger') ||
        name.includes('button') || name.includes('slider') || name.includes('control')) {
      return 'controls';
    }

    // Data display
    if (inputs.includes('valueChanged') || inputs.includes('textChanged') ||
        name.includes('display') || name.includes('viewer') || desc.includes('shows')) {
      return 'data-display';
    }

    // Data transform
    if (desc.includes('transform') || desc.includes('convert') || desc.includes('process')) {
      return 'data-transform';
    }

    // Communication
    if (name.includes('bridge') || name.includes('relay') || name.includes('echo')) {
      return 'communication';
    }

    return 'utility';
  }

  /**
   * Detect capabilities from events
   */
  detectCapabilities(inputs: string[], outputs: string[]): WidgetCapability[] {
    const capabilities: WidgetCapability[] = [];
    const allEvents = [...inputs, ...outputs];

    for (const cap of STANDARD_CAPABILITIES) {
      if (cap.events.some(e => allEvents.includes(e))) {
        capabilities.push(cap);
      }
    }

    return capabilities;
  }

  /**
   * Generate searchable tags
   */
  generateTags(
    manifest: WidgetManifest,
    category: WidgetCategory,
    capabilities: WidgetCapability[]
  ): string[] {
    const tags: string[] = [category];

    // From name
    const nameWords = manifest.name.toLowerCase().split(/[\s-_]+/);
    tags.push(...nameWords.filter(w => w.length > 2));

    // From capabilities
    tags.push(...capabilities.map(c => c.id));

    // From description
    if (manifest.description) {
      const descWords = manifest.description.toLowerCase()
        .split(/[\s-_,.]+/)
        .filter(w => w.length > 3);
      tags.push(...descWords.slice(0, 5));
    }

    return [...new Set(tags)];
  }

  // ----------------
  // AI Integration
  // ----------------

  /**
   * Generate library summary for AI prompts
   */
  generateAIPrompt(): string {
    const widgets = this.getAll();
    if (widgets.length === 0) {
      return '## Widget Library\nNo widgets in library yet.';
    }

    let prompt = '## Widget Library (Existing Widgets)\n';
    prompt += 'Before generating, check if these existing widgets already do what you need:\n\n';

    // Group by category
    const byCategory = new Map<WidgetCategory, LibraryWidget[]>();
    for (const w of widgets) {
      if (!byCategory.has(w.category)) byCategory.set(w.category, []);
      byCategory.get(w.category)!.push(w);
    }

    for (const [cat, catWidgets] of byCategory) {
      prompt += `### ${cat}\n`;
      for (const w of catWidgets) {
        prompt += `- **${w.manifest.name}** (${w.id})\n`;
        if (w.manifest.description) prompt += `  ${w.manifest.description}\n`;
        if (w.emitsEvents.length) prompt += `  Outputs: ${w.emitsEvents.join(', ')}\n`;
        if (w.handlesEvents.length) prompt += `  Inputs: ${w.handlesEvents.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Coverage gaps
    const gaps = this.findCoverageGaps();
    if (gaps.length > 0) {
      prompt += '### Missing Coverage (widgets needed)\n';
      for (const gap of gaps.slice(0, 5)) {
        prompt += `- No widget emits: ${gap.event.id} - ${gap.event.description}\n`;
      }
    }

    return prompt;
  }

  /**
   * Recommend widget for a description
   */
  recommendForDescription(description: string): {
    existingWidgets: LibraryWidget[];
    shouldGenerate: boolean;
    suggestion: string;
  } {
    const lower = description.toLowerCase();
    const matches = this.search(lower);

    // High confidence matches
    const goodMatches = matches.filter(m => m.qualityScore >= 70);

    if (goodMatches.length > 0) {
      return {
        existingWidgets: goodMatches,
        shouldGenerate: false,
        suggestion: `Consider using existing widget "${goodMatches[0].manifest.name}" instead of generating a new one.`,
      };
    }

    if (matches.length > 0) {
      return {
        existingWidgets: matches,
        shouldGenerate: true,
        suggestion: `Similar widgets exist but may not fully match. Review: ${matches.map(m => m.manifest.name).join(', ')}`,
      };
    }

    return {
      existingWidgets: [],
      shouldGenerate: true,
      suggestion: 'No similar widgets found. Generation recommended.',
    };
  }

  // ----------------
  // Statistics
  // ----------------

  /**
   * Get library statistics
   */
  getStats(): LibraryStats {
    const widgets = this.getAll();

    const byCategory: Record<WidgetCategory, number> = {
      'vector-tools': 0,
      'data-display': 0,
      'controls': 0,
      'timers': 0,
      'data-transform': 0,
      'layout': 0,
      'communication': 0,
      'utility': 0,
      'custom': 0,
    };

    const bySource: Record<string, number> = {};
    const coverageByEvent: Record<string, number> = {};
    let totalQuality = 0;

    for (const w of widgets) {
      byCategory[w.category]++;
      bySource[w.source] = (bySource[w.source] || 0) + 1;
      totalQuality += w.qualityScore;

      for (const e of w.emitsEvents) {
        coverageByEvent[e] = (coverageByEvent[e] || 0) + 1;
      }
    }

    return {
      totalWidgets: widgets.length,
      byCategory,
      bySource,
      averageQuality: widgets.length > 0 ? Math.round(totalQuality / widgets.length) : 0,
      mostUsed: [...widgets].sort((a, b) => b.useCount - a.useCount).slice(0, 5),
      recentlyAdded: [...widgets].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5),
      coverageByEvent,
    };
  }

  // ----------------
  // Persistence
  // ----------------

  /**
   * Extract events from manifest
   */
  private extractEvents(manifest: WidgetManifest): { inputs: string[]; outputs: string[] } {
    const inputs: string[] = [];
    const outputs: string[] = [];

    // New io format
    if (manifest.io) {
      const io = manifest.io as { inputs?: any[]; outputs?: any[] };
      if (io.inputs) {
        for (const input of io.inputs) {
          inputs.push(typeof input === 'string' ? input : input.id || input.name);
        }
      }
      if (io.outputs) {
        for (const output of io.outputs) {
          outputs.push(typeof output === 'string' ? output : output.id || output.name);
        }
      }
    }

    // Legacy format
    if (manifest.inputs) {
      inputs.push(...Object.keys(manifest.inputs));
    }
    if (manifest.outputs) {
      outputs.push(...Object.keys(manifest.outputs));
    }

    // Events format
    if (manifest.events) {
      if (manifest.events.listens) inputs.push(...manifest.events.listens);
      if (manifest.events.emits) outputs.push(...manifest.events.emits);
    }

    return {
      inputs: [...new Set(inputs)],
      outputs: [...new Set(outputs)],
    };
  }

  /**
   * Save library to localStorage
   */
  private save(): void {
    try {
      const data = Array.from(this.widgets.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[WidgetLibrary] Failed to save:', err);
    }
  }

  /**
   * Load library from localStorage
   */
  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const entries = JSON.parse(data) as Array<[string, LibraryWidget]>;
        this.widgets = new Map(entries);
        console.log(`[WidgetLibrary] Loaded ${this.widgets.size} widgets`);
      }
    } catch (err) {
      console.error('[WidgetLibrary] Failed to load:', err);
    }
  }

  /**
   * Clear library
   */
  clear(): void {
    this.widgets.clear();
    this.save();
  }

  /**
   * Export library as JSON
   */
  export(): string {
    return JSON.stringify(Array.from(this.widgets.values()), null, 2);
  }

  /**
   * Import widgets from JSON
   */
  import(json: string): { success: number; failed: number } {
    let success = 0;
    let failed = 0;

    try {
      const widgets = JSON.parse(json) as LibraryWidget[];
      for (const w of widgets) {
        const result = this.add(w.manifest, w.html, w.source, w.isOfficial);
        if (result.success) success++;
        else failed++;
      }
    } catch (err) {
      console.error('[WidgetLibrary] Import failed:', err);
    }

    return { success, failed };
  }
}

// Singleton instance
let libraryInstance: WidgetLibrary | null = null;

export function getWidgetLibrary(): WidgetLibrary {
  if (!libraryInstance) {
    libraryInstance = new WidgetLibrary();
  }
  return libraryInstance;
}
