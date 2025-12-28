/**
 * StickerNest v2 - Code Validator
 * Static analysis for security issues in widget code
 */

import type { WidgetManifest } from '../../types/manifest';

/** Code validation issue */
export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  category: 'security' | 'protocol' | 'performance' | 'style';
  message: string;
  line?: number;
  code?: string;
  fix?: string;
}

/** Code validation result */
export interface CodeValidationResult {
  passed: boolean;
  errors: number;
  warnings: number;
  issues: CodeIssue[];
  criticalIssues: boolean;
  recommendations: string[];
}

/** Validator options */
export interface CodeValidatorOptions {
  allowedDomains?: string[];
  allowLocalStorage?: boolean;
  allowCookies?: boolean;
}

/** Dangerous pattern definition */
interface DangerousPattern {
  pattern: RegExp;
  name: string;
  category: CodeIssue['category'];
  severity: 'error' | 'warning';
  message: string;
  fix?: string;
  critical?: boolean;
}

/**
 * Dangerous patterns to detect
 */
const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Critical security issues
  {
    pattern: /\beval\s*\(/g,
    name: 'eval',
    category: 'security',
    severity: 'error',
    message: 'eval() can execute arbitrary code and is a security risk',
    fix: 'Use JSON.parse() for data, or restructure code to avoid eval',
    critical: true,
  },
  {
    pattern: /new\s+Function\s*\(/g,
    name: 'Function constructor',
    category: 'security',
    severity: 'error',
    message: 'new Function() is equivalent to eval and is a security risk',
    fix: 'Define functions normally or use arrow functions',
    critical: true,
  },
  {
    pattern: /document\.write\s*\(/g,
    name: 'document.write',
    category: 'security',
    severity: 'error',
    message: 'document.write can overwrite the entire document',
    fix: 'Use DOM manipulation methods instead',
    critical: true,
  },
  
  // Sandbox escape attempts
  {
    pattern: /parent\.document/g,
    name: 'parent.document',
    category: 'security',
    severity: 'error',
    message: 'Attempting to access parent document is blocked by sandbox',
    fix: 'Use WidgetAPI for communication with parent',
    critical: true,
  },
  {
    pattern: /top\.document/g,
    name: 'top.document',
    category: 'security',
    severity: 'error',
    message: 'Attempting to access top document is blocked by sandbox',
    fix: 'Use WidgetAPI for communication with parent',
    critical: true,
  },
  {
    pattern: /window\.parent\.(?!postMessage)/g,
    name: 'window.parent access',
    category: 'security',
    severity: 'error',
    message: 'Direct parent window access is not allowed except for postMessage',
    fix: 'Use WidgetAPI.emitEvent() for cross-widget communication',
    critical: true,
  },
  {
    pattern: /window\.top\b/g,
    name: 'window.top',
    category: 'security',
    severity: 'error',
    message: 'Accessing window.top is not allowed in sandbox',
    fix: 'Remove window.top references',
    critical: true,
  },
  {
    pattern: /frameElement/g,
    name: 'frameElement',
    category: 'security',
    severity: 'error',
    message: 'frameElement access is not allowed',
    fix: 'Remove frameElement references',
    critical: true,
  },

  // XSS vulnerabilities
  {
    pattern: /\.innerHTML\s*=\s*(?!['"`])/g,
    name: 'innerHTML assignment',
    category: 'security',
    severity: 'warning',
    message: 'innerHTML with variables can lead to XSS vulnerabilities',
    fix: 'Use textContent for text, or sanitize HTML input',
  },
  {
    pattern: /\.outerHTML\s*=/g,
    name: 'outerHTML assignment',
    category: 'security',
    severity: 'warning',
    message: 'outerHTML can lead to XSS vulnerabilities',
    fix: 'Use DOM manipulation methods instead',
  },
  {
    pattern: /insertAdjacentHTML/g,
    name: 'insertAdjacentHTML',
    category: 'security',
    severity: 'warning',
    message: 'insertAdjacentHTML can lead to XSS if not sanitized',
    fix: 'Sanitize HTML input before inserting',
  },

  // Storage access
  {
    pattern: /localStorage\./g,
    name: 'localStorage',
    category: 'security',
    severity: 'warning',
    message: 'localStorage access may not work in sandbox and can leak data',
    fix: 'Use WidgetAPI.setState() for persistent state',
  },
  {
    pattern: /sessionStorage\./g,
    name: 'sessionStorage',
    category: 'security',
    severity: 'warning',
    message: 'sessionStorage access may not work in sandbox',
    fix: 'Use WidgetAPI.setState() for state management',
  },
  {
    pattern: /document\.cookie/g,
    name: 'cookie access',
    category: 'security',
    severity: 'warning',
    message: 'Cookie access is restricted in sandbox',
    fix: 'Use WidgetAPI.setState() for state management',
  },

  // Network requests
  {
    pattern: /fetch\s*\(\s*['"`]https?:\/\/(?!localhost)/g,
    name: 'external fetch',
    category: 'security',
    severity: 'warning',
    message: 'External HTTP requests should be reviewed for security',
    fix: 'Only fetch from trusted domains or use relative URLs',
  },
  {
    pattern: /new\s+XMLHttpRequest/g,
    name: 'XMLHttpRequest',
    category: 'security',
    severity: 'warning',
    message: 'XMLHttpRequest should be reviewed for security',
    fix: 'Prefer fetch() API with proper error handling',
  },
  {
    pattern: /new\s+WebSocket\s*\(/g,
    name: 'WebSocket',
    category: 'security',
    severity: 'warning',
    message: 'WebSocket connections should be reviewed for security',
    fix: 'Only connect to trusted WebSocket endpoints',
  },

  // Performance issues
  {
    pattern: /while\s*\(\s*true\s*\)/g,
    name: 'infinite loop',
    category: 'performance',
    severity: 'error',
    message: 'Infinite loops will freeze the widget',
    fix: 'Add a break condition or use setInterval for repeated actions',
  },
  {
    pattern: /setInterval\s*\([^,]+,\s*[0-9]{1,2}\s*\)/g,
    name: 'fast interval',
    category: 'performance',
    severity: 'warning',
    message: 'Very fast intervals (< 100ms) can cause performance issues',
    fix: 'Use intervals of at least 100ms',
  },
  {
    pattern: /for\s*\([^)]*;\s*;\s*[^)]*\)/g,
    name: 'infinite for loop',
    category: 'performance',
    severity: 'error',
    message: 'Infinite for loops will freeze the widget',
    fix: 'Add a termination condition',
  },

  // Protocol issues
  {
    pattern: /addEventListener\s*\(\s*['"`]message['"`]/g,
    name: 'raw message listener',
    category: 'protocol',
    severity: 'warning',
    message: 'Use WidgetAPI.onEvent() instead of raw message listeners',
    fix: 'Replace with window.WidgetAPI.onEvent()',
  },
];

/**
 * Required patterns for proper widget structure
 */
const REQUIRED_PATTERNS = [
  {
    pattern: /window\.WidgetAPI/,
    name: 'WidgetAPI usage',
    message: 'Widget should use window.WidgetAPI for communication',
  },
  {
    pattern: /if\s*\(\s*!?\s*window\.WidgetAPI\s*\)|window\.WidgetAPI\s*&&/,
    name: 'WidgetAPI check',
    message: 'Widget should check for WidgetAPI availability before using it',
  },
];

/**
 * Code Validator - static analysis for security issues
 */
export class CodeValidator {
  private options: CodeValidatorOptions;

  constructor(options: CodeValidatorOptions = {}) {
    this.options = options;
  }

  /**
   * Validate widget code
   */
  validate(
    html: string,
    manifest: WidgetManifest,
    additionalFiles?: Record<string, string>
  ): CodeValidationResult {
    const issues: CodeIssue[] = [];
    let criticalIssues = false;

    // Validate main HTML/JS
    const mainIssues = this.analyzeCode(html);
    issues.push(...mainIssues);

    // Check for critical issues
    if (mainIssues.some(i => DANGEROUS_PATTERNS.find(p => p.name === i.code)?.critical)) {
      criticalIssues = true;
    }

    // Validate additional files
    if (additionalFiles) {
      for (const [filename, content] of Object.entries(additionalFiles)) {
        if (filename.endsWith('.js') || filename.endsWith('.ts')) {
          const fileIssues = this.analyzeCode(content, filename);
          issues.push(...fileIssues);

          if (fileIssues.some(i => DANGEROUS_PATTERNS.find(p => p.name === i.code)?.critical)) {
            criticalIssues = true;
          }
        }
      }
    }

    // Check for required patterns
    const requiredIssues = this.checkRequired(html);
    issues.push(...requiredIssues);

    // Check manifest-code consistency
    const consistencyIssues = this.checkConsistency(html, manifest);
    issues.push(...consistencyIssues);

    // Count errors and warnings
    const errors = issues.filter(i => i.type === 'error').length;
    const warnings = issues.filter(i => i.type === 'warning').length;

    // Compile recommendations
    const recommendations = this.compileRecommendations(issues);

    return {
      passed: errors === 0 && !criticalIssues,
      errors,
      warnings,
      issues,
      criticalIssues,
      recommendations,
    };
  }

  /**
   * Analyze code for dangerous patterns
   */
  private analyzeCode(code: string, _filename?: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    for (const pattern of DANGEROUS_PATTERNS) {
      const matches = code.matchAll(pattern.pattern);
      
      for (const match of matches) {
        // Check if in allowed context
        if (this.isAllowed(pattern, match[0])) {
          continue;
        }

        // Find line number
        const line = this.findLineNumber(code, match.index || 0);

        issues.push({
          type: pattern.severity,
          category: pattern.category,
          message: pattern.message,
          line,
          code: pattern.name,
          fix: pattern.fix,
        });
      }
    }

    return issues;
  }

  /**
   * Check if a pattern match is allowed
   */
  private isAllowed(pattern: DangerousPattern, match: string): boolean {
    // Allow localStorage if explicitly enabled
    if (pattern.name === 'localStorage' && this.options.allowLocalStorage) {
      return true;
    }

    // Allow cookies if explicitly enabled
    if (pattern.name === 'cookie access' && this.options.allowCookies) {
      return true;
    }

    // Check allowed domains for fetch
    if (pattern.name === 'external fetch' && this.options.allowedDomains?.length) {
      for (const domain of this.options.allowedDomains) {
        if (match.includes(domain)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for required patterns
   */
  private checkRequired(code: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    for (const required of REQUIRED_PATTERNS) {
      if (!required.pattern.test(code)) {
        issues.push({
          type: 'warning',
          category: 'protocol',
          message: required.message,
          code: required.name,
        });
      }
    }

    return issues;
  }

  /**
   * Check manifest-code consistency
   */
  private checkConsistency(code: string, manifest: WidgetManifest): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check if declared outputs are emitted
    if (manifest.outputs) {
      for (const [name, _schema] of Object.entries(manifest.outputs)) {
        const emitPattern = new RegExp(`['"\`]${name}['"\`]|emitEvent.*${name}|emitOutput.*${name}`);
        
        if (!emitPattern.test(code)) {
          issues.push({
            type: 'info',
            category: 'protocol',
            message: `Output "${name}" declared in manifest but not found in code`,
            code: 'unused-output',
          });
        }
      }
    }

    // Check if declared inputs are handled
    if (manifest.inputs) {
      for (const [name, _schema] of Object.entries(manifest.inputs)) {
        const inputPattern = new RegExp(`['"\`]${name}['"\`]|onEvent.*${name}|onInput.*${name}`);
        
        if (!inputPattern.test(code)) {
          issues.push({
            type: 'info',
            category: 'protocol',
            message: `Input "${name}" declared in manifest but not handled in code`,
            code: 'unhandled-input',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find line number for a position in code
   */
  private findLineNumber(code: string, position: number): number {
    const lines = code.substring(0, position).split('\n');
    return lines.length;
  }

  /**
   * Compile recommendations from issues
   */
  private compileRecommendations(issues: CodeIssue[]): string[] {
    const recommendations: string[] = [];

    for (const issue of issues) {
      if (issue.fix) {
        recommendations.push(`${issue.code}: ${issue.fix}`);
      }
    }

    // Deduplicate
    return [...new Set(recommendations)];
  }
}

