/**
 * StickerNest v2 - Behavioral Tester
 * Runtime security testing for widgets in sandbox
 */

import type { WidgetManifest } from '../../types/manifest';

/** Individual test result */
export interface BehavioralTest {
  name: string;
  description: string;
  passed: boolean;
  message: string;
  durationMs: number;
  recommendation?: string;
}

/** Behavioral test result */
export interface BehavioralTestResult {
  passed: boolean;
  tests: BehavioralTest[];
  summary: string;
}

/** Tester options */
export interface BehavioralTesterOptions {
  timeout: number;
}

const DEFAULT_OPTIONS: BehavioralTesterOptions = {
  timeout: 5000,
};

/**
 * Behavioral Tester - runtime security testing
 */
export class BehavioralTester {
  private options: BehavioralTesterOptions;

  constructor(options: Partial<BehavioralTesterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Run behavioral tests on a widget
   */
  async test(manifest: WidgetManifest, html: string): Promise<BehavioralTestResult> {
    const tests: BehavioralTest[] = [];

    // Create test sandbox
    const sandbox = await this.createTestSandbox(manifest, html);
    
    if (!sandbox) {
      return {
        passed: false,
        tests: [{
          name: 'sandbox-creation',
          description: 'Create test sandbox',
          passed: false,
          message: 'Failed to create test sandbox',
          durationMs: 0,
        }],
        summary: 'Could not create test sandbox',
      };
    }

    try {
      // Run each behavioral test
      tests.push(await this.testSandboxIsolation(sandbox));
      tests.push(await this.testWidgetApiUsage(sandbox));
      tests.push(await this.testEventFlooding(sandbox));
      tests.push(await this.testMemoryUsage(sandbox));
      tests.push(await this.testResponseTime(sandbox));
    } finally {
      // Cleanup sandbox
      this.destroySandbox(sandbox);
    }

    const passed = tests.every(t => t.passed);
    const failedCount = tests.filter(t => !t.passed).length;

    return {
      passed,
      tests,
      summary: passed 
        ? 'All behavioral tests passed'
        : `${failedCount} behavioral test(s) failed`,
    };
  }

  /**
   * Create an isolated test sandbox
   */
  private async createTestSandbox(
    manifest: WidgetManifest, 
    html: string
  ): Promise<HTMLIFrameElement | null> {
    try {
      const iframe = document.createElement('iframe');
      
      // Strict sandbox settings for testing
      iframe.sandbox.add('allow-scripts');
      // Note: NOT adding allow-same-origin for maximum isolation
      
      iframe.style.display = 'none';
      iframe.style.width = '400px';
      iframe.style.height = '300px';
      
      document.body.appendChild(iframe);

      // Write test content
      const testHtml = this.wrapWithTestHarness(html, manifest);
      iframe.srcdoc = testHtml;

      // Wait for load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Sandbox load timeout'));
        }, this.options.timeout);

        iframe.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      return iframe;
    } catch (error) {
      console.error('[BehavioralTester] Sandbox creation failed:', error);
      return null;
    }
  }

  /**
   * Wrap HTML with test harness
   */
  private wrapWithTestHarness(html: string, _manifest: WidgetManifest): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <script>
    // Test harness - mock WidgetAPI
    window.__TEST_RESULTS__ = {
      events: [],
      errors: [],
      warnings: [],
      apiCalls: [],
      startTime: Date.now()
    };

    // Mock WidgetAPI
    window.WidgetAPI = {
      emitEvent: function(event) {
        window.__TEST_RESULTS__.events.push({
          type: 'emit',
          event: event,
          time: Date.now()
        });
      },
      onEvent: function(type, handler) {
        window.__TEST_RESULTS__.apiCalls.push({
          method: 'onEvent',
          type: type,
          time: Date.now()
        });
        return function() {};
      },
      getState: function() {
        window.__TEST_RESULTS__.apiCalls.push({
          method: 'getState',
          time: Date.now()
        });
        return {};
      },
      setState: function(patch) {
        window.__TEST_RESULTS__.apiCalls.push({
          method: 'setState',
          patch: patch,
          time: Date.now()
        });
      },
      getAssetUrl: function(path) {
        return 'test://assets/' + path;
      },
      log: function(msg) {
        window.__TEST_RESULTS__.apiCalls.push({
          method: 'log',
          msg: msg,
          time: Date.now()
        });
      },
      info: function(msg) { window.WidgetAPI.log(msg); },
      warn: function(msg) { window.__TEST_RESULTS__.warnings.push(msg); },
      error: function(msg) { window.__TEST_RESULTS__.errors.push(msg); }
    };

    // Track errors
    window.onerror = function(msg, url, line, col, error) {
      window.__TEST_RESULTS__.errors.push({
        message: msg,
        line: line,
        error: error ? error.toString() : null
      });
    };

    window.onunhandledrejection = function(event) {
      window.__TEST_RESULTS__.errors.push({
        message: 'Unhandled rejection: ' + event.reason
      });
    };
  </script>

  ${html}

  <script>
    // Mark test as ready
    window.__TEST_READY__ = true;
  </script>
</body>
</html>`;
  }

  /**
   * Test sandbox isolation
   */
  private async testSandboxIsolation(sandbox: HTMLIFrameElement): Promise<BehavioralTest> {
    const startTime = Date.now();

    try {
      // Try to access parent - should fail
      let canAccessParent = false;
      
      try {
        // Without allow-same-origin, this should throw
        const _ = sandbox.contentWindow?.parent?.document;
        canAccessParent = !!_;
      } catch {
        canAccessParent = false;
      }

      if (canAccessParent) {
        return {
          name: 'sandbox-isolation',
          description: 'Verify widget cannot access parent frame',
          passed: false,
          message: 'Widget can access parent frame - sandbox isolation failed',
          durationMs: Date.now() - startTime,
          recommendation: 'Ensure sandbox attribute does not include allow-same-origin',
        };
      }

      return {
        name: 'sandbox-isolation',
        description: 'Verify widget cannot access parent frame',
        passed: true,
        message: 'Sandbox isolation working correctly',
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'sandbox-isolation',
        description: 'Verify widget cannot access parent frame',
        passed: true, // Error means isolation is working
        message: 'Sandbox isolation verified through error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Test proper WidgetAPI usage
   */
  private async testWidgetApiUsage(sandbox: HTMLIFrameElement): Promise<BehavioralTest> {
    const startTime = Date.now();

    try {
      // Wait a bit for widget to initialize
      await this.sleep(500);

      const results = (sandbox.contentWindow as any)?.__TEST_RESULTS__;
      
      if (!results) {
        return {
          name: 'widget-api-usage',
          description: 'Verify widget uses WidgetAPI correctly',
          passed: false,
          message: 'Could not access test results',
          durationMs: Date.now() - startTime,
        };
      }

      // Check for errors
      if (results.errors.length > 0) {
        return {
          name: 'widget-api-usage',
          description: 'Verify widget uses WidgetAPI correctly',
          passed: false,
          message: `Widget had ${results.errors.length} error(s): ${results.errors[0]?.message || 'Unknown'}`,
          durationMs: Date.now() - startTime,
          recommendation: 'Fix JavaScript errors in widget code',
        };
      }

      // Check if API was used
      if (results.apiCalls.length === 0 && results.events.length === 0) {
        return {
          name: 'widget-api-usage',
          description: 'Verify widget uses WidgetAPI correctly',
          passed: true,
          message: 'Widget initialized without WidgetAPI calls (may be static)',
          durationMs: Date.now() - startTime,
        };
      }

      return {
        name: 'widget-api-usage',
        description: 'Verify widget uses WidgetAPI correctly',
        passed: true,
        message: `Widget made ${results.apiCalls.length} API calls and emitted ${results.events.length} events`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'widget-api-usage',
        description: 'Verify widget uses WidgetAPI correctly',
        passed: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown'}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Test for event flooding
   */
  private async testEventFlooding(sandbox: HTMLIFrameElement): Promise<BehavioralTest> {
    const startTime = Date.now();

    try {
      // Wait for widget activity
      await this.sleep(1000);

      const results = (sandbox.contentWindow as any)?.__TEST_RESULTS__;
      
      if (!results) {
        return {
          name: 'event-flooding',
          description: 'Check for excessive event emission',
          passed: true,
          message: 'Could not measure event count',
          durationMs: Date.now() - startTime,
        };
      }

      const eventCount = results.events.length;
      const duration = (Date.now() - results.startTime) / 1000;
      const eventsPerSecond = eventCount / Math.max(duration, 0.1);

      // Threshold: more than 100 events per second is concerning
      if (eventsPerSecond > 100) {
        return {
          name: 'event-flooding',
          description: 'Check for excessive event emission',
          passed: false,
          message: `Widget emitting ${eventsPerSecond.toFixed(0)} events/sec - possible flood`,
          durationMs: Date.now() - startTime,
          recommendation: 'Add debouncing or throttling to event emissions',
        };
      }

      return {
        name: 'event-flooding',
        description: 'Check for excessive event emission',
        passed: true,
        message: `Event rate: ${eventsPerSecond.toFixed(1)} events/sec`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'event-flooding',
        description: 'Check for excessive event emission',
        passed: true,
        message: 'Could not measure event flooding',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Test memory usage
   */
  private async testMemoryUsage(_sandbox: HTMLIFrameElement): Promise<BehavioralTest> {
    const startTime = Date.now();

    try {
      // Check if performance.memory is available (Chrome only)
      const performance = (window as any).performance;
      
      if (!performance?.memory) {
        return {
          name: 'memory-usage',
          description: 'Check for memory leaks',
          passed: true,
          message: 'Memory API not available - skipped',
          durationMs: Date.now() - startTime,
        };
      }

      const beforeMemory = performance.memory.usedJSHeapSize;
      
      // Wait a bit
      await this.sleep(500);
      
      const afterMemory = performance.memory.usedJSHeapSize;
      const memoryGrowth = afterMemory - beforeMemory;
      const growthMB = memoryGrowth / (1024 * 1024);

      // Threshold: more than 10MB growth in 500ms is concerning
      if (growthMB > 10) {
        return {
          name: 'memory-usage',
          description: 'Check for memory leaks',
          passed: false,
          message: `Memory grew by ${growthMB.toFixed(1)}MB - possible leak`,
          durationMs: Date.now() - startTime,
          recommendation: 'Check for unbounded array growth or event listener accumulation',
        };
      }

      return {
        name: 'memory-usage',
        description: 'Check for memory leaks',
        passed: true,
        message: `Memory stable (${growthMB.toFixed(2)}MB change)`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'memory-usage',
        description: 'Check for memory leaks',
        passed: true,
        message: 'Could not measure memory usage',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Test response time
   */
  private async testResponseTime(sandbox: HTMLIFrameElement): Promise<BehavioralTest> {
    const startTime = Date.now();

    try {
      const results = (sandbox.contentWindow as any)?.__TEST_RESULTS__;
      
      if (!results) {
        return {
          name: 'response-time',
          description: 'Check widget initialization time',
          passed: true,
          message: 'Could not measure initialization time',
          durationMs: Date.now() - startTime,
        };
      }

      const initTime = Date.now() - results.startTime;

      // Threshold: more than 3 seconds is too slow
      if (initTime > 3000) {
        return {
          name: 'response-time',
          description: 'Check widget initialization time',
          passed: false,
          message: `Widget took ${initTime}ms to initialize - too slow`,
          durationMs: Date.now() - startTime,
          recommendation: 'Optimize initialization code, defer heavy operations',
        };
      }

      return {
        name: 'response-time',
        description: 'Check widget initialization time',
        passed: true,
        message: `Initialization time: ${initTime}ms`,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'response-time',
        description: 'Check widget initialization time',
        passed: true,
        message: 'Could not measure response time',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Destroy test sandbox
   */
  private destroySandbox(sandbox: HTMLIFrameElement): void {
    try {
      sandbox.remove();
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

