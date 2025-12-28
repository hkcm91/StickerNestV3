/**
 * StickerNest v2 - Port Compatibility Tests
 * Tests for port compatibility detection and type inference
 */

import { describe, it, expect } from 'vitest';
import {
  inferPortType,
  extractPorts,
  areTypesCompatible,
  calculatePortCompatibility,
  detectCompatiblePorts,
  getBestConnection,
  analyzeWidgetPorts,
  suggestConnections,
} from './PortCompatibility';
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

describe('PortCompatibility', () => {
  describe('inferPortType', () => {
    describe('from type field', () => {
      it('should infer string type', () => {
        expect(inferPortType({ type: 'string' })).toBe('string');
        expect(inferPortType({ type: 'text' })).toBe('string');
      });

      it('should infer number type', () => {
        expect(inferPortType({ type: 'number' })).toBe('number');
        expect(inferPortType({ type: 'int' })).toBe('number');
        expect(inferPortType({ type: 'float' })).toBe('number');
      });

      it('should infer boolean type', () => {
        expect(inferPortType({ type: 'boolean' })).toBe('boolean');
        expect(inferPortType({ type: 'bool' })).toBe('boolean');
      });

      it('should infer array type', () => {
        expect(inferPortType({ type: 'array' })).toBe('array');
        expect(inferPortType({ type: 'list' })).toBe('array');
      });

      it('should infer object type', () => {
        expect(inferPortType({ type: 'object' })).toBe('object');
        expect(inferPortType({ type: 'json' })).toBe('object');
      });

      it('should infer event type', () => {
        expect(inferPortType({ type: 'event' })).toBe('event');
        expect(inferPortType({ type: 'trigger' })).toBe('event');
        expect(inferPortType({ type: 'signal' })).toBe('event');
      });

      it('should infer any type', () => {
        expect(inferPortType({ type: 'any' })).toBe('any');
        expect(inferPortType({ type: '*' })).toBe('any');
      });

      it('should infer color type', () => {
        expect(inferPortType({ type: 'color' })).toBe('color');
        expect(inferPortType({ type: 'hex' })).toBe('color');
      });

      it('should infer date type', () => {
        expect(inferPortType({ type: 'date' })).toBe('date');
        expect(inferPortType({ type: 'datetime' })).toBe('date');
        expect(inferPortType({ type: 'timestamp' })).toBe('date');
      });
    });

    describe('from description', () => {
      it('should infer string from description keywords', () => {
        expect(inferPortType({ description: 'Text content to display' })).toBe('string');
        expect(inferPortType({ description: 'A message to show' })).toBe('string');
      });

      it('should infer number from description keywords', () => {
        expect(inferPortType({ description: 'The count value' })).toBe('number');
        expect(inferPortType({ description: 'Progress percentage' })).toBe('number');
      });

      it('should infer boolean from description keywords', () => {
        expect(inferPortType({ description: 'Toggle the visibility' })).toBe('boolean');
        expect(inferPortType({ description: 'Whether enabled' })).toBe('boolean');
      });

      it('should infer event from description keywords', () => {
        expect(inferPortType({ description: 'Click event handler' })).toBe('event');
        expect(inferPortType({ description: 'Trigger when pressed' })).toBe('event');
      });
    });

    it('should return unknown for empty/undefined input', () => {
      expect(inferPortType(undefined)).toBe('unknown');
      expect(inferPortType({})).toBe('unknown');
    });
  });

  describe('extractPorts', () => {
    it('should extract ports from manifest.inputs', () => {
      const manifest = createManifest({
        inputs: {
          textInput: { type: 'string', description: 'Text input' },
          numberInput: { type: 'number' },
        },
      });

      const { inputs, outputs } = extractPorts(manifest);
      expect(inputs).toHaveLength(2);
      expect(inputs.find(p => p.name === 'textInput')).toBeDefined();
      expect(inputs.find(p => p.name === 'textInput')!.type).toBe('string');
      expect(outputs).toHaveLength(0);
    });

    it('should extract ports from manifest.outputs', () => {
      const manifest = createManifest({
        outputs: {
          clicked: { type: 'trigger', description: 'Click event' },
          value: { type: 'number' },
        },
      });

      const { inputs, outputs } = extractPorts(manifest);
      expect(inputs).toHaveLength(0);
      expect(outputs).toHaveLength(2);
      expect(outputs.find(p => p.name === 'clicked')!.type).toBe('event');
    });

    it('should extract ports from manifest.io', () => {
      const manifest = createManifest({
        io: {
          inputs: ['text.set', 'timer.start'],
          outputs: ['button.pressed', 'ready'],
        },
      });

      const { inputs, outputs } = extractPorts(manifest);
      expect(inputs).toHaveLength(2);
      expect(outputs).toHaveLength(2);
    });

    it('should merge ports from both sources without duplicates', () => {
      const manifest = createManifest({
        io: {
          inputs: ['text.set'],
          outputs: ['ready'],
        },
        inputs: {
          'text.set': { type: 'string' },
          customInput: { type: 'any' },
        },
      });

      const { inputs } = extractPorts(manifest);
      expect(inputs.some(p => p.name === 'text.set')).toBe(true);
      expect(inputs.some(p => p.name === 'customInput')).toBe(true);
    });

    it('should return empty arrays for manifest without ports', () => {
      const manifest = createManifest();
      const { inputs, outputs } = extractPorts(manifest);
      expect(inputs).toEqual([]);
      expect(outputs).toEqual([]);
    });
  });

  describe('areTypesCompatible', () => {
    describe('exact matches', () => {
      it('should return true for same types', () => {
        expect(areTypesCompatible('string', 'string')).toBe(true);
        expect(areTypesCompatible('number', 'number')).toBe(true);
        expect(areTypesCompatible('boolean', 'boolean')).toBe(true);
        expect(areTypesCompatible('event', 'event')).toBe(true);
        expect(areTypesCompatible('object', 'object')).toBe(true);
        expect(areTypesCompatible('array', 'array')).toBe(true);
      });
    });

    describe('any type', () => {
      it('should be compatible with any type as input', () => {
        expect(areTypesCompatible('string', 'any')).toBe(true);
        expect(areTypesCompatible('number', 'any')).toBe(true);
        expect(areTypesCompatible('object', 'any')).toBe(true);
        expect(areTypesCompatible('event', 'any')).toBe(true);
      });

      it('should be compatible with any type as output', () => {
        expect(areTypesCompatible('any', 'string')).toBe(true);
        expect(areTypesCompatible('any', 'number')).toBe(true);
        expect(areTypesCompatible('any', 'object')).toBe(true);
      });
    });

    describe('type conversions', () => {
      it('should allow number to boolean conversion', () => {
        expect(areTypesCompatible('number', 'boolean')).toBe(true);
        expect(areTypesCompatible('boolean', 'number')).toBe(true);
      });

      it('should allow color to string conversion', () => {
        expect(areTypesCompatible('color', 'string')).toBe(true);
      });

      it('should allow date conversions', () => {
        expect(areTypesCompatible('date', 'string')).toBe(true);
        expect(areTypesCompatible('date', 'number')).toBe(true);
      });
    });

    describe('incompatible types', () => {
      it('should return false for incompatible types', () => {
        expect(areTypesCompatible('string', 'number')).toBe(false);
        expect(areTypesCompatible('event', 'object')).toBe(false);
        expect(areTypesCompatible('boolean', 'array')).toBe(false);
      });
    });
  });

  describe('calculatePortCompatibility', () => {
    it('should return exact match for identical ports', () => {
      const output = { name: 'text.changed', type: 'string' as const, direction: 'output' as const };
      const input = { name: 'text.changed', type: 'string' as const, direction: 'input' as const };

      const result = calculatePortCompatibility(output, input);
      expect(result.level).toBe('exact');
      expect(result.score).toBeGreaterThan(0.5);
    });

    it('should return convertible for compatible types', () => {
      const output = { name: 'count', type: 'number' as const, direction: 'output' as const };
      const input = { name: 'enabled', type: 'boolean' as const, direction: 'input' as const };

      const result = calculatePortCompatibility(output, input);
      expect(result.level).toBe('convertible');
      expect(result.conversion).toBeDefined();
    });

    it('should return incompatible for mismatched types', () => {
      const output = { name: 'text', type: 'string' as const, direction: 'output' as const };
      const input = { name: 'items', type: 'array' as const, direction: 'input' as const };

      const result = calculatePortCompatibility(output, input);
      expect(result.level).toBe('incompatible');
      expect(result.score).toBe(0);
    });

    it('should give bonus for same domain', () => {
      const output = { name: 'timer.tick', type: 'number' as const, direction: 'output' as const };
      const inputSameDomain = { name: 'timer.setValue', type: 'number' as const, direction: 'input' as const };
      const inputDiffDomain = { name: 'data.setValue', type: 'number' as const, direction: 'input' as const };

      const sameDomainResult = calculatePortCompatibility(output, inputSameDomain);
      const diffDomainResult = calculatePortCompatibility(output, inputDiffDomain);

      expect(sameDomainResult.score).toBeGreaterThan(diffDomainResult.score);
    });

    it('should give bonus for similar names', () => {
      const output = { name: 'textContent', type: 'string' as const, direction: 'output' as const };
      const inputSimilar = { name: 'content', type: 'string' as const, direction: 'input' as const };
      const inputDifferent = { name: 'value', type: 'string' as const, direction: 'input' as const };

      const similarResult = calculatePortCompatibility(output, inputSimilar);
      const differentResult = calculatePortCompatibility(output, inputDifferent);

      expect(similarResult.score).toBeGreaterThan(differentResult.score);
    });
  });

  describe('detectCompatiblePorts', () => {
    it('should find compatible ports between two widgets', () => {
      const widgetA = createManifest({
        name: 'Button',
        outputs: { clicked: { type: 'trigger' } },
      });
      const widgetB = createManifest({
        name: 'Timer',
        inputs: { start: { type: 'trigger' } },
      });

      const compatibilities = detectCompatiblePorts(widgetA, widgetB);
      expect(compatibilities.length).toBeGreaterThan(0);
    });

    it('should check both directions (A->B and B->A)', () => {
      const widgetA = createManifest({
        inputs: { inputA: { type: 'string' } },
        outputs: { outputA: { type: 'number' } },
      });
      const widgetB = createManifest({
        inputs: { inputB: { type: 'number' } },
        outputs: { outputB: { type: 'string' } },
      });

      const compatibilities = detectCompatiblePorts(widgetA, widgetB);

      // A's outputA (number) -> B's inputB (number)
      expect(compatibilities.some(c =>
        c.output.name === 'outputA' && c.input.name === 'inputB'
      )).toBe(true);

      // B's outputB (string) -> A's inputA (string)
      expect(compatibilities.some(c =>
        c.output.name === 'outputB' && c.input.name === 'inputA'
      )).toBe(true);
    });

    it('should return results sorted by score', () => {
      const widgetA = createManifest({
        outputs: {
          exact: { type: 'string' },
          convertible: { type: 'number' },
        },
      });
      const widgetB = createManifest({
        inputs: {
          exact: { type: 'string' },
          compatible: { type: 'boolean' },
        },
      });

      const compatibilities = detectCompatiblePorts(widgetA, widgetB);

      for (let i = 0; i < compatibilities.length - 1; i++) {
        expect(compatibilities[i].score).toBeGreaterThanOrEqual(compatibilities[i + 1].score);
      }
    });

    it('should return empty array when no compatible ports', () => {
      const widgetA = createManifest({
        outputs: { text: { type: 'string' } },
      });
      const widgetB = createManifest({
        inputs: { items: { type: 'array' } },
      });

      const compatibilities = detectCompatiblePorts(widgetA, widgetB);
      expect(compatibilities).toHaveLength(0);
    });
  });

  describe('getBestConnection', () => {
    it('should return the best connection between widgets', () => {
      const widgetA = createManifest({
        outputs: {
          clicked: { type: 'trigger', description: 'Click event' },
          value: { type: 'number' },
        },
      });
      const widgetB = createManifest({
        inputs: {
          trigger: { type: 'trigger' },
          count: { type: 'number' },
        },
      });

      const best = getBestConnection(widgetA, widgetB);
      expect(best).not.toBeNull();
      expect(best!.score).toBeGreaterThan(0);
    });

    it('should return null when no compatible connection', () => {
      const widgetA = createManifest({
        outputs: { text: { type: 'string' } },
      });
      const widgetB = createManifest({
        inputs: { items: { type: 'array' } },
      });

      const best = getBestConnection(widgetA, widgetB);
      expect(best).toBeNull();
    });
  });

  describe('analyzeWidgetPorts', () => {
    it('should return complete port analysis', () => {
      const manifest = createManifest({
        name: 'Test Widget',
        inputs: { textInput: { type: 'string' } },
        outputs: { clicked: { type: 'trigger' } },
      });

      const analysis = analyzeWidgetPorts('widget-1', manifest);

      expect(analysis.widgetId).toBe('widget-1');
      expect(analysis.widgetName).toBe('Test Widget');
      expect(analysis.inputs).toHaveLength(1);
      expect(analysis.outputs).toHaveLength(1);
    });
  });

  describe('suggestConnections', () => {
    it('should suggest connections for new widget', () => {
      const newWidget = createManifest({
        inputs: { start: { type: 'trigger' } },
        outputs: { complete: { type: 'trigger' } },
      });

      const existingWidgets = [
        {
          id: 'button-1',
          manifest: createManifest({
            outputs: { clicked: { type: 'trigger' } },
          }),
        },
        {
          id: 'timer-1',
          manifest: createManifest({
            inputs: { trigger: { type: 'trigger' } },
          }),
        },
      ];

      const suggestions = suggestConnections(newWidget, existingWidgets);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should filter connections below threshold', () => {
      const newWidget = createManifest({
        inputs: { text: { type: 'string' } },
      });

      const existingWidgets = [
        {
          id: 'widget-1',
          manifest: createManifest({
            outputs: { items: { type: 'array' } }, // Incompatible
          }),
        },
      ];

      const suggestions = suggestConnections(newWidget, existingWidgets);
      expect(suggestions).toHaveLength(0);
    });

    it('should return suggestions sorted by score', () => {
      const newWidget = createManifest({
        inputs: {
          text: { type: 'string' },
          count: { type: 'number' },
        },
      });

      const existingWidgets = [
        {
          id: 'widget-1',
          manifest: createManifest({
            outputs: { text: { type: 'string' } }, // Exact match
          }),
        },
        {
          id: 'widget-2',
          manifest: createManifest({
            outputs: { value: { type: 'number' } }, // Good match
          }),
        },
      ];

      const suggestions = suggestConnections(newWidget, existingWidgets);

      for (let i = 0; i < suggestions.length - 1; i++) {
        expect(suggestions[i].connection.score).toBeGreaterThanOrEqual(
          suggestions[i + 1].connection.score
        );
      }
    });
  });
});
