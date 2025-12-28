/**
 * StickerNest v2 - AI Widget Generator V2.0 Response Parser
 * Parses and validates AI responses into widget structures
 */

import type { WidgetManifest } from '../../types/manifest';
import type { ParsedWidget, ParseResult } from './types';

// ============================================
// Response Parser Class
// ============================================

export class ResponseParser {
  /**
   * Parse AI response into widget structure
   */
  parse(response: string): ParseResult {
    if (!response || response.trim().length === 0) {
      return {
        success: false,
        error: 'Empty response from AI',
        rawResponse: response,
      };
    }

    // Try multiple extraction strategies
    const strategies = [
      () => this.extractDirectJson(response),
      () => this.extractFromCodeBlock(response),
      () => this.extractOutermostJson(response),
      () => this.extractPartsManually(response),
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result) {
          // Validate the parsed result
          const validation = this.validateParsedWidget(result);
          if (validation.valid) {
            return {
              success: true,
              widget: result,
            };
          }
        }
      } catch (e) {
        // Continue to next strategy
        continue;
      }
    }

    return {
      success: false,
      error: 'Failed to parse AI response into valid widget structure',
      rawResponse: response.substring(0, 1000),
    };
  }

  /**
   * Clean and fix common JSON issues
   */
  cleanJson(jsonStr: string): string {
    return jsonStr
      .replace(/,\s*}/g, '}')        // Remove trailing commas before }
      .replace(/,\s*]/g, ']')        // Remove trailing commas before ]
      .replace(/[\r\n]+/g, '\n')     // Normalize line endings
      .replace(/\t/g, '  ')          // Convert tabs to spaces
      .trim();
  }

  // ============================================
  // Extraction Strategies
  // ============================================

  private extractDirectJson(response: string): ParsedWidget | null {
    const cleaned = this.cleanJson(response);

    // Try direct parse if response is already JSON
    if (cleaned.startsWith('{')) {
      const parsed = JSON.parse(cleaned);
      if (parsed.manifest && parsed.html) {
        return {
          manifest: parsed.manifest,
          html: parsed.html,
          explanation: parsed.explanation,
        };
      }
    }
    return null;
  }

  private extractFromCodeBlock(response: string): ParsedWidget | null {
    // Look for JSON in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const jsonStr = this.cleanJson(jsonMatch[1]);
      const parsed = JSON.parse(jsonStr);
      if (parsed.manifest && parsed.html) {
        return {
          manifest: parsed.manifest,
          html: parsed.html,
          explanation: parsed.explanation,
        };
      }
    }
    return null;
  }

  private extractOutermostJson(response: string): ParsedWidget | null {
    // Find the outermost JSON object
    const firstBrace = response.indexOf('{');
    const lastBrace = response.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const jsonStr = this.cleanJson(response.substring(firstBrace, lastBrace + 1));
    const parsed = JSON.parse(jsonStr);

    if (parsed.manifest && parsed.html) {
      return {
        manifest: parsed.manifest,
        html: parsed.html,
        explanation: parsed.explanation,
      };
    }
    return null;
  }

  private extractPartsManually(response: string): ParsedWidget | null {
    // Try to extract manifest and html separately
    // This is a fallback for malformed JSON

    // Extract manifest
    const manifestMatch = response.match(/"manifest"\s*:\s*(\{[\s\S]*?\})\s*,?\s*"html"/);
    if (!manifestMatch) {
      return null;
    }

    let manifest: WidgetManifest;
    try {
      // Try to parse manifest, handling nested objects
      const manifestStr = this.extractNestedObject(response, '"manifest"');
      if (!manifestStr) return null;
      manifest = JSON.parse(manifestStr);
    } catch {
      return null;
    }

    // Extract HTML - it's a string value
    const htmlMatch = response.match(/"html"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!htmlMatch) {
      // Try with single quotes or template literals
      const altHtmlMatch = response.match(/"html"\s*:\s*'((?:[^'\\]|\\.)*)'/);
      if (!altHtmlMatch) return null;

      const html = this.unescapeString(altHtmlMatch[1]);
      return { manifest, html };
    }

    const html = this.unescapeString(htmlMatch[1]);

    // Extract explanation if present
    const explanationMatch = response.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const explanation = explanationMatch ? this.unescapeString(explanationMatch[1]) : undefined;

    return { manifest, html, explanation };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractNestedObject(str: string, key: string): string | null {
    const keyIndex = str.indexOf(key);
    if (keyIndex === -1) return null;

    // Find the colon after the key
    const colonIndex = str.indexOf(':', keyIndex);
    if (colonIndex === -1) return null;

    // Find the opening brace
    const braceIndex = str.indexOf('{', colonIndex);
    if (braceIndex === -1) return null;

    // Count braces to find the matching closing brace
    let depth = 0;
    let endIndex = -1;

    for (let i = braceIndex; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) return null;

    return str.substring(braceIndex, endIndex + 1);
  }

  private unescapeString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  private validateParsedWidget(widget: ParsedWidget): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check manifest
    if (!widget.manifest) {
      errors.push('Missing manifest');
    } else {
      if (!widget.manifest.id) errors.push('Missing manifest.id');
      if (!widget.manifest.name) errors.push('Missing manifest.name');
      if (!widget.manifest.version) errors.push('Missing manifest.version');
      if (!widget.manifest.entry) errors.push('Missing manifest.entry');
    }

    // Check HTML
    if (!widget.html) {
      errors.push('Missing HTML');
    } else if (widget.html.length < 100) {
      errors.push('HTML content too short');
    } else {
      // Validate READY signal presence - CRITICAL for widget to work
      const hasReadySignal = this.hasReadySignal(widget.html);
      if (!hasReadySignal) {
        errors.push('Missing READY signal - widget must include postMessage({ type: "READY" }, "*")');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if HTML contains a READY signal
   * Supports multiple formats for flexibility
   */
  private hasReadySignal(html: string): boolean {
    // Check for various formats of the READY signal
    const readyPatterns = [
      /postMessage\s*\(\s*\{\s*type\s*:\s*['"]READY['"]/i,                    // postMessage({ type: 'READY'
      /postMessage\s*\(\s*\{\s*['"]type['"]\s*:\s*['"]READY['"]/i,            // postMessage({ "type": "READY"
      /postMessage\s*\(\s*\{type\s*:\s*['"]READY['"]/,                         // postMessage({type:'READY'
    ];

    return readyPatterns.some(pattern => pattern.test(html));
  }

  /**
   * Inject READY signal into HTML if missing
   * This is a recovery mechanism for AI-generated widgets
   */
  injectReadySignalIfMissing(html: string): string {
    if (this.hasReadySignal(html)) {
      return html;
    }

    // Find the closing </script> tag and inject READY signal before it
    const lastScriptClose = html.lastIndexOf('</script>');
    if (lastScriptClose === -1) {
      // No script tag found, inject one before </body>
      const bodyClose = html.lastIndexOf('</body>');
      if (bodyClose === -1) {
        // Append at the end
        return html + `\n<script>window.parent.postMessage({ type: 'READY' }, '*');</script>`;
      }
      return html.slice(0, bodyClose) +
        `  <script>\n    // Auto-injected READY signal\n    window.parent.postMessage({ type: 'READY' }, '*');\n  </script>\n` +
        html.slice(bodyClose);
    }

    // Inject just before the last </script>
    return html.slice(0, lastScriptClose) +
      `\n    // Auto-injected READY signal\n    window.parent.postMessage({ type: 'READY' }, '*');\n  ` +
      html.slice(lastScriptClose);
  }

  /**
   * Parse and ensure READY signal is present
   * Returns parsed widget with auto-injected READY signal if missing
   */
  parseAndEnsureReady(response: string): ParseResult {
    const result = this.parse(response);

    if (result.success && result.widget) {
      // Check if READY signal is missing
      if (!this.hasReadySignal(result.widget.html)) {
        // Auto-inject READY signal
        result.widget.html = this.injectReadySignalIfMissing(result.widget.html);
        console.warn('[ResponseParser] Auto-injected missing READY signal into generated widget');
      }
    }

    return result;
  }
}

// ============================================
// Singleton Export
// ============================================

let responseParserInstance: ResponseParser | null = null;

export function getResponseParser(): ResponseParser {
  if (!responseParserInstance) {
    responseParserInstance = new ResponseParser();
  }
  return responseParserInstance;
}
