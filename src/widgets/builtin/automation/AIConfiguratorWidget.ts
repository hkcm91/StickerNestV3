/**
 * AI Configurator Widget (System Widget)
 *
 * Pipeline owner control panel for AI generation settings.
 * - Set system prompts (explaining black/white mask zones)
 * - Select AI model and provider
 * - Configure generation parameters
 * - Manage style presets
 * - Set API keys
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const AIConfiguratorManifest: WidgetManifest = {
  id: 'stickernest.ai-configurator',
  name: 'AI Configurator',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'System widget for pipeline owners to configure AI generation settings. Set prompts, select models, manage API keys.',
  author: 'StickerNest',
  tags: ['system', 'admin', 'ai', 'configuration', 'prompt'],
  inputs: {
    loadConfig: {
      type: 'trigger',
      description: 'Load saved configuration',
    },
    setApiKey: {
      type: 'object',
      description: 'Set API key { provider, key }',
    },
    testConnection: {
      type: 'string',
      description: 'Test connection to provider',
    },
  },
  outputs: {
    configUpdated: {
      type: 'object',
      description: 'Full AI configuration',
    },
    systemPromptReady: {
      type: 'string',
      description: 'The compositor system prompt to send to AI',
    },
    modelSelected: {
      type: 'object',
      description: 'Selected model configuration',
    },
    stylePresetsReady: {
      type: 'array',
      description: 'Available style presets for end users',
    },
    connectionStatus: {
      type: 'object',
      description: 'API connection test result',
    },
    error: {
      type: 'object',
      description: 'Error information',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: [
      'trigger.load',
      'api.setKey',
      'api.testConnection',
    ],
    outputs: [
      'config.updated',
      'prompt.system',
      'model.selected',
      'presets.ready',
      'connection.status',
      'error.occurred',
    ],
  },
  size: {
    width: 420,
    height: 550,
    minWidth: 380,
    minHeight: 450,
  },
};

export const AIConfiguratorHTML = `
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
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      color: #e2e8f0;
    }
    .header {
      padding: 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }
    .header h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header p {
      font-size: 11px;
      color: #94a3b8;
    }
    .tabs {
      display: flex;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .tab {
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 500;
      color: #94a3b8;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab:hover {
      color: #e2e8f0;
    }
    .tab.active {
      color: #8b5cf6;
      border-bottom-color: #8b5cf6;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #a78bfa;
    }
    .form-group {
      margin-bottom: 14px;
    }
    .form-group label {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      font-family: inherit;
    }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
      outline: none;
      border-color: #8b5cf6;
    }
    .form-group textarea {
      min-height: 100px;
      resize: vertical;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.5;
    }
    .form-group .hint {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #e2e8f0;
    }
    .btn-success {
      background: #22c55e;
      color: white;
    }
    .btn-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-badge.connected {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .status-badge.disconnected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .status-badge.unknown {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }
    .model-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .model-card:hover {
      border-color: rgba(139, 92, 246, 0.5);
    }
    .model-card.selected {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
    }
    .model-card .model-name {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .model-card .model-desc {
      font-size: 10px;
      color: #94a3b8;
    }
    .preset-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .preset-item .preset-name {
      font-size: 12px;
      font-weight: 500;
    }
    .preset-item .preset-actions {
      display: flex;
      gap: 6px;
    }
    .preset-item .btn {
      padding: 4px 8px;
      font-size: 10px;
    }
    .slider-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .slider-group input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
    }
    .slider-group input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: #8b5cf6;
      border-radius: 50%;
      cursor: pointer;
    }
    .slider-value {
      min-width: 40px;
      text-align: right;
      font-size: 12px;
      color: #a78bfa;
    }
    .api-key-input {
      display: flex;
      gap: 8px;
    }
    .api-key-input input {
      flex: 1;
    }
    .api-key-input .btn {
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🤖 AI Configurator</h2>
      <p>Configure AI generation settings for your pipeline</p>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="prompts">Prompts</div>
      <div class="tab" data-tab="models">Models</div>
      <div class="tab" data-tab="presets">Style Presets</div>
      <div class="tab" data-tab="api">API Keys</div>
    </div>

    <div class="content">
      <!-- Prompts Tab -->
      <div class="tab-content active" id="tab-prompts">
        <div class="section">
          <div class="section-title">System Prompt (Compositor)</div>
          <div class="form-group">
            <label>Explain black/white zones to AI</label>
            <textarea id="systemPrompt" placeholder="This is a business card mask. BLACK areas are reserved for text content - do NOT generate design elements there. WHITE areas should contain elegant, professional design elements..."></textarea>
            <div class="hint">This prompt tells the AI how to interpret the mask zones. Be specific about what goes where.</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Default Prompt Template</div>
          <div class="form-group">
            <label>Base prompt for all generations</label>
            <textarea id="basePrompt" placeholder="professional {{category}} design, {{stylePrompt}}, {{primaryColor}} and {{secondaryColor}} colors, high quality, 300 DPI"></textarea>
            <div class="hint">Use {{variables}} for dynamic substitution: stylePrompt, primaryColor, secondaryColor, category</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Negative Prompt</div>
          <div class="form-group">
            <label>What AI should avoid</label>
            <textarea id="negativePrompt" placeholder="text, words, letters, watermark, signature, blurry, low quality, pixelated, distorted"></textarea>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="savePrompts">Save Prompts</button>
          <button class="btn btn-secondary" id="testPrompt">Test Generation</button>
        </div>
      </div>

      <!-- Models Tab -->
      <div class="tab-content" id="tab-models">
        <div class="section">
          <div class="section-title">Select AI Model</div>
          <div id="modelList">
            <!-- Populated by JS -->
          </div>
        </div>

        <div class="section">
          <div class="section-title">Generation Parameters</div>
          <div class="form-group">
            <label>Inference Steps</label>
            <div class="slider-group">
              <input type="range" id="inferenceSteps" min="1" max="50" value="4">
              <span class="slider-value" id="stepsValue">4</span>
            </div>
          </div>
          <div class="form-group">
            <label>Guidance Scale (CFG)</label>
            <div class="slider-group">
              <input type="range" id="guidanceScale" min="1" max="20" step="0.5" value="7.5">
              <span class="slider-value" id="cfgValue">7.5</span>
            </div>
          </div>
          <div class="form-group">
            <label>Batch Size (designs per generation)</label>
            <select id="batchSize">
              <option value="1">1 design</option>
              <option value="2">2 designs</option>
              <option value="4" selected>4 designs</option>
              <option value="6">6 designs</option>
              <option value="8">8 designs</option>
            </select>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="saveModelConfig">Save Model Config</button>
        </div>
      </div>

      <!-- Style Presets Tab -->
      <div class="tab-content" id="tab-presets">
        <div class="section">
          <div class="section-title">Style Presets for End Users</div>
          <p style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
            Define style options that end users can choose from in the UI.
          </p>

          <div id="presetList">
            <!-- Populated by JS -->
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" id="addPreset">+ Add Preset</button>
          </div>
        </div>

        <div class="section">
          <div class="section-title">New Preset</div>
          <div class="form-group">
            <label>Preset Name</label>
            <input type="text" id="presetName" placeholder="e.g., Minimalist, Bold, Vintage">
          </div>
          <div class="form-group">
            <label>Style Prompt</label>
            <textarea id="presetPrompt" style="min-height: 60px;" placeholder="minimalist clean design, subtle gradients, geometric shapes"></textarea>
          </div>
          <div class="form-group">
            <label>Primary Color</label>
            <input type="color" id="presetPrimaryColor" value="#8b5cf6" style="height: 36px;">
          </div>
          <div class="form-group">
            <label>Secondary Color</label>
            <input type="color" id="presetSecondaryColor" value="#06b6d4" style="height: 36px;">
          </div>
          <div class="btn-row">
            <button class="btn btn-success" id="savePreset">Save Preset</button>
          </div>
        </div>
      </div>

      <!-- API Keys Tab -->
      <div class="tab-content" id="tab-api">
        <div class="section">
          <div class="section-title">Replicate API</div>
          <div class="form-group">
            <label>API Token</label>
            <div class="api-key-input">
              <input type="password" id="replicateKey" placeholder="r8_xxxxxxxxxxxx">
              <button class="btn btn-secondary" id="testReplicate">Test</button>
            </div>
            <div style="margin-top: 8px;">
              <span class="status-badge unknown" id="replicateStatus">
                <span>●</span> Not tested
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">OpenAI API (Optional)</div>
          <div class="form-group">
            <label>API Key</label>
            <div class="api-key-input">
              <input type="password" id="openaiKey" placeholder="sk-xxxxxxxxxxxx">
              <button class="btn btn-secondary" id="testOpenai">Test</button>
            </div>
            <div style="margin-top: 8px;">
              <span class="status-badge unknown" id="openaiStatus">
                <span>●</span> Not tested
              </span>
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" id="saveApiKeys">Save API Keys</button>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
          <div style="font-size: 11px; color: #fbbf24;">
            ⚠️ API keys are stored in browser localStorage. For production, use environment variables or a secure backend.
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        setState: () => {},
        log: console.log,
      };

      // Available models
      const MODELS = [
        { id: 'flux-schnell', name: 'Flux Schnell', desc: 'Fastest inference (4 steps)', provider: 'replicate', defaultSteps: 4 },
        { id: 'flux-dev', name: 'Flux Dev', desc: 'Higher quality (28 steps)', provider: 'replicate', defaultSteps: 28 },
        { id: 'sdxl', name: 'Stable Diffusion XL', desc: 'Classic SDXL model', provider: 'replicate', defaultSteps: 30 },
        { id: 'sdxl-lightning', name: 'SDXL Lightning', desc: 'Ultra-fast SDXL (4 steps)', provider: 'replicate', defaultSteps: 4 },
        { id: 'kandinsky', name: 'Kandinsky 2.2', desc: 'Alternative architecture', provider: 'replicate', defaultSteps: 50 },
        { id: 'dall-e-3', name: 'DALL-E 3', desc: 'OpenAI model', provider: 'openai', defaultSteps: 1 },
      ];

      // State
      let config = {
        systemPrompt: '',
        basePrompt: '',
        negativePrompt: '',
        selectedModel: 'flux-schnell',
        inferenceSteps: 4,
        guidanceScale: 7.5,
        batchSize: 4,
        stylePresets: [],
        apiKeys: { replicate: '', openai: '' },
      };

      // Storage keys
      const CONFIG_KEY = 'sn_ai_config';

      // DOM refs
      const tabs = document.querySelectorAll('.tab');
      const tabContents = document.querySelectorAll('.tab-content');
      const modelList = document.getElementById('modelList');
      const presetList = document.getElementById('presetList');

      // Initialize
      API.onMount(function(context) {
        loadConfig();
        setupEventListeners();
        renderModels();
        renderPresets();
        API.log('AIConfigurator mounted');
      });

      function setupEventListeners() {
        // Tabs
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
          });
        });

        // Sliders
        document.getElementById('inferenceSteps').addEventListener('input', (e) => {
          document.getElementById('stepsValue').textContent = e.target.value;
          config.inferenceSteps = parseInt(e.target.value);
        });

        document.getElementById('guidanceScale').addEventListener('input', (e) => {
          document.getElementById('cfgValue').textContent = e.target.value;
          config.guidanceScale = parseFloat(e.target.value);
        });

        document.getElementById('batchSize').addEventListener('change', (e) => {
          config.batchSize = parseInt(e.target.value);
        });

        // Save buttons
        document.getElementById('savePrompts').addEventListener('click', savePrompts);
        document.getElementById('saveModelConfig').addEventListener('click', saveModelConfig);
        document.getElementById('saveApiKeys').addEventListener('click', saveApiKeys);
        document.getElementById('savePreset').addEventListener('click', saveNewPreset);
        document.getElementById('addPreset').addEventListener('click', () => {
          document.getElementById('presetName').value = '';
          document.getElementById('presetPrompt').value = '';
        });

        // Test buttons
        document.getElementById('testPrompt').addEventListener('click', testGeneration);
        document.getElementById('testReplicate').addEventListener('click', () => testApiConnection('replicate'));
        document.getElementById('testOpenai').addEventListener('click', () => testApiConnection('openai'));
      }

      function loadConfig() {
        try {
          const stored = localStorage.getItem(CONFIG_KEY);
          if (stored) {
            config = { ...config, ...JSON.parse(stored) };
          }

          // Populate form fields
          document.getElementById('systemPrompt').value = config.systemPrompt || '';
          document.getElementById('basePrompt').value = config.basePrompt || '';
          document.getElementById('negativePrompt').value = config.negativePrompt || '';
          document.getElementById('inferenceSteps').value = config.inferenceSteps;
          document.getElementById('stepsValue').textContent = config.inferenceSteps;
          document.getElementById('guidanceScale').value = config.guidanceScale;
          document.getElementById('cfgValue').textContent = config.guidanceScale;
          document.getElementById('batchSize').value = config.batchSize;
          document.getElementById('replicateKey').value = config.apiKeys?.replicate || '';
          document.getElementById('openaiKey').value = config.apiKeys?.openai || '';

          API.log('Loaded AI config');
        } catch (err) {
          API.log('Error loading config: ' + err.message);
        }
      }

      function saveConfig() {
        try {
          localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
          emitConfigUpdated();
        } catch (err) {
          API.log('Error saving config: ' + err.message);
        }
      }

      function savePrompts() {
        config.systemPrompt = document.getElementById('systemPrompt').value;
        config.basePrompt = document.getElementById('basePrompt').value;
        config.negativePrompt = document.getElementById('negativePrompt').value;
        saveConfig();
        API.emitOutput('prompt.system', config.systemPrompt);
        API.log('Prompts saved');
      }

      function saveModelConfig() {
        config.inferenceSteps = parseInt(document.getElementById('inferenceSteps').value);
        config.guidanceScale = parseFloat(document.getElementById('guidanceScale').value);
        config.batchSize = parseInt(document.getElementById('batchSize').value);
        saveConfig();
        API.emitOutput('model.selected', {
          modelId: config.selectedModel,
          steps: config.inferenceSteps,
          guidance: config.guidanceScale,
          batchSize: config.batchSize,
        });
        API.log('Model config saved');
      }

      function saveApiKeys() {
        config.apiKeys = {
          replicate: document.getElementById('replicateKey').value,
          openai: document.getElementById('openaiKey').value,
        };

        // Also store in sessionStorage for widgets to access
        if (config.apiKeys.replicate) {
          sessionStorage.setItem('sn_VITE_REPLICATE_API_TOKEN', config.apiKeys.replicate);
        }
        if (config.apiKeys.openai) {
          sessionStorage.setItem('sn_VITE_OPENAI_API_KEY', config.apiKeys.openai);
        }

        // Store in window config for iframe widgets
        window.StickerNestConfig = window.StickerNestConfig || {};
        window.StickerNestConfig.VITE_REPLICATE_API_TOKEN = config.apiKeys.replicate;
        window.StickerNestConfig.VITE_OPENAI_API_KEY = config.apiKeys.openai;

        saveConfig();
        API.log('API keys saved');
      }

      function renderModels() {
        modelList.innerHTML = MODELS.map(m => \`
          <div class="model-card \${config.selectedModel === m.id ? 'selected' : ''}" data-id="\${m.id}">
            <div class="model-name">\${m.name}</div>
            <div class="model-desc">\${m.desc} • \${m.provider}</div>
          </div>
        \`).join('');

        modelList.querySelectorAll('.model-card').forEach(card => {
          card.addEventListener('click', () => {
            config.selectedModel = card.dataset.id;
            const model = MODELS.find(m => m.id === card.dataset.id);
            if (model) {
              document.getElementById('inferenceSteps').value = model.defaultSteps;
              document.getElementById('stepsValue').textContent = model.defaultSteps;
              config.inferenceSteps = model.defaultSteps;
            }
            renderModels();
            API.emitOutput('model.selected', { modelId: config.selectedModel });
          });
        });
      }

      function renderPresets() {
        if (!config.stylePresets || config.stylePresets.length === 0) {
          presetList.innerHTML = '<div style="color: #64748b; font-size: 11px; padding: 12px;">No presets yet. Add one below.</div>';
          return;
        }

        presetList.innerHTML = config.stylePresets.map((p, i) => \`
          <div class="preset-item">
            <div>
              <div class="preset-name">\${p.name}</div>
              <div style="display: flex; gap: 6px; margin-top: 4px;">
                <div style="width: 16px; height: 16px; border-radius: 4px; background: \${p.primaryColor};"></div>
                <div style="width: 16px; height: 16px; border-radius: 4px; background: \${p.secondaryColor};"></div>
              </div>
            </div>
            <div class="preset-actions">
              <button class="btn btn-secondary btn-edit-preset" data-index="\${i}">Edit</button>
              <button class="btn btn-danger btn-delete-preset" data-index="\${i}">×</button>
            </div>
          </div>
        \`).join('');

        presetList.querySelectorAll('.btn-delete-preset').forEach(btn => {
          btn.addEventListener('click', () => {
            config.stylePresets.splice(parseInt(btn.dataset.index), 1);
            saveConfig();
            renderPresets();
            emitPresetsReady();
          });
        });

        presetList.querySelectorAll('.btn-edit-preset').forEach(btn => {
          btn.addEventListener('click', () => {
            const preset = config.stylePresets[parseInt(btn.dataset.index)];
            document.getElementById('presetName').value = preset.name;
            document.getElementById('presetPrompt').value = preset.prompt;
            document.getElementById('presetPrimaryColor').value = preset.primaryColor;
            document.getElementById('presetSecondaryColor').value = preset.secondaryColor;
          });
        });
      }

      function saveNewPreset() {
        const name = document.getElementById('presetName').value.trim();
        const prompt = document.getElementById('presetPrompt').value.trim();
        const primaryColor = document.getElementById('presetPrimaryColor').value;
        const secondaryColor = document.getElementById('presetSecondaryColor').value;

        if (!name) {
          alert('Please enter a preset name');
          return;
        }

        const preset = {
          id: 'preset-' + Date.now(),
          name: name,
          prompt: prompt,
          primaryColor: primaryColor,
          secondaryColor: secondaryColor,
        };

        // Check if updating existing
        const existingIdx = config.stylePresets.findIndex(p => p.name === name);
        if (existingIdx >= 0) {
          config.stylePresets[existingIdx] = preset;
        } else {
          config.stylePresets.push(preset);
        }

        saveConfig();
        renderPresets();
        emitPresetsReady();

        // Clear form
        document.getElementById('presetName').value = '';
        document.getElementById('presetPrompt').value = '';

        API.log('Preset saved: ' + name);
      }

      async function testApiConnection(provider) {
        const statusEl = document.getElementById(provider + 'Status');
        statusEl.className = 'status-badge unknown';
        statusEl.innerHTML = '<span>●</span> Testing...';

        const key = provider === 'replicate'
          ? document.getElementById('replicateKey').value
          : document.getElementById('openaiKey').value;

        if (!key) {
          statusEl.className = 'status-badge disconnected';
          statusEl.innerHTML = '<span>●</span> No key provided';
          return;
        }

        try {
          if (provider === 'replicate') {
            const response = await fetch('https://api.replicate.com/v1/models', {
              headers: { 'Authorization': 'Token ' + key },
            });

            if (response.ok) {
              statusEl.className = 'status-badge connected';
              statusEl.innerHTML = '<span>●</span> Connected';
              API.emitOutput('connection.status', { provider: 'replicate', connected: true });
            } else {
              throw new Error('Invalid response');
            }
          } else if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': 'Bearer ' + key },
            });

            if (response.ok) {
              statusEl.className = 'status-badge connected';
              statusEl.innerHTML = '<span>●</span> Connected';
              API.emitOutput('connection.status', { provider: 'openai', connected: true });
            } else {
              throw new Error('Invalid response');
            }
          }
        } catch (err) {
          statusEl.className = 'status-badge disconnected';
          statusEl.innerHTML = '<span>●</span> Failed to connect';
          API.emitOutput('connection.status', { provider: provider, connected: false, error: err.message });
        }
      }

      function testGeneration() {
        API.log('Test generation requested');
        API.emitOutput('config.updated', getFullConfig());
      }

      function emitConfigUpdated() {
        API.emitOutput('config.updated', getFullConfig());
      }

      function emitPresetsReady() {
        API.emitOutput('presets.ready', config.stylePresets);
      }

      function getFullConfig() {
        return {
          systemPrompt: config.systemPrompt,
          basePrompt: config.basePrompt,
          negativePrompt: config.negativePrompt,
          selectedModel: config.selectedModel,
          inferenceSteps: config.inferenceSteps,
          guidanceScale: config.guidanceScale,
          batchSize: config.batchSize,
          stylePresets: config.stylePresets,
          hasReplicateKey: !!config.apiKeys?.replicate,
          hasOpenaiKey: !!config.apiKeys?.openai,
        };
      }

      // Input handlers
      API.onInput('trigger.load', loadConfig);

      API.onInput('api.setKey', function(data) {
        if (data && data.provider && data.key) {
          config.apiKeys[data.provider] = data.key;
          saveConfig();
          if (data.provider === 'replicate') {
            document.getElementById('replicateKey').value = data.key;
          } else if (data.provider === 'openai') {
            document.getElementById('openaiKey').value = data.key;
          }
        }
      });

      API.onInput('api.testConnection', testApiConnection);

    })();
  </script>
</body>
</html>
`;

export const AIConfiguratorWidget: BuiltinWidget = {
  manifest: AIConfiguratorManifest,
  html: AIConfiguratorHTML,
};
