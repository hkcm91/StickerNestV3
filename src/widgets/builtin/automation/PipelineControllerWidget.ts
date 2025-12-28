/**
 * Pipeline Controller Widget (System Widget)
 *
 * Pipeline owner control panel for orchestrating the generation flow.
 * - Wire widgets together
 * - Monitor pipeline status
 * - Control execution flow
 * - View logs and debug info
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const PipelineControllerManifest: WidgetManifest = {
  id: 'stickernest.pipeline-controller',
  name: 'Pipeline Controller',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'System widget for pipeline owners to orchestrate the generation flow. Wire widgets, monitor status, control execution.',
  author: 'StickerNest',
  tags: ['system', 'admin', 'pipeline', 'controller', 'orchestration'],
  inputs: {
    startPipeline: {
      type: 'trigger',
      description: 'Start the pipeline',
    },
    stopPipeline: {
      type: 'trigger',
      description: 'Stop the pipeline',
    },
    resetPipeline: {
      type: 'trigger',
      description: 'Reset pipeline state',
    },
    // Incoming data from other widgets
    userDataReceived: {
      type: 'object',
      description: 'User form data from UI widget',
    },
    templateReceived: {
      type: 'object',
      description: 'Template data from template manager',
    },
    configReceived: {
      type: 'object',
      description: 'AI config from configurator',
    },
    imageReceived: {
      type: 'object',
      description: 'Generated image from AI widget',
    },
    compositeReceived: {
      type: 'object',
      description: 'Final composite from compositor',
    },
  },
  outputs: {
    // Pipeline commands to other widgets
    triggerTemplateEngine: {
      type: 'object',
      description: 'Trigger template processing',
    },
    triggerAIGeneration: {
      type: 'object',
      description: 'Trigger AI image generation',
    },
    triggerCompositor: {
      type: 'object',
      description: 'Trigger final composition',
    },
    pipelineStatus: {
      type: 'object',
      description: 'Current pipeline status',
    },
    pipelineComplete: {
      type: 'object',
      description: 'Final output when pipeline completes',
    },
    logEntry: {
      type: 'object',
      description: 'Log entry for debugging',
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
      'trigger.start',
      'trigger.stop',
      'trigger.reset',
      'data.user',
      'data.template',
      'data.config',
      'data.image',
      'data.composite',
    ],
    outputs: [
      'trigger.templateEngine',
      'trigger.aiGeneration',
      'trigger.compositor',
      'status.pipeline',
      'pipeline.complete',
      'log.entry',
      'error.occurred',
    ],
  },
  size: {
    width: 450,
    height: 400,
    minWidth: 400,
    minHeight: 350,
  },
};

export const PipelineControllerHTML = `
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
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #e2e8f0;
    }
    .header {
      padding: 14px 16px;
      background: rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header h2 {
      font-size: 14px;
      font-weight: 600;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-indicator.idle {
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
    }
    .status-indicator.running {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      animation: pulse 2s infinite;
    }
    .status-indicator.complete {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .status-indicator.error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .controls {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-start {
      background: #22c55e;
      color: white;
    }
    .btn-stop {
      background: #ef4444;
      color: white;
    }
    .btn-reset {
      background: rgba(255,255,255,0.1);
      color: #e2e8f0;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pipeline-view {
      flex: 1;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
    }
    .stage {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stage.active {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    .stage.complete {
      border-color: #22c55e;
    }
    .stage.error {
      border-color: #ef4444;
    }
    .stage-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: rgba(255,255,255,0.05);
    }
    .stage.active .stage-icon {
      background: rgba(59, 130, 246, 0.2);
    }
    .stage.complete .stage-icon {
      background: rgba(34, 197, 94, 0.2);
    }
    .stage-info {
      flex: 1;
    }
    .stage-name {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .stage-desc {
      font-size: 10px;
      color: #64748b;
    }
    .stage-status {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.05);
    }
    .stage.active .stage-status {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    .stage.complete .stage-status {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .arrow {
      display: flex;
      justify-content: center;
      color: #475569;
      font-size: 14px;
    }
    .log-panel {
      height: 120px;
      background: rgba(0,0,0,0.3);
      border-top: 1px solid rgba(255,255,255,0.05);
      padding: 8px 12px;
      overflow-y: auto;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 10px;
    }
    .log-entry {
      padding: 2px 0;
      display: flex;
      gap: 8px;
    }
    .log-time {
      color: #64748b;
      min-width: 60px;
    }
    .log-level {
      min-width: 40px;
      font-weight: 500;
    }
    .log-level.info { color: #60a5fa; }
    .log-level.success { color: #22c55e; }
    .log-level.warn { color: #f59e0b; }
    .log-level.error { color: #ef4444; }
    .log-message {
      color: #cbd5e1;
    }
    .data-preview {
      margin-top: 8px;
      padding: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      font-size: 9px;
      color: #94a3b8;
      max-height: 60px;
      overflow-y: auto;
      font-family: 'Monaco', 'Consolas', monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h2>🔧 Pipeline Controller</h2>
        <div class="status-indicator idle" id="statusIndicator">
          <span>●</span> <span id="statusText">Idle</span>
        </div>
      </div>
      <div class="controls">
        <button class="btn btn-start" id="btnStart">▶ Start</button>
        <button class="btn btn-stop" id="btnStop" disabled>■ Stop</button>
        <button class="btn btn-reset" id="btnReset">↻ Reset</button>
      </div>
    </div>

    <div class="pipeline-view">
      <div class="stage" id="stage-collect" data-stage="collect">
        <div class="stage-icon">📝</div>
        <div class="stage-info">
          <div class="stage-name">Data Collection</div>
          <div class="stage-desc">User form data & template selection</div>
        </div>
        <div class="stage-status">Waiting</div>
      </div>

      <div class="arrow">↓</div>

      <div class="stage" id="stage-template" data-stage="template">
        <div class="stage-icon">📋</div>
        <div class="stage-info">
          <div class="stage-name">Template Engine</div>
          <div class="stage-desc">Generate prompt & reactive mask</div>
        </div>
        <div class="stage-status">Waiting</div>
      </div>

      <div class="arrow">↓</div>

      <div class="stage" id="stage-generate" data-stage="generate">
        <div class="stage-icon">🤖</div>
        <div class="stage-info">
          <div class="stage-name">AI Generation</div>
          <div class="stage-desc">Generate design backgrounds</div>
        </div>
        <div class="stage-status">Waiting</div>
      </div>

      <div class="arrow">↓</div>

      <div class="stage" id="stage-composite" data-stage="composite">
        <div class="stage-icon">🎨</div>
        <div class="stage-info">
          <div class="stage-name">Compositor</div>
          <div class="stage-desc">Overlay text & export final design</div>
        </div>
        <div class="stage-status">Waiting</div>
      </div>
    </div>

    <div class="log-panel" id="logPanel">
      <div class="log-entry">
        <span class="log-time">--:--:--</span>
        <span class="log-level info">INFO</span>
        <span class="log-message">Pipeline controller ready</span>
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

      // Pipeline state
      const STAGES = ['collect', 'template', 'generate', 'composite'];

      let state = {
        status: 'idle', // idle, running, complete, error
        currentStage: null,
        stageStatus: {
          collect: 'waiting',
          template: 'waiting',
          generate: 'waiting',
          composite: 'waiting',
        },
        userData: null,
        template: null,
        config: null,
        generatedImage: null,
        finalOutput: null,
        logs: [],
      };

      // DOM refs
      const statusIndicator = document.getElementById('statusIndicator');
      const statusText = document.getElementById('statusText');
      const btnStart = document.getElementById('btnStart');
      const btnStop = document.getElementById('btnStop');
      const btnReset = document.getElementById('btnReset');
      const logPanel = document.getElementById('logPanel');

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        setupEventListeners();
        updateUI();
        log('info', 'Pipeline controller initialized');
      });

      function setupEventListeners() {
        btnStart.addEventListener('click', startPipeline);
        btnStop.addEventListener('click', stopPipeline);
        btnReset.addEventListener('click', resetPipeline);
      }

      function startPipeline() {
        if (state.status === 'running') return;

        log('info', 'Starting pipeline...');
        state.status = 'running';
        state.currentStage = 'collect';
        updateStageStatus('collect', 'active');
        updateUI();
        emitStatus();

        // Check if we have enough data to proceed
        if (state.userData && state.template) {
          log('success', 'Data already available, proceeding to template engine');
          proceedToStage('template');
        } else {
          log('info', 'Waiting for user data and template...');
        }
      }

      function stopPipeline() {
        log('warn', 'Pipeline stopped by user');
        state.status = 'idle';
        state.currentStage = null;
        updateUI();
        emitStatus();
      }

      function resetPipeline() {
        log('info', 'Pipeline reset');
        state = {
          status: 'idle',
          currentStage: null,
          stageStatus: {
            collect: 'waiting',
            template: 'waiting',
            generate: 'waiting',
            composite: 'waiting',
          },
          userData: null,
          template: null,
          config: null,
          generatedImage: null,
          finalOutput: null,
          logs: state.logs,
        };
        updateUI();
        emitStatus();
      }

      function proceedToStage(stage) {
        const stageIndex = STAGES.indexOf(stage);
        if (stageIndex > 0) {
          updateStageStatus(STAGES[stageIndex - 1], 'complete');
        }

        state.currentStage = stage;
        updateStageStatus(stage, 'active');
        updateUI();
        emitStatus();

        // Trigger the appropriate widget
        switch (stage) {
          case 'template':
            log('info', 'Triggering template engine...');
            API.emitOutput('trigger.templateEngine', {
              templateId: state.template?.id,
              userData: state.userData,
              config: state.config,
            });
            break;

          case 'generate':
            log('info', 'Triggering AI generation...');
            API.emitOutput('trigger.aiGeneration', {
              prompt: state.template?.processedPrompt,
              mask: state.template?.mask,
              config: state.config,
            });
            break;

          case 'composite':
            log('info', 'Triggering compositor...');
            API.emitOutput('trigger.compositor', {
              baseImage: state.generatedImage,
              template: state.template,
              userData: state.userData,
            });
            break;
        }
      }

      function completePipeline() {
        updateStageStatus('composite', 'complete');
        state.status = 'complete';
        state.currentStage = null;
        updateUI();
        emitStatus();

        log('success', 'Pipeline complete!');
        API.emitOutput('pipeline.complete', state.finalOutput);
      }

      function updateStageStatus(stage, status) {
        state.stageStatus[stage] = status;
        const el = document.getElementById('stage-' + stage);
        if (el) {
          el.className = 'stage ' + (status === 'active' ? 'active' : status === 'complete' ? 'complete' : '');
          el.querySelector('.stage-status').textContent =
            status === 'waiting' ? 'Waiting' :
            status === 'active' ? 'Processing...' :
            status === 'complete' ? 'Done ✓' :
            status;
        }
      }

      function updateUI() {
        // Status indicator
        statusIndicator.className = 'status-indicator ' + state.status;
        statusText.textContent =
          state.status === 'idle' ? 'Idle' :
          state.status === 'running' ? 'Running' :
          state.status === 'complete' ? 'Complete' :
          'Error';

        // Buttons
        btnStart.disabled = state.status === 'running';
        btnStop.disabled = state.status !== 'running';

        // Update all stages
        STAGES.forEach(stage => {
          const status = state.stageStatus[stage];
          updateStageStatus(stage, status);
        });
      }

      function emitStatus() {
        API.emitOutput('status.pipeline', {
          status: state.status,
          currentStage: state.currentStage,
          stageStatus: state.stageStatus,
          hasUserData: !!state.userData,
          hasTemplate: !!state.template,
          hasConfig: !!state.config,
        });
      }

      function log(level, message) {
        const time = new Date().toLocaleTimeString();
        state.logs.push({ time, level, message });

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = \`
          <span class="log-time">\${time}</span>
          <span class="log-level \${level}">\${level.toUpperCase()}</span>
          <span class="log-message">\${message}</span>
        \`;
        logPanel.appendChild(entry);
        logPanel.scrollTop = logPanel.scrollHeight;

        API.emitOutput('log.entry', { time, level, message });
        API.log('[' + level + '] ' + message);
      }

      // Input handlers
      API.onInput('trigger.start', startPipeline);
      API.onInput('trigger.stop', stopPipeline);
      API.onInput('trigger.reset', resetPipeline);

      API.onInput('data.user', function(data) {
        log('info', 'User data received');
        state.userData = data;
        updateStageStatus('collect', state.template ? 'complete' : 'active');

        if (state.status === 'running' && state.template) {
          proceedToStage('template');
        }
      });

      API.onInput('data.template', function(data) {
        log('info', 'Template received: ' + (data?.name || data?.id));
        state.template = data;

        if (state.status === 'running' && state.userData) {
          proceedToStage('template');
        }
      });

      API.onInput('data.config', function(data) {
        log('info', 'AI config received');
        state.config = data;
      });

      API.onInput('data.image', function(data) {
        log('success', 'Generated image received');
        state.generatedImage = data;
        updateStageStatus('generate', 'complete');

        if (state.status === 'running') {
          proceedToStage('composite');
        }
      });

      API.onInput('data.composite', function(data) {
        log('success', 'Final composite received');
        state.finalOutput = data;
        completePipeline();
      });

      // Also listen for processed template from template engine
      API.onInput('template.processed', function(data) {
        log('info', 'Template processed, prompt ready');
        state.template = { ...state.template, ...data };
        updateStageStatus('template', 'complete');

        if (state.status === 'running') {
          proceedToStage('generate');
        }
      });

    })();
  </script>
</body>
</html>
`;

export const PipelineControllerWidget: BuiltinWidget = {
  manifest: PipelineControllerManifest,
  html: PipelineControllerHTML,
};
