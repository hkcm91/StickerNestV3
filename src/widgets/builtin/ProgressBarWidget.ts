/**
 * StickerNest v2 - Progress Bar Widget
 *
 * A visual progress indicator with customizable appearance.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ProgressBarWidgetManifest: WidgetManifest = {
  id: 'stickernest.progress-bar',
  name: 'Progress Bar',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A visual progress indicator',
  author: 'StickerNest',
  tags: ['progress', 'bar', 'display', 'core'],
  inputs: {
    value: {
      type: 'number',
      description: 'Progress value (0-100)',
      default: 50,
    },
    label: {
      type: 'string',
      description: 'Label text',
      default: 'Progress',
    },
    color: {
      type: 'string',
      description: 'Progress bar color',
      default: '#4fd1c5',
    },
    showPercent: {
      type: 'boolean',
      description: 'Show percentage text',
      default: true,
    },
  },
  outputs: {
    complete: {
      type: 'trigger',
      description: 'Emitted when progress reaches 100%',
    },
    changed: {
      type: 'number',
      description: 'Emitted when value changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['progress.set', 'progress.increment', 'progress.reset'],
    outputs: ['progress.complete', 'progress.changed'],
  },
  size: {
    width: 250,
    height: 60,
    minWidth: 150,
    minHeight: 40,
    scaleMode: 'scale',
  },
};

export const ProgressBarWidgetHTML = `
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
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 12px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .label {
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
    }
    .percent {
      font-size: 14px;
      font-weight: 700;
      color: white;
      font-variant-numeric: tabular-nums;
    }
    .bar-container {
      width: 100%;
      height: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 6px;
      overflow: hidden;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, #4fd1c5, #38b2ac);
      border-radius: 6px;
      transition: width 0.3s ease;
      position: relative;
    }
    .bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .bar.complete {
      background: linear-gradient(90deg, #48bb78, #38a169);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="label" id="label">Progress</span>
      <span class="percent" id="percent">50%</span>
    </div>
    <div class="bar-container">
      <div class="bar" id="bar" style="width: 50%"></div>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const labelEl = document.getElementById('label');
      const percentEl = document.getElementById('percent');
      const barEl = document.getElementById('bar');

      let value = 50;
      let label = 'Progress';
      let color = '#4fd1c5';
      let showPercent = true;

      function updateDisplay() {
        const clampedValue = Math.max(0, Math.min(100, value));
        barEl.style.width = clampedValue + '%';
        percentEl.textContent = Math.round(clampedValue) + '%';
        percentEl.style.display = showPercent ? 'block' : 'none';
        labelEl.textContent = label;

        if (color && color !== '#4fd1c5') {
          barEl.style.background = color;
        }

        if (clampedValue >= 100) {
          barEl.classList.add('complete');
        } else {
          barEl.classList.remove('complete');
        }
      }

      API.onMount(function(context) {
        const state = context.state || {};
        value = state.value !== undefined ? state.value : 50;
        label = state.label || 'Progress';
        color = state.color || '#4fd1c5';
        showPercent = state.showPercent !== false;
        updateDisplay();
        API.log('ProgressBarWidget mounted');
      });

      API.onInput('progress.set', function(val) {
        const prevValue = value;
        if (typeof val === 'number') {
          value = val;
        } else if (val && typeof val.value === 'number') {
          value = val.value;
        }
        updateDisplay();
        API.setState({ value });
        API.emitOutput('progress.changed', value);

        if (prevValue < 100 && value >= 100) {
          API.emitOutput('progress.complete', { value: 100 });
        }
      });

      API.onInput('progress.increment', function(amount) {
        const inc = typeof amount === 'number' ? amount : 1;
        value = Math.min(100, value + inc);
        updateDisplay();
        API.setState({ value });
        API.emitOutput('progress.changed', value);

        if (value >= 100) {
          API.emitOutput('progress.complete', { value: 100 });
        }
      });

      API.onInput('progress.reset', function() {
        value = 0;
        updateDisplay();
        API.setState({ value });
        API.emitOutput('progress.changed', 0);
      });

      API.onStateChange(function(newState) {
        if (newState.value !== undefined) value = newState.value;
        if (newState.label !== undefined) label = newState.label;
        if (newState.color !== undefined) color = newState.color;
        if (newState.showPercent !== undefined) showPercent = newState.showPercent;
        updateDisplay();
      });

      API.onDestroy(function() {
        API.log('ProgressBarWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ProgressBarWidget: BuiltinWidget = {
  manifest: ProgressBarWidgetManifest,
  html: ProgressBarWidgetHTML,
};
