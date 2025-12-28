/**
 * StickerNest v2 - Webcam Frame Widget
 *
 * Decorative frame overlay for webcam feeds.
 * Supports PNG frames, animated GIFs, and customizable styles.
 * Connect to WebcamWidget via pipeline for dynamic frame changes.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const WebcamFrameWidgetManifest: WidgetManifest = {
  id: 'stickernest.webcam-frame',
  name: 'Webcam Frame',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Decorative frame overlay for webcam feeds with built-in and custom frame support',
  author: 'StickerNest',
  tags: ['webcam', 'frame', 'overlay', 'decoration', 'streaming', 'border'],
  inputs: {
    setFrame: {
      type: 'string',
      description: 'Set frame by ID or URL',
    },
    setColor: {
      type: 'string',
      description: 'Set frame accent color (for colorizable frames)',
    },
    nextFrame: {
      type: 'trigger',
      description: 'Cycle to next frame in library',
    },
  },
  outputs: {
    frameChanged: {
      type: 'object',
      description: 'Emitted when frame changes { frameId, frameName }',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['frame.set', 'frame.color', 'frame.next'],
    outputs: ['frame.changed'],
  },
  size: {
    width: 320,
    height: 240,
    minWidth: 160,
    minHeight: 120,
    aspectRatio: 4 / 3,
    lockAspectRatio: false,
    scaleMode: 'scale',
  },
};

export const WebcamFrameWidgetHTML = `
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
      pointer-events: none;
    }

    /* Frame overlay */
    .frame-overlay {
      position: absolute;
      inset: 0;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
    }

    /* Built-in frames using CSS */
    .frame-simple {
      border: 4px solid var(--frame-color, #8b5cf6);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .frame-rounded {
      border: 6px solid var(--frame-color, #8b5cf6);
      border-radius: 50%;
    }

    .frame-neon {
      border: 3px solid var(--frame-color, #8b5cf6);
      border-radius: 8px;
      box-shadow:
        0 0 10px var(--frame-color, #8b5cf6),
        0 0 20px var(--frame-color, #8b5cf6),
        0 0 30px var(--frame-color, #8b5cf6),
        inset 0 0 10px rgba(139, 92, 246, 0.2);
      animation: neon-pulse 2s ease-in-out infinite;
    }

    @keyframes neon-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .frame-retro {
      border: 8px solid;
      border-image: linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3) 1;
    }

    .frame-pixel {
      border: 8px solid var(--frame-color, #8b5cf6);
      image-rendering: pixelated;
      box-shadow:
        4px 4px 0 0 rgba(0, 0, 0, 0.3),
        -2px -2px 0 0 rgba(255, 255, 255, 0.1) inset;
    }

    .frame-elegant {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(1px);
    }

    .frame-golden {
      border: 6px solid;
      border-image: linear-gradient(135deg, #d4af37, #f9df7b, #d4af37, #aa8c2c) 1;
      box-shadow:
        0 4px 15px rgba(212, 175, 55, 0.4),
        inset 0 0 20px rgba(212, 175, 55, 0.1);
    }

    .frame-glitch {
      border: 3px solid var(--frame-color, #00ff00);
      animation: glitch 0.3s infinite;
    }

    @keyframes glitch {
      0% { clip-path: inset(0 0 0 0); }
      20% { clip-path: inset(10% 0 80% 0); border-color: #ff0000; }
      40% { clip-path: inset(50% 0 30% 0); border-color: #00ffff; }
      60% { clip-path: inset(20% 0 60% 0); border-color: #ff00ff; }
      80% { clip-path: inset(70% 0 10% 0); border-color: #ffff00; }
      100% { clip-path: inset(0 0 0 0); }
    }

    .frame-holographic {
      border: 4px solid transparent;
      border-radius: 12px;
      background:
        linear-gradient(var(--sn-bg-primary, #0f0f19), var(--sn-bg-primary, #0f0f19)) padding-box,
        linear-gradient(
          var(--holo-angle, 45deg),
          #ff0080, #ff8c00, #40e0d0, #8b5cf6, #ff0080
        ) border-box;
      animation: holographic 3s linear infinite;
    }

    @keyframes holographic {
      to { --holo-angle: 405deg; }
    }

    /* Frame selector (shown on hover) */
    .frame-selector {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 20px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: auto;
    }
    .container:hover .frame-selector,
    .container.touch-active .frame-selector {
      opacity: 1;
    }

    .frame-thumb {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      border: 2px solid transparent;
      cursor: pointer;
      background: var(--sn-bg-tertiary, #252538);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .frame-thumb:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .frame-thumb.selected {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .frame-thumb:active {
      transform: scale(0.9);
    }

    /* Color picker */
    .color-picker {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
      padding: 4px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: auto;
    }
    .container:hover .color-picker,
    .container.touch-active .color-picker {
      opacity: 1;
    }

    .color-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .color-dot:hover {
      transform: scale(1.1);
    }
    .color-dot.selected {
      border-color: white;
    }
    .color-dot:active {
      transform: scale(0.9);
    }

    /* No frame state */
    .frame-none {
      border: 2px dashed rgba(255, 255, 255, 0.2);
      border-radius: 8px;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .frame-neon,
      .frame-glitch,
      .frame-holographic {
        animation: none;
      }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="frame-overlay" id="frameOverlay"></div>

    <!-- Frame selector -->
    <div class="frame-selector" id="frameSelector">
      <div class="frame-thumb selected" data-frame="none" title="No Frame">✖️</div>
      <div class="frame-thumb" data-frame="simple" title="Simple">⬜</div>
      <div class="frame-thumb" data-frame="rounded" title="Rounded">⭕</div>
      <div class="frame-thumb" data-frame="neon" title="Neon">✨</div>
      <div class="frame-thumb" data-frame="golden" title="Golden">👑</div>
      <div class="frame-thumb" data-frame="pixel" title="Pixel">🎮</div>
      <div class="frame-thumb" data-frame="elegant" title="Elegant">💎</div>
      <div class="frame-thumb" data-frame="holographic" title="Holographic">🌈</div>
    </div>

    <!-- Color picker -->
    <div class="color-picker" id="colorPicker">
      <div class="color-dot selected" data-color="#8b5cf6" style="background: #8b5cf6;" title="Purple"></div>
      <div class="color-dot" data-color="#ec4899" style="background: #ec4899;" title="Pink"></div>
      <div class="color-dot" data-color="#22c55e" style="background: #22c55e;" title="Green"></div>
      <div class="color-dot" data-color="#3b82f6" style="background: #3b82f6;" title="Blue"></div>
      <div class="color-dot" data-color="#f59e0b" style="background: #f59e0b;" title="Orange"></div>
      <div class="color-dot" data-color="#ef4444" style="background: #ef4444;" title="Red"></div>
      <div class="color-dot" data-color="#ffffff" style="background: #ffffff;" title="White"></div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM elements
      const container = document.getElementById('container');
      const frameOverlay = document.getElementById('frameOverlay');
      const frameSelector = document.getElementById('frameSelector');
      const colorPicker = document.getElementById('colorPicker');

      // Frame list
      const FRAMES = [
        { id: 'none', name: 'No Frame', class: 'frame-none' },
        { id: 'simple', name: 'Simple', class: 'frame-simple' },
        { id: 'rounded', name: 'Rounded', class: 'frame-rounded' },
        { id: 'neon', name: 'Neon', class: 'frame-neon' },
        { id: 'retro', name: 'Retro', class: 'frame-retro' },
        { id: 'pixel', name: 'Pixel', class: 'frame-pixel' },
        { id: 'elegant', name: 'Elegant', class: 'frame-elegant' },
        { id: 'golden', name: 'Golden', class: 'frame-golden' },
        { id: 'glitch', name: 'Glitch', class: 'frame-glitch' },
        { id: 'holographic', name: 'Holographic', class: 'frame-holographic' },
      ];

      // State
      let state = {
        currentFrame: 'none',
        frameColor: '#8b5cf6',
        customFrameUrl: null
      };

      // Haptic helper
      function haptic(type) {
        if (navigator.vibrate) {
          navigator.vibrate(type === 'light' ? 10 : 20);
        }
      }

      // Set frame
      function setFrame(frameId) {
        // Find frame
        const frame = FRAMES.find(f => f.id === frameId);

        // Remove all frame classes
        frameOverlay.className = 'frame-overlay';

        if (frame) {
          frameOverlay.classList.add(frame.class);
          state.currentFrame = frame.id;

          // Update selector
          frameSelector.querySelectorAll('.frame-thumb').forEach(thumb => {
            thumb.classList.toggle('selected', thumb.dataset.frame === frameId);
          });

          // Emit event
          API.emitOutput('frame.changed', {
            frameId: frame.id,
            frameName: frame.name
          });
        } else if (frameId && frameId.startsWith('http')) {
          // Custom URL frame
          frameOverlay.style.backgroundImage = 'url(' + frameId + ')';
          state.currentFrame = 'custom';
          state.customFrameUrl = frameId;
        }

        // Save state
        API.setState({
          currentFrame: state.currentFrame,
          frameColor: state.frameColor,
          customFrameUrl: state.customFrameUrl
        });
      }

      // Set frame color
      function setColor(color) {
        state.frameColor = color;
        frameOverlay.style.setProperty('--frame-color', color);

        // Update color picker
        colorPicker.querySelectorAll('.color-dot').forEach(dot => {
          dot.classList.toggle('selected', dot.dataset.color === color);
        });

        API.setState({ frameColor: color });
      }

      // Cycle to next frame
      function nextFrame() {
        const currentIndex = FRAMES.findIndex(f => f.id === state.currentFrame);
        const nextIndex = (currentIndex + 1) % FRAMES.length;
        setFrame(FRAMES[nextIndex].id);
      }

      // Event listeners
      frameSelector.addEventListener('click', (e) => {
        const thumb = e.target.closest('.frame-thumb');
        if (thumb) {
          haptic('light');
          setFrame(thumb.dataset.frame);
        }
      });

      colorPicker.addEventListener('click', (e) => {
        const dot = e.target.closest('.color-dot');
        if (dot) {
          haptic('light');
          setColor(dot.dataset.color);
        }
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

      // Swipe to change frame
      let touchStartX = 0;
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      });
      container.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;

        if (Math.abs(diff) > 50) {
          haptic('medium');
          if (diff > 0) {
            // Swipe right - previous frame
            const currentIndex = FRAMES.findIndex(f => f.id === state.currentFrame);
            const prevIndex = (currentIndex - 1 + FRAMES.length) % FRAMES.length;
            setFrame(FRAMES[prevIndex].id);
          } else {
            // Swipe left - next frame
            nextFrame();
          }
        }
      });

      // Widget API
      API.onMount(function(context) {
        const savedState = context.state || {};

        if (savedState.frameColor) {
          setColor(savedState.frameColor);
        }

        if (savedState.currentFrame) {
          setFrame(savedState.currentFrame);
        } else if (savedState.customFrameUrl) {
          setFrame(savedState.customFrameUrl);
        }

        API.log('WebcamFrameWidget mounted');
      });

      API.onInput('frame.set', function(value) {
        setFrame(value);
      });

      API.onInput('frame.color', function(color) {
        setColor(color);
      });

      API.onInput('frame.next', function() {
        haptic('light');
        nextFrame();
      });

      API.onStateChange(function(newState) {
        if (newState.currentFrame && newState.currentFrame !== state.currentFrame) {
          setFrame(newState.currentFrame);
        }
        if (newState.frameColor && newState.frameColor !== state.frameColor) {
          setColor(newState.frameColor);
        }
      });

      API.onDestroy(function() {
        API.log('WebcamFrameWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const WebcamFrameWidget: BuiltinWidget = {
  manifest: WebcamFrameWidgetManifest,
  html: WebcamFrameWidgetHTML,
};
