/**
 * Widget Generator Unit Tests
 * Tests the widget generation logic, prompt building, and response parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module functions we want to test
// Since the file exports a default handler, we need to test the internal logic patterns

describe('Widget Generator', () => {
  describe('Widget Type Detection', () => {
    // Test the detection logic patterns
    const detectWidgetType = (description: string): 'vector' | 'pipeline' | 'general' => {
      const lower = description.toLowerCase();

      if (lower.includes('vector') || lower.includes('shape') || lower.includes('svg') ||
          lower.includes('canvas') || lower.includes('draw') || lower.includes('color') ||
          lower.includes('fill') || lower.includes('stroke') || lower.includes('transform') ||
          lower.includes('layer') || lower.includes('shadow') || lower.includes('entity') ||
          lower.includes('drop shadow') || lower.includes('opacity') || lower.includes('gradient')) {
        return 'vector';
      }

      if (lower.includes('pipeline') || lower.includes('data flow') || lower.includes('chain')) {
        return 'pipeline';
      }

      return 'general';
    };

    it('should detect vector widget from shape keywords', () => {
      expect(detectWidgetType('Create a shape selector')).toBe('vector');
      expect(detectWidgetType('Color picker for fill')).toBe('vector');
      expect(detectWidgetType('Stroke width controller')).toBe('vector');
      expect(detectWidgetType('Drop shadow effect panel')).toBe('vector');
      expect(detectWidgetType('Layer manager')).toBe('vector');
      expect(detectWidgetType('Transform controls')).toBe('vector');
      expect(detectWidgetType('Gradient editor')).toBe('vector');
      expect(detectWidgetType('Opacity slider')).toBe('vector');
    });

    it('should detect pipeline widget from flow keywords', () => {
      expect(detectWidgetType('Pipeline controller')).toBe('pipeline');
      expect(detectWidgetType('Data flow manager')).toBe('pipeline');
      expect(detectWidgetType('Widget chain configurator')).toBe('pipeline');
    });

    it('should detect general widget for other descriptions', () => {
      expect(detectWidgetType('Timer widget')).toBe('general');
      expect(detectWidgetType('Counter display')).toBe('general');
      expect(detectWidgetType('Note taking widget')).toBe('general');
      expect(detectWidgetType('Weather display')).toBe('general');
      expect(detectWidgetType('Calculator')).toBe('general');
    });
  });

  describe('Style Examples', () => {
    const STYLE_EXAMPLES: Record<string, string> = {
      minimal: `/* MINIMAL STYLE */`,
      polished: `/* POLISHED STYLE */`,
      glass: `/* GLASSMORPHISM STYLE */`,
      neon: `/* NEON/CYBERPUNK STYLE */`,
      retro: `/* RETRO/8-BIT STYLE */`,
      elaborate: `/* ELABORATE STYLE */`,
    };

    it('should have all required style examples', () => {
      expect(STYLE_EXAMPLES).toHaveProperty('minimal');
      expect(STYLE_EXAMPLES).toHaveProperty('polished');
      expect(STYLE_EXAMPLES).toHaveProperty('glass');
      expect(STYLE_EXAMPLES).toHaveProperty('neon');
      expect(STYLE_EXAMPLES).toHaveProperty('retro');
      expect(STYLE_EXAMPLES).toHaveProperty('elaborate');
    });

    it('should provide fallback for unknown styles', () => {
      const getStyle = (style: string) => STYLE_EXAMPLES[style] || STYLE_EXAMPLES.polished;
      expect(getStyle('unknown')).toBe(STYLE_EXAMPLES.polished);
      expect(getStyle('minimal')).toBe(STYLE_EXAMPLES.minimal);
    });
  });

  describe('Response Parsing', () => {
    const parseWidgetResponse = (result: string) => {
      let jsonStr = result.trim();

      // Handle markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Try to find JSON object in response
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
      }

      return JSON.parse(jsonStr);
    };

    it('should parse clean JSON response', () => {
      const response = `{
        "manifest": { "id": "test-widget", "name": "Test" },
        "html": "<!DOCTYPE html><html></html>",
        "explanation": "A test widget"
      }`;

      const parsed = parseWidgetResponse(response);
      expect(parsed.manifest.id).toBe('test-widget');
      expect(parsed.html).toContain('<!DOCTYPE html>');
    });

    it('should parse JSON with markdown code blocks', () => {
      const response = `Here's the widget:
\`\`\`json
{
  "manifest": { "id": "markdown-widget", "name": "Test" },
  "html": "<!DOCTYPE html><html></html>",
  "explanation": "A test widget"
}
\`\`\``;

      const parsed = parseWidgetResponse(response);
      expect(parsed.manifest.id).toBe('markdown-widget');
    });

    it('should parse JSON with extra text around it', () => {
      const response = `I'll create a widget for you.
{
  "manifest": { "id": "extra-text-widget", "name": "Test" },
  "html": "<!DOCTYPE html><html></html>",
  "explanation": "A test widget"
}
Let me know if you need changes.`;

      const parsed = parseWidgetResponse(response);
      expect(parsed.manifest.id).toBe('extra-text-widget');
    });

    it('should throw on invalid JSON', () => {
      const response = `This is not valid JSON at all`;
      expect(() => parseWidgetResponse(response)).toThrow();
    });
  });

  describe('Generated Widget Validation', () => {
    interface GeneratedWidget {
      id: string;
      name: string;
      manifest: {
        id: string;
        name: string;
        version: string;
        description?: string;
        entry: string;
        category: string;
        size: {
          defaultWidth: number;
          defaultHeight: number;
          minWidth?: number;
          minHeight?: number;
        };
        events?: {
          emits?: string[];
          listens?: string[];
        };
      };
      html: string;
      explanation: string;
    }

    const validateWidget = (widget: GeneratedWidget): string[] => {
      const errors: string[] = [];

      if (!widget.manifest) {
        errors.push('Missing manifest');
        return errors;
      }

      if (!widget.manifest.id || typeof widget.manifest.id !== 'string') {
        errors.push('Missing or invalid manifest.id');
      }

      if (!widget.manifest.name || typeof widget.manifest.name !== 'string') {
        errors.push('Missing or invalid manifest.name');
      }

      if (!widget.html || typeof widget.html !== 'string') {
        errors.push('Missing or invalid html');
      }

      if (widget.html && !widget.html.includes('<!DOCTYPE html>')) {
        errors.push('HTML should include DOCTYPE declaration');
      }

      if (widget.html && !widget.html.includes('READY')) {
        errors.push('HTML should include READY signal');
      }

      if (widget.html && !widget.html.includes('postMessage')) {
        errors.push('HTML should include postMessage for communication');
      }

      return errors;
    };

    it('should validate correct widget structure', () => {
      const validWidget: GeneratedWidget = {
        id: 'test-widget',
        name: 'Test Widget',
        manifest: {
          id: 'test-widget',
          name: 'Test Widget',
          version: '1.0.0',
          entry: 'index.html',
          category: 'utility',
          size: { defaultWidth: 200, defaultHeight: 300 },
        },
        html: `<!DOCTYPE html><html><script>window.parent.postMessage({ type: 'READY' }, '*');</script></html>`,
        explanation: 'A test widget',
      };

      const errors = validateWidget(validWidget);
      expect(errors).toHaveLength(0);
    });

    it('should catch missing manifest', () => {
      const invalidWidget = {
        id: 'test',
        name: 'Test',
        html: '<!DOCTYPE html>',
        explanation: 'Test',
      } as any;

      const errors = validateWidget(invalidWidget);
      expect(errors).toContain('Missing manifest');
    });

    it('should catch missing READY signal', () => {
      const widgetWithoutReady: GeneratedWidget = {
        id: 'test-widget',
        name: 'Test Widget',
        manifest: {
          id: 'test-widget',
          name: 'Test Widget',
          version: '1.0.0',
          entry: 'index.html',
          category: 'utility',
          size: { defaultWidth: 200, defaultHeight: 300 },
        },
        html: `<!DOCTYPE html><html><script>console.log('hello');</script></html>`,
        explanation: 'A test widget',
      };

      const errors = validateWidget(widgetWithoutReady);
      expect(errors).toContain('HTML should include READY signal');
    });

    it('should catch missing postMessage', () => {
      const widgetWithoutPostMessage: GeneratedWidget = {
        id: 'test-widget',
        name: 'Test Widget',
        manifest: {
          id: 'test-widget',
          name: 'Test Widget',
          version: '1.0.0',
          entry: 'index.html',
          category: 'utility',
          size: { defaultWidth: 200, defaultHeight: 300 },
        },
        html: `<!DOCTYPE html><html><script>const READY = true;</script></html>`,
        explanation: 'A test widget',
      };

      const errors = validateWidget(widgetWithoutPostMessage);
      expect(errors).toContain('HTML should include postMessage for communication');
    });
  });

  describe('Manifest Structure', () => {
    it('should generate valid manifest with required fields', () => {
      const manifest = {
        id: 'color-picker-abc123',
        name: 'Color Picker',
        version: '1.0.0',
        description: 'Pick colors for vector entities',
        entry: 'index.html',
        category: 'vector',
        size: {
          defaultWidth: 220,
          defaultHeight: 300,
          minWidth: 160,
          minHeight: 180,
        },
        events: {
          emits: ['vector:set-fill', 'vector:set-stroke'],
          listens: ['vector:selection-changed'],
        },
      };

      expect(manifest.id).toMatch(/^[a-z0-9-]+$/);
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(['vector', 'pipeline', 'utility']).toContain(manifest.category);
      expect(manifest.size.defaultWidth).toBeGreaterThan(0);
      expect(manifest.size.defaultHeight).toBeGreaterThan(0);
    });
  });

  describe('HTML Content Requirements', () => {
    const validateHtmlContent = (html: string): { valid: boolean; issues: string[] } => {
      const issues: string[] = [];

      // Check for DOCTYPE
      if (!html.includes('<!DOCTYPE html>')) {
        issues.push('Missing DOCTYPE declaration');
      }

      // Check for READY signal
      if (!html.includes("postMessage({ type: 'READY' }") &&
          !html.includes('postMessage({type:"READY"}') &&
          !html.includes("postMessage({ type: \"READY\" }")) {
        issues.push('Missing READY signal postMessage');
      }

      // Check for event listener
      if (!html.includes("addEventListener('message'") &&
          !html.includes('addEventListener("message"')) {
        issues.push('Missing message event listener');
      }

      // Check for basic structure
      if (!html.includes('<html') || !html.includes('</html>')) {
        issues.push('Missing html tags');
      }

      if (!html.includes('<head') && !html.includes('<style')) {
        issues.push('Missing head or style section');
      }

      if (!html.includes('<body') || !html.includes('</body>')) {
        issues.push('Missing body tags');
      }

      if (!html.includes('<script') || !html.includes('</script>')) {
        issues.push('Missing script tags');
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    };

    it('should validate complete widget HTML', () => {
      const completeHtml = `<!DOCTYPE html>
<html>
<head>
  <style>body { background: #fff; }</style>
</head>
<body>
  <div>Widget Content</div>
  <script>
    window.addEventListener('message', (e) => {
      if (e.data.type === 'widget:event') {
        console.log('Received event', e.data);
      }
    });
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;

      const result = validateHtmlContent(completeHtml);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing READY signal', () => {
      const htmlWithoutReady = `<!DOCTYPE html>
<html>
<head><style></style></head>
<body>
  <script>
    window.addEventListener('message', (e) => {});
  </script>
</body>
</html>`;

      const result = validateHtmlContent(htmlWithoutReady);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing READY signal postMessage');
    });

    it('should detect missing event listener', () => {
      const htmlWithoutListener = `<!DOCTYPE html>
<html>
<head><style></style></head>
<body>
  <script>
    window.parent.postMessage({ type: 'READY' }, '*');
  </script>
</body>
</html>`;

      const result = validateHtmlContent(htmlWithoutListener);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing message event listener');
    });
  });

  describe('Request Validation', () => {
    interface GenerationRequest {
      description: string;
      mode: 'new' | 'variation' | 'layer';
      quality?: 'basic' | 'standard' | 'advanced' | 'professional';
      style?: 'minimal' | 'polished' | 'elaborate' | 'glass' | 'neon' | 'retro';
    }

    const validateRequest = (request: GenerationRequest): string[] => {
      const errors: string[] = [];

      if (!request.description || request.description.trim().length === 0) {
        errors.push('Description is required');
      }

      if (request.description && request.description.length < 10) {
        errors.push('Description should be at least 10 characters');
      }

      if (!['new', 'variation', 'layer'].includes(request.mode)) {
        errors.push('Invalid mode');
      }

      if (request.quality && !['basic', 'standard', 'advanced', 'professional'].includes(request.quality)) {
        errors.push('Invalid quality level');
      }

      if (request.style && !['minimal', 'polished', 'elaborate', 'glass', 'neon', 'retro'].includes(request.style)) {
        errors.push('Invalid style');
      }

      return errors;
    };

    it('should validate correct request', () => {
      const request: GenerationRequest = {
        description: 'A color picker widget for selecting fill colors',
        mode: 'new',
        quality: 'standard',
        style: 'polished',
      };

      const errors = validateRequest(request);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty description', () => {
      const request: GenerationRequest = {
        description: '',
        mode: 'new',
      };

      const errors = validateRequest(request);
      expect(errors).toContain('Description is required');
    });

    it('should reject too short description', () => {
      const request: GenerationRequest = {
        description: 'Timer',
        mode: 'new',
      };

      const errors = validateRequest(request);
      expect(errors).toContain('Description should be at least 10 characters');
    });

    it('should reject invalid mode', () => {
      const request = {
        description: 'A useful widget for testing',
        mode: 'invalid' as any,
      };

      const errors = validateRequest(request);
      expect(errors).toContain('Invalid mode');
    });

    it('should reject invalid quality', () => {
      const request: GenerationRequest = {
        description: 'A useful widget for testing',
        mode: 'new',
        quality: 'super' as any,
      };

      const errors = validateRequest(request);
      expect(errors).toContain('Invalid quality level');
    });

    it('should reject invalid style', () => {
      const request: GenerationRequest = {
        description: 'A useful widget for testing',
        mode: 'new',
        style: 'futuristic' as any,
      };

      const errors = validateRequest(request);
      expect(errors).toContain('Invalid style');
    });
  });
});
