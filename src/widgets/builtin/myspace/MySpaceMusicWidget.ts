/**
 * StickerNest v2 - MySpace Music Player Widget (2006 Theme)
 * ===========================================================
 *
 * The iconic MySpace embedded music player that would auto-play
 * when you visited someone's profile. Features the classic
 * Flash-player aesthetic with authentic 2006 styling.
 *
 * ## Features
 * - Classic music player UI
 * - Play/Pause/Skip controls
 * - Track list with song names
 * - Progress bar
 * - Volume control
 * - "Add to Profile" link
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const MySpaceMusicWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-music',
  name: 'MySpace Music Player',
  version: '1.0.0',
  kind: 'audio',
  entry: 'index.html',
  description: 'Classic MySpace 2006 music player with authentic styling.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'music', 'audio', 'retro', '2006', 'nostalgia', 'player'],
  category: 'myspace',
  inputs: {
    tracks: {
      type: 'array',
      description: 'Array of track objects with title, artist, duration',
      default: [],
    },
    autoplay: {
      type: 'boolean',
      description: 'Auto-play on load (like the old days!)',
      default: false,
    },
  },
  outputs: {
    trackChanged: {
      type: 'object',
      description: 'Emitted when track changes',
    },
    playStateChanged: {
      type: 'object',
      description: 'Emitted when play/pause state changes',
    },
    addToProfile: {
      type: 'object',
      description: 'Emitted when Add to Profile clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['tracks.set', 'control.play', 'control.pause'],
    outputs: ['track.changed', 'state.changed', 'profile.add'],
  },
  events: {
    listens: [],
    emits: ['audio:play', 'audio:pause'],
  },
  size: {
    width: 300,
    height: 200,
    minWidth: 250,
    minHeight: 180,
    scaleMode: 'stretch',
  },
};

export const MySpaceMusicWidgetHTML = `
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

    .player-box {
      background: #000000;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .player-header {
      background: linear-gradient(180deg, #003366 0%, #001133 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .player-header-icon {
      width: 14px;
      height: 14px;
      fill: #FF6633;
    }

    .player-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 8px;
      background: linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%);
    }

    .now-playing {
      text-align: center;
      margin-bottom: 8px;
    }

    .now-playing-label {
      color: #666666;
      font-size: 8px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .track-title {
      color: #FFFFFF;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .track-artist {
      color: #FF6633;
      font-size: 10px;
    }

    .progress-container {
      margin: 8px 0;
    }

    .progress-bar {
      height: 6px;
      background: #333333;
      border-radius: 3px;
      overflow: hidden;
      cursor: pointer;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #FF6633 0%, #FF9966 100%);
      width: 35%;
      transition: width 0.1s;
    }

    .time-display {
      display: flex;
      justify-content: space-between;
      color: #666666;
      font-size: 9px;
      margin-top: 2px;
    }

    .controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }

    .control-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #333333;
      border: 1px solid #555555;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: #444444;
      border-color: #FF6633;
    }

    .control-btn svg {
      width: 12px;
      height: 12px;
      fill: #FFFFFF;
    }

    .play-btn {
      width: 36px;
      height: 36px;
      background: linear-gradient(180deg, #FF6633 0%, #CC4400 100%);
      border: 2px solid #FF9966;
    }

    .play-btn:hover {
      background: linear-gradient(180deg, #FF9966 0%, #FF6633 100%);
    }

    .play-btn svg {
      width: 16px;
      height: 16px;
    }

    .volume-container {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: auto;
    }

    .volume-icon {
      width: 12px;
      height: 12px;
      fill: #666666;
    }

    .volume-slider {
      flex: 1;
      height: 4px;
      background: #333333;
      border-radius: 2px;
      cursor: pointer;
      position: relative;
    }

    .volume-fill {
      height: 100%;
      background: #FF6633;
      width: 70%;
      border-radius: 2px;
    }

    .player-footer {
      background: #111111;
      padding: 6px 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #333333;
    }

    .footer-link {
      color: #FF6633;
      text-decoration: underline;
      font-size: 9px;
      cursor: pointer;
    }

    .footer-link:hover {
      color: #FF9966;
    }

    .myspace-logo {
      font-size: 9px;
      color: #666666;
    }

    .myspace-logo span {
      color: #FF6633;
      font-weight: bold;
    }

    /* Equalizer animation */
    .equalizer {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 16px;
    }

    .eq-bar {
      width: 3px;
      background: #FF6633;
      animation: eq 0.5s ease-in-out infinite;
    }

    .eq-bar:nth-child(1) { animation-delay: 0.0s; }
    .eq-bar:nth-child(2) { animation-delay: 0.1s; }
    .eq-bar:nth-child(3) { animation-delay: 0.2s; }
    .eq-bar:nth-child(4) { animation-delay: 0.3s; }
    .eq-bar:nth-child(5) { animation-delay: 0.4s; }

    @keyframes eq {
      0%, 100% { height: 4px; }
      50% { height: 16px; }
    }

    .equalizer.paused .eq-bar {
      animation: none;
      height: 4px;
    }

    /* Track list */
    .track-list {
      max-height: 60px;
      overflow-y: auto;
      margin-top: 8px;
      border-top: 1px solid #333333;
      padding-top: 6px;
    }

    .track-item {
      display: flex;
      align-items: center;
      padding: 3px 6px;
      color: #999999;
      font-size: 9px;
      cursor: pointer;
    }

    .track-item:hover {
      background: #222222;
      color: #FFFFFF;
    }

    .track-item.active {
      color: #FF6633;
    }

    .track-number {
      width: 16px;
      color: #666666;
    }

    .track-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .track-duration {
      color: #666666;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="player-box">
      <div class="player-header">
        <svg class="player-header-icon" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
        <span>Music Player</span>
        <div class="equalizer" id="equalizer">
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
          <div class="eq-bar"></div>
        </div>
      </div>

      <div class="player-content">
        <div class="now-playing">
          <div class="now-playing-label">Now Playing</div>
          <div class="track-title" id="trackTitle">Welcome to My Profile</div>
          <div class="track-artist" id="trackArtist">by xXDarkAngelXx</div>
        </div>

        <div class="progress-container">
          <div class="progress-bar" id="progressBar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <div class="time-display">
            <span id="currentTime">1:24</span>
            <span id="totalTime">3:45</span>
          </div>
        </div>

        <div class="controls">
          <button class="control-btn" id="prevBtn" title="Previous">
            <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button class="control-btn play-btn" id="playBtn" title="Play/Pause">
            <svg viewBox="0 0 24 24" id="playIcon"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="control-btn" id="nextBtn" title="Next">
            <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
        </div>

        <div class="volume-container">
          <svg class="volume-icon" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          <div class="volume-slider" id="volumeSlider">
            <div class="volume-fill" id="volumeFill"></div>
          </div>
        </div>

        <div class="track-list" id="trackList">
          <!-- Tracks populated here -->
        </div>
      </div>

      <div class="player-footer">
        <a class="footer-link" id="addToProfileLink">Add to Profile</a>
        <div class="myspace-logo">powered by <span>MySpace</span> Music</div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        isPlaying: false,
        currentTrack: 0,
        progress: 35,
        volume: 70,
        tracks: []
      };

      // Default tracks
      const defaultTracks = [
        { id: 1, title: 'Welcome to My Profile', artist: 'xXDarkAngelXx', duration: '3:45' },
        { id: 2, title: 'Bring Me To Life', artist: 'Evanescence', duration: '4:21' },
        { id: 3, title: 'In The End', artist: 'Linkin Park', duration: '3:36' },
        { id: 4, title: 'My Immortal', artist: 'Evanescence', duration: '4:33' },
        { id: 5, title: 'Numb', artist: 'Linkin Park', duration: '3:07' }
      ];

      // Elements
      const equalizer = document.getElementById('equalizer');
      const trackTitle = document.getElementById('trackTitle');
      const trackArtist = document.getElementById('trackArtist');
      const progressFill = document.getElementById('progressFill');
      const currentTime = document.getElementById('currentTime');
      const totalTime = document.getElementById('totalTime');
      const playBtn = document.getElementById('playBtn');
      const playIcon = document.getElementById('playIcon');
      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const volumeFill = document.getElementById('volumeFill');
      const trackList = document.getElementById('trackList');
      const addToProfileLink = document.getElementById('addToProfileLink');

      // Update play/pause icon
      function updatePlayIcon() {
        if (state.isPlaying) {
          playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
          equalizer.classList.remove('paused');
        } else {
          playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          equalizer.classList.add('paused');
        }
      }

      // Render current track
      function renderTrack() {
        const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
        const track = tracks[state.currentTrack] || tracks[0];

        if (track) {
          trackTitle.textContent = track.title;
          trackArtist.textContent = 'by ' + track.artist;
          totalTime.textContent = track.duration;
        }

        progressFill.style.width = state.progress + '%';
        volumeFill.style.width = state.volume + '%';
        updatePlayIcon();
        renderTrackList();
      }

      // Render track list
      function renderTrackList() {
        const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
        trackList.innerHTML = '';

        tracks.forEach(function(track, index) {
          const item = document.createElement('div');
          item.className = 'track-item' + (index === state.currentTrack ? ' active' : '');
          item.innerHTML = \`
            <span class="track-number">\${index + 1}.</span>
            <span class="track-name">\${track.title}</span>
            <span class="track-duration">\${track.duration}</span>
          \`;
          item.addEventListener('click', function() {
            state.currentTrack = index;
            state.progress = 0;
            renderTrack();
            API.emitOutput('track.changed', {
              index: index,
              track: track
            });
          });
          trackList.appendChild(item);
        });
      }

      // Play/Pause
      playBtn.addEventListener('click', function() {
        state.isPlaying = !state.isPlaying;
        updatePlayIcon();
        API.emitOutput('state.changed', { isPlaying: state.isPlaying });
        API.emit(state.isPlaying ? 'audio:play' : 'audio:pause', {});
        API.setState({ isPlaying: state.isPlaying });
      });

      // Previous track
      prevBtn.addEventListener('click', function() {
        const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
        state.currentTrack = (state.currentTrack - 1 + tracks.length) % tracks.length;
        state.progress = 0;
        renderTrack();
        API.emitOutput('track.changed', {
          index: state.currentTrack,
          track: tracks[state.currentTrack]
        });
      });

      // Next track
      nextBtn.addEventListener('click', function() {
        const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
        state.currentTrack = (state.currentTrack + 1) % tracks.length;
        state.progress = 0;
        renderTrack();
        API.emitOutput('track.changed', {
          index: state.currentTrack,
          track: tracks[state.currentTrack]
        });
      });

      // Add to profile
      addToProfileLink.addEventListener('click', function(e) {
        e.preventDefault();
        const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
        API.emitOutput('profile.add', {
          track: tracks[state.currentTrack]
        });
      });

      // Simulate progress
      let progressInterval;
      function startProgress() {
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = setInterval(function() {
          if (state.isPlaying) {
            state.progress += 0.5;
            if (state.progress >= 100) {
              state.progress = 0;
              // Auto next track
              const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
              state.currentTrack = (state.currentTrack + 1) % tracks.length;
              renderTrack();
            }
            progressFill.style.width = state.progress + '%';

            // Update time display
            const tracks = state.tracks.length > 0 ? state.tracks : defaultTracks;
            const track = tracks[state.currentTrack];
            if (track) {
              const parts = track.duration.split(':');
              const totalSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
              const currentSeconds = Math.floor(totalSeconds * state.progress / 100);
              const mins = Math.floor(currentSeconds / 60);
              const secs = currentSeconds % 60;
              currentTime.textContent = mins + ':' + String(secs).padStart(2, '0');
            }
          }
        }, 100);
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        renderTrack();
        startProgress();
        API.log('MySpaceMusicWidget mounted');
      });

      // Handle tracks.set input
      API.onInput('tracks.set', function(tracks) {
        if (Array.isArray(tracks)) {
          state.tracks = tracks;
          state.currentTrack = 0;
          state.progress = 0;
          renderTrack();
          API.setState({ tracks: state.tracks });
        }
      });

      // Handle control.play
      API.onInput('control.play', function() {
        state.isPlaying = true;
        updatePlayIcon();
        API.emit('audio:play', {});
      });

      // Handle control.pause
      API.onInput('control.pause', function() {
        state.isPlaying = false;
        updatePlayIcon();
        API.emit('audio:pause', {});
      });

      API.onDestroy(function() {
        if (progressInterval) clearInterval(progressInterval);
        API.log('MySpaceMusicWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceMusicWidget: BuiltinWidget = {
  manifest: MySpaceMusicWidgetManifest,
  html: MySpaceMusicWidgetHTML,
};
