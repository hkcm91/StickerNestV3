/**
 * StickerNest v2 - Counter Widget
 *
 * A simple counter with increment/decrement controls.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const CounterWidgetManifest: WidgetManifest = {
  id: 'stickernest.counter',
  name: 'Counter',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'A simple counter with controls',
  author: 'StickerNest',
  tags: ['counter', 'number', 'interactive', 'core'],
  inputs: {
    value: {
      type: 'number',
      description: 'Current count value',
      default: 0,
    },
    step: {
      type: 'number',
      description: 'Increment/decrement step',
      default: 1,
    },
    min: {
      type: 'number',
      description: 'Minimum value',
      default: -999999,
    },
    max: {
      type: 'number',
      description: 'Maximum value',
      default: 999999,
    },
  },
  outputs: {
    changed: {
      type: 'number',
      description: 'Emitted when value changes',
    },
    incremented: {
      type: 'number',
      description: 'Emitted when counter is incremented',
    },
    decremented: {
      type: 'number',
      description: 'Emitted when counter is decremented',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['counter.set', 'counter.increment', 'counter.decrement', 'counter.reset'],
    outputs: ['counter.value', 'counter.changed'],
  },
  size: {
    width: 160,
    height: 100,
    minWidth: 120,
    minHeight: 80,
    scaleMode: 'scale',
  },
};

export const CounterWidgetHTML = `
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
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 12px;
      gap: 12px;
    }
    .value {
      font-size: 36px;
      font-weight: 700;
      color: white;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0 20px rgba(79, 209, 197, 0.5);
    }
    .controls {
      display: flex;
      gap: 16px;
    }
    .btn {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      line-height: 1;
    }
    .btn:hover {
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }
    .btn:active {
      transform: scale(0.95);
    }
    .btn.plus {
      background: #4fd1c5;
      color: #1a1a2e;
    }
    .btn.plus:hover {
      background: #38b2ac;
    }
    .btn.minus {
      background: #fc8181;
      color: #1a1a2e;
    }
    .btn.minus:hover {
      background: #f56565;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="value" id="value">0</div>
    <div class="controls">
      <button class="btn minus" id="decrementBtn">−</button>
      <button class="btn plus" id="incrementBtn">+</button>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const valueEl = document.getElementById('value');
      const incrementBtn = document.getElementById('incrementBtn');
      const decrementBtn = document.getElementById('decrementBtn');

      let value = 0;
      let step = 1;
      let min = -999999;
      let max = 999999;

      function updateDisplay() {
        valueEl.textContent = value;
      }

      function increment() {
        const newValue = Math.min(max, value + step);
        if (newValue !== value) {
          value = newValue;
          updateDisplay();
          API.setState({ value });
          API.emitOutput('counter.value', value);
          API.emitOutput('counter.changed', value);
        }
      }

      function decrement() {
        const newValue = Math.max(min, value - step);
        if (newValue !== value) {
          value = newValue;
          updateDisplay();
          API.setState({ value });
          API.emitOutput('counter.value', value);
          API.emitOutput('counter.changed', value);
        }
      }

      function reset() {
        value = 0;
        updateDisplay();
        API.setState({ value });
        API.emitOutput('counter.value', value);
        API.emitOutput('counter.changed', value);
      }

      API.onMount(function(context) {
        const state = context.state || {};
        value = state.value !== undefined ? state.value : 0;
        step = state.step || 1;
        min = state.min !== undefined ? state.min : -999999;
        max = state.max !== undefined ? state.max : 999999;
        updateDisplay();
        API.log('CounterWidget mounted');
      });

      incrementBtn.addEventListener('click', increment);
      decrementBtn.addEventListener('click', decrement);

      API.onInput('counter.set', function(val) {
        if (typeof val === 'number') {
          value = Math.max(min, Math.min(max, val));
        } else if (val && typeof val.value === 'number') {
          value = Math.max(min, Math.min(max, val.value));
        }
        updateDisplay();
        API.setState({ value });
        API.emitOutput('counter.value', value);
        API.emitOutput('counter.changed', value);
      });

      API.onInput('counter.increment', function(amount) {
        const inc = typeof amount === 'number' ? amount : step;
        value = Math.min(max, value + inc);
        updateDisplay();
        API.setState({ value });
        API.emitOutput('counter.value', value);
        API.emitOutput('counter.changed', value);
      });

      API.onInput('counter.decrement', function(amount) {
        const dec = typeof amount === 'number' ? amount : step;
        value = Math.max(min, value - dec);
        updateDisplay();
        API.setState({ value });
        API.emitOutput('counter.value', value);
        API.emitOutput('counter.changed', value);
      });

      API.onInput('counter.reset', reset);

      API.onStateChange(function(newState) {
        if (newState.value !== undefined) value = newState.value;
        if (newState.step !== undefined) step = newState.step;
        if (newState.min !== undefined) min = newState.min;
        if (newState.max !== undefined) max = newState.max;
        updateDisplay();
      });

      API.onDestroy(function() {
        API.log('CounterWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const CounterWidget: BuiltinWidget = {
  manifest: CounterWidgetManifest,
  html: CounterWidgetHTML,
};
