/**
 * StickerNest v2 - Skill Recommendation Service
 * Analyzes patterns in AI interactions and recommends new Claude Code skills
 *
 * This service:
 * 1. Tracks common task patterns that Claude struggles with
 * 2. Identifies gaps in existing skill coverage
 * 3. Recommends new skills based on usage patterns
 * 4. Can generate skill templates for new skills
 */

import { useAIReflectionStore, type ReflectionEvaluation, type AIImprovementSuggestion } from '../state/useAIReflectionStore';
import { useGenerationMetricsStore, type GenerationRecord } from '../state/useGenerationMetricsStore';

// ==================
// Types
// ==================

/** Skill gap identified from patterns */
export interface SkillGap {
  id: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  frequency: number; // How often this pattern appears
  confidence: number; // 0-1 confidence this would help
  evidence: string[];
  suggestedContent: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  status: 'identified' | 'proposed' | 'created' | 'dismissed';
}

/** Generated skill template */
export interface SkillTemplate {
  name: string;
  description: string;
  content: string;
  filePath: string;
}

/** Existing skill info */
export interface ExistingSkill {
  name: string;
  description: string;
  location: string;
  lastUsed?: string;
}

// ==================
// Known Skill Patterns
// ==================

const KNOWN_SKILL_PATTERNS: Record<string, {
  keywords: string[];
  category: string;
  existingSkill?: string;
}> = {
  'widget-creation': {
    keywords: ['create widget', 'new widget', 'build widget', 'widget component'],
    category: 'widgets',
    existingSkill: 'creating-widgets',
  },
  'component-creation': {
    keywords: ['create component', 'new component', 'react component', 'build ui'],
    category: 'ui',
    existingSkill: 'creating-components',
  },
  'store-creation': {
    keywords: ['create store', 'zustand', 'state management', 'new store'],
    category: 'state',
    existingSkill: 'creating-zustand-stores',
  },
  'pipeline-connection': {
    keywords: ['connect widget', 'pipeline', 'port', 'widget communication'],
    category: 'runtime',
    existingSkill: 'connecting-widget-pipelines',
  },
  'testing': {
    keywords: ['test widget', 'write test', 'e2e test', 'playwright'],
    category: 'testing',
    existingSkill: 'testing-widgets',
  },
  'mobile-optimization': {
    keywords: ['mobile', 'touch', 'responsive', 'gesture'],
    category: 'ui',
    existingSkill: 'optimizing-mobile-experience',
  },
  // Patterns without existing skills (potential gaps)
  'ai-generation': {
    keywords: ['ai generation', 'generate image', 'generate widget', 'ai prompt'],
    category: 'ai',
  },
  'canvas-history': {
    keywords: ['undo', 'redo', 'history', 'revert'],
    category: 'canvas',
  },
  'debugging': {
    keywords: ['debug', 'error', 'fix bug', 'troubleshoot'],
    category: 'debugging',
  },
  'performance': {
    keywords: ['performance', 'optimize', 'slow', 'memory'],
    category: 'performance',
  },
  'api-integration': {
    keywords: ['api', 'endpoint', 'fetch', 'server'],
    category: 'api',
  },
};

// ==================
// Existing Skills
// ==================

const EXISTING_SKILLS: ExistingSkill[] = [
  {
    name: 'creating-widgets',
    description: 'Creating new StickerNest widgets from scratch',
    location: '.claude/skills/creating-widgets',
  },
  {
    name: 'creating-components',
    description: 'Creating React components for StickerNest',
    location: '.claude/skills/creating-components',
  },
  {
    name: 'creating-zustand-stores',
    description: 'Creating Zustand stores for StickerNest state management',
    location: '.claude/skills/creating-zustand-stores',
  },
  {
    name: 'connecting-widget-pipelines',
    description: 'Connecting StickerNest widgets via pipelines and ports',
    location: '.claude/skills/connecting-widget-pipelines',
  },
  {
    name: 'testing-widgets',
    description: 'Testing StickerNest widgets and components',
    location: '.claude/skills/testing-widgets',
  },
  {
    name: 'building-skills',
    description: 'Creating new Claude Code skills for StickerNest',
    location: '.claude/skills/building-skills',
  },
  {
    name: 'optimizing-mobile-experience',
    description: 'Optimizing StickerNest for mobile devices and touch interactions',
    location: '.claude/skills/optimizing-mobile-experience',
  },
];

// ==================
// Service
// ==================

class SkillRecommendationService {
  private static instance: SkillRecommendationService;
  private identifiedGaps: Map<string, SkillGap> = new Map();

  private constructor() {}

  static getInstance(): SkillRecommendationService {
    if (!SkillRecommendationService.instance) {
      SkillRecommendationService.instance = new SkillRecommendationService();
    }
    return SkillRecommendationService.instance;
  }

  /**
   * Analyze recent interactions and identify skill gaps
   */
  analyzePatterns(): SkillGap[] {
    const reflectionStore = useAIReflectionStore.getState();
    const metricsStore = useGenerationMetricsStore.getState();

    // Get recent data
    const evaluations = reflectionStore.evaluations.slice(0, 50);
    const suggestions = reflectionStore.getActiveSuggestions();
    const records = metricsStore.records.slice(0, 100);

    // Analyze for patterns
    const patternCounts = new Map<string, {
      count: number;
      examples: string[];
      failures: number;
    }>();

    // Count patterns in user prompts
    records.forEach((record) => {
      const prompt = record.userPrompt.toLowerCase();

      for (const [pattern, config] of Object.entries(KNOWN_SKILL_PATTERNS)) {
        const matches = config.keywords.some((kw) => prompt.includes(kw));
        if (matches) {
          const current = patternCounts.get(pattern) || { count: 0, examples: [], failures: 0 };
          current.count++;
          if (current.examples.length < 3) {
            current.examples.push(record.userPrompt);
          }
          if (record.result === 'failure') {
            current.failures++;
          }
          patternCounts.set(pattern, current);
        }
      }
    });

    // Identify gaps (patterns without existing skills that have high frequency or failure rate)
    const gaps: SkillGap[] = [];

    for (const [pattern, data] of patternCounts.entries()) {
      const config = KNOWN_SKILL_PATTERNS[pattern];

      // Skip if we already have a skill for this
      if (config.existingSkill) continue;

      // Calculate priority based on frequency and failure rate
      const failureRate = data.count > 0 ? data.failures / data.count : 0;
      let priority: SkillGap['priority'] = 'low';

      if (data.count >= 10 && failureRate > 0.3) {
        priority = 'critical';
      } else if (data.count >= 5 || failureRate > 0.2) {
        priority = 'high';
      } else if (data.count >= 3) {
        priority = 'medium';
      }

      // Only create gap if there's significant evidence
      if (data.count >= 2) {
        const gap: SkillGap = {
          id: crypto.randomUUID(),
          name: this.patternToSkillName(pattern),
          description: this.generateSkillDescription(pattern, config),
          triggerPhrases: config.keywords,
          frequency: data.count,
          confidence: Math.min(0.9, 0.5 + (data.count / 20) + (failureRate * 0.3)),
          evidence: data.examples,
          suggestedContent: this.suggestSkillContent(pattern, config),
          priority,
          createdAt: new Date().toISOString(),
          status: 'identified',
        };

        gaps.push(gap);
        this.identifiedGaps.set(gap.id, gap);
      }
    }

    // Also analyze low-scoring evaluations for patterns
    const lowScoreEvals = evaluations.filter((e) => !e.passed);
    const issuePatterns = new Map<string, number>();

    lowScoreEvals.forEach((evaluation) => {
      evaluation.suggestedChanges.forEach((change) => {
        const key = change.toLowerCase();
        issuePatterns.set(key, (issuePatterns.get(key) || 0) + 1);
      });
    });

    // Create gaps from recurring issues
    issuePatterns.forEach((count, issue) => {
      if (count >= 3) {
        const existingGap = gaps.find((g) => g.triggerPhrases.some((t) => issue.includes(t)));
        if (!existingGap) {
          gaps.push({
            id: crypto.randomUUID(),
            name: `handling-${issue.split(' ').slice(0, 2).join('-')}`,
            description: `Addressing the common issue: "${issue}"`,
            triggerPhrases: [issue],
            frequency: count,
            confidence: 0.6,
            evidence: lowScoreEvals.filter((e) => e.suggestedChanges.includes(issue)).map((e) => e.id),
            suggestedContent: [`Guide for handling: ${issue}`],
            priority: count >= 5 ? 'high' : 'medium',
            createdAt: new Date().toISOString(),
            status: 'identified',
          });
        }
      }
    });

    return gaps.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate a skill template for a gap
   */
  generateSkillTemplate(gap: SkillGap): SkillTemplate {
    const name = gap.name;
    const description = `${gap.description} Use when ${gap.triggerPhrases.slice(0, 3).join(', ')}. Covers ${gap.suggestedContent.slice(0, 3).join(', ')}.`;

    const content = `---
name: ${name}
description: ${description.substring(0, 200)}
---

# ${this.toTitleCase(name.replace(/-/g, ' '))}

${gap.description}

## When to Use This Skill

This skill helps when you need to:
${gap.triggerPhrases.map((t) => `- ${this.toTitleCase(t)}`).join('\n')}

## Core Concepts

### Overview
${gap.suggestedContent[0] || 'Core concepts for this task.'}

## Step-by-Step Guide

### Step 1: Understand the Requirements
Analyze what the user needs and identify the key components.

### Step 2: Check Existing Patterns
Look at similar implementations in the codebase.

### Step 3: Implement the Solution
Follow StickerNest patterns and conventions.

## Code Examples

### Example: Basic Implementation
\`\`\`typescript
// Example code will be generated based on context
\`\`\`

## Reference Files

- **Related Files**: Search for patterns in \`src/\` directory

## Troubleshooting

### Issue: Common problems
**Cause**: Typical causes of issues
**Fix**: Steps to resolve

---

*This skill was auto-generated by the Self-Improving AI system.*
*Evidence: ${gap.evidence.length} occurrences, ${(gap.confidence * 100).toFixed(0)}% confidence*
`;

    return {
      name,
      description: description.substring(0, 200),
      content,
      filePath: `.claude/skills/${name}/SKILL.md`,
    };
  }

  /**
   * Get all identified gaps
   */
  getIdentifiedGaps(): SkillGap[] {
    return Array.from(this.identifiedGaps.values());
  }

  /**
   * Get gap by ID
   */
  getGap(id: string): SkillGap | undefined {
    return this.identifiedGaps.get(id);
  }

  /**
   * Update gap status
   */
  updateGapStatus(id: string, status: SkillGap['status']): void {
    const gap = this.identifiedGaps.get(id);
    if (gap) {
      gap.status = status;
      this.identifiedGaps.set(id, gap);
    }
  }

  /**
   * Dismiss a gap
   */
  dismissGap(id: string): void {
    this.updateGapStatus(id, 'dismissed');
  }

  /**
   * Get existing skills
   */
  getExistingSkills(): ExistingSkill[] {
    return EXISTING_SKILLS;
  }

  /**
   * Check if a skill exists for a pattern
   */
  hasSkillForPattern(keywords: string[]): ExistingSkill | undefined {
    for (const [pattern, config] of Object.entries(KNOWN_SKILL_PATTERNS)) {
      if (config.existingSkill && config.keywords.some((kw) => keywords.includes(kw))) {
        return EXISTING_SKILLS.find((s) => s.name === config.existingSkill);
      }
    }
    return undefined;
  }

  // ==================
  // Private Helpers
  // ==================

  private patternToSkillName(pattern: string): string {
    // Convert pattern to gerund form skill name
    const parts = pattern.split('-');
    if (parts[0].endsWith('ing')) {
      return pattern;
    }
    // Add -ing to make it gerund
    const verb = parts[0];
    const rest = parts.slice(1).join('-');
    return `${verb}ing-${rest}`.replace(/-+/g, '-').replace(/-$/, '');
  }

  private generateSkillDescription(pattern: string, config: { keywords: string[]; category: string }): string {
    const action = pattern.replace(/-/g, ' ');
    return `Handling ${action} tasks in StickerNest. Related to ${config.category} functionality.`;
  }

  private suggestSkillContent(pattern: string, config: { keywords: string[]; category: string }): string[] {
    const suggestions: string[] = [];

    switch (config.category) {
      case 'ai':
        suggestions.push('AI provider configuration', 'Prompt engineering', 'Error handling');
        break;
      case 'canvas':
        suggestions.push('Canvas state management', 'History tracking', 'Undo/redo patterns');
        break;
      case 'debugging':
        suggestions.push('Error diagnosis', 'Logging patterns', 'Dev tools usage');
        break;
      case 'performance':
        suggestions.push('React optimization', 'Memoization', 'Lazy loading');
        break;
      case 'api':
        suggestions.push('API client patterns', 'Error handling', 'Authentication');
        break;
      default:
        suggestions.push('Core patterns', 'Best practices', 'Common pitfalls');
    }

    return suggestions;
  }

  private toTitleCase(str: string): string {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

// ==================
// Export
// ==================

export const getSkillRecommendationService = () => SkillRecommendationService.getInstance();

/**
 * Analyze patterns and get skill recommendations
 */
export function analyzeSkillGaps(): SkillGap[] {
  return getSkillRecommendationService().analyzePatterns();
}

/**
 * Generate a skill template for a gap
 */
export function generateSkillFromGap(gapId: string): SkillTemplate | null {
  const service = getSkillRecommendationService();
  const gap = service.getGap(gapId);
  if (!gap) return null;
  return service.generateSkillTemplate(gap);
}

/**
 * Get existing skills
 */
export function getExistingSkills(): ExistingSkill[] {
  return getSkillRecommendationService().getExistingSkills();
}
