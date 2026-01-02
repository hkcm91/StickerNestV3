/**
 * StickerNest - Environment Control Widget
 *
 * Control spatial environment settings including lighting, background, floor, and effects.
 * Provides quick access to environment presets and HDRI environments from Poly Haven.
 *
 * Features:
 * - Environment preset selector (default, dark, neon, nature, studio, void)
 * - Lighting controls (ambient, directional)
 * - Background options (solid, gradient, HDRI, skybox)
 * - Floor settings (grid, solid, reflective, none)
 * - Effects toggles (bloom, vignette, fog)
 * - HDRI browser with Poly Haven integration
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const EnvironmentControlWidgetManifest: WidgetManifest = {
  id: 'stickernest.environment-control',
  name: 'Environment Control',
  version: '1.0.0',
  kind: 'control',
  entry: 'index.html',
  description: 'Control VR/AR environment with presets, lighting, backgrounds, and HDRI from Poly Haven',
  author: 'StickerNest',
  tags: ['spatial', 'environment', 'lighting', 'vr', 'ar', 'hdri', 'atmosphere', 'theme'],
  inputs: {},
  outputs: {
    'environment:changed': {
      type: 'object',
      description: 'Environment settings changed',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    supports3d: true,
  },
  io: {
    inputs: [],
    outputs: ['environment:changed'],
  },
  size: {
    width: 320,
    height: 520,
    minWidth: 280,
    minHeight: 400,
  },
};

export const EnvironmentControlWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    .header {
      padding: 14px 16px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-icon { font-size: 20px; }
    .header-title {
      font-size: 14px;
      font-weight: 600;
      flex: 1;
    }

    /* Content area */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    /* Section */
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Preset Grid */
    .preset-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .preset-btn {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      font-size: 13px;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .preset-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(139, 92, 246, 0.1);
    }
    .preset-btn.active {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(139, 92, 246, 0.2);
    }
    .preset-emoji {
      display: block;
      font-size: 20px;
      margin-bottom: 4px;
    }
    .preset-name {
      font-size: 11px;
      font-weight: 500;
    }

    /* Slider */
    .slider-group {
      margin-bottom: 14px;
    }
    .slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
      color: var(--sn-text-secondary, #94a3b8);
    }
    .slider-value {
      font-weight: 600;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .slider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: 3px;
      outline: none;
    }
    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      cursor: pointer;
    }
    .slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }

    /* Select */
    .select-group {
      margin-bottom: 14px;
    }
    .select-label {
      font-size: 12px;
      margin-bottom: 6px;
      color: var(--sn-text-secondary, #94a3b8);
      display: block;
    }
    .select {
      width: 100%;
      padding: 8px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 13px;
      cursor: pointer;
    }
    .select:focus {
      outline: none;
      border-color: var(--sn-accent-primary, #8b5cf6);
    }

    /* Toggle */
    .toggle-group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .toggle-label {
      font-size: 12px;
      color: var(--sn-text-primary, #e2e8f0);
    }
    .toggle {
      position: relative;
      width: 40px;
      height: 22px;
      cursor: pointer;
    }
    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 22px;
      transition: 0.2s;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }
    .toggle input:checked + .toggle-slider {
      background: var(--sn-accent-primary, #8b5cf6);
    }
    .toggle input:checked + .toggle-slider:before {
      transform: translateX(18px);
    }

    /* Color Picker */
    .color-group {
      margin-bottom: 14px;
    }
    .color-picker {
      width: 100%;
      height: 36px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      cursor: pointer;
    }

    /* HDRI List */
    .hdri-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }
    .hdri-item {
      padding: 10px 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
    }
    .hdri-item:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(139, 92, 246, 0.1);
    }
    .hdri-item.active {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: rgba(139, 92, 246, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-icon">🌅</span>
      <span class="header-title">Environment Control</span>
    </div>

    <div class="content">
      <!-- Presets Section -->
      <div class="section">
        <div class="section-title">Presets</div>
        <div class="preset-grid">
          <button class="preset-btn" data-preset="default">
            <span class="preset-emoji">⚡</span>
            <span class="preset-name">Default</span>
          </button>
          <button class="preset-btn" data-preset="dark">
            <span class="preset-emoji">🌙</span>
            <span class="preset-name">Dark</span>
          </button>
          <button class="preset-btn" data-preset="neon">
            <span class="preset-emoji">🌆</span>
            <span class="preset-name">Neon</span>
          </button>
          <button class="preset-btn" data-preset="nature">
            <span class="preset-emoji">🌿</span>
            <span class="preset-name">Nature</span>
          </button>
          <button class="preset-btn" data-preset="studio">
            <span class="preset-emoji">💡</span>
            <span class="preset-name">Studio</span>
          </button>
          <button class="preset-btn" data-preset="void">
            <span class="preset-emoji">⚫</span>
            <span class="preset-name">Void</span>
          </button>
        </div>
      </div>

      <!-- Lighting Section -->
      <div class="section">
        <div class="section-title">Lighting</div>

        <div class="slider-group">
          <div class="slider-label">
            <span>Ambient Light</span>
            <span class="slider-value" id="ambient-value">0.4</span>
          </div>
          <input type="range" class="slider" id="ambient-slider" min="0" max="2" step="0.1" value="0.4">
        </div>

        <div class="slider-group">
          <div class="slider-label">
            <span>Directional Light</span>
            <span class="slider-value" id="directional-value">1.0</span>
          </div>
          <input type="range" class="slider" id="directional-slider" min="0" max="2" step="0.1" value="1.0">
        </div>
      </div>

      <!-- Background Section -->
      <div class="section">
        <div class="section-title">Background</div>

        <div class="select-group">
          <label class="select-label">Type</label>
          <select class="select" id="background-type">
            <option value="solid">Solid Color</option>
            <option value="gradient">Gradient</option>
            <option value="hdri">HDRI</option>
            <option value="skybox">Skybox</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>

        <div class="color-group" id="bg-color-group">
          <label class="select-label">Color</label>
          <input type="color" class="color-picker" id="bg-color" value="#1a1a2e">
        </div>
      </div>

      <!-- Floor Section -->
      <div class="section">
        <div class="section-title">Floor</div>

        <div class="select-group">
          <label class="select-label">Type</label>
          <select class="select" id="floor-type">
            <option value="grid">Grid</option>
            <option value="solid">Solid</option>
            <option value="reflective">Reflective</option>
            <option value="none">None</option>
          </select>
        </div>

        <div class="slider-group" id="grid-size-group">
          <div class="slider-label">
            <span>Grid Size</span>
            <span class="slider-value" id="grid-size-value">1.0</span>
          </div>
          <input type="range" class="slider" id="grid-size-slider" min="0.1" max="2" step="0.1" value="1.0">
        </div>

        <div class="color-group" id="grid-color-group">
          <label class="select-label">Grid Color</label>
          <input type="color" class="color-picker" id="grid-color" value="#333355">
        </div>
      </div>

      <!-- Effects Section -->
      <div class="section">
        <div class="section-title">Effects</div>

        <div class="toggle-group">
          <span class="toggle-label">Bloom</span>
          <label class="toggle">
            <input type="checkbox" id="bloom-toggle">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="toggle-group">
          <span class="toggle-label">Vignette</span>
          <label class="toggle">
            <input type="checkbox" id="vignette-toggle">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="toggle-group">
          <span class="toggle-label">Fog</span>
          <label class="toggle">
            <input type="checkbox" id="fog-toggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Popular HDRIs Section -->
      <div class="section" id="hdri-section" style="display: none;">
        <div class="section-title">Popular HDRIs</div>
        <div class="hdri-list">
          <div class="hdri-item" data-hdri="studio_small_09">Studio Small 09</div>
          <div class="hdri-item" data-hdri="photo_studio_01">Photo Studio 01</div>
          <div class="hdri-item" data-hdri="venice_sunset">Venice Sunset</div>
          <div class="hdri-item" data-hdri="kiara_1_dawn">Kiara Dawn</div>
          <div class="hdri-item" data-hdri="kloppenheim_02">Kloppenheim 02</div>
          <div class="hdri-item" data-hdri="lebombo">Lebombo</div>
          <div class="hdri-item" data-hdri="empty_warehouse_01">Empty Warehouse</div>
          <div class="hdri-item" data-hdri="moonless_golf">Moonless Golf</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      // ================================================================
      // State
      // ================================================================
      const state = {
        currentPreset: 'default',
        lighting: {
          ambient: 0.4,
          directional: 1.0,
        },
        background: {
          type: 'solid',
          color: '#1a1a2e',
        },
        floor: {
          type: 'grid',
          gridSize: 1.0,
          gridColor: '#333355',
        },
        effects: {
          bloom: false,
          vignette: false,
          fog: false,
        },
        currentHDRI: null,
      };

      // ================================================================
      // DOM Elements
      // ================================================================
      const presetBtns = document.querySelectorAll('.preset-btn');
      const ambientSlider = document.getElementById('ambient-slider');
      const ambientValue = document.getElementById('ambient-value');
      const directionalSlider = document.getElementById('directional-slider');
      const directionalValue = document.getElementById('directional-value');
      const bgTypeSelect = document.getElementById('background-type');
      const bgColorPicker = document.getElementById('bg-color');
      const bgColorGroup = document.getElementById('bg-color-group');
      const floorTypeSelect = document.getElementById('floor-type');
      const gridSizeSlider = document.getElementById('grid-size-slider');
      const gridSizeValue = document.getElementById('grid-size-value');
      const gridSizeGroup = document.getElementById('grid-size-group');
      const gridColorPicker = document.getElementById('grid-color');
      const gridColorGroup = document.getElementById('grid-color-group');
      const bloomToggle = document.getElementById('bloom-toggle');
      const vignetteToggle = document.getElementById('vignette-toggle');
      const fogToggle = document.getElementById('fog-toggle');
      const hdriSection = document.getElementById('hdri-section');
      const hdriItems = document.querySelectorAll('.hdri-item');

      // ================================================================
      // Environment Control Functions
      // ================================================================
      async function applyPreset(preset) {
        try {
          await API.request('environment:preset', { preset });
          state.currentPreset = preset;
          updatePresetUI();
          API.log(\`Applied preset: \${preset}\`);
        } catch (error) {
          API.log(\`Error applying preset: \${error.message}\`);
        }
      }

      async function updateLighting() {
        try {
          await API.request('environment:lighting', {
            ambient: { intensity: state.lighting.ambient },
            directional: { intensity: state.lighting.directional },
          });
          API.emitOutput('environment:changed', { lighting: state.lighting });
        } catch (error) {
          API.log(\`Error updating lighting: \${error.message}\`);
        }
      }

      async function updateBackground() {
        try {
          let backgroundConfig = { type: state.background.type };

          if (state.background.type === 'solid') {
            backgroundConfig.color = state.background.color;
          } else if (state.background.type === 'hdri' && state.currentHDRI) {
            const hdriUrl = \`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/\${state.currentHDRI}_2k.hdr\`;
            backgroundConfig.url = hdriUrl;
            backgroundConfig.blur = 0;
          }

          await API.request('environment:background', backgroundConfig);
          API.emitOutput('environment:changed', { background: backgroundConfig });
        } catch (error) {
          API.log(\`Error updating background: \${error.message}\`);
        }
      }

      async function updateFloor() {
        try {
          const floorConfig = {
            type: state.floor.type,
            gridSize: state.floor.gridSize,
            gridColor: state.floor.gridColor,
          };

          await API.request('environment:floor', floorConfig);
          API.emitOutput('environment:changed', { floor: floorConfig });
        } catch (error) {
          API.log(\`Error updating floor: \${error.message}\`);
        }
      }

      async function updateEffects() {
        try {
          await API.request('environment:filters', {
            bloom: { enabled: state.effects.bloom },
            vignette: { enabled: state.effects.vignette },
          });
          // Fog is separate
          if (state.effects.fog) {
            await API.request('environment:fog', { enabled: true });
          }
          API.emitOutput('environment:changed', { effects: state.effects });
        } catch (error) {
          API.log(\`Error updating effects: \${error.message}\`);
        }
      }

      async function loadHDRI(hdriName) {
        state.currentHDRI = hdriName;
        state.background.type = 'hdri';
        bgTypeSelect.value = 'hdri';
        await updateBackground();
        updateHDRIUI();
        API.log(\`Loaded HDRI: \${hdriName}\`);
      }

      // ================================================================
      // UI Update Functions
      // ================================================================
      function updatePresetUI() {
        presetBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.preset === state.currentPreset);
        });
      }

      function updateBackgroundUI() {
        const isSolid = state.background.type === 'solid';
        const isHDRI = state.background.type === 'hdri';
        bgColorGroup.style.display = isSolid ? 'block' : 'none';
        hdriSection.style.display = isHDRI ? 'block' : 'none';
      }

      function updateFloorUI() {
        const isGrid = state.floor.type === 'grid';
        gridSizeGroup.style.display = isGrid ? 'block' : 'none';
        gridColorGroup.style.display = isGrid ? 'block' : 'none';
      }

      function updateHDRIUI() {
        hdriItems.forEach(item => {
          item.classList.toggle('active', item.dataset.hdri === state.currentHDRI);
        });
      }

      // ================================================================
      // Event Handlers
      // ================================================================

      // Presets
      presetBtns.forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
      });

      // Lighting
      ambientSlider.addEventListener('input', (e) => {
        state.lighting.ambient = parseFloat(e.target.value);
        ambientValue.textContent = state.lighting.ambient.toFixed(1);
      });
      ambientSlider.addEventListener('change', updateLighting);

      directionalSlider.addEventListener('input', (e) => {
        state.lighting.directional = parseFloat(e.target.value);
        directionalValue.textContent = state.lighting.directional.toFixed(1);
      });
      directionalSlider.addEventListener('change', updateLighting);

      // Background
      bgTypeSelect.addEventListener('change', (e) => {
        state.background.type = e.target.value;
        updateBackgroundUI();
        updateBackground();
      });

      bgColorPicker.addEventListener('change', (e) => {
        state.background.color = e.target.value;
        updateBackground();
      });

      // Floor
      floorTypeSelect.addEventListener('change', (e) => {
        state.floor.type = e.target.value;
        updateFloorUI();
        updateFloor();
      });

      gridSizeSlider.addEventListener('input', (e) => {
        state.floor.gridSize = parseFloat(e.target.value);
        gridSizeValue.textContent = state.floor.gridSize.toFixed(1);
      });
      gridSizeSlider.addEventListener('change', updateFloor);

      gridColorPicker.addEventListener('change', (e) => {
        state.floor.gridColor = e.target.value;
        updateFloor();
      });

      // Effects
      bloomToggle.addEventListener('change', (e) => {
        state.effects.bloom = e.target.checked;
        updateEffects();
      });

      vignetteToggle.addEventListener('change', (e) => {
        state.effects.vignette = e.target.checked;
        updateEffects();
      });

      fogToggle.addEventListener('change', (e) => {
        state.effects.fog = e.target.checked;
        updateEffects();
      });

      // HDRIs
      hdriItems.forEach(item => {
        item.addEventListener('click', () => loadHDRI(item.dataset.hdri));
      });

      // ================================================================
      // API Handlers
      // ================================================================
      API.onMount(function(context) {
        if (context.state) {
          Object.assign(state, context.state);
        }
        updatePresetUI();
        updateBackgroundUI();
        updateFloorUI();
        API.log('EnvironmentControl mounted');
      });

      API.onDestroy(function() {
        API.setState(state);
        API.log('EnvironmentControl destroyed');
      });
    })();
  </script>
</body>
</html>
`;

// ============================================================================
// Export
// ============================================================================

export const EnvironmentControlWidget: BuiltinWidget = {
  manifest: EnvironmentControlWidgetManifest,
  html: EnvironmentControlWidgetHTML,
};
