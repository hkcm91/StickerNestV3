/**
 * StickerNest v2 - Stream Alert Widget
 *
 * Displays alerts for stream events (follows, subs, raids, donations).
 * Supports customizable animations, sounds, and text templates.
 * Mobile-optimized with reduced motion support.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const StreamAlertWidgetManifest: WidgetManifest = {
  id: 'stickernest.stream-alert',
  name: 'Stream Alert',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Display animated alerts for stream events like follows, subs, and raids',
  author: 'StickerNest',
  tags: ['streaming', 'alerts', 'notifications', 'twitch', 'youtube', 'obs'],
  inputs: {
    triggerAlert: {
      type: 'object',
      description: 'Manually trigger an alert { type, username, message, amount }',
    },
    clearQueue: {
      type: 'trigger',
      description: 'Clear the alert queue',
    },
    setVolume: {
      type: 'number',
      description: 'Set alert sound volume (0-1)',
    },
  },
  outputs: {
    alertShown: {
      type: 'object',
      description: 'Emitted when an alert is displayed',
    },
    alertHidden: {
      type: 'trigger',
      description: 'Emitted when an alert finishes',
    },
    queueEmpty: {
      type: 'trigger',
      description: 'Emitted when alert queue becomes empty',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['alert.trigger', 'alert.clear', 'audio.volume'],
    outputs: ['alert.shown', 'alert.hidden', 'queue.empty'],
  },
  events: {
    listens: [
      'stream:follow',
      'stream:subscribe',
      'stream:gift',
      'stream:donation',
      'stream:raid',
      'stream:reward',
    ],
  },
  size: {
    width: 400,
    height: 150,
    minWidth: 300,
    minHeight: 100,
    scaleMode: 'scale',
  },
};

export const StreamAlertWidgetHTML = `
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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    /* Alert Box */
    .alert-box {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px 32px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(99, 102, 241, 0.9));
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
      text-align: center;
      max-width: 100%;
      animation: none;
    }
    .alert-box.visible {
      display: flex;
    }

    /* Animation classes */
    .alert-box.animate-in {
      animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .alert-box.animate-out {
      animation: slideOut 0.3s ease-in forwards;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-30px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(20px) scale(0.9);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .alert-box.animate-in,
      .alert-box.animate-out {
        animation: fadeOnly 0.3s ease forwards;
      }
      @keyframes fadeOnly {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .alert-box.animate-out {
        animation-direction: reverse;
      }
    }

    /* Alert Types */
    .alert-box.follow {
      background: linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(244, 114, 182, 0.9));
      box-shadow: 0 8px 32px rgba(236, 72, 153, 0.4);
    }
    .alert-box.subscribe {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.9));
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
    }
    .alert-box.gift {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(74, 222, 128, 0.9));
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.4);
    }
    .alert-box.donation {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(252, 211, 77, 0.9));
      box-shadow: 0 8px 32px rgba(251, 191, 36, 0.4);
    }
    .alert-box.raid {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(248, 113, 113, 0.9));
      box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
    }

    /* Icon */
    .alert-icon {
      font-size: 36px;
      animation: bounce 0.6s ease infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .alert-icon { animation: none; }
    }

    /* Text */
    .alert-title {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .alert-username {
      font-size: 28px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      word-break: break-word;
    }
    .alert-message {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.95);
      max-width: 100%;
      word-break: break-word;
    }
    .alert-amount {
      font-size: 20px;
      font-weight: 600;
      color: white;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 16px;
      border-radius: 20px;
    }

    /* Queue indicator */
    .queue-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 8px;
      border-radius: 10px;
      display: none;
    }
    .queue-indicator.visible { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert-box" id="alertBox">
      <div class="alert-icon" id="alertIcon">🎉</div>
      <div class="alert-title" id="alertTitle">New Follower</div>
      <div class="alert-username" id="alertUsername">Username</div>
      <div class="alert-message" id="alertMessage"></div>
      <div class="alert-amount" id="alertAmount" style="display: none;"></div>
    </div>
    <div class="queue-indicator" id="queueIndicator">+0 in queue</div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // DOM Elements
      const alertBox = document.getElementById('alertBox');
      const alertIcon = document.getElementById('alertIcon');
      const alertTitle = document.getElementById('alertTitle');
      const alertUsername = document.getElementById('alertUsername');
      const alertMessage = document.getElementById('alertMessage');
      const alertAmount = document.getElementById('alertAmount');
      const queueIndicator = document.getElementById('queueIndicator');

      // State
      let alertQueue = [];
      let isShowingAlert = false;
      let volume = 0.5;
      let alertDuration = 5000; // ms

      // Alert type configurations
      const alertConfig = {
        follow: {
          icon: '💜',
          title: 'New Follower!',
          class: 'follow'
        },
        subscribe: {
          icon: '⭐',
          title: 'New Subscriber!',
          class: 'subscribe'
        },
        gift: {
          icon: '🎁',
          title: 'Gift Subscription!',
          class: 'gift'
        },
        donation: {
          icon: '💰',
          title: 'Donation!',
          class: 'donation'
        },
        raid: {
          icon: '🚀',
          title: 'Incoming Raid!',
          class: 'raid'
        },
        reward: {
          icon: '🏆',
          title: 'Channel Reward!',
          class: 'subscribe'
        }
      };

      // Queue an alert
      function queueAlert(alert) {
        alertQueue.push(alert);
        updateQueueIndicator();
        if (!isShowingAlert) {
          showNextAlert();
        }
      }

      // Update queue indicator
      function updateQueueIndicator() {
        const remaining = alertQueue.length;
        if (remaining > 0 && isShowingAlert) {
          queueIndicator.textContent = '+' + remaining + ' in queue';
          queueIndicator.classList.add('visible');
        } else {
          queueIndicator.classList.remove('visible');
        }
      }

      // Show next alert from queue
      function showNextAlert() {
        if (alertQueue.length === 0) {
          isShowingAlert = false;
          API.emitOutput('queue.empty', {});
          return;
        }

        isShowingAlert = true;
        const alert = alertQueue.shift();
        updateQueueIndicator();
        displayAlert(alert);
      }

      // Display a single alert
      function displayAlert(alert) {
        const config = alertConfig[alert.type] || alertConfig.follow;

        // Set content
        alertIcon.textContent = config.icon;
        alertTitle.textContent = config.title;
        alertUsername.textContent = alert.username || 'Someone';

        if (alert.message) {
          alertMessage.textContent = alert.message;
          alertMessage.style.display = 'block';
        } else {
          alertMessage.style.display = 'none';
        }

        if (alert.amount) {
          alertAmount.textContent = alert.amount;
          alertAmount.style.display = 'block';
        } else {
          alertAmount.style.display = 'none';
        }

        // Set type class
        alertBox.className = 'alert-box visible animate-in ' + config.class;

        // Emit event
        API.emitOutput('alert.shown', alert);

        // Play sound (if available)
        playAlertSound(alert.type);

        // Hide after duration
        setTimeout(() => {
          hideAlert();
        }, alertDuration);
      }

      // Hide alert
      function hideAlert() {
        alertBox.classList.remove('animate-in');
        alertBox.classList.add('animate-out');

        setTimeout(() => {
          alertBox.classList.remove('visible', 'animate-out');
          API.emitOutput('alert.hidden', {});
          // Show next alert
          setTimeout(showNextAlert, 500);
        }, 300);
      }

      // Play alert sound (placeholder - would use Web Audio API)
      function playAlertSound(type) {
        // In a real implementation, this would play sounds using Web Audio API
        API.log('Would play sound for: ' + type + ' at volume ' + volume);
      }

      // Handle stream events
      function handleStreamEvent(type, payload) {
        const alert = {
          type: type.replace('stream:', ''),
          username: payload.username || payload.user_name || payload.displayName || 'Someone',
          message: payload.message,
          amount: payload.amount ? formatAmount(payload.amount, payload.currency) : null,
          timestamp: Date.now()
        };
        queueAlert(alert);
      }

      // Format amount
      function formatAmount(amount, currency) {
        if (!amount) return null;
        const symbol = { USD: '$', EUR: '€', GBP: '£' }[currency] || '';
        return symbol + parseFloat(amount).toFixed(2);
      }

      // Widget API handlers
      API.onMount(function(context) {
        const state = context.state || {};
        volume = state.volume || 0.5;
        alertDuration = state.duration || 5000;
        API.log('StreamAlertWidget mounted');
      });

      // Listen to stream events
      API.on('stream:follow', (e) => handleStreamEvent('stream:follow', e.payload));
      API.on('stream:subscribe', (e) => handleStreamEvent('stream:subscribe', e.payload));
      API.on('stream:gift', (e) => handleStreamEvent('stream:gift', e.payload));
      API.on('stream:donation', (e) => handleStreamEvent('stream:donation', e.payload));
      API.on('stream:raid', (e) => handleStreamEvent('stream:raid', e.payload));
      API.on('stream:reward', (e) => handleStreamEvent('stream:reward', e.payload));

      // Handle manual triggers
      API.onInput('alert.trigger', function(alert) {
        queueAlert(alert);
      });

      API.onInput('alert.clear', function() {
        alertQueue = [];
        updateQueueIndicator();
        if (isShowingAlert) {
          hideAlert();
        }
      });

      API.onInput('audio.volume', function(vol) {
        volume = Math.max(0, Math.min(1, vol));
        API.setState({ volume: volume });
      });

      API.onStateChange(function(newState) {
        if (newState.volume !== undefined) volume = newState.volume;
        if (newState.duration !== undefined) alertDuration = newState.duration;
      });

      API.onDestroy(function() {
        alertQueue = [];
        API.log('StreamAlertWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const StreamAlertWidget: BuiltinWidget = {
  manifest: StreamAlertWidgetManifest,
  html: StreamAlertWidgetHTML,
};
