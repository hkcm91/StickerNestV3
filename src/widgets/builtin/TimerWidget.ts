/**
 * StickerNest v2 - Timer Widget
 *
 * A countdown/stopwatch timer widget with start, pause, reset controls.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const TimerWidgetManifest: WidgetManifest = {
  id: 'stickernest.timer',
  name: 'Timer',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'A countdown/stopwatch timer with controls',
  author: 'StickerNest',
  tags: ['timer', 'countdown', 'stopwatch', 'time', 'interactive', 'core'],
  inputs: {
    duration: {
      type: 'number',
      description: 'Timer duration in seconds',
      default: 60,
    },
    mode: {
      type: 'string',
      description: 'Timer mode: countdown or stopwatch',
      default: 'countdown',
    },
  },
  outputs: {
    tick: {
      type: 'object',
      description: 'Emitted every second with elapsed/remaining time',
    },
    complete: {
      type: 'object',
      description: 'Emitted when timer completes',
    },
    started: {
      type: 'trigger',
      description: 'Emitted when timer starts',
    },
    paused: {
      type: 'trigger',
      description: 'Emitted when timer pauses',
    },
    reset: {
      type: 'trigger',
      description: 'Emitted when timer resets',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
    supportsAudio: true,
  },
  io: {
    inputs: ['timer.start', 'timer.pause', 'timer.reset', 'timer.setDuration', 'action.trigger'],
    outputs: ['timer.tick', 'timer.complete', 'timer.started', 'timer.paused', 'timer.progress'],
  },
  size: {
    width: 220,
    height: 220,
    minWidth: 150,
    minHeight: 150,
    aspectRatio: 1,
    lockAspectRatio: false,
    scaleMode: 'scale',
  },
};

export const TimerWidgetHTML = `
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
      padding: 16px;
      gap: 12px;
    }
    .timer-display {
      position: relative;
      width: 140px;
      height: 140px;
    }
    .timer-ring {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .timer-ring-bg {
      fill: none;
      stroke: rgba(255,255,255,0.1);
      stroke-width: 8;
    }
    .timer-ring-progress {
      fill: none;
      stroke: #4fd1c5;
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 408;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.3s ease;
    }
    .timer-ring-progress.warning {
      stroke: #f6ad55;
    }
    .timer-ring-progress.danger {
      stroke: #fc8181;
    }
    .timer-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .time {
      font-size: 28px;
      font-weight: 700;
      color: white;
      font-variant-numeric: tabular-nums;
    }
    .mode-label {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .controls {
      display: flex;
      gap: 12px;
    }
    .btn {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn:hover {
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }
    .btn.primary {
      background: #4fd1c5;
      color: #1a1a2e;
      width: 52px;
      height: 52px;
    }
    .btn.primary:hover {
      background: #38b2ac;
    }
    .btn.playing {
      background: #f6ad55;
    }
    .btn.playing:hover {
      background: #ed8936;
    }
    .duration-input {
      display: none;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      font-size: 14px;
      text-align: center;
      width: 120px;
      outline: none;
    }
    .duration-input:focus {
      border-color: #4fd1c5;
    }
    .container.editing .duration-input {
      display: block;
    }
    .container.editing .timer-display {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="timer-display">
      <svg class="timer-ring" viewBox="0 0 140 140">
        <circle class="timer-ring-bg" cx="70" cy="70" r="65"/>
        <circle class="timer-ring-progress" id="progress" cx="70" cy="70" r="65"/>
      </svg>
      <div class="timer-text">
        <div class="time" id="time">01:00</div>
        <div class="mode-label" id="modeLabel">countdown</div>
      </div>
    </div>
    <input type="text" class="duration-input" id="durationInput" placeholder="mm:ss or seconds" />
    <div class="controls">
      <button class="btn" id="resetBtn" title="Reset">↺</button>
      <button class="btn primary" id="playBtn" title="Start">▶</button>
      <button class="btn" id="editBtn" title="Set time">⚙</button>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const timeEl = document.getElementById('time');
      const modeLabelEl = document.getElementById('modeLabel');
      const progressEl = document.getElementById('progress');
      const playBtn = document.getElementById('playBtn');
      const resetBtn = document.getElementById('resetBtn');
      const editBtn = document.getElementById('editBtn');
      const durationInput = document.getElementById('durationInput');

      const CIRCUMFERENCE = 2 * Math.PI * 65;
      progressEl.style.strokeDasharray = CIRCUMFERENCE;

      let mode = 'countdown';
      let duration = 60;
      let elapsed = 0;
      let isRunning = false;
      let intervalId = null;

      function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
      }

      function parseTime(str) {
        str = str.trim();
        if (str.includes(':')) {
          const parts = str.split(':');
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return parseInt(str, 10) || 60;
      }

      function updateDisplay() {
        let displayTime, progress;

        if (mode === 'countdown') {
          displayTime = Math.max(0, duration - elapsed);
          progress = elapsed / duration;
        } else {
          displayTime = elapsed;
          progress = 0;
        }

        timeEl.textContent = formatTime(displayTime);
        modeLabelEl.textContent = mode;

        const offset = CIRCUMFERENCE * (1 - progress);
        progressEl.style.strokeDashoffset = offset;

        progressEl.classList.remove('warning', 'danger');
        if (mode === 'countdown') {
          const remaining = duration - elapsed;
          if (remaining <= 10) {
            progressEl.classList.add('danger');
          } else if (remaining <= 30) {
            progressEl.classList.add('warning');
          }
        }

        playBtn.innerHTML = isRunning ? '⏸' : '▶';
        playBtn.classList.toggle('playing', isRunning);
      }

      function tick() {
        elapsed += 1;

        if (mode === 'countdown' && elapsed >= duration) {
          stop();
          API.emitOutput('timer.complete', { duration: duration });
          API.emit('timer:complete', { duration: duration });
          return;
        }

        const tickData = {
          elapsed: elapsed,
          remaining: mode === 'countdown' ? duration - elapsed : null,
          progress: mode === 'countdown' ? elapsed / duration : null,
          mode: mode
        };

        API.emitOutput('timer.tick', tickData);
        API.emitOutput('timer.progress', tickData.progress);
        updateDisplay();
        API.setState({ elapsed: elapsed, isRunning: true });
      }

      function start() {
        if (isRunning) return;
        isRunning = true;
        intervalId = setInterval(tick, 1000);
        updateDisplay();
        API.emitOutput('timer.started', {});
        API.log('Timer started');
      }

      function pause() {
        if (!isRunning) return;
        isRunning = false;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        updateDisplay();
        API.emitOutput('timer.paused', {});
        API.setState({ isRunning: false });
        API.log('Timer paused');
      }

      function stop() {
        isRunning = false;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        updateDisplay();
      }

      function reset() {
        stop();
        elapsed = 0;
        updateDisplay();
        API.setState({ elapsed: 0, isRunning: false });
        API.log('Timer reset');
      }

      function setDuration(newDuration) {
        duration = Math.max(1, newDuration);
        elapsed = 0;
        updateDisplay();
        API.setState({ duration: duration, elapsed: 0 });
      }

      // Initialize
      API.onMount(function(context) {
        const state = context.state || {};
        duration = state.duration || 60;
        elapsed = state.elapsed || 0;
        mode = state.mode || 'countdown';
        isRunning = false;
        updateDisplay();
        API.log('TimerWidget mounted');
      });

      // Controls
      playBtn.addEventListener('click', function() {
        if (isRunning) {
          pause();
        } else {
          start();
        }
      });

      resetBtn.addEventListener('click', reset);

      editBtn.addEventListener('click', function() {
        if (container.classList.contains('editing')) {
          const newDuration = parseTime(durationInput.value);
          setDuration(newDuration);
          container.classList.remove('editing');
        } else {
          durationInput.value = formatTime(duration);
          container.classList.add('editing');
          durationInput.focus();
        }
      });

      durationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          const newDuration = parseTime(durationInput.value);
          setDuration(newDuration);
          container.classList.remove('editing');
        } else if (e.key === 'Escape') {
          container.classList.remove('editing');
        }
      });

      // Pipeline inputs
      API.onInput('timer.start', function(data) {
        if (data && data.duration) {
          setDuration(data.duration);
        }
        start();
      });

      API.onInput('timer.pause', pause);
      API.onInput('timer.reset', reset);

      API.onInput('timer.setDuration', function(value) {
        const secs = typeof value === 'number' ? value :
                     (value && value.duration) ? value.duration : 60;
        setDuration(secs);
      });

      API.onInput('action.trigger', function(action) {
        if (action === 'start') start();
        else if (action === 'pause') pause();
        else if (action === 'reset') reset();
        else if (action === 'toggle') isRunning ? pause() : start();
      });

      API.onDestroy(function() {
        if (intervalId) clearInterval(intervalId);
      });
    })();
  </script>
</body>
</html>
`;

export const TimerWidget: BuiltinWidget = {
  manifest: TimerWidgetManifest,
  html: TimerWidgetHTML,
};
