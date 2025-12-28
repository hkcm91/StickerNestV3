/**
 * StickerNest v2 - Customer Profile Widget
 * Displays and allows editing of customer profile information
 * Connects to SignIn widget via pipeline for auth state
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const CustomerProfileWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-profile',
  name: 'Customer Profile',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Displays and edits customer profile - name, avatar, email preferences',
  kind: 'interactive',
  category: 'signin',
  tags: ['profile', 'account', 'customer', 'settings', 'avatar', 'pipeline'],
  icon: '👤',

  defaultSize: { width: 400, height: 500 },
  minSize: { width: 320, height: 380 },
  maxSize: { width: 600, height: 700 },

  inputs: [
    { id: 'onLogin', name: 'On Login', type: 'object', description: 'Receives login event with customer data' },
    { id: 'refresh', name: 'Refresh', type: 'trigger', description: 'Reload profile data' },
  ],
  outputs: [
    { id: 'onProfileUpdate', name: 'Profile Updated', type: 'object', description: 'Fires when profile is saved' },
    { id: 'onAvatarChange', name: 'Avatar Changed', type: 'object', description: 'Fires when avatar is updated' },
    { id: 'onError', name: 'On Error', type: 'object', description: 'Fires on profile update error' },
  ],

  io: {
    inputs: ['auth.login', 'trigger.refresh'],
    outputs: ['profile.updated', 'avatar.changed', 'error.profile'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'My Profile', title: 'Title' },
        showAvatarUpload: { type: 'boolean', default: true, title: 'Allow Avatar Upload' },
        showEmailPrefs: { type: 'boolean', default: true, title: 'Show Email Preferences' },
        showPasswordChange: { type: 'boolean', default: true, title: 'Show Change Password' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerProfileWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --accent: #8b5cf6;
      --accent-hover: #7c3aed;
      --bg: #ffffff;
      --bg-secondary: #f9fafb;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --input-bg: #f9fafb;
      --success: #10b981;
      --error: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      min-height: 100vh;
    }

    .header { margin-bottom: 24px; }
    .title { font-size: 1.5rem; font-weight: 700; }

    /* Not Logged In */
    .login-prompt {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .login-prompt-icon { font-size: 3rem; margin-bottom: 16px; }

    /* Avatar Section */
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .avatar-container { position: relative; }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 600;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-upload {
      position: absolute;
      bottom: -4px;
      right: -4px;
      width: 28px;
      height: 28px;
      background: var(--accent);
      border: 2px solid var(--bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      font-size: 0.8rem;
    }

    .avatar-upload:hover { background: var(--accent-hover); }

    .avatar-upload input { display: none; }

    .avatar-info { flex: 1; }
    .avatar-name { font-size: 1.2rem; font-weight: 600; margin-bottom: 4px; }
    .avatar-email { font-size: 0.9rem; color: var(--text-secondary); }

    /* Form Sections */
    .section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .section:last-child { border-bottom: none; margin-bottom: 0; }

    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text);
    }

    .form-group { margin-bottom: 16px; }
    .form-group:last-child { margin-bottom: 0; }

    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--text-secondary);
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      font-size: 0.95rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input-bg);
      color: var(--text);
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .form-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Toggle */
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
    }

    .toggle-label { font-size: 0.9rem; }
    .toggle-desc { font-size: 0.8rem; color: var(--text-secondary); }

    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
    }

    .toggle input { opacity: 0; width: 0; height: 0; }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--border);
      border-radius: 12px;
      transition: 0.2s;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }

    .toggle input:checked + .toggle-slider { background: var(--accent); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

    /* Buttons */
    .btn {
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }

    .btn-secondary:hover { background: var(--bg-secondary); }

    .btn-row {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .btn.loading { position: relative; color: transparent; }
    .btn.loading::after {
      content: '';
      position: absolute;
      width: 16px; height: 16px;
      top: 50%; left: 50%;
      margin: -8px 0 0 -8px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Messages */
    .message {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.85rem;
    }

    .message.success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
    }

    .hidden { display: none !important; }

    /* Loading */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1f2937;
        --bg-secondary: #374151;
        --text: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #4b5563;
        --input-bg: #374151;
      }
    }
  </style>
</head>
<body>
  <!-- Not Logged In -->
  <div id="loginPrompt" class="login-prompt">
    <div class="login-prompt-icon">👤</div>
    <p>Sign in to view your profile</p>
  </div>

  <!-- Loading -->
  <div id="loadingState" class="loading-state hidden">
    <div class="spinner"></div>
  </div>

  <!-- Profile Content -->
  <div id="profileContent" class="hidden">
    <div class="header">
      <h2 class="title" id="title">My Profile</h2>
    </div>

    <div id="messageContainer" class="message hidden"></div>

    <!-- Avatar Section -->
    <div class="avatar-section">
      <div class="avatar-container">
        <div class="avatar" id="avatar">?</div>
        <label class="avatar-upload" id="avatarUploadBtn">
          <input type="file" accept="image/*" id="avatarInput">
          📷
        </label>
      </div>
      <div class="avatar-info">
        <div class="avatar-name" id="displayName">Customer</div>
        <div class="avatar-email" id="displayEmail"></div>
      </div>
    </div>

    <form id="profileForm">
      <!-- Personal Info -->
      <div class="section">
        <h3 class="section-title">Personal Information</h3>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-input" id="nameInput" placeholder="Your name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="emailInput" disabled>
        </div>
      </div>

      <!-- Email Preferences -->
      <div class="section" id="emailPrefsSection">
        <h3 class="section-title">Email Preferences</h3>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Product Updates</div>
            <div class="toggle-desc">Receive news about new products</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="prefUpdates" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Order Notifications</div>
            <div class="toggle-desc">Updates about your orders</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="prefOrders" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Marketing Emails</div>
            <div class="toggle-desc">Promotions and special offers</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="prefMarketing">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Password -->
      <div class="section" id="passwordSection">
        <h3 class="section-title">Change Password</h3>
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" class="form-input" id="currentPassword" placeholder="Enter current password">
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" class="form-input" id="newPassword" placeholder="Enter new password">
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" class="form-input" id="confirmNewPassword" placeholder="Confirm new password">
        </div>
      </div>

      <div class="btn-row">
        <button type="submit" class="btn btn-primary" id="saveBtn">Save Changes</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
      </div>
    </form>
  </div>

  <script>
    (function() {
      let config = {};
      let customer = null;
      let originalData = {};
      let isSubmitting = false;

      const loginPrompt = document.getElementById('loginPrompt');
      const loadingState = document.getElementById('loadingState');
      const profileContent = document.getElementById('profileContent');
      const messageContainer = document.getElementById('messageContainer');
      const avatarUploadBtn = document.getElementById('avatarUploadBtn');
      const emailPrefsSection = document.getElementById('emailPrefsSection');
      const passwordSection = document.getElementById('passwordSection');

      function showState(state) {
        [loginPrompt, loadingState, profileContent].forEach(s => s.classList.add('hidden'));
        state.classList.remove('hidden');
      }

      function applyConfig(cfg) {
        config = cfg;
        document.getElementById('title').textContent = cfg.title || 'My Profile';

        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }

        avatarUploadBtn.classList.toggle('hidden', cfg.showAvatarUpload === false);
        emailPrefsSection.classList.toggle('hidden', cfg.showEmailPrefs === false);
        passwordSection.classList.toggle('hidden', cfg.showPasswordChange === false);
      }

      function showMessage(text, type) {
        messageContainer.textContent = text;
        messageContainer.className = 'message ' + type;
      }

      function hideMessage() {
        messageContainer.classList.add('hidden');
      }

      function populateProfile(cust) {
        customer = cust;
        originalData = { ...cust };

        // Avatar
        const avatarEl = document.getElementById('avatar');
        if (cust.avatarUrl) {
          avatarEl.innerHTML = '<img src="' + cust.avatarUrl + '" alt="Avatar">';
        } else {
          avatarEl.textContent = (cust.name || cust.email || '?')[0].toUpperCase();
        }

        // Display info
        document.getElementById('displayName').textContent = cust.name || 'Customer';
        document.getElementById('displayEmail').textContent = cust.email || '';

        // Form fields
        document.getElementById('nameInput').value = cust.name || '';
        document.getElementById('emailInput').value = cust.email || '';

        // Preferences
        if (cust.preferences) {
          document.getElementById('prefUpdates').checked = cust.preferences.productUpdates !== false;
          document.getElementById('prefOrders').checked = cust.preferences.orderNotifications !== false;
          document.getElementById('prefMarketing').checked = cust.preferences.marketing === true;
        }

        showState(profileContent);
      }

      async function loadProfile() {
        showState(loadingState);

        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) {
          showState(loginPrompt);
          return;
        }

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/profile', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.success && data.customer) {
            populateProfile(data.customer);
          } else {
            showState(loginPrompt);
          }
        } catch (e) {
          console.error('Failed to load profile:', e);
          showState(loginPrompt);
        }
      }

      async function saveProfile() {
        if (isSubmitting) return;
        isSubmitting = true;

        const saveBtn = document.getElementById('saveBtn');
        saveBtn.classList.add('loading');
        saveBtn.disabled = true;
        hideMessage();

        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        const updateData = {
          name: document.getElementById('nameInput').value.trim(),
          preferences: {
            productUpdates: document.getElementById('prefUpdates').checked,
            orderNotifications: document.getElementById('prefOrders').checked,
            marketing: document.getElementById('prefMarketing').checked,
          }
        };

        // Check for password change
        const currentPwd = document.getElementById('currentPassword').value;
        const newPwd = document.getElementById('newPassword').value;
        const confirmPwd = document.getElementById('confirmNewPassword').value;

        if (newPwd) {
          if (newPwd !== confirmPwd) {
            showMessage('New passwords do not match', 'error');
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            isSubmitting = false;
            return;
          }
          if (!currentPwd) {
            showMessage('Please enter your current password', 'error');
            saveBtn.classList.remove('loading');
            saveBtn.disabled = false;
            isSubmitting = false;
            return;
          }
          updateData.currentPassword = currentPwd;
          updateData.newPassword = newPwd;
        }

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-Token': token
            },
            body: JSON.stringify(updateData)
          });

          const data = await res.json();

          if (data.success) {
            showMessage('Profile updated successfully!', 'success');
            populateProfile(data.customer);

            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

            emitOutput('onProfileUpdate', { customer: data.customer });
          } else {
            showMessage(data.error?.message || 'Failed to update profile', 'error');
            emitOutput('onError', { error: data.error?.message || 'Update failed' });
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
          emitOutput('onError', { error: 'Network error' });
        } finally {
          saveBtn.classList.remove('loading');
          saveBtn.disabled = false;
          isSubmitting = false;
        }
      }

      async function uploadAvatar(file) {
        if (!file || isSubmitting) return;

        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        isSubmitting = true;
        hideMessage();

        const formData = new FormData();
        formData.append('avatar', file);

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/avatar', {
            method: 'POST',
            headers: { 'X-Customer-Token': token },
            body: formData
          });

          const data = await res.json();

          if (data.success && data.avatarUrl) {
            const avatarEl = document.getElementById('avatar');
            avatarEl.innerHTML = '<img src="' + data.avatarUrl + '" alt="Avatar">';
            customer.avatarUrl = data.avatarUrl;

            showMessage('Avatar updated!', 'success');
            emitOutput('onAvatarChange', { avatarUrl: data.avatarUrl });
          } else {
            showMessage(data.error?.message || 'Failed to upload avatar', 'error');
          }
        } catch (e) {
          showMessage('Failed to upload avatar', 'error');
        } finally {
          isSubmitting = false;
        }
      }

      function emitOutput(outputId, data) {
        window.parent.postMessage({ type: 'widget:output', outputId, data }, '*');
      }

      // Event listeners
      document.getElementById('profileForm').onsubmit = (e) => {
        e.preventDefault();
        saveProfile();
      };

      document.getElementById('cancelBtn').onclick = () => {
        if (originalData) populateProfile(originalData);
        hideMessage();
      };

      document.getElementById('avatarInput').onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadAvatar(file);
      };

      // Widget API
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            if (payload?.config) applyConfig(payload.config);
            loadProfile();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'onLogin' && payload.value?.customer) {
              populateProfile(payload.value.customer);
            } else if (payload?.portId === 'refresh') {
              loadProfile();
            }
            break;
        }
      });

      // Listen for login changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token') {
          if (e.newValue) {
            loadProfile();
          } else {
            customer = null;
            showState(loginPrompt);
          }
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerProfileWidget: BuiltinWidget = {
  manifest: CustomerProfileWidgetManifest,
  html: CustomerProfileWidgetHTML,
};

export default CustomerProfileWidget;
