/**
 * StickerNest v2 - Weather Widget
 *
 * Displays current weather conditions with a beautiful UI.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const WeatherWidgetManifest: WidgetManifest = {
  id: 'stickernest.weather',
  name: 'Weather',
  version: '1.0.0',
  kind: 'display',
  entry: 'index.html',
  description: 'Displays current weather conditions',
  author: 'StickerNest',
  tags: ['weather', 'temperature', 'display', 'core'],
  inputs: {
    location: {
      type: 'string',
      description: 'City name or coordinates',
      default: 'New York',
    },
    units: {
      type: 'string',
      description: 'Temperature units: celsius or fahrenheit',
      default: 'fahrenheit',
    },
  },
  outputs: {
    weatherData: {
      type: 'object',
      description: 'Current weather data',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['weather.setLocation', 'weather.refresh'],
    outputs: ['weather.data', 'weather.error'],
  },
  size: {
    width: 200,
    height: 180,
    minWidth: 160,
    minHeight: 140,
    scaleMode: 'scale',
  },
};

export const WeatherWidgetHTML = `
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      padding: 16px;
      color: white;
    }
    .container.night {
      background: linear-gradient(135deg, #2c3e50 0%, #4a5568 100%);
    }
    .container.cloudy {
      background: linear-gradient(135deg, #606c88 0%, #3f4c6b 100%);
    }
    .container.rainy {
      background: linear-gradient(135deg, #373b44 0%, #4286f4 100%);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .temp {
      font-size: 36px;
      font-weight: 700;
    }
    .condition {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }
    .location {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 8px;
    }
    .details {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 11px;
      opacity: 0.8;
    }
    .loading {
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="icon" id="icon">☀️</div>
    <div class="temp" id="temp">72°F</div>
    <div class="condition" id="condition">Sunny</div>
    <div class="details">
      <span id="humidity">💧 45%</span>
      <span id="wind">💨 5 mph</span>
    </div>
    <div class="location" id="location">New York</div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const iconEl = document.getElementById('icon');
      const tempEl = document.getElementById('temp');
      const conditionEl = document.getElementById('condition');
      const humidityEl = document.getElementById('humidity');
      const windEl = document.getElementById('wind');
      const locationEl = document.getElementById('location');

      let location = 'New York';
      let units = 'fahrenheit';

      // Weather icons mapping
      const weatherIcons = {
        'clear': '☀️',
        'sunny': '☀️',
        'partly-cloudy': '⛅',
        'cloudy': '☁️',
        'overcast': '☁️',
        'rain': '🌧️',
        'drizzle': '🌦️',
        'thunderstorm': '⛈️',
        'snow': '❄️',
        'fog': '🌫️',
        'night-clear': '🌙',
        'night-cloudy': '☁️',
      };

      // Demo weather data
      const demoWeather = {
        temp: 72,
        condition: 'Sunny',
        icon: 'sunny',
        humidity: 45,
        wind: 5,
        location: 'New York'
      };

      function updateDisplay(weather) {
        const temp = units === 'celsius'
          ? Math.round((weather.temp - 32) * 5/9)
          : weather.temp;
        const unit = units === 'celsius' ? '°C' : '°F';

        iconEl.textContent = weatherIcons[weather.icon] || '☀️';
        tempEl.textContent = temp + unit;
        conditionEl.textContent = weather.condition;
        humidityEl.textContent = '💧 ' + weather.humidity + '%';
        windEl.textContent = '💨 ' + weather.wind + ' mph';
        locationEl.textContent = weather.location;

        // Update background based on condition
        container.className = 'container';
        if (weather.icon.includes('night')) {
          container.classList.add('night');
        } else if (weather.icon.includes('cloud') || weather.icon.includes('overcast')) {
          container.classList.add('cloudy');
        } else if (weather.icon.includes('rain') || weather.icon.includes('thunder')) {
          container.classList.add('rainy');
        }

        API.emitOutput('weather.data', weather);
      }

      function fetchWeather() {
        // In a real implementation, this would call a weather API
        // For demo purposes, we'll simulate weather data
        const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Clear'];
        const icons = ['sunny', 'partly-cloudy', 'cloudy', 'clear'];
        const idx = Math.floor(Math.random() * conditions.length);

        const weather = {
          temp: Math.floor(Math.random() * 40) + 40,
          condition: conditions[idx],
          icon: icons[idx],
          humidity: Math.floor(Math.random() * 60) + 30,
          wind: Math.floor(Math.random() * 15) + 2,
          location: location
        };

        updateDisplay(weather);
        API.setState({ lastWeather: weather });
      }

      API.onMount(function(context) {
        const state = context.state || {};
        location = state.location || 'New York';
        units = state.units || 'fahrenheit';

        if (state.lastWeather) {
          updateDisplay(state.lastWeather);
        } else {
          fetchWeather();
        }

        API.log('WeatherWidget mounted');
      });

      API.onInput('weather.setLocation', function(loc) {
        location = loc;
        API.setState({ location });
        fetchWeather();
      });

      API.onInput('weather.refresh', fetchWeather);

      API.onStateChange(function(newState) {
        if (newState.location !== undefined) location = newState.location;
        if (newState.units !== undefined) units = newState.units;
        if (newState.lastWeather) updateDisplay(newState.lastWeather);
      });

      API.onDestroy(function() {
        API.log('WeatherWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const WeatherWidget: BuiltinWidget = {
  manifest: WeatherWidgetManifest,
  html: WeatherWidgetHTML,
};
