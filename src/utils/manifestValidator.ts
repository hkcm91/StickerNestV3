/**
 * StickerNest v2 - Manifest Validator
 * Validates widget manifests against the protocol specification
 */

import type { WidgetManifest } from '../types/manifest';

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  manifest?: WidgetManifest;
}

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
const ENTRY_PATTERN = /^[a-zA-Z0-9_./-]+$/;
const CAPABILITY_PATTERN = /^[a-z]+\.[a-zA-Z]+$/;

const VALID_KINDS = ['2d', '3d', 'audio', 'video', 'hybrid'];
const VALID_PORT_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'trigger', 'any'];

/**
 * Validate a widget manifest
 */
export function validateManifest(manifest: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!manifest || typeof manifest !== 'object') {
    return {
      valid: false,
      errors: [{ path: '', message: 'Manifest must be an object' }],
      warnings: []
    };
  }

  const m = manifest as Record<string, any>;

  // Required fields
  validateRequired(m, 'id', errors);
  validateRequired(m, 'name', errors);
  validateRequired(m, 'version', errors);
  validateRequired(m, 'kind', errors);
  validateRequired(m, 'entry', errors);

  // Field formats
  if (m.id) {
    validateString(m.id, 'id', errors, {
      pattern: ID_PATTERN,
      minLength: 2,
      maxLength: 64,
      patternMessage: 'id must be lowercase alphanumeric with hyphens, starting with a letter'
    });
  }

  if (m.name) {
    validateString(m.name, 'name', errors, { minLength: 1, maxLength: 100 });
  }

  if (m.version) {
    validateString(m.version, 'version', errors, {
      pattern: VERSION_PATTERN,
      patternMessage: 'version must follow semver format (e.g., 1.0.0)'
    });
  }

  if (m.kind) {
    validateEnum(m.kind, 'kind', VALID_KINDS, errors);
  }

  if (m.entry) {
    validateString(m.entry, 'entry', errors, {
      pattern: ENTRY_PATTERN,
      patternMessage: 'entry must be a valid file path'
    });
  }

  // Optional fields
  if (m.description !== undefined) {
    validateString(m.description, 'description', errors, { maxLength: 500 });
  }

  if (m.author !== undefined) {
    validateString(m.author, 'author', errors, { maxLength: 100 });
  }

  if (m.tags !== undefined) {
    validateArray(m.tags, 'tags', errors, {
      maxItems: 10,
      itemValidator: (item, index) => {
        if (typeof item !== 'string') {
          errors.push({ path: `tags[${index}]`, message: 'must be a string', value: item });
          return false;
        }
        if (item.length > 32) {
          errors.push({ path: `tags[${index}]`, message: 'must be 32 characters or less', value: item });
          return false;
        }
        return true;
      }
    });
  }

  // Validate inputs
  if (m.inputs !== undefined) {
    validatePorts(m.inputs, 'inputs', errors, warnings);
  }

  // Validate outputs
  if (m.outputs !== undefined) {
    validatePorts(m.outputs, 'outputs', errors, warnings);
  }

  // Validate capabilities
  if (m.capabilities !== undefined) {
    validateCapabilities(m.capabilities, errors);
  }

  // Validate io declarations
  if (m.io !== undefined) {
    validateIoDeclaration(m.io, errors, warnings);
  }

  // Validate assets
  if (m.assets !== undefined) {
    validateArray(m.assets, 'assets', errors, {
      itemValidator: (item, index) => {
        if (typeof item !== 'string') {
          errors.push({ path: `assets[${index}]`, message: 'must be a string', value: item });
          return false;
        }
        if (!ENTRY_PATTERN.test(item)) {
          errors.push({ path: `assets[${index}]`, message: 'must be a valid file path', value: item });
          return false;
        }
        return true;
      }
    });
  }

  // Protocol version warning
  if (m.protocolVersion === undefined) {
    warnings.push({
      path: 'protocolVersion',
      message: 'protocolVersion not specified, defaulting to 1'
    });
  } else if (typeof m.protocolVersion !== 'number' || m.protocolVersion < 1) {
    errors.push({
      path: 'protocolVersion',
      message: 'must be a positive integer',
      value: m.protocolVersion
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest: errors.length === 0 ? (m as WidgetManifest) : undefined
  };
}

/**
 * Validate manifest and migrate to current version
 */
export function validateAndMigrate(manifest: unknown): ValidationResult {
  const result = validateManifest(manifest);

  if (result.valid && result.manifest) {
    // Apply migrations for older protocol versions
    const migrated = migrateManifest(result.manifest);
    return { ...result, manifest: migrated };
  }

  return result;
}

/**
 * Migrate manifest to current protocol version
 */
export function migrateManifest(manifest: WidgetManifest): WidgetManifest {
  const version = (manifest as any).protocolVersion || 0;
  const migrated = { ...manifest };

  if (version < 1) {
    // Add default capabilities if missing
    if (!migrated.capabilities) {
      migrated.capabilities = {
        draggable: true,
        resizable: true
      };
    }

    // Ensure inputs/outputs exist
    if (!migrated.inputs) migrated.inputs = {};
    if (!migrated.outputs) migrated.outputs = {};

    // Set protocol version
    (migrated as any).protocolVersion = 1;
  }

  return migrated;
}

// === Validation Helpers ===

function validateRequired(obj: Record<string, any>, field: string, errors: ValidationError[]): void {
  if (obj[field] === undefined || obj[field] === null) {
    errors.push({ path: field, message: `${field} is required` });
  }
}

interface StringOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

function validateString(
  value: unknown,
  path: string,
  errors: ValidationError[],
  options: StringOptions = {}
): void {
  if (typeof value !== 'string') {
    errors.push({ path, message: 'must be a string', value });
    return;
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push({ path, message: `must be at least ${options.minLength} characters`, value });
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push({ path, message: `must be at most ${options.maxLength} characters`, value });
  }

  if (options.pattern && !options.pattern.test(value)) {
    errors.push({
      path,
      message: options.patternMessage || 'invalid format',
      value
    });
  }
}

function validateEnum(value: unknown, path: string, validValues: string[], errors: ValidationError[]): void {
  if (!validValues.includes(value as string)) {
    errors.push({
      path,
      message: `must be one of: ${validValues.join(', ')}`,
      value
    });
  }
}

interface ArrayOptions {
  maxItems?: number;
  itemValidator?: (item: any, index: number) => boolean;
}

function validateArray(
  value: unknown,
  path: string,
  errors: ValidationError[],
  options: ArrayOptions = {}
): void {
  if (!Array.isArray(value)) {
    errors.push({ path, message: 'must be an array', value });
    return;
  }

  if (options.maxItems !== undefined && value.length > options.maxItems) {
    errors.push({ path, message: `must have at most ${options.maxItems} items`, value: value.length });
  }

  if (options.itemValidator) {
    value.forEach((item, index) => options.itemValidator!(item, index));
  }
}

function validatePorts(
  ports: unknown,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (typeof ports !== 'object' || ports === null) {
    errors.push({ path, message: 'must be an object', value: ports });
    return;
  }

  for (const [portName, portDef] of Object.entries(ports)) {
    const portPath = `${path}.${portName}`;

    if (typeof portDef !== 'object' || portDef === null) {
      errors.push({ path: portPath, message: 'must be an object', value: portDef });
      continue;
    }

    const p = portDef as Record<string, any>;

    // Type is required
    if (!p.type) {
      errors.push({ path: `${portPath}.type`, message: 'type is required' });
    } else if (!VALID_PORT_TYPES.includes(p.type)) {
      errors.push({
        path: `${portPath}.type`,
        message: `must be one of: ${VALID_PORT_TYPES.join(', ')}`,
        value: p.type
      });
    }

    // Description warning
    if (!p.description) {
      warnings.push({
        path: `${portPath}.description`,
        message: 'description is recommended for better discoverability'
      });
    }
  }
}

function validateCapabilities(caps: unknown, errors: ValidationError[]): void {
  if (typeof caps !== 'object' || caps === null) {
    errors.push({ path: 'capabilities', message: 'must be an object', value: caps });
    return;
  }

  const c = caps as Record<string, any>;
  const booleanFields = ['draggable', 'resizable', 'rotatable', 'supports3d', 'supportsAudio'];

  for (const field of booleanFields) {
    if (c[field] !== undefined && typeof c[field] !== 'boolean') {
      errors.push({
        path: `capabilities.${field}`,
        message: 'must be a boolean',
        value: c[field]
      });
    }
  }
}

function validateIoDeclaration(
  io: unknown,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (typeof io !== 'object' || io === null) {
    errors.push({ path: 'io', message: 'must be an object', value: io });
    return;
  }

  const ioObj = io as Record<string, any>;

  // Validate inputs array
  if (ioObj.inputs !== undefined) {
    validateCapabilityIds(ioObj.inputs, 'io.inputs', errors);
  }

  // Validate outputs array
  if (ioObj.outputs !== undefined) {
    validateCapabilityIds(ioObj.outputs, 'io.outputs', errors);
  }

  // Validate custom definitions
  if (ioObj.customInputs !== undefined) {
    validateCustomCapabilities(ioObj.customInputs, 'io.customInputs', 'input', errors);
  }

  if (ioObj.customOutputs !== undefined) {
    validateCustomCapabilities(ioObj.customOutputs, 'io.customOutputs', 'output', errors);
  }
}

function validateCapabilityIds(ids: unknown, path: string, errors: ValidationError[]): void {
  if (!Array.isArray(ids)) {
    errors.push({ path, message: 'must be an array', value: ids });
    return;
  }

  ids.forEach((id, index) => {
    if (typeof id !== 'string') {
      errors.push({ path: `${path}[${index}]`, message: 'must be a string', value: id });
    } else if (!CAPABILITY_PATTERN.test(id)) {
      errors.push({
        path: `${path}[${index}]`,
        message: 'must follow domain.action format',
        value: id
      });
    }
  });
}

function validateCustomCapabilities(
  caps: unknown,
  path: string,
  expectedDirection: 'input' | 'output',
  errors: ValidationError[]
): void {
  if (!Array.isArray(caps)) {
    errors.push({ path, message: 'must be an array', value: caps });
    return;
  }

  caps.forEach((cap, index) => {
    const capPath = `${path}[${index}]`;

    if (typeof cap !== 'object' || cap === null) {
      errors.push({ path: capPath, message: 'must be an object', value: cap });
      return;
    }

    const c = cap as Record<string, any>;

    // Required fields
    if (!c.id) errors.push({ path: `${capPath}.id`, message: 'id is required' });
    if (!c.name) errors.push({ path: `${capPath}.name`, message: 'name is required' });
    if (!c.description) errors.push({ path: `${capPath}.description`, message: 'description is required' });
    if (!c.direction) {
      errors.push({ path: `${capPath}.direction`, message: 'direction is required' });
    } else if (c.direction !== expectedDirection) {
      errors.push({
        path: `${capPath}.direction`,
        message: `must be "${expectedDirection}"`,
        value: c.direction
      });
    }
  });
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('Manifest is valid');
  } else {
    lines.push(`Validation failed with ${result.errors.length} error(s):`);
    result.errors.forEach(e => {
      lines.push(`  - ${e.path}: ${e.message}${e.value !== undefined ? ` (got: ${JSON.stringify(e.value)})` : ''}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push(`\n${result.warnings.length} warning(s):`);
    result.warnings.forEach(w => {
      lines.push(`  - ${w.path}: ${w.message}`);
    });
  }

  return lines.join('\n');
}
