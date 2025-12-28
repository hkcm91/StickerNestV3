/**
 * StickerNest v2 - Customer Sign-In Widget
 * Full-featured authentication widget with email, password, and social login options
 * Extends beyond magic-link to provide complete auth UX for canvas visitors
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const CustomerSignInWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-signin',
  name: 'Customer Sign In',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Full sign-in/sign-up form with email, password, and social auth options for canvas customers',
  kind: 'interactive',
  category: 'signin',
  tags: ['auth', 'login', 'register', 'signin', 'customer', 'social-auth', 'pipeline'],
  icon: '🔑',

  defaultSize: { width: 380, height: 480 },
  minSize: { width: 320, height: 400 },
  maxSize: { width: 500, height: 600 },

  inputs: [
    { id: 'showRegister', name: 'Show Register', type: 'trigger', description: 'Switch to registration form' },
    { id: 'showLogin', name: 'Show Login', type: 'trigger', description: 'Switch to login form' },
    { id: 'prefillEmail', name: 'Prefill Email', type: 'string', description: 'Pre-fill email field' },
  ],
  outputs: [
    { id: 'onLogin', name: 'On Login', type: 'object', description: 'Fires with customer data on successful login' },
    { id: 'onRegister', name: 'On Register', type: 'object', description: 'Fires with customer data on successful registration' },
    { id: 'onLogout', name: 'On Logout', type: 'trigger', description: 'Fires when customer logs out' },
    { id: 'onError', name: 'On Error', type: 'object', description: 'Fires with error details on auth failure' },
  ],

  io: {
    inputs: ['trigger.showRegister', 'trigger.showLogin', 'data.prefillEmail'],
    outputs: ['auth.login', 'auth.register', 'auth.logout', 'error.auth'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Welcome', title: 'Title' },
        showSocialAuth: { type: 'boolean', default: true, title: 'Show Social Login Buttons' },
        showMagicLink: { type: 'boolean', default: true, title: 'Show Magic Link Option' },
        showPassword: { type: 'boolean', default: true, title: 'Show Password Login' },
        defaultMode: { type: 'string', default: 'login', enum: ['login', 'register'], title: 'Default Mode' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
        showRememberMe: { type: 'boolean', default: true, title: 'Show Remember Me' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerSignInWidgetHTML = `
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

    .container { max-width: 100%; }

    .header { text-align: center; margin-bottom: 24px; }
    .title { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
    .subtitle { font-size: 0.9rem; color: var(--text-secondary); }

    /* Tabs */
    .tabs {
      display: flex;
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 4px;
      margin-bottom: 20px;
    }

    .tab {
      flex: 1;
      padding: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.2s;
    }

    .tab.active {
      background: var(--bg);
      color: var(--text);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Form */
    .form-group { margin-bottom: 16px; }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      font-size: 0.95rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--input-bg);
      color: var(--text);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }

    .checkbox-group input { width: 16px; height: 16px; accent-color: var(--accent); }
    .checkbox-group label { font-size: 0.875rem; color: var(--text-secondary); }

    .forgot-link {
      display: block;
      text-align: right;
      font-size: 0.8rem;
      color: var(--accent);
      text-decoration: none;
      margin-top: -8px;
      margin-bottom: 16px;
    }

    .forgot-link:hover { text-decoration: underline; }

    /* Buttons */
    .btn {
      width: 100%;
      padding: 12px 20px;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      color: white;
      background: var(--accent);
    }

    .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn.loading { position: relative; color: transparent; }
    .btn.loading::after {
      content: '';
      position: absolute;
      width: 20px; height: 20px;
      top: 50%; left: 50%;
      margin: -10px 0 0 -10px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .divider span { padding: 0 12px; }

    /* Social Buttons */
    .social-buttons { display: flex; flex-direction: column; gap: 10px; }

    .btn-social {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px;
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      font-weight: 500;
    }

    .btn-social:hover { background: var(--bg-secondary); }

    .btn-social svg { width: 20px; height: 20px; }

    /* Magic Link */
    .magic-link-btn {
      margin-top: 12px;
      background: transparent;
      border: 1px dashed var(--accent);
      color: var(--accent);
    }

    .magic-link-btn:hover { background: rgba(139, 92, 246, 0.05); }

    /* Messages */
    .message {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.875rem;
      text-align: center;
    }

    .message.success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    /* Logged In State */
    .logged-in {
      text-align: center;
      padding: 20px 0;
    }

    .avatar {
      width: 72px; height: 72px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 600;
      margin: 0 auto 16px;
    }

    .user-name { font-size: 1.1rem; font-weight: 600; margin-bottom: 4px; }
    .user-email { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px; }

    .btn-logout {
      padding: 10px 24px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: auto;
    }

    .btn-logout:hover { background: var(--bg-secondary); }

    .hidden { display: none !important; }

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
  <div class="container">
    <!-- Auth Forms -->
    <div id="authForms">
      <div class="header">
        <h2 class="title" id="title">Welcome</h2>
        <p class="subtitle" id="subtitle">Sign in to continue</p>
      </div>

      <div class="tabs" id="tabs">
        <button class="tab active" data-mode="login">Sign In</button>
        <button class="tab" data-mode="register">Sign Up</button>
      </div>

      <div id="messageContainer" class="message hidden"></div>

      <!-- Login Form -->
      <form id="loginForm">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="loginEmail" placeholder="you@example.com" required>
        </div>
        <div class="form-group" id="loginPasswordGroup">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="loginPassword" placeholder="Enter your password">
        </div>
        <a href="#" class="forgot-link" id="forgotLink">Forgot password?</a>
        <div class="checkbox-group" id="rememberGroup">
          <input type="checkbox" id="rememberMe">
          <label for="rememberMe">Remember me</label>
        </div>
        <button type="submit" class="btn btn-primary" id="loginBtn">Sign In</button>
        <button type="button" class="btn magic-link-btn" id="magicLinkBtn">Send Magic Link Instead</button>
      </form>

      <!-- Register Form -->
      <form id="registerForm" class="hidden">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="registerName" placeholder="Your name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="registerEmail" placeholder="you@example.com" required>
        </div>
        <div class="form-group" id="registerPasswordGroup">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="registerPassword" placeholder="Create a password" minlength="8">
        </div>
        <div class="form-group" id="confirmPasswordGroup">
          <label class="form-label">Confirm Password</label>
          <input type="password" class="form-input" id="confirmPassword" placeholder="Confirm your password">
        </div>
        <button type="submit" class="btn btn-primary" id="registerBtn">Create Account</button>
      </form>

      <!-- Social Auth -->
      <div id="socialSection">
        <div class="divider"><span>or continue with</span></div>
        <div class="social-buttons">
          <button class="btn btn-social" id="googleBtn">
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <button class="btn btn-social" id="githubBtn">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>

    <!-- Logged In State -->
    <div id="loggedInState" class="logged-in hidden">
      <div class="avatar" id="avatar">?</div>
      <div class="user-name" id="userName">Customer</div>
      <div class="user-email" id="userEmail"></div>
      <button class="btn btn-logout" id="logoutBtn">Sign Out</button>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let creatorId = '';
      let canvasId = '';
      let customer = null;
      let currentMode = 'login';
      let isSubmitting = false;

      // Elements
      const authForms = document.getElementById('authForms');
      const loggedInState = document.getElementById('loggedInState');
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const tabs = document.querySelectorAll('.tab');
      const messageContainer = document.getElementById('messageContainer');
      const socialSection = document.getElementById('socialSection');
      const magicLinkBtn = document.getElementById('magicLinkBtn');
      const loginPasswordGroup = document.getElementById('loginPasswordGroup');
      const registerPasswordGroup = document.getElementById('registerPasswordGroup');
      const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
      const rememberGroup = document.getElementById('rememberGroup');
      const forgotLink = document.getElementById('forgotLink');

      function applyConfig(cfg) {
        config = cfg;

        document.getElementById('title').textContent = cfg.title || 'Welcome';

        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }

        // Show/hide features
        socialSection.classList.toggle('hidden', cfg.showSocialAuth === false);
        magicLinkBtn.classList.toggle('hidden', cfg.showMagicLink === false);
        loginPasswordGroup.classList.toggle('hidden', cfg.showPassword === false);
        registerPasswordGroup.classList.toggle('hidden', cfg.showPassword === false);
        confirmPasswordGroup.classList.toggle('hidden', cfg.showPassword === false);
        rememberGroup.classList.toggle('hidden', cfg.showRememberMe === false);
        forgotLink.classList.toggle('hidden', cfg.showPassword === false);

        if (cfg.defaultMode) {
          switchMode(cfg.defaultMode);
        }
      }

      function showMessage(text, type) {
        messageContainer.textContent = text;
        messageContainer.className = 'message ' + type;
      }

      function hideMessage() {
        messageContainer.classList.add('hidden');
      }

      function switchMode(mode) {
        currentMode = mode;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
        loginForm.classList.toggle('hidden', mode !== 'login');
        registerForm.classList.toggle('hidden', mode !== 'register');
        document.getElementById('subtitle').textContent =
          mode === 'login' ? 'Sign in to continue' : 'Create your account';
        hideMessage();
      }

      function showLoggedIn(cust) {
        customer = cust;
        authForms.classList.add('hidden');
        loggedInState.classList.remove('hidden');

        const initial = (cust.name || cust.email || '?')[0].toUpperCase();
        document.getElementById('avatar').textContent = initial;
        document.getElementById('userName').textContent = cust.name || 'Customer';
        document.getElementById('userEmail').textContent = cust.email || '';
      }

      function showAuthForms() {
        customer = null;
        loggedInState.classList.add('hidden');
        authForms.classList.remove('hidden');
        hideMessage();
      }

      function setLoading(btn, loading) {
        btn.classList.toggle('loading', loading);
        btn.disabled = loading;
        isSubmitting = loading;
      }

      async function checkSession() {
        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) return;

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/session', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.success && data.session?.customer) {
            showLoggedIn(data.session.customer);
          }
        } catch (e) {
          console.error('Session check failed:', e);
        }
      }

      async function loginWithPassword(email, password, remember) {
        const loginBtn = document.getElementById('loginBtn');
        if (isSubmitting) return;
        setLoading(loginBtn, true);
        hideMessage();

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, creatorId, canvasId, remember })
          });

          const data = await res.json();

          if (data.success && data.token) {
            localStorage.setItem('stickernest:customer_token', data.token);
            showLoggedIn(data.customer);
            emitOutput('onLogin', { customer: data.customer });
          } else {
            showMessage(data.error?.message || 'Invalid email or password', 'error');
            emitOutput('onError', { error: data.error?.message || 'Login failed' });
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
          emitOutput('onError', { error: 'Network error' });
        } finally {
          setLoading(loginBtn, false);
        }
      }

      async function sendMagicLink(email) {
        if (isSubmitting) return;
        setLoading(magicLinkBtn, true);
        hideMessage();

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, creatorId, canvasId, redirectUrl: window.location.href })
          });

          const data = await res.json();

          if (data.success) {
            showMessage('Check your email for the login link!', 'success');
          } else {
            showMessage(data.error?.message || 'Failed to send link', 'error');
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
        } finally {
          setLoading(magicLinkBtn, false);
        }
      }

      async function register(name, email, password) {
        const registerBtn = document.getElementById('registerBtn');
        if (isSubmitting) return;
        setLoading(registerBtn, true);
        hideMessage();

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, creatorId, canvasId })
          });

          const data = await res.json();

          if (data.success && data.token) {
            localStorage.setItem('stickernest:customer_token', data.token);
            showLoggedIn(data.customer);
            emitOutput('onRegister', { customer: data.customer });
          } else {
            showMessage(data.error?.message || 'Registration failed', 'error');
            emitOutput('onError', { error: data.error?.message || 'Registration failed' });
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
          emitOutput('onError', { error: 'Network error' });
        } finally {
          setLoading(registerBtn, false);
        }
      }

      async function socialAuth(provider) {
        const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = apiBase + '/commerce/customer/oauth/' + provider + '?creator=' + creatorId + '&redirect=' + redirectUrl;
      }

      async function logout() {
        const token = localStorage.getItem('stickernest:customer_token');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          await fetch(apiBase + '/commerce/customer/logout', {
            method: 'POST',
            headers: token ? { 'X-Customer-Token': token } : {}
          });
        } catch (e) {}

        localStorage.removeItem('stickernest:customer_token');
        showAuthForms();
        emitOutput('onLogout', {});
      }

      function emitOutput(outputId, data) {
        window.parent.postMessage({ type: 'widget:output', outputId, data }, '*');
      }

      // Event listeners
      tabs.forEach(tab => {
        tab.onclick = () => switchMode(tab.dataset.mode);
      });

      loginForm.onsubmit = (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberMe').checked;

        if (config.showPassword !== false && password) {
          loginWithPassword(email, password, remember);
        } else {
          sendMagicLink(email);
        }
      };

      magicLinkBtn.onclick = () => {
        const email = document.getElementById('loginEmail').value.trim();
        if (email) sendMagicLink(email);
        else showMessage('Please enter your email first', 'error');
      };

      registerForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirm = document.getElementById('confirmPassword').value;

        if (config.showPassword !== false && password !== confirm) {
          showMessage('Passwords do not match', 'error');
          return;
        }

        register(name, email, password || undefined);
      };

      document.getElementById('googleBtn').onclick = () => socialAuth('google');
      document.getElementById('githubBtn').onclick = () => socialAuth('github');
      document.getElementById('logoutBtn').onclick = logout;

      forgotLink.onclick = (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        if (email) {
          sendMagicLink(email);
          showMessage('Password reset link sent to your email', 'success');
        } else {
          showMessage('Please enter your email first', 'error');
        }
      };

      // Widget API
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            creatorId = payload?.creatorId || '';
            canvasId = payload?.canvasId || '';
            if (payload?.config) applyConfig(payload.config);
            checkSession();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'showRegister') switchMode('register');
            else if (payload?.portId === 'showLogin') switchMode('login');
            else if (payload?.portId === 'prefillEmail') {
              document.getElementById('loginEmail').value = payload.value || '';
              document.getElementById('registerEmail').value = payload.value || '';
            }
            break;
        }
      });

      // Listen for login from magic link verification
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token' && e.newValue) {
          checkSession().then(() => {
            if (customer) emitOutput('onLogin', { customer });
          });
        }
      });

      window.parent.postMessage({ type: 'widget:requestInit' }, '*');
    })();
  </script>
</body>
</html>
`;

export const CustomerSignInWidget: BuiltinWidget = {
  manifest: CustomerSignInWidgetManifest,
  html: CustomerSignInWidgetHTML,
};

export default CustomerSignInWidget;
