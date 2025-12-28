/**
 * AI Image Generator Widget
 *
 * Calls AI image generation APIs to create design backgrounds.
 * Supports multiple providers: Replicate (primary), OpenAI, Gemini, Banana, GPT-Flash.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';
import type {
  AIProviderType,
  GenerationConfig,
  GenerationResult,
  ProgressStatus,
  GenerationStage,
} from './types';

export const AIImageGeneratorManifest: WidgetManifest = {
  id: 'stickernest.ai-image-generator',
  name: 'AI Image Generator',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'Generates images using AI providers (Replicate, OpenAI, Gemini). Supports text-to-image, img2img, and inpainting for design backgrounds.',
  author: 'StickerNest',
  tags: ['automation', 'ai', 'image-generation', 'replicate', 'pipeline'],
  inputs: {
    promptGenerate: {
      type: 'object',
      description: 'Prompt configuration for generation',
      required: true,
    },
    maskInput: {
      type: 'object',
      description: 'Mask for composition guidance',
      required: false,
    },
    compositorPrompt: {
      type: 'string',
      description: 'System prompt explaining black/white zones for AI',
      required: false,
    },
    configProvider: {
      type: 'string',
      description: 'AI provider to use (replicate, openai)',
      default: 'replicate',
    },
    configModel: {
      type: 'string',
      description: 'Model to use (e.g., flux-schnell, sdxl, dall-e-3)',
      default: 'flux-schnell',
    },
    configApiKey: {
      type: 'string',
      description: 'API key for the provider',
      required: false,
    },
    queryModels: {
      type: 'trigger',
      description: 'Request list of available models',
    },
    triggerGenerate: {
      type: 'trigger',
      description: 'Start generation',
    },
    triggerRegenerate: {
      type: 'trigger',
      description: 'Generate new variations',
    },
    triggerBatch: {
      type: 'trigger',
      description: 'Generate batch of images',
    },
    triggerCancel: {
      type: 'trigger',
      description: 'Cancel current generation',
    },
  },
  outputs: {
    imageGenerated: {
      type: 'object',
      description: 'Generated image result',
    },
    batchReady: {
      type: 'array',
      description: 'Multiple generated images',
    },
    modelsAvailable: {
      type: 'array',
      description: 'List of available AI models',
    },
    statusProgress: {
      type: 'object',
      description: 'Generation progress status',
    },
    error: {
      type: 'object',
      description: 'Error information',
    },
  },
  capabilities: {
    draggable: true,
    resizable: false,
    rotatable: false,
  },
  io: {
    inputs: [
      'prompt.generate',
      'mask.input',
      'compositor.prompt',
      'config.provider',
      'config.model',
      'config.apiKey',
      'query.models',
      'trigger.generate',
      'trigger.regenerate',
      'trigger.batch',
      'trigger.cancel',
    ],
    outputs: [
      'image.generated',
      'image.batch',
      'models.available',
      'status.progress',
      'error.occurred',
    ],
  },
  size: {
    width: 200,
    height: 140,
    minWidth: 150,
    minHeight: 120,
  },
};

export const AIImageGeneratorHTML = `
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
      background: linear-gradient(135deg, #1e1b4b 0%, #0f0f19 100%);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      border-radius: 8px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
    }
    .title {
      font-size: 11px;
      font-weight: 600;
      flex: 1;
    }
    .provider-badge {
      font-size: 9px;
      padding: 2px 6px;
      background: rgba(139, 92, 246, 0.2);
      border-radius: 4px;
      color: #a78bfa;
    }
    .status-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .progress-container {
      display: none;
    }
    .progress-container.visible {
      display: block;
    }
    .progress-bar {
      height: 4px;
      background: rgba(139, 92, 246, 0.2);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%);
      width: 0%;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 9px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-top: 4px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      font-size: 9px;
    }
    .stat {
      display: flex;
      justify-content: space-between;
    }
    .stat-label {
      color: var(--sn-text-secondary, #94a3b8);
    }
    .stat-value {
      color: var(--sn-text-primary, #e2e8f0);
      font-weight: 500;
    }
    .stat-value.generating {
      color: #f59e0b;
    }
    .stat-value.ready {
      color: #22c55e;
    }
    .stat-value.error {
      color: #ef4444;
    }
    .thumbnail-preview {
      width: 100%;
      height: 40px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      display: none;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-top: 4px;
    }
    .thumbnail-preview.visible {
      display: flex;
    }
    .thumbnail-preview img {
      height: 100%;
      width: auto;
      object-fit: contain;
    }
    .thumbnail-placeholder {
      font-size: 9px;
      color: var(--sn-text-secondary, #94a3b8);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">AI</div>
      <span class="title">Image Generator</span>
      <span class="provider-badge" id="providerBadge">replicate</span>
    </div>

    <div class="status-area">
      <div class="progress-container" id="progressContainer">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">Initializing...</div>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="stat-label">Status:</span>
          <span class="stat-value" id="statusValue">Idle</span>
        </div>
        <div class="stat">
          <span class="stat-label">Queue:</span>
          <span class="stat-value" id="queueValue">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Generated:</span>
          <span class="stat-value" id="generatedValue">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Time:</span>
          <span class="stat-value" id="timeValue">-</span>
        </div>
      </div>

      <div class="thumbnail-preview" id="thumbnailPreview">
        <span class="thumbnail-placeholder">No preview</span>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        onStateChange: () => {},
        setState: () => {},
        log: console.log,
      };

      // Configuration - Model-agnostic provider/model registry
      const AI_PROVIDERS = {
        replicate: {
          name: 'Replicate',
          envKey: 'VITE_REPLICATE_API_TOKEN',
          models: {
            'flux-schnell': {
              id: 'black-forest-labs/flux-schnell',
              name: 'Flux Schnell (Fast)',
              description: 'Fastest inference, 4 steps',
              defaultSteps: 4,
              supportsMask: false,
            },
            'flux-dev': {
              id: 'black-forest-labs/flux-dev',
              name: 'Flux Dev (Quality)',
              description: 'Higher quality, more steps',
              defaultSteps: 28,
              supportsMask: false,
            },
            'sdxl': {
              id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
              name: 'Stable Diffusion XL',
              description: 'Classic SDXL model',
              defaultSteps: 30,
              supportsMask: true,
            },
            'sdxl-lightning': {
              id: 'bytedance/sdxl-lightning-4step:727e49a643e999d602a896c774a0658ffefea21465756a6ce24b7ea4165eba6a',
              name: 'SDXL Lightning (4-step)',
              description: 'Ultra-fast SDXL variant',
              defaultSteps: 4,
              supportsMask: false,
            },
            'kandinsky': {
              id: 'ai-forever/kandinsky-2.2:ea1addaab376f4dc227f5368bbd8ac01a0edf6bfd21a18f2b1bab8c2e71a48b1',
              name: 'Kandinsky 2.2',
              description: 'Alternative architecture',
              defaultSteps: 50,
              supportsMask: true,
            },
          },
        },
        openai: {
          name: 'OpenAI',
          envKey: 'VITE_OPENAI_API_KEY',
          models: {
            'dall-e-3': {
              id: 'dall-e-3',
              name: 'DALL-E 3',
              description: 'OpenAI latest model',
              defaultSteps: 1,
              supportsMask: false,
            },
          },
        },
      };

      // Get the default model list for dropdown
      function getAvailableModels() {
        const models = [];
        for (const [providerId, provider] of Object.entries(AI_PROVIDERS)) {
          for (const [modelId, model] of Object.entries(provider.models)) {
            models.push({
              id: providerId + ':' + modelId,
              provider: providerId,
              providerName: provider.name,
              modelId: modelId,
              name: model.name,
              description: model.description,
            });
          }
        }
        return models;
      }

      // State
      let state = {
        provider: 'replicate',
        selectedModel: 'flux-schnell',
        apiKey: null,
        currentPrompt: null,
        maskData: null,
        compositorPrompt: null, // System prompt explaining black/white zones
        status: 'idle',
        progress: 0,
        progressMessage: '',
        generatedCount: 0,
        lastGenerationTime: null,
        lastResult: null,
        isGenerating: false,
        abortController: null,
      };

      // DOM Elements
      const providerBadge = document.getElementById('providerBadge');
      const progressContainer = document.getElementById('progressContainer');
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      const statusValue = document.getElementById('statusValue');
      const queueValue = document.getElementById('queueValue');
      const generatedValue = document.getElementById('generatedValue');
      const timeValue = document.getElementById('timeValue');
      const thumbnailPreview = document.getElementById('thumbnailPreview');

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        updateUI();
        API.log('AIImageGenerator mounted');
      });

      // Input handlers
      API.onInput('prompt.generate', function(config) {
        API.log('Prompt config received');
        state.currentPrompt = config;
        API.setState({ currentPrompt: config });
      });

      API.onInput('mask.input', function(maskData) {
        API.log('Mask data received');
        state.maskData = maskData;
        API.setState({ maskData: maskData });
      });

      API.onInput('config.provider', function(provider) {
        state.provider = provider || 'replicate';
        providerBadge.textContent = state.provider;
        API.setState({ provider: state.provider });
      });

      API.onInput('config.model', function(modelId) {
        // Can be just model name or provider:model format
        if (modelId && modelId.includes(':')) {
          const [provider, model] = modelId.split(':');
          state.provider = provider;
          state.selectedModel = model;
        } else {
          state.selectedModel = modelId || 'flux-schnell';
        }
        providerBadge.textContent = state.selectedModel;
        API.setState({ selectedModel: state.selectedModel, provider: state.provider });
        API.log('Model selected: ' + state.provider + ':' + state.selectedModel);
      });

      API.onInput('config.apiKey', function(key) {
        state.apiKey = key;
        API.setState({ apiKey: key });
      });

      // Compositor prompt for zone awareness
      API.onInput('compositor.prompt', function(prompt) {
        state.compositorPrompt = prompt;
        API.log('Compositor prompt received');
      });

      // Request available models
      API.onInput('query.models', function() {
        API.emitOutput('models.available', getAvailableModels());
      });

      API.onInput('trigger.generate', function() {
        if (state.currentPrompt) {
          generateImage(state.currentPrompt, 1);
        } else {
          emitError('NO_PROMPT', 'No prompt configuration received');
        }
      });

      API.onInput('trigger.regenerate', function() {
        if (state.currentPrompt) {
          // Use different seed for variation
          const newConfig = {
            ...state.currentPrompt,
            seed: Math.floor(Math.random() * 2147483647),
          };
          generateImage(newConfig, 1);
        }
      });

      API.onInput('trigger.cancel', function() {
        cancelGeneration();
      });

      // Also support batch generation trigger
      API.onInput('trigger.batch', function(count) {
        if (state.currentPrompt) {
          generateBatch(state.currentPrompt, count || 4);
        }
      });

      // Main generation function
      async function generateImage(config, retryCount = 0) {
        if (state.isGenerating) {
          API.log('Already generating, adding to queue');
          queueValue.textContent = (parseInt(queueValue.textContent) + 1).toString();
          return;
        }

        state.isGenerating = true;
        state.status = 'generating';
        const startTime = Date.now();

        setProgress(0, 'Preparing generation...');
        updateUI();

        try {
          let result;

          switch (state.provider) {
            case 'replicate':
              result = await generateWithReplicate(config);
              break;
            case 'openai':
              result = await generateWithOpenAI(config);
              break;
            case 'mock':
            default:
              result = await generateMock(config);
              break;
          }

          const endTime = Date.now();
          state.lastGenerationTime = Math.round((endTime - startTime) / 1000);
          state.generatedCount++;
          state.lastResult = result;
          state.status = 'ready';
          state.isGenerating = false;

          setProgress(100, 'Generation complete!');
          updateUI();

          // Show thumbnail
          if (result.imageUrl || result.imageData) {
            showThumbnail(result.imageUrl || result.imageData);
          }

          // Emit result
          API.emitOutput('image.generated', result);

          // Emit progress complete
          API.emitOutput('status.progress', {
            stage: 'complete',
            percent: 100,
            message: 'Generation complete',
          });

          API.log('Generation complete in ' + state.lastGenerationTime + 's');

        } catch (error) {
          state.isGenerating = false;
          state.status = 'error';

          // Retry logic with exponential backoff
          if (retryCount < 3 && error.retryable) {
            const delay = Math.pow(2, retryCount) * 1000;
            API.log('Retrying in ' + delay + 'ms...');
            setTimeout(() => generateImage(config, retryCount + 1), delay);
            return;
          }

          setProgress(0, 'Generation failed');
          updateUI();

          emitError('GENERATION_FAILED', error.message || 'Unknown error');
        }
      }

      // Batch generation
      async function generateBatch(config, count) {
        setProgress(0, 'Generating batch of ' + count + '...');

        const results = [];
        for (let i = 0; i < count; i++) {
          const batchConfig = {
            ...config,
            seed: Math.floor(Math.random() * 2147483647),
          };

          try {
            const result = await generateImageInternal(batchConfig);
            results.push(result);
            setProgress(((i + 1) / count) * 100, 'Generated ' + (i + 1) + ' of ' + count);
          } catch (err) {
            results.push({
              success: false,
              error: { code: 'BATCH_ITEM_FAILED', message: err.message },
            });
          }
        }

        state.generatedCount += results.filter(r => r.success).length;
        updateUI();

        API.emitOutput('image.batch', {
          images: results,
          selected: 0,
        });
      }

      // Internal generation (for batch)
      async function generateImageInternal(config) {
        switch (state.provider) {
          case 'replicate':
            return await generateWithReplicate(config);
          case 'mock':
          default:
            return await generateMock(config);
        }
      }

      // Replicate API integration
      async function generateWithReplicate(config) {
        const apiKey = state.apiKey || getEnvApiKey('VITE_REPLICATE_API_TOKEN');

        if (!apiKey) {
          // Fall back to mock if no API key
          API.log('No Replicate API key, using mock generation');
          return await generateMock(config);
        }

        // Get selected model config
        const modelConfig = AI_PROVIDERS.replicate.models[state.selectedModel] ||
                           AI_PROVIDERS.replicate.models['flux-schnell'];
        const model = modelConfig.id;
        const defaultSteps = modelConfig.defaultSteps;

        API.log('Using model: ' + model);
        setProgress(10, 'Connecting to Replicate (' + modelConfig.name + ')...');

        // Build enhanced prompt with compositor instructions if available
        let enhancedPrompt = config.prompt;
        if (state.compositorPrompt) {
          // Prepend compositor zone awareness to prompt
          enhancedPrompt = state.compositorPrompt + '\\n\\n' + config.prompt;
        }

        // Create prediction
        const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': 'Token ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: model.includes(':') ? model.split(':')[1] : undefined,
            model: model.includes(':') ? undefined : model,
            input: {
              prompt: enhancedPrompt,
              negative_prompt: config.negativePrompt || '',
              width: config.width || 1050,
              height: config.height || 600,
              num_inference_steps: config.steps || defaultSteps,
              guidance_scale: config.guidanceScale || 3.5,
              seed: config.seed,
              // Add mask if model supports it and mask is provided
              ...(modelConfig.supportsMask && state.maskData ? {
                mask: state.maskData.dataUrl || state.maskData,
              } : {}),
            },
          }),
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw { message: error.detail || 'Failed to create prediction', retryable: createResponse.status >= 500 };
        }

        const prediction = await createResponse.json();
        setProgress(20, 'Generation queued...');

        // Poll for completion
        let result = prediction;
        let pollCount = 0;
        const maxPolls = 120; // 2 minutes max

        while (result.status !== 'succeeded' && result.status !== 'failed' && pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          const pollResponse = await fetch(result.urls.get, {
            headers: { 'Authorization': 'Token ' + apiKey },
          });

          result = await pollResponse.json();
          pollCount++;

          // Update progress
          const progress = Math.min(20 + (pollCount / maxPolls) * 70, 90);
          setProgress(progress, 'Generating image...');

          API.emitOutput('status.progress', {
            stage: 'generating',
            percent: progress,
            message: 'AI is creating your design...',
          });
        }

        if (result.status === 'failed') {
          throw { message: result.error || 'Generation failed', retryable: false };
        }

        setProgress(95, 'Processing result...');

        const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

        return {
          success: true,
          imageUrl: imageUrl,
          seed: config.seed,
          metadata: {
            model: model,
            provider: 'replicate',
            generationTime: pollCount,
            prompt: config.prompt,
          },
        };
      }

      // OpenAI DALL-E integration (placeholder)
      async function generateWithOpenAI(config) {
        // TODO: Implement OpenAI DALL-E 3 integration
        API.log('OpenAI integration not yet implemented, using mock');
        return await generateMock(config);
      }

      // Mock generation for testing
      async function generateMock(config) {
        setProgress(20, 'Mock generation starting...');

        // Simulate generation time
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setProgress(20 + (i * 7), 'Generating design...');

          API.emitOutput('status.progress', {
            stage: 'generating',
            percent: 20 + (i * 7),
            message: 'Creating your design...',
          });
        }

        setProgress(95, 'Finalizing...');

        // Generate a placeholder image with canvas
        const canvas = document.createElement('canvas');
        canvas.width = config.width || 600;
        canvas.height = config.height || 350;
        const ctx = canvas.getContext('2d');

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(0.5, '#06b6d4');
        gradient.addColorStop(1, '#10b981');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some abstract shapes
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            Math.random() * 100 + 30,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
          ctx.fill();
        }

        // Add "MOCK" watermark
        ctx.globalAlpha = 0.2;
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('MOCK PREVIEW', canvas.width / 2, canvas.height / 2);

        return {
          success: true,
          imageData: canvas.toDataURL('image/png'),
          seed: config.seed,
          metadata: {
            model: 'mock',
            provider: 'mock',
            generationTime: 2,
            prompt: config.prompt,
          },
        };
      }

      // Cancel generation
      function cancelGeneration() {
        if (state.abortController) {
          state.abortController.abort();
        }
        state.isGenerating = false;
        state.status = 'idle';
        setProgress(0, 'Cancelled');
        updateUI();
      }

      // Get API key from environment
      function getEnvApiKey(name) {
        // Try multiple sources for API key
        // 1. Window-level config (set by host app)
        if (window.StickerNestConfig && window.StickerNestConfig[name]) {
          return window.StickerNestConfig[name];
        }
        // 2. Check sessionStorage (for runtime config)
        try {
          const stored = sessionStorage.getItem('sn_' + name);
          if (stored) return stored;
        } catch (e) { /* ignore */ }
        // 3. Check for Vite env vars passed via parent
        if (window.parent && window.parent.VITE_ENV) {
          return window.parent.VITE_ENV[name];
        }
        // 4. Return null to trigger mock mode
        return null;
      }

      // Progress update
      function setProgress(percent, message) {
        state.progress = percent;
        state.progressMessage = message;
        progressFill.style.width = percent + '%';
        progressText.textContent = message;
        progressContainer.classList.toggle('visible', percent > 0 && percent < 100);
      }

      // Show thumbnail preview
      function showThumbnail(src) {
        thumbnailPreview.innerHTML = '<img src="' + src + '" alt="Generated">';
        thumbnailPreview.classList.add('visible');
      }

      // Error emitter
      function emitError(code, message) {
        state.status = 'error';
        updateUI();
        API.emitOutput('error.occurred', { code, message });
        API.log('Error: ' + code + ' - ' + message);
      }

      // Update UI
      function updateUI() {
        statusValue.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
        statusValue.className = 'stat-value ' + state.status;
        generatedValue.textContent = state.generatedCount.toString();
        timeValue.textContent = state.lastGenerationTime ? state.lastGenerationTime + 's' : '-';
      }

      // State change handler
      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        updateUI();
      });

    })();
  </script>
</body>
</html>
`;

export const AIImageGeneratorWidget: BuiltinWidget = {
  manifest: AIImageGeneratorManifest,
  html: AIImageGeneratorHTML,
};
