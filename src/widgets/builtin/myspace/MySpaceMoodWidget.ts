/**
 * StickerNest v2 - MySpace Mood Widget (2006 Theme)
 * ===================================================
 *
 * The classic MySpace mood indicator - remember setting your mood
 * to "emo" or "chipper" with little emoticons? This widget brings
 * that nostalgic feature back with authentic 2006 styling.
 *
 * ## Features
 * - Current mood display with emoticon
 * - Mood selector dropdown
 * - "What are you doing right now?" status
 * - Last updated timestamp
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceMoodWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-mood',
  name: 'MySpace Mood',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 mood indicator with emoticons.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'mood', 'status', 'retro', '2006', 'nostalgia', 'emoticon'],
  category: 'myspace',
  inputs: {
    mood: {
      type: 'string',
      description: 'Current mood (e.g., "happy", "emo", "tired")',
      default: 'happy',
    },
    status: {
      type: 'string',
      description: 'Status message',
      default: '',
    },
  },
  outputs: {
    moodChanged: {
      type: 'object',
      description: 'Emitted when mood is changed { mood, emoticon }',
    },
    statusChanged: {
      type: 'object',
      description: 'Emitted when status is changed { status }',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['mood.set', 'status.set', 'data.set'],
    outputs: ['mood.changed', 'status.changed'],
  },
  events: {
    listens: ['social:mood-changed'],
    emits: ['social:mood-update'],
  },
  size: {
    width: 280,
    height: 180,
    minWidth: 220,
    minHeight: 150,
    scaleMode: 'stretch',
  },
};

export const MySpaceMoodWidgetHTML = `
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
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10px;
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .mood-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .mood-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .mood-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFCC00;
    }

    .mood-content {
      flex: 1;
      padding: 12px;
      display: flex;
      flex-direction: column;
    }

    .mood-display {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #99CCFF;
    }

    .mood-emoticon {
      font-size: 36px;
      line-height: 1;
    }

    .mood-info {
      flex: 1;
    }

    .mood-label {
      color: #666666;
      font-size: 9px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .mood-text {
      color: #003366;
      font-size: 14px;
      font-weight: bold;
    }

    .mood-selector {
      margin-bottom: 10px;
    }

    .mood-select {
      width: 100%;
      padding: 4px 6px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
      background: #FFFFFF;
      color: #333333;
      cursor: pointer;
    }

    .mood-select:focus {
      outline: none;
      border-color: #336699;
    }

    .status-section {
      flex: 1;
    }

    .status-label {
      color: #666666;
      font-size: 9px;
      margin-bottom: 4px;
    }

    .status-input {
      width: 100%;
      padding: 6px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 10px;
      border: 1px solid #99CCFF;
      resize: none;
      height: 40px;
    }

    .status-input:focus {
      outline: none;
      border-color: #336699;
    }

    .status-input::placeholder {
      color: #999999;
      font-style: italic;
    }

    .mood-footer {
      padding: 6px 8px;
      background: #E8F4F8;
      border-top: 1px solid #99CCFF;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .last-updated {
      color: #666666;
      font-size: 9px;
    }

    .update-btn {
      padding: 3px 10px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
      background: linear-gradient(180deg, #336699 0%, #003366 100%);
      color: #FFFFFF;
      border: 1px solid #336699;
      cursor: pointer;
    }

    .update-btn:hover {
      background: linear-gradient(180deg, #003366 0%, #002244 100%);
    }

    /* Mood-specific colors */
    .mood-happy { color: #FFD700; }
    .mood-sad { color: #6495ED; }
    .mood-angry { color: #FF4500; }
    .mood-excited { color: #FF69B4; }
    .mood-tired { color: #808080; }
    .mood-emo { color: #000000; }
    .mood-loved { color: #FF1493; }
    .mood-bored { color: #A0A0A0; }
    .mood-creative { color: #9932CC; }
    .mood-crazy { color: #00FF00; }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="mood-box">
      <div class="mood-header">
        <svg class="mood-header-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path fill="#003366" d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <circle fill="#003366" cx="9" cy="10" r="1.5"/>
          <circle fill="#003366" cx="15" cy="10" r="1.5"/>
        </svg>
        <span id="headerTitle">Tom's Mood</span>
      </div>

      <div class="mood-content">
        <div class="mood-display">
          <span class="mood-emoticon" id="moodEmoticon">:D</span>
          <div class="mood-info">
            <div class="mood-label">Current Mood:</div>
            <div class="mood-text" id="moodText">happy</div>
          </div>
        </div>

        <div class="mood-selector">
          <select class="mood-select" id="moodSelect">
            <option value="happy">:D happy</option>
            <option value="sad">:( sad</option>
            <option value="angry">>:( angry</option>
            <option value="excited">:D! excited</option>
            <option value="tired">-_- tired</option>
            <option value="emo">T_T emo</option>
            <option value="loved">&lt;3 loved</option>
            <option value="bored">:| bored</option>
            <option value="creative">*_* creative</option>
            <option value="crazy">XD crazy</option>
            <option value="chipper">^_^ chipper</option>
            <option value="mischievous">;) mischievous</option>
            <option value="confused">:S confused</option>
            <option value="hungry">:P hungry</option>
            <option value="sleepy">(_ _) Zzz sleepy</option>
          </select>
        </div>

        <div class="status-section">
          <div class="status-label">What are you doing right now?</div>
          <textarea class="status-input" id="statusInput" placeholder="listening to music, browsing profiles..."></textarea>
        </div>
      </div>

      <div class="mood-footer">
        <span class="last-updated" id="lastUpdated">Updated: just now</span>
        <button class="update-btn" id="updateBtn">Update</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Mood emoticons mapping
      const MOODS = {
        happy: { emoticon: ':D', color: '#FFD700' },
        sad: { emoticon: ':(', color: '#6495ED' },
        angry: { emoticon: '>:(', color: '#FF4500' },
        excited: { emoticon: ':D!', color: '#FF69B4' },
        tired: { emoticon: '-_-', color: '#808080' },
        emo: { emoticon: 'T_T', color: '#000000' },
        loved: { emoticon: '<3', color: '#FF1493' },
        bored: { emoticon: ':|', color: '#A0A0A0' },
        creative: { emoticon: '*_*', color: '#9932CC' },
        crazy: { emoticon: 'XD', color: '#00FF00' },
        chipper: { emoticon: '^_^', color: '#FFA500' },
        mischievous: { emoticon: ';)', color: '#8B4513' },
        confused: { emoticon: ':S', color: '#4682B4' },
        hungry: { emoticon: ':P', color: '#DAA520' },
        sleepy: { emoticon: '(_ _) Zzz', color: '#483D8B' }
      };

      // State
      let state = {
        username: 'Tom',
        mood: 'happy',
        status: '',
        lastUpdated: 'just now'
      };

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const moodEmoticon = document.getElementById('moodEmoticon');
      const moodText = document.getElementById('moodText');
      const moodSelect = document.getElementById('moodSelect');
      const statusInput = document.getElementById('statusInput');
      const lastUpdated = document.getElementById('lastUpdated');
      const updateBtn = document.getElementById('updateBtn');

      // Render mood
      function render() {
        headerTitle.textContent = state.username + "'s Mood";

        const moodData = MOODS[state.mood] || MOODS.happy;
        moodEmoticon.textContent = moodData.emoticon;
        moodEmoticon.style.color = moodData.color;
        moodText.textContent = state.mood;

        moodSelect.value = state.mood;
        statusInput.value = state.status || '';
        lastUpdated.textContent = 'Updated: ' + state.lastUpdated;
      }

      // Get timestamp
      function getTimestamp() {
        const now = new Date();
        const hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return hour12 + ':' + mins + ' ' + ampm;
      }

      // Handle mood change
      moodSelect.addEventListener('change', function() {
        state.mood = this.value;
        state.lastUpdated = getTimestamp();
        render();

        const moodData = MOODS[state.mood] || MOODS.happy;
        API.emitOutput('mood.changed', {
          mood: state.mood,
          emoticon: moodData.emoticon
        });

        API.emit('social:mood-update', {
          mood: state.mood,
          emoticon: moodData.emoticon
        });

        API.setState({ mood: state.mood, lastUpdated: state.lastUpdated });
      });

      // Handle update button
      updateBtn.addEventListener('click', function() {
        state.status = statusInput.value.trim();
        state.lastUpdated = getTimestamp();
        render();

        API.emitOutput('status.changed', { status: state.status });
        API.setState({ status: state.status, lastUpdated: state.lastUpdated });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceMoodWidget mounted');
      });

      // Handle mood.set input
      API.onInput('mood.set', function(mood) {
        if (MOODS[mood]) {
          state.mood = mood;
          state.lastUpdated = getTimestamp();
          render();
          API.setState({ mood: state.mood, lastUpdated: state.lastUpdated });
        }
      });

      // Handle status.set input
      API.onInput('status.set', function(status) {
        state.status = status;
        state.lastUpdated = getTimestamp();
        render();
        API.setState({ status: state.status, lastUpdated: state.lastUpdated });
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.mood = data.mood || state.mood;
          state.status = data.status || state.status;
          state.lastUpdated = data.lastUpdated || state.lastUpdated;
        }
        render();
        API.setState(state);
      });

      // Listen for mood changes from elsewhere
      API.on('social:mood-changed', function(payload) {
        if (payload.userId === state.userId) {
          state.mood = payload.mood;
          state.lastUpdated = getTimestamp();
          render();
        }
      });

      API.onDestroy(function() {
        API.log('MySpaceMoodWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceMoodWidget: BuiltinWidget = {
  manifest: MySpaceMoodWidgetManifest,
  html: MySpaceMoodWidgetHTML,
};
