/**
 * StickerNest v2 - Clock Widget
 *
 * A digital clock widget with customizable format and timezone support.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ClockWidgetManifest: WidgetManifest = {
  id: 'stickernest.clock',
  name: 'Clock',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A digital clock with customizable format',
  author: 'StickerNest',
  tags: ['clock', 'time', 'display', 'core'],
  inputs: {
    format: {
      type: 'string',
      description: 'Time format: 12h or 24h',
      default: '12h',
    },
    showSeconds: {
      type: 'boolean',
      description: 'Show seconds',
      default: true,
    },
    showDate: {
      type: 'boolean',
      description: 'Show date below time',
      default: false,
    },
  },
  outputs: {
    tick: {
      type: 'object',
      description: 'Emitted every second with current time',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['clock.setFormat', 'clock.setTimezone'],
    outputs: ['clock.tick', 'clock.hour'],
  },
  size: {
    width: 200,
    height: 100,
    minWidth: 120,
    minHeight: 60,
    scaleMode: 'scale',
  },
};

export const ClockWidgetHTML = `
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
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
      padding: 12px;
    }
    .time {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 0 20px rgba(79, 209, 197, 0.5);
    }
    .time .seconds {
      font-size: 20px;
      opacity: 0.7;
    }
    .time .period {
      font-size: 14px;
      margin-left: 4px;
      opacity: 0.7;
    }
    .date {
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      margin-top: 4px;
    }
    .blink {
      animation: blink 1s infinite;
    }
    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.3; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="time" id="time">12:00:00</div>
    <div class="date" id="date" style="display: none;"></div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const timeEl = document.getElementById('time');
      const dateEl = document.getElementById('date');

      let format = '12h';
      let showSeconds = true;
      let showDate = false;
      let timezone = null;
      let intervalId = null;
      let lastHour = -1;

      function updateClock() {
        const now = timezone ? new Date().toLocaleString('en-US', { timeZone: timezone }) : new Date();
        const date = timezone ? new Date(now) : now;

        let hours = date.getHours();
        const mins = String(date.getMinutes()).padStart(2, '0');
        const secs = String(date.getSeconds()).padStart(2, '0');
        let period = '';

        if (format === '12h') {
          period = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
        }

        const hoursStr = String(hours).padStart(2, '0');

        let timeStr = hoursStr + '<span class="blink">:</span>' + mins;
        if (showSeconds) {
          timeStr += '<span class="seconds">:' + secs + '</span>';
        }
        if (format === '12h') {
          timeStr += '<span class="period">' + period + '</span>';
        }

        timeEl.innerHTML = timeStr;

        if (showDate) {
          const options = { weekday: 'short', month: 'short', day: 'numeric' };
          dateEl.textContent = date.toLocaleDateString('en-US', options);
          dateEl.style.display = 'block';
        } else {
          dateEl.style.display = 'none';
        }

        // Emit tick
        const tickData = {
          hours: date.getHours(),
          minutes: date.getMinutes(),
          seconds: date.getSeconds(),
          timestamp: date.getTime()
        };
        API.emitOutput('clock.tick', tickData);

        // Emit hour change
        if (date.getHours() !== lastHour) {
          lastHour = date.getHours();
          API.emitOutput('clock.hour', lastHour);
        }
      }

      API.onMount(function(context) {
        const state = context.state || {};
        format = state.format || '12h';
        showSeconds = state.showSeconds !== false;
        showDate = state.showDate === true;
        timezone = state.timezone || null;

        updateClock();
        intervalId = setInterval(updateClock, 1000);
        API.log('ClockWidget mounted');
      });

      API.onInput('clock.setFormat', function(value) {
        format = value === '24h' ? '24h' : '12h';
        API.setState({ format });
        updateClock();
      });

      API.onInput('clock.setTimezone', function(tz) {
        timezone = tz;
        API.setState({ timezone });
        updateClock();
      });

      API.onStateChange(function(newState) {
        if (newState.format !== undefined) format = newState.format;
        if (newState.showSeconds !== undefined) showSeconds = newState.showSeconds;
        if (newState.showDate !== undefined) showDate = newState.showDate;
        if (newState.timezone !== undefined) timezone = newState.timezone;
        updateClock();
      });

      API.onDestroy(function() {
        if (intervalId) clearInterval(intervalId);
      });
    })();
  </script>
</body>
</html>
`;

export const ClockWidget: BuiltinWidget = {
  manifest: ClockWidgetManifest,
  html: ClockWidgetHTML,
};
