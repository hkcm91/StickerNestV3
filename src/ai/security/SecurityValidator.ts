/**
 * StickerNest v2 - Security Validator
 * Main security orchestrator for validating AI-generated widgets
 * Combines static code analysis and behavioral testing
 */

import type { WidgetManifest } from '../../types/manifest';
import { CodeValidator, type CodeValidationResult } from './CodeValidator';
import { BehavioralTester, type BehavioralTestResult } from './BehavioralTester';

/** Complete security report */
export interface SecurityReport {
  /** Overall pass/fail */
  passed: boolean;
  /** Security score 0-100 */
  score: number;
  /** Code validation results */
  codeValidation: CodeValidationResult;
  /** Behavioral test results */
  behavioralTests: BehavioralTestResult;
  /** Combined recommendations */
  recommendations: string[];
  /** Timestamp of validation */
  validatedAt: number;
  /** Time taken in ms */
  durationMs: number;
}

/** Security validation options */
export interface SecurityValidationOptions {
  /** Run behavioral tests (slower but more thorough) */
  runBehavioralTests: boolean;
  /** Timeout for behavioral tests in ms */
  behavioralTimeout: number;
  /** Strict mode - fail on warnings */
  strictMode: boolean;
  /** Custom allowed domains for fetch */
  allowedDomains?: string[];
}

const DEFAULT_OPTIONS: SecurityValidationOptions = {
  runBehavioralTests: true,
  behavioralTimeout: 5000,
  strictMode: false,
  allowedDomains: [],
};

/**
 * Security Validator - orchestrates all security checks
 */
export class SecurityValidator {
  private codeValidator: CodeValidator;
  private behavioralTester: BehavioralTester;
  private options: SecurityValidationOptions;

  constructor(options: Partial<SecurityValidationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.codeValidator = new CodeValidator({
      allowedDomains: this.options.allowedDomains,
    });
    this.behavioralTester = new BehavioralTester({
      timeout: this.options.behavioralTimeout,
    });
  }

  /**
   * Run complete security validation on a widget
   */
  async validate(
    manifest: WidgetManifest,
    html: string,
    additionalFiles?: Record<string, string>
  ): Promise<SecurityReport> {
    const startTime = Date.now();

    // Run code validation
    const codeValidation = this.codeValidator.validate(html, manifest, additionalFiles);

    // Run behavioral tests if enabled and code validation passed basic checks
    let behavioralTests: BehavioralTestResult;
    
    if (this.options.runBehavioralTests && !codeValidation.criticalIssues) {
      behavioralTests = await this.behavioralTester.test(manifest, html);
    } else {
      behavioralTests = {
        passed: true,
        tests: [],
        summary: this.options.runBehavioralTests 
          ? 'Skipped due to critical code issues'
          : 'Behavioral tests disabled',
      };
    }

    // Calculate overall score
    const score = this.calculateScore(codeValidation, behavioralTests);

    // Determine pass/fail
    const passed = this.options.strictMode
      ? codeValidation.passed && behavioralTests.passed && codeValidation.warnings === 0
      : codeValidation.passed && behavioralTests.passed;

    // Compile recommendations
    const recommendations = this.compileRecommendations(codeValidation, behavioralTests);

    const durationMs = Date.now() - startTime;

    return {
      passed,
      score,
      codeValidation,
      behavioralTests,
      recommendations,
      validatedAt: Date.now(),
      durationMs,
    };
  }

  /**
   * Quick validation - code only, no behavioral tests
   */
  quickValidate(
    manifest: WidgetManifest,
    html: string,
    additionalFiles?: Record<string, string>
  ): CodeValidationResult {
    return this.codeValidator.validate(html, manifest, additionalFiles);
  }

  /**
   * Calculate security score
   */
  private calculateScore(
    codeValidation: CodeValidationResult,
    behavioralTests: BehavioralTestResult
  ): number {
    let score = 100;

    // Code validation penalties
    score -= codeValidation.errors * 20;
    score -= codeValidation.warnings * 5;

    // Behavioral test penalties
    const failedBehavioral = behavioralTests.tests.filter(t => !t.passed).length;
    score -= failedBehavioral * 15;

    // Critical issues = major penalty
    if (codeValidation.criticalIssues) {
      score = Math.min(score, 20);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Compile recommendations from all validations
   */
  private compileRecommendations(
    codeValidation: CodeValidationResult,
    behavioralTests: BehavioralTestResult
  ): string[] {
    const recommendations: string[] = [];

    // Add code recommendations
    recommendations.push(...codeValidation.recommendations);

    // Add behavioral recommendations
    for (const test of behavioralTests.tests) {
      if (!test.passed && test.recommendation) {
        recommendations.push(test.recommendation);
      }
    }

    // Deduplicate
    return [...new Set(recommendations)];
  }
}

/** Singleton instance */
let validatorInstance: SecurityValidator | null = null;

/**
 * Get the security validator singleton
 */
export function getSecurityValidator(): SecurityValidator {
  if (!validatorInstance) {
    validatorInstance = new SecurityValidator();
  }
  return validatorInstance;
}

/**
 * Create a new security validator instance
 */
export function createSecurityValidator(options?: Partial<SecurityValidationOptions>): SecurityValidator {
  return new SecurityValidator(options);
}

