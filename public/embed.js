/**
 * StickerNest v2 - Embeddable Canvas
 *
 * Lightweight embeddable script for embedding StickerNest canvases anywhere.
 * Usage: <sticker-canvas canvas-id="abc123" mode="view"></sticker-canvas>
 *
 * @version 1.0.0
 */

(function() {
  'use strict';

  // Configuration
  const STICKERNEST_BASE_URL = window.STICKERNEST_BASE_URL || 'https://stickernest.com';
  const API_BASE_URL = window.STICKERNEST_API_URL || `${STICKERNEST_BASE_URL}/api`;
  const EMBED_VERSION = '1.0.0';

  // Styles for the web component
  const COMPONENT_STYLES = `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 400px;
      min-height: 200px;
      border-radius: 8px;
      overflow: hidden;
      background: #0a0a14;
    }

    .sticker-canvas-container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .sticker-canvas-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    .sticker-canvas-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      background: #0a0a14;
      color: #94a3b8;
    }

    .sticker-canvas-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(139, 92, 246, 0.2);
      border-top-color: #8b5cf6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sticker-canvas-error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      background: #0a0a14;
      color: #ef4444;
      padding: 20px;
      text-align: center;
    }

    .sticker-canvas-error-icon {
      font-size: 32px;
    }

    .sticker-canvas-error-message {
      font-size: 14px;
      max-width: 300px;
    }

    .sticker-canvas-branding {
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.3);
      text-decoration: none;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
    }

    .sticker-canvas-branding:hover {
      color: rgba(255, 255, 255, 0.6);
      background: rgba(0, 0, 0, 0.7);
    }

    .sticker-canvas-fullscreen-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .sticker-canvas-container:hover .sticker-canvas-fullscreen-btn {
      opacity: 1;
    }

    .sticker-canvas-fullscreen-btn:hover {
      background: rgba(0, 0, 0, 0.7);
      color: white;
    }
  `;

  // ============================================================================
  // STICKER-CANVAS WEB COMPONENT
  // ============================================================================

  class StickerCanvas extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._loaded = false;
      this._error = null;
      this._iframe = null;
      this._messageHandler = this._handleMessage.bind(this);
    }

    static get observedAttributes() {
      return ['canvas-id', 'mode', 'theme', 'token', 'show-branding'];
    }

    // Getters for attributes
    get canvasId() { return this.getAttribute('canvas-id'); }
    get mode() { return this.getAttribute('mode') || 'view'; }
    get theme() { return this.getAttribute('theme') || 'dark'; }
    get token() { return this.getAttribute('token'); }
    get showBranding() { return this.getAttribute('show-branding') !== 'false'; }

    connectedCallback() {
      this._render();
      this._loadCanvas();
      window.addEventListener('message', this._messageHandler);
    }

    disconnectedCallback() {
      window.removeEventListener('message', this._messageHandler);
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue !== newValue && this._loaded) {
        if (name === 'canvas-id') {
          this._loadCanvas();
        } else {
          this._updateIframe();
        }
      }
    }

    _render() {
      const style = document.createElement('style');
      style.textContent = COMPONENT_STYLES;

      const container = document.createElement('div');
      container.className = 'sticker-canvas-container';
      container.innerHTML = `
        <div class="sticker-canvas-loading">
          <div class="sticker-canvas-spinner"></div>
          <span>Loading canvas...</span>
        </div>
      `;

      this.shadowRoot.appendChild(style);
      this.shadowRoot.appendChild(container);
    }

    async _loadCanvas() {
      const container = this.shadowRoot.querySelector('.sticker-canvas-container');
      const canvasId = this.canvasId;

      if (!canvasId) {
        this._showError('No canvas ID provided');
        return;
      }

      try {
        // Show loading state
        container.innerHTML = `
          <div class="sticker-canvas-loading">
            <div class="sticker-canvas-spinner"></div>
            <span>Loading canvas...</span>
          </div>
        `;

        // Validate canvas exists and is accessible
        const validation = await this._validateCanvas(canvasId);
        if (!validation.valid) {
          this._showError(validation.error || 'Canvas not found');
          return;
        }

        // Create iframe for canvas
        this._createIframe(canvasId, validation.embedUrl);

      } catch (error) {
        this._showError(error.message || 'Failed to load canvas');
      }
    }

    async _validateCanvas(canvasId) {
      try {
        const params = new URLSearchParams({
          canvasId,
          mode: this.mode,
          ...(this.token && { token: this.token })
        });

        const response = await fetch(`${API_BASE_URL}/embed/validate?${params}`);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          return { valid: false, error: data.error || 'Canvas not accessible' };
        }

        const data = await response.json();
        return {
          valid: true,
          embedUrl: data.embedUrl || `${STICKERNEST_BASE_URL}/embed/${canvasId}`
        };

      } catch (error) {
        // If API is unavailable, try direct embed
        console.warn('[StickerCanvas] Validation failed, attempting direct embed:', error);
        return {
          valid: true,
          embedUrl: `${STICKERNEST_BASE_URL}/embed/${canvasId}`
        };
      }
    }

    _createIframe(canvasId, embedUrl) {
      const container = this.shadowRoot.querySelector('.sticker-canvas-container');

      // Build iframe URL with parameters
      const url = new URL(embedUrl);
      url.searchParams.set('mode', this.mode);
      url.searchParams.set('theme', this.theme);
      url.searchParams.set('embed', 'true');
      url.searchParams.set('v', EMBED_VERSION);
      if (this.token) {
        url.searchParams.set('token', this.token);
      }

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.className = 'sticker-canvas-iframe';
      iframe.src = url.toString();
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope';
      iframe.loading = 'lazy';

      // Handle load event
      iframe.onload = () => {
        this._loaded = true;
        this._error = null;
        this.dispatchEvent(new CustomEvent('load', { detail: { canvasId } }));
      };

      // Handle error
      iframe.onerror = () => {
        this._showError('Failed to load canvas iframe');
      };

      // Build container content
      container.innerHTML = '';
      container.appendChild(iframe);

      // Add fullscreen button
      const fullscreenBtn = document.createElement('button');
      fullscreenBtn.className = 'sticker-canvas-fullscreen-btn';
      fullscreenBtn.innerHTML = '⛶';
      fullscreenBtn.title = 'Fullscreen';
      fullscreenBtn.onclick = () => this._toggleFullscreen();
      container.appendChild(fullscreenBtn);

      // Add branding if enabled
      if (this.showBranding) {
        const branding = document.createElement('a');
        branding.className = 'sticker-canvas-branding';
        branding.href = STICKERNEST_BASE_URL;
        branding.target = '_blank';
        branding.rel = 'noopener';
        branding.textContent = 'Powered by StickerNest';
        container.appendChild(branding);
      }

      this._iframe = iframe;
    }

    _updateIframe() {
      if (!this._iframe) return;

      const url = new URL(this._iframe.src);
      url.searchParams.set('mode', this.mode);
      url.searchParams.set('theme', this.theme);

      this._iframe.src = url.toString();
    }

    _showError(message) {
      this._error = message;
      this._loaded = false;

      const container = this.shadowRoot.querySelector('.sticker-canvas-container');
      container.innerHTML = `
        <div class="sticker-canvas-error">
          <div class="sticker-canvas-error-icon">⚠️</div>
          <div class="sticker-canvas-error-message">${this._escapeHtml(message)}</div>
        </div>
      `;

      this.dispatchEvent(new CustomEvent('error', { detail: { message } }));
    }

    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    _toggleFullscreen() {
      if (!document.fullscreenElement) {
        this.requestFullscreen?.() || this.webkitRequestFullscreen?.();
      } else {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      }
    }

    _handleMessage(event) {
      // Only handle messages from our iframe
      if (this._iframe && event.source === this._iframe.contentWindow) {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'stickernest:ready':
            this.dispatchEvent(new CustomEvent('ready', { detail: payload }));
            break;

          case 'stickernest:event':
            this.dispatchEvent(new CustomEvent('canvas-event', { detail: payload }));
            break;

          case 'stickernest:resize':
            if (payload && payload.height) {
              this.style.height = `${payload.height}px`;
            }
            break;

          case 'stickernest:error':
            this._showError(payload?.message || 'Unknown error');
            break;
        }
      }
    }

    // Public API
    reload() {
      this._loadCanvas();
    }

    sendEvent(type, payload) {
      if (this._iframe && this._iframe.contentWindow) {
        this._iframe.contentWindow.postMessage({
          type: 'stickernest:external-event',
          payload: { type, payload }
        }, '*');
      }
    }

    getState() {
      return {
        loaded: this._loaded,
        error: this._error,
        canvasId: this.canvasId,
        mode: this.mode
      };
    }
  }

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  // Register the custom element
  if (!customElements.get('sticker-canvas')) {
    customElements.define('sticker-canvas', StickerCanvas);
  }

  // Expose global API
  window.StickerNest = window.StickerNest || {};
  window.StickerNest.embed = {
    version: EMBED_VERSION,
    baseUrl: STICKERNEST_BASE_URL,

    // Create canvas programmatically
    create(container, options = {}) {
      const element = document.createElement('sticker-canvas');

      if (options.canvasId) element.setAttribute('canvas-id', options.canvasId);
      if (options.mode) element.setAttribute('mode', options.mode);
      if (options.theme) element.setAttribute('theme', options.theme);
      if (options.token) element.setAttribute('token', options.token);
      if (options.showBranding === false) element.setAttribute('show-branding', 'false');

      if (options.width) element.style.width = typeof options.width === 'number' ? `${options.width}px` : options.width;
      if (options.height) element.style.height = typeof options.height === 'number' ? `${options.height}px` : options.height;

      if (typeof container === 'string') {
        container = document.querySelector(container);
      }

      if (container) {
        container.appendChild(element);
      }

      return element;
    },

    // Find all canvas elements
    findAll() {
      return Array.from(document.querySelectorAll('sticker-canvas'));
    }
  };

  // Log initialization
  console.log(`[StickerNest] Embed v${EMBED_VERSION} loaded`);

})();
