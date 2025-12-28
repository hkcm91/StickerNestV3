/**
 * StickerNest v2 - Signal Tester Widget
 *
 * A comprehensive debugging widget for testing all signal types across the widget library.
 * Shows visual feedback for signal status:
 * - Green: Signal sent/received successfully
 * - Yellow: Permission required (API key, auth, etc.)
 * - Red: Error in sending/receiving
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const SignalTesterWidgetManifest: WidgetManifest = {
  id: 'stickernest.signal-tester',
  name: 'Signal Tester',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Debug widget for testing all signal types. Connect to any widget to test sending and receiving signals with visual status feedback.',
  author: 'StickerNest',
  tags: ['debug', 'testing', 'signals', 'pipeline', 'developer'],
  inputs: {
    // Universal input ports for testing any widget
    'trigger': { type: 'trigger', description: 'Trigger signal input' },
    'string': { type: 'string', description: 'String data input' },
    'number': { type: 'number', description: 'Number data input' },
    'boolean': { type: 'boolean', description: 'Boolean data input' },
    'object': { type: 'object', description: 'Object/JSON data input' },
    'array': { type: 'array', description: 'Array data input' },
    'any': { type: 'any', description: 'Any type data input' },
    'event': { type: 'event', description: 'Event data input' },
    // Common capability inputs
    'text.set': { type: 'string', description: 'Text set command' },
    'data.set': { type: 'object', description: 'Data set command' },
    'state.set': { type: 'object', description: 'State set command' },
    'action.trigger': { type: 'trigger', description: 'Action trigger' },
    'ui.clicked': { type: 'trigger', description: 'UI click event' },
    'timer.tick': { type: 'number', description: 'Timer tick event' },
    'counter.changed': { type: 'number', description: 'Counter changed event' },
    'form.submitted': { type: 'object', description: 'Form submission event' },
    'selection.changed': { type: 'any', description: 'Selection changed event' },
  },
  outputs: {
    // Universal output ports for testing any widget
    'trigger': { type: 'trigger', description: 'Trigger signal output' },
    'string': { type: 'string', description: 'String data output' },
    'number': { type: 'number', description: 'Number data output' },
    'boolean': { type: 'boolean', description: 'Boolean data output' },
    'object': { type: 'object', description: 'Object/JSON data output' },
    'array': { type: 'array', description: 'Array data output' },
    'any': { type: 'any', description: 'Any type data output' },
    'event': { type: 'event', description: 'Event data output' },
    // Common capability outputs
    'text.changed': { type: 'string', description: 'Text changed event' },
    'data.changed': { type: 'object', description: 'Data changed event' },
    'state.changed': { type: 'object', description: 'State changed event' },
    'ui.clicked': { type: 'trigger', description: 'UI click event' },
    'button.pressed': { type: 'trigger', description: 'Button pressed event' },
    'timer.complete': { type: 'trigger', description: 'Timer complete event' },
    'counter.value': { type: 'number', description: 'Counter value output' },
    'form.data': { type: 'object', description: 'Form data output' },
    'selection.value': { type: 'any', description: 'Selection value output' },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: [
      'trigger', 'string', 'number', 'boolean', 'object', 'array', 'any', 'event',
      'text.set', 'data.set', 'state.set', 'action.trigger', 'ui.clicked',
      'timer.tick', 'counter.changed', 'form.submitted', 'selection.changed'
    ],
    outputs: [
      'trigger', 'string', 'number', 'boolean', 'object', 'array', 'any', 'event',
      'text.changed', 'data.changed', 'state.changed', 'ui.clicked', 'button.pressed',
      'timer.complete', 'counter.value', 'form.data', 'selection.value'
    ],
  },
  size: {
    width: 420,
    height: 520,
    minWidth: 360,
    minHeight: 400,
    scaleMode: 'scale',
  },
};

export const SignalTesterWidgetHTML = `
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
      background: linear-gradient(135deg, #0f172a 0%, #1e1e2e 100%);
      color: var(--sn-text-primary, #e2e8f0);
      padding: 12px;
      overflow: hidden;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #8b5cf6;
    }
    .badge {
      font-size: 9px;
      padding: 2px 6px;
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stats {
      display: flex;
      gap: 12px;
      font-size: 11px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .stat-dot.sent { background: #22c55e; }
    .stat-dot.received { background: #3b82f6; }
    .stat-dot.error { background: #ef4444; }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .tab {
      flex: 1;
      padding: 8px;
      font-size: 11px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .tab:hover { background: rgba(255,255,255,0.1); }
    .tab.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #a78bfa;
    }

    /* Panel Content */
    .panel { display: none; flex: 1; overflow: hidden; flex-direction: column; }
    .panel.active { display: flex; }

    /* Send Panel */
    .send-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .control-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .control-label {
      font-size: 10px;
      color: #64748b;
      min-width: 50px;
    }
    select, input, textarea {
      flex: 1;
      padding: 6px 8px;
      font-size: 11px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      color: #e2e8f0;
      outline: none;
    }
    select:focus, input:focus, textarea:focus {
      border-color: rgba(139, 92, 246, 0.5);
    }
    textarea {
      resize: none;
      height: 60px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 10px;
    }
    .send-btn {
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    .send-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
    .send-btn:active { transform: translateY(0); }
    .send-btn.sending {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    }

    /* Quick Send Buttons */
    .quick-send {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .quick-btn {
      padding: 4px 8px;
      font-size: 9px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.15s;
    }
    .quick-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.4);
      color: #a78bfa;
    }

    /* Log Panel */
    .log-container {
      flex: 1;
      overflow-y: auto;
      margin-top: 8px;
    }
    .log-entry {
      display: flex;
      gap: 8px;
      padding: 8px;
      margin-bottom: 6px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      border-left: 3px solid #64748b;
      font-size: 10px;
      animation: slideIn 0.2s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .log-entry.sent { border-left-color: #22c55e; }
    .log-entry.received { border-left-color: #3b82f6; }
    .log-entry.error { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .log-entry.warning { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

    .log-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .log-icon.sent { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .log-icon.received { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .log-icon.error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .log-icon.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

    .log-content { flex: 1; overflow: hidden; }
    .log-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .log-port {
      font-weight: 600;
      color: #e2e8f0;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .log-time {
      color: #64748b;
      font-size: 9px;
    }
    .log-payload {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 9px;
      color: #94a3b8;
      background: rgba(0,0,0,0.2);
      padding: 4px 6px;
      border-radius: 3px;
      max-height: 40px;
      overflow: hidden;
      word-break: break-all;
    }
    .log-latency {
      font-size: 9px;
      color: #22c55e;
      margin-top: 4px;
    }

    /* Status Panel */
    .status-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .status-card {
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
      padding: 10px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .status-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .status-port {
      font-size: 10px;
      font-weight: 600;
      color: #e2e8f0;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #64748b;
      transition: all 0.3s;
    }
    .status-indicator.success {
      background: #22c55e;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }
    .status-indicator.warning {
      background: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
    }
    .status-indicator.error {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
    }
    .status-indicator.active {
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    .status-stats {
      display: flex;
      gap: 12px;
      font-size: 9px;
      color: #64748b;
    }
    .status-stat {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .status-stat span {
      color: #94a3b8;
    }

    /* Clear Button */
    .clear-btn {
      padding: 6px 12px;
      font-size: 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 4px;
      color: #ef4444;
      cursor: pointer;
      margin-top: 8px;
      flex-shrink: 0;
    }
    .clear-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Empty state */
    .empty-state {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 11px;
      text-align: center;
    }

    /* Type badges */
    .type-badge {
      font-size: 8px;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      margin-left: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <span class="title">Signal Tester</span>
        <span class="badge">Debug</span>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-dot sent"></div>
          <span id="sentCount">0</span>
        </div>
        <div class="stat">
          <div class="stat-dot received"></div>
          <span id="receivedCount">0</span>
        </div>
        <div class="stat">
          <div class="stat-dot error"></div>
          <span id="errorCount">0</span>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" data-tab="send">Send</div>
      <div class="tab" data-tab="receive">Receive</div>
      <div class="tab" data-tab="status">Status</div>
    </div>

    <!-- Send Panel -->
    <div class="panel active" data-panel="send">
      <div class="send-controls">
        <div class="control-row">
          <span class="control-label">Port</span>
          <select id="sendPort">
            <optgroup label="Basic Types">
              <option value="trigger">trigger</option>
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="object">object</option>
              <option value="array">array</option>
              <option value="any">any</option>
              <option value="event">event</option>
            </optgroup>
            <optgroup label="Common Signals">
              <option value="text.changed">text.changed</option>
              <option value="data.changed">data.changed</option>
              <option value="state.changed">state.changed</option>
              <option value="ui.clicked">ui.clicked</option>
              <option value="button.pressed">button.pressed</option>
              <option value="timer.complete">timer.complete</option>
              <option value="counter.value">counter.value</option>
              <option value="form.data">form.data</option>
              <option value="selection.value">selection.value</option>
            </optgroup>
          </select>
        </div>
        <div class="control-row">
          <span class="control-label">Type</span>
          <select id="valueType">
            <option value="trigger">Trigger (empty)</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="json">JSON Object</option>
          </select>
        </div>
        <div class="control-row" id="valueRow">
          <span class="control-label">Value</span>
          <input type="text" id="sendValue" placeholder="Enter value..." />
        </div>
        <button class="send-btn" id="sendBtn">Send Signal</button>
      </div>

      <div class="quick-send">
        <button class="quick-btn" data-port="trigger" data-value="">Trigger</button>
        <button class="quick-btn" data-port="string" data-value="Hello World">Hello</button>
        <button class="quick-btn" data-port="number" data-value="42">42</button>
        <button class="quick-btn" data-port="boolean" data-value="true">true</button>
        <button class="quick-btn" data-port="object" data-value='{"test":true}'>Object</button>
        <button class="quick-btn" data-port="ui.clicked" data-value="">Click</button>
        <button class="quick-btn" data-port="button.pressed" data-value="">Press</button>
        <button class="quick-btn" data-port="counter.value" data-value="100">100</button>
      </div>

      <div class="log-container" id="sendLog">
        <div class="empty-state">No signals sent yet.<br/>Use the controls above to send test signals.</div>
      </div>
    </div>

    <!-- Receive Panel -->
    <div class="panel" data-panel="receive">
      <div class="log-container" id="receiveLog">
        <div class="empty-state">No signals received yet.<br/>Connect this widget to others via pipelines.</div>
      </div>
      <button class="clear-btn" id="clearReceived">Clear Log</button>
    </div>

    <!-- Status Panel -->
    <div class="panel" data-panel="status">
      <div class="status-grid" id="statusGrid">
        <!-- Status cards generated dynamically -->
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let state = {
        sentCount: 0,
        receivedCount: 0,
        errorCount: 0,
        sendLog: [],
        receiveLog: [],
        portStatus: {}
      };

      // Port definitions for status tracking
      const inputPorts = [
        'trigger', 'string', 'number', 'boolean', 'object', 'array', 'any', 'event',
        'text.set', 'data.set', 'state.set', 'action.trigger', 'ui.clicked',
        'timer.tick', 'counter.changed', 'form.submitted', 'selection.changed'
      ];

      const outputPorts = [
        'trigger', 'string', 'number', 'boolean', 'object', 'array', 'any', 'event',
        'text.changed', 'data.changed', 'state.changed', 'ui.clicked', 'button.pressed',
        'timer.complete', 'counter.value', 'form.data', 'selection.value'
      ];

      // Initialize port status
      function initPortStatus() {
        inputPorts.forEach(function(port) {
          state.portStatus['in:' + port] = { sent: 0, received: 0, errors: 0, lastStatus: 'idle', lastTime: null };
        });
        outputPorts.forEach(function(port) {
          state.portStatus['out:' + port] = { sent: 0, received: 0, errors: 0, lastStatus: 'idle', lastTime: null };
        });
      }

      // Format timestamp
      function formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
               '.' + String(date.getMilliseconds()).padStart(3, '0');
      }

      // Truncate long strings
      function truncate(str, len) {
        if (!str) return '';
        var s = typeof str === 'string' ? str : JSON.stringify(str);
        return s.length > len ? s.substring(0, len) + '...' : s;
      }

      // Update UI counters
      function updateCounters() {
        document.getElementById('sentCount').textContent = state.sentCount;
        document.getElementById('receivedCount').textContent = state.receivedCount;
        document.getElementById('errorCount').textContent = state.errorCount;
      }

      // Add log entry
      function addLogEntry(container, entry) {
        var log = document.getElementById(container);
        var empty = log.querySelector('.empty-state');
        if (empty) empty.remove();

        var div = document.createElement('div');
        div.className = 'log-entry ' + entry.type;

        var iconSymbol = entry.type === 'sent' ? '↑' :
                         entry.type === 'received' ? '↓' :
                         entry.type === 'warning' ? '!' : '✕';

        div.innerHTML =
          '<div class="log-icon ' + entry.type + '">' + iconSymbol + '</div>' +
          '<div class="log-content">' +
            '<div class="log-header">' +
              '<span class="log-port">' + entry.port + '<span class="type-badge">' + entry.dataType + '</span></span>' +
              '<span class="log-time">' + entry.time + '</span>' +
            '</div>' +
            '<div class="log-payload">' + truncate(entry.payload, 100) + '</div>' +
            (entry.latency ? '<div class="log-latency">Latency: ' + entry.latency + 'ms</div>' : '') +
            (entry.message ? '<div class="log-latency" style="color: ' + (entry.type === 'error' ? '#ef4444' : '#f59e0b') + '">' + entry.message + '</div>' : '') +
          '</div>';

        log.insertBefore(div, log.firstChild);

        // Keep log size manageable
        while (log.children.length > 50) {
          log.removeChild(log.lastChild);
        }
      }

      // Update status grid
      function updateStatusGrid() {
        var grid = document.getElementById('statusGrid');
        grid.innerHTML = '';

        // Show output ports (what we send)
        outputPorts.slice(0, 12).forEach(function(port) {
          var status = state.portStatus['out:' + port];
          var statusClass = status.lastStatus === 'success' ? 'success' :
                           status.lastStatus === 'warning' ? 'warning' :
                           status.lastStatus === 'error' ? 'error' : '';
          var isActive = status.lastTime && (Date.now() - status.lastTime) < 2000;

          var card = document.createElement('div');
          card.className = 'status-card';
          card.innerHTML =
            '<div class="status-card-header">' +
              '<span class="status-port">↑ ' + port + '</span>' +
              '<div class="status-indicator ' + statusClass + (isActive ? ' active' : '') + '"></div>' +
            '</div>' +
            '<div class="status-stats">' +
              '<div class="status-stat">Sent: <span>' + status.sent + '</span></div>' +
              '<div class="status-stat">Err: <span>' + status.errors + '</span></div>' +
            '</div>';
          grid.appendChild(card);
        });

        // Show input ports (what we receive)
        inputPorts.slice(0, 12).forEach(function(port) {
          var status = state.portStatus['in:' + port];
          var statusClass = status.lastStatus === 'success' ? 'success' :
                           status.lastStatus === 'warning' ? 'warning' :
                           status.lastStatus === 'error' ? 'error' : '';
          var isActive = status.lastTime && (Date.now() - status.lastTime) < 2000;

          var card = document.createElement('div');
          card.className = 'status-card';
          card.innerHTML =
            '<div class="status-card-header">' +
              '<span class="status-port">↓ ' + port + '</span>' +
              '<div class="status-indicator ' + statusClass + (isActive ? ' active' : '') + '"></div>' +
            '</div>' +
            '<div class="status-stats">' +
              '<div class="status-stat">Recv: <span>' + status.received + '</span></div>' +
              '<div class="status-stat">Err: <span>' + status.errors + '</span></div>' +
            '</div>';
          grid.appendChild(card);
        });
      }

      // Send signal
      function sendSignal(port, value, dataType) {
        var startTime = Date.now();
        var parsedValue = value;

        try {
          // Parse value based on type
          if (dataType === 'trigger') {
            parsedValue = { triggered: true, timestamp: Date.now() };
          } else if (dataType === 'number') {
            parsedValue = parseFloat(value) || 0;
          } else if (dataType === 'boolean') {
            parsedValue = value === 'true' || value === true;
          } else if (dataType === 'json') {
            parsedValue = JSON.parse(value);
          }

          // Emit the signal
          API.emitOutput(port, parsedValue);

          // Update state
          state.sentCount++;
          state.portStatus['out:' + port].sent++;
          state.portStatus['out:' + port].lastStatus = 'success';
          state.portStatus['out:' + port].lastTime = Date.now();

          // Log it
          addLogEntry('sendLog', {
            type: 'sent',
            port: port,
            dataType: dataType,
            payload: parsedValue,
            time: formatTime(new Date()),
            latency: Date.now() - startTime
          });

          // Flash send button
          var btn = document.getElementById('sendBtn');
          btn.classList.add('sending');
          setTimeout(function() { btn.classList.remove('sending'); }, 200);

          API.log('Signal sent: ' + port + ' = ' + JSON.stringify(parsedValue));

        } catch (err) {
          state.errorCount++;
          state.portStatus['out:' + port].errors++;
          state.portStatus['out:' + port].lastStatus = 'error';
          state.portStatus['out:' + port].lastTime = Date.now();

          addLogEntry('sendLog', {
            type: 'error',
            port: port,
            dataType: dataType,
            payload: value,
            time: formatTime(new Date()),
            message: err.message
          });

          API.error('Send error: ' + err.message);
        }

        updateCounters();
        updateStatusGrid();
        API.setState({ sentCount: state.sentCount, errorCount: state.errorCount });
      }

      // Handle received signal
      function handleInput(port, value, isPermissionRequired) {
        var receiveTime = Date.now();

        state.receivedCount++;
        state.portStatus['in:' + port].received++;

        if (isPermissionRequired) {
          state.portStatus['in:' + port].lastStatus = 'warning';
          addLogEntry('receiveLog', {
            type: 'warning',
            port: port,
            dataType: typeof value,
            payload: value,
            time: formatTime(new Date()),
            message: 'Permission may be required (API key, auth, etc.)'
          });
        } else {
          state.portStatus['in:' + port].lastStatus = 'success';
          addLogEntry('receiveLog', {
            type: 'received',
            port: port,
            dataType: typeof value,
            payload: value,
            time: formatTime(new Date())
          });
        }

        state.portStatus['in:' + port].lastTime = receiveTime;

        updateCounters();
        updateStatusGrid();
        API.setState({ receivedCount: state.receivedCount });
        API.log('Signal received: ' + port + ' = ' + JSON.stringify(value));
      }

      // Check if value indicates permission requirement
      function checkPermissionRequired(value) {
        if (!value) return false;
        var str = JSON.stringify(value).toLowerCase();
        return str.includes('api_key') || str.includes('apikey') ||
               str.includes('auth') || str.includes('permission') ||
               str.includes('token') || str.includes('credential') ||
               str.includes('unauthorized') || str.includes('forbidden');
      }

      // Tab switching
      document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
          document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
          tab.classList.add('active');
          document.querySelector('[data-panel="' + tab.dataset.tab + '"]').classList.add('active');

          if (tab.dataset.tab === 'status') {
            updateStatusGrid();
          }
        });
      });

      // Send button click
      document.getElementById('sendBtn').addEventListener('click', function() {
        var port = document.getElementById('sendPort').value;
        var valueType = document.getElementById('valueType').value;
        var value = document.getElementById('sendValue').value;
        sendSignal(port, value, valueType);
      });

      // Quick send buttons
      document.querySelectorAll('.quick-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var port = btn.dataset.port;
          var value = btn.dataset.value;
          var type = value === '' ? 'trigger' :
                    (value.startsWith('{') || value.startsWith('[')) ? 'json' :
                    !isNaN(value) ? 'number' : 'string';
          sendSignal(port, value, type);
        });
      });

      // Clear received log
      document.getElementById('clearReceived').addEventListener('click', function() {
        var log = document.getElementById('receiveLog');
        log.innerHTML = '<div class="empty-state">No signals received yet.<br/>Connect this widget to others via pipelines.</div>';
        state.receiveLog = [];
      });

      // Value type change
      document.getElementById('valueType').addEventListener('change', function() {
        var row = document.getElementById('valueRow');
        var input = document.getElementById('sendValue');
        if (this.value === 'trigger') {
          row.style.display = 'none';
        } else {
          row.style.display = 'flex';
          if (this.value === 'json') {
            input.placeholder = '{"key": "value"}';
          } else if (this.value === 'number') {
            input.placeholder = '42';
          } else if (this.value === 'boolean') {
            input.placeholder = 'true or false';
          } else {
            input.placeholder = 'Enter value...';
          }
        }
      });

      // Initialize
      API.onMount(function(context) {
        initPortStatus();

        if (context.state) {
          state.sentCount = context.state.sentCount || 0;
          state.receivedCount = context.state.receivedCount || 0;
          state.errorCount = context.state.errorCount || 0;
        }

        updateCounters();
        updateStatusGrid();
        API.log('Signal Tester ready');
      });

      // Register all input handlers
      inputPorts.forEach(function(port) {
        API.onInput(port, function(value) {
          var permRequired = checkPermissionRequired(value);
          handleInput(port, value, permRequired);
        });
      });

      // Also listen to all events for comprehensive monitoring
      API.onEvent('*', function(event) {
        // Skip internal events
        if (event.type.startsWith('bridge:') || event.type.startsWith('debug:')) return;

        // Check if this is a pipeline event we should log
        if (event.type.startsWith('pipeline:')) {
          var permRequired = checkPermissionRequired(event.payload);
          handleInput('event:' + event.type, event.payload, permRequired);
        }
      });

      API.onStateChange(function(newState) {
        if (newState.sentCount !== undefined) state.sentCount = newState.sentCount;
        if (newState.receivedCount !== undefined) state.receivedCount = newState.receivedCount;
        if (newState.errorCount !== undefined) state.errorCount = newState.errorCount;
        updateCounters();
      });

      API.onDestroy(function() {
        API.log('Signal Tester destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const SignalTesterWidget: BuiltinWidget = {
  manifest: SignalTesterWidgetManifest,
  html: SignalTesterWidgetHTML,
};
