/**
 * StickerNest v2 - MySpace Interests Widget (2006 Theme)
 * ========================================================
 *
 * The classic MySpace "Interests" section showing General, Music,
 * Movies, Television, Books, and Heroes - all those things that
 * defined your personality on MySpace.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceInterestsWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-interests',
  name: 'MySpace Interests',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "Interests" section.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'interests', 'profile', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    interests: {
      type: 'object',
      description: 'Interests object with general, music, movies, tv, books, heroes',
      default: {},
    },
  },
  outputs: {
    interestClicked: {
      type: 'object',
      description: 'Emitted when an interest category is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['interests.set', 'data.set'],
    outputs: ['interest.clicked'],
  },
  size: {
    width: 400,
    height: 400,
    minWidth: 300,
    minHeight: 300,
    scaleMode: 'stretch',
  },
};

export const MySpaceInterestsWidgetHTML = `
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
      overflow: auto;
      font-family: Verdana, Arial, Helvetica, sans-serif;
      font-size: 10px;
      background: #B4D0DC;
    }

    .myspace-container {
      width: 100%;
      min-height: 100%;
      background: #B4D0DC;
      padding: 8px;
    }

    .interests-box {
      background: #FFFFFF;
      border: 2px solid #336699;
    }

    .interests-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .interests-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFCC00;
    }

    .interests-content {
      padding: 0;
    }

    .interest-section {
      border-bottom: 1px solid #99CCFF;
    }

    .interest-section:last-child {
      border-bottom: none;
    }

    .interest-label {
      background: linear-gradient(180deg, #336699 0%, #6699CC 100%);
      color: #FFFFFF;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 10px;
    }

    .interest-value {
      padding: 8px;
      font-size: 10px;
      color: #333333;
      line-height: 1.5;
      background: #FFFFFF;
    }

    .interest-value a {
      color: #FF6633;
      text-decoration: underline;
    }

    .interest-value a:hover {
      color: #FF3300;
    }

    /* Band/artist links styling */
    .interest-links {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .interest-link {
      color: #336699;
      text-decoration: underline;
      cursor: pointer;
    }

    .interest-link:hover {
      color: #003366;
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
    <div class="interests-box">
      <div class="interests-header">
        <svg class="interests-header-icon" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
        <span id="headerTitle">Tom's Interests</span>
      </div>

      <div class="interests-content" id="interestsContent">
        <!-- Interests populated here -->
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        username: 'Tom',
        interests: {
          general: 'Coding, Music, Startups, Social Networking, Photography, Travel, Meeting new people',
          music: 'Blink-182, Green Day, The Used, Taking Back Sunday, Fall Out Boy, My Chemical Romance, Panic! At The Disco, Evanescence, Linkin Park, System of a Down',
          movies: 'The Matrix, Fight Club, Donnie Darko, Garden State, Napoleon Dynamite, Eternal Sunshine of the Spotless Mind',
          television: 'The O.C., One Tree Hill, Laguna Beach, Lost, 24, The Office',
          books: 'The Catcher in the Rye, 1984, Brave New World, The Perks of Being a Wallflower',
          heroes: 'My parents, Steve Jobs, anyone who follows their dreams'
        }
      };

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const interestsContent = document.getElementById('interestsContent');

      // Labels mapping
      const LABELS = {
        general: 'General',
        music: 'Music',
        movies: 'Movies',
        television: 'Television',
        books: 'Books',
        heroes: 'Heroes'
      };

      // Render interests
      function render() {
        headerTitle.textContent = state.username + "'s Interests";

        interestsContent.innerHTML = '';

        Object.keys(LABELS).forEach(function(key) {
          if (state.interests[key]) {
            const section = document.createElement('div');
            section.className = 'interest-section';

            // For music, make items clickable links
            let valueHTML = state.interests[key];
            if (key === 'music') {
              const items = state.interests[key].split(',').map(function(item) {
                return '<span class="interest-link" data-artist="' + item.trim() + '">' + item.trim() + '</span>';
              });
              valueHTML = items.join(', ');
            }

            section.innerHTML = \`
              <div class="interest-label">\${LABELS[key]}</div>
              <div class="interest-value">\${valueHTML}</div>
            \`;

            // Add click handlers for music links
            if (key === 'music') {
              section.querySelectorAll('.interest-link').forEach(function(link) {
                link.addEventListener('click', function() {
                  API.emitOutput('interest.clicked', {
                    category: 'music',
                    value: this.dataset.artist
                  });
                });
              });
            }

            interestsContent.appendChild(section);
          }
        });
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceInterestsWidget mounted');
      });

      // Handle interests.set input
      API.onInput('interests.set', function(interests) {
        if (typeof interests === 'object') {
          state.interests = { ...state.interests, ...interests };
          render();
          API.setState({ interests: state.interests });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.interests = data.interests || state.interests;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceInterestsWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceInterestsWidget: BuiltinWidget = {
  manifest: MySpaceInterestsWidgetManifest,
  html: MySpaceInterestsWidgetHTML,
};
