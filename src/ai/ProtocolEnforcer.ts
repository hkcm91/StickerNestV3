/**
 * StickerNest v2 - Protocol Enforcer
 * Validates all AI-generated output against StickerNest protocol rules
 * Ensures widgets, manifests, and pipelines conform to specifications
 */

import type { WidgetManifest } from '../types/manifest';
import type { WidgetKind, WidgetCapabilities, Pipeline, PipelineConnection } from '../types/domain';

/** Validation result for a single check */
export interface ValidationCheck {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  location?: string;
  suggestion?: string;
}

/** Complete validation result */
export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  checks: ValidationCheck[];
  errors: ValidationCheck[];
  warnings: ValidationCheck[];
  suggestions: string[];
}

/** Widget code structure for validation */
export interface WidgetCode {
  html: string;
  manifest: WidgetManifest;
  additionalFiles?: Record<string, string>;
}

/** Dangerous code patterns to detect */
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/, name: 'eval()', severity: 'error' as const },
  { pattern: /new\s+Function\s*\(/, name: 'new Function()', severity: 'error' as const },
  { pattern: /document\.write\s*\(/, name: 'document.write()', severity: 'error' as const },
  { pattern: /\.innerHTML\s*=\s*[^'"`]/, name: 'innerHTML with variable', severity: 'warning' as const },
  { pattern: /parent\.document/, name: 'parent.document access', severity: 'error' as const },
  { pattern: /top\.document/, name: 'top.document access', severity: 'error' as const },
  { pattern: /window\.parent(?!\.postMessage)/, name: 'window.parent access', severity: 'warning' as const },
  { pattern: /localStorage\.(get|set)Item/, name: 'localStorage access', severity: 'warning' as const },
  { pattern: /sessionStorage\.(get|set)Item/, name: 'sessionStorage access', severity: 'warning' as const },
  { pattern: /document\.cookie/, name: 'cookie access', severity: 'warning' as const },
  { pattern: /fetch\s*\(\s*['"`]http/, name: 'external HTTP fetch', severity: 'warning' as const },
  { pattern: /XMLHttpRequest/, name: 'XMLHttpRequest', severity: 'warning' as const },
];

/** Required WidgetAPI patterns */
const REQUIRED_PATTERNS = [
  { pattern: /window\.WidgetAPI/, name: 'WidgetAPI reference', required: true },
  { pattern: /WidgetAPI\.(emitEvent|onEvent)/, name: 'Event handling', required: false },
];

/** Valid event naming patterns */
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9]*:[a-z][a-z0-9-]*$/;

/** Valid widget ID pattern */
const WIDGET_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Valid semver pattern */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i;

/**
 * Protocol Enforcer - validates widgets against StickerNest specifications
 */
export class ProtocolEnforcer {
  /**
   * Validate a complete widget (manifest + code)
   */
  validateWidget(widget: WidgetCode): ValidationResult {
    const checks: ValidationCheck[] = [];

    // Validate manifest
    checks.push(...this.validateManifest(widget.manifest));

    // Validate HTML/JS code
    checks.push(...this.validateCode(widget.html, widget.manifest));

    // Validate manifest-code consistency
    checks.push(...this.validateConsistency(widget.html, widget.manifest));

    // Additional files if present
    if (widget.additionalFiles) {
      for (const [filename, content] of Object.entries(widget.additionalFiles)) {
        if (filename.endsWith('.js') || filename.endsWith('.ts')) {
          checks.push(...this.validateCode(content, widget.manifest, filename));
        }
      }
    }

    return this.compileResult(checks);
  }

  /**
   * Validate manifest structure and values
   */
  validateManifest(manifest: any): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Required fields
    checks.push(this.checkRequired(manifest, 'id', 'string'));
    checks.push(this.checkRequired(manifest, 'name', 'string'));
    checks.push(this.checkRequired(manifest, 'version', 'string'));
    checks.push(this.checkRequired(manifest, 'kind', 'string'));
    checks.push(this.checkRequired(manifest, 'entry', 'string'));
    checks.push(this.checkRequired(manifest, 'capabilities', 'object'));

    // ID format
    if (manifest.id && typeof manifest.id === 'string') {
      if (!WIDGET_ID_PATTERN.test(manifest.id)) {
        checks.push({
          rule: 'manifest.id.format',
          passed: false,
          message: `Widget ID "${manifest.id}" must be lowercase alphanumeric with hyphens`,
          severity: 'error',
          location: 'manifest.id',
          suggestion: manifest.id.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        });
      } else {
        checks.push({
          rule: 'manifest.id.format',
          passed: true,
          message: 'Widget ID format is valid',
          severity: 'info',
        });
      }
    }

    // Version format
    if (manifest.version && typeof manifest.version === 'string') {
      if (!SEMVER_PATTERN.test(manifest.version)) {
        checks.push({
          rule: 'manifest.version.format',
          passed: false,
          message: `Version "${manifest.version}" must follow semver format (e.g., "1.0.0")`,
          severity: 'error',
          location: 'manifest.version',
          suggestion: '1.0.0',
        });
      } else {
        checks.push({
          rule: 'manifest.version.format',
          passed: true,
          message: 'Version format is valid',
          severity: 'info',
        });
      }
    }

    // Kind validation
    const validKinds: WidgetKind[] = ['2d', '3d', 'audio', 'video', 'hybrid'];
    if (manifest.kind && !validKinds.includes(manifest.kind)) {
      checks.push({
        rule: 'manifest.kind.valid',
        passed: false,
        message: `Kind "${manifest.kind}" must be one of: ${validKinds.join(', ')}`,
        severity: 'error',
        location: 'manifest.kind',
      });
    } else if (manifest.kind) {
      checks.push({
        rule: 'manifest.kind.valid',
        passed: true,
        message: 'Widget kind is valid',
        severity: 'info',
      });
    }

    // Capabilities validation
    if (manifest.capabilities && typeof manifest.capabilities === 'object') {
      const caps = manifest.capabilities as WidgetCapabilities;
      
      if (typeof caps.draggable !== 'boolean') {
        checks.push({
          rule: 'manifest.capabilities.draggable',
          passed: false,
          message: 'capabilities.draggable must be a boolean',
          severity: 'error',
          location: 'manifest.capabilities.draggable',
        });
      }

      if (typeof caps.resizable !== 'boolean') {
        checks.push({
          rule: 'manifest.capabilities.resizable',
          passed: false,
          message: 'capabilities.resizable must be a boolean',
          severity: 'error',
          location: 'manifest.capabilities.resizable',
        });
      }
    }

    // Entry file validation
    if (manifest.entry) {
      const validExtensions = ['.html', '.js', '.ts', '.tsx'];
      const hasValidExt = validExtensions.some(ext => manifest.entry.endsWith(ext));
      
      if (!hasValidExt) {
        checks.push({
          rule: 'manifest.entry.extension',
          passed: false,
          message: `Entry file must end with ${validExtensions.join(', ')}`,
          severity: 'error',
          location: 'manifest.entry',
        });
      } else {
        checks.push({
          rule: 'manifest.entry.extension',
          passed: true,
          message: 'Entry file extension is valid',
          severity: 'info',
        });
      }
    }

    // Inputs/Outputs validation
    if (manifest.inputs) {
      checks.push(...this.validatePorts(manifest.inputs, 'input'));
    }
    if (manifest.outputs) {
      checks.push(...this.validatePorts(manifest.outputs, 'output'));
    }

    return checks;
  }

  /**
   * Validate port definitions
   */
  private validatePorts(ports: Record<string, any>, direction: 'input' | 'output'): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    for (const [name, schema] of Object.entries(ports)) {
      // Port name format
      if (!WIDGET_ID_PATTERN.test(name)) {
        checks.push({
          rule: `manifest.${direction}s.name`,
          passed: false,
          message: `${direction} port name "${name}" should be kebab-case`,
          severity: 'warning',
          location: `manifest.${direction}s.${name}`,
        });
      }

      // Schema structure
      if (typeof schema !== 'object' || !schema.type) {
        checks.push({
          rule: `manifest.${direction}s.schema`,
          passed: false,
          message: `${direction} "${name}" must have a type property`,
          severity: 'error',
          location: `manifest.${direction}s.${name}`,
        });
      }
    }

    return checks;
  }

  /**
   * Validate widget code for security and protocol compliance
   */
  validateCode(code: string, manifest: WidgetManifest, filename = 'index.html'): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check for dangerous patterns
    for (const { pattern, name, severity } of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        checks.push({
          rule: `security.${name.replace(/[^a-z]/gi, '')}`,
          passed: false,
          message: `Dangerous pattern detected: ${name}`,
          severity,
          location: filename,
          suggestion: severity === 'error' 
            ? 'Remove this pattern - it may cause security issues'
            : 'Consider if this pattern is necessary',
        });
      }
    }

    // Check for required patterns
    for (const { pattern, name, required } of REQUIRED_PATTERNS) {
      const found = pattern.test(code);
      
      if (required && !found) {
        checks.push({
          rule: `protocol.${name.replace(/[^a-z]/gi, '')}`,
          passed: false,
          message: `Missing required pattern: ${name}`,
          severity: 'error',
          location: filename,
        });
      } else if (found) {
        checks.push({
          rule: `protocol.${name.replace(/[^a-z]/gi, '')}`,
          passed: true,
          message: `Found ${name}`,
          severity: 'info',
        });
      }
    }

    // Check for proper initialization pattern
    const hasInitCheck = /if\s*\(\s*!?\s*window\.WidgetAPI\s*\)/.test(code) ||
                         /window\.WidgetAPI\s*&&/.test(code);
    
    if (!hasInitCheck && code.includes('WidgetAPI')) {
      checks.push({
        rule: 'protocol.initCheck',
        passed: false,
        message: 'Widget should check for WidgetAPI availability before using it',
        severity: 'warning',
        location: filename,
        suggestion: 'Add: if (!window.WidgetAPI) { setTimeout(init, 50); return; }',
      });
    }

    // Check event emission patterns
    const emitMatches = code.matchAll(/emitEvent\s*\(\s*\{\s*type:\s*['"`]([^'"`]+)['"`]/g);
    for (const match of emitMatches) {
      const eventType = match[1];
      if (!EVENT_NAME_PATTERN.test(eventType) && !eventType.includes(':')) {
        checks.push({
          rule: 'protocol.eventNaming',
          passed: false,
          message: `Event type "${eventType}" should follow "namespace:event-name" pattern`,
          severity: 'warning',
          location: filename,
          suggestion: `Consider: "${manifest.id}:${eventType}"`,
        });
      }
    }

    // Check for scope in events
    if (code.includes('emitEvent') && !code.includes("scope:")) {
      checks.push({
        rule: 'protocol.eventScope',
        passed: false,
        message: 'Events should specify scope (canvas, widget, or global)',
        severity: 'warning',
        location: filename,
        suggestion: "Add scope: 'canvas' to your emitEvent calls",
      });
    }

    return checks;
  }

  /**
   * Validate consistency between manifest and code
   */
  validateConsistency(code: string, manifest: WidgetManifest): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Check if declared outputs are emitted
    if (manifest.outputs) {
      for (const outputName of Object.keys(manifest.outputs)) {
        const outputPattern = new RegExp(`['"\`]${outputName}['"\`]|:${outputName}\\b`);
        
        if (!outputPattern.test(code)) {
          checks.push({
            rule: 'consistency.outputUsed',
            passed: false,
            message: `Declared output "${outputName}" is not emitted in code`,
            severity: 'warning',
            suggestion: `Add code to emit the "${outputName}" event when appropriate`,
          });
        }
      }
    }

    // Check if declared inputs are handled
    if (manifest.inputs) {
      for (const inputName of Object.keys(manifest.inputs)) {
        const inputPattern = new RegExp(`['"\`]${inputName}['"\`]|onEvent.*${inputName}|onInput.*${inputName}`);
        
        if (!inputPattern.test(code)) {
          checks.push({
            rule: 'consistency.inputHandled',
            passed: false,
            message: `Declared input "${inputName}" is not handled in code`,
            severity: 'warning',
            suggestion: `Add an event handler for "${inputName}" input`,
          });
        }
      }
    }

    return checks;
  }

  /**
   * Validate a pipeline structure
   */
  validatePipeline(pipeline: Pipeline, availableManifests: Map<string, WidgetManifest>): ValidationResult {
    const checks: ValidationCheck[] = [];

    // Pipeline has name
    if (!pipeline.name || pipeline.name.trim() === '') {
      checks.push({
        rule: 'pipeline.name',
        passed: false,
        message: 'Pipeline must have a name',
        severity: 'error',
      });
    }

    // Pipeline has nodes
    if (!pipeline.nodes || pipeline.nodes.length === 0) {
      checks.push({
        rule: 'pipeline.nodes',
        passed: false,
        message: 'Pipeline must have at least one node',
        severity: 'error',
      });
    }

    // Validate connections
    for (const conn of pipeline.connections) {
      checks.push(...this.validateConnection(conn, pipeline, availableManifests));
    }

    // Check for orphan nodes
    const connectedNodes = new Set<string>();
    for (const conn of pipeline.connections) {
      connectedNodes.add(conn.from.nodeId);
      connectedNodes.add(conn.to.nodeId);
    }

    for (const node of pipeline.nodes) {
      if (!connectedNodes.has(node.id) && pipeline.nodes.length > 1) {
        checks.push({
          rule: 'pipeline.orphanNode',
          passed: false,
          message: `Node "${node.label || node.id}" is not connected to any other node`,
          severity: 'warning',
        });
      }
    }

    return this.compileResult(checks);
  }

  /**
   * Validate a single pipeline connection
   */
  private validateConnection(
    conn: PipelineConnection,
    pipeline: Pipeline,
    _manifests: Map<string, WidgetManifest>
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Find source and target nodes
    const sourceNode = pipeline.nodes.find(n => n.id === conn.from.nodeId);
    const targetNode = pipeline.nodes.find(n => n.id === conn.to.nodeId);

    if (!sourceNode) {
      checks.push({
        rule: 'connection.sourceExists',
        passed: false,
        message: `Connection source node "${conn.from.nodeId}" not found`,
        severity: 'error',
      });
      return checks;
    }

    if (!targetNode) {
      checks.push({
        rule: 'connection.targetExists',
        passed: false,
        message: `Connection target node "${conn.to.nodeId}" not found`,
        severity: 'error',
      });
      return checks;
    }

    // Validate port names against manifests if available
    if (sourceNode.widgetInstanceId) {
      // Would need to look up manifest to validate output port exists
      // For now, just check the port name format
      if (!WIDGET_ID_PATTERN.test(conn.from.portName)) {
        checks.push({
          rule: 'connection.portName',
          passed: false,
          message: `Output port "${conn.from.portName}" should be kebab-case`,
          severity: 'warning',
        });
      }
    }

    return checks;
  }

  /**
   * Check if a required field exists
   */
  private checkRequired(obj: any, field: string, expectedType: string): ValidationCheck {
    const value = obj?.[field];
    const actualType = typeof value;

    if (value === undefined || value === null) {
      return {
        rule: `manifest.${field}.required`,
        passed: false,
        message: `Missing required field: ${field}`,
        severity: 'error',
        location: `manifest.${field}`,
      };
    }

    if (actualType !== expectedType) {
      return {
        rule: `manifest.${field}.type`,
        passed: false,
        message: `Field ${field} must be a ${expectedType}, got ${actualType}`,
        severity: 'error',
        location: `manifest.${field}`,
      };
    }

    return {
      rule: `manifest.${field}.required`,
      passed: true,
      message: `Field ${field} is present and valid`,
      severity: 'info',
    };
  }

  /**
   * Compile checks into a final result
   */
  private compileResult(checks: ValidationCheck[]): ValidationResult {
    const errors = checks.filter(c => !c.passed && c.severity === 'error');
    const warnings = checks.filter(c => !c.passed && c.severity === 'warning');
    const passed = checks.filter(c => c.passed);

    // Calculate score
    const totalWeight = checks.length;
    const passedWeight = passed.length;
    const errorPenalty = errors.length * 2;
    const warningPenalty = warnings.length * 0.5;

    let score = Math.round(((passedWeight / totalWeight) * 100) - errorPenalty - warningPenalty);
    score = Math.max(0, Math.min(100, score));

    // Generate suggestions
    const suggestions: string[] = [];
    
    for (const check of [...errors, ...warnings]) {
      if (check.suggestion) {
        suggestions.push(check.suggestion);
      }
    }

    return {
      valid: errors.length === 0,
      score,
      checks,
      errors,
      warnings,
      suggestions: [...new Set(suggestions)], // Deduplicate
    };
  }
}

/** Singleton instance */
let enforcerInstance: ProtocolEnforcer | null = null;

/**
 * Get the protocol enforcer singleton
 */
export function getProtocolEnforcer(): ProtocolEnforcer {
  if (!enforcerInstance) {
    enforcerInstance = new ProtocolEnforcer();
  }
  return enforcerInstance;
}

