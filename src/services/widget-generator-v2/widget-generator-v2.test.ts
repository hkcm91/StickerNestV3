/**
 * AI Widget Generator V2.0 Unit Tests
 * Tests the V2 widget generation service, prompt building, response parsing, and quality scoring
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PromptBuilder,
  getPromptBuilder,
} from './PromptBuilder';
import {
  ResponseParser,
  getResponseParser,
} from './ResponseParser';
import {
  QualityAnalyzer,
  getQualityAnalyzer,
} from './QualityAnalyzer';
import {
  SessionManager,
  getSessionManager,
  createSessionManager,
  STEP_CONFIG,
  getStepLabel,
  getStepProgress,
} from './GenerationSession';
import {
  PipelineIntegration,
  analyzeWidgetConnections,
  getCompatibilityLabel,
  suggestCommonConnections,
} from './PipelineIntegration';
import type {
  GenerationRequest,
  StylePreset,
  ComplexityLevel,
  ParsedWidget,
} from './types';

// ============================================
// Prompt Builder Tests
// ============================================

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = getPromptBuilder();
  });

  describe('buildSystemPrompt', () => {
    it('should include Protocol v3.0 requirements', () => {
      const prompt = builder.buildSystemPrompt();
      expect(prompt).toContain('Protocol v3.0');
      expect(prompt).toContain('WidgetAPI');
      expect(prompt).toContain('postMessage');
    });

    it('should include JSON output format', () => {
      const prompt = builder.buildSystemPrompt();
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('manifest');
      expect(prompt).toContain('html');
    });
  });

  describe('buildGenerationPrompt', () => {
    it('should include user description', () => {
      const request: GenerationRequest = {
        description: 'A countdown timer with start/pause/reset',
        mode: 'new',
      };
      const prompt = builder.buildGenerationPrompt(request);
      expect(prompt).toContain('countdown timer');
      expect(prompt).toContain('start/pause/reset');
    });

    it('should include style preset when specified', () => {
      const request: GenerationRequest = {
        description: 'A button',
        mode: 'new',
        stylePreset: 'neon',
      };
      const prompt = builder.buildGenerationPrompt(request);
      expect(prompt.toLowerCase()).toContain('neon');
    });

    it('should include complexity level when specified', () => {
      const request: GenerationRequest = {
        description: 'A calculator',
        mode: 'new',
        complexity: 'advanced',
      };
      const prompt = builder.buildGenerationPrompt(request);
      expect(prompt.toLowerCase()).toContain('advanced');
    });

    it('should include feature requirements', () => {
      const request: GenerationRequest = {
        description: 'A slider',
        mode: 'new',
        features: {
          animations: true,
          persistence: true,
          keyboardShortcuts: true,
        },
      };
      const prompt = builder.buildGenerationPrompt(request);
      expect(prompt.toLowerCase()).toContain('animation');
    });
  });

  describe('buildIterationPrompt', () => {
    it('should include existing widget code', () => {
      const html = '<div class="widget">Test</div>';
      const manifest = { name: 'Test Widget', version: '1.0.0' };
      const feedback = 'Make it bigger';
      const prompt = builder.buildIterationPrompt(html, manifest, feedback);
      expect(prompt).toContain('widget');
      expect(prompt).toContain('bigger');
    });
  });

  describe('buildVariationPrompt', () => {
    it('should include source widget and variation description', () => {
      const html = '<div>Source</div>';
      const manifest = { name: 'Source Widget', version: '1.0.0' };
      const variation = 'Change to dark theme';
      const prompt = builder.buildVariationPrompt(html, manifest, variation);
      expect(prompt).toContain('dark theme');
    });
  });
});

// ============================================
// Response Parser Tests
// ============================================

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = getResponseParser();
  });

  describe('parse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        manifest: {
          name: 'Test Widget',
          version: '1.0.0',
          description: 'A test widget',
        },
        html: '<div>Test</div>',
        explanation: 'Simple test widget',
      });

      const result = parser.parse(response);
      expect(result.success).toBe(true);
      expect(result.widget?.manifest.name).toBe('Test Widget');
      expect(result.widget?.html).toContain('Test');
    });

    it('should extract JSON from markdown code blocks', () => {
      const response = `Here's the widget:

\`\`\`json
{
  "manifest": {
    "name": "Code Block Widget",
    "version": "1.0.0"
  },
  "html": "<div>From code block</div>"
}
\`\`\`

The widget is ready!`;

      const result = parser.parse(response);
      expect(result.success).toBe(true);
      expect(result.widget?.manifest.name).toBe('Code Block Widget');
    });

    it('should handle nested objects and find outermost', () => {
      const response = `Creating widget with nested data: {"manifest": {"name": "Outer", "version": "1.0.0", "nested": {"inner": "value"}}, "html": "<div>Outer</div>"}`;
      const result = parser.parse(response);
      expect(result.success).toBe(true);
      expect(result.widget?.manifest.name).toBe('Outer');
    });

    it('should return error for invalid JSON', () => {
      const response = 'This is not JSON at all';
      const result = parser.parse(response);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for missing manifest', () => {
      const response = JSON.stringify({
        html: '<div>No manifest</div>',
      });
      const result = parser.parse(response);
      expect(result.success).toBe(false);
    });

    it('should return error for missing html', () => {
      const response = JSON.stringify({
        manifest: { name: 'No HTML', version: '1.0.0' },
      });
      const result = parser.parse(response);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================
// Quality Analyzer Tests
// ============================================

describe('QualityAnalyzer', () => {
  let analyzer: QualityAnalyzer;

  beforeEach(() => {
    analyzer = getQualityAnalyzer();
  });

  describe('analyze', () => {
    it('should score valid widget structure', () => {
      const widget: ParsedWidget = {
        manifest: {
          name: 'Quality Widget',
          version: '1.0.0',
          description: 'A well-made widget',
          protocol: 'v3.0',
          io: {
            inputs: [{ name: 'setValue', type: 'number' }],
            outputs: [{ name: 'valueChanged', type: 'number' }],
          },
        },
        html: `
          <!DOCTYPE html>
          <html>
          <head><title>Widget</title></head>
          <body>
            <div id="root">Content</div>
            <script>
              const WidgetAPI = window.WidgetAPI;
              WidgetAPI.on('setValue', (v) => console.log(v));
              WidgetAPI.emit('valueChanged', 42);
            </script>
          </body>
          </html>
        `,
        explanation: 'A quality widget',
      };

      const result = analyzer.analyze(widget);
      expect(result.score).toBeDefined();
      expect(result.score.overall).toBeGreaterThanOrEqual(0);
      expect(result.score.overall).toBeLessThanOrEqual(100);
    });

    it('should detect protocol compliance issues', () => {
      const widget: ParsedWidget = {
        manifest: {
          name: 'Non-compliant Widget',
          version: '1.0.0',
        },
        html: '<div>No WidgetAPI usage</div>',
      };

      const result = analyzer.analyze(widget);
      expect(result.score.protocol).toBeLessThan(100);
    });

    it('should provide improvement suggestions', () => {
      const widget: ParsedWidget = {
        manifest: {
          name: 'Basic Widget',
          version: '1.0.0',
        },
        html: '<div>Basic</div>',
      };

      const result = analyzer.analyze(widget);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Session Manager Tests
// ============================================

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = createSessionManager();
  });

  describe('createSession', () => {
    it('should create session with unique ID', () => {
      const request: GenerationRequest = {
        description: 'Test widget',
        mode: 'new',
      };
      const session = sessionManager.createSession(request);
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
      expect(session.status).toBe('active');
    });

    it('should store request in session', () => {
      const request: GenerationRequest = {
        description: 'Specific widget',
        mode: 'new',
        stylePreset: 'polished',
      };
      const session = sessionManager.createSession(request);
      expect(session.request.description).toBe('Specific widget');
      expect(session.request.stylePreset).toBe('polished');
    });
  });

  describe('updateProgress', () => {
    it('should update session progress', () => {
      const request: GenerationRequest = { description: 'Test', mode: 'new' };
      const session = sessionManager.createSession(request);

      sessionManager.updateProgress(session.id, 'calling-ai', 'Calling AI...', 50);

      const updated = sessionManager.getSession(session.id);
      expect(updated?.currentStep).toBe('calling-ai');
      expect(updated?.progress).toBe(50);
    });

    it('should notify progress listeners', () => {
      const request: GenerationRequest = { description: 'Test', mode: 'new' };
      const session = sessionManager.createSession(request);

      const listener = vi.fn();
      sessionManager.onProgress(session.id, listener);

      sessionManager.updateProgress(session.id, 'parsing-response', 'Parsing...', 75);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          step: 'parsing-response',
          progress: 75,
        })
      );
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', () => {
      const request: GenerationRequest = { description: 'Test', mode: 'new' };
      const session = sessionManager.createSession(request);

      sessionManager.completeSession(session.id);

      const completed = sessionManager.getSession(session.id);
      expect(completed?.status).toBe('completed');
    });
  });

  describe('failSession', () => {
    it('should mark session as failed with error', () => {
      const request: GenerationRequest = { description: 'Test', mode: 'new' };
      const session = sessionManager.createSession(request);

      sessionManager.failSession(session.id, 'AI provider error');

      const failed = sessionManager.getSession(session.id);
      expect(failed?.status).toBe('failed');
      expect(failed?.error).toBe('AI provider error');
    });
  });
});

// ============================================
// Step Configuration Tests
// ============================================

describe('Step Configuration', () => {
  it('should have all required steps', () => {
    const steps = [
      'preparing',
      'building-prompt',
      'calling-ai',
      'parsing-response',
      'validating',
      'scoring-quality',
      'creating-draft',
      'complete',
      'failed',
    ];

    steps.forEach(step => {
      expect(STEP_CONFIG[step as keyof typeof STEP_CONFIG]).toBeDefined();
    });
  });

  it('should return labels for all steps', () => {
    expect(getStepLabel('preparing')).toBe('Preparing');
    expect(getStepLabel('calling-ai')).toBe('Calling AI');
    expect(getStepLabel('complete')).toBe('Complete');
  });

  it('should return progress percentages', () => {
    expect(getStepProgress('preparing')).toBe(5);
    expect(getStepProgress('calling-ai')).toBe(50);
    expect(getStepProgress('complete')).toBe(100);
  });
});

// ============================================
// Pipeline Integration Tests
// ============================================

describe('PipelineIntegration', () => {
  describe('getCompatibilityLabel', () => {
    it('should return Excellent for high scores', () => {
      const result = getCompatibilityLabel(0.9);
      expect(result.label).toBe('Excellent');
      expect(result.color).toBe('#22c55e');
    });

    it('should return Good for medium-high scores', () => {
      const result = getCompatibilityLabel(0.7);
      expect(result.label).toBe('Good');
    });

    it('should return Possible for medium scores', () => {
      const result = getCompatibilityLabel(0.5);
      expect(result.label).toBe('Possible');
    });

    it('should return Weak for low scores', () => {
      const result = getCompatibilityLabel(0.2);
      expect(result.label).toBe('Weak');
    });
  });

  describe('suggestCommonConnections', () => {
    it('should suggest connections for timer outputs', () => {
      const widget = {
        id: 'test-1',
        manifest: {
          name: 'Test Timer',
          version: '1.0.0',
          io: {
            outputs: [{ name: 'tick', type: 'number' }],
          },
        },
        html: '<div>Timer</div>',
      };

      const suggestions = suggestCommonConnections(widget as any);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('tick'))).toBe(true);
    });

    it('should suggest connections for click events', () => {
      const widget = {
        id: 'test-2',
        manifest: {
          name: 'Test Button',
          version: '1.0.0',
          io: {
            outputs: [{ name: 'clicked', type: 'event' }],
          },
        },
        html: '<div>Button</div>',
      };

      const suggestions = suggestCommonConnections(widget as any);
      expect(suggestions.some(s => s.includes('clicked'))).toBe(true);
    });
  });
});

// ============================================
// Integration Test
// ============================================

describe('V2 Generator Integration', () => {
  it('should have all modules working together', () => {
    // Verify all singleton getters work
    expect(getPromptBuilder()).toBeInstanceOf(PromptBuilder);
    expect(getResponseParser()).toBeInstanceOf(ResponseParser);
    expect(getQualityAnalyzer()).toBeInstanceOf(QualityAnalyzer);
    expect(getSessionManager()).toBeDefined();
  });

  it('should build, parse, and analyze in sequence', () => {
    const builder = getPromptBuilder();
    const parser = getResponseParser();
    const analyzer = getQualityAnalyzer();

    // Build prompt
    const request: GenerationRequest = {
      description: 'A simple counter',
      mode: 'new',
    };
    const prompt = builder.buildGenerationPrompt(request);
    expect(prompt).toContain('counter');

    // Parse response (simulated)
    const mockResponse = JSON.stringify({
      manifest: {
        name: 'Counter',
        version: '1.0.0',
        protocol: 'v3.0',
      },
      html: '<div id="counter">0</div><script>const WidgetAPI = window.WidgetAPI;</script>',
      explanation: 'A simple counter widget',
    });
    const parseResult = parser.parse(mockResponse);
    expect(parseResult.success).toBe(true);

    // Analyze quality
    if (parseResult.widget) {
      const analysis = analyzer.analyze(parseResult.widget);
      expect(analysis.score.overall).toBeDefined();
    }
  });
});
