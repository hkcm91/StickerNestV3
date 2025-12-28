/**
 * StickerNest v2 - Capability Checker Tests
 * Tests for the capability checking utility
 */

import { describe, it, expect } from 'vitest';
import {
  extractCapabilities,
  hasInputCapability,
  hasOutputCapability,
  hasCapability,
  canReceive,
  canEmit,
  getInputCapabilities,
  getOutputCapabilities,
  findCompatibleConnections,
  suggestCapabilities,
  validateCapabilities,
} from './CapabilityChecker';
import type { WidgetManifest } from '../types/manifest';

// Helper to create minimal valid manifest
function createManifest(overrides: Partial<WidgetManifest> = {}): WidgetManifest {
  return {
    id: 'test-widget',
    name: 'Test Widget',
    version: '1.0.0',
    kind: '2d',
    entry: 'index.html',
    inputs: {},
    outputs: {},
    capabilities: { draggable: true, resizable: true },
    ...overrides,
  };
}

describe('CapabilityChecker', () => {
  describe('extractCapabilities', () => {
    it('should extract capabilities from io declaration', () => {
      const manifest = createManifest({
        io: {
          inputs: ['text.set', 'timer.start'],
          outputs: ['button.pressed', 'ready'],
        },
      });

      const caps = extractCapabilities(manifest);
      expect(caps.inputs).toEqual(['text.set', 'timer.start']);
      expect(caps.outputs).toEqual(['button.pressed', 'ready']);
    });

    it('should extract capabilities from legacy inputs/outputs', () => {
      const manifest = createManifest({
        inputs: {
          textInput: { type: 'string', description: 'Text input' },
          numberInput: { type: 'number' },
        },
        outputs: {
          clicked: { type: 'trigger', description: 'Click event' },
        },
      });

      const caps = extractCapabilities(manifest);
      expect(caps.inputs).toContain('textInput');
      expect(caps.inputs).toContain('numberInput');
      expect(caps.outputs).toContain('clicked');
    });

    it('should merge io and legacy declarations without duplicates', () => {
      const manifest = createManifest({
        io: {
          inputs: ['text.set'],
          outputs: ['ready'],
        },
        inputs: {
          'text.set': { type: 'string' },
          customInput: { type: 'any' },
        },
        outputs: {
          ready: { type: 'trigger' },
          customOutput: { type: 'object' },
        },
      });

      const caps = extractCapabilities(manifest);
      expect(caps.inputs).toHaveLength(2); // text.set and customInput
      expect(caps.outputs).toHaveLength(2); // ready and customOutput
    });

    it('should extract custom input definitions', () => {
      const manifest = createManifest({
        io: {
          inputs: ['mywidget.customAction'],
          outputs: [],
          customInputs: [
            {
              id: 'mywidget.customAction',
              name: 'Custom Action',
              description: 'Triggers a custom action',
              direction: 'input',
              payload: [{ name: 'actionType', type: 'string', required: true }],
            },
          ],
        },
      });

      const caps = extractCapabilities(manifest);
      expect(caps.customInputs).toHaveLength(1);
      expect(caps.customInputs[0].id).toBe('mywidget.customAction');
    });

    it('should extract custom output definitions', () => {
      const manifest = createManifest({
        io: {
          inputs: [],
          outputs: ['mywidget.customEvent'],
          customOutputs: [
            {
              id: 'mywidget.customEvent',
              name: 'Custom Event',
              description: 'Emits a custom event',
              direction: 'output',
              payload: [],
            },
          ],
        },
      });

      const caps = extractCapabilities(manifest);
      expect(caps.customOutputs).toHaveLength(1);
      expect(caps.customOutputs[0].id).toBe('mywidget.customEvent');
    });

    it('should return empty arrays for manifest without capabilities', () => {
      const manifest = createManifest();
      const caps = extractCapabilities(manifest);
      expect(caps.inputs).toEqual([]);
      expect(caps.outputs).toEqual([]);
      expect(caps.customInputs).toEqual([]);
      expect(caps.customOutputs).toEqual([]);
    });
  });

  describe('hasInputCapability', () => {
    it('should return true for standard input capability in io', () => {
      const manifest = createManifest({
        io: { inputs: ['text.set'], outputs: [] },
      });

      const result = hasInputCapability(manifest, 'text.set');
      expect(result.hasCapability).toBe(true);
      expect(result.isCustom).toBe(false);
      expect(result.source).toBe('manifest.io');
    });

    it('should return true for capability in legacy inputs', () => {
      const manifest = createManifest({
        inputs: { myInput: { type: 'string' } },
      });

      const result = hasInputCapability(manifest, 'myInput');
      expect(result.hasCapability).toBe(true);
      expect(result.source).toBe('manifest.inputs');
    });

    it('should return true for custom input capability', () => {
      const manifest = createManifest({
        io: {
          inputs: ['mywidget.custom'],
          outputs: [],
          customInputs: [
            {
              id: 'mywidget.custom',
              name: 'Custom',
              description: 'Custom input',
              direction: 'input',
              payload: [],
            },
          ],
        },
      });

      const result = hasInputCapability(manifest, 'mywidget.custom');
      expect(result.hasCapability).toBe(true);
      // Custom capability in io.inputs list but definition lookup happens separately
      expect(result.isCustom).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      const manifest = createManifest({
        io: { inputs: ['text.set'], outputs: [] },
      });

      const result = hasInputCapability(manifest, 'nonexistent');
      expect(result.hasCapability).toBe(false);
    });

    it('should handle null/undefined manifest', () => {
      expect(hasInputCapability(null, 'text.set').hasCapability).toBe(false);
      expect(hasInputCapability(undefined, 'text.set').hasCapability).toBe(false);
    });
  });

  describe('hasOutputCapability', () => {
    it('should return true for standard output capability in io', () => {
      const manifest = createManifest({
        io: { inputs: [], outputs: ['button.pressed'] },
      });

      const result = hasOutputCapability(manifest, 'button.pressed');
      expect(result.hasCapability).toBe(true);
      expect(result.isCustom).toBe(false);
    });

    it('should return true for capability in legacy outputs', () => {
      const manifest = createManifest({
        outputs: { clicked: { type: 'trigger' } },
      });

      const result = hasOutputCapability(manifest, 'clicked');
      expect(result.hasCapability).toBe(true);
      expect(result.source).toBe('manifest.outputs');
    });

    it('should return true for custom output capability', () => {
      const manifest = createManifest({
        io: {
          inputs: [],
          outputs: ['mywidget.customEvent'],
          customOutputs: [
            {
              id: 'mywidget.customEvent',
              name: 'Custom Event',
              description: 'Custom output',
              direction: 'output',
              payload: [],
            },
          ],
        },
      });

      const result = hasOutputCapability(manifest, 'mywidget.customEvent');
      expect(result.hasCapability).toBe(true);
      expect(result.isCustom).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      const manifest = createManifest({
        io: { inputs: [], outputs: ['ready'] },
      });

      const result = hasOutputCapability(manifest, 'nonexistent');
      expect(result.hasCapability).toBe(false);
    });
  });

  describe('hasCapability', () => {
    it('should return true for input capability', () => {
      const manifest = createManifest({
        io: { inputs: ['text.set'], outputs: [] },
      });
      expect(hasCapability(manifest, 'text.set')).toBe(true);
    });

    it('should return true for output capability', () => {
      const manifest = createManifest({
        io: { inputs: [], outputs: ['button.pressed'] },
      });
      expect(hasCapability(manifest, 'button.pressed')).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      const manifest = createManifest();
      expect(hasCapability(manifest, 'nonexistent')).toBe(false);
    });
  });

  describe('canReceive / canEmit', () => {
    it('canReceive should check input capabilities', () => {
      const manifest = createManifest({
        inputs: { textInput: { type: 'string' } },
      });
      expect(canReceive(manifest, 'textInput')).toBe(true);
      expect(canReceive(manifest, 'nonexistent')).toBe(false);
    });

    it('canEmit should check output capabilities', () => {
      const manifest = createManifest({
        outputs: { clicked: { type: 'trigger' } },
      });
      expect(canEmit(manifest, 'clicked')).toBe(true);
      expect(canEmit(manifest, 'nonexistent')).toBe(false);
    });
  });

  describe('getInputCapabilities / getOutputCapabilities', () => {
    it('should return all input capabilities', () => {
      const manifest = createManifest({
        io: { inputs: ['text.set', 'timer.start'], outputs: [] },
      });
      const inputs = getInputCapabilities(manifest);
      expect(inputs).toEqual(['text.set', 'timer.start']);
    });

    it('should return all output capabilities', () => {
      const manifest = createManifest({
        io: { inputs: [], outputs: ['button.pressed', 'ready'] },
      });
      const outputs = getOutputCapabilities(manifest);
      expect(outputs).toEqual(['button.pressed', 'ready']);
    });

    it('should return empty array for null manifest', () => {
      expect(getInputCapabilities(null)).toEqual([]);
      expect(getOutputCapabilities(undefined)).toEqual([]);
    });
  });

  describe('findCompatibleConnections', () => {
    it('should find exact matches between outputs and inputs', () => {
      const source = createManifest({
        io: { inputs: [], outputs: ['text.changed'] },
      });
      const target = createManifest({
        io: { inputs: ['text.changed'], outputs: [] },
      });

      const connections = findCompatibleConnections(source, target);
      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].output).toBe('text.changed');
      expect(connections[0].input).toBe('text.changed');
      expect(connections[0].confidence).toBe(1.0);
    });

    it('should find domain-matched connections', () => {
      const source = createManifest({
        io: { inputs: [], outputs: ['text.changed'] },
      });
      const target = createManifest({
        io: { inputs: ['text.set'], outputs: [] },
      });

      const connections = findCompatibleConnections(source, target);
      expect(connections.length).toBeGreaterThan(0);
      const textConnection = connections.find(c => c.output === 'text.changed' && c.input === 'text.set');
      expect(textConnection).toBeDefined();
      expect(textConnection!.confidence).toBeGreaterThan(0.5);
    });

    it('should return connections sorted by confidence', () => {
      const source = createManifest({
        io: { inputs: [], outputs: ['text.changed', 'data.changed'] },
      });
      const target = createManifest({
        io: { inputs: ['text.changed', 'data.set'], outputs: [] },
      });

      const connections = findCompatibleConnections(source, target);
      for (let i = 0; i < connections.length - 1; i++) {
        expect(connections[i].confidence).toBeGreaterThanOrEqual(connections[i + 1].confidence);
      }
    });

    it('should return empty array for null manifests', () => {
      const manifest = createManifest();
      expect(findCompatibleConnections(null, manifest)).toEqual([]);
      expect(findCompatibleConnections(manifest, null)).toEqual([]);
    });
  });

  describe('suggestCapabilities', () => {
    it('should suggest text capabilities for text widgets', () => {
      const manifest = createManifest({
        name: 'Text Display Widget',
        description: 'Displays text content',
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.inputs).toContain('text.set');
      expect(suggestions.outputs).toContain('text.changed');
    });

    it('should suggest timer capabilities for timer widgets', () => {
      const manifest = createManifest({
        name: 'Countdown Timer',
        description: 'A timer that counts down',
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.inputs).toContain('timer.start');
      expect(suggestions.inputs).toContain('timer.pause');
      expect(suggestions.inputs).toContain('timer.reset');
      expect(suggestions.outputs).toContain('timer.tick');
      expect(suggestions.outputs).toContain('timer.complete');
    });

    it('should suggest button capabilities for button widgets', () => {
      const manifest = createManifest({
        name: 'Click Button',
        description: 'A button that triggers actions',
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.outputs).toContain('button.pressed');
    });

    it('should suggest animation capabilities for animation widgets', () => {
      const manifest = createManifest({
        name: 'Lottie Animation',
        description: 'Plays Lottie animations',
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.inputs).toContain('animation.play');
      expect(suggestions.inputs).toContain('animation.pause');
      expect(suggestions.outputs).toContain('animation.completed');
    });

    it('should not suggest capabilities already present', () => {
      const manifest = createManifest({
        name: 'Text Widget',
        io: { inputs: ['text.set'], outputs: ['text.changed'] },
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.inputs).not.toContain('text.set');
      expect(suggestions.outputs).not.toContain('text.changed');
    });

    it('should always suggest ready capability if missing', () => {
      const manifest = createManifest({
        name: 'Any Widget',
      });

      const suggestions = suggestCapabilities(manifest);
      expect(suggestions.outputs).toContain('ready');
    });

    it('should return empty suggestions for null manifest', () => {
      const suggestions = suggestCapabilities(null);
      expect(suggestions.inputs).toEqual([]);
      expect(suggestions.outputs).toEqual([]);
    });
  });

  describe('validateCapabilities', () => {
    it('should return empty array for valid capabilities', () => {
      const manifest = createManifest({
        io: {
          inputs: ['text.set', 'timer.start'],
          outputs: ['button.pressed', 'ready'],
        },
      });

      const errors = validateCapabilities(manifest);
      expect(errors).toEqual([]);
    });

    it('should detect duplicate input capabilities', () => {
      const manifest = createManifest({
        io: { inputs: ['text.set', 'text.set'], outputs: [] },
      });

      const errors = validateCapabilities(manifest);
      expect(errors).toContain('Duplicate input capability: text.set');
    });

    it('should detect duplicate output capabilities', () => {
      const manifest = createManifest({
        io: { inputs: [], outputs: ['ready', 'ready'] },
      });

      const errors = validateCapabilities(manifest);
      expect(errors).toContain('Duplicate output capability: ready');
    });

    it('should validate custom capability definitions', () => {
      const manifest = createManifest({
        io: {
          inputs: ['custom.action'],
          outputs: [],
          customInputs: [
            {
              id: 'custom.action',
              name: '', // Missing name
              description: 'A custom action',
              direction: 'input',
              payload: [],
            },
          ],
        },
      });

      const errors = validateCapabilities(manifest);
      expect(errors.some(e => e.includes('missing name'))).toBe(true);
    });

    it('should detect custom capability without ID', () => {
      const manifest = createManifest({
        io: {
          inputs: [],
          outputs: ['custom.event'],
          customOutputs: [
            {
              id: '', // Empty ID
              name: 'Custom Event',
              description: 'A custom event',
              direction: 'output',
              payload: [],
            },
          ],
        },
      });

      const errors = validateCapabilities(manifest);
      expect(errors.some(e => e.includes('missing ID'))).toBe(true);
    });
  });
});
