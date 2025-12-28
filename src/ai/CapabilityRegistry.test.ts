/**
 * StickerNest v2 - CapabilityRegistry Tests
 * Tests for the capability registry including registration, scanning, and matching
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CapabilityRegistry, getCapabilityRegistry, resetCapabilityRegistry } from './CapabilityRegistry';
import type { WidgetManifest } from '../types/manifest';
import type { CapabilityDefinition, WidgetCapabilityDeclaration } from '../types/capabilities';

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

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    resetCapabilityRegistry();
    registry = getCapabilityRegistry();
  });

  afterEach(() => {
    resetCapabilityRegistry();
  });

  describe('initialization', () => {
    it('should initialize with standard capabilities', () => {
      const caps = registry.getAllCapabilities();
      expect(caps.length).toBeGreaterThan(0);
    });

    it('should include standard input capabilities', () => {
      const cap = registry.getCapability('text.set');
      expect(cap).toBeDefined();
      expect(cap?.direction).toBe('input');
    });

    it('should include standard output capabilities', () => {
      const cap = registry.getCapability('button.pressed');
      expect(cap).toBeDefined();
      expect(cap?.direction).toBe('output');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getCapabilityRegistry();
      const instance2 = getCapabilityRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = getCapabilityRegistry();
      resetCapabilityRegistry();
      const instance2 = getCapabilityRegistry();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('registerCapability', () => {
    it('should register custom capability', () => {
      const customCap: CapabilityDefinition = {
        id: 'mywidget.customAction',
        name: 'Custom Action',
        description: 'A custom action',
        direction: 'input',
        payload: [{ name: 'value', type: 'string', required: true }],
      };

      registry.registerCapability(customCap);
      const retrieved = registry.getCapability('mywidget.customAction');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Action');
    });

    it('should override existing capability', () => {
      const customCap: CapabilityDefinition = {
        id: 'text.set',
        name: 'Custom Text Set',
        description: 'Overridden text.set',
        direction: 'input',
        payload: [],
      };

      registry.registerCapability(customCap);
      const retrieved = registry.getCapability('text.set');

      expect(retrieved?.name).toBe('Custom Text Set');
    });
  });

  describe('registerWidget', () => {
    it('should register widget manifest', () => {
      const manifest = createManifest({ id: 'my-widget', name: 'My Widget' });
      registry.registerWidget(manifest);

      expect(registry.getWidgetManifest('my-widget')).toBeDefined();
    });

    it('should register custom capabilities from widget manifest', () => {
      const manifest = createManifest({
        id: 'custom-widget',
        io: {
          inputs: ['mywidget.custom'],
          outputs: [],
          customInputs: [
            {
              id: 'mywidget.custom',
              name: 'Custom',
              description: 'Custom capability',
              direction: 'input',
              payload: [],
            },
          ],
        },
      });

      registry.registerWidget(manifest);

      const cap = registry.getCapability('mywidget.custom');
      expect(cap).toBeDefined();
    });

    it('should invalidate scan cache when widget is registered', () => {
      const manifest = createManifest({ id: 'widget-1' });
      registry.registerWidget(manifest);
      registry.scanWidget('widget-1'); // Cache the scan

      const updatedManifest = createManifest({
        id: 'widget-1',
        io: { inputs: ['text.set'], outputs: [] },
      });
      registry.registerWidget(updatedManifest);

      const scan = registry.scanWidget('widget-1');
      expect(scan?.inputs).toContain('text.set');
    });
  });

  describe('unregisterWidget', () => {
    it('should remove widget', () => {
      const manifest = createManifest({ id: 'widget-1' });
      registry.registerWidget(manifest);
      expect(registry.getWidgetManifest('widget-1')).toBeDefined();

      registry.unregisterWidget('widget-1');
      expect(registry.getWidgetManifest('widget-1')).toBeUndefined();
    });
  });

  describe('queries', () => {
    it('should get capabilities by direction', () => {
      const inputs = registry.getCapabilitiesByDirection('input');
      const outputs = registry.getCapabilitiesByDirection('output');

      inputs.forEach(cap => expect(cap.direction).toBe('input'));
      outputs.forEach(cap => expect(cap.direction).toBe('output'));
    });

    it('should get capabilities by entity type', () => {
      const textCaps = registry.getCapabilitiesByEntityType('text');
      expect(textCaps.length).toBeGreaterThan(0);
      textCaps.forEach(cap => {
        expect(cap.entityTypes).toContain('text');
      });
    });

    it('should get all registered widgets', () => {
      registry.registerWidget(createManifest({ id: 'widget-1' }));
      registry.registerWidget(createManifest({ id: 'widget-2' }));

      const widgets = registry.getAllWidgets();
      expect(widgets).toHaveLength(2);
    });
  });

  describe('scanWidget', () => {
    it('should return null for unregistered widget', () => {
      expect(registry.scanWidget('nonexistent')).toBeNull();
    });

    it('should scan widget capabilities from io declaration', () => {
      const manifest = createManifest({
        id: 'button-widget',
        name: 'Button Widget',
        io: {
          inputs: ['text.set'],
          outputs: ['button.pressed', 'ready'],
        },
      });

      registry.registerWidget(manifest);
      const scan = registry.scanWidget('button-widget');

      expect(scan).not.toBeNull();
      expect(scan?.widgetId).toBe('button-widget');
      expect(scan?.widgetName).toBe('Button Widget');
      expect(scan?.inputs).toContain('text.set');
      expect(scan?.outputs).toContain('button.pressed');
      expect(scan?.outputs).toContain('ready');
    });

    it('should cache scan results', () => {
      const manifest = createManifest({ id: 'widget-1' });
      registry.registerWidget(manifest);

      const scan1 = registry.scanWidget('widget-1');
      const scan2 = registry.scanWidget('widget-1');

      expect(scan1).toBe(scan2); // Same reference from cache
    });

    it('should suggest missing capabilities based on entity types', () => {
      const manifest = createManifest({
        id: 'text-widget',
        io: {
          inputs: [],
          outputs: [],
          entityTypes: ['text'],
        },
      });

      registry.registerWidget(manifest);
      const scan = registry.scanWidget('text-widget');

      // Should suggest text-related capabilities
      expect(scan?.suggestedInputs?.length).toBeGreaterThan(0);
    });
  });

  describe('scanAllWidgets', () => {
    it('should scan all registered widgets', () => {
      registry.registerWidget(createManifest({ id: 'widget-1' }));
      registry.registerWidget(createManifest({ id: 'widget-2' }));
      registry.registerWidget(createManifest({ id: 'widget-3' }));

      const scans = registry.scanAllWidgets();
      expect(scans).toHaveLength(3);
    });
  });

  describe('findWidgetsWithInput / findWidgetsWithOutput', () => {
    beforeEach(() => {
      registry.registerWidget(
        createManifest({
          id: 'text-display',
          io: { inputs: ['text.set'], outputs: [] },
        })
      );
      registry.registerWidget(
        createManifest({
          id: 'timer',
          io: { inputs: ['timer.start'], outputs: ['timer.tick', 'timer.complete'] },
        })
      );
      registry.registerWidget(
        createManifest({
          id: 'button',
          io: { inputs: [], outputs: ['button.pressed'] },
        })
      );
    });

    it('should find widgets with specific input', () => {
      const results = registry.findWidgetsWithInput('text.set');
      expect(results).toHaveLength(1);
      expect(results[0].widgetId).toBe('text-display');
    });

    it('should find widgets with specific output', () => {
      const results = registry.findWidgetsWithOutput('timer.tick');
      expect(results).toHaveLength(1);
      expect(results[0].widgetId).toBe('timer');
    });

    it('should return empty array for non-matching capability', () => {
      expect(registry.findWidgetsWithInput('nonexistent')).toHaveLength(0);
      expect(registry.findWidgetsWithOutput('nonexistent')).toHaveLength(0);
    });
  });

  describe('findCompatibleConnections', () => {
    beforeEach(() => {
      registry.registerWidget(
        createManifest({
          id: 'button',
          name: 'Button',
          io: { inputs: [], outputs: ['button.pressed', 'ui.clicked'] },
        })
      );
      registry.registerWidget(
        createManifest({
          id: 'timer',
          name: 'Timer',
          io: { inputs: ['timer.start', 'action.trigger'], outputs: ['timer.complete'] },
        })
      );
    });

    it('should find compatible connections between widgets', () => {
      const matches = registry.findCompatibleConnections('button', 'timer');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should return matches sorted by confidence', () => {
      const matches = registry.findCompatibleConnections('button', 'timer');
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].confidence).toBeGreaterThanOrEqual(matches[i + 1].confidence);
      }
    });

    it('should return empty array for unregistered widgets', () => {
      expect(registry.findCompatibleConnections('nonexistent', 'timer')).toHaveLength(0);
      expect(registry.findCompatibleConnections('button', 'nonexistent')).toHaveLength(0);
    });
  });

  describe('analyzeCapabilityGap', () => {
    beforeEach(() => {
      registry.registerWidget(
        createManifest({
          id: 'source-widget',
          io: { inputs: [], outputs: ['text.changed'] },
        })
      );
      registry.registerWidget(
        createManifest({
          id: 'target-widget',
          io: { inputs: ['text.set'], outputs: [] },
        })
      );
    });

    it('should detect possible connection', () => {
      const analysis = registry.analyzeCapabilityGap(
        'source-widget',
        'text.changed',
        'target-widget',
        'text.set'
      );

      expect(analysis.possible).toBe(true);
    });

    it('should detect missing source output', () => {
      const analysis = registry.analyzeCapabilityGap(
        'source-widget',
        'nonexistent.output',
        'target-widget',
        'text.set'
      );

      expect(analysis.possible).toBe(false);
      expect(analysis.missingSource).toContain('nonexistent.output');
    });

    it('should detect missing target input', () => {
      const analysis = registry.analyzeCapabilityGap(
        'source-widget',
        'text.changed',
        'target-widget',
        'nonexistent.input'
      );

      expect(analysis.possible).toBe(false);
      expect(analysis.missingTarget).toContain('nonexistent.input');
    });

    it('should suggest upgrades for impossible connections', () => {
      const analysis = registry.analyzeCapabilityGap(
        'source-widget',
        'missing.output',
        'target-widget',
        'missing.input'
      );

      expect(analysis.suggestedUpgrades).toBeDefined();
      expect(analysis.suggestedUpgrades!.length).toBeGreaterThan(0);
    });
  });

  describe('findAllPossibleConnections', () => {
    beforeEach(() => {
      registry.registerWidget(
        createManifest({
          id: 'widget-a',
          io: { inputs: ['text.set'], outputs: ['button.pressed'] },
        })
      );
      registry.registerWidget(
        createManifest({
          id: 'widget-b',
          io: { inputs: ['timer.start'], outputs: ['text.changed'] },
        })
      );
    });

    it('should find connections as source', () => {
      const result = registry.findAllPossibleConnections('widget-a');
      expect(result.asSource.length).toBeGreaterThan(0);
    });

    it('should find connections as target', () => {
      const result = registry.findAllPossibleConnections('widget-a');
      expect(result.asTarget.length).toBeGreaterThan(0);
    });

    it('should not include self-connections', () => {
      const result = registry.findAllPossibleConnections('widget-a');

      result.asSource.forEach(conn => {
        expect(conn.targetWidget).not.toBe('widget-a');
      });
      result.asTarget.forEach(conn => {
        expect(conn.sourceWidget).not.toBe('widget-a');
      });
    });
  });

  describe('validateCapabilityDeclaration', () => {
    it('should validate correct declaration', () => {
      const declaration: WidgetCapabilityDeclaration = {
        inputs: ['text.set', 'timer.start'],
        outputs: ['button.pressed', 'ready'],
      };

      const result = registry.validateCapabilityDeclaration(declaration);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn on non-standard capability without domain.action format', () => {
      const declaration: WidgetCapabilityDeclaration = {
        inputs: ['invalid'], // Single word is parsed as valid domain with 'unknown' action
        outputs: [],
      };

      const result = registry.validateCapabilityDeclaration(declaration);
      // Single word without dot gets parsed as {domain: 'invalid', action: 'unknown'}
      // This creates a warning, not an error
      expect(result.warnings.some(w => w.includes('Non-standard'))).toBe(true);
    });

    it('should warn on non-standard capabilities', () => {
      const declaration: WidgetCapabilityDeclaration = {
        inputs: ['mywidget.customAction'],
        outputs: ['mywidget.customEvent'],
      };

      const result = registry.validateCapabilityDeclaration(declaration);
      expect(result.warnings.some(w => w.includes('Non-standard'))).toBe(true);
    });

    it('should error on wrong custom capability direction', () => {
      const declaration: WidgetCapabilityDeclaration = {
        inputs: ['mywidget.custom'],
        outputs: [],
        customInputs: [
          {
            id: 'mywidget.custom',
            name: 'Custom',
            description: 'Wrong direction',
            direction: 'output', // Should be input!
            payload: [],
          },
        ],
      };

      const result = registry.validateCapabilityDeclaration(declaration);
      expect(result.errors.some(e => e.includes('wrong direction'))).toBe(true);
    });

    it('should warn when custom capability not in array', () => {
      const declaration: WidgetCapabilityDeclaration = {
        inputs: [], // Not declared here
        outputs: [],
        customInputs: [
          {
            id: 'mywidget.custom',
            name: 'Custom',
            description: 'Not in inputs array',
            direction: 'input',
            payload: [],
          },
        ],
      };

      const result = registry.validateCapabilityDeclaration(declaration);
      expect(result.warnings.some(w => w.includes('not declared'))).toBe(true);
    });
  });
});
