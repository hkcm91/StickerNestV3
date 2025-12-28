/**
 * StickerNest v2 - Webcam Widget
 *
 * Display webcam feed with real-time effects (chroma key, color correction).
 * Mobile-optimized with camera switching, mirror toggle, and touch gestures.
 * Supports green screen removal for environment compositing.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const WebcamWidgetManifest: WidgetManifest = {
  id: 'stickernest.webcam',
  name: 'Webcam',
  version: '1.0.0',
  kind: 'video',
  entry: 'index.html',
  description: 'Display webcam with chroma key, color correction, and mirror effects',
  author: 'StickerNest',
  tags: ['webcam', 'camera', 'video', 'streaming', 'chroma-key', 'green-screen'],
  inputs: {
    setSource: {
      type: 'string',
      description: 'Set camera device ID',
    },
    setEffect: {
      type: 'object',
      description: 'Apply effect { type, params }',
    },
    toggleMirror: {
      type: 'trigger',
      description: 'Toggle mirror mode',
    },
    switchCamera: {
      type: 'trigger',
      description: 'Switch to next camera (mobile)',
    },
  },
  outputs: {
    streamReady: {
      type: 'object',
      description: 'Emitted when camera stream starts { deviceId, width, height }',
    },
    streamError: {
      type: 'string',
      description: 'Emitted when camera error occurs',
    },
    effectChanged: {
      type: 'object',
      description: 'Emitted when effect settings change',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['source.set', 'effect.apply', 'ui.mirror', 'camera.switch'],
    outputs: ['stream.ready', 'stream.error', 'effect.changed'],
  },
  size: {
    width: 320,
    height: 240,
    minWidth: 160,
    minHeight: 120,
    aspectRatio: 4 / 3,
    lockAspectRatio: false,
    scaleMode: 'contain',
  },
};

export const WebcamWidgetHTML = `
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
      background: transparent;
    }
    .container {
      width: 100%;
      height: 100%;
      position: relative;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }

    /* Video element */
    video, canvas {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    video.mirrored, canvas.mirrored {
      transform: scaleX(-1);
    }
    video.hidden {
      display: none;
    }

    /* Controls overlay */
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      display: flex;
      justify-content: center;
      gap: 12px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .container:hover .controls,
    .container.touch-active .controls {
      opacity: 1;
    }

    /* Control buttons - 48px for mobile */
    .ctrl-btn {
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
      backdrop-filter: blur(8px);
    }
    .ctrl-btn:hover {
      background: rgba(255,255,255,0.3);
    }
    .ctrl-btn:active {
      transform: scale(0.9);
    }
    .ctrl-btn.active {
      background: var(--sn-accent-primary, #8b5cf6);
    }

    /* Status indicators */
    .status-bar {
      position: absolute;
      top: 8px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }
    .status-badge {
      font-size: 10px;
      padding: 4px 8px;
      border-radius: 4px;
      background: rgba(0,0,0,0.5);
      color: white;
      backdrop-filter: blur(4px);
    }
    .status-badge.error {
      background: rgba(239, 68, 68, 0.8);
    }
    .status-badge.live {
      background: rgba(34, 197, 94, 0.8);
    }

    /* Settings panel */
    .settings-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 260px;
      max-width: 80%;
      background: rgba(15, 15, 25, 0.95);
      backdrop-filter: blur(12px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
      padding: 16px;
      z-index: 10;
    }
    .settings-panel.open {
      transform: translateX(0);
    }
    .settings-section {
      margin-bottom: 16px;
    }
    .settings-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .settings-label {
      font-size: 13px;
      color: var(--sn-text-primary, #e2e8f0);
    }

    /* Range slider */
    input[type="range"] {
      width: 100%;
      height: 44px;
      -webkit-appearance: none;
      background: transparent;
    }
    input[type="range"]::-webkit-slider-track {
      height: 4px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 2px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      cursor: pointer;
      margin-top: -8px;
    }

    /* Color picker */
    .color-picker {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .color-swatch.selected {
      border-color: white;
      transform: scale(1.1);
    }
    .color-swatch:active {
      transform: scale(0.95);
    }

    /* Toggle switch */
    .toggle {
      width: 48px;
      height: 28px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 14px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle.on {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .toggle::after {
      content: '';
      position: absolute;
      width: 22px;
      height: 22px;
      background: white;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s ease;
    }
    .toggle.on::after {
      transform: translateX(20px);
    }

    /* Loading state */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.8);
      color: white;
      gap: 12px;
    }
    .loading-overlay.hidden {
      display: none;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Permission prompt */
    .permission-prompt {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      gap: 16px;
      padding: 24px;
      text-align: center;
    }
    .permission-prompt.hidden {
      display: none;
    }
    .permission-icon {
      font-size: 48px;
    }
    .permission-btn {
      min-height: 48px;
      padding: 12px 24px;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .spinner { animation: none; }
      .settings-panel { transition: none; }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <!-- Video elements -->
    <video id="video" autoplay playsinline muted class="hidden"></video>
    <canvas id="canvas"></canvas>

    <!-- Status bar -->
    <div class="status-bar">
      <div class="status-badge live" id="statusBadge">LIVE</div>
      <div class="status-badge" id="fpsBadge">30 FPS</div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="ctrl-btn" id="mirrorBtn" title="Mirror">🪞</button>
      <button class="ctrl-btn" id="switchBtn" title="Switch Camera">🔄</button>
      <button class="ctrl-btn" id="chromaBtn" title="Chroma Key">🟢</button>
      <button class="ctrl-btn" id="settingsBtn" title="Settings">⚙️</button>
    </div>

    <!-- Settings Panel -->
    <div class="settings-panel" id="settingsPanel">
      <div class="settings-section">
        <div class="settings-title">Chroma Key</div>
        <div class="settings-row">
          <span class="settings-label">Enabled</span>
          <div class="toggle" id="chromaToggle"></div>
        </div>
        <div class="settings-label" style="margin-bottom: 8px;">Key Color</div>
        <div class="color-picker" id="colorPicker">
          <div class="color-swatch selected" data-color="#00FF00" style="background: #00FF00;"></div>
          <div class="color-swatch" data-color="#0000FF" style="background: #0000FF;"></div>
          <div class="color-swatch" data-color="#FF00FF" style="background: #FF00FF;"></div>
        </div>
        <div class="settings-label" style="margin-top: 12px;">Threshold</div>
        <input type="range" id="thresholdSlider" min="0" max="100" value="40">
        <div class="settings-label">Smoothness</div>
        <input type="range" id="smoothnessSlider" min="0" max="100" value="10">
      </div>

      <div class="settings-section">
        <div class="settings-title">Color Correction</div>
        <div class="settings-label">Brightness</div>
        <input type="range" id="brightnessSlider" min="-50" max="50" value="0">
        <div class="settings-label">Contrast</div>
        <input type="range" id="contrastSlider" min="50" max="150" value="100">
        <div class="settings-label">Saturation</div>
        <input type="range" id="saturationSlider" min="0" max="200" value="100">
      </div>
    </div>

    <!-- Loading overlay -->
    <div class="loading-overlay" id="loadingOverlay">
      <div class="spinner"></div>
      <div>Starting camera...</div>
    </div>

    <!-- Permission prompt -->
    <div class="permission-prompt" id="permissionPrompt">
      <div class="permission-icon">📷</div>
      <div style="font-size: 16px; font-weight: 500;">Camera Access Needed</div>
      <div style="font-size: 13px; color: var(--sn-text-secondary, #94a3b8);">
        Allow camera access to display your webcam
      </div>
      <button class="permission-btn" id="permissionBtn">Enable Camera</button>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM elements
      const container = document.getElementById('container');
      const video = document.getElementById('video');
      const canvas = document.getElementById('canvas');
      const statusBadge = document.getElementById('statusBadge');
      const fpsBadge = document.getElementById('fpsBadge');
      const loadingOverlay = document.getElementById('loadingOverlay');
      const permissionPrompt = document.getElementById('permissionPrompt');
      const settingsPanel = document.getElementById('settingsPanel');

      // Buttons
      const mirrorBtn = document.getElementById('mirrorBtn');
      const switchBtn = document.getElementById('switchBtn');
      const chromaBtn = document.getElementById('chromaBtn');
      const settingsBtn = document.getElementById('settingsBtn');
      const permissionBtn = document.getElementById('permissionBtn');
      const chromaToggle = document.getElementById('chromaToggle');

      // Sliders
      const thresholdSlider = document.getElementById('thresholdSlider');
      const smoothnessSlider = document.getElementById('smoothnessSlider');
      const brightnessSlider = document.getElementById('brightnessSlider');
      const contrastSlider = document.getElementById('contrastSlider');
      const saturationSlider = document.getElementById('saturationSlider');

      // Color picker
      const colorPicker = document.getElementById('colorPicker');

      // State
      let state = {
        stream: null,
        deviceId: null,
        mirrored: true,
        chromaEnabled: false,
        chromaColor: '#00FF00',
        chromaThreshold: 0.4,
        chromaSmoothness: 0.1,
        brightness: 0,
        contrast: 1,
        saturation: 1,
        cameras: [],
        currentCameraIndex: 0
      };

      // Canvas context
      const ctx = canvas.getContext('2d');
      let animationId = null;
      let frameCount = 0;
      let lastFpsTime = performance.now();

      // Haptic helper
      function haptic(type) {
        if (navigator.vibrate) {
          const patterns = { light: [10], medium: [20] };
          navigator.vibrate(patterns[type] || patterns.light);
        }
      }

      // Start camera
      async function startCamera(deviceId) {
        try {
          loadingOverlay.classList.remove('hidden');
          permissionPrompt.classList.add('hidden');

          const constraints = {
            video: {
              deviceId: deviceId ? { exact: deviceId } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          };

          // Stop existing stream
          if (state.stream) {
            state.stream.getTracks().forEach(t => t.stop());
          }

          state.stream = await navigator.mediaDevices.getUserMedia(constraints);
          video.srcObject = state.stream;
          await video.play();

          const track = state.stream.getVideoTracks()[0];
          const settings = track.getSettings();
          state.deviceId = settings.deviceId;

          // Set canvas size
          canvas.width = settings.width || 1280;
          canvas.height = settings.height || 720;

          // Enumerate cameras for switching
          const devices = await navigator.mediaDevices.enumerateDevices();
          state.cameras = devices.filter(d => d.kind === 'videoinput');

          loadingOverlay.classList.add('hidden');
          statusBadge.textContent = 'LIVE';
          statusBadge.classList.remove('error');
          statusBadge.classList.add('live');

          // Start render loop
          startRenderLoop();

          API.emitOutput('stream.ready', {
            deviceId: state.deviceId,
            width: canvas.width,
            height: canvas.height
          });

          API.setState({
            deviceId: state.deviceId,
            mirrored: state.mirrored
          });

        } catch (err) {
          console.error('Camera error:', err);
          loadingOverlay.classList.add('hidden');

          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            permissionPrompt.classList.remove('hidden');
          } else {
            statusBadge.textContent = 'ERROR';
            statusBadge.classList.add('error');
            statusBadge.classList.remove('live');
          }

          API.emitOutput('stream.error', err.message);
        }
      }

      // Render loop with effects
      function startRenderLoop() {
        if (animationId) cancelAnimationFrame(animationId);

        function render() {
          if (video.readyState >= video.HAVE_CURRENT_DATA) {
            // Draw video to canvas
            ctx.save();

            if (state.mirrored) {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();

            // Apply chroma key if enabled
            if (state.chromaEnabled) {
              applyChromaKey();
            }

            // Apply color correction
            if (state.brightness !== 0 || state.contrast !== 1 || state.saturation !== 1) {
              applyColorCorrection();
            }

            // FPS counter
            frameCount++;
            const now = performance.now();
            if (now - lastFpsTime >= 1000) {
              fpsBadge.textContent = frameCount + ' FPS';
              frameCount = 0;
              lastFpsTime = now;
            }
          }

          animationId = requestAnimationFrame(render);
        }

        render();
      }

      // Simple CPU-based chroma key (for demo - real impl uses WebGL)
      function applyChromaKey() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Parse key color
        const keyR = parseInt(state.chromaColor.slice(1, 3), 16);
        const keyG = parseInt(state.chromaColor.slice(3, 5), 16);
        const keyB = parseInt(state.chromaColor.slice(5, 7), 16);

        const threshold = state.chromaThreshold * 255;
        const smoothness = state.chromaSmoothness * 255;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate color distance
          const dist = Math.sqrt(
            Math.pow(r - keyR, 2) +
            Math.pow(g - keyG, 2) +
            Math.pow(b - keyB, 2)
          );

          // Calculate alpha
          if (dist < threshold - smoothness) {
            data[i + 3] = 0; // Fully transparent
          } else if (dist < threshold + smoothness) {
            // Smooth edge
            const alpha = (dist - threshold + smoothness) / (smoothness * 2);
            data[i + 3] = Math.round(alpha * 255);
          }
          // else keep original alpha
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Simple color correction
      function applyColorCorrection() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Brightness
          r += state.brightness * 255;
          g += state.brightness * 255;
          b += state.brightness * 255;

          // Contrast
          r = ((r / 255 - 0.5) * state.contrast + 0.5) * 255;
          g = ((g / 255 - 0.5) * state.contrast + 0.5) * 255;
          b = ((b / 255 - 0.5) * state.contrast + 0.5) * 255;

          // Saturation (simplified)
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + state.saturation * (r - gray);
          g = gray + state.saturation * (g - gray);
          b = gray + state.saturation * (b - gray);

          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Switch camera
      async function switchCamera() {
        if (state.cameras.length < 2) return;
        haptic('medium');

        state.currentCameraIndex = (state.currentCameraIndex + 1) % state.cameras.length;
        const nextCamera = state.cameras[state.currentCameraIndex];
        await startCamera(nextCamera.deviceId);
      }

      // Toggle mirror
      function toggleMirror() {
        haptic('light');
        state.mirrored = !state.mirrored;
        mirrorBtn.classList.toggle('active', state.mirrored);
        API.setState({ mirrored: state.mirrored });
      }

      // Toggle chroma key
      function toggleChroma() {
        haptic('light');
        state.chromaEnabled = !state.chromaEnabled;
        chromaToggle.classList.toggle('on', state.chromaEnabled);
        chromaBtn.classList.toggle('active', state.chromaEnabled);
        emitEffectChange();
      }

      // Toggle settings panel
      function toggleSettings() {
        haptic('light');
        settingsPanel.classList.toggle('open');
        settingsBtn.classList.toggle('active', settingsPanel.classList.contains('open'));
      }

      // Emit effect change
      function emitEffectChange() {
        API.emitOutput('effect.changed', {
          chromaEnabled: state.chromaEnabled,
          chromaColor: state.chromaColor,
          chromaThreshold: state.chromaThreshold,
          brightness: state.brightness,
          contrast: state.contrast,
          saturation: state.saturation
        });
      }

      // Event listeners
      mirrorBtn.addEventListener('click', toggleMirror);
      switchBtn.addEventListener('click', switchCamera);
      chromaBtn.addEventListener('click', toggleChroma);
      settingsBtn.addEventListener('click', toggleSettings);
      permissionBtn.addEventListener('click', () => startCamera());
      chromaToggle.addEventListener('click', toggleChroma);

      // Color picker
      colorPicker.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (swatch) {
          haptic('light');
          document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          state.chromaColor = swatch.dataset.color;
          emitEffectChange();
        }
      });

      // Sliders
      thresholdSlider.addEventListener('input', (e) => {
        state.chromaThreshold = e.target.value / 100;
        emitEffectChange();
      });
      smoothnessSlider.addEventListener('input', (e) => {
        state.chromaSmoothness = e.target.value / 100;
        emitEffectChange();
      });
      brightnessSlider.addEventListener('input', (e) => {
        state.brightness = e.target.value / 100;
        emitEffectChange();
      });
      contrastSlider.addEventListener('input', (e) => {
        state.contrast = e.target.value / 100;
        emitEffectChange();
      });
      saturationSlider.addEventListener('input', (e) => {
        state.saturation = e.target.value / 100;
        emitEffectChange();
      });

      // Touch controls
      let touchTimeout;
      container.addEventListener('touchstart', () => {
        container.classList.add('touch-active');
        clearTimeout(touchTimeout);
      });
      container.addEventListener('touchend', () => {
        touchTimeout = setTimeout(() => {
          container.classList.remove('touch-active');
        }, 3000);
      });

      // Double-tap to mirror
      let lastTap = 0;
      container.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          toggleMirror();
        }
        lastTap = now;
      });

      // Widget API
      API.onMount(function(context) {
        const savedState = context.state || {};
        if (savedState.mirrored !== undefined) state.mirrored = savedState.mirrored;
        if (savedState.deviceId) state.deviceId = savedState.deviceId;

        mirrorBtn.classList.toggle('active', state.mirrored);

        // Auto-start camera
        startCamera(state.deviceId);

        API.log('WebcamWidget mounted');
      });

      API.onInput('source.set', function(deviceId) {
        startCamera(deviceId);
      });

      API.onInput('effect.apply', function(effect) {
        if (effect.type === 'chromaKey') {
          state.chromaEnabled = effect.enabled !== false;
          if (effect.color) state.chromaColor = effect.color;
          if (effect.threshold !== undefined) state.chromaThreshold = effect.threshold;
          chromaToggle.classList.toggle('on', state.chromaEnabled);
          chromaBtn.classList.toggle('active', state.chromaEnabled);
        }
        emitEffectChange();
      });

      API.onInput('ui.mirror', toggleMirror);
      API.onInput('camera.switch', switchCamera);

      API.onDestroy(function() {
        if (animationId) cancelAnimationFrame(animationId);
        if (state.stream) {
          state.stream.getTracks().forEach(t => t.stop());
        }
        API.log('WebcamWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const WebcamWidget: BuiltinWidget = {
  manifest: WebcamWidgetManifest,
  html: WebcamWidgetHTML,
};
