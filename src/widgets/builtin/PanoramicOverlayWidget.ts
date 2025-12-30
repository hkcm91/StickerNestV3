/**
 * StickerNest v2 - Panoramic Overlay Widget
 *
 * Displays 360° panoramic images or videos as environment backgrounds.
 * Perfect for VR skyboxes or AR background replacement.
 *
 * Features:
 * - Equirectangular panorama support
 * - 360° video playback
 * - Cubemap support
 * - Blend modes for compositing
 * - Rotation and offset controls
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const PanoramicOverlayWidgetManifest: WidgetManifest = {
  id: 'stickernest.panoramic-overlay',
  name: 'Panoramic Overlay',
  version: '1.0.0',
  kind: '3d',
  entry: 'index.html',
  description: 'Display 360° panoramic images or videos as VR/AR backgrounds',
  author: 'StickerNest',
  tags: ['panorama', '360', 'vr', 'ar', 'skybox', 'environment', 'video', 'background'],
  inputs: {
    setSource: {
      type: 'string',
      description: 'Set panorama source URL',
    },
    setRotation: {
      type: 'number',
      description: 'Set Y-axis rotation offset (degrees)',
    },
    setOpacity: {
      type: 'number',
      description: 'Set overlay opacity (0-1)',
    },
    setBlendMode: {
      type: 'string',
      description: 'Set blend mode (normal, multiply, screen, overlay)',
    },
    play: {
      type: 'trigger',
      description: 'Play video (if video source)',
    },
    pause: {
      type: 'trigger',
      description: 'Pause video',
    },
  },
  outputs: {
    sourceLoaded: {
      type: 'object',
      description: 'Emitted when panorama loads { type, width, height }',
    },
    playbackState: {
      type: 'string',
      description: 'Video playback state (playing, paused, ended)',
    },
    rotationChanged: {
      type: 'number',
      description: 'Current rotation offset',
    },
    textureReady: {
      type: 'object',
      description: 'Texture data for 3D renderer integration',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
    supports3d: true,
  },
  io: {
    inputs: ['source.set', 'rotation.set', 'opacity.set', 'blend.set', 'playback.play', 'playback.pause'],
    outputs: ['source.loaded', 'playback.state', 'rotation.changed', 'texture.ready'],
  },
  size: {
    width: 320,
    height: 240,
    minWidth: 240,
    minHeight: 180,
    aspectRatio: 4 / 3,
    scaleMode: 'contain',
  },
};

export const PanoramicOverlayWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      display: flex;
      flex-direction: column;
    }

    /* Preview */
    .preview {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: #000;
    }
    .preview-canvas {
      width: 100%;
      height: 100%;
    }
    .preview-placeholder {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .preview-placeholder.hidden {
      display: none;
    }
    .preview-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    /* Drop zone */
    .drop-zone {
      position: absolute;
      inset: 0;
      border: 2px dashed var(--sn-accent-primary, #8b5cf6);
      border-radius: 8px;
      background: rgba(139, 92, 246, 0.1);
      display: none;
      align-items: center;
      justify-content: center;
      color: var(--sn-accent-primary, #8b5cf6);
      font-size: 14px;
      font-weight: 500;
    }
    .drop-zone.active {
      display: flex;
    }

    /* Controls */
    .controls {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Source selector */
    .source-row {
      display: flex;
      gap: 8px;
    }
    .source-input {
      flex: 1;
      height: 36px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      padding: 0 10px;
    }
    .source-input:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .source-input::placeholder {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .browse-btn {
      height: 36px;
      padding: 0 12px;
      background: var(--sn-accent-primary, #8b5cf6);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }
    .browse-btn:hover {
      opacity: 0.9;
    }

    /* Presets */
    .presets-row {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .preset-btn {
      height: 28px;
      padding: 0 10px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 14px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .preset-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .preset-btn.active {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    /* Sliders row */
    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .slider-label {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      min-width: 55px;
    }
    input[type="range"] {
      flex: 1;
      height: 28px;
      -webkit-appearance: none;
      background: transparent;
    }
    input[type="range"]::-webkit-slider-track {
      height: 4px;
      background: var(--sn-bg-primary, #0f0f19);
      border-radius: 2px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      cursor: pointer;
      margin-top: -5px;
    }
    .slider-value {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      min-width: 36px;
      text-align: right;
    }

    /* Video controls */
    .video-controls {
      display: none;
      gap: 8px;
      align-items: center;
    }
    .video-controls.visible {
      display: flex;
    }
    .video-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .video-btn:hover {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .video-time {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .video-progress {
      flex: 1;
      height: 4px;
      background: var(--sn-bg-primary, #0f0f19);
      border-radius: 2px;
      overflow: hidden;
      cursor: pointer;
    }
    .video-progress-fill {
      height: 100%;
      background: var(--sn-accent-primary, #8b5cf6);
      width: 0%;
      transition: width 0.1s linear;
    }

    /* Blend mode selector */
    .blend-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .blend-select {
      flex: 1;
      height: 32px;
      background: var(--sn-bg-tertiary, #252538);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      padding: 0 8px;
      cursor: pointer;
    }

    /* Loading */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      gap: 12px;
    }
    .loading-overlay.visible {
      display: flex;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="preview">
      <canvas class="preview-canvas" id="previewCanvas"></canvas>
      <div class="preview-placeholder" id="placeholder">
        <span class="preview-icon">🌐</span>
        <span>Drop panorama or enter URL</span>
      </div>
      <div class="drop-zone" id="dropZone">Drop panorama here</div>
      <div class="loading-overlay" id="loading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>
    </div>

    <div class="controls">
      <div class="source-row">
        <input type="text" class="source-input" id="sourceInput" placeholder="Enter panorama URL...">
        <button class="browse-btn" id="browseBtn">Browse</button>
        <input type="file" id="fileInput" accept="image/*,video/*" style="display: none;">
      </div>

      <div class="presets-row" id="presets">
        <button class="preset-btn" data-url="preset:stars">🌌 Stars</button>
        <button class="preset-btn" data-url="preset:sunset">🌅 Sunset</button>
        <button class="preset-btn" data-url="preset:mountains">🏔️ Mountains</button>
        <button class="preset-btn" data-url="preset:studio">📷 Studio</button>
        <button class="preset-btn" data-url="preset:gradient">🎨 Gradient</button>
      </div>

      <div class="slider-row">
        <span class="slider-label">Rotation</span>
        <input type="range" id="rotationSlider" min="0" max="360" value="0">
        <span class="slider-value" id="rotationValue">0°</span>
      </div>

      <div class="slider-row">
        <span class="slider-label">Opacity</span>
        <input type="range" id="opacitySlider" min="0" max="100" value="100">
        <span class="slider-value" id="opacityValue">100%</span>
      </div>

      <div class="blend-row">
        <span class="slider-label">Blend</span>
        <select class="blend-select" id="blendSelect">
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="screen">Screen</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft Light</option>
        </select>
      </div>

      <div class="video-controls" id="videoControls">
        <button class="video-btn" id="playPauseBtn">▶️</button>
        <span class="video-time" id="currentTime">0:00</span>
        <div class="video-progress" id="videoProgress">
          <div class="video-progress-fill" id="progressFill"></div>
        </div>
        <span class="video-time" id="duration">0:00</span>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM
      const canvas = document.getElementById('previewCanvas');
      const ctx = canvas.getContext('2d');
      const placeholder = document.getElementById('placeholder');
      const dropZone = document.getElementById('dropZone');
      const loading = document.getElementById('loading');
      const sourceInput = document.getElementById('sourceInput');
      const browseBtn = document.getElementById('browseBtn');
      const fileInput = document.getElementById('fileInput');
      const presets = document.getElementById('presets');
      const rotationSlider = document.getElementById('rotationSlider');
      const rotationValue = document.getElementById('rotationValue');
      const opacitySlider = document.getElementById('opacitySlider');
      const opacityValue = document.getElementById('opacityValue');
      const blendSelect = document.getElementById('blendSelect');
      const videoControls = document.getElementById('videoControls');
      const playPauseBtn = document.getElementById('playPauseBtn');
      const currentTimeEl = document.getElementById('currentTime');
      const progressFill = document.getElementById('progressFill');
      const durationEl = document.getElementById('duration');
      const videoProgress = document.getElementById('videoProgress');

      // State
      let state = {
        source: null,
        type: null, // 'image' | 'video'
        rotation: 0,
        opacity: 1,
        blendMode: 'normal',
        isPlaying: false,
      };

      // Media elements
      let image = null;
      let video = null;
      let animationId = null;

      // Preset colors/patterns
      const PRESETS = {
        stars: { type: 'gradient', colors: ['#0a0a1a', '#1a1a3a', '#0a0a1a'], pattern: 'stars' },
        sunset: { type: 'gradient', colors: ['#ff7e5f', '#feb47b', '#ffb88c'] },
        mountains: { type: 'gradient', colors: ['#2c3e50', '#4ca1af', '#c9d6ff'] },
        studio: { type: 'solid', color: '#1a1a2e' },
        gradient: { type: 'gradient', colors: ['#667eea', '#764ba2'] },
      };

      // Format time
      function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + secs.toString().padStart(2, '0');
      }

      // Render preview
      function renderPreview() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        ctx.globalAlpha = state.opacity;
        ctx.globalCompositeOperation = state.blendMode === 'normal' ? 'source-over' : state.blendMode;

        if (state.type === 'image' && image) {
          // Draw equirectangular preview with rotation offset
          const srcX = (state.rotation / 360) * image.width;
          const srcWidth = image.width;

          ctx.drawImage(image, srcX, 0, srcWidth - srcX, image.height, 0, 0, rect.width * (1 - state.rotation / 360), rect.height);
          ctx.drawImage(image, 0, 0, srcX, image.height, rect.width * (1 - state.rotation / 360), 0, rect.width * (state.rotation / 360), rect.height);
        } else if (state.type === 'video' && video) {
          const srcX = (state.rotation / 360) * video.videoWidth;
          ctx.drawImage(video, srcX, 0, video.videoWidth - srcX, video.videoHeight, 0, 0, rect.width * (1 - state.rotation / 360), rect.height);
          ctx.drawImage(video, 0, 0, srcX, video.videoHeight, rect.width * (1 - state.rotation / 360), 0, rect.width * (state.rotation / 360), rect.height);

          // Update progress
          if (!video.paused) {
            currentTimeEl.textContent = formatTime(video.currentTime);
            progressFill.style.width = (video.currentTime / video.duration * 100) + '%';
            animationId = requestAnimationFrame(renderPreview);
          }
        } else if (state.type === 'preset') {
          renderPreset();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // Render preset background
      function renderPreset() {
        const rect = canvas.getBoundingClientRect();
        const preset = PRESETS[state.source?.replace('preset:', '')] || PRESETS.studio;

        if (preset.type === 'gradient') {
          const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
          preset.colors.forEach((color, i) => {
            gradient.addColorStop(i / (preset.colors.length - 1), color);
          });
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, rect.width, rect.height);

          // Add stars if needed
          if (preset.pattern === 'stars') {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 100; i++) {
              const x = Math.random() * rect.width;
              const y = Math.random() * rect.height * 0.7;
              const size = Math.random() * 2;
              ctx.globalAlpha = Math.random() * 0.5 + 0.5;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = preset.color;
          ctx.fillRect(0, 0, rect.width, rect.height);
        }
      }

      // Load source
      async function loadSource(url) {
        if (!url) return;

        loading.classList.add('visible');
        placeholder.classList.add('hidden');

        // Cleanup previous
        if (video) {
          video.pause();
          video.src = '';
          video = null;
        }
        if (animationId) {
          cancelAnimationFrame(animationId);
        }

        try {
          if (url.startsWith('preset:')) {
            state.source = url;
            state.type = 'preset';
            videoControls.classList.remove('visible');
            loading.classList.remove('visible');
            renderPreview();
            emitSourceLoaded();
            return;
          }

          // Detect type from URL
          const isVideo = /\\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video');

          if (isVideo) {
            video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.loop = true;
            video.muted = true;

            await new Promise((resolve, reject) => {
              video.onloadedmetadata = resolve;
              video.onerror = reject;
              video.src = url;
            });

            state.source = url;
            state.type = 'video';
            videoControls.classList.add('visible');
            durationEl.textContent = formatTime(video.duration);

            video.ontimeupdate = () => {
              currentTimeEl.textContent = formatTime(video.currentTime);
              progressFill.style.width = (video.currentTime / video.duration * 100) + '%';
            };
          } else {
            image = new Image();
            image.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
              image.onload = resolve;
              image.onerror = reject;
              image.src = url;
            });

            state.source = url;
            state.type = 'image';
            videoControls.classList.remove('visible');
          }

          loading.classList.remove('visible');
          renderPreview();
          emitSourceLoaded();

        } catch (err) {
          console.error('Failed to load:', err);
          loading.classList.remove('visible');
          placeholder.classList.remove('hidden');
        }
      }

      // Emit events
      function emitSourceLoaded() {
        const data = {
          type: state.type,
          source: state.source,
          width: state.type === 'image' ? image?.width : video?.videoWidth,
          height: state.type === 'image' ? image?.height : video?.videoHeight,
        };
        API.emitOutput('source.loaded', data);
        API.setState({ source: state.source, type: state.type, rotation: state.rotation, opacity: state.opacity, blendMode: state.blendMode });
      }

      // Event listeners
      sourceInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          loadSource(sourceInput.value);
        }
      });

      browseBtn.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          loadSource(URL.createObjectURL(file));
        }
      });

      presets.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-btn');
        if (btn) {
          document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          loadSource(btn.dataset.url);
        }
      });

      rotationSlider.addEventListener('input', () => {
        state.rotation = parseInt(rotationSlider.value);
        rotationValue.textContent = state.rotation + '°';
        renderPreview();
        API.emitOutput('rotation.changed', state.rotation);
      });

      opacitySlider.addEventListener('input', () => {
        state.opacity = opacitySlider.value / 100;
        opacityValue.textContent = opacitySlider.value + '%';
        renderPreview();
      });

      blendSelect.addEventListener('change', () => {
        state.blendMode = blendSelect.value;
        renderPreview();
      });

      playPauseBtn.addEventListener('click', () => {
        if (!video) return;
        if (video.paused) {
          video.play();
          playPauseBtn.textContent = '⏸️';
          state.isPlaying = true;
          API.emitOutput('playback.state', 'playing');
          renderPreview();
        } else {
          video.pause();
          playPauseBtn.textContent = '▶️';
          state.isPlaying = false;
          API.emitOutput('playback.state', 'paused');
        }
      });

      videoProgress.addEventListener('click', (e) => {
        if (!video) return;
        const rect = videoProgress.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
      });

      // Drag & drop
      const container = document.querySelector('.container');
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
      });
      container.addEventListener('dragleave', () => {
        dropZone.classList.remove('active');
      });
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file) {
          loadSource(URL.createObjectURL(file));
        }
      });

      // Resize
      const resizeObserver = new ResizeObserver(() => {
        if (state.source) renderPreview();
      });
      resizeObserver.observe(canvas);

      // Widget API
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);

        rotationSlider.value = state.rotation;
        rotationValue.textContent = state.rotation + '°';
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        blendSelect.value = state.blendMode;

        if (state.source) {
          sourceInput.value = state.source;
          loadSource(state.source);
        }

        API.log('PanoramicOverlayWidget mounted');
      });

      API.onInput('source.set', loadSource);

      API.onInput('rotation.set', function(deg) {
        state.rotation = Math.max(0, Math.min(360, deg));
        rotationSlider.value = state.rotation;
        rotationValue.textContent = state.rotation + '°';
        renderPreview();
        API.emitOutput('rotation.changed', state.rotation);
      });

      API.onInput('opacity.set', function(val) {
        state.opacity = Math.max(0, Math.min(1, val));
        opacitySlider.value = state.opacity * 100;
        opacityValue.textContent = Math.round(state.opacity * 100) + '%';
        renderPreview();
      });

      API.onInput('blend.set', function(mode) {
        state.blendMode = mode;
        blendSelect.value = mode;
        renderPreview();
      });

      API.onInput('playback.play', function() {
        if (video && video.paused) {
          video.play();
          playPauseBtn.textContent = '⏸️';
          state.isPlaying = true;
          API.emitOutput('playback.state', 'playing');
          renderPreview();
        }
      });

      API.onInput('playback.pause', function() {
        if (video && !video.paused) {
          video.pause();
          playPauseBtn.textContent = '▶️';
          state.isPlaying = false;
          API.emitOutput('playback.state', 'paused');
        }
      });

      API.onDestroy(function() {
        if (animationId) cancelAnimationFrame(animationId);
        if (video) {
          video.pause();
          video.src = '';
        }
        resizeObserver.disconnect();
        API.log('PanoramicOverlayWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const PanoramicOverlayWidget: BuiltinWidget = {
  manifest: PanoramicOverlayWidgetManifest,
  html: PanoramicOverlayWidgetHTML,
};
