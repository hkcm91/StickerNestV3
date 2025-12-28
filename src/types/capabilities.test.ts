/**
 * StickerNest v2 - Capability Types Tests
 * Tests for capability type definitions and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  getStandardCapability,
  isStandardCapability,
  getStandardCapabilitiesByDirection,
  getStandardCapabilitiesByEntityType,
  createCustomCapability,
  parseCapabilityId,
  areCapabilitiesCompatible,
  STANDARD_INPUT_CAPABILITIES,
  STANDARD_OUTPUT_CAPABILITIES,
  STANDARD_CAPABILITIES,
} from './capabilities';

describe('Capability Types', () => {
  describe('STANDARD_CAPABILITIES', () => {
    it('should have input capabilities', () => {
      expect(STANDARD_INPUT_CAPABILITIES.length).toBeGreaterThan(0);
      STANDARD_INPUT_CAPABILITIES.forEach(cap => {
        expect(cap.direction).toBe('input');
        expect(cap.isStandard).toBe(true);
      });
    });

    it('should have output capabilities', () => {
      expect(STANDARD_OUTPUT_CAPABILITIES.length).toBeGreaterThan(0);
      STANDARD_OUTPUT_CAPABILITIES.forEach(cap => {
        expect(cap.direction).toBe('output');
        expect(cap.isStandard).toBe(true);
      });
    });

    it('should combine all capabilities', () => {
      expect(STANDARD_CAPABILITIES.length).toBe(
        STANDARD_INPUT_CAPABILITIES.length + STANDARD_OUTPUT_CAPABILITIES.length
      );
    });

    it('should have required fields for each capability', () => {
      STANDARD_CAPABILITIES.forEach(cap => {
        expect(cap.id).toBeDefined();
        expect(cap.name).toBeDefined();
        expect(cap.description).toBeDefined();
        expect(cap.direction).toMatch(/^(input|output)$/);
        expect(Array.isArray(cap.payload)).toBe(true);
      });
    });
  });

  describe('getStandardCapability', () => {
    it('should return capability for valid input ID', () => {
      const cap = getStandardCapability('text.set');
      expect(cap).toBeDefined();
      expect(cap!.id).toBe('text.set');
      expect(cap!.direction).toBe('input');
    });

    it('should return capability for valid output ID', () => {
      const cap = getStandardCapability('button.pressed');
      expect(cap).toBeDefined();
      expect(cap!.id).toBe('button.pressed');
      expect(cap!.direction).toBe('output');
    });

    it('should return undefined for non-existent ID', () => {
      expect(getStandardCapability('nonexistent.capability')).toBeUndefined();
    });

    it('should return undefined for custom capability ID', () => {
      expect(getStandardCapability('mywidget.customAction')).toBeUndefined();
    });
  });

  describe('isStandardCapability', () => {
    it('should return true for standard input capabilities', () => {
      expect(isStandardCapability('text.set')).toBe(true);
      expect(isStandardCapability('timer.start')).toBe(true);
      expect(isStandardCapability('animation.play')).toBe(true);
    });

    it('should return true for standard output capabilities', () => {
      expect(isStandardCapability('button.pressed')).toBe(true);
      expect(isStandardCapability('timer.complete')).toBe(true);
      expect(isStandardCapability('ready')).toBe(true);
    });

    it('should return false for custom capabilities', () => {
      expect(isStandardCapability('mywidget.customAction')).toBe(false);
      expect(isStandardCapability('custom.event')).toBe(false);
    });
  });

  describe('getStandardCapabilitiesByDirection', () => {
    it('should return only input capabilities', () => {
      const inputs = getStandardCapabilitiesByDirection('input');
      expect(inputs.length).toBe(STANDARD_INPUT_CAPABILITIES.length);
      inputs.forEach(cap => {
        expect(cap.direction).toBe('input');
      });
    });

    it('should return only output capabilities', () => {
      const outputs = getStandardCapabilitiesByDirection('output');
      expect(outputs.length).toBe(STANDARD_OUTPUT_CAPABILITIES.length);
      outputs.forEach(cap => {
        expect(cap.direction).toBe('output');
      });
    });
  });

  describe('getStandardCapabilitiesByEntityType', () => {
    it('should return text capabilities for text entity', () => {
      const textCaps = getStandardCapabilitiesByEntityType('text');
      expect(textCaps.length).toBeGreaterThan(0);
      textCaps.forEach(cap => {
        expect(cap.entityTypes).toContain('text');
      });
    });

    it('should return timer capabilities for timer entity', () => {
      const timerCaps = getStandardCapabilitiesByEntityType('timer');
      expect(timerCaps.length).toBeGreaterThan(0);
      timerCaps.forEach(cap => {
        expect(cap.entityTypes).toContain('timer');
      });
    });

    it('should return lottie capabilities for animation entity', () => {
      const lottieCaps = getStandardCapabilitiesByEntityType('lottie');
      expect(lottieCaps.length).toBeGreaterThan(0);
      lottieCaps.forEach(cap => {
        expect(cap.entityTypes).toContain('lottie');
      });
    });

    it('should return empty array for unknown entity type', () => {
      const unknownCaps = getStandardCapabilitiesByEntityType('unknownEntity' as any);
      expect(unknownCaps).toHaveLength(0);
    });
  });

  describe('createCustomCapability', () => {
    it('should create a custom capability with all fields', () => {
      const cap = createCustomCapability(
        'mywidget.customAction',
        'Custom Action',
        'Triggers a custom action',
        'input',
        [{ name: 'actionType', type: 'string', required: true }]
      );

      expect(cap.id).toBe('mywidget.customAction');
      expect(cap.name).toBe('Custom Action');
      expect(cap.description).toBe('Triggers a custom action');
      expect(cap.direction).toBe('input');
      expect(cap.payload).toHaveLength(1);
      expect(cap.isStandard).toBe(false);
    });

    it('should create capability with empty payload by default', () => {
      const cap = createCustomCapability(
        'mywidget.simple',
        'Simple',
        'A simple capability',
        'output'
      );

      expect(cap.payload).toHaveLength(0);
    });
  });

  describe('parseCapabilityId', () => {
    it('should parse standard capability IDs', () => {
      expect(parseCapabilityId('text.set')).toEqual({ domain: 'text', action: 'set' });
      expect(parseCapabilityId('button.pressed')).toEqual({ domain: 'button', action: 'pressed' });
      expect(parseCapabilityId('timer.complete')).toEqual({ domain: 'timer', action: 'complete' });
    });

    it('should handle multi-part actions', () => {
      expect(parseCapabilityId('animation.setSpeed')).toEqual({
        domain: 'animation',
        action: 'setSpeed',
      });
    });

    it('should handle single-word IDs', () => {
      expect(parseCapabilityId('ready')).toEqual({ domain: 'ready', action: 'unknown' });
    });

    it('should handle empty string', () => {
      expect(parseCapabilityId('')).toEqual({ domain: 'unknown', action: 'unknown' });
    });
  });

  describe('areCapabilitiesCompatible', () => {
    describe('exact matches', () => {
      it('should return confidence 1 for exact match', () => {
        const result = areCapabilitiesCompatible('text.changed', 'text.changed');
        expect(result.confidence).toBe(1);
        expect(result.typeCompatible).toBe(true);
      });
    });

    describe('domain matches', () => {
      it('should have high confidence for same domain', () => {
        const result = areCapabilitiesCompatible('text.changed', 'text.set');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should have lower confidence for different domains', () => {
        const result = areCapabilitiesCompatible('button.pressed', 'text.set');
        // Different domains get base confidence without domain match bonus
        expect(result.confidence).toBeLessThanOrEqual(0.5);
      });
    });

    describe('standard capabilities', () => {
      it('should check type compatibility for standard capabilities', () => {
        // text.changed outputs string, text.set expects string
        const result = areCapabilitiesCompatible('text.changed', 'text.set');
        expect(result.typeCompatible).toBe(true);
      });

      it('should detect incompatible types', () => {
        // timer.tick outputs numbers, text.set expects string
        const result = areCapabilitiesCompatible('timer.tick', 'text.set');
        expect(result.typeCompatible).toBe(false);
      });
    });

    describe('custom capabilities', () => {
      it('should handle custom capability IDs', () => {
        const result = areCapabilitiesCompatible('mywidget.custom', 'mywidget.custom');
        expect(result.confidence).toBe(1);
        expect(result.typeCompatible).toBe(true);
      });

      it('should match custom capabilities by domain', () => {
        const result = areCapabilitiesCompatible('mywidget.eventA', 'mywidget.actionB');
        expect(result.confidence).toBeGreaterThan(0.3);
      });
    });

    describe('result structure', () => {
      it('should return proper CapabilityMatch structure', () => {
        const result = areCapabilitiesCompatible('button.pressed', 'timer.start');

        expect(result).toHaveProperty('source', 'button.pressed');
        expect(result).toHaveProperty('target', 'timer.start');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('typeCompatible');
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('capability payload validation', () => {
    it('should have valid payload definitions', () => {
      STANDARD_CAPABILITIES.forEach(cap => {
        cap.payload.forEach(field => {
          expect(field.name).toBeDefined();
          expect(field.type).toMatch(/^(string|number|boolean|object|array|any)$/);
        });
      });
    });

    it('text.set should require string content', () => {
      const cap = getStandardCapability('text.set');
      expect(cap).toBeDefined();
      expect(cap!.payload).toHaveLength(1);
      expect(cap!.payload[0].name).toBe('content');
      expect(cap!.payload[0].type).toBe('string');
      expect(cap!.payload[0].required).toBe(true);
    });

    it('timer.start should have optional duration', () => {
      const cap = getStandardCapability('timer.start');
      expect(cap).toBeDefined();
      const durationField = cap!.payload.find(p => p.name === 'duration');
      expect(durationField).toBeDefined();
      expect(durationField!.type).toBe('number');
      expect(durationField!.required).toBe(false);
    });

    it('timer.tick should have multiple required fields', () => {
      const cap = getStandardCapability('timer.tick');
      expect(cap).toBeDefined();
      expect(cap!.payload.length).toBeGreaterThan(1);
      const requiredFields = cap!.payload.filter(p => p.required);
      expect(requiredFields.length).toBeGreaterThan(0);
    });
  });
});
