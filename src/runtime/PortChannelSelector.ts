/**
 * StickerNest v2 - Port Channel Selector
 *
 * Embeddable utility for widgets that need to select which connected widget
 * to send data to when multiple widgets are connected to the same output port.
 *
 * Usage in widgets:
 * 1. Include the inline script in widget HTML
 * 2. Create selector: const selector = PortChannelSelector.create('output-port-name', container);
 * 3. Emit to selected: selector.emitToSelected(data);
 *
 * This is STANDARD across all widgets that have multiple connections.
 */

/**
 * Channel information for connected widgets
 */
export interface ChannelInfo {
  /** Connected widget instance ID */
  widgetId: string;
  /** Connected widget name (for display) */
  widgetName: string;
  /** Target port name on the connected widget */
  targetPort: string;
  /** Connection ID in the pipeline */
  connectionId: string;
}

/**
 * Port channel selector configuration
 */
export interface PortChannelSelectorConfig {
  /** Output port name to manage */
  portName: string;
  /** Label for the dropdown (defaults to "Send to:") */
  label?: string;
  /** Whether to show "All" option (default: true) */
  showAllOption?: boolean;
  /** Callback when selection changes */
  onChange?: (channel: ChannelInfo | 'all' | null) => void;
}

/**
 * Port channel selector strings bundle
 * Using an object to ensure atomic initialization and prevent TDZ issues
 * during production bundling where minification can reorder const declarations
 */
const _PORT_CHANNEL_SELECTOR_BUNDLE = Object.freeze({
  /**
   * Inline HTML/CSS for the channel selector component
   * This can be embedded directly in widget HTML
   */
  STYLES: `
.port-channel-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--sn-bg-tertiary, #252538);
  border-radius: var(--sn-radius-sm, 4px);
  font-size: 11px;
}

.port-channel-selector label {
  color: var(--sn-text-secondary, #94a3b8);
  white-space: nowrap;
}

.port-channel-selector select {
  flex: 1;
  min-width: 100px;
  padding: 4px 8px;
  background: var(--sn-bg-secondary, #1a1a2e);
  color: var(--sn-text-primary, #e2e8f0);
  border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
  border-radius: var(--sn-radius-sm, 4px);
  font-size: 11px;
  cursor: pointer;
  outline: none;
}

.port-channel-selector select:hover {
  border-color: var(--sn-accent-primary, #8b5cf6);
}

.port-channel-selector select:focus {
  border-color: var(--sn-accent-primary, #8b5cf6);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.port-channel-selector select option {
  background: var(--sn-bg-secondary, #1a1a2e);
  color: var(--sn-text-primary, #e2e8f0);
}

.port-channel-selector .channel-count {
  color: var(--sn-text-secondary, #94a3b8);
  font-size: 10px;
}

.port-channel-selector.no-connections {
  opacity: 0.5;
}

.port-channel-selector.no-connections select {
  cursor: not-allowed;
}
`,

  /**
   * Generate inline script for port channel selector
   * Include this in widget HTML to enable channel selection
   */
  SCRIPT: `
/**
 * PortChannelSelector - Embeddable widget utility
 * Allows selecting which connected widget to send data to
 */
window.PortChannelSelector = (function() {
  'use strict';

  // Store instances by port name
  var instances = {};

  // Channel data from pipeline
  var channelData = {};

  /**
   * Create a new port channel selector
   * @param {string} portName - Output port name
   * @param {HTMLElement} container - Container element for the selector
   * @param {Object} options - Configuration options
   * @returns {Object} Selector instance
   */
  function create(portName, container, options) {
    options = options || {};

    var label = options.label || 'Send to:';
    var showAllOption = options.showAllOption !== false;
    var onChange = options.onChange || function() {};

    // Create elements
    var wrapper = document.createElement('div');
    wrapper.className = 'port-channel-selector no-connections';

    var labelEl = document.createElement('label');
    labelEl.textContent = label;

    var select = document.createElement('select');
    select.disabled = true;

    var countEl = document.createElement('span');
    countEl.className = 'channel-count';
    countEl.textContent = '(0)';

    // Add "All" option if enabled
    if (showAllOption) {
      var allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'All Connected';
      select.appendChild(allOption);
    }

    // Add placeholder
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'No connections';
    placeholder.disabled = true;
    if (!showAllOption) placeholder.selected = true;
    select.appendChild(placeholder);

    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    wrapper.appendChild(countEl);
    container.appendChild(wrapper);

    // Current selection
    var selectedChannel = showAllOption ? 'all' : null;

    // Handle selection change
    select.addEventListener('change', function() {
      var value = select.value;
      if (value === 'all') {
        selectedChannel = 'all';
        onChange('all');
      } else if (value && channelData[portName]) {
        var channel = channelData[portName].find(function(c) {
          return c.connectionId === value;
        });
        selectedChannel = channel || null;
        onChange(channel || null);
      } else {
        selectedChannel = null;
        onChange(null);
      }
    });

    // Instance object
    var instance = {
      portName: portName,
      element: wrapper,

      /**
       * Update available channels
       * @param {Array} channels - Array of ChannelInfo objects
       */
      setChannels: function(channels) {
        channelData[portName] = channels || [];

        // Clear existing options (except All and placeholder)
        while (select.options.length > (showAllOption ? 2 : 1)) {
          select.remove(showAllOption ? 2 : 1);
        }

        // Add channel options
        channels.forEach(function(channel) {
          var option = document.createElement('option');
          option.value = channel.connectionId;
          option.textContent = channel.widgetName + ' (' + channel.targetPort + ')';
          select.appendChild(option);
        });

        // Update state
        var hasChannels = channels.length > 0;
        wrapper.classList.toggle('no-connections', !hasChannels);
        select.disabled = !hasChannels;
        countEl.textContent = '(' + channels.length + ')';

        // Update placeholder
        if (!showAllOption) {
          placeholder.textContent = hasChannels ? 'Select target...' : 'No connections';
        }

        // Reset selection if current channel is gone
        if (selectedChannel && selectedChannel !== 'all') {
          var stillExists = channels.some(function(c) {
            return c.connectionId === selectedChannel.connectionId;
          });
          if (!stillExists) {
            selectedChannel = showAllOption ? 'all' : null;
            select.value = showAllOption ? 'all' : '';
          }
        }
      },

      /**
       * Get currently selected channel
       * @returns {Object|string|null} Selected channel, 'all', or null
       */
      getSelected: function() {
        return selectedChannel;
      },

      /**
       * Set selected channel programmatically
       * @param {string} connectionId - Connection ID or 'all'
       */
      setSelected: function(connectionId) {
        select.value = connectionId;
        select.dispatchEvent(new Event('change'));
      },

      /**
       * Emit data to selected channel(s)
       * Uses WidgetAPI to emit with target info
       * @param {*} data - Data to emit
       */
      emitToSelected: function(data) {
        var API = window.WidgetAPI;
        if (!API) {
          console.warn('[PortChannelSelector] WidgetAPI not available');
          return;
        }

        if (selectedChannel === 'all' || !selectedChannel) {
          // Emit to all (default behavior)
          API.emitOutput(portName, data);
        } else {
          // Emit to specific target
          API.emitOutput(portName, data, {
            targetWidgetId: selectedChannel.widgetId,
            targetPort: selectedChannel.targetPort,
            connectionId: selectedChannel.connectionId
          });
        }
      },

      /**
       * Destroy the selector
       */
      destroy: function() {
        wrapper.remove();
        delete instances[portName];
        delete channelData[portName];
      }
    };

    instances[portName] = instance;
    return instance;
  }

  /**
   * Get existing instance for a port
   * @param {string} portName - Port name
   * @returns {Object|null} Instance or null
   */
  function getInstance(portName) {
    return instances[portName] || null;
  }

  /**
   * Update channels from pipeline info
   * Called by host when connections change
   * @param {string} portName - Port name
   * @param {Array} channels - Channel info array
   */
  function updateChannels(portName, channels) {
    var instance = instances[portName];
    if (instance) {
      instance.setChannels(channels);
    } else {
      // Store for later if instance doesn't exist yet
      channelData[portName] = channels;
    }
  }

  /**
   * Get all instances
   * @returns {Object} Map of portName -> instance
   */
  function getAllInstances() {
    return Object.assign({}, instances);
  }

  // Public API
  return {
    create: create,
    getInstance: getInstance,
    updateChannels: updateChannels,
    getAllInstances: getAllInstances
  };
})();
`,
});

// Export getter functions to avoid TDZ issues when used in template literals at module load time
// Using functions ensures the value is resolved at call time, not at import time
export function PORT_CHANNEL_SELECTOR_STYLES(): string {
  return _PORT_CHANNEL_SELECTOR_BUNDLE.STYLES;
}

export function PORT_CHANNEL_SELECTOR_SCRIPT(): string {
  return _PORT_CHANNEL_SELECTOR_BUNDLE.SCRIPT;
}

/**
 * Combined styles and script for embedding in widgets
 */
export function getPortChannelSelectorEmbed(): string {
  return `
<style>
${PORT_CHANNEL_SELECTOR_STYLES()}
</style>
<script>
${PORT_CHANNEL_SELECTOR_SCRIPT()}
</script>
`;
}

/**
 * Helper function to generate channel selector HTML block
 * for use in inline widget HTML
 */
export function generateChannelSelectorHTML(portName: string, options?: {
  label?: string;
  showAllOption?: boolean;
  containerId?: string;
}): string {
  const containerId = options?.containerId || `channel-selector-${portName}`;
  const label = options?.label || 'Send to:';
  const showAll = options?.showAllOption !== false;

  return `
    <div id="${containerId}"></div>
    <script>
      (function() {
        var container = document.getElementById('${containerId}');
        if (container && window.PortChannelSelector) {
          window.__channelSelector_${portName.replace(/\./g, '_')} =
            window.PortChannelSelector.create('${portName}', container, {
              label: '${label}',
              showAllOption: ${showAll}
            });
        }
      })();
    </script>
  `;
}
