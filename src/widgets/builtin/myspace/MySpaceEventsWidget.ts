/**
 * StickerNest v2 - MySpace Events Widget (2006 Theme)
 * =====================================================
 *
 * The classic MySpace events widget - local shows, parties, and
 * meetups. Remember finding out about concerts through MySpace?
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceEventsWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-events',
  name: 'MySpace Events',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Classic MySpace 2006 events and invites widget.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'events', 'invites', 'concerts', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    events: { type: 'array', description: 'Array of event objects', default: [] },
    invites: { type: 'array', description: 'Array of event invites', default: [] },
  },
  outputs: {
    eventClicked: { type: 'object', description: 'Event clicked to view' },
    rsvpClicked: { type: 'object', description: 'RSVP clicked' },
    inviteAccepted: { type: 'object', description: 'Invite accepted' },
    inviteDeclined: { type: 'object', description: 'Invite declined' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['events.set', 'invites.set', 'data.set'],
    outputs: ['event.clicked', 'rsvp.clicked', 'invite.accepted', 'invite.declined'],
  },
  events: {
    listens: ['social:event-invite-new'],
    emits: [],
  },
  size: {
    width: 350,
    height: 350,
    minWidth: 280,
    minHeight: 280,
    scaleMode: 'stretch',
  },
};

export const MySpaceEventsWidgetHTML = `
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

    .events-box {
      background: #FFFFFF;
      border: 2px solid #336699;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .events-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .events-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .invite-badge {
      background: #FF0000;
      color: #FFFFFF;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 10px;
      margin-left: auto;
    }

    .events-tabs {
      display: flex;
      background: #E8F4F8;
      border-bottom: 1px solid #99CCFF;
    }

    .tab {
      padding: 6px 12px;
      font-size: 10px;
      color: #336699;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .tab:hover {
      background: #F0F8FF;
    }

    .tab.active {
      color: #003366;
      font-weight: bold;
      border-bottom-color: #FF6633;
      background: #FFFFFF;
    }

    .events-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .event-item {
      border: 1px solid #99CCFF;
      margin-bottom: 8px;
      background: #FFFFFF;
    }

    .event-item:hover {
      background: #F8F8F8;
    }

    .event-header {
      display: flex;
      gap: 8px;
      padding: 8px;
      cursor: pointer;
    }

    .event-date-box {
      width: 45px;
      text-align: center;
      background: linear-gradient(180deg, #FF6633 0%, #CC4400 100%);
      color: #FFFFFF;
      padding: 4px;
      flex-shrink: 0;
    }

    .event-month {
      font-size: 9px;
      text-transform: uppercase;
    }

    .event-day {
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
    }

    .event-info {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      color: #336699;
      font-weight: bold;
      font-size: 11px;
      text-decoration: underline;
      margin-bottom: 2px;
    }

    .event-title:hover {
      color: #003366;
    }

    .event-details {
      font-size: 9px;
      color: #666666;
      line-height: 1.4;
    }

    .event-host {
      color: #FF6633;
    }

    .event-actions {
      padding: 6px 8px;
      background: #F0F8FF;
      border-top: 1px solid #EEEEEE;
      display: flex;
      gap: 8px;
    }

    .event-btn {
      padding: 3px 10px;
      font-family: Verdana, Arial, sans-serif;
      font-size: 9px;
      cursor: pointer;
      border: 1px solid;
    }

    .attending-btn {
      background: linear-gradient(180deg, #00CC00 0%, #009900 100%);
      color: #FFFFFF;
      border-color: #006600;
    }

    .maybe-btn {
      background: linear-gradient(180deg, #FFCC00 0%, #CC9900 100%);
      color: #333333;
      border-color: #996600;
    }

    .decline-btn {
      background: #FFFFFF;
      color: #666666;
      border-color: #CCCCCC;
    }

    .invite-item {
      background: #FFFFEE;
      border: 1px solid #CCCC00;
    }

    .invite-from {
      font-size: 9px;
      color: #666600;
      padding: 4px 8px;
      background: #FFFFF0;
      border-bottom: 1px dashed #CCCC00;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 14px;
    }

    ::-webkit-scrollbar-track {
      background: #B4D0DC;
    }

    ::-webkit-scrollbar-thumb {
      background: #336699;
      border: 2px solid #B4D0DC;
    }
  </style>
</head>
<body>
  <div class="myspace-container">
    <div class="events-box">
      <div class="events-header">
        <svg class="events-header-icon" viewBox="0 0 24 24">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
        </svg>
        <span>Events</span>
        <span class="invite-badge" id="inviteBadge">2</span>
      </div>

      <div class="events-tabs">
        <div class="tab active" data-tab="invites">Invites</div>
        <div class="tab" data-tab="upcoming">My Events</div>
        <div class="tab" data-tab="local">Local</div>
      </div>

      <div class="events-list" id="eventsList">
        <!-- Events populated here -->
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        currentTab: 'invites',
        invites: [],
        events: []
      };

      // Default data
      const defaultInvites = [
        {
          id: 1,
          from: 'PunkRockPrincess',
          title: 'Battle of the Bands @ The Venue',
          date: '2006-12-30',
          time: '7:00 PM',
          location: 'The Venue, Downtown'
        },
        {
          id: 2,
          from: 'sk8erboi2006',
          title: 'New Years Eve Party!!',
          date: '2006-12-31',
          time: '9:00 PM',
          location: "Jake's House"
        }
      ];

      const defaultEvents = [
        {
          id: 3,
          title: 'My Chemical Romance Concert',
          date: '2007-01-15',
          time: '8:00 PM',
          location: 'Madison Square Garden',
          host: 'MySpace Music',
          attending: 4521
        },
        {
          id: 4,
          title: 'Local Band Showcase',
          date: '2007-01-20',
          time: '6:00 PM',
          location: 'The Roxy',
          host: 'LocalBandFinder',
          attending: 89
        }
      ];

      // Elements
      const inviteBadge = document.getElementById('inviteBadge');
      const eventsList = document.getElementById('eventsList');
      const tabs = document.querySelectorAll('.tab');

      // Format date
      function formatDate(dateStr) {
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return {
          month: months[date.getMonth()],
          day: date.getDate()
        };
      }

      // Render
      function render() {
        const invites = state.invites.length > 0 ? state.invites : defaultInvites;
        const events = state.events.length > 0 ? state.events : defaultEvents;

        inviteBadge.textContent = invites.length;
        inviteBadge.style.display = invites.length > 0 ? 'inline' : 'none';

        eventsList.innerHTML = '';

        if (state.currentTab === 'invites') {
          invites.forEach(function(invite) {
            const dateInfo = formatDate(invite.date);
            const item = document.createElement('div');
            item.className = 'event-item invite-item';
            item.innerHTML = \`
              <div class="invite-from">Invited by <span class="event-host">\${invite.from}</span></div>
              <div class="event-header" data-event-id="\${invite.id}">
                <div class="event-date-box">
                  <div class="event-month">\${dateInfo.month}</div>
                  <div class="event-day">\${dateInfo.day}</div>
                </div>
                <div class="event-info">
                  <div class="event-title">\${invite.title}</div>
                  <div class="event-details">
                    \${invite.time} @ \${invite.location}
                  </div>
                </div>
              </div>
              <div class="event-actions">
                <button class="event-btn attending-btn" data-invite-id="\${invite.id}">Attending</button>
                <button class="event-btn maybe-btn" data-invite-id="\${invite.id}">Maybe</button>
                <button class="event-btn decline-btn" data-invite-id="\${invite.id}">Decline</button>
              </div>
            \`;
            eventsList.appendChild(item);
          });
        } else {
          events.forEach(function(event) {
            const dateInfo = formatDate(event.date);
            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = \`
              <div class="event-header" data-event-id="\${event.id}">
                <div class="event-date-box">
                  <div class="event-month">\${dateInfo.month}</div>
                  <div class="event-day">\${dateInfo.day}</div>
                </div>
                <div class="event-info">
                  <div class="event-title">\${event.title}</div>
                  <div class="event-details">
                    \${event.time} @ \${event.location}<br>
                    Hosted by <span class="event-host">\${event.host}</span>
                    \${event.attending ? ' - ' + event.attending + ' attending' : ''}
                  </div>
                </div>
              </div>
            \`;
            eventsList.appendChild(item);
          });
        }

        // Click handlers
        eventsList.querySelectorAll('.event-header').forEach(function(el) {
          el.addEventListener('click', function() {
            API.emitOutput('event.clicked', { eventId: this.dataset.eventId });
          });
        });

        eventsList.querySelectorAll('.attending-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const inviteId = parseInt(this.dataset.inviteId);
            API.emitOutput('invite.accepted', { inviteId: inviteId, response: 'attending' });
            state.invites = state.invites.filter(i => i.id !== inviteId);
            render();
          });
        });

        eventsList.querySelectorAll('.decline-btn').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const inviteId = parseInt(this.dataset.inviteId);
            API.emitOutput('invite.declined', { inviteId: inviteId });
            state.invites = state.invites.filter(i => i.id !== inviteId);
            render();
          });
        });
      }

      // Tab switching
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          tabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          state.currentTab = this.dataset.tab;
          render();
        });
      });

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceEventsWidget mounted');
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.invites = data.invites || state.invites;
          state.events = data.events || state.events;
        }
        render();
        API.setState(state);
      });

      // Listen for new event invites
      API.on('social:event-invite-new', function(payload) {
        state.invites.unshift(payload.invite);
        render();
      });

      API.onDestroy(function() {
        API.log('MySpaceEventsWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceEventsWidget: BuiltinWidget = {
  manifest: MySpaceEventsWidgetManifest,
  html: MySpaceEventsWidgetHTML,
};
