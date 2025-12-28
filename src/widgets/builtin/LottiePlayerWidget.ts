/**
 * StickerNest v2 - Lottie Player Widget
 *
 * A Lottie animation player with playback controls.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const LottiePlayerWidgetManifest: WidgetManifest = {
  id: 'stickernest.lottie-player',
  name: 'Lottie Player',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A Lottie animation player with playback controls',
  author: 'StickerNest',
  tags: ['lottie', 'animation', 'player', 'motion', 'core'],
  inputs: {
    src: {
      type: 'string',
      description: 'Lottie JSON URL or data',
      default: '',
    },
    loop: {
      type: 'boolean',
      description: 'Loop the animation',
      default: true,
    },
    autoplay: {
      type: 'boolean',
      description: 'Autoplay the animation',
      default: true,
    },
    speed: {
      type: 'number',
      description: 'Playback speed multiplier',
      default: 1,
    },
  },
  outputs: {
    started: {
      type: 'trigger',
      description: 'Emitted when animation starts',
    },
    completed: {
      type: 'trigger',
      description: 'Emitted when animation completes',
    },
    looped: {
      type: 'object',
      description: 'Emitted when animation loops',
    },
    frame: {
      type: 'object',
      description: 'Emitted on each frame with current frame info',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['animation.play', 'animation.pause', 'animation.stop', 'animation.seek', 'animation.setSpeed', 'data.set'],
    outputs: ['animation.started', 'animation.completed', 'animation.frame'],
  },
  size: {
    width: 200,
    height: 200,
    minWidth: 50,
    minHeight: 50,
    aspectRatio: 1,
    lockAspectRatio: false,
    scaleMode: 'contain',
  },
};

export const LottiePlayerWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .animation-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #lottie {
      width: 100%;
      height: 100%;
    }
    .placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .placeholder-icon {
      font-size: 48px;
      margin-bottom: 12px;
      animation: bounce 1s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .placeholder-text {
      font-size: 14px;
      opacity: 0.8;
    }
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: linear-gradient(transparent, rgba(0,0,0,0.6));
      opacity: 0;
      transition: opacity 0.3s;
    }
    .container:hover .controls {
      opacity: 1;
    }
    .btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: white;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }
    .btn.primary {
      background: white;
      color: #333;
    }
    .progress {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      cursor: pointer;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: white;
      border-radius: 2px;
      transition: width 0.1s;
    }
    .speed {
      font-size: 10px;
      color: white;
      min-width: 30px;
      text-align: center;
    }
    .error {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fee2e2;
      color: #dc2626;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="animation-container">
      <div class="placeholder" id="placeholder">
        <div class="placeholder-icon">✨</div>
        <div class="placeholder-text">No animation loaded</div>
      </div>
      <div id="lottie" class="hidden"></div>
      <div class="error hidden" id="error">
        <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
        <div style="font-size: 12px;">Failed to load animation</div>
      </div>
    </div>
    <div class="controls" id="controls">
      <button class="btn primary" id="playBtn" title="Play/Pause">▶</button>
      <button class="btn" id="stopBtn" title="Stop">■</button>
      <div class="progress" id="progress">
        <div class="progress-bar" id="progressBar" style="width: 0%"></div>
      </div>
      <div class="speed" id="speedLabel">1x</div>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const placeholder = document.getElementById('placeholder');
      const lottieEl = document.getElementById('lottie');
      const errorEl = document.getElementById('error');
      const playBtn = document.getElementById('playBtn');
      const stopBtn = document.getElementById('stopBtn');
      const progress = document.getElementById('progress');
      const progressBar = document.getElementById('progressBar');
      const speedLabel = document.getElementById('speedLabel');

      let animation = null;
      let isPlaying = false;
      let loop = true;
      let autoplay = true;
      let speed = 1;
      let currentSrc = '';
      let loopCount = 0;

      function updateControls() {
        playBtn.textContent = isPlaying ? '⏸' : '▶';
        speedLabel.textContent = speed + 'x';
      }

      function updateProgress() {
        if (!animation) return;
        const frame = animation.currentFrame;
        const total = animation.totalFrames;
        const pct = (frame / total) * 100;
        progressBar.style.width = pct + '%';
      }

      function loadAnimation(src) {
        if (!src) {
          placeholder.classList.remove('hidden');
          lottieEl.classList.add('hidden');
          errorEl.classList.add('hidden');
          if (animation) {
            animation.destroy();
            animation = null;
          }
          return;
        }

        currentSrc = src;
        placeholder.classList.add('hidden');
        errorEl.classList.add('hidden');
        lottieEl.classList.remove('hidden');

        if (animation) {
          animation.destroy();
          animation = null;
        }

        try {
          const resolvedSrc = API.getAssetUrl(src);

          animation = lottie.loadAnimation({
            container: lottieEl,
            renderer: 'svg',
            loop: loop,
            autoplay: autoplay,
            path: resolvedSrc
          });

          animation.setSpeed(speed);
          isPlaying = autoplay;
          loopCount = 0;

          animation.addEventListener('DOMLoaded', function() {
            API.log('Lottie animation loaded');
            API.emitOutput('animation.started', {});
            updateControls();
          });

          animation.addEventListener('complete', function() {
            if (!loop) {
              isPlaying = false;
              updateControls();
            }
            API.emitOutput('animation.completed', { loopCount: loopCount });
          });

          animation.addEventListener('loopComplete', function() {
            loopCount++;
            API.emitOutput('animation.completed', { loop: true, loopCount: loopCount });
          });

          animation.addEventListener('enterFrame', function() {
            updateProgress();
            API.emitOutput('animation.frame', {
              frame: animation.currentFrame,
              totalFrames: animation.totalFrames,
              progress: animation.currentFrame / animation.totalFrames
            });
          });

          animation.addEventListener('data_failed', function() {
            lottieEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
            API.warn('Failed to load Lottie animation');
          });

        } catch (e) {
          lottieEl.classList.add('hidden');
          errorEl.classList.remove('hidden');
          API.error('Failed to load animation: ' + e.message);
        }
      }

      // Initialize
      API.onMount(function(context) {
        const state = context.state || {};
        loop = state.loop !== false;
        autoplay = state.autoplay !== false;
        speed = state.speed || 1;

        if (state.src) {
          loadAnimation(state.src);
        }
        updateControls();
        API.log('LottiePlayerWidget mounted');
      });

      // Controls
      playBtn.addEventListener('click', function() {
        if (!animation) return;
        if (isPlaying) {
          animation.pause();
          isPlaying = false;
        } else {
          animation.play();
          isPlaying = true;
        }
        updateControls();
      });

      stopBtn.addEventListener('click', function() {
        if (!animation) return;
        animation.stop();
        isPlaying = false;
        loopCount = 0;
        updateControls();
        updateProgress();
      });

      progress.addEventListener('click', function(e) {
        if (!animation) return;
        const rect = progress.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        const frame = Math.floor(pct * animation.totalFrames);
        animation.goToAndStop(frame, true);
        isPlaying = false;
        updateControls();
        updateProgress();
      });

      // Pipeline inputs
      API.onInput('animation.play', function() {
        if (!animation) return;
        animation.play();
        isPlaying = true;
        updateControls();
        API.emitOutput('animation.started', {});
      });

      API.onInput('animation.pause', function() {
        if (!animation) return;
        animation.pause();
        isPlaying = false;
        updateControls();
      });

      API.onInput('animation.stop', function() {
        if (!animation) return;
        animation.stop();
        isPlaying = false;
        loopCount = 0;
        updateControls();
        updateProgress();
      });

      API.onInput('animation.seek', function(value) {
        if (!animation) return;
        let frame;
        if (typeof value === 'number') {
          frame = value < 1 ? Math.floor(value * animation.totalFrames) : value;
        } else if (value && value.frame !== undefined) {
          frame = value.frame;
        } else if (value && value.progress !== undefined) {
          frame = Math.floor(value.progress * animation.totalFrames);
        }
        if (frame !== undefined) {
          animation.goToAndStop(frame, true);
          updateProgress();
        }
      });

      API.onInput('animation.setSpeed', function(value) {
        speed = typeof value === 'number' ? value : (value && value.speed) || 1;
        if (animation) {
          animation.setSpeed(speed);
        }
        updateControls();
        API.setState({ speed: speed });
      });

      API.onInput('data.set', function(data) {
        if (typeof data === 'string') {
          loadAnimation(data);
        } else if (data) {
          if (data.src !== undefined) loadAnimation(data.src);
          if (data.loop !== undefined) loop = data.loop;
          if (data.autoplay !== undefined) autoplay = data.autoplay;
          if (data.speed !== undefined) {
            speed = data.speed;
            if (animation) animation.setSpeed(speed);
            updateControls();
          }
          API.setState(data);
        }
      });

      API.onDestroy(function() {
        if (animation) {
          animation.destroy();
          animation = null;
        }
      });
    })();
  </script>
</body>
</html>
`;

export const LottiePlayerWidget: BuiltinWidget = {
  manifest: LottiePlayerWidgetManifest,
  html: LottiePlayerWidgetHTML,
};
