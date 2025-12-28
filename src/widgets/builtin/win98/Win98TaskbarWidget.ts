/**
 * Windows 98 Taskbar Widget
 *
 * Classic Windows 98 Taskbar with Start button, Quick Launch, running apps, and system tray.
 * Features authentic styling with the iconic Start button and clock.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const Win98TaskbarWidgetManifest: WidgetManifest = {
  id: 'stickernest.win98-taskbar',
  name: 'Taskbar',
  description: 'Windows 98 Taskbar',
  version: '1.0.0',
  author: 'StickerNest',
  category: 'retro',
  tags: ['windows', 'taskbar', 'start', '98', 'retro'],
  inputs: {
    'windows.update': { type: 'object', description: 'Update running windows list' },
    'tray.add': { type: 'object', description: 'Add system tray icon' },
    'tray.remove': { type: 'string', description: 'Remove tray icon' },
  },
  outputs: {
    'start.clicked': { type: 'trigger', description: 'Start button clicked' },
    'window.focus': { type: 'object', description: 'Window button clicked' },
    'quicklaunch.clicked': { type: 'object', description: 'Quick launch icon clicked' },
    'tray.clicked': { type: 'object', description: 'Tray icon clicked' },
  },
  capabilities: ['content'],
  io: { inputs: ['windows.update', 'tray.add', 'tray.remove'], outputs: ['start.clicked', 'window.focus', 'quicklaunch.clicked', 'tray.clicked'] },
  events: ['start.toggle', 'window.minimize', 'window.restore'],
  size: { width: 800, height: 32 },
};

export const Win98TaskbarWidgetHTML = `
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

    .taskbar {
      height: 28px;
      background: #c0c0c0;
      border-top: 2px solid #dfdfdf;
      display: flex;
      align-items: center;
      padding: 2px 2px;
      gap: 2px;
    }

    /* Start Button */
    .start-button {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf;
      cursor: pointer;
      font-weight: bold;
      font-size: 11px;
      height: 22px;
    }

    .start-button:active,
    .start-button.pressed {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    .start-logo {
      font-size: 14px;
    }

    /* Quick Launch */
    .quick-launch {
      display: flex;
      gap: 2px;
      padding: 0 4px;
      border-left: 1px solid #808080;
      border-right: 1px solid #ffffff;
      margin-left: 2px;
    }

    .quick-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
    }

    .quick-icon:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Window Buttons Area */
    .window-area {
      flex: 1;
      display: flex;
      gap: 2px;
      padding: 0 4px;
      overflow: hidden;
    }

    .window-button {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: #c0c0c0;
      border: 2px solid;
      border-color: #ffffff #000000 #000000 #ffffff;
      box-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf;
      cursor: pointer;
      font-size: 11px;
      height: 22px;
      min-width: 120px;
      max-width: 160px;
      overflow: hidden;
    }

    .window-button.active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
      background: #ffffff;
    }

    .window-button:active {
      border-color: #000000 #ffffff #ffffff #000000;
      box-shadow: inset 1px 1px 0 #808080;
    }

    .window-icon {
      font-size: 12px;
    }

    .window-title {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* System Tray */
    .system-tray {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 4px;
      border: 1px solid;
      border-color: #808080 #ffffff #ffffff #808080;
      height: 22px;
      background: #c0c0c0;
    }

    .tray-icon {
      font-size: 12px;
      cursor: pointer;
    }

    .tray-icon:hover {
      opacity: 0.7;
    }

    .tray-clock {
      font-size: 11px;
      padding: 0 4px;
      min-width: 50px;
      text-align: center;
    }

    /* Separator grip */
    .grip {
      width: 3px;
      height: 20px;
      background: repeating-linear-gradient(
        0deg,
        #808080,
        #808080 1px,
        #ffffff 1px,
        #ffffff 2px
      );
      margin: 0 2px;
      cursor: col-resize;
    }
  </style>
</head>
<body>
  <div class="taskbar">
    <!-- Start Button -->
    <button class="start-button" id="startBtn">
      <span class="start-logo">🪟</span>
      <span>Start</span>
    </button>

    <div class="grip"></div>

    <!-- Quick Launch -->
    <div class="quick-launch" id="quickLaunch">
      <div class="quick-icon" data-app="explorer" title="Internet Explorer">🌍</div>
      <div class="quick-icon" data-app="outlook" title="Outlook Express">📧</div>
      <div class="quick-icon" data-app="desktop" title="Show Desktop">🖥️</div>
    </div>

    <div class="grip"></div>

    <!-- Running Windows -->
    <div class="window-area" id="windowArea">
      <!-- Window buttons inserted here -->
    </div>

    <!-- System Tray -->
    <div class="system-tray" id="systemTray">
      <span class="tray-icon" title="Volume">🔊</span>
      <span class="tray-icon" title="Network">🌐</span>
      <div class="tray-clock" id="trayClock">12:00 PM</div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;
      if (!API) return;

      const startBtn = document.getElementById('startBtn');
      const windowArea = document.getElementById('windowArea');
      const trayClock = document.getElementById('trayClock');
      const quickLaunch = document.getElementById('quickLaunch');

      let windows = [];
      let activeWindowId = null;
      let startPressed = false;

      // Update clock
      function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        trayClock.textContent = hours + ':' + minutes + ' ' + ampm;
      }

      updateClock();
      setInterval(updateClock, 1000);

      // Start button
      startBtn.addEventListener('mousedown', function() {
        startPressed = !startPressed;
        startBtn.classList.toggle('pressed', startPressed);
      });

      startBtn.addEventListener('click', function() {
        API.emitOutput('start.clicked', {});
      });

      // Quick launch
      quickLaunch.addEventListener('click', function(e) {
        const icon = e.target.closest('.quick-icon');
        if (icon) {
          API.emitOutput('quicklaunch.clicked', { app: icon.dataset.app });
        }
      });

      // Render window buttons
      function renderWindows() {
        windowArea.innerHTML = '';
        windows.forEach(win => {
          const btn = document.createElement('button');
          btn.className = 'window-button' + (win.id === activeWindowId ? ' active' : '');
          btn.innerHTML = '<span class="window-icon">' + (win.icon || '📄') + '</span>' +
                         '<span class="window-title">' + win.title + '</span>';
          btn.addEventListener('click', function() {
            activeWindowId = win.id;
            renderWindows();
            API.emitOutput('window.focus', win);
          });
          windowArea.appendChild(btn);
        });
      }

      // Handle inputs
      API.onInput('windows.update', function(data) {
        if (data.state === 'open') {
          // Add window if not exists
          const exists = windows.find(w => w.id === data.id);
          if (!exists) {
            windows.push({
              id: data.id || Date.now().toString(),
              title: data.title || 'Window',
              icon: data.icon || '📄'
            });
          }
          activeWindowId = data.id;
        } else if (data.state === 'closed') {
          windows = windows.filter(w => w.id !== data.id);
          if (activeWindowId === data.id) {
            activeWindowId = windows.length > 0 ? windows[windows.length - 1].id : null;
          }
        } else if (data.state === 'minimized') {
          // Just update visual state
          if (activeWindowId === data.id) {
            activeWindowId = null;
          }
        }
        renderWindows();
      });

      API.onInput('tray.add', function(data) {
        const tray = document.getElementById('systemTray');
        const icon = document.createElement('span');
        icon.className = 'tray-icon';
        icon.dataset.id = data.id;
        icon.textContent = data.icon;
        icon.title = data.title || '';
        icon.addEventListener('click', function() {
          API.emitOutput('tray.clicked', data);
        });
        tray.insertBefore(icon, trayClock);
      });

      API.onInput('tray.remove', function(id) {
        const icon = document.querySelector('.tray-icon[data-id="' + id + '"]');
        if (icon) icon.remove();
      });

      // Close start menu on outside click
      document.addEventListener('click', function(e) {
        if (!startBtn.contains(e.target)) {
          startPressed = false;
          startBtn.classList.remove('pressed');
        }
      });

      API.onMount(function() {
        updateClock();
      });
    })();
  </script>
</body>
</html>
`;

export const Win98TaskbarWidget: BuiltinWidget = {
  manifest: Win98TaskbarWidgetManifest,
  html: Win98TaskbarWidgetHTML,
};
