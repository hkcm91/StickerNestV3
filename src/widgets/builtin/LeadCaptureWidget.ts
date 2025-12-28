/**
 * StickerNest v2 - Lead Capture Widget
 * A configurable form widget for capturing leads on canvas pages
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const LeadCaptureWidgetManifest: WidgetManifest = {
  id: 'stickernest.lead-capture',
  name: 'Lead Capture Form',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Capture leads and customer info with customizable forms',
  kind: 'interactive',
  category: 'commerce',
  tags: ['form', 'lead', 'contact', 'email', 'signup', 'newsletter', 'commerce'],
  icon: '📋',

  defaultSize: {
    width: 360,
    height: 400,
  },
  minSize: {
    width: 280,
    height: 200,
  },
  maxSize: {
    width: 600,
    height: 800,
  },

  inputs: [],
  outputs: [
    {
      id: 'onSubmit',
      name: 'On Submit',
      type: 'event',
      description: 'Fires when form is submitted successfully',
    },
  ],

  config: {
    schema: {
      type: 'object',
      properties: {
        formType: {
          type: 'string',
          default: 'contact',
          enum: ['contact', 'newsletter', 'waitlist', 'inquiry', 'custom'],
          title: 'Form Type',
          description: 'Type of form for categorization',
        },
        title: {
          type: 'string',
          default: 'Get in Touch',
          title: 'Form Title',
        },
        subtitle: {
          type: 'string',
          default: '',
          title: 'Subtitle',
        },
        buttonText: {
          type: 'string',
          default: 'Submit',
          title: 'Button Text',
        },
        successMessage: {
          type: 'string',
          default: 'Thanks! We\'ll be in touch soon.',
          title: 'Success Message',
        },
        showName: {
          type: 'boolean',
          default: true,
          title: 'Show Name Field',
        },
        nameRequired: {
          type: 'boolean',
          default: false,
          title: 'Name Required',
        },
        showEmail: {
          type: 'boolean',
          default: true,
          title: 'Show Email Field',
        },
        emailRequired: {
          type: 'boolean',
          default: true,
          title: 'Email Required',
        },
        showPhone: {
          type: 'boolean',
          default: false,
          title: 'Show Phone Field',
        },
        phoneRequired: {
          type: 'boolean',
          default: false,
          title: 'Phone Required',
        },
        showMessage: {
          type: 'boolean',
          default: true,
          title: 'Show Message Field',
        },
        messageRequired: {
          type: 'boolean',
          default: false,
          title: 'Message Required',
        },
        messagePlaceholder: {
          type: 'string',
          default: 'How can we help?',
          title: 'Message Placeholder',
        },
        customFields: {
          type: 'array',
          default: [],
          title: 'Custom Fields',
          description: 'JSON array of custom field definitions',
        },
        backgroundColor: {
          type: 'string',
          default: '#ffffff',
          title: 'Background Color',
        },
        accentColor: {
          type: 'string',
          default: '#3b82f6',
          title: 'Accent Color',
        },
        borderRadius: {
          type: 'number',
          default: 12,
          title: 'Border Radius',
        },
      },
      required: ['formType', 'showEmail', 'emailRequired'],
    },
  },

  permissions: ['network'],
  sandbox: true,
  trustedOrigins: [],
};

const LeadCaptureWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #1f2937;
      --text-secondary: #6b7280;
      --accent-color: #3b82f6;
      --accent-hover: #2563eb;
      --border-color: #e5e7eb;
      --input-bg: #f9fafb;
      --success-color: #10b981;
      --error-color: #ef4444;
      --border-radius: 12px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      padding: 20px;
      min-height: 100vh;
    }

    .form-container {
      max-width: 100%;
    }

    .form-header {
      margin-bottom: 20px;
      text-align: center;
    }

    .form-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .form-subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--text-color);
    }

    .form-label .required {
      color: var(--error-color);
      margin-left: 2px;
    }

    .form-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 0.95rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--input-bg);
      color: var(--text-color);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input::placeholder {
      color: var(--text-secondary);
    }

    textarea.form-input {
      resize: vertical;
      min-height: 80px;
    }

    .form-input.error {
      border-color: var(--error-color);
    }

    .error-message {
      font-size: 0.75rem;
      color: var(--error-color);
      margin-top: 4px;
    }

    .submit-btn {
      width: 100%;
      padding: 12px 20px;
      font-size: 1rem;
      font-weight: 600;
      color: white;
      background: var(--accent-color);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }

    .submit-btn:hover:not(:disabled) {
      background: var(--accent-hover);
    }

    .submit-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .submit-btn.loading {
      position: relative;
      color: transparent;
    }

    .submit-btn.loading::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      top: 50%;
      left: 50%;
      margin-left: -10px;
      margin-top: -10px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success-state {
      display: none;
      text-align: center;
      padding: 40px 20px;
    }

    .success-state.show {
      display: block;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      background: var(--success-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }

    .success-icon svg {
      width: 32px;
      height: 32px;
      stroke: white;
      stroke-width: 3;
    }

    .success-message {
      font-size: 1.1rem;
      font-weight: 500;
    }

    .form-state {
      display: block;
    }

    .form-state.hidden {
      display: none;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1f2937;
        --text-color: #f9fafb;
        --text-secondary: #9ca3af;
        --border-color: #374151;
        --input-bg: #374151;
      }
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="success-state" id="successState">
      <div class="success-icon">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="success-message" id="successMessage">Thanks! We'll be in touch soon.</p>
    </div>

    <form class="form-state" id="leadForm">
      <div class="form-header">
        <h2 class="form-title" id="formTitle">Get in Touch</h2>
        <p class="form-subtitle" id="formSubtitle"></p>
      </div>

      <div class="form-group" id="nameGroup">
        <label class="form-label" for="nameInput">
          Name<span class="required" id="nameRequired" style="display:none">*</span>
        </label>
        <input type="text" id="nameInput" class="form-input" placeholder="Your name">
      </div>

      <div class="form-group" id="emailGroup">
        <label class="form-label" for="emailInput">
          Email<span class="required" id="emailRequired">*</span>
        </label>
        <input type="email" id="emailInput" class="form-input" placeholder="you@example.com">
      </div>

      <div class="form-group" id="phoneGroup" style="display:none">
        <label class="form-label" for="phoneInput">
          Phone<span class="required" id="phoneRequired" style="display:none">*</span>
        </label>
        <input type="tel" id="phoneInput" class="form-input" placeholder="(555) 123-4567">
      </div>

      <div class="form-group" id="messageGroup">
        <label class="form-label" for="messageInput">
          Message<span class="required" id="messageRequired" style="display:none">*</span>
        </label>
        <textarea id="messageInput" class="form-input" placeholder="How can we help?"></textarea>
      </div>

      <div id="customFieldsContainer"></div>

      <button type="submit" class="submit-btn" id="submitBtn">Submit</button>
    </form>
  </div>

  <script>
    (function() {
      // Widget state
      let config = {};
      let canvasId = '';
      let widgetId = '';
      let isSubmitting = false;

      // Elements
      const form = document.getElementById('leadForm');
      const successState = document.getElementById('successState');
      const successMessage = document.getElementById('successMessage');
      const formTitle = document.getElementById('formTitle');
      const formSubtitle = document.getElementById('formSubtitle');
      const submitBtn = document.getElementById('submitBtn');

      const nameGroup = document.getElementById('nameGroup');
      const nameInput = document.getElementById('nameInput');
      const nameRequired = document.getElementById('nameRequired');

      const emailGroup = document.getElementById('emailGroup');
      const emailInput = document.getElementById('emailInput');
      const emailRequired = document.getElementById('emailRequired');

      const phoneGroup = document.getElementById('phoneGroup');
      const phoneInput = document.getElementById('phoneInput');
      const phoneRequired = document.getElementById('phoneRequired');

      const messageGroup = document.getElementById('messageGroup');
      const messageInput = document.getElementById('messageInput');
      const messageRequired = document.getElementById('messageRequired');

      const customFieldsContainer = document.getElementById('customFieldsContainer');

      // Apply config
      function applyConfig(cfg) {
        config = cfg;

        // Title & subtitle
        formTitle.textContent = cfg.title || 'Get in Touch';
        if (cfg.subtitle) {
          formSubtitle.textContent = cfg.subtitle;
          formSubtitle.style.display = 'block';
        } else {
          formSubtitle.style.display = 'none';
        }

        // Button text
        submitBtn.textContent = cfg.buttonText || 'Submit';

        // Success message
        successMessage.textContent = cfg.successMessage || "Thanks! We'll be in touch soon.";

        // Name field
        nameGroup.style.display = cfg.showName !== false ? 'block' : 'none';
        nameRequired.style.display = cfg.nameRequired ? 'inline' : 'none';

        // Email field
        emailGroup.style.display = cfg.showEmail !== false ? 'block' : 'none';
        emailRequired.style.display = cfg.emailRequired !== false ? 'inline' : 'none';

        // Phone field
        phoneGroup.style.display = cfg.showPhone ? 'block' : 'none';
        phoneRequired.style.display = cfg.phoneRequired ? 'inline' : 'none';

        // Message field
        messageGroup.style.display = cfg.showMessage !== false ? 'block' : 'none';
        messageRequired.style.display = cfg.messageRequired ? 'inline' : 'none';
        messageInput.placeholder = cfg.messagePlaceholder || 'How can we help?';

        // Colors
        if (cfg.backgroundColor) {
          document.documentElement.style.setProperty('--bg-color', cfg.backgroundColor);
        }
        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent-color', cfg.accentColor);
          // Calculate darker hover color
          const hoverColor = adjustBrightness(cfg.accentColor, -20);
          document.documentElement.style.setProperty('--accent-hover', hoverColor);
        }
        if (cfg.borderRadius !== undefined) {
          document.documentElement.style.setProperty('--border-radius', cfg.borderRadius + 'px');
        }

        // Custom fields
        renderCustomFields(cfg.customFields || []);
      }

      function adjustBrightness(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + percent));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));
        return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
      }

      function renderCustomFields(fields) {
        customFieldsContainer.innerHTML = '';
        if (!Array.isArray(fields)) return;

        fields.forEach((field, index) => {
          const group = document.createElement('div');
          group.className = 'form-group';

          const label = document.createElement('label');
          label.className = 'form-label';
          label.textContent = field.label || 'Field ' + (index + 1);
          if (field.required) {
            const req = document.createElement('span');
            req.className = 'required';
            req.textContent = '*';
            label.appendChild(req);
          }

          let input;
          if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'form-input';
          } else if (field.type === 'select' && Array.isArray(field.options)) {
            input = document.createElement('select');
            input.className = 'form-input';
            field.options.forEach(opt => {
              const option = document.createElement('option');
              option.value = opt.value || opt;
              option.textContent = opt.label || opt;
              input.appendChild(option);
            });
          } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
            input.className = 'form-input';
          }

          input.id = 'custom_' + (field.name || index);
          input.name = field.name || 'custom_' + index;
          input.placeholder = field.placeholder || '';
          if (field.required) input.required = true;

          group.appendChild(label);
          group.appendChild(input);
          customFieldsContainer.appendChild(group);
        });
      }

      // Validate form
      function validateForm() {
        let isValid = true;

        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));

        // Email validation
        if (config.showEmail !== false && config.emailRequired !== false) {
          const emailValue = emailInput.value.trim();
          if (!emailValue || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(emailValue)) {
            showError(emailInput, 'Please enter a valid email');
            isValid = false;
          }
        }

        // Name validation
        if (config.showName !== false && config.nameRequired && !nameInput.value.trim()) {
          showError(nameInput, 'Name is required');
          isValid = false;
        }

        // Phone validation
        if (config.showPhone && config.phoneRequired && !phoneInput.value.trim()) {
          showError(phoneInput, 'Phone is required');
          isValid = false;
        }

        // Message validation
        if (config.showMessage !== false && config.messageRequired && !messageInput.value.trim()) {
          showError(messageInput, 'Message is required');
          isValid = false;
        }

        return isValid;
      }

      function showError(input, message) {
        input.classList.add('error');
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.textContent = message;
        input.parentNode.appendChild(errorEl);
      }

      // Collect form data
      function collectFormData() {
        const data = {};

        if (config.showName !== false && nameInput.value.trim()) {
          data.name = nameInput.value.trim();
        }
        if (config.showEmail !== false && emailInput.value.trim()) {
          data.email = emailInput.value.trim();
        }
        if (config.showPhone && phoneInput.value.trim()) {
          data.phone = phoneInput.value.trim();
        }
        if (config.showMessage !== false && messageInput.value.trim()) {
          data.message = messageInput.value.trim();
        }

        // Custom fields
        const customFields = config.customFields || [];
        customFields.forEach((field, index) => {
          const input = document.getElementById('custom_' + (field.name || index));
          if (input && input.value.trim()) {
            data[field.name || 'custom_' + index] = input.value.trim();
          }
        });

        return data;
      }

      // Submit form
      async function submitForm() {
        if (isSubmitting) return;
        if (!validateForm()) return;

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        const formData = collectFormData();

        // Get UTM params from URL
        const urlParams = new URLSearchParams(window.location.search);

        const payload = {
          canvasId: canvasId,
          widgetId: widgetId,
          formType: config.formType || 'contact',
          formData: formData,
          referrer: document.referrer || undefined,
          utm_source: urlParams.get('utm_source') || undefined,
          utm_medium: urlParams.get('utm_medium') || undefined,
          utm_campaign: urlParams.get('utm_campaign') || undefined,
        };

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const response = await fetch(apiBase + '/commerce/forms/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          const result = await response.json();

          if (result.success) {
            // Show success state
            form.classList.add('hidden');
            successState.classList.add('show');

            // Emit success event
            window.parent.postMessage({
              type: 'widget:output',
              outputId: 'onSubmit',
              data: { formData, submissionId: result.data?.submission?.id }
            }, '*');
          } else {
            throw new Error(result.error?.message || 'Submission failed');
          }
        } catch (error) {
          console.error('Form submission error:', error);
          showError(submitBtn, 'Failed to submit. Please try again.');
        } finally {
          isSubmitting = false;
          submitBtn.disabled = false;
          submitBtn.classList.remove('loading');
        }
      }

      // Event listeners
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitForm();
      });

      // Protocol v3 message handler
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            canvasId = payload?.canvasId || '';
            widgetId = payload?.widgetId || '';
            if (payload?.config) {
              applyConfig(payload.config);
            }
            // Signal ready
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:reset':
            form.classList.remove('hidden');
            successState.classList.remove('show');
            form.reset();
            break;
        }
      });

      // Request init
      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const LeadCaptureWidget: BuiltinWidget = {
  manifest: LeadCaptureWidgetManifest,
  html: LeadCaptureWidgetHTML,
};

export default LeadCaptureWidget;
