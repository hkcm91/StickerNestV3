/**
 * StickerNest v2 - MySpace Details Widget (2006 Theme)
 * ======================================================
 *
 * The classic MySpace "Details" / General Info box showing all those
 * personal details like Status, Here For, Orientation, Hometown,
 * Body Type, Ethnicity, Religion, Zodiac Sign, Smoke/Drink, etc.
 *
 * @see SocialEventBridge - Events are routed through this
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const MySpaceDetailsWidgetManifest: WidgetManifest = {
  id: 'stickernest.myspace-details',
  name: 'MySpace Details',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Classic MySpace 2006 "Details" general info box.',
  author: 'StickerNest',
  tags: ['social', 'myspace', 'profile', 'details', 'retro', '2006', 'nostalgia'],
  category: 'myspace',
  inputs: {
    details: {
      type: 'object',
      description: 'User details object',
      default: {},
    },
  },
  outputs: {
    detailClicked: {
      type: 'object',
      description: 'Emitted when a detail is clicked',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: ['details.set', 'data.set'],
    outputs: ['detail.clicked'],
  },
  size: {
    width: 300,
    height: 350,
    minWidth: 250,
    minHeight: 280,
    scaleMode: 'stretch',
  },
};

export const MySpaceDetailsWidgetHTML = `
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

    .details-box {
      background: #FFFFFF;
      border: 2px solid #336699;
    }

    .details-header {
      background: linear-gradient(180deg, #003366 0%, #336699 100%);
      color: #FFFFFF;
      padding: 6px 8px;
      font-weight: bold;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .details-header-icon {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }

    .details-content {
      padding: 0;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
    }

    .details-table tr {
      border-bottom: 1px solid #E8F4F8;
    }

    .details-table tr:last-child {
      border-bottom: none;
    }

    .details-table td {
      padding: 6px 8px;
      font-size: 10px;
      vertical-align: top;
    }

    .detail-label {
      width: 100px;
      color: #336699;
      font-weight: bold;
      background: #F0F8FF;
    }

    .detail-value {
      color: #333333;
    }

    .detail-value a {
      color: #FF6633;
      text-decoration: underline;
    }

    .detail-value a:hover {
      color: #FF3300;
    }

    .zodiac-icon {
      display: inline-block;
      width: 14px;
      height: 14px;
      margin-right: 4px;
      vertical-align: middle;
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
    <div class="details-box">
      <div class="details-header">
        <svg class="details-header-icon" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span id="headerTitle">Tom's Details</span>
      </div>

      <div class="details-content">
        <table class="details-table" id="detailsTable">
          <tbody id="detailsBody">
            <!-- Details populated here -->
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // Zodiac signs
      const ZODIAC = {
        aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
        leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
        sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓'
      };

      // State
      let state = {
        username: 'Tom',
        details: {
          status: 'Single',
          hereFor: 'Dating, Networking, Friends',
          orientation: 'Straight',
          hometown: 'Los Angeles, CA',
          bodyType: 'Athletic',
          ethnicity: 'White / Caucasian',
          religion: 'Agnostic',
          zodiacSign: 'leo',
          smokeDrink: 'No / Sometimes',
          children: 'Someday',
          education: 'College graduate',
          occupation: 'Founder of MySpace',
          income: '$250,000 and Higher'
        }
      };

      // Elements
      const headerTitle = document.getElementById('headerTitle');
      const detailsBody = document.getElementById('detailsBody');

      // Detail labels mapping
      const LABELS = {
        status: 'Status:',
        hereFor: 'Here for:',
        orientation: 'Orientation:',
        hometown: 'Hometown:',
        bodyType: 'Body type:',
        ethnicity: 'Ethnicity:',
        religion: 'Religion:',
        zodiacSign: 'Zodiac Sign:',
        smokeDrink: 'Smoke / Drink:',
        children: 'Children:',
        education: 'Education:',
        occupation: 'Occupation:',
        income: 'Income:'
      };

      // Render details
      function render() {
        headerTitle.textContent = state.username + "'s Details";

        detailsBody.innerHTML = '';

        Object.keys(LABELS).forEach(function(key) {
          if (state.details[key]) {
            const row = document.createElement('tr');
            let value = state.details[key];

            // Add zodiac symbol
            if (key === 'zodiacSign' && ZODIAC[value.toLowerCase()]) {
              value = ZODIAC[value.toLowerCase()] + ' ' + value.charAt(0).toUpperCase() + value.slice(1);
            }

            row.innerHTML = \`
              <td class="detail-label">\${LABELS[key]}</td>
              <td class="detail-value">\${value}</td>
            \`;

            row.addEventListener('click', function() {
              API.emitOutput('detail.clicked', {
                field: key,
                value: state.details[key]
              });
            });

            detailsBody.appendChild(row);
          }
        });
      }

      // Initialize
      API.onMount(function(context) {
        const saved = context.state || {};
        Object.assign(state, saved);
        render();
        API.log('MySpaceDetailsWidget mounted');
      });

      // Handle details.set input
      API.onInput('details.set', function(details) {
        if (typeof details === 'object') {
          state.details = { ...state.details, ...details };
          render();
          API.setState({ details: state.details });
        }
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (typeof data === 'object') {
          state.username = data.username || state.username;
          state.details = data.details || state.details;
        }
        render();
        API.setState(state);
      });

      API.onDestroy(function() {
        API.log('MySpaceDetailsWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const MySpaceDetailsWidget: BuiltinWidget = {
  manifest: MySpaceDetailsWidgetManifest,
  html: MySpaceDetailsWidgetHTML,
};
