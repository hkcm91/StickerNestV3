/**
 * StickerNest v2 - Retro TV Widget
 *
 * An old-school CRT television widget with green screen preview display.
 * Connects to image galleries, video displays, playlists, and other visual media widgets.
 * Features adjustable dials for glitch effects, noise, scanlines, and more.
 * Channel changing triggers "next/prev" events on connected media widgets.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const RetroTVWidgetManifest: WidgetManifest = {
  id: 'stickernest.retro-tv',
  name: 'Retro TV',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'Old-school CRT television with green screen preview. Connects to visual media widgets and adds retro effects via dials.',
  author: 'StickerNest',
  tags: ['retro', 'tv', 'crt', 'display', 'media', 'effects', 'vintage', 'green-screen', 'glitch'],
  inputs: {
    mediaSrc: {
      type: 'string',
      description: 'Media source URL (image/video)',
      default: '',
    },
    channel: {
      type: 'number',
      description: 'Current channel number',
      default: 1,
    },
    power: {
      type: 'boolean',
      description: 'TV power state',
      default: true,
    },
    noise: {
      type: 'number',
      description: 'Noise/static level (0-100)',
      default: 15,
    },
    scanlines: {
      type: 'number',
      description: 'Scanline intensity (0-100)',
      default: 40,
    },
    glitch: {
      type: 'number',
      description: 'Glitch effect intensity (0-100)',
      default: 0,
    },
    distortion: {
      type: 'number',
      description: 'Screen distortion amount (0-100)',
      default: 20,
    },
    brightness: {
      type: 'number',
      description: 'Screen brightness (0-200)',
      default: 100,
    },
    hueShift: {
      type: 'number',
      description: 'Hue shift in degrees (0-360)',
      default: 120,
    },
  },
  outputs: {
    channelChanged: {
      type: 'object',
      description: 'Emitted when channel changes with direction',
    },
    mediaNext: {
      type: 'trigger',
      description: 'Trigger next media item',
    },
    mediaPrev: {
      type: 'trigger',
      description: 'Trigger previous media item',
    },
    powerChanged: {
      type: 'boolean',
      description: 'TV power state changed',
    },
    screenClicked: {
      type: 'trigger',
      description: 'Emitted when screen is clicked',
    },
    effectsChanged: {
      type: 'object',
      description: 'Current effect values',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: [
      'media.set',
      'media.next',
      'media.prev',
      'image.set',
      'video.set',
      'data.set',
      'trigger.next',
      'trigger.prev',
      'trigger.power',
      'ui.show',
      'ui.hide',
    ],
    outputs: [
      'channel.changed',
      'media.next',
      'media.prev',
      'power.changed',
      'ui.clicked',
      'effects.changed',
      'state.changed',
    ],
  },
  events: {
    emits: ['retro-tv:channel-changed', 'retro-tv:power-changed'],
    listens: ['media:updated', 'playlist:item-changed'],
  },
  size: {
    width: 320,
    height: 280,
    minWidth: 240,
    minHeight: 220,
    aspectRatio: 4 / 3.5,
    scaleMode: 'scale',
  },
};

export const RetroTVWidgetHTML = `
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
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .tv-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(145deg, #4a4238 0%, #2d2820 50%, #1a1610 100%);
      border-radius: 16px;
      padding: 8px;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        inset 0 -2px 4px rgba(0, 0, 0, 0.3);
    }

    /* TV Screen Frame */
    .screen-frame {
      flex: 1;
      background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
      border-radius: 12px 12px 8px 8px;
      padding: 8px;
      position: relative;
      box-shadow:
        inset 0 0 20px rgba(0, 0, 0, 0.8),
        inset 0 0 3px rgba(0, 0, 0, 0.9);
    }

    /* CRT Screen */
    .crt-screen {
      width: 100%;
      height: 100%;
      background: #001a00;
      border-radius: 20px / 16px;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      box-shadow:
        inset 0 0 60px rgba(0, 255, 0, 0.1),
        inset 0 0 20px rgba(0, 0, 0, 0.5);
    }

    .crt-screen.off {
      background: #0a0a0a;
      box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
    }

    .crt-screen.off::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.1);
      transform: translate(-50%, -50%);
      animation: turnOff 0.3s ease-out forwards;
    }

    @keyframes turnOff {
      0% { width: 100%; height: 2px; opacity: 1; }
      50% { width: 100%; height: 2px; opacity: 0.5; }
      100% { width: 0; height: 0; opacity: 0; }
    }

    /* Media Display */
    .media-display {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .media-display img,
    .media-display video {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .no-signal {
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      text-align: center;
      text-shadow: 0 0 10px #00ff00;
      animation: flicker 0.1s infinite;
    }

    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.95; }
    }

    /* Scanlines Overlay */
    .scanlines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 1px,
        rgba(0, 0, 0, 0.3) 1px,
        rgba(0, 0, 0, 0.3) 2px
      );
      pointer-events: none;
      z-index: 10;
    }

    /* Noise Overlay */
    .noise {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 11;
      opacity: 0.15;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      animation: noiseAnim 0.1s steps(2) infinite;
    }

    @keyframes noiseAnim {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-2%, -2%); }
      50% { transform: translate(2%, 2%); }
      75% { transform: translate(-2%, 2%); }
      100% { transform: translate(2%, -2%); }
    }

    /* Screen Curvature */
    .screen-curve {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(
        ellipse at center,
        transparent 0%,
        transparent 70%,
        rgba(0, 0, 0, 0.4) 100%
      );
      pointer-events: none;
      z-index: 12;
      border-radius: inherit;
    }

    /* Glitch Effect */
    .glitch-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9;
    }

    .glitch-layer.active {
      animation: glitch 0.3s steps(2) infinite;
    }

    @keyframes glitch {
      0% {
        clip-path: inset(20% 0 30% 0);
        transform: translate(-2px, 0);
      }
      25% {
        clip-path: inset(60% 0 10% 0);
        transform: translate(2px, 0);
      }
      50% {
        clip-path: inset(10% 0 70% 0);
        transform: translate(-1px, 0);
      }
      75% {
        clip-path: inset(40% 0 20% 0);
        transform: translate(3px, 0);
      }
      100% {
        clip-path: inset(80% 0 5% 0);
        transform: translate(0, 0);
      }
    }

    /* Green Phosphor Effect */
    .phosphor-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 8;
      mix-blend-mode: screen;
      background: radial-gradient(
        ellipse at center,
        rgba(0, 255, 0, 0.05) 0%,
        transparent 70%
      );
    }

    /* Channel Display */
    .channel-display {
      position: absolute;
      top: 8px;
      right: 12px;
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 0 0 8px #00ff00;
      z-index: 15;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .channel-display.visible {
      opacity: 1;
      animation: channelPop 2s ease-out forwards;
    }

    @keyframes channelPop {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }

    /* Control Panel */
    .control-panel {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px 4px 4px;
      gap: 8px;
    }

    /* Speaker Grille */
    .speaker {
      width: 60px;
      height: 40px;
      background: linear-gradient(90deg,
        #2a2420 0px, #1a1610 2px,
        #2a2420 2px, #1a1610 4px,
        #2a2420 4px, #1a1610 6px,
        #2a2420 6px, #1a1610 8px
      );
      border-radius: 4px;
      box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
    }

    /* Dials Container */
    .dials {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    /* Dial Styling */
    .dial {
      width: 28px;
      height: 28px;
      background: linear-gradient(145deg, #5a5248, #3a3228);
      border-radius: 50%;
      position: relative;
      cursor: pointer;
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.1);
      transition: transform 0.1s;
    }

    .dial:hover {
      transform: scale(1.05);
    }

    .dial:active {
      transform: scale(0.95);
    }

    .dial::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 50%;
      width: 2px;
      height: 8px;
      background: #eee;
      transform: translateX(-50%);
      border-radius: 1px;
      transform-origin: center bottom;
    }

    .dial.noise-dial::after { background: #ff6b6b; }
    .dial.scanline-dial::after { background: #4ecdc4; }
    .dial.glitch-dial::after { background: #ffe66d; }
    .dial.distortion-dial::after { background: #95e1d3; }

    /* Channel Dial - Larger */
    .channel-dial {
      width: 36px;
      height: 36px;
      background: linear-gradient(145deg, #6a6258, #4a4238);
      border: 2px solid #3a3228;
    }

    .channel-dial::after {
      height: 12px;
      background: #ffd700;
    }

    /* Power Button */
    .power-btn {
      width: 20px;
      height: 20px;
      background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
      border-radius: 50%;
      border: none;
      cursor: pointer;
      position: relative;
      box-shadow:
        0 2px 4px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.1);
    }

    .power-btn::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      background: #333;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
    }

    .power-btn.on::after {
      background: #00ff00;
      box-shadow: 0 0 8px #00ff00, inset 0 0 4px rgba(255, 255, 255, 0.3);
    }

    /* Brand Label */
    .brand {
      font-size: 8px;
      color: #8a8278;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: bold;
    }

    /* Tooltip */
    .dial-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 100;
    }

    .dial:hover .dial-tooltip {
      opacity: 1;
    }

    /* Turn-on Animation */
    .crt-screen.turning-on {
      animation: turnOn 0.5s ease-out forwards;
    }

    @keyframes turnOn {
      0% {
        filter: brightness(0);
        transform: scaleY(0.01);
      }
      50% {
        filter: brightness(2);
        transform: scaleY(0.01);
      }
      75% {
        filter: brightness(1.5);
        transform: scaleY(1);
      }
      100% {
        filter: brightness(1);
        transform: scaleY(1);
      }
    }

    /* Static Animation */
    @keyframes static {
      0% { background-position: 0 0; }
      100% { background-position: 100% 100%; }
    }

    .static-screen {
      background: repeating-conic-gradient(
        from 0deg,
        #001a00 0deg 1deg,
        #003300 1deg 2deg
      );
      background-size: 4px 4px;
      animation: static 0.1s steps(4) infinite;
    }
  </style>
</head>
<body>
  <div class="tv-container">
    <div class="screen-frame">
      <div class="crt-screen" id="crtScreen">
        <div class="media-display" id="mediaDisplay">
          <div class="no-signal" id="noSignal">
            NO SIGNAL<br>
            <span style="font-size: 10px;">CH --</span>
          </div>
          <img id="mediaImage" style="display: none;" alt="TV Display" />
          <video id="mediaVideo" style="display: none;" muted loop></video>
        </div>
        <div class="phosphor-glow"></div>
        <div class="glitch-layer" id="glitchLayer"></div>
        <div class="scanlines" id="scanlines"></div>
        <div class="noise" id="noise"></div>
        <div class="screen-curve" id="screenCurve"></div>
        <div class="channel-display" id="channelDisplay">CH 01</div>
      </div>
    </div>
    <div class="control-panel">
      <div class="speaker"></div>
      <div class="dials">
        <div class="dial noise-dial" id="noiseDial" data-effect="noise" title="Noise">
          <span class="dial-tooltip">Noise</span>
        </div>
        <div class="dial scanline-dial" id="scanlineDial" data-effect="scanlines" title="Scanlines">
          <span class="dial-tooltip">Scanlines</span>
        </div>
        <div class="dial glitch-dial" id="glitchDial" data-effect="glitch" title="Glitch">
          <span class="dial-tooltip">Glitch</span>
        </div>
        <div class="dial distortion-dial" id="distortionDial" data-effect="distortion" title="Distortion">
          <span class="dial-tooltip">Distortion</span>
        </div>
        <div class="dial channel-dial" id="channelDial" title="Channel">
          <span class="dial-tooltip">Channel</span>
        </div>
      </div>
      <button class="power-btn on" id="powerBtn" title="Power"></button>
      <span class="brand">RETRO</span>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM Elements
      const crtScreen = document.getElementById('crtScreen');
      const mediaDisplay = document.getElementById('mediaDisplay');
      const noSignal = document.getElementById('noSignal');
      const mediaImage = document.getElementById('mediaImage');
      const mediaVideo = document.getElementById('mediaVideo');
      const channelDisplay = document.getElementById('channelDisplay');
      const scanlines = document.getElementById('scanlines');
      const noise = document.getElementById('noise');
      const glitchLayer = document.getElementById('glitchLayer');
      const screenCurve = document.getElementById('screenCurve');
      const powerBtn = document.getElementById('powerBtn');

      // Dial elements
      const noiseDial = document.getElementById('noiseDial');
      const scanlineDial = document.getElementById('scanlineDial');
      const glitchDial = document.getElementById('glitchDial');
      const distortionDial = document.getElementById('distortionDial');
      const channelDial = document.getElementById('channelDial');

      // State
      let state = {
        power: true,
        channel: 1,
        mediaSrc: '',
        mediaType: 'image',
        noise: 15,
        scanlines: 40,
        glitch: 0,
        distortion: 20,
        brightness: 100,
        hueShift: 120
      };

      let glitchInterval = null;
      let dialRotations = {
        noise: 0,
        scanlines: 0,
        glitch: 0,
        distortion: 0,
        channel: 0
      };

      // Apply effects based on state
      function applyEffects() {
        // Noise
        noise.style.opacity = state.noise / 100 * 0.5;

        // Scanlines
        const scanlineOpacity = state.scanlines / 100;
        scanlines.style.background = 'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0, 0, 0, ' + (scanlineOpacity * 0.5) + ') 1px, rgba(0, 0, 0, ' + (scanlineOpacity * 0.5) + ') 2px)';

        // Glitch
        if (state.glitch > 20) {
          glitchLayer.classList.add('active');
          if (!glitchInterval) {
            glitchInterval = setInterval(triggerGlitch, 3000 - (state.glitch * 25));
          }
        } else {
          glitchLayer.classList.remove('active');
          if (glitchInterval) {
            clearInterval(glitchInterval);
            glitchInterval = null;
          }
        }

        // Distortion (screen curve intensity)
        const curveIntensity = state.distortion / 100 * 0.6;
        screenCurve.style.background = 'radial-gradient(ellipse at center, transparent 0%, transparent ' + (70 - state.distortion * 0.3) + '%, rgba(0, 0, 0, ' + curveIntensity + ') 100%)';

        // Brightness and Hue
        const filters = [];
        filters.push('brightness(' + (state.brightness / 100) + ')');
        filters.push('hue-rotate(' + state.hueShift + 'deg)');
        filters.push('saturate(1.2)');
        mediaDisplay.style.filter = filters.join(' ');

        // Update dial rotations visually
        updateDialRotations();
      }

      function updateDialRotations() {
        noiseDial.style.transform = 'rotate(' + (state.noise * 2.7) + 'deg)';
        scanlineDial.style.transform = 'rotate(' + (state.scanlines * 2.7) + 'deg)';
        glitchDial.style.transform = 'rotate(' + (state.glitch * 2.7) + 'deg)';
        distortionDial.style.transform = 'rotate(' + (state.distortion * 2.7) + 'deg)';
        channelDial.style.transform = 'rotate(' + ((state.channel - 1) * 30) + 'deg)';
      }

      function triggerGlitch() {
        if (state.glitch > 20 && state.power) {
          const display = mediaImage.style.display !== 'none' ? mediaImage : mediaVideo;
          display.style.transform = 'translate(' + (Math.random() * state.glitch * 0.1 - state.glitch * 0.05) + 'px, 0)';
          setTimeout(function() {
            display.style.transform = '';
          }, 50 + Math.random() * 100);
        }
      }

      function showChannel() {
        channelDisplay.textContent = 'CH ' + String(state.channel).padStart(2, '0');
        channelDisplay.classList.remove('visible');
        void channelDisplay.offsetWidth; // Force reflow
        channelDisplay.classList.add('visible');
      }

      function setPower(on) {
        state.power = on;
        powerBtn.classList.toggle('on', on);

        if (on) {
          crtScreen.classList.remove('off');
          crtScreen.classList.add('turning-on');
          setTimeout(function() {
            crtScreen.classList.remove('turning-on');
          }, 500);
        } else {
          crtScreen.classList.add('off');
          crtScreen.classList.remove('turning-on');
        }

        API.emitOutput('power.changed', on);
        API.emit('retro-tv:power-changed', { power: on });
        API.setState({ power: on });
      }

      function setChannel(ch, emitNext) {
        const oldChannel = state.channel;
        state.channel = Math.max(1, Math.min(99, ch));
        showChannel();

        API.emitOutput('channel.changed', {
          channel: state.channel,
          previous: oldChannel,
          direction: state.channel > oldChannel ? 'next' : 'prev'
        });
        API.emit('retro-tv:channel-changed', { channel: state.channel });
        API.setState({ channel: state.channel });

        // Emit media navigation triggers
        if (emitNext !== false) {
          if (state.channel > oldChannel) {
            API.emitOutput('media.next', {});
          } else if (state.channel < oldChannel) {
            API.emitOutput('media.prev', {});
          }
        }

        applyEffects();
      }

      function loadMedia(src) {
        if (!src) {
          noSignal.style.display = 'block';
          mediaImage.style.display = 'none';
          mediaVideo.style.display = 'none';
          crtScreen.classList.add('static-screen');
          state.mediaSrc = '';
          API.setState({ mediaSrc: '' });
          return;
        }

        state.mediaSrc = src;
        crtScreen.classList.remove('static-screen');
        noSignal.style.display = 'none';

        // Determine media type
        const isVideo = /\\.(mp4|webm|ogg|mov)$/i.test(src);
        state.mediaType = isVideo ? 'video' : 'image';

        if (isVideo) {
          mediaImage.style.display = 'none';
          mediaVideo.style.display = 'block';
          mediaVideo.src = API.getAssetUrl(src);
          mediaVideo.play().catch(function() {});
        } else {
          mediaVideo.style.display = 'none';
          mediaImage.style.display = 'block';
          mediaImage.src = API.getAssetUrl(src);
        }

        API.setState({ mediaSrc: src, mediaType: state.mediaType });
        showChannel();
      }

      function adjustEffect(effect, delta) {
        if (effect === 'channel') {
          setChannel(state.channel + delta);
        } else {
          state[effect] = Math.max(0, Math.min(100, state[effect] + delta));
          applyEffects();

          API.emitOutput('effects.changed', {
            noise: state.noise,
            scanlines: state.scanlines,
            glitch: state.glitch,
            distortion: state.distortion
          });

          const stateUpdate = {};
          stateUpdate[effect] = state[effect];
          API.setState(stateUpdate);
        }
      }

      // Dial click handlers
      function setupDial(dial, effect) {
        dial.addEventListener('click', function(e) {
          const rect = dial.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const isRight = e.clientX > centerX;
          adjustEffect(effect, isRight ? 10 : -10);
        });

        dial.addEventListener('wheel', function(e) {
          e.preventDefault();
          adjustEffect(effect, e.deltaY > 0 ? -5 : 5);
        });
      }

      setupDial(noiseDial, 'noise');
      setupDial(scanlineDial, 'scanlines');
      setupDial(glitchDial, 'glitch');
      setupDial(distortionDial, 'distortion');
      setupDial(channelDial, 'channel');

      // Power button
      powerBtn.addEventListener('click', function() {
        setPower(!state.power);
      });

      // Screen click
      crtScreen.addEventListener('click', function() {
        API.emitOutput('ui.clicked', { channel: state.channel, mediaSrc: state.mediaSrc });
      });

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        state = { ...state, ...savedState };

        setPower(state.power);
        if (state.mediaSrc) {
          loadMedia(state.mediaSrc);
        }
        setChannel(state.channel, false);
        applyEffects();

        API.log('RetroTVWidget mounted');
      });

      // Input handlers
      API.onInput('media.set', function(value) {
        const src = typeof value === 'string' ? value : (value && value.src) || '';
        loadMedia(src);
      });

      API.onInput('image.set', function(value) {
        const src = typeof value === 'string' ? value : (value && value.src) || '';
        loadMedia(src);
      });

      API.onInput('video.set', function(value) {
        const src = typeof value === 'string' ? value : (value && value.src) || '';
        loadMedia(src);
      });

      API.onInput('data.set', function(data) {
        if (typeof data === 'string') {
          loadMedia(data);
        } else if (data) {
          if (data.src !== undefined) loadMedia(data.src);
          if (data.channel !== undefined) setChannel(data.channel, false);
          if (data.power !== undefined) setPower(data.power);
          if (data.noise !== undefined) { state.noise = data.noise; applyEffects(); }
          if (data.scanlines !== undefined) { state.scanlines = data.scanlines; applyEffects(); }
          if (data.glitch !== undefined) { state.glitch = data.glitch; applyEffects(); }
          if (data.distortion !== undefined) { state.distortion = data.distortion; applyEffects(); }
          if (data.brightness !== undefined) { state.brightness = data.brightness; applyEffects(); }
          if (data.hueShift !== undefined) { state.hueShift = data.hueShift; applyEffects(); }
        }
      });

      API.onInput('trigger.next', function() {
        setChannel(state.channel + 1);
      });

      API.onInput('trigger.prev', function() {
        setChannel(state.channel - 1);
      });

      API.onInput('media.next', function() {
        setChannel(state.channel + 1);
      });

      API.onInput('media.prev', function() {
        setChannel(state.channel - 1);
      });

      API.onInput('trigger.power', function() {
        setPower(!state.power);
      });

      API.onInput('ui.show', function() {
        document.querySelector('.tv-container').style.display = 'flex';
      });

      API.onInput('ui.hide', function() {
        document.querySelector('.tv-container').style.display = 'none';
      });

      // Listen for broadcast events from media widgets
      API.on('media:updated', function(data) {
        if (data && data.src) {
          loadMedia(data.src);
        }
      });

      API.on('playlist:item-changed', function(data) {
        if (data && data.src) {
          loadMedia(data.src);
          if (data.index !== undefined) {
            state.channel = data.index + 1;
            showChannel();
          }
        }
      });

      // Cleanup
      API.onDestroy(function() {
        if (glitchInterval) {
          clearInterval(glitchInterval);
        }
        API.log('RetroTVWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const RetroTVWidget: BuiltinWidget = {
  manifest: RetroTVWidgetManifest,
  html: RetroTVWidgetHTML,
};
