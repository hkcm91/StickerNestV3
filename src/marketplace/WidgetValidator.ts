/**
 * StickerNest v2 - Widget Validator
 *
 * Validates widget manifests and code before publishing.
 * Ensures widgets conform to protocol specifications and security requirements.
 */

import type { WidgetManifest, WidgetInputSchema, WidgetOutputSchema } from '../types/manifest';
import type { ValidationResult, ValidationIssue, ValidationSeverity } from '../types/widget';
import { WIDGET_PROTOCOL_VERSION } from '../types/widget';

// ============================================================================
// VALIDATION RULES
// ============================================================================

const MANIFEST_REQUIRED_FIELDS = ['id', 'name', 'version', 'kind', 'entry'];

const VALID_WIDGET_KINDS = ['display', 'interactive', 'container', 'data', 'utility'];

const VERSION_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;

const PACKAGE_ID_REGEX = /^[a-z][a-z0-9.-]*\.[a-z][a-z0-9.-]*$/;

const ENTRY_FILE_EXTENSIONS = ['.html', '.js', '.ts', '.tsx', '.mjs'];

const FORBIDDEN_CODE_PATTERNS = [
  { pattern: /eval\s*\(/, message: 'Use of eval() is forbidden', severity: 'error' as ValidationSeverity },
  { pattern: /Function\s*\(/, message: 'Use of Function constructor is forbidden', severity: 'error' as ValidationSeverity },
  { pattern: /document\.write/, message: 'Use of document.write is forbidden', severity: 'error' as ValidationSeverity },
  { pattern: /innerHTML\s*=(?!\s*['"`]\s*['"`])/, message: 'Direct innerHTML assignment may be unsafe', severity: 'warning' as ValidationSeverity },
  { pattern: /\.cookie\s*=/, message: 'Direct cookie manipulation is forbidden', severity: 'error' as ValidationSeverity },
  { pattern: /localStorage\s*\.\s*(setItem|getItem|removeItem|clear)/, message: 'Direct localStorage access should use WidgetAPI.getStorage()', severity: 'warning' as ValidationSeverity },
  { pattern: /window\s*\.\s*open/, message: 'Use of window.open is discouraged', severity: 'warning' as ValidationSeverity },
  { pattern: /window\s*\.\s*location\s*=/, message: 'Navigation via window.location is forbidden', severity: 'error' as ValidationSeverity },
  { pattern: /XMLHttpRequest/, message: 'Use WidgetAPI.getNetwork().fetch() instead of XMLHttpRequest', severity: 'warning' as ValidationSeverity },
  { pattern: /fetch\s*\((?!.*WidgetAPI)/, message: 'Consider using WidgetAPI.getNetwork().fetch() for network requests', severity: 'info' as ValidationSeverity },
];

const MAX_CODE_SIZE = 500 * 1024; // 500KB
const MAX_ASSET_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_TOTAL_BUNDLE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationOptions {
  /** Validate code content */
  validateCode?: boolean;
  /** Validate assets */
  validateAssets?: boolean;
  /** Strict mode - warnings become errors */
  strict?: boolean;
  /** Allow beta/preview features */
  allowBeta?: boolean;
}

export interface ValidatedWidget {
  manifest: WidgetManifest;
  code: string;
  assets?: Map<string, { content: Uint8Array | string; size: number }>;
  validation: ValidationResult;
}

// ============================================================================
// MANIFEST VALIDATION
// ============================================================================

function validateManifestStructure(manifest: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!manifest || typeof manifest !== 'object') {
    issues.push({
      severity: 'error',
      code: 'INVALID_MANIFEST',
      message: 'Manifest must be a valid JSON object',
    });
    return issues;
  }

  const m = manifest as Record<string, unknown>;

  // Check required fields
  for (const field of MANIFEST_REQUIRED_FIELDS) {
    if (!(field in m) || m[field] === undefined || m[field] === null) {
      issues.push({
        severity: 'error',
        code: 'MISSING_REQUIRED_FIELD',
        message: `Missing required field: ${field}`,
        path: field,
      });
    }
  }

  return issues;
}

function validateManifestFields(manifest: WidgetManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate ID format
  if (!PACKAGE_ID_REGEX.test(manifest.id)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_ID_FORMAT',
      message: 'Widget ID must be in format: namespace.widget-name (lowercase, dots and hyphens only)',
      path: 'id',
      suggestion: 'Example: mycompany.my-widget',
    });
  }

  // Validate version format
  if (!VERSION_REGEX.test(manifest.version)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_VERSION_FORMAT',
      message: 'Version must follow semantic versioning (e.g., 1.0.0)',
      path: 'version',
      suggestion: 'Use format: MAJOR.MINOR.PATCH (e.g., 1.0.0, 2.1.3-beta)',
    });
  }

  // Validate kind
  if (!VALID_WIDGET_KINDS.includes(manifest.kind)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_KIND',
      message: `Invalid widget kind: ${manifest.kind}`,
      path: 'kind',
      suggestion: `Valid kinds are: ${VALID_WIDGET_KINDS.join(', ')}`,
    });
  }

  // Validate entry file extension
  const hasValidExtension = ENTRY_FILE_EXTENSIONS.some(ext => manifest.entry.endsWith(ext));
  if (!hasValidExtension) {
    issues.push({
      severity: 'error',
      code: 'INVALID_ENTRY_FILE',
      message: `Entry file must have a valid extension: ${ENTRY_FILE_EXTENSIONS.join(', ')}`,
      path: 'entry',
    });
  }

  // Validate name length
  if (manifest.name.length < 2 || manifest.name.length > 64) {
    issues.push({
      severity: 'error',
      code: 'INVALID_NAME_LENGTH',
      message: 'Widget name must be between 2 and 64 characters',
      path: 'name',
    });
  }

  // Validate description
  if (manifest.description && manifest.description.length > 500) {
    issues.push({
      severity: 'warning',
      code: 'DESCRIPTION_TOO_LONG',
      message: 'Description should be under 500 characters',
      path: 'description',
    });
  }

  // Validate inputs schema
  if (manifest.inputs) {
    for (const [name, schema] of Object.entries(manifest.inputs)) {
      const inputIssues = validateInputSchema(name, schema);
      issues.push(...inputIssues);
    }
  }

  // Validate outputs schema
  if (manifest.outputs) {
    for (const [name, schema] of Object.entries(manifest.outputs)) {
      const outputIssues = validateOutputSchema(name, schema);
      issues.push(...outputIssues);
    }
  }

  // Validate size constraints
  if (manifest.size) {
    const { width, height, minWidth, minHeight, maxWidth, maxHeight } = manifest.size;

    if (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth) {
      issues.push({
        severity: 'error',
        code: 'INVALID_SIZE_CONSTRAINT',
        message: 'minWidth cannot be greater than maxWidth',
        path: 'size',
      });
    }

    if (minHeight !== undefined && maxHeight !== undefined && minHeight > maxHeight) {
      issues.push({
        severity: 'error',
        code: 'INVALID_SIZE_CONSTRAINT',
        message: 'minHeight cannot be greater than maxHeight',
        path: 'size',
      });
    }

    if (width !== undefined && (width < 10 || width > 10000)) {
      issues.push({
        severity: 'warning',
        code: 'UNUSUAL_SIZE',
        message: 'Default width seems unusual (should be between 10 and 10000)',
        path: 'size.width',
      });
    }
  }

  return issues;
}

function validateInputSchema(name: string, schema: WidgetInputSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'any'];

  if (!validTypes.includes(schema.type)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_INPUT_TYPE',
      message: `Invalid input type for '${name}': ${schema.type}`,
      path: `inputs.${name}.type`,
      suggestion: `Valid types are: ${validTypes.join(', ')}`,
    });
  }

  return issues;
}

function validateOutputSchema(name: string, schema: WidgetOutputSchema): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const validTypes = ['string', 'number', 'boolean', 'object', 'array', 'any', 'event', 'trigger'];

  if (!validTypes.includes(schema.type)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_OUTPUT_TYPE',
      message: `Invalid output type for '${name}': ${schema.type}`,
      path: `outputs.${name}.type`,
      suggestion: `Valid types are: ${validTypes.join(', ')}`,
    });
  }

  return issues;
}

// ============================================================================
// CODE VALIDATION
// ============================================================================

function validateCode(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check code size
  const codeSize = new Blob([code]).size;
  if (codeSize > MAX_CODE_SIZE) {
    issues.push({
      severity: 'error',
      code: 'CODE_TOO_LARGE',
      message: `Code size (${(codeSize / 1024).toFixed(2)}KB) exceeds maximum allowed (${MAX_CODE_SIZE / 1024}KB)`,
    });
  }

  // Check for forbidden patterns
  for (const { pattern, message, severity } of FORBIDDEN_CODE_PATTERNS) {
    if (pattern.test(code)) {
      issues.push({
        severity,
        code: 'FORBIDDEN_PATTERN',
        message,
      });
    }
  }

  // Check for WidgetAPI usage
  if (!code.includes('WidgetAPI') && !code.includes('window.WidgetAPI')) {
    issues.push({
      severity: 'warning',
      code: 'NO_WIDGET_API',
      message: 'Widget does not appear to use WidgetAPI - ensure it uses the injected API',
      suggestion: 'Access WidgetAPI via window.WidgetAPI or use the provided API parameter',
    });
  }

  // Check for READY signal
  if (!code.includes('READY') && !code.includes('widget:ready') && !code.includes('postToParent')) {
    issues.push({
      severity: 'warning',
      code: 'NO_READY_SIGNAL',
      message: 'Widget may not send READY signal - ensure WidgetAPI is properly initialized',
      suggestion: 'WidgetAPI automatically sends READY signal when initialized',
    });
  }

  return issues;
}

// ============================================================================
// ASSET VALIDATION
// ============================================================================

function validateAssets(assets: Map<string, { content: Uint8Array | string; size: number }>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let totalSize = 0;

  for (const [path, asset] of assets) {
    totalSize += asset.size;

    // Check individual asset size
    if (asset.size > MAX_ASSET_SIZE) {
      issues.push({
        severity: 'error',
        code: 'ASSET_TOO_LARGE',
        message: `Asset '${path}' (${(asset.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${MAX_ASSET_SIZE / 1024 / 1024}MB)`,
        path,
      });
    }

    // Validate file extension
    const ext = path.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['js', 'ts', 'tsx', 'html', 'css', 'json', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'woff', 'woff2', 'ttf', 'eot'];
    if (ext && !allowedExtensions.includes(ext)) {
      issues.push({
        severity: 'warning',
        code: 'UNUSUAL_ASSET_TYPE',
        message: `Asset '${path}' has unusual file extension: .${ext}`,
        path,
      });
    }
  }

  // Check total bundle size
  if (totalSize > MAX_TOTAL_BUNDLE_SIZE) {
    issues.push({
      severity: 'error',
      code: 'BUNDLE_TOO_LARGE',
      message: `Total bundle size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${MAX_TOTAL_BUNDLE_SIZE / 1024 / 1024}MB)`,
    });
  }

  return issues;
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

export class WidgetValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      validateCode: true,
      validateAssets: true,
      strict: false,
      allowBeta: false,
      ...options,
    };
  }

  /**
   * Validate a widget manifest
   */
  validateManifest(manifest: unknown): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Structure validation
    issues.push(...validateManifestStructure(manifest));

    // If structure is invalid, return early
    const hasStructureErrors = issues.some(i => i.severity === 'error');
    if (hasStructureErrors) {
      return {
        valid: false,
        issues,
        protocolVersion: WIDGET_PROTOCOL_VERSION,
      };
    }

    // Field validation
    issues.push(...validateManifestFields(manifest as WidgetManifest));

    // Apply strict mode
    if (this.options.strict) {
      for (const issue of issues) {
        if (issue.severity === 'warning') {
          issue.severity = 'error';
        }
      }
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      manifestVersion: (manifest as WidgetManifest).version,
      protocolVersion: WIDGET_PROTOCOL_VERSION,
    };
  }

  /**
   * Validate widget code
   */
  validateWidgetCode(code: string): ValidationResult {
    if (!this.options.validateCode) {
      return { valid: true, issues: [], protocolVersion: WIDGET_PROTOCOL_VERSION };
    }

    const issues = validateCode(code);

    if (this.options.strict) {
      for (const issue of issues) {
        if (issue.severity === 'warning') {
          issue.severity = 'error';
        }
      }
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      protocolVersion: WIDGET_PROTOCOL_VERSION,
    };
  }

  /**
   * Validate widget assets
   */
  validateWidgetAssets(
    assets: Map<string, { content: Uint8Array | string; size: number }>
  ): ValidationResult {
    if (!this.options.validateAssets) {
      return { valid: true, issues: [], protocolVersion: WIDGET_PROTOCOL_VERSION };
    }

    const issues = validateAssets(assets);

    if (this.options.strict) {
      for (const issue of issues) {
        if (issue.severity === 'warning') {
          issue.severity = 'error';
        }
      }
    }

    const hasErrors = issues.some(i => i.severity === 'error');

    return {
      valid: !hasErrors,
      issues,
      protocolVersion: WIDGET_PROTOCOL_VERSION,
    };
  }

  /**
   * Full widget validation
   */
  validate(
    manifest: unknown,
    code: string,
    assets?: Map<string, { content: Uint8Array | string; size: number }>
  ): ValidatedWidget | null {
    const manifestResult = this.validateManifest(manifest);
    const codeResult = this.validateWidgetCode(code);
    const assetResult = assets
      ? this.validateWidgetAssets(assets)
      : { valid: true, issues: [], protocolVersion: WIDGET_PROTOCOL_VERSION };

    const allIssues = [
      ...manifestResult.issues,
      ...codeResult.issues,
      ...assetResult.issues,
    ];

    const isValid = manifestResult.valid && codeResult.valid && assetResult.valid;

    const validation: ValidationResult = {
      valid: isValid,
      issues: allIssues,
      manifestVersion: manifestResult.manifestVersion,
      protocolVersion: WIDGET_PROTOCOL_VERSION,
    };

    if (!manifestResult.valid) {
      return null;
    }

    return {
      manifest: manifest as WidgetManifest,
      code,
      assets,
      validation,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const validateWidget = (
  manifest: unknown,
  code: string,
  assets?: Map<string, { content: Uint8Array | string; size: number }>,
  options?: ValidationOptions
): ValidatedWidget | null => {
  const validator = new WidgetValidator(options);
  return validator.validate(manifest, code, assets);
};

export const validateManifest = (
  manifest: unknown,
  options?: ValidationOptions
): ValidationResult => {
  const validator = new WidgetValidator(options);
  return validator.validateManifest(manifest);
};
