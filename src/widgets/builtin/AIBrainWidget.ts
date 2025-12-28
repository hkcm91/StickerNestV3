/**
 * StickerNest v2 - AI Brain Widget
 *
 * An AI controller that can take over the Bubble Hunter!
 * Features multiple personalities, strategic decision making, and visual feedback.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const AIBrainWidgetManifest: WidgetManifest = {
  id: 'stickernest.ai-brain',
  name: 'AI Brain',
  version: '1.0.0',
  kind: 'controller',
  entry: 'index.html',
  description: 'An AI that takes control of the Bubble Hunter with different personalities!',
  author: 'StickerNest',
  tags: ['ai', 'brain', 'controller', 'automation', 'character', 'game'],
  inputs: {
    'bubble-positions': {
      type: 'array',
      description: 'Bubble positions for decision making',
    },
    'hunter-position': {
      type: 'object',
      description: 'Current hunter position',
    },
    'hunter-mood': {
      type: 'string',
      description: 'Current hunter mood state',
    },
    'set-personality': {
      type: 'string',
      description: 'Set AI personality (aggressive, lazy, strategic, playful, zen)',
    },
    'set-active': {
      type: 'boolean',
      description: 'Enable or disable AI control',
    },
  },
  outputs: {
    'set-mode': {
      type: 'string',
      description: 'Mode command for hunter (hunt, wander, follow)',
    },
    'set-speed': {
      type: 'number',
      description: 'Speed command for hunter',
    },
    'set-target': {
      type: 'object',
      description: 'Direct target position command',
    },
    'thought': {
      type: 'string',
      description: 'AI current thought (for speech bubble)',
    },
    'decision': {
      type: 'object',
      description: 'Full decision data for debugging',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['bubbles.positions', 'hunter.position', 'hunter.mood', 'brain.setPersonality', 'brain.setActive'],
    outputs: ['hunter.setMode', 'hunter.setSpeed', 'hunter.setTarget', 'speech.setText', 'brain.decision'],
  },
  size: {
    width: 280,
    height: 350,
    minWidth: 200,
    minHeight: 280,
  },
};

export const AIBrainWidgetHTML = `
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
      font-family: 'Courier New', monospace;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 15px;
      padding: 12px;
      color: #0ff;
      overflow: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0, 255, 255, 0.3);
    }
    .title {
      font-size: 14px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .brain-icon {
      font-size: 18px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    .status {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 10px;
      background: rgba(0, 255, 0, 0.2);
      color: #0f0;
    }
    .status.inactive {
      background: rgba(255, 100, 100, 0.2);
      color: #f66;
    }
    .brain-visual {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      min-height: 120px;
    }
    .brain-svg {
      width: 100px;
      height: 80px;
      position: relative;
    }
    .brain-svg svg {
      width: 100%;
      height: 100%;
    }
    .neural-activity {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .neuron {
      position: absolute;
      width: 6px;
      height: 6px;
      background: #0ff;
      border-radius: 50%;
      opacity: 0;
      animation: fire 0.5s ease-out forwards;
    }
    @keyframes fire {
      0% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(2); }
    }
    .thought-bubble {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(0, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 11px;
      text-align: center;
      min-height: 36px;
      max-width: 100%;
      word-wrap: break-word;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin: 10px 0;
      font-size: 10px;
    }
    .stat {
      background: rgba(0, 0, 0, 0.3);
      padding: 6px 8px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
    }
    .stat-label { color: #888; }
    .stat-value { color: #0ff; }
    .personality-section {
      margin-top: auto;
    }
    .personality-label {
      font-size: 10px;
      color: #888;
      margin-bottom: 6px;
    }
    .personalities {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .personality-btn {
      flex: 1;
      min-width: 50px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 6px;
      color: #0ff;
      font-size: 9px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .personality-btn:hover {
      background: rgba(0, 255, 255, 0.2);
    }
    .personality-btn.active {
      background: rgba(0, 255, 255, 0.3);
      border-color: #0ff;
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }
    .toggle-control {
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .toggle-btn {
      padding: 8px 20px;
      background: linear-gradient(135deg, #0a4 0%, #0c6 100%);
      border: none;
      border-radius: 20px;
      color: white;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .toggle-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 0 15px rgba(0, 200, 100, 0.4);
    }
    .toggle-btn.inactive {
      background: linear-gradient(135deg, #a00 0%, #c33 100%);
    }
    .toggle-btn.inactive:hover {
      box-shadow: 0 0 15px rgba(200, 50, 50, 0.4);
    }
    .decision-indicator {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0f0;
      animation: blink 0.5s infinite;
    }
    .decision-indicator.thinking {
      background: #ff0;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">
        <span class="brain-icon">🧠</span>
        AI Brain
      </div>
      <div class="status" id="status">ACTIVE</div>
    </div>

    <div class="brain-visual">
      <div class="decision-indicator" id="indicator"></div>
      <div class="brain-svg" id="brainSvg">
        <svg viewBox="0 0 100 80">
          <!-- Brain outline -->
          <path d="M50 5 C20 5 10 25 10 40 C10 60 25 75 50 75 C75 75 90 60 90 40 C90 25 80 5 50 5"
                fill="none" stroke="#0ff" stroke-width="2" opacity="0.5"/>
          <!-- Brain folds -->
          <path d="M30 20 Q40 35 30 50" fill="none" stroke="#0ff" stroke-width="1" opacity="0.3"/>
          <path d="M50 15 Q55 40 50 65" fill="none" stroke="#0ff" stroke-width="1" opacity="0.3"/>
          <path d="M70 20 Q60 35 70 50" fill="none" stroke="#0ff" stroke-width="1" opacity="0.3"/>
          <!-- Neural connections -->
          <circle cx="25" cy="35" r="3" fill="#0ff" class="node"/>
          <circle cx="50" cy="25" r="3" fill="#0ff" class="node"/>
          <circle cx="75" cy="35" r="3" fill="#0ff" class="node"/>
          <circle cx="35" cy="55" r="3" fill="#0ff" class="node"/>
          <circle cx="65" cy="55" r="3" fill="#0ff" class="node"/>
          <circle cx="50" cy="45" r="4" fill="#0ff" class="node"/>
        </svg>
        <div class="neural-activity" id="neuralActivity"></div>
      </div>
      <div class="thought-bubble" id="thought">Initializing neural pathways...</div>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">Bubbles:</span>
        <span class="stat-value" id="bubbleCount">0</span>
      </div>
      <div class="stat">
        <span class="stat-label">Speed:</span>
        <span class="stat-value" id="speedValue">5</span>
      </div>
      <div class="stat">
        <span class="stat-label">Mode:</span>
        <span class="stat-value" id="modeValue">hunt</span>
      </div>
      <div class="stat">
        <span class="stat-label">Focus:</span>
        <span class="stat-value" id="focusValue">—</span>
      </div>
    </div>

    <div class="personality-section">
      <div class="personality-label">PERSONALITY MODE</div>
      <div class="personalities">
        <button class="personality-btn active" id="pAggressive">⚔️ Aggro</button>
        <button class="personality-btn" id="pStrategic">♟️ Smart</button>
        <button class="personality-btn" id="pPlayful">🎈 Play</button>
        <button class="personality-btn" id="pLazy">😴 Lazy</button>
        <button class="personality-btn" id="pZen">☯️ Zen</button>
      </div>
    </div>

    <div class="toggle-control">
      <button class="toggle-btn" id="toggleBtn">🎮 TAKE CONTROL</button>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;

      const state = {
        active: false,
        personality: 'aggressive',
        bubblePositions: [],
        hunterPosition: { x: 0, y: 0 },
        hunterMood: 'happy',
        currentTarget: null,
        decisionTimer: null,
        lastDecisionTime: 0,
        stats: {
          decisions: 0,
          modeChanges: 0,
          targetChanges: 0
        }
      };

      // Personality configurations
      const personalities = {
        aggressive: {
          name: 'Aggressive',
          speed: 8,
          decisionDelay: 100,
          mode: 'hunt',
          targetStrategy: 'nearest',
          thoughts: [
            "DESTROY ALL BUBBLES!",
            "No mercy!",
            "Target locked!",
            "Full speed ahead!",
            "They can't escape!"
          ],
          idleThoughts: [
            "Where are they?!",
            "Need more bubbles!",
            "MOAR TARGETS!"
          ]
        },
        strategic: {
          name: 'Strategic',
          speed: 5,
          decisionDelay: 500,
          mode: 'hunt',
          targetStrategy: 'optimal',
          thoughts: [
            "Calculating optimal path...",
            "Efficiency: maximized",
            "Predicted intercept point",
            "Analyzing trajectories",
            "Strategic positioning"
          ],
          idleThoughts: [
            "Awaiting targets...",
            "Scanning perimeter",
            "Systems optimal"
          ]
        },
        playful: {
          name: 'Playful',
          speed: 6,
          decisionDelay: 300,
          mode: 'hunt',
          targetStrategy: 'random',
          thoughts: [
            "Wheee! This is fun!",
            "Catch me if you can!",
            "Boop!",
            "Hehe, got one!",
            "Play time!"
          ],
          idleThoughts: [
            "La la la~",
            "Where's the party?",
            "Bored... wanna play!"
          ]
        },
        lazy: {
          name: 'Lazy',
          speed: 2,
          decisionDelay: 2000,
          mode: 'wander',
          targetStrategy: 'closest-only',
          thoughts: [
            "*yawn* maybe later...",
            "Ugh, so far away...",
            "Can't they come here?",
            "Just five more minutes...",
            "Too much effort..."
          ],
          idleThoughts: [
            "Zzz...",
            "So comfy here...",
            "Wake me up never"
          ]
        },
        zen: {
          name: 'Zen',
          speed: 3,
          decisionDelay: 1000,
          mode: 'wander',
          targetStrategy: 'flow',
          thoughts: [
            "One with the flow...",
            "Balance in all things",
            "The bubble seeks me",
            "Patience brings victory",
            "Om..."
          ],
          idleThoughts: [
            "All is peaceful...",
            "Breathing...",
            "Present moment"
          ]
        }
      };

      // Neural activity visualization
      function fireNeuron() {
        const activity = document.getElementById('neuralActivity');
        const neuron = document.createElement('div');
        neuron.className = 'neuron';
        neuron.style.left = (Math.random() * 80 + 10) + 'px';
        neuron.style.top = (Math.random() * 60 + 10) + 'px';
        activity.appendChild(neuron);
        setTimeout(() => neuron.remove(), 500);
      }

      function updateUI() {
        document.getElementById('status').textContent = state.active ? 'ACTIVE' : 'STANDBY';
        document.getElementById('status').className = 'status' + (state.active ? '' : ' inactive');
        document.getElementById('toggleBtn').textContent = state.active ? '⏹️ RELEASE CONTROL' : '🎮 TAKE CONTROL';
        document.getElementById('toggleBtn').className = 'toggle-btn' + (state.active ? ' inactive' : '');
        document.getElementById('indicator').className = 'decision-indicator' + (state.active ? '' : ' thinking');
      }

      function updateStats() {
        document.getElementById('bubbleCount').textContent = state.bubblePositions.length;
        const p = personalities[state.personality];
        document.getElementById('speedValue').textContent = p.speed;
        document.getElementById('modeValue').textContent = p.mode;
        document.getElementById('focusValue').textContent = state.currentTarget ? '🎯' : '—';
      }

      function setThought(text) {
        document.getElementById('thought').textContent = text;
        // Also emit to speech bubble
        API.emitOutput('speech.setText', text);
      }

      function getRandomThought(type = 'normal') {
        const p = personalities[state.personality];
        const thoughts = type === 'idle' ? p.idleThoughts : p.thoughts;
        return thoughts[Math.floor(Math.random() * thoughts.length)];
      }

      function setPersonality(name) {
        if (!personalities[name]) return;

        state.personality = name;

        // Update buttons
        document.querySelectorAll('.personality-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const btnId = 'p' + name.charAt(0).toUpperCase() + name.slice(1);
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');

        const p = personalities[name];
        setThought('Personality: ' + p.name);

        // Apply personality settings
        if (state.active) {
          API.emitOutput('hunter.setSpeed', p.speed);
          API.emitOutput('hunter.setMode', p.mode);
        }

        updateStats();
        fireNeuron();
        fireNeuron();
      }

      function calculateOptimalTarget() {
        if (state.bubblePositions.length === 0) return null;

        const p = personalities[state.personality];
        const hunter = state.hunterPosition;
        let target = null;

        switch (p.targetStrategy) {
          case 'nearest':
            // Always go for closest
            let minDist = Infinity;
            for (const bubble of state.bubblePositions) {
              const dx = bubble.x - hunter.x;
              const dy = bubble.y - hunter.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                target = bubble;
              }
            }
            break;

          case 'optimal':
            // Consider velocity and predict intercept
            let bestScore = -Infinity;
            for (const bubble of state.bubblePositions) {
              const dx = bubble.x - hunter.x;
              const dy = bubble.y - hunter.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              // Predict where bubble will be
              const predictX = bubble.x + (bubble.vx || 0) * 20;
              const predictY = bubble.y + (bubble.vy || 0) * 20;
              const predictDx = predictX - hunter.x;
              const predictDy = predictY - hunter.y;
              const predictDist = Math.sqrt(predictDx * predictDx + predictDy * predictDy);

              // Score based on predicted distance and size
              const score = (bubble.size || 20) / predictDist * 100;

              if (score > bestScore) {
                bestScore = score;
                target = { ...bubble, x: predictX, y: predictY };
              }
            }
            break;

          case 'random':
            // Pick a random bubble
            target = state.bubblePositions[Math.floor(Math.random() * state.bubblePositions.length)];
            break;

          case 'closest-only':
            // Only target if very close
            for (const bubble of state.bubblePositions) {
              const dx = bubble.x - hunter.x;
              const dy = bubble.y - hunter.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 100) {
                target = bubble;
                break;
              }
            }
            break;

          case 'flow':
            // Move towards bubbles but don't chase aggressively
            if (state.bubblePositions.length > 0) {
              // Calculate center of mass of bubbles
              let cx = 0, cy = 0;
              for (const b of state.bubblePositions) {
                cx += b.x;
                cy += b.y;
              }
              cx /= state.bubblePositions.length;
              cy /= state.bubblePositions.length;
              target = { x: cx, y: cy };
            }
            break;
        }

        return target;
      }

      function makeDecision() {
        if (!state.active) return;

        const now = Date.now();
        const p = personalities[state.personality];

        // Check if enough time has passed
        if (now - state.lastDecisionTime < p.decisionDelay) return;
        state.lastDecisionTime = now;

        // Fire neurons for visual effect
        fireNeuron();
        if (Math.random() < 0.3) fireNeuron();

        state.stats.decisions++;

        const target = calculateOptimalTarget();

        if (target) {
          // We have a target
          if (state.currentTarget !== target.id) {
            state.currentTarget = target.id;
            state.stats.targetChanges++;
            setThought(getRandomThought());
          }

          // Send target command
          API.emitOutput('hunter.setTarget', { x: target.x, y: target.y });

          // Ensure hunt mode for most personalities
          if (p.mode === 'hunt' && state.bubblePositions.length > 0) {
            API.emitOutput('hunter.setMode', 'hunt');
          }
        } else {
          // No target
          state.currentTarget = null;

          // Switch to wander if lazy/zen, or keep hunting
          if (['lazy', 'zen'].includes(state.personality)) {
            API.emitOutput('hunter.setMode', 'wander');
          }

          if (Math.random() < 0.1) {
            setThought(getRandomThought('idle'));
          }
        }

        // Emit decision data
        API.emitOutput('brain.decision', {
          personality: state.personality,
          target: target,
          bubbleCount: state.bubblePositions.length,
          stats: state.stats,
          timestamp: now
        });

        updateStats();
      }

      function toggleActive() {
        state.active = !state.active;

        if (state.active) {
          // Taking control
          const p = personalities[state.personality];
          API.emitOutput('hunter.setSpeed', p.speed);
          API.emitOutput('hunter.setMode', p.mode);
          setThought('Neural link established!');

          // Start decision loop
          state.decisionTimer = setInterval(makeDecision, 50);
        } else {
          // Releasing control
          if (state.decisionTimer) {
            clearInterval(state.decisionTimer);
            state.decisionTimer = null;
          }
          setThought('Control released. Manual mode.');

          // Reset to default
          API.emitOutput('hunter.setSpeed', 5);
          API.emitOutput('hunter.setMode', 'hunt');
        }

        updateUI();
        fireNeuron();
        fireNeuron();
        fireNeuron();
      }

      // Button handlers
      document.getElementById('toggleBtn').addEventListener('click', toggleActive);

      document.getElementById('pAggressive').addEventListener('click', () => setPersonality('aggressive'));
      document.getElementById('pStrategic').addEventListener('click', () => setPersonality('strategic'));
      document.getElementById('pPlayful').addEventListener('click', () => setPersonality('playful'));
      document.getElementById('pLazy').addEventListener('click', () => setPersonality('lazy'));
      document.getElementById('pZen').addEventListener('click', () => setPersonality('zen'));

      // API input handlers
      API.onInput('bubbles.positions', (data) => {
        if (Array.isArray(data)) {
          state.bubblePositions = data;
        } else if (data && data.positions) {
          state.bubblePositions = data.positions;
        }
        updateStats();
      });

      API.onInput('hunter.position', (pos) => {
        if (pos && typeof pos.x === 'number') {
          state.hunterPosition = pos;
        }
      });

      API.onInput('hunter.mood', (mood) => {
        state.hunterMood = mood;
      });

      API.onInput('brain.setPersonality', (p) => {
        if (personalities[p]) {
          setPersonality(p);
        }
      });

      API.onInput('brain.setActive', (active) => {
        if (active !== state.active) {
          toggleActive();
        }
      });

      API.onMount((context) => {
        const savedState = context.state || {};
        if (savedState.personality) setPersonality(savedState.personality);
        if (savedState.active) toggleActive();

        setThought('AI Brain online. Select personality and take control!');
        updateUI();
        updateStats();

        API.log('AI Brain initialized with ' + Object.keys(personalities).length + ' personalities');
      });

      API.onStateChange((newState) => {
        if (newState.personality) setPersonality(newState.personality);
        if (newState.active !== undefined && newState.active !== state.active) {
          toggleActive();
        }
      });

      // Periodic neural activity for visual effect
      setInterval(() => {
        if (state.active && Math.random() < 0.3) {
          fireNeuron();
        }
      }, 200);
    })();
  </script>
</body>
</html>
`;

export const AIBrainWidget: BuiltinWidget = {
  manifest: AIBrainWidgetManifest,
  html: AIBrainWidgetHTML,
};
