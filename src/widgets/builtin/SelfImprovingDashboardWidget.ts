/**
 * StickerNest v2 - Self-Improving Dashboard Widget
 * A canvas widget that displays AI self-improvement metrics and controls
 * Allows triggering reflections and viewing evaluation status from the canvas
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const SelfImprovingDashboardManifest: WidgetManifest = {
  id: 'stickernest.self-improving-dashboard',
  name: 'AI Self-Improvement Dashboard',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Dashboard showing AI self-improvement metrics, evaluations, and controls. Displays pass rates, scores, suggestions, and allows triggering reflection cycles.',
  author: 'StickerNest',
  tags: ['ai', 'dashboard', 'metrics', 'admin', 'self-improvement', 'reflection'],
  inputs: {
    'trigger.refresh': {
      type: 'event',
      description: 'Trigger a refresh of all metrics',
    },
    'trigger.reflect': {
      type: 'event',
      description: 'Trigger a reflection cycle',
    },
    'config.update': {
      type: 'object',
      description: 'Update reflection configuration',
    },
  },
  outputs: {
    'stats.updated': {
      type: 'object',
      description: 'Emitted when stats are refreshed',
    },
    'reflection.started': {
      type: 'object',
      description: 'Emitted when reflection starts',
    },
    'reflection.completed': {
      type: 'object',
      description: 'Emitted when reflection completes with results',
    },
    'evaluation.result': {
      type: 'object',
      description: 'Latest evaluation result',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['trigger.refresh', 'trigger.reflect', 'config.update'],
    outputs: ['stats.updated', 'reflection.started', 'reflection.completed', 'evaluation.result'],
  },
  size: {
    width: 380,
    height: 420,
    minWidth: 320,
    minHeight: 360,
    scaleMode: 'scale',
  },
};

export const SelfImprovingDashboardHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .header h1 {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }
    .status-active {
      background: var(--sn-success, #22c55e);
      color: white;
    }
    .status-inactive {
      background: var(--sn-text-muted, #64748b);
      color: white;
    }
    .status-running {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Content */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 8px;
      padding: 12px;
    }
    .stat-label {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 600;
    }
    .stat-value.good { color: var(--sn-success, #22c55e); }
    .stat-value.warning { color: var(--sn-warning, #f59e0b); }
    .stat-value.error { color: var(--sn-error, #ef4444); }
    .stat-subtext {
      font-size: 10px;
      color: var(--sn-text-muted, #64748b);
      margin-top: 2px;
    }

    /* Section */
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 8px;
    }

    /* Evaluation Item */
    .eval-item {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      border-left: 3px solid transparent;
    }
    .eval-item.passed { border-left-color: var(--sn-success, #22c55e); }
    .eval-item.failed { border-left-color: var(--sn-error, #ef4444); }
    .eval-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .eval-type {
      font-weight: 500;
      font-size: 11px;
    }
    .eval-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .eval-badge.pass { background: var(--sn-success, #22c55e); color: white; }
    .eval-badge.fail { background: var(--sn-error, #ef4444); color: white; }
    .eval-score {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    /* Suggestion Item */
    .suggestion-item {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .suggestion-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .severity-badge {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 3px;
      font-weight: 600;
    }
    .severity-low { background: var(--sn-info, #3b82f6); color: white; }
    .severity-medium { background: var(--sn-warning, #f59e0b); color: white; }
    .severity-high { background: var(--sn-error, #ef4444); color: white; }
    .suggestion-title {
      flex: 1;
      font-weight: 500;
    }
    .suggestion-desc {
      color: var(--sn-text-secondary, #94a3b8);
      line-height: 1.4;
    }

    /* Actions */
    .actions {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--sn-accent-secondary, #a78bfa);
    }
    .btn-secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }
    .btn-secondary:hover:not(:disabled) {
      background: var(--sn-bg-elevated, #2a2a42);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 20px;
      color: var(--sn-text-muted, #64748b);
      font-size: 11px;
    }

    /* Scrollbar */
    .content::-webkit-scrollbar {
      width: 4px;
    }
    .content::-webkit-scrollbar-track {
      background: transparent;
    }
    .content::-webkit-scrollbar-thumb {
      background: var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span>🧠</span>
        <span>Self-Improving AI</span>
      </h1>
      <span id="statusBadge" class="status-badge status-active">Active</span>
    </div>

    <div class="content">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Pass Rate</div>
          <div class="stat-value good" id="passRate">--</div>
          <div class="stat-subtext" id="passRateSub">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Score</div>
          <div class="stat-value" id="avgScore">--</div>
          <div class="stat-subtext">out of 5.0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Evaluations</div>
          <div class="stat-value" id="totalEvals">0</div>
          <div class="stat-subtext" id="lastEval">-</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Suggestions</div>
          <div class="stat-value" id="suggestionCount">0</div>
          <div class="stat-subtext">active</div>
        </div>
      </div>

      <!-- Recent Evaluations -->
      <div class="section">
        <div class="section-title">Recent Evaluations</div>
        <div id="evaluationsList">
          <div class="empty-state">No evaluations yet</div>
        </div>
      </div>

      <!-- Active Suggestions -->
      <div class="section">
        <div class="section-title">Top Suggestions</div>
        <div id="suggestionsList">
          <div class="empty-state">No active suggestions</div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="reflectBtn">
        🔍 Reflect Now
      </button>
      <button class="btn btn-secondary" id="refreshBtn">
        ↻ Refresh
      </button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        stats: {
          passRate: 0,
          averageScore: 0,
          totalEvaluations: 0,
          activeSuggestions: 0,
          lastReflection: null,
        },
        evaluations: [],
        suggestions: [],
        isReflecting: false,
        enabled: true,
      };

      // DOM Elements
      const statusBadge = document.getElementById('statusBadge');
      const passRateEl = document.getElementById('passRate');
      const passRateSubEl = document.getElementById('passRateSub');
      const avgScoreEl = document.getElementById('avgScore');
      const totalEvalsEl = document.getElementById('totalEvals');
      const lastEvalEl = document.getElementById('lastEval');
      const suggestionCountEl = document.getElementById('suggestionCount');
      const evaluationsListEl = document.getElementById('evaluationsList');
      const suggestionsListEl = document.getElementById('suggestionsList');
      const reflectBtn = document.getElementById('reflectBtn');
      const refreshBtn = document.getElementById('refreshBtn');

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        requestStats();
        API.log('Self-Improving Dashboard mounted');
      });

      // Handle inputs
      API.onInput('trigger.refresh', function() {
        requestStats();
      });

      API.onInput('trigger.reflect', function() {
        startReflection();
      });

      API.onInput('config.update', function(config) {
        state.enabled = config.enabled !== false;
        updateStatusBadge();
        API.setState({ enabled: state.enabled });
      });

      // State changes from outside
      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        updateUI();
      });

      // Button handlers
      reflectBtn.addEventListener('click', function() {
        if (!state.isReflecting) {
          startReflection();
        }
      });

      refreshBtn.addEventListener('click', function() {
        requestStats();
      });

      // Functions
      function requestStats() {
        // Request stats from parent (would connect to stores in real implementation)
        API.emit('request:stats', {});

        // For demo, use mock data if no response
        setTimeout(function() {
          if (state.stats.totalEvaluations === 0) {
            // Mock data for demonstration
            updateWithMockData();
          }
        }, 500);
      }

      function startReflection() {
        state.isReflecting = true;
        updateStatusBadge();
        reflectBtn.disabled = true;
        reflectBtn.textContent = '⏳ Reflecting...';

        API.emitOutput('reflection.started', { timestamp: Date.now() });
        API.emit('request:reflect', { forceRun: true });

        // Simulate completion after delay (real impl would wait for response)
        setTimeout(function() {
          state.isReflecting = false;
          updateStatusBadge();
          reflectBtn.disabled = false;
          reflectBtn.textContent = '🔍 Reflect Now';

          API.emitOutput('reflection.completed', {
            timestamp: Date.now(),
            success: true
          });

          requestStats();
        }, 3000);
      }

      function updateWithMockData() {
        state.stats = {
          passRate: 78,
          averageScore: 3.7,
          totalEvaluations: 24,
          activeSuggestions: 3,
          lastReflection: new Date().toISOString(),
        };

        state.evaluations = [
          { id: '1', type: 'widget_generation', passed: true, score: 4.2, timestamp: new Date().toISOString() },
          { id: '2', type: 'image_generation', passed: true, score: 3.8, timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '3', type: 'widget_generation', passed: false, score: 2.9, timestamp: new Date(Date.now() - 7200000).toISOString() },
        ];

        state.suggestions = [
          { id: '1', severity: 'medium', title: 'Improve protocol compliance', description: 'Some widgets missing READY signal' },
          { id: '2', severity: 'low', title: 'Enhance visual feedback', description: 'Consider adding loading states' },
        ];

        updateUI();
        API.emitOutput('stats.updated', state.stats);
      }

      function updateUI() {
        updateStatusBadge();
        updateStats();
        updateEvaluations();
        updateSuggestions();
      }

      function updateStatusBadge() {
        statusBadge.className = 'status-badge';
        if (state.isReflecting) {
          statusBadge.classList.add('status-running');
          statusBadge.textContent = 'Reflecting...';
        } else if (state.enabled) {
          statusBadge.classList.add('status-active');
          statusBadge.textContent = 'Active';
        } else {
          statusBadge.classList.add('status-inactive');
          statusBadge.textContent = 'Inactive';
        }
      }

      function updateStats() {
        const s = state.stats;

        // Pass rate
        passRateEl.textContent = s.passRate.toFixed(0) + '%';
        passRateEl.className = 'stat-value ' + (s.passRate >= 70 ? 'good' : s.passRate >= 50 ? 'warning' : 'error');
        passRateSubEl.textContent = 'of evaluations';

        // Average score
        avgScoreEl.textContent = s.averageScore.toFixed(1);
        avgScoreEl.className = 'stat-value ' + (s.averageScore >= 3.5 ? 'good' : s.averageScore >= 2.5 ? 'warning' : 'error');

        // Total evaluations
        totalEvalsEl.textContent = s.totalEvaluations;

        // Last reflection
        if (s.lastReflection) {
          const date = new Date(s.lastReflection);
          const diff = Date.now() - date.getTime();
          if (diff < 60000) {
            lastEvalEl.textContent = 'just now';
          } else if (diff < 3600000) {
            lastEvalEl.textContent = Math.floor(diff / 60000) + 'm ago';
          } else {
            lastEvalEl.textContent = Math.floor(diff / 3600000) + 'h ago';
          }
        } else {
          lastEvalEl.textContent = 'never';
        }

        // Suggestions
        suggestionCountEl.textContent = s.activeSuggestions;
        suggestionCountEl.className = 'stat-value ' + (s.activeSuggestions > 5 ? 'warning' : '');
      }

      function updateEvaluations() {
        if (state.evaluations.length === 0) {
          evaluationsListEl.innerHTML = '<div class="empty-state">No evaluations yet</div>';
          return;
        }

        evaluationsListEl.innerHTML = state.evaluations.slice(0, 3).map(function(e) {
          const passed = e.passed;
          const type = e.type.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
          return '<div class="eval-item ' + (passed ? 'passed' : 'failed') + '">' +
            '<div class="eval-header">' +
              '<span class="eval-type">' + type + '</span>' +
              '<span class="eval-badge ' + (passed ? 'pass' : 'fail') + '">' + (passed ? 'PASS' : 'FAIL') + '</span>' +
            '</div>' +
            '<div class="eval-score">Score: ' + e.score.toFixed(1) + '/5.0</div>' +
          '</div>';
        }).join('');
      }

      function updateSuggestions() {
        if (state.suggestions.length === 0) {
          suggestionsListEl.innerHTML = '<div class="empty-state">No active suggestions</div>';
          return;
        }

        suggestionsListEl.innerHTML = state.suggestions.slice(0, 2).map(function(s) {
          return '<div class="suggestion-item">' +
            '<div class="suggestion-header">' +
              '<span class="severity-badge severity-' + s.severity + '">' + s.severity.toUpperCase() + '</span>' +
              '<span class="suggestion-title">' + s.title + '</span>' +
            '</div>' +
            '<div class="suggestion-desc">' + s.description + '</div>' +
          '</div>';
        }).join('');
      }

      // Listen for stats updates from parent
      API.on('stats:update', function(data) {
        state.stats = data.stats || state.stats;
        state.evaluations = data.evaluations || state.evaluations;
        state.suggestions = data.suggestions || state.suggestions;
        updateUI();
        API.emitOutput('stats.updated', state.stats);
      });

      // Listen for evaluation results
      API.on('evaluation:result', function(evaluation) {
        state.evaluations.unshift(evaluation);
        state.evaluations = state.evaluations.slice(0, 10);
        updateEvaluations();
        API.emitOutput('evaluation.result', evaluation);
      });

      // Cleanup
      API.onDestroy(function() {
        API.log('Self-Improving Dashboard destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const SelfImprovingDashboardWidget: BuiltinWidget = {
  manifest: SelfImprovingDashboardManifest,
  html: SelfImprovingDashboardHTML,
};
