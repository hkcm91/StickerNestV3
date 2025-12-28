/**
 * StickerNest v2 - AI Widget Generator V2.0 Quality Analyzer
 * Scores and analyzes generated widget quality
 */

import type { WidgetManifest } from '../../types/manifest';
import type { QualityScore, ParsedWidget } from './types';
import { getProtocolEnforcer, type ValidationResult } from '../../ai/ProtocolEnforcer';

// ============================================
// Quality Criteria Weights
// ============================================

const WEIGHTS = {
  protocolCompliance: 40,  // 40 points max
  codeQuality: 30,         // 30 points max
  visualQuality: 20,       // 20 points max
  functionality: 10,       // 10 points max
};

// ============================================
// Quality Analyzer Class
// ============================================

export class QualityAnalyzer {
  /**
   * Analyze widget quality and return scores
   */
  analyze(widget: ParsedWidget): {
    score: QualityScore;
    validation: ValidationResult;
    suggestions: string[];
  } {
    const enforcer = getProtocolEnforcer();

    // Get protocol validation
    const validation = enforcer.validateWidget({
      manifest: widget.manifest,
      html: widget.html,
    });

    // Calculate individual scores
    const protocolCompliance = this.scoreProtocolCompliance(validation);
    const codeQuality = this.scoreCodeQuality(widget.html, widget.manifest);
    const visualQuality = this.scoreVisualQuality(widget.html);
    const functionality = this.scoreFunctionality(widget.html, widget.manifest);

    // Calculate overall score
    const overall = Math.round(
      (protocolCompliance * WEIGHTS.protocolCompliance +
        codeQuality * WEIGHTS.codeQuality +
        visualQuality * WEIGHTS.visualQuality +
        functionality * WEIGHTS.functionality) / 100
    );

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      widget,
      { protocolCompliance, codeQuality, visualQuality, functionality },
      validation
    );

    return {
      score: {
        overall,
        protocolCompliance: Math.round(protocolCompliance * WEIGHTS.protocolCompliance / 100),
        codeQuality: Math.round(codeQuality * WEIGHTS.codeQuality / 100),
        visualQuality: Math.round(visualQuality * WEIGHTS.visualQuality / 100),
        functionality: Math.round(functionality * WEIGHTS.functionality / 100),
      },
      validation,
      suggestions,
    };
  }

  /**
   * Get quick quality assessment (faster, less detailed)
   */
  quickAssess(html: string, manifest: WidgetManifest): 'excellent' | 'good' | 'basic' | 'poor' {
    let score = 0;

    // Basic checks
    if (html.includes('<!DOCTYPE html>')) score += 10;
    if (html.includes('window.WidgetAPI')) score += 20;
    if (html.includes('emitEvent')) score += 15;
    if (html.includes('onEvent')) score += 15;
    if (html.includes('setState')) score += 10;
    if (html.includes('transition')) score += 10;
    if (html.includes(':hover')) score += 10;
    if (manifest.events?.emits?.length || manifest.outputs) score += 10;

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'basic';
    return 'poor';
  }

  // ============================================
  // Scoring Methods
  // ============================================

  private scoreProtocolCompliance(validation: ValidationResult): number {
    // Use the validation score directly (already 0-100)
    return validation.score;
  }

  private scoreCodeQuality(html: string, manifest: WidgetManifest): number {
    let score = 100;
    const penalties: string[] = [];

    // Check for dangerous patterns (severe penalty)
    if (/\beval\s*\(/.test(html)) {
      score -= 30;
      penalties.push('eval() usage');
    }
    if (/new\s+Function\s*\(/.test(html)) {
      score -= 25;
      penalties.push('new Function() usage');
    }
    if (/document\.write\s*\(/.test(html)) {
      score -= 20;
      penalties.push('document.write() usage');
    }

    // Check for proper structure
    if (!html.includes('<!DOCTYPE html>')) {
      score -= 10;
    }
    if (!html.includes('<head>')) {
      score -= 5;
    }
    if (!html.includes('<style>')) {
      score -= 5;
    }

    // Check for proper initialization
    if (!html.includes('window.WidgetAPI')) {
      score -= 15;
    }

    // Check for WidgetAPI retry pattern
    const hasRetryPattern =
      /if\s*\(\s*!?\s*window\.WidgetAPI\s*\)/.test(html) ||
      /setTimeout\s*\(\s*init/.test(html);
    if (!hasRetryPattern && html.includes('WidgetAPI')) {
      score -= 10;
    }

    // Check for code organization
    const hasIIFE = /\(function\s*\(\)\s*\{/.test(html) || /\(\s*\(\)\s*=>\s*\{/.test(html);
    if (!hasIIFE) {
      score -= 5; // Minor penalty for no IIFE
    }

    // Check for console.log pollution
    const consoleCount = (html.match(/console\.log/g) || []).length;
    if (consoleCount > 5) {
      score -= 5;
    }

    return Math.max(0, score);
  }

  private scoreVisualQuality(html: string): number {
    let score = 50; // Start at middle

    // Check for CSS variables (design system)
    if (html.includes('--sn-') || html.includes('var(--')) {
      score += 15;
    }

    // Check for proper dark theme
    if (html.includes('#1a1a2e') || html.includes('#0f0f19')) {
      score += 5;
    }

    // Check for transitions
    if (html.includes('transition')) {
      score += 10;
    }

    // Check for hover effects
    if (html.includes(':hover')) {
      score += 10;
    }

    // Check for proper spacing
    if (html.includes('padding') && html.includes('margin')) {
      score += 5;
    }

    // Check for border-radius (modern look)
    if (html.includes('border-radius')) {
      score += 5;
    }

    // Check for shadows (depth)
    if (html.includes('box-shadow')) {
      score += 5;
    }

    // Check for gradients (polish)
    if (html.includes('linear-gradient') || html.includes('radial-gradient')) {
      score += 5;
    }

    // Penalize inline styles (prefer classes)
    const inlineStyleCount = (html.match(/style="/g) || []).length;
    if (inlineStyleCount > 10) {
      score -= 10;
    }

    // Check for animations
    if (html.includes('@keyframes') || html.includes('animation')) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  private scoreFunctionality(html: string, manifest: WidgetManifest): number {
    let score = 50; // Start at middle

    // Check for event emission
    if (html.includes('emitEvent')) {
      score += 15;
    }

    // Check for event listening
    if (html.includes('onEvent')) {
      score += 15;
    }

    // Check for state management
    if (html.includes('setState') && html.includes('getState')) {
      score += 15;
    }

    // Check for proper output port usage
    if (html.includes('emitOutput')) {
      score += 10;
    }

    // Check if declared events are used
    const declaredEmits = manifest.events?.emits || [];
    const declaredListens = manifest.events?.listens || [];

    if (declaredEmits.length > 0) {
      const usedEmits = declaredEmits.filter(e =>
        html.includes(`'${e}'`) || html.includes(`"${e}"`)
      );
      score += (usedEmits.length / declaredEmits.length) * 10;
    }

    if (declaredListens.length > 0) {
      const usedListens = declaredListens.filter(e =>
        html.includes(`'${e}'`) || html.includes(`"${e}"`)
      );
      score += (usedListens.length / declaredListens.length) * 10;
    }

    // Check for error handling
    if (html.includes('try') && html.includes('catch')) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  // ============================================
  // Suggestion Generation
  // ============================================

  private generateSuggestions(
    widget: ParsedWidget,
    scores: {
      protocolCompliance: number;
      codeQuality: number;
      visualQuality: number;
      functionality: number;
    },
    validation: ValidationResult
  ): string[] {
    const suggestions: string[] = [];

    // Add validation suggestions
    suggestions.push(...validation.suggestions.slice(0, 3));

    // Protocol compliance suggestions
    if (scores.protocolCompliance < 70) {
      if (!widget.html.includes('window.WidgetAPI')) {
        suggestions.push('Add WidgetAPI integration for proper communication');
      }
      if (!widget.manifest.events?.emits?.length && !widget.manifest.outputs) {
        suggestions.push('Define output events or ports in the manifest');
      }
    }

    // Code quality suggestions
    if (scores.codeQuality < 70) {
      if (!widget.html.includes('<!DOCTYPE html>')) {
        suggestions.push('Add <!DOCTYPE html> declaration');
      }
      if (!/setTimeout\s*\(\s*init/.test(widget.html)) {
        suggestions.push('Add retry pattern for WidgetAPI initialization');
      }
    }

    // Visual quality suggestions
    if (scores.visualQuality < 70) {
      if (!widget.html.includes('transition')) {
        suggestions.push('Add CSS transitions for smoother interactions');
      }
      if (!widget.html.includes(':hover')) {
        suggestions.push('Add hover effects for interactive elements');
      }
      if (!widget.html.includes('--sn-')) {
        suggestions.push('Use StickerNest CSS variables for consistent theming');
      }
    }

    // Functionality suggestions
    if (scores.functionality < 70) {
      if (!widget.html.includes('setState')) {
        suggestions.push('Add state persistence with WidgetAPI.setState');
      }
      if (!widget.html.includes('emitEvent')) {
        suggestions.push('Emit events for meaningful user interactions');
      }
    }

    // Deduplicate and limit suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }
}

// ============================================
// Singleton Export
// ============================================

let qualityAnalyzerInstance: QualityAnalyzer | null = null;

export function getQualityAnalyzer(): QualityAnalyzer {
  if (!qualityAnalyzerInstance) {
    qualityAnalyzerInstance = new QualityAnalyzer();
  }
  return qualityAnalyzerInstance;
}
