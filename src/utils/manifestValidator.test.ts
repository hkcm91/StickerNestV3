/**
 * StickerNest v2 - Manifest Validator Tests
 * Unit tests for widget manifest validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateManifest,
  validateAndMigrate,
  migrateManifest,
  formatValidationErrors,
  type ValidationResult
} from './manifestValidator';

describe('manifestValidator', () => {
  // ==================
  // Valid Manifests
  // ==================

  describe('valid manifests', () => {
    it('should accept minimal valid manifest', () => {
      const manifest = {
        id: 'my-widget',
        name: 'My Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept full valid manifest', () => {
      const manifest = {
        id: 'full-widget',
        name: 'Full Widget',
        version: '2.1.0',
        kind: '2d',
        entry: 'index.html',
        description: 'A fully specified widget',
        author: 'StickerNest',
        tags: ['test', 'demo'],
        capabilities: {
          draggable: true,
          resizable: true,
          rotatable: true
        },
        inputs: {
          textInput: {
            type: 'string',
            description: 'Text to display',
            required: true
          }
        },
        outputs: {
          clicked: {
            type: 'trigger',
            description: 'Emitted on click'
          }
        },
        protocolVersion: 1
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept all valid widget kinds', () => {
      const kinds = ['2d', '3d', 'audio', 'video', 'hybrid'];

      for (const kind of kinds) {
        const manifest = {
          id: `widget-${kind}`,  // Use widget- prefix to avoid starting with number
          name: 'Test Widget',
          version: '1.0.0',
          kind,
          entry: 'index.html'
        };

        const result = validateManifest(manifest);
        expect(result.valid).toBe(true);
      }
    });

    it('should accept all valid port types', () => {
      const types = ['string', 'number', 'boolean', 'object', 'array', 'trigger', 'any'];

      const manifest = {
        id: 'port-types-widget',
        name: 'Port Types Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        outputs: Object.fromEntries(
          types.map((type, i) => [`output${i}`, { type, description: `${type} output` }])
        )
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it('should accept semver with prerelease', () => {
      const manifest = {
        id: 'beta-widget',
        name: 'Beta Widget',
        version: '1.0.0-beta.1',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  // ==================
  // Required Fields
  // ==================

  describe('required fields', () => {
    it('should reject missing id', () => {
      const manifest = {
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'id', message: 'id is required' })
      );
    });

    it('should reject missing name', () => {
      const manifest = {
        id: 'my-widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'name' })
      );
    });

    it('should reject missing version', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'version' })
      );
    });

    it('should reject missing kind', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'kind' })
      );
    });

    it('should reject missing entry', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: 'entry' })
      );
    });
  });

  // ==================
  // ID Validation
  // ==================

  describe('id validation', () => {
    it('should reject uppercase in id', () => {
      const manifest = {
        id: 'MyWidget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'id',
          message: expect.stringContaining('lowercase')
        })
      );
    });

    it('should reject id starting with number', () => {
      const manifest = {
        id: '123-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
    });

    it('should reject id with spaces', () => {
      const manifest = {
        id: 'my widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
    });

    it('should reject id too short', () => {
      const manifest = {
        id: 'a',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'id',
          message: expect.stringContaining('at least 2')
        })
      );
    });

    it('should accept valid hyphenated id', () => {
      const manifest = {
        id: 'my-cool-widget-v2',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  // ==================
  // Version Validation
  // ==================

  describe('version validation', () => {
    it('should reject invalid version format', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: 'v1.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'version',
          message: expect.stringContaining('semver')
        })
      );
    });

    it('should reject version without patch', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
    });
  });

  // ==================
  // Kind Validation
  // ==================

  describe('kind validation', () => {
    it('should reject invalid kind', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: 'invalid',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'kind',
          message: expect.stringContaining('2d, 3d, audio')
        })
      );
    });
  });

  // ==================
  // Port Validation
  // ==================

  describe('port validation', () => {
    it('should reject port without type', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        outputs: {
          badPort: {
            description: 'Missing type'
          }
        }
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'outputs.badPort.type'
        })
      );
    });

    it('should reject invalid port type', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        inputs: {
          badPort: {
            type: 'invalid-type'
          }
        }
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'inputs.badPort.type',
          message: expect.stringContaining('string, number, boolean')
        })
      );
    });

    it('should warn on port without description', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        outputs: {
          noDesc: {
            type: 'string'
          }
        }
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          path: 'outputs.noDesc.description',
          message: expect.stringContaining('description is recommended')
        })
      );
    });
  });

  // ==================
  // Capability Validation
  // ==================

  describe('capability validation', () => {
    it('should reject non-boolean capability', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        capabilities: {
          draggable: 'yes'
        }
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'capabilities.draggable',
          message: 'must be a boolean'
        })
      );
    });

    it('should accept valid capabilities', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        capabilities: {
          draggable: true,
          resizable: false,
          rotatable: true,
          supports3d: false
        }
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });
  });

  // ==================
  // IO Declaration Validation
  // ==================

  describe('io declaration validation', () => {
    it('should accept valid io declaration', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        io: {
          inputs: ['text.set', 'ui.show'],
          outputs: ['button.pressed', 'state.changed']
        }
      };

      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid capability id format', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        io: {
          inputs: ['invalid_format'],
          outputs: []
        }
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'io.inputs[0]',
          message: expect.stringContaining('domain.action')
        })
      );
    });
  });

  // ==================
  // Protocol Version
  // ==================

  describe('protocol version', () => {
    it('should warn when protocolVersion is missing', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          path: 'protocolVersion',
          message: expect.stringContaining('defaulting to 1')
        })
      );
    });

    it('should reject invalid protocolVersion', () => {
      const manifest = {
        id: 'my-widget',
        name: 'Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        protocolVersion: 0
      };

      const result = validateManifest(manifest);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'protocolVersion',
          message: expect.stringContaining('positive integer')
        })
      );
    });
  });

  // ==================
  // Migration
  // ==================

  describe('manifest migration', () => {
    it('should add default capabilities when missing', () => {
      const manifest = {
        id: 'old-widget',
        name: 'Old Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const migrated = migrateManifest(manifest as any);

      expect(migrated.capabilities).toEqual({
        draggable: true,
        resizable: true
      });
    });

    it('should add empty inputs/outputs when missing', () => {
      const manifest = {
        id: 'old-widget',
        name: 'Old Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const migrated = migrateManifest(manifest as any);

      expect(migrated.inputs).toEqual({});
      expect(migrated.outputs).toEqual({});
    });

    it('should preserve existing capabilities', () => {
      const manifest = {
        id: 'old-widget',
        name: 'Old Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html',
        capabilities: {
          draggable: false,
          resizable: true,
          rotatable: true
        }
      };

      const migrated = migrateManifest(manifest as any);

      expect(migrated.capabilities).toEqual({
        draggable: false,
        resizable: true,
        rotatable: true
      });
    });

    it('validateAndMigrate should return migrated manifest', () => {
      const manifest = {
        id: 'old-widget',
        name: 'Old Widget',
        version: '1.0.0',
        kind: '2d',
        entry: 'index.html'
      };

      const result = validateAndMigrate(manifest);

      expect(result.valid).toBe(true);
      expect(result.manifest?.capabilities).toEqual({
        draggable: true,
        resizable: true
      });
    });
  });

  // ==================
  // Edge Cases
  // ==================

  describe('edge cases', () => {
    it('should reject null manifest', () => {
      const result = validateManifest(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: 'Manifest must be an object'
        })
      );
    });

    it('should reject non-object manifest', () => {
      const result = validateManifest('not an object');

      expect(result.valid).toBe(false);
    });

    it('should reject array manifest', () => {
      const result = validateManifest([]);

      expect(result.valid).toBe(false);
    });
  });

  // ==================
  // Error Formatting
  // ==================

  describe('formatValidationErrors', () => {
    it('should format valid result', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };

      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('Manifest is valid');
    });

    it('should format errors', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          { path: 'id', message: 'id is required' },
          { path: 'kind', message: 'invalid kind', value: 'bad' }
        ],
        warnings: []
      };

      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('2 error(s)');
      expect(formatted).toContain('id: id is required');
      expect(formatted).toContain('kind: invalid kind');
      expect(formatted).toContain('got: "bad"');
    });

    it('should format warnings', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          { path: 'description', message: 'description is recommended' }
        ]
      };

      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('1 warning(s)');
      expect(formatted).toContain('description: description is recommended');
    });
  });
});
