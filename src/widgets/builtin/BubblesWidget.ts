/**
 * StickerNest v2 - Bubbles Widget
 *
 * Interactive soap bubbles with realistic physics, iridescent effects, and audio feedback.
 * Designed to work with the Bubble Hunter widget for interactive gameplay.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const BubblesWidgetManifest: WidgetManifest = {
  id: 'stickernest.bubbles',
  name: 'Bubbles',
  version: '2.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Interactive soap bubbles with realistic physics, iridescent effects, and audio feedback',
  author: 'StickerNest',
  tags: ['bubbles', 'animation', 'interactive', 'audio', 'physics', 'effects'],
  inputs: {
    'pop-bubble': {
      type: 'object',
      description: 'Pop a bubble at specified coordinates',
    },
    'spawn-bubble': {
      type: 'object',
      description: 'Create a new bubble at coordinates',
    },
    'set-config': {
      type: 'object',
      description: 'Update bubble settings',
    },
    'hunter-attack': {
      type: 'object',
      description: 'Attack from bubble hunter widget',
    },
  },
  outputs: {
    'bubble-positions': {
      type: 'array',
      description: 'Current positions of all bubbles (emitted on frame)',
    },
    'bubble-popped': {
      type: 'object',
      description: 'Emitted when a bubble is popped',
    },
    'bubble-created': {
      type: 'object',
      description: 'Emitted when a new bubble spawns',
    },
    'bubble-state': {
      type: 'object',
      description: 'Current bubble count and state broadcast',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['bubbles.pop', 'bubbles.spawn', 'bubbles.config', 'hunter-attack'],
    outputs: ['bubbles.positions', 'bubbles.popped', 'bubbles.created', 'bubble-state'],
  },
  size: {
    width: 800,
    height: 600,
    minWidth: 300,
    minHeight: 200,
  },
};

export const BubblesWidgetHTML = `
<!DOCTYPE html>
<html lang="en">
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
    #canvas-container {
      width: 100%;
      height: 100%;
      position: relative;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .controls {
      position: absolute;
      bottom: 10px;
      left: 10px;
      display: flex;
      gap: 8px;
      z-index: 10;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #canvas-container:hover .controls { opacity: 1; }
    .control-btn {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 6px 12px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .control-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    .stats {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      font-size: 11px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #canvas-container:hover .stats { opacity: 1; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="bubbleCanvas"></canvas>
    <div class="controls">
      <button class="control-btn" id="addBubble">+ Bubble</button>
      <button class="control-btn" id="toggleAudio">🔊 Audio</button>
      <button class="control-btn" id="blowWind">💨 Wind</button>
    </div>
    <div class="stats">
      <span id="bubbleCount">0</span> bubbles |
      <span id="popCount">0</span> popped
    </div>
  </div>
  <script>
    (function() {
      var API = window.WidgetAPI;
      var canvas = document.getElementById('bubbleCanvas');
      var ctx = canvas.getContext('2d');
      var dpr = 1;
      var canvasWidth = 800;
      var canvasHeight = 600;

      var state = {
        bubbles: [],
        maxBubbles: 20,
        spawnRate: 2,
        gravity: -0.02,
        audioEnabled: true,
        popCount: 0,
        windForce: { x: 0, y: 0 },
        windDecay: 0.98
      };

      function safeEmit(portName, value) {
        if (API && API.emitOutput) {
          try { API.emitOutput(portName, value); } catch(e) {}
        }
      }

      function safeLog(msg) {
        if (API && API.log) {
          try { API.log(msg); } catch(e) {}
        }
      }

      var audioCtx = null;

      function initAudio() {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
      }

      function playPopSound(size) {
        if (size === undefined) size = 30;
        if (!state.audioEnabled) return;
        try {
          var actx = initAudio();
          if (actx.state === 'suspended') actx.resume();

          var osc1 = actx.createOscillator();
          var osc2 = actx.createOscillator();
          var gain = actx.createGain();
          var filter = actx.createBiquadFilter();

          var baseFreq = 800 - (size * 8);

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(baseFreq, actx.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(baseFreq * 1.5, actx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(50, actx.currentTime + 0.08);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2000, actx.currentTime);
          filter.frequency.exponentialRampToValueAtTime(200, actx.currentTime + 0.1);

          gain.gain.setValueAtTime(0.3, actx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.15);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(actx.destination);

          osc1.start(actx.currentTime);
          osc2.start(actx.currentTime);
          osc1.stop(actx.currentTime + 0.15);
          osc2.stop(actx.currentTime + 0.15);

          var noise = actx.createBufferSource();
          var noiseBuffer = actx.createBuffer(1, actx.sampleRate * 0.1, actx.sampleRate);
          var noiseData = noiseBuffer.getChannelData(0);
          for (var i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.1));
          }
          noise.buffer = noiseBuffer;

          var noiseGain = actx.createGain();
          var noiseFilter = actx.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.value = 3000;
          noiseFilter.Q.value = 2;

          noiseGain.gain.setValueAtTime(0.1, actx.currentTime);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);

          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(actx.destination);
          noise.start(actx.currentTime);
        } catch (e) {
          console.warn('Audio error:', e);
        }
      }

      function playSpawnSound() {
        if (!state.audioEnabled) return;
        try {
          var actx = initAudio();
          if (actx.state === 'suspended') actx.resume();

          var osc = actx.createOscillator();
          var gain = actx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(200, actx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(600, actx.currentTime + 0.1);

          gain.gain.setValueAtTime(0.05, actx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.1);

          osc.connect(gain);
          gain.connect(actx.destination);

          osc.start(actx.currentTime);
          osc.stop(actx.currentTime + 0.1);
        } catch (e) {
          console.warn('Audio error:', e);
        }
      }

      function Bubble(x, y, size) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = (x !== undefined && x !== null) ? x : Math.random() * canvasWidth;
        this.y = (y !== undefined && y !== null) ? y : canvasHeight + 50;
        this.size = (size !== undefined && size !== null) ? size : 20 + Math.random() * 40;
        this.baseSize = this.size;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = -0.5 - Math.random() * 1;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.02;
        this.wobbleAmount = 0.1 + Math.random() * 0.1;
        this.hueOffset = Math.random() * 360;
        this.hueSpeed = 0.5 + Math.random() * 0.5;
        this.age = 0;
        this.maxAge = 500 + Math.random() * 500;
        this.popping = false;
        this.popProgress = 0;
        this.popParticles = [];
      }

      Bubble.prototype.update = function(dt) {
        if (this.popping) {
          this.popProgress += 0.1;
          for (var i = 0; i < this.popParticles.length; i++) {
            var p = this.popParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.05;
          }
          return this.popProgress < 1;
        }

        this.age++;
        this.vy += state.gravity;
        this.vx += state.windForce.x * 0.01;
        this.vy += state.windForce.y * 0.01;
        this.vx *= 0.995;
        this.vy *= 0.995;
        this.x += this.vx;
        this.y += this.vy;

        this.wobblePhase += this.wobbleSpeed;
        var wobble = Math.sin(this.wobblePhase) * this.wobbleAmount;
        this.size = this.baseSize * (1 + wobble * 0.1);
        this.x += Math.sin(this.wobblePhase * 0.7) * 0.3;
        this.hueOffset += this.hueSpeed;

        var bounce = 0.6;
        if (this.x - this.size < 0) {
          this.x = this.size;
          this.vx = Math.abs(this.vx) * bounce;
        }
        if (this.x + this.size > canvasWidth) {
          this.x = canvasWidth - this.size;
          this.vx = -Math.abs(this.vx) * bounce;
        }
        if (this.y + this.size > canvasHeight) {
          this.y = canvasHeight - this.size;
          this.vy = -Math.abs(this.vy) * bounce;
        }

        if (this.y + this.size < -50 || this.age > this.maxAge) {
          return false;
        }
        return true;
      };

      Bubble.prototype.pop = function(poppedBy) {
        if (this.popping) return;
        poppedBy = poppedBy || 'user';
        this.popping = true;
        playPopSound(this.size);
        state.popCount++;
        updateStats();

        var particleCount = Math.floor(this.size / 3);
        for (var i = 0; i < particleCount; i++) {
          var angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
          var speed = 2 + Math.random() * 4;
          this.popParticles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: 2 + Math.random() * 4,
            hue: this.hueOffset + Math.random() * 60,
            life: 1
          });
        }

        safeEmit('bubbles.popped', {
          id: this.id,
          x: this.x,
          y: this.y,
          size: this.size,
          poppedBy: poppedBy
        });
      };

      Bubble.prototype.draw = function(ctx) {
        var i, p;
        if (this.popping) {
          for (i = 0; i < this.popParticles.length; i++) {
            p = this.popParticles[i];
            if (p.life > 0) {
              ctx.beginPath();
              ctx.arc(p.x * dpr, p.y * dpr, p.size * p.life * dpr, 0, Math.PI * 2);
              ctx.fillStyle = 'hsla(' + p.hue + ', 80%, 70%, ' + (p.life * 0.8) + ')';
              ctx.fill();
            }
          }
          return;
        }

        var x = this.x * dpr;
        var y = this.y * dpr;
        var r = this.size * dpr;

        ctx.save();

        var bodyGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        bodyGrad.addColorStop(0, 'hsla(' + this.hueOffset + ', 60%, 95%, 0.1)');
        bodyGrad.addColorStop(0.5, 'hsla(' + (this.hueOffset + 30) + ', 50%, 85%, 0.15)');
        bodyGrad.addColorStop(0.8, 'hsla(' + (this.hueOffset + 60) + ', 60%, 75%, 0.2)');
        bodyGrad.addColorStop(1, 'hsla(' + (this.hueOffset + 90) + ', 70%, 60%, 0.3)');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        var rimGrad = ctx.createRadialGradient(x, y, r * 0.85, x, y, r);
        rimGrad.addColorStop(0, 'transparent');
        rimGrad.addColorStop(0.3, 'hsla(' + this.hueOffset + ', 80%, 70%, 0.3)');
        rimGrad.addColorStop(0.5, 'hsla(' + (this.hueOffset + 60) + ', 80%, 70%, 0.4)');
        rimGrad.addColorStop(0.7, 'hsla(' + (this.hueOffset + 120) + ', 80%, 70%, 0.3)');
        rimGrad.addColorStop(0.85, 'hsla(' + (this.hueOffset + 180) + ', 80%, 70%, 0.4)');
        rimGrad.addColorStop(1, 'hsla(' + (this.hueOffset + 240) + ', 70%, 60%, 0.5)');

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();

        var highlightGrad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x - r * 0.4, y - r * 0.4, r * 0.5);
        highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        highlightGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
        highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = highlightGrad;
        ctx.fill();

        var highlight2Grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.5, 0, x - r * 0.2, y - r * 0.5, r * 0.2);
        highlight2Grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        highlight2Grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(x - r * 0.15, y - r * 0.5, r * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = highlight2Grad;
        ctx.fill();

        var bottomGrad = ctx.createRadialGradient(x + r * 0.3, y + r * 0.3, 0, x + r * 0.3, y + r * 0.3, r * 0.4);
        bottomGrad.addColorStop(0, 'hsla(' + (this.hueOffset + 180) + ', 60%, 80%, 0.3)');
        bottomGrad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(x + r * 0.25, y + r * 0.25, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = bottomGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + this.hueOffset + ', 50%, 80%, 0.3)';
        ctx.lineWidth = dpr;
        ctx.stroke();

        ctx.restore();
      };

      Bubble.prototype.containsPoint = function(px, py) {
        var dx = px - this.x;
        var dy = py - this.y;
        return dx * dx + dy * dy <= this.size * this.size;
      };

      Bubble.prototype.getData = function() {
        return {
          id: this.id,
          x: this.x,
          y: this.y,
          size: this.size,
          vx: this.vx,
          vy: this.vy
        };
      };

      function resizeCanvas() {
        var container = document.getElementById('canvas-container');
        dpr = window.devicePixelRatio || 1;
        canvasWidth = container.clientWidth;
        canvasHeight = container.clientHeight;
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
      }

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      var spawnTimer = 0;

      function spawnBubble(x, y, size) {
        if (state.bubbles.length < state.maxBubbles) {
          var bubble = new Bubble(x, y, size);
          state.bubbles.push(bubble);
          playSpawnSound();
          safeEmit('bubbles.created', bubble.getData());
          return bubble;
        }
        return null;
      }

      var lastTime = 0;
      var frameCount = 0;

      function animate(time) {
        var dt = time - lastTime;
        lastTime = time;
        frameCount++;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        spawnTimer += dt;
        if (spawnTimer > 1000 / state.spawnRate) {
          spawnBubble();
          spawnTimer = 0;
        }

        state.windForce.x *= state.windDecay;
        state.windForce.y *= state.windDecay;

        var newBubbles = [];
        for (var i = 0; i < state.bubbles.length; i++) {
          var bubble = state.bubbles[i];
          var alive = bubble.update(dt);
          bubble.draw(ctx);
          if (alive) {
            newBubbles.push(bubble);
          }
        }
        state.bubbles = newBubbles;

        if (frameCount % 30 === 0) {
          updateStats();
          emitBubblePositions();
        }

        requestAnimationFrame(animate);
      }

      function updateStats() {
        document.getElementById('bubbleCount').textContent = state.bubbles.length;
        document.getElementById('popCount').textContent = state.popCount;
      }

      canvas.addEventListener('click', function(e) {
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;

        for (var i = state.bubbles.length - 1; i >= 0; i--) {
          if (state.bubbles[i].containsPoint(x, y)) {
            state.bubbles[i].pop('user');
            return;
          }
        }
        spawnBubble(x, y);
      });

      canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var touch = e.touches[0];
        var x = touch.clientX - rect.left;
        var y = touch.clientY - rect.top;

        for (var i = state.bubbles.length - 1; i >= 0; i--) {
          if (state.bubbles[i].containsPoint(x, y)) {
            state.bubbles[i].pop('user');
            return;
          }
        }
        spawnBubble(x, y);
      });

      document.getElementById('addBubble').addEventListener('click', function(e) {
        e.stopPropagation();
        spawnBubble();
      });

      document.getElementById('toggleAudio').addEventListener('click', function(e) {
        e.stopPropagation();
        state.audioEnabled = !state.audioEnabled;
        e.target.textContent = state.audioEnabled ? '🔊 Audio' : '🔇 Audio';
      });

      document.getElementById('blowWind').addEventListener('click', function(e) {
        e.stopPropagation();
        state.windForce.x = (Math.random() - 0.5) * 10;
        state.windForce.y = (Math.random() - 0.5) * 5;
      });

      function emitBubblePositions() {
        var positions = [];
        for (var i = 0; i < state.bubbles.length; i++) {
          if (!state.bubbles[i].popping) {
            positions.push(state.bubbles[i].getData());
          }
        }
        safeEmit('bubbles.positions', positions);

        if (API && API.emit) {
          try {
            API.emit('bubble-state', {
              count: state.bubbles.length,
              popped: state.popCount,
              positions: positions
            }, 'canvas');
          } catch(e) {}
        }
      }

      function handleExternalPop(data) {
        if (!data) return;
        var x = data.x;
        var y = data.y;
        var radius = data.radius || 30;
        for (var i = 0; i < state.bubbles.length; i++) {
          var bubble = state.bubbles[i];
          var dx = bubble.x - x;
          var dy = bubble.y - y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius + bubble.size) {
            bubble.pop(data.source || 'external');
          }
        }
      }

      function handleExternalSpawn(data) {
        if (!data) return;
        spawnBubble(data.x, data.y, data.size);
      }

      function handleConfig(config) {
        if (!config) return;
        if (config.maxBubbles !== undefined) state.maxBubbles = config.maxBubbles;
        if (config.spawnRate !== undefined) state.spawnRate = config.spawnRate;
        if (config.gravity !== undefined) state.gravity = config.gravity;
        if (config.audioEnabled !== undefined) state.audioEnabled = config.audioEnabled;
      }

      function initWidget() {
        if (!API) {
          setTimeout(initWidget, 100);
          return;
        }

        API.onMount(function(context) {
          var savedState = context.state || {};
          if (savedState.maxBubbles) state.maxBubbles = savedState.maxBubbles;
          if (savedState.spawnRate) state.spawnRate = savedState.spawnRate;
          if (savedState.audioEnabled !== undefined) state.audioEnabled = savedState.audioEnabled;

          safeLog('Bubbles widget mounted');
          requestAnimationFrame(animate);
        });

        API.onInput('bubbles.pop', handleExternalPop);
        API.onInput('bubbles.spawn', handleExternalSpawn);
        API.onInput('bubbles.config', handleConfig);
        API.onInput('hunter-attack', handleExternalPop);

        API.onStateChange(function(newState) {
          if (newState.maxBubbles !== undefined) state.maxBubbles = newState.maxBubbles;
          if (newState.spawnRate !== undefined) state.spawnRate = newState.spawnRate;
          if (newState.audioEnabled !== undefined) state.audioEnabled = newState.audioEnabled;
        });
      }

      initWidget();

      // Fallback: start animation anyway after a delay if API takes too long
      setTimeout(function() {
        if (state.bubbles.length === 0) {
          requestAnimationFrame(animate);
        }
      }, 1000);
    })();
  </script>
</body>
</html>
`;

export const BubblesWidget: BuiltinWidget = {
  manifest: BubblesWidgetManifest,
  html: BubblesWidgetHTML,
};
