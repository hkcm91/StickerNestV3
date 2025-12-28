/**
 * StickerNest v2 - Bubble Hunter Widget
 *
 * A cute flying computer character that chases and pops bubbles!
 * Designed to work with the Bubbles widget for interactive gameplay.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const BubbleHunterWidgetManifest: WidgetManifest = {
  id: 'stickernest.bubble-hunter',
  name: 'Bubble Hunter',
  version: '1.0.0',
  kind: 'character',
  entry: 'index.html',
  description: 'A cute flying computer character that chases and pops bubbles!',
  author: 'StickerNest',
  tags: ['character', 'interactive', 'animation', 'game', 'companion'],
  inputs: {
    'bubble-positions': {
      type: 'array',
      description: 'Array of bubble positions to target',
    },
    'bubble-state': {
      type: 'object',
      description: 'Current state from bubbles widget',
    },
    'set-mode': {
      type: 'string',
      description: 'Set hunter behavior mode (hunt, wander, follow)',
    },
    'set-speed': {
      type: 'number',
      description: 'Adjust hunter movement speed',
    },
    'set-target': {
      type: 'object',
      description: 'Set direct target position {x, y} for external AI control',
    },
    'set-expression': {
      type: 'string',
      description: 'Set facial expression (happy, excited, hunting, celebrating, tired)',
    },
  },
  outputs: {
    'hunter-attack': {
      type: 'object',
      description: 'Emitted when hunter tries to pop a bubble',
    },
    'hunter-position': {
      type: 'object',
      description: 'Current position of the hunter',
    },
    'hunter-mood': {
      type: 'string',
      description: 'Current emotional state of the hunter',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['bubbles.positions', 'bubble-state', 'hunter.setMode', 'hunter.setSpeed', 'hunter.setTarget', 'hunter.setExpression'],
    outputs: ['hunter-attack', 'hunter.position', 'hunter.mood'],
  },
  size: {
    width: 800,
    height: 600,
    minWidth: 300,
    minHeight: 200,
  },
};

export const BubbleHunterWidgetHTML = `
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
      background: rgba(100, 200, 255, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(100, 200, 255, 0.5);
      border-radius: 20px;
      padding: 6px 12px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .control-btn:hover {
      background: rgba(100, 200, 255, 0.5);
      transform: scale(1.05);
    }
    .control-btn.active {
      background: rgba(100, 255, 150, 0.4);
      border-color: rgba(100, 255, 150, 0.6);
    }
    .stats {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      font-size: 11px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #canvas-container:hover .stats { opacity: 1; }
    .mood-indicator {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 24px;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #canvas-container:hover .mood-indicator { opacity: 1; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="hunterCanvas"></canvas>
    <div class="mood-indicator" id="moodEmoji">😊</div>
    <div class="controls">
      <button class="control-btn active" id="modeHunt">🎯 Hunt</button>
      <button class="control-btn" id="modeWander">🌀 Wander</button>
      <button class="control-btn" id="modeFollow">👆 Follow</button>
      <button class="control-btn" id="toggleSound">🔊</button>
    </div>
    <div class="stats">
      Popped: <span id="poppedCount">0</span> |
      Mood: <span id="moodText">Happy</span>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const canvas = document.getElementById('hunterCanvas');
      const ctx = canvas.getContext('2d');

      const state = {
        hunter: null,
        bubblePositions: [],
        mode: 'hunt',
        speed: 3,
        aggressiveness: 0.7,
        soundEnabled: true,
        poppedCount: 0,
        mousePos: { x: 0, y: 0 }
      };

      let audioCtx = null;

      function initAudio() {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
      }

      function playSound(type) {
        if (!state.soundEnabled) return;
        try {
          const ctx = initAudio();
          if (ctx.state === 'suspended') ctx.resume();

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          switch (type) {
            case 'attack':
              osc.type = 'square';
              osc.frequency.setValueAtTime(400, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
              osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              break;
            case 'success':
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523, ctx.currentTime);
              osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
              osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
              gain.gain.setValueAtTime(0.2, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc.stop(ctx.currentTime + 0.3);
              break;
            case 'excited':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
              osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
              break;
          }

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          if (type !== 'success') {
            osc.stop(ctx.currentTime + 0.15);
          }
        } catch (e) {
          console.warn('Audio error:', e);
        }
      }

      class Hunter {
        constructor() {
          this.x = canvas.width / 2;
          this.y = canvas.height / 2;
          this.vx = 0;
          this.vy = 0;
          this.targetX = this.x;
          this.targetY = this.y;
          this.width = 60;
          this.height = 50;
          this.bobPhase = 0;
          this.tilt = 0;
          this.propellerAngle = 0;
          this.blinkTimer = 0;
          this.isBlinking = false;
          this.mood = 'happy';
          this.moodTimer = 0;
          this.expression = { eyeScale: 1, mouthType: 'smile' };
          this.trail = [];
          this.attackCooldown = 0;
          this.lastPoppedTime = 0;
          this.wanderAngle = Math.random() * Math.PI * 2;
          this.wanderTimer = 0;
        }

        setTarget(x, y) {
          this.targetX = x;
          this.targetY = y;
        }

        update(dt) {
          this.bobPhase += 0.05;
          this.propellerAngle += 0.5;
          this.blinkTimer++;
          this.attackCooldown = Math.max(0, this.attackCooldown - 1);
          this.moodTimer++;
          this.wanderTimer++;

          if (this.blinkTimer > 150 + Math.random() * 100) {
            this.isBlinking = true;
            this.blinkTimer = 0;
          }
          if (this.isBlinking && this.blinkTimer > 5) {
            this.isBlinking = false;
          }

          this.updateBehavior();

          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 10) {
            const speed = state.speed * 0.5;
            this.vx += (dx / dist) * speed * 0.1;
            this.vy += (dy / dist) * speed * 0.1;
          }

          this.vx *= 0.92;
          this.vy *= 0.92;
          this.x += this.vx;
          this.y += this.vy;

          this.tilt = this.vx * 2;
          this.tilt = Math.max(-0.3, Math.min(0.3, this.tilt));

          const margin = 30;
          this.x = Math.max(margin, Math.min(canvas.width - margin, this.x));
          this.y = Math.max(margin, Math.min(canvas.height - margin, this.y));

          if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            this.trail.push({
              x: this.x,
              y: this.y + this.height / 2,
              life: 1,
              size: 3 + Math.random() * 3
            });
          }

          this.trail = this.trail.filter(p => {
            p.life -= 0.03;
            p.y += 0.5;
            return p.life > 0;
          });

          if (this.trail.length > 20) {
            this.trail.shift();
          }

          this.updateMood();
          this.checkAttack();
        }

        updateBehavior() {
          switch (state.mode) {
            case 'hunt': this.huntBehavior(); break;
            case 'wander': this.wanderBehavior(); break;
            case 'follow': this.followBehavior(); break;
          }
        }

        huntBehavior() {
          if (state.bubblePositions.length === 0) {
            this.wanderBehavior();
            return;
          }

          let nearest = null;
          let nearestDist = Infinity;

          for (const bubble of state.bubblePositions) {
            const dx = bubble.x - this.x;
            const dy = bubble.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = bubble;
            }
          }

          if (nearest) {
            const predictX = nearest.x + (nearest.vx || 0) * 10;
            const predictY = nearest.y + (nearest.vy || 0) * 10;
            this.setTarget(predictX, predictY);

            if (nearestDist < 100) {
              this.mood = 'excited';
            } else {
              this.mood = 'hunting';
            }
          }
        }

        wanderBehavior() {
          if (this.wanderTimer > 60 + Math.random() * 60) {
            this.wanderAngle += (Math.random() - 0.5) * 1;
            this.wanderTimer = 0;
          }

          const wanderDist = 100;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;

          const toCenterX = centerX - this.x;
          const toCenterY = centerY - this.y;
          const toCenterDist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);

          if (toCenterDist > 200) {
            this.wanderAngle = Math.atan2(toCenterY, toCenterX);
          }

          this.setTarget(
            this.x + Math.cos(this.wanderAngle) * wanderDist,
            this.y + Math.sin(this.wanderAngle) * wanderDist
          );

          this.mood = 'happy';
        }

        followBehavior() {
          this.setTarget(state.mousePos.x, state.mousePos.y);
          this.mood = 'happy';
        }

        updateMood() {
          if (Date.now() - this.lastPoppedTime < 1000) {
            this.mood = 'celebrating';
          }

          switch (this.mood) {
            case 'happy':
              this.expression = { eyeScale: 1, mouthType: 'smile' };
              break;
            case 'excited':
              this.expression = { eyeScale: 1.3, mouthType: 'open' };
              break;
            case 'hunting':
              this.expression = { eyeScale: 0.8, mouthType: 'determined' };
              break;
            case 'celebrating':
              this.expression = { eyeScale: 1.2, mouthType: 'big-smile' };
              break;
            case 'tired':
              this.expression = { eyeScale: 0.6, mouthType: 'neutral' };
              break;
          }

          updateMoodDisplay(this.mood);

          // Emit mood for connected widgets (like Speech Bubble)
          API.emitOutput('hunter.mood', this.mood);
        }

        checkAttack() {
          if (this.attackCooldown > 0 || state.mode !== 'hunt') return;

          for (const bubble of state.bubblePositions) {
            const dx = bubble.x - this.x;
            const dy = bubble.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const attackRange = 30 + (bubble.size || 20);

            if (dist < attackRange) {
              this.attack(bubble);
              break;
            }
          }
        }

        attack(bubble) {
          this.attackCooldown = 30;
          playSound('attack');

          API.emitOutput('hunter-attack', {
            x: bubble.x,
            y: bubble.y,
            radius: 40,
            source: 'bubble-hunter',
            bubbleId: bubble.id
          });

          state.poppedCount++;
          this.lastPoppedTime = Date.now();
          this.mood = 'celebrating';

          updateStats();

          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.trail.push({
              x: this.x + Math.cos(angle) * 20,
              y: this.y + Math.sin(angle) * 20,
              life: 1,
              size: 5,
              color: 'hsl(' + (Math.random() * 60 + 40) + ', 80%, 60%)'
            });
          }

          setTimeout(() => playSound('success'), 100);
        }

        draw(ctx) {
          ctx.save();

          this.trail.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color || 'rgba(100, 200, 255, ' + (p.life * 0.5) + ')';
            ctx.fill();
          });

          const bobY = Math.sin(this.bobPhase) * 3;
          ctx.translate(this.x, this.y + bobY);
          ctx.rotate(this.tilt);

          ctx.beginPath();
          ctx.ellipse(0, this.height / 2 + 10, this.width / 2, 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fill();

          ctx.save();
          ctx.translate(0, -this.height / 2 - 5);

          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#666';
          ctx.fill();

          ctx.rotate(this.propellerAngle);
          ctx.fillStyle = '#888';
          for (let i = 0; i < 2; i++) {
            ctx.save();
            ctx.rotate(i * Math.PI);
            ctx.beginPath();
            ctx.ellipse(12, 0, 15, 4, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();

          const w = this.width;
          const h = this.height;

          ctx.fillStyle = '#444';
          ctx.beginPath();
          ctx.roundRect(-w/2 - 3, -h/2 + 5, w + 6, h - 5, 5);
          ctx.fill();

          const bodyGrad = ctx.createLinearGradient(0, -h/2, 0, h/2);
          bodyGrad.addColorStop(0, '#e8e0d0');
          bodyGrad.addColorStop(0.5, '#d4ccc0');
          bodyGrad.addColorStop(1, '#b8b0a0');

          ctx.fillStyle = bodyGrad;
          ctx.beginPath();
          ctx.roundRect(-w/2, -h/2, w, h, 8);
          ctx.fill();

          ctx.strokeStyle = '#999';
          ctx.lineWidth = 2;
          ctx.stroke();

          const screenW = w - 14;
          const screenH = h - 18;
          const screenX = -screenW/2;
          const screenY = -screenH/2 - 2;

          ctx.fillStyle = '#333';
          ctx.beginPath();
          ctx.roundRect(screenX - 3, screenY - 3, screenW + 6, screenH + 6, 4);
          ctx.fill();

          const screenGrad = ctx.createRadialGradient(0, screenY + screenH/2, 0, 0, screenY + screenH/2, screenW);
          screenGrad.addColorStop(0, '#4a9');
          screenGrad.addColorStop(0.7, '#396');
          screenGrad.addColorStop(1, '#284');

          ctx.fillStyle = screenGrad;
          ctx.beginPath();
          ctx.roundRect(screenX, screenY, screenW, screenH, 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          for (let i = 0; i < screenH; i += 3) {
            ctx.fillRect(screenX, screenY + i, screenW, 1);
          }

          this.drawFace(ctx, screenX, screenY, screenW, screenH);

          ctx.beginPath();
          ctx.arc(w/2 - 10, h/2 - 8, 3, 0, Math.PI * 2);
          ctx.fillStyle = this.mood === 'celebrating' ? '#5f5' : '#5a5';
          ctx.fill();

          ctx.strokeStyle = '#aaa';
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(-w/2 + 8 + i * 4, h/2 - 6);
            ctx.lineTo(-w/2 + 8 + i * 4, h/2 - 2);
            ctx.stroke();
          }

          this.drawWings(ctx, w, h);

          ctx.restore();
        }

        drawFace(ctx, sx, sy, sw, sh) {
          const centerX = 0;
          const centerY = sy + sh / 2;
          const eyeSpacing = 12;
          const eyeY = centerY - 4;
          const eyeSize = 6 * this.expression.eyeScale;

          if (!this.isBlinking) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(-eyeSpacing, eyeY, eyeSize, eyeSize * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(eyeSpacing, eyeY, eyeSize, eyeSize * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();

            const lookX = (this.targetX - this.x) * 0.02;
            const lookY = (this.targetY - this.y) * 0.02;
            const maxLook = 3;
            const pupilX = Math.max(-maxLook, Math.min(maxLook, lookX));
            const pupilY = Math.max(-maxLook, Math.min(maxLook, lookY));

            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(-eyeSpacing + pupilX, eyeY + pupilY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpacing + pupilX, eyeY + pupilY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-eyeSpacing - 1 + pupilX, eyeY - 2 + pupilY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpacing - 1 + pupilX, eyeY - 2 + pupilY, 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(-eyeSpacing, eyeY, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(eyeSpacing, eyeY, 5, 0.2, Math.PI - 0.2);
            ctx.stroke();
          }

          const mouthY = centerY + 8;
          ctx.strokeStyle = '#fff';
          ctx.fillStyle = '#fff';
          ctx.lineWidth = 2;

          switch (this.expression.mouthType) {
            case 'smile':
              ctx.beginPath();
              ctx.arc(0, mouthY - 2, 8, 0.3, Math.PI - 0.3);
              ctx.stroke();
              break;
            case 'big-smile':
              ctx.beginPath();
              ctx.arc(0, mouthY - 4, 10, 0.2, Math.PI - 0.2);
              ctx.stroke();
              ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
              ctx.beginPath();
              ctx.ellipse(-20, centerY + 2, 5, 3, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(20, centerY + 2, 5, 3, 0, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'open':
              ctx.beginPath();
              ctx.ellipse(0, mouthY, 6, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              break;
            case 'determined':
              ctx.beginPath();
              ctx.moveTo(-6, mouthY);
              ctx.lineTo(6, mouthY);
              ctx.stroke();
              break;
            case 'neutral':
              ctx.beginPath();
              ctx.moveTo(-5, mouthY);
              ctx.lineTo(5, mouthY);
              ctx.stroke();
              break;
          }

          if (this.mood === 'hunting' || this.mood === 'excited') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;

            if (this.mood === 'hunting') {
              ctx.beginPath();
              ctx.moveTo(-eyeSpacing - 5, eyeY - 10);
              ctx.lineTo(-eyeSpacing + 5, eyeY - 8);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(eyeSpacing + 5, eyeY - 10);
              ctx.lineTo(eyeSpacing - 5, eyeY - 8);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.moveTo(-eyeSpacing - 5, eyeY - 12);
              ctx.lineTo(-eyeSpacing + 5, eyeY - 11);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(eyeSpacing - 5, eyeY - 11);
              ctx.lineTo(eyeSpacing + 5, eyeY - 12);
              ctx.stroke();
            }
          }
        }

        drawWings(ctx, w, h) {
          const wingFlap = Math.sin(this.bobPhase * 3) * 0.2;

          ctx.save();
          ctx.translate(-w/2 - 2, 0);
          ctx.rotate(-0.3 + wingFlap);

          ctx.fillStyle = 'rgba(150, 220, 255, 0.6)';
          ctx.strokeStyle = 'rgba(100, 180, 220, 0.8)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.ellipse(-12, 0, 15, 8, -0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(-5, 0);
          ctx.lineTo(-20, -2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-5, 2);
          ctx.lineTo(-18, 3);
          ctx.stroke();

          ctx.restore();

          ctx.save();
          ctx.translate(w/2 + 2, 0);
          ctx.rotate(0.3 - wingFlap);

          ctx.fillStyle = 'rgba(150, 220, 255, 0.6)';
          ctx.strokeStyle = 'rgba(100, 180, 220, 0.8)';
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.ellipse(12, 0, 15, 8, 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(20, -2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(5, 2);
          ctx.lineTo(18, 3);
          ctx.stroke();

          ctx.restore();
        }
      }

      function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = container.clientWidth + 'px';
        canvas.style.height = container.clientHeight + 'px';
      }

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      function updateStats() {
        document.getElementById('poppedCount').textContent = state.poppedCount;
      }

      function updateMoodDisplay(mood) {
        const moodEmojis = {
          happy: '😊',
          excited: '😃',
          hunting: '😤',
          celebrating: '🎉',
          tired: '😴'
        };

        document.getElementById('moodEmoji').textContent = moodEmojis[mood] || '😊';
        document.getElementById('moodText').textContent = mood.charAt(0).toUpperCase() + mood.slice(1);
      }

      function setMode(mode) {
        state.mode = mode;

        document.querySelectorAll('.control-btn').forEach(btn => {
          btn.classList.remove('active');
        });

        const modeBtn = document.getElementById('mode' + mode.charAt(0).toUpperCase() + mode.slice(1));
        if (modeBtn) modeBtn.classList.add('active');
      }

      let lastTime = 0;

      function animate(time) {
        const dt = time - lastTime;
        lastTime = time;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (state.hunter) {
          state.hunter.update(dt);
          state.hunter.draw(ctx);

          API.emitOutput('hunter.position', {
            x: state.hunter.x,
            y: state.hunter.y
          });
        }

        requestAnimationFrame(animate);
      }

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        state.mousePos.x = e.clientX - rect.left;
        state.mousePos.y = e.clientY - rect.top;
      });

      canvas.addEventListener('click', (e) => {
        if (state.hunter) {
          playSound('excited');
          const rect = canvas.getBoundingClientRect();
          state.hunter.setTarget(
            e.clientX - rect.left,
            e.clientY - rect.top
          );
          state.hunter.vx += (state.hunter.targetX - state.hunter.x) * 0.05;
          state.hunter.vy += (state.hunter.targetY - state.hunter.y) * 0.05;
        }
      });

      document.getElementById('modeHunt').addEventListener('click', (e) => {
        e.stopPropagation();
        setMode('hunt');
      });

      document.getElementById('modeWander').addEventListener('click', (e) => {
        e.stopPropagation();
        setMode('wander');
      });

      document.getElementById('modeFollow').addEventListener('click', (e) => {
        e.stopPropagation();
        setMode('follow');
      });

      document.getElementById('toggleSound').addEventListener('click', (e) => {
        e.stopPropagation();
        state.soundEnabled = !state.soundEnabled;
        e.target.textContent = state.soundEnabled ? '🔊' : '🔇';
      });

      function handleBubblePositions(data) {
        if (Array.isArray(data)) {
          state.bubblePositions = data;
        } else if (data && data.positions) {
          state.bubblePositions = data.positions;
        }
      }

      function handleSetMode(mode) {
        if (['hunt', 'wander', 'follow'].includes(mode)) {
          setMode(mode);
        }
      }

      function handleSetSpeed(speed) {
        state.speed = Math.max(1, Math.min(10, speed));
      }

      function handleSetTarget(target) {
        if (target && typeof target.x === 'number' && typeof target.y === 'number') {
          if (state.hunter) {
            state.hunter.setTarget(target.x, target.y);
            // Give a small velocity boost towards the target
            const dx = target.x - state.hunter.x;
            const dy = target.y - state.hunter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
              state.hunter.vx += (dx / dist) * state.speed * 0.3;
              state.hunter.vy += (dy / dist) * state.speed * 0.3;
            }
          }
        }
      }

      function handleSetExpression(mood) {
        if (state.hunter && ['happy', 'excited', 'hunting', 'celebrating', 'tired'].includes(mood)) {
          state.hunter.mood = mood;
          state.hunter.updateMood();
        }
      }

      API.onMount(function(context) {
        state.hunter = new Hunter();

        const savedState = context.state || {};
        if (savedState.mode) setMode(savedState.mode);
        if (savedState.speed) state.speed = savedState.speed;
        if (savedState.soundEnabled !== undefined) state.soundEnabled = savedState.soundEnabled;

        API.log('Bubble Hunter initialized and ready to pop!');
        requestAnimationFrame(animate);
      });

      API.onInput('bubbles.positions', handleBubblePositions);
      API.onInput('bubble-state', handleBubblePositions);
      API.onInput('hunter.setMode', handleSetMode);
      API.onInput('hunter.setSpeed', handleSetSpeed);
      API.onInput('hunter.setTarget', handleSetTarget);
      API.onInput('hunter.setExpression', handleSetExpression);

      API.onStateChange(function(newState) {
        if (newState.mode) setMode(newState.mode);
        if (newState.speed) state.speed = newState.speed;
        if (newState.soundEnabled !== undefined) state.soundEnabled = newState.soundEnabled;
      });
    })();
  </script>
</body>
</html>
`;

export const BubbleHunterWidget: BuiltinWidget = {
  manifest: BubbleHunterWidgetManifest,
  html: BubbleHunterWidgetHTML,
};
