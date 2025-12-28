/**
 * StickerNest v2 - Viewer Count Widget
 *
 * Displays real-time viewer count with trend indicators.
 * Tracks peak viewers and shows up/down/stable trends.
 * Mobile-optimized with clean, readable display.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ViewerCountWidgetManifest: WidgetManifest = {
  id: 'stickernest.viewer-count',
  name: 'Viewer Count',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Display live viewer count with trend indicators and peak tracking',
  author: 'StickerNest',
  tags: ['streaming', 'viewers', 'stats', 'analytics', 'twitch', 'youtube'],
  inputs: {
    setCount: {
      type: 'number',
      description: 'Set viewer count manually',
    },
    reset: {
      type: 'trigger',
      description: 'Reset peak viewer count',
    },
  },
  outputs: {
    viewersChanged: {
      type: 'number',
      description: 'Emitted when viewer count changes',
    },
    peakReached: {
      type: 'number',
      description: 'Emitted when a new peak is reached',
    },
    milestoneReached: {
      type: 'object',
      description: 'Emitted when a milestone is reached { milestone, count }',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['viewers.set', 'stats.reset'],
    outputs: ['viewers.changed', 'peak.reached', 'milestone.reached'],
  },
  events: {
    listens: ['stream:viewers-updated', 'stream:online', 'stream:offline'],
  },
  size: {
    width: 180,
    height: 100,
    minWidth: 120,
    minHeight: 60,
    scaleMode: 'scale',
  },
};

export const ViewerCountWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      gap: 4px;
      border-radius: 12px;
    }

    /* Main count */
    .viewer-count {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .count-number {
      font-size: 42px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      transition: all 0.3s ease;
    }
    .count-number.growing {
      color: #22c55e;
      text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
    }
    .count-number.shrinking {
      color: #ef4444;
      text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    }

    /* Trend indicator */
    .trend-indicator {
      font-size: 24px;
      transition: all 0.3s ease;
    }
    .trend-indicator.up {
      color: #22c55e;
      animation: bounceUp 0.5s ease;
    }
    .trend-indicator.down {
      color: #ef4444;
      animation: bounceDown 0.5s ease;
    }
    .trend-indicator.stable {
      color: var(--sn-text-secondary, #94a3b8);
    }

    @keyframes bounceUp {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    @keyframes bounceDown {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(4px); }
    }

    /* Labels */
    .label {
      font-size: 11px;
      font-weight: 500;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Peak display */
    .peak-display {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .peak-icon {
      font-size: 14px;
    }
    .peak-value {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .peak-value.new-peak {
      color: #f59e0b;
      animation: pulse 0.5s ease;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    /* Offline state */
    .offline {
      opacity: 0.5;
    }
    .offline-badge {
      display: none;
      font-size: 10px;
      padding: 2px 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .container.offline .offline-badge {
      display: block;
    }
    .container.offline .count-number {
      color: var(--sn-text-secondary, #94a3b8);
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .count-number,
      .trend-indicator,
      .peak-value {
        animation: none !important;
        transition: none !important;
      }
    }

    /* Compact mode for smaller sizes */
    @container (max-width: 150px) {
      .count-number { font-size: 32px; }
      .trend-indicator { font-size: 18px; }
      .peak-display { display: none; }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="label">Viewers</div>
    <div class="viewer-count">
      <span class="count-number" id="countNumber">0</span>
      <span class="trend-indicator stable" id="trendIndicator">―</span>
    </div>
    <div class="peak-display">
      <span class="peak-icon">👑</span>
      <span>Peak:</span>
      <span class="peak-value" id="peakValue">0</span>
    </div>
    <div class="offline-badge">OFFLINE</div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM Elements
      const container = document.getElementById('container');
      const countNumber = document.getElementById('countNumber');
      const trendIndicator = document.getElementById('trendIndicator');
      const peakValue = document.getElementById('peakValue');

      // State
      let currentCount = 0;
      let previousCount = 0;
      let peakCount = 0;
      let isOnline = false;
      let trendHistory = [];
      const TREND_SAMPLES = 5;

      // Milestones to track
      const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
      let lastMilestone = 0;

      // Format number with commas
      function formatNumber(num) {
        return num.toLocaleString();
      }

      // Update display
      function updateDisplay() {
        // Update count
        countNumber.textContent = formatNumber(currentCount);

        // Update peak if new record
        if (currentCount > peakCount && isOnline) {
          peakCount = currentCount;
          peakValue.textContent = formatNumber(peakCount);
          peakValue.classList.add('new-peak');
          setTimeout(() => peakValue.classList.remove('new-peak'), 500);
          API.emitOutput('peak.reached', peakCount);
        }

        // Calculate trend
        const trend = calculateTrend();
        updateTrendIndicator(trend);

        // Check milestones
        checkMilestones();

        // Offline state
        container.classList.toggle('offline', !isOnline);

        // Save state
        API.setState({
          currentCount,
          peakCount,
          isOnline
        });
      }

      // Calculate trend from recent history
      function calculateTrend() {
        if (trendHistory.length < 2) return 'stable';

        const recent = trendHistory.slice(-TREND_SAMPLES);
        const first = recent[0];
        const last = recent[recent.length - 1];

        const diff = last - first;
        const threshold = Math.max(1, first * 0.05); // 5% change threshold

        if (diff > threshold) return 'up';
        if (diff < -threshold) return 'down';
        return 'stable';
      }

      // Update trend indicator
      function updateTrendIndicator(trend) {
        trendIndicator.className = 'trend-indicator ' + trend;
        countNumber.className = 'count-number';

        if (trend === 'up') {
          trendIndicator.textContent = '↑';
          countNumber.classList.add('growing');
        } else if (trend === 'down') {
          trendIndicator.textContent = '↓';
          countNumber.classList.add('shrinking');
        } else {
          trendIndicator.textContent = '―';
        }
      }

      // Check for milestone achievements
      function checkMilestones() {
        for (const milestone of MILESTONES) {
          if (currentCount >= milestone && lastMilestone < milestone) {
            lastMilestone = milestone;
            API.emitOutput('milestone.reached', {
              milestone: milestone,
              count: currentCount
            });
            API.log('Milestone reached: ' + milestone + ' viewers');
          }
        }
      }

      // Set viewer count
      function setViewerCount(count) {
        previousCount = currentCount;
        currentCount = Math.max(0, Math.floor(count));

        // Add to trend history
        trendHistory.push(currentCount);
        if (trendHistory.length > TREND_SAMPLES * 2) {
          trendHistory = trendHistory.slice(-TREND_SAMPLES * 2);
        }

        updateDisplay();
        API.emitOutput('viewers.changed', currentCount);
      }

      // Reset peak
      function resetPeak() {
        peakCount = currentCount;
        lastMilestone = 0;
        peakValue.textContent = formatNumber(peakCount);
        API.setState({ peakCount, lastMilestone });
        API.log('Peak reset to ' + peakCount);
      }

      // Widget API handlers
      API.onMount(function(context) {
        const state = context.state || {};
        currentCount = state.currentCount || 0;
        peakCount = state.peakCount || 0;
        isOnline = state.isOnline || false;
        lastMilestone = state.lastMilestone || 0;
        updateDisplay();
        API.log('ViewerCountWidget mounted');
      });

      // Handle stream events
      API.on('stream:viewers-updated', function(event) {
        const count = event.payload?.viewers || event.payload?.count || 0;
        isOnline = true;
        setViewerCount(count);
      });

      API.on('stream:online', function() {
        isOnline = true;
        updateDisplay();
      });

      API.on('stream:offline', function() {
        isOnline = false;
        updateDisplay();
      });

      // Handle pipeline inputs
      API.onInput('viewers.set', function(count) {
        setViewerCount(count);
      });

      API.onInput('stats.reset', function() {
        resetPeak();
      });

      // Handle state changes from store
      API.onStateChange(function(newState) {
        if (newState.currentCount !== undefined) {
          setViewerCount(newState.currentCount);
        }
        if (newState.peakCount !== undefined) {
          peakCount = newState.peakCount;
          peakValue.textContent = formatNumber(peakCount);
        }
        if (newState.isOnline !== undefined) {
          isOnline = newState.isOnline;
          updateDisplay();
        }
      });

      API.onDestroy(function() {
        API.log('ViewerCountWidget destroyed');
      });

      // Demo: Simulate viewer changes for testing (remove in production)
      // setInterval(() => {
      //   const change = Math.floor(Math.random() * 21) - 10;
      //   setViewerCount(Math.max(0, currentCount + change));
      // }, 3000);
    })();
  </script>
</body>
</html>
`;

export const ViewerCountWidget: BuiltinWidget = {
  manifest: ViewerCountWidgetManifest,
  html: ViewerCountWidgetHTML,
};
