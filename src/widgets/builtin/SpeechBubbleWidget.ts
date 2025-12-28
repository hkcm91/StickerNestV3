/**
 * StickerNest v2 - Speech Bubble Widget
 *
 * A comic-style speech/thought bubble that displays text.
 * Can follow the Bubble Hunter and display mood-based messages!
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const SpeechBubbleWidgetManifest: WidgetManifest = {
  id: 'stickernest.speech-bubble',
  name: 'Speech Bubble',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'A comic-style speech bubble that displays text with animations',
  author: 'StickerNest',
  tags: ['speech', 'text', 'bubble', 'comic', 'dialogue', 'character'],
  inputs: {
    'set-text': {
      type: 'string',
      description: 'Set the text to display in the bubble',
    },
    'set-style': {
      type: 'string',
      description: 'Set bubble style (speech, thought, exclaim, whisper)',
    },
    'hunter-mood': {
      type: 'string',
      description: 'Receive hunter mood to auto-generate text',
    },
    'hunter-position': {
      type: 'object',
      description: 'Position to follow (from Hunter widget)',
    },
    'show': {
      type: 'boolean',
      description: 'Show or hide the bubble',
    },
  },
  outputs: {
    'text-displayed': {
      type: 'string',
      description: 'Emitted when text finishes typing',
    },
    'bubble-clicked': {
      type: 'object',
      description: 'Emitted when bubble is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['speech.setText', 'speech.setStyle', 'hunter.mood', 'hunter.position', 'speech.show'],
    outputs: ['speech.textDisplayed', 'speech.clicked'],
  },
  size: {
    width: 250,
    height: 150,
    minWidth: 120,
    minHeight: 80,
  },
};

export const SpeechBubbleWidgetHTML = `
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
      font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
    }
    .bubble-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, transform 0.3s;
    }
    .bubble-wrapper.hidden {
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }
    .bubble {
      position: relative;
      background: white;
      border: 3px solid #333;
      border-radius: 20px;
      padding: 15px 20px;
      max-width: 100%;
      max-height: 100%;
      overflow: hidden;
      box-shadow: 4px 4px 0 rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    .bubble:hover {
      transform: translateY(-2px);
      box-shadow: 6px 6px 0 rgba(0,0,0,0.15);
    }
    .bubble:active {
      transform: translateY(0);
      box-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }

    /* Speech bubble tail */
    .bubble.speech::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 30px;
      border: 10px solid transparent;
      border-top-color: white;
      border-bottom: 0;
    }
    .bubble.speech::before {
      content: '';
      position: absolute;
      bottom: -24px;
      left: 27px;
      border: 13px solid transparent;
      border-top-color: #333;
      border-bottom: 0;
      z-index: -1;
    }

    /* Thought bubble (cloud style) */
    .bubble.thought {
      border-radius: 50% / 40%;
    }
    .bubble.thought::after,
    .bubble.thought::before {
      content: '';
      position: absolute;
      background: white;
      border: 3px solid #333;
      border-radius: 50%;
    }
    .bubble.thought::after {
      width: 20px;
      height: 20px;
      bottom: -15px;
      left: 25px;
    }
    .bubble.thought::before {
      width: 12px;
      height: 12px;
      bottom: -28px;
      left: 20px;
    }

    /* Exclamation bubble (spiky) */
    .bubble.exclaim {
      background: #fff7cc;
      border-color: #cc8800;
      border-width: 4px;
      animation: pulse 0.5s ease-in-out infinite alternate;
    }
    @keyframes pulse {
      from { transform: scale(1); }
      to { transform: scale(1.02); }
    }
    .bubble.exclaim::after {
      content: '';
      position: absolute;
      bottom: -22px;
      left: 25px;
      width: 0;
      height: 0;
      border-left: 15px solid transparent;
      border-right: 15px solid transparent;
      border-top: 25px solid #fff7cc;
    }
    .bubble.exclaim::before {
      content: '';
      position: absolute;
      bottom: -28px;
      left: 22px;
      width: 0;
      height: 0;
      border-left: 18px solid transparent;
      border-right: 18px solid transparent;
      border-top: 30px solid #cc8800;
      z-index: -1;
    }

    /* Whisper bubble (dotted, faint) */
    .bubble.whisper {
      border-style: dashed;
      border-color: #888;
      background: rgba(255,255,255,0.8);
      opacity: 0.85;
    }
    .bubble.whisper::after {
      content: '';
      position: absolute;
      bottom: -15px;
      left: 30px;
      border: 8px solid transparent;
      border-top-color: rgba(255,255,255,0.8);
      border-bottom: 0;
    }

    .text {
      font-size: 16px;
      line-height: 1.4;
      color: #333;
      word-wrap: break-word;
      text-align: center;
    }
    .bubble.whisper .text {
      color: #666;
      font-style: italic;
    }
    .bubble.exclaim .text {
      color: #884400;
      font-weight: bold;
    }

    .cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: #333;
      margin-left: 2px;
      animation: blink 0.7s infinite;
      vertical-align: text-bottom;
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .controls {
      position: absolute;
      bottom: 5px;
      right: 5px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .container:hover .controls {
      opacity: 1;
    }
    .style-btn {
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 4px;
      background: rgba(0,0,0,0.1);
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }
    .style-btn:hover {
      background: rgba(0,0,0,0.2);
    }
    .style-btn.active {
      background: rgba(100, 200, 255, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="bubble-wrapper" id="wrapper">
      <div class="bubble speech" id="bubble">
        <div class="text" id="text"></div>
      </div>
    </div>
    <div class="controls">
      <button class="style-btn active" id="styleSpeech" title="Speech">💬</button>
      <button class="style-btn" id="styleThought" title="Thought">💭</button>
      <button class="style-btn" id="styleExclaim" title="Exclaim">❗</button>
      <button class="style-btn" id="styleWhisper" title="Whisper">🤫</button>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const bubble = document.getElementById('bubble');
      const textEl = document.getElementById('text');
      const wrapper = document.getElementById('wrapper');

      const state = {
        text: '',
        style: 'speech',
        isTyping: false,
        typeIndex: 0,
        typeInterval: null,
        visible: true,
        autoTextEnabled: true,
        lastMood: ''
      };

      // Mood-based auto text messages
      const moodMessages = {
        happy: [
          "La la la~",
          "What a nice day!",
          "I love bubbles!",
          "Wheee!",
          "So happy!"
        ],
        excited: [
          "BUBBLES!!!",
          "There's one!",
          "Gonna get it!",
          "Ooh ooh ooh!",
          "Almost there!"
        ],
        hunting: [
          "Target acquired...",
          "I see you...",
          "Can't escape me!",
          "Locked on!",
          "Here I come!"
        ],
        celebrating: [
          "YESSS!",
          "Got it!",
          "POP!",
          "Woohoo!",
          "Another one!",
          "I'm the best!"
        ],
        tired: [
          "So sleepy...",
          "Need a break...",
          "Zzz...",
          "*yawn*",
          "Too many bubbles..."
        ]
      };

      function setStyle(newStyle) {
        state.style = newStyle;
        bubble.className = 'bubble ' + newStyle;

        // Update style buttons
        document.querySelectorAll('.style-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        const btnId = 'style' + newStyle.charAt(0).toUpperCase() + newStyle.slice(1);
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
      }

      function typeText(text, speed = 50) {
        // Clear any existing typing
        if (state.typeInterval) {
          clearInterval(state.typeInterval);
        }

        state.text = text;
        state.typeIndex = 0;
        state.isTyping = true;
        textEl.innerHTML = '<span class="cursor"></span>';

        state.typeInterval = setInterval(() => {
          if (state.typeIndex < text.length) {
            const char = text[state.typeIndex];
            textEl.innerHTML = text.substring(0, state.typeIndex + 1) + '<span class="cursor"></span>';
            state.typeIndex++;

            // Slow down on punctuation
            if (['.', '!', '?', ','].includes(char)) {
              clearInterval(state.typeInterval);
              setTimeout(() => {
                if (state.isTyping) {
                  state.typeInterval = setInterval(arguments.callee, speed);
                }
              }, 200);
            }
          } else {
            // Done typing
            clearInterval(state.typeInterval);
            state.isTyping = false;
            textEl.innerHTML = text;

            API.emitOutput('speech.textDisplayed', text);
          }
        }, speed);
      }

      function setText(text, instant = false) {
        if (instant) {
          state.text = text;
          textEl.textContent = text;
          state.isTyping = false;
          if (state.typeInterval) {
            clearInterval(state.typeInterval);
          }
        } else {
          typeText(text);
        }

        // Auto-show when text is set
        if (text && !state.visible) {
          setVisible(true);
        }
      }

      function setVisible(visible) {
        state.visible = visible;
        if (visible) {
          wrapper.classList.remove('hidden');
        } else {
          wrapper.classList.add('hidden');
        }
      }

      function handleMoodChange(mood) {
        if (!state.autoTextEnabled) return;
        if (mood === state.lastMood) return;

        state.lastMood = mood;

        const messages = moodMessages[mood];
        if (messages && messages.length > 0) {
          const msg = messages[Math.floor(Math.random() * messages.length)];

          // Set appropriate style for mood
          switch (mood) {
            case 'excited':
            case 'celebrating':
              setStyle('exclaim');
              break;
            case 'hunting':
              setStyle('speech');
              break;
            case 'tired':
              setStyle('whisper');
              break;
            case 'happy':
            default:
              setStyle('thought');
              break;
          }

          setText(msg);

          // Auto-hide after a while for certain moods
          if (['celebrating', 'excited'].includes(mood)) {
            setTimeout(() => {
              if (state.lastMood === mood) {
                // Fade out if still same mood
              }
            }, 3000);
          }
        }
      }

      // Event handlers
      bubble.addEventListener('click', () => {
        API.emitOutput('speech.clicked', {
          text: state.text,
          style: state.style,
          timestamp: Date.now()
        });

        // Toggle auto-text on click
        state.autoTextEnabled = !state.autoTextEnabled;
        if (!state.autoTextEnabled) {
          setText('(Auto text off)', true);
        } else {
          setText('(Auto text on)', true);
        }
      });

      // Style button handlers
      document.getElementById('styleSpeech').addEventListener('click', (e) => {
        e.stopPropagation();
        setStyle('speech');
      });
      document.getElementById('styleThought').addEventListener('click', (e) => {
        e.stopPropagation();
        setStyle('thought');
      });
      document.getElementById('styleExclaim').addEventListener('click', (e) => {
        e.stopPropagation();
        setStyle('exclaim');
      });
      document.getElementById('styleWhisper').addEventListener('click', (e) => {
        e.stopPropagation();
        setStyle('whisper');
      });

      // API input handlers
      API.onInput('speech.setText', (text) => {
        if (typeof text === 'string') {
          state.autoTextEnabled = false; // Manual text disables auto
          setText(text);
        }
      });

      API.onInput('speech.setStyle', (style) => {
        if (['speech', 'thought', 'exclaim', 'whisper'].includes(style)) {
          setStyle(style);
        }
      });

      API.onInput('hunter.mood', handleMoodChange);
      API.onInput('hunter-mood', handleMoodChange);

      API.onInput('speech.show', (show) => {
        setVisible(!!show);
      });

      // Position input (for potential follow behavior)
      API.onInput('hunter.position', (pos) => {
        // Could use this for positioning relative to hunter
        // For now, just log it
      });

      API.onMount((context) => {
        const savedState = context.state || {};
        if (savedState.text) setText(savedState.text, true);
        if (savedState.style) setStyle(savedState.style);
        if (savedState.visible !== undefined) setVisible(savedState.visible);

        // Initial message
        if (!savedState.text) {
          setText("Hi there!", false);
        }

        API.log('Speech Bubble ready to talk!');
      });

      API.onStateChange((newState) => {
        if (newState.text !== undefined) setText(newState.text, true);
        if (newState.style) setStyle(newState.style);
        if (newState.visible !== undefined) setVisible(newState.visible);
      });
    })();
  </script>
</body>
</html>
`;

export const SpeechBubbleWidget: BuiltinWidget = {
  manifest: SpeechBubbleWidgetManifest,
  html: SpeechBubbleWidgetHTML,
};
