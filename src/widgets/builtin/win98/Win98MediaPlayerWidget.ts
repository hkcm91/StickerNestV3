/**
 * Windows 98 Media Player Widget
 *
 * Classic Windows Media Player with transport controls, playlist, and visualization.
 * Features authentic styling with the iconic WMP interface.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const Win98MediaPlayerWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-media-player',
  name: 'Media Player',
  description: 'Windows 98 Media Player',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'media', 'player', 'music', '98', 'retro'],
  inputs: {
    'media.load': { type: 'object', description: 'Load media file' },
    'playlist.set': { type: 'array', description: 'Set playlist' },
    'window.open': { type: 'trigger', description: 'Open window' },
    'window.activate': { type: 'trigger', description: 'Bring to front' },
  },
  outputs: {
    'track.changed': { type: 'object', description: 'Current track changed' },
    'playback.state': { type: 'string', description: 'Playback state' },
    'window.state': { type: 'object', description: 'Window state' },
  },
  capabilities: ['content'],
  io: { inputs: ['media.load', 'playlist.set', 'window.open', 'window.activate'], outputs: ['track.changed', 'playback.state', 'window.state'] },
  events: ['play', 'pause', 'stop', 'next', 'prev'],
  size: { width: 350, height: 280 },
};

export const Win98MediaPlayerWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "MS Sans Serif", "Tahoma", "Arial", sans-serif;
      font-size: 11px;
      background: #c0c0c0;
      overflow: hidden;
      height: 100vh;
    }

    .win98-window {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 2px solid;
      border-color: #dfdfdf #000000 #000000 #dfdfdf;
      box-shadow: inset 1px 1px 0 #ffffff, inset -1px -1px 0 #808080;
      background: #c0c0c0;
    }

    /* Title Bar */
    .title-bar {
      background: linear-gradient(90deg, #000080, #1084d0);
      padding: 2px 3px;
      display: flex;
      align-items: center;
      gap: 3px;
      min-height: 18px;
    }

    .title-bar-icon { font-size: 12px; }

    .title-bar-text {
      color: white;
      font-weight: bold;
      font-size: 11px;
      flex: 1;
    }

    .title-bar-buttons { display: flex; gap: 2px; }

    .title-btn {
      width: 16px;
      height: 14px;
      background: #c0c0c0;
      border: 1px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 8px;
    }

    .title-btn:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    /* Menu Bar */
    .menu-bar {
      background: #c0c0c0;
      display: flex;
      padding: 1px 0;
      border-bottom: 1px solid #808080;
    }

    .menu-item {
      padding: 2px 8px;
      cursor: pointer;
    }

    .menu-item:hover {
      background: #000080;
      color: white;
    }

    /* Visualization Area */
    .viz-area {
      background: #000000;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      margin: 4px;
      overflow: hidden;
    }

    .viz-bars {
      display: flex;
      gap: 2px;
      align-items: flex-end;
      height: 80px;
    }

    .viz-bar {
      width: 6px;
      background: linear-gradient(to top, #00ff00, #ffff00, #ff0000);
      transition: height 0.1s;
    }

    /* Track Info */
    .track-info {
      background: #000080;
      color: #00ff00;
      font-family: "Fixedsys", monospace;
      font-size: 10px;
      padding: 4px 8px;
      margin: 0 4px;
      border: 1px solid #000;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
    }

    .track-marquee {
      display: inline-block;
      animation: marquee 10s linear infinite;
    }

    @keyframes marquee {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }

    /* Seek Bar */
    .seek-container {
      padding: 4px 8px;
    }

    .seek-bar {
      width: 100%;
      height: 16px;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      position: relative;
      cursor: pointer;
    }

    .seek-progress {
      height: 100%;
      background: #000080;
      width: 0%;
    }

    .seek-time {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-top: 2px;
    }

    /* Transport Controls */
    .transport {
      display: flex;
      justify-content: center;
      gap: 2px;
      padding: 4px;
    }

    .transport-btn {
      width: 28px;
      height: 24px;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .transport-btn:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    .transport-btn.active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
      background: #a0a0a0;
    }

    /* Volume */
    .volume-container {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px 4px;
    }

    .volume-label { font-size: 10px; }

    .volume-slider {
      flex: 1;
      height: 16px;
      -webkit-appearance: none;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #808080 #ffffff #ffffff #808080;
    }

    .volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 8px;
      height: 14px;
      background: #c0c0c0;
      border: 1px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      cursor: pointer;
    }

    /* Status Bar */
    .status-bar {
      background: #c0c0c0;
      border-top: 1px solid #ffffff;
      padding: 2px 4px;
      font-size: 11px;
    }

    .status-section {
      border: 1px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      padding: 1px 4px;
    }
  </style>
</head>
<body>
  <div class="win98-window">
    <!-- Title Bar -->
    <div class="title-bar">
      <span class="title-bar-icon">🎬</span>
      <span class="title-bar-text">Windows Media Player</span>
      <div class="title-bar-buttons">
        <button class="title-btn" id="minimizeBtn">🗕</button>
        <button class="title-btn" id="maximizeBtn">🗖</button>
        <button class="title-btn" id="closeBtn">✕</button>
      </div>
    </div>

    <!-- Menu Bar -->
    <div class="menu-bar">
      <div class="menu-item"><u>F</u>ile</div>
      <div class="menu-item"><u>V</u>iew</div>
      <div class="menu-item"><u>P</u>lay</div>
      <div class="menu-item">F<u>a</u>vorites</div>
      <div class="menu-item"><u>G</u>o</div>
      <div class="menu-item"><u>H</u>elp</div>
    </div>

    <!-- Visualization -->
    <div class="viz-area" id="vizArea">
      <div class="viz-bars" id="vizBars">
        <!-- Bars generated by JS -->
      </div>
    </div>

    <!-- Track Info -->
    <div class="track-info">
      <span class="track-marquee" id="trackInfo">Windows Media Player - Ready</span>
    </div>

    <!-- Seek Bar -->
    <div class="seek-container">
      <div class="seek-bar" id="seekBar">
        <div class="seek-progress" id="seekProgress"></div>
      </div>
      <div class="seek-time">
        <span id="currentTime">0:00</span>
        <span id="totalTime">0:00</span>
      </div>
    </div>

    <!-- Transport Controls -->
    <div class="transport">
      <button class="transport-btn" id="prevBtn" title="Previous">⏮️</button>
      <button class="transport-btn" id="stopBtn" title="Stop">⏹️</button>
      <button class="transport-btn" id="playBtn" title="Play">▶️</button>
      <button class="transport-btn" id="pauseBtn" title="Pause">⏸️</button>
      <button class="transport-btn" id="nextBtn" title="Next">⏭️</button>
    </div>

    <!-- Volume -->
    <div class="volume-container">
      <span class="volume-label">🔊</span>
      <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="75">
      <span class="volume-label" id="volumeValue">75%</span>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
      <span class="status-section" id="statusText">Stopped</span>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      const vizBars = document.getElementById('vizBars');
      const trackInfo = document.getElementById('trackInfo');
      const seekProgress = document.getElementById('seekProgress');
      const currentTime = document.getElementById('currentTime');
      const totalTime = document.getElementById('totalTime');
      const statusText = document.getElementById('statusText');
      const volumeSlider = document.getElementById('volumeSlider');
      const volumeValue = document.getElementById('volumeValue');

      let isPlaying = false;
      let currentTrack = null;
      let playlist = [];
      let playlistIndex = 0;
      let progress = 0;
      let duration = 180; // 3 minutes default
      let vizInterval = null;

      // Create visualization bars
      for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'viz-bar';
        bar.style.height = '10px';
        vizBars.appendChild(bar);
      }

      function animateViz() {
        if (!isPlaying) {
          document.querySelectorAll('.viz-bar').forEach(bar => {
            bar.style.height = '4px';
          });
          return;
        }
        document.querySelectorAll('.viz-bar').forEach(bar => {
          const height = Math.random() * 70 + 10;
          bar.style.height = height + 'px';
        });
      }

      function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + secs.toString().padStart(2, '0');
      }

      function updateDisplay() {
        currentTime.textContent = formatTime(progress);
        totalTime.textContent = formatTime(duration);
        seekProgress.style.width = (progress / duration * 100) + '%';
      }

      function play() {
        isPlaying = true;
        document.getElementById('playBtn').classList.add('active');
        document.getElementById('pauseBtn').classList.remove('active');
        statusText.textContent = 'Playing';
        API.emitOutput('playback.state', 'playing');

        if (vizInterval) clearInterval(vizInterval);
        vizInterval = setInterval(animateViz, 100);
      }

      function pause() {
        isPlaying = false;
        document.getElementById('playBtn').classList.remove('active');
        document.getElementById('pauseBtn').classList.add('active');
        statusText.textContent = 'Paused';
        API.emitOutput('playback.state', 'paused');
      }

      function stop() {
        isPlaying = false;
        progress = 0;
        document.getElementById('playBtn').classList.remove('active');
        document.getElementById('pauseBtn').classList.remove('active');
        statusText.textContent = 'Stopped';
        updateDisplay();
        API.emitOutput('playback.state', 'stopped');
        if (vizInterval) clearInterval(vizInterval);
        animateViz();
      }

      function loadTrack(track) {
        currentTrack = track;
        trackInfo.textContent = track.artist ? track.artist + ' - ' + track.title : track.title || track.name;
        duration = track.duration || 180;
        progress = 0;
        updateDisplay();
        API.emitOutput('track.changed', track);
      }

      // Transport controls
      document.getElementById('playBtn').addEventListener('click', play);
      document.getElementById('pauseBtn').addEventListener('click', pause);
      document.getElementById('stopBtn').addEventListener('click', stop);

      document.getElementById('nextBtn').addEventListener('click', function() {
        if (playlist.length > 0) {
          playlistIndex = (playlistIndex + 1) % playlist.length;
          loadTrack(playlist[playlistIndex]);
          play();
        }
      });

      document.getElementById('prevBtn').addEventListener('click', function() {
        if (playlist.length > 0) {
          playlistIndex = (playlistIndex - 1 + playlist.length) % playlist.length;
          loadTrack(playlist[playlistIndex]);
          play();
        }
      });

      // Seek bar
      document.getElementById('seekBar').addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        progress = percent * duration;
        updateDisplay();
      });

      // Volume
      volumeSlider.addEventListener('input', function() {
        volumeValue.textContent = this.value + '%';
      });

      // Window buttons
      document.getElementById('minimizeBtn').addEventListener('click', function() {
        API.emitOutput('window.state', { state: 'minimized', title: 'Media Player' });
      });

      document.getElementById('closeBtn').addEventListener('click', function() {
        stop();
        API.emitOutput('window.state', { state: 'closed' });
      });

      // Simulate playback progress
      setInterval(function() {
        if (isPlaying && progress < duration) {
          progress += 0.5;
          updateDisplay();
          if (progress >= duration) {
            // Next track or stop
            if (playlist.length > 0 && playlistIndex < playlist.length - 1) {
              playlistIndex++;
              loadTrack(playlist[playlistIndex]);
            } else {
              stop();
            }
          }
        }
      }, 500);

      // Handle inputs
      API.onInput('media.load', function(data) {
        loadTrack(data);
        play();
      });

      API.onInput('playlist.set', function(data) {
        playlist = data || [];
        playlistIndex = 0;
        if (playlist.length > 0) {
          loadTrack(playlist[0]);
        }
      });

      API.onInput('window.open', function() {
        API.emitOutput('window.state', { state: 'open', title: 'Media Player' });
      });

      API.onMount(function() {
        updateDisplay();
        animateViz();
        API.emitOutput('window.state', { state: 'open', title: 'Media Player' });
      });
    })();
  </script>
</body>
</html>
`;

export const Win98MediaPlayerWidget: BuiltinWidget = {
  manifest: Win98MediaPlayerWidgetManifest,
  html: Win98MediaPlayerWidgetHTML,
};
