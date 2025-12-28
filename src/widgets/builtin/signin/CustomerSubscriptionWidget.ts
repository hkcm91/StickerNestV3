/**
 * StickerNest v2 - Customer Subscription Widget
 * Displays subscription plans and handles payment/billing management
 * Integrates with Stripe for payment processing
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const CustomerSubscriptionWidgetManifest: WidgetManifest = {
  id: 'stickernest.customer-subscription',
  name: 'Customer Subscription',
  version: '1.0.0',
  author: 'StickerNest',
  description: 'Subscription plans, billing history, and payment method management for customers',
  kind: 'interactive',
  category: 'signin',
  tags: ['subscription', 'billing', 'payment', 'plans', 'customer', 'stripe', 'pipeline'],
  icon: '💳',

  defaultSize: { width: 450, height: 550 },
  minSize: { width: 380, height: 450 },
  maxSize: { width: 700, height: 800 },

  inputs: [
    { id: 'onLogin', name: 'On Login', type: 'object', description: 'Receives login event with customer data' },
    { id: 'selectPlan', name: 'Select Plan', type: 'string', description: 'Pre-select a specific plan' },
    { id: 'refresh', name: 'Refresh', type: 'trigger', description: 'Reload subscription data' },
  ],
  outputs: [
    { id: 'onSubscribe', name: 'On Subscribe', type: 'object', description: 'Fires when subscription is created/changed' },
    { id: 'onCancel', name: 'On Cancel', type: 'trigger', description: 'Fires when subscription is cancelled' },
    { id: 'onUpgrade', name: 'On Upgrade', type: 'object', description: 'Fires when customer upgrades plan' },
    { id: 'onError', name: 'On Error', type: 'object', description: 'Fires on subscription error' },
  ],

  io: {
    inputs: ['auth.login', 'plan.select', 'trigger.refresh'],
    outputs: ['subscription.created', 'subscription.cancelled', 'subscription.upgraded', 'error.subscription'],
  },

  config: {
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Subscription', title: 'Title' },
        showBillingHistory: { type: 'boolean', default: true, title: 'Show Billing History' },
        showPaymentMethod: { type: 'boolean', default: true, title: 'Show Payment Method' },
        defaultView: { type: 'string', default: 'plans', enum: ['plans', 'current'], title: 'Default View' },
        accentColor: { type: 'string', default: '#8b5cf6', title: 'Accent Color' },
      },
    },
  },

  permissions: ['network'],
  sandbox: true,
};

const CustomerSubscriptionWidgetHTML = `
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
      --bg-card: #f3f4f6;
      --text: #1f2937;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      min-height: 100vh;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .title { font-size: 1.5rem; font-weight: 700; }

    /* States */
    .state { display: none; }
    .state.active { display: block; }

    /* Not Logged In */
    .login-prompt {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .login-prompt-icon { font-size: 3rem; margin-bottom: 16px; }

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
      font-size: 0.85rem;
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

    /* Current Plan */
    .current-plan {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .plan-name { font-size: 1.25rem; font-weight: 700; }

    .plan-badge {
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 20px;
      text-transform: uppercase;
    }

    .plan-badge.active {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .plan-badge.cancelled {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
    }

    .plan-price {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .plan-price span { font-size: 1rem; font-weight: 400; color: var(--text-secondary); }

    .plan-renewal {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .plan-features {
      list-style: none;
      margin-bottom: 16px;
    }

    .plan-features li {
      padding: 6px 0;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .plan-features li::before {
      content: '✓';
      color: var(--success);
      font-weight: bold;
    }

    /* Plans Grid */
    .plans-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .plan-card {
      background: var(--bg-secondary);
      border: 2px solid transparent;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .plan-card:hover { border-color: var(--border); }
    .plan-card.popular { border-color: var(--accent); }
    .plan-card.selected { border-color: var(--accent); background: rgba(139, 92, 246, 0.05); }

    .plan-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .plan-card-name { font-weight: 600; }

    .popular-badge {
      background: var(--accent);
      color: white;
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      border-radius: 10px;
    }

    .plan-card-price {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .plan-card-price span {
      font-size: 0.85rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    .plan-card-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    /* Billing History */
    .billing-section { margin-top: 24px; }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .billing-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .billing-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .billing-date { font-size: 0.9rem; }
    .billing-desc { font-size: 0.8rem; color: var(--text-secondary); }
    .billing-amount { font-weight: 600; }

    .billing-status {
      padding: 2px 8px;
      font-size: 0.7rem;
      font-weight: 500;
      border-radius: 4px;
    }

    .billing-status.paid {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
    }

    .billing-status.pending {
      background: rgba(245, 158, 11, 0.1);
      color: var(--warning);
    }

    /* Payment Method */
    .payment-section { margin-top: 24px; }

    .payment-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .card-icon { font-size: 1.5rem; }
    .card-info { flex: 1; }
    .card-number { font-weight: 500; }
    .card-expiry { font-size: 0.8rem; color: var(--text-secondary); }

    /* Buttons */
    .btn {
      padding: 12px 24px;
      font-size: 0.95rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
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

    .btn-danger {
      background: transparent;
      border: 1px solid var(--error);
      color: var(--error);
    }

    .btn-danger:hover { background: rgba(239, 68, 68, 0.05); }

    .btn-row {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .btn-row .btn { flex: 1; }

    .btn.loading { position: relative; color: transparent; }
    .btn.loading::after {
      content: '';
      position: absolute;
      width: 18px; height: 18px;
      top: 50%; left: 50%;
      margin: -9px 0 0 -9px;
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

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1f2937;
        --bg-secondary: #374151;
        --bg-card: #4b5563;
        --text: #f9fafb;
        --text-secondary: #9ca3af;
        --border: #4b5563;
      }
    }
  </style>
</head>
<body>
  <!-- Not Logged In -->
  <div id="loginPrompt" class="state active">
    <div class="login-prompt">
      <div class="login-prompt-icon">💳</div>
      <p>Sign in to manage your subscription</p>
    </div>
  </div>

  <!-- Loading -->
  <div id="loadingState" class="state">
    <div class="loading-state"><div class="spinner"></div></div>
  </div>

  <!-- Main Content -->
  <div id="mainContent" class="state">
    <div class="header">
      <h2 class="title" id="title">Subscription</h2>
    </div>

    <div id="messageContainer" class="message hidden"></div>

    <div class="tabs">
      <button class="tab active" data-tab="current">Current Plan</button>
      <button class="tab" data-tab="plans">All Plans</button>
      <button class="tab" data-tab="billing">Billing</button>
    </div>

    <!-- Current Plan Tab -->
    <div id="currentTab" class="tab-content">
      <div id="noPlan" class="empty-state hidden">
        <p>You don't have an active subscription</p>
        <button class="btn btn-primary" style="width:auto;margin-top:16px" onclick="switchTab('plans')">
          View Plans
        </button>
      </div>

      <div id="currentPlanCard" class="current-plan">
        <div class="plan-header">
          <div class="plan-name" id="currentPlanName">Pro</div>
          <span class="plan-badge active" id="planStatus">Active</span>
        </div>
        <div class="plan-price" id="currentPlanPrice">$19<span>/month</span></div>
        <div class="plan-renewal" id="planRenewal">Renews on January 15, 2025</div>
        <ul class="plan-features" id="planFeatures">
          <li>Unlimited canvases</li>
          <li>Priority support</li>
          <li>Custom branding</li>
        </ul>
        <div class="btn-row">
          <button class="btn btn-secondary" id="changePlanBtn">Change Plan</button>
          <button class="btn btn-danger" id="cancelBtn">Cancel</button>
        </div>
      </div>

      <div class="payment-section" id="paymentSection">
        <h3 class="section-title">Payment Method</h3>
        <div class="payment-card">
          <div class="card-icon">💳</div>
          <div class="card-info">
            <div class="card-number" id="cardNumber">•••• •••• •••• 4242</div>
            <div class="card-expiry" id="cardExpiry">Expires 12/25</div>
          </div>
          <button class="btn btn-secondary" style="width:auto;padding:8px 12px;font-size:0.8rem" id="updateCardBtn">
            Update
          </button>
        </div>
      </div>
    </div>

    <!-- Plans Tab -->
    <div id="plansTab" class="tab-content hidden">
      <div class="plans-grid" id="plansGrid"></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="subscribeBtn" disabled>Select a Plan</button>
      </div>
    </div>

    <!-- Billing Tab -->
    <div id="billingTab" class="tab-content hidden">
      <div id="billingHistory" class="billing-section">
        <h3 class="section-title">Billing History</h3>
        <div class="billing-list" id="billingList"></div>
        <div id="noBilling" class="empty-state hidden">
          <p>No billing history yet</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      let config = {};
      let customer = null;
      let subscription = null;
      let plans = [];
      let selectedPlan = null;
      let billingHistory = [];
      let isSubmitting = false;

      // Sample plans (would come from API)
      const defaultPlans = [
        { id: 'free', name: 'Free', price: 0, interval: 'month', features: ['1 canvas', 'Basic widgets', 'Community support'] },
        { id: 'starter', name: 'Starter', price: 999, interval: 'month', features: ['5 canvases', 'All widgets', 'Email support'], popular: false },
        { id: 'pro', name: 'Pro', price: 1999, interval: 'month', features: ['Unlimited canvases', 'Priority support', 'Custom branding', 'Analytics'], popular: true },
        { id: 'enterprise', name: 'Enterprise', price: 4999, interval: 'month', features: ['Everything in Pro', 'Dedicated support', 'SLA', 'Custom integrations'] },
      ];

      const loginPrompt = document.getElementById('loginPrompt');
      const loadingState = document.getElementById('loadingState');
      const mainContent = document.getElementById('mainContent');
      const messageContainer = document.getElementById('messageContainer');
      const tabs = document.querySelectorAll('.tab');
      const currentTab = document.getElementById('currentTab');
      const plansTab = document.getElementById('plansTab');
      const billingTab = document.getElementById('billingTab');
      const paymentSection = document.getElementById('paymentSection');

      function showState(state) {
        [loginPrompt, loadingState, mainContent].forEach(s => s.classList.remove('active'));
        state.classList.add('active');
      }

      function applyConfig(cfg) {
        config = cfg;
        document.getElementById('title').textContent = cfg.title || 'Subscription';

        if (cfg.accentColor) {
          document.documentElement.style.setProperty('--accent', cfg.accentColor);
        }

        paymentSection.classList.toggle('hidden', cfg.showPaymentMethod === false);

        if (cfg.defaultView === 'plans') {
          switchTab('plans');
        }
      }

      function showMessage(text, type) {
        messageContainer.textContent = text;
        messageContainer.className = 'message ' + type;
      }

      function hideMessage() {
        messageContainer.classList.add('hidden');
      }

      function formatPrice(cents) {
        return '$' + (cents / 100).toFixed(0);
      }

      function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }

      window.switchTab = function(tabName) {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        currentTab.classList.toggle('hidden', tabName !== 'current');
        plansTab.classList.toggle('hidden', tabName !== 'plans');
        billingTab.classList.toggle('hidden', tabName !== 'billing');
      };

      function renderCurrentPlan() {
        const noPlan = document.getElementById('noPlan');
        const currentPlanCard = document.getElementById('currentPlanCard');

        if (!subscription || subscription.status === 'cancelled') {
          noPlan.classList.remove('hidden');
          currentPlanCard.classList.add('hidden');
          return;
        }

        noPlan.classList.add('hidden');
        currentPlanCard.classList.remove('hidden');

        document.getElementById('currentPlanName').textContent = subscription.planName || 'Pro';
        document.getElementById('currentPlanPrice').innerHTML = formatPrice(subscription.amountCents) + '<span>/' + subscription.interval + '</span>';
        document.getElementById('planRenewal').textContent = 'Renews on ' + formatDate(subscription.renewsAt);

        const statusEl = document.getElementById('planStatus');
        statusEl.textContent = subscription.status;
        statusEl.className = 'plan-badge ' + subscription.status;

        const featuresEl = document.getElementById('planFeatures');
        featuresEl.innerHTML = (subscription.features || []).map(f => '<li>' + f + '</li>').join('');

        if (subscription.paymentMethod) {
          document.getElementById('cardNumber').textContent = '•••• •••• •••• ' + subscription.paymentMethod.last4;
          document.getElementById('cardExpiry').textContent = 'Expires ' + subscription.paymentMethod.expMonth + '/' + subscription.paymentMethod.expYear;
        }
      }

      function renderPlans() {
        const grid = document.getElementById('plansGrid');
        const displayPlans = plans.length > 0 ? plans : defaultPlans;

        grid.innerHTML = displayPlans.map(plan => {
          const isSelected = selectedPlan === plan.id;
          const isCurrent = subscription?.planId === plan.id;

          return '<div class="plan-card ' + (plan.popular ? 'popular ' : '') + (isSelected ? 'selected' : '') + '" data-plan="' + plan.id + '">' +
            '<div class="plan-card-header">' +
              '<span class="plan-card-name">' + plan.name + (isCurrent ? ' (Current)' : '') + '</span>' +
              (plan.popular ? '<span class="popular-badge">Popular</span>' : '') +
            '</div>' +
            '<div class="plan-card-price">' + (plan.price === 0 ? 'Free' : formatPrice(plan.price)) + '<span>/' + plan.interval + '</span></div>' +
            '<div class="plan-card-desc">' + plan.features.slice(0, 2).join(' • ') + '</div>' +
          '</div>';
        }).join('');

        grid.querySelectorAll('.plan-card').forEach(card => {
          card.onclick = () => {
            grid.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedPlan = card.dataset.plan;
            updateSubscribeButton();
          };
        });
      }

      function updateSubscribeButton() {
        const btn = document.getElementById('subscribeBtn');
        if (selectedPlan) {
          const plan = (plans.length > 0 ? plans : defaultPlans).find(p => p.id === selectedPlan);
          if (subscription?.planId === selectedPlan) {
            btn.textContent = 'Current Plan';
            btn.disabled = true;
          } else if (plan.price === 0) {
            btn.textContent = 'Switch to Free';
            btn.disabled = false;
          } else {
            btn.textContent = 'Subscribe to ' + plan.name;
            btn.disabled = false;
          }
        } else {
          btn.textContent = 'Select a Plan';
          btn.disabled = true;
        }
      }

      function renderBillingHistory() {
        const list = document.getElementById('billingList');
        const empty = document.getElementById('noBilling');

        if (billingHistory.length === 0) {
          list.innerHTML = '';
          empty.classList.remove('hidden');
          return;
        }

        empty.classList.add('hidden');
        list.innerHTML = billingHistory.map(item =>
          '<div class="billing-item">' +
            '<div>' +
              '<div class="billing-date">' + formatDate(item.date) + '</div>' +
              '<div class="billing-desc">' + item.description + '</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div class="billing-amount">' + formatPrice(item.amountCents) + '</div>' +
              '<span class="billing-status ' + item.status + '">' + item.status + '</span>' +
            '</div>' +
          '</div>'
        ).join('');
      }

      async function loadSubscription() {
        showState(loadingState);

        const token = localStorage.getItem('stickernest:customer_token');
        if (!token) {
          showState(loginPrompt);
          return;
        }

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/subscription', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.success) {
            subscription = data.subscription;
            plans = data.plans || [];
            billingHistory = data.billingHistory || [];

            renderCurrentPlan();
            renderPlans();
            renderBillingHistory();
            showState(mainContent);
          } else {
            showState(loginPrompt);
          }
        } catch (e) {
          console.error('Failed to load subscription:', e);
          // Show with defaults
          plans = defaultPlans;
          renderPlans();
          showState(mainContent);
        }
      }

      async function subscribe() {
        if (!selectedPlan || isSubmitting) return;

        const btn = document.getElementById('subscribeBtn');
        btn.classList.add('loading');
        btn.disabled = true;
        isSubmitting = true;
        hideMessage();

        const token = localStorage.getItem('stickernest:customer_token');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-Token': token
            },
            body: JSON.stringify({ planId: selectedPlan })
          });

          const data = await res.json();

          if (data.checkoutUrl) {
            // Redirect to Stripe checkout
            window.location.href = data.checkoutUrl;
          } else if (data.success) {
            subscription = data.subscription;
            showMessage('Subscription updated!', 'success');
            renderCurrentPlan();
            switchTab('current');
            emitOutput('onSubscribe', { subscription: data.subscription });
          } else {
            showMessage(data.error?.message || 'Subscription failed', 'error');
            emitOutput('onError', { error: data.error?.message });
          }
        } catch (e) {
          showMessage('Network error. Please try again.', 'error');
          emitOutput('onError', { error: 'Network error' });
        } finally {
          btn.classList.remove('loading');
          updateSubscribeButton();
          isSubmitting = false;
        }
      }

      async function cancelSubscription() {
        if (isSubmitting) return;
        if (!confirm('Are you sure you want to cancel your subscription?')) return;

        const btn = document.getElementById('cancelBtn');
        btn.classList.add('loading');
        isSubmitting = true;

        const token = localStorage.getItem('stickernest:customer_token');

        try {
          const apiBase = window.__STICKERNEST_API_BASE__ || '/api';
          const res = await fetch(apiBase + '/commerce/customer/subscription', {
            method: 'DELETE',
            headers: { 'X-Customer-Token': token }
          });

          const data = await res.json();

          if (data.success) {
            subscription = null;
            showMessage('Subscription cancelled', 'success');
            renderCurrentPlan();
            emitOutput('onCancel', {});
          } else {
            showMessage(data.error?.message || 'Cancellation failed', 'error');
          }
        } catch (e) {
          showMessage('Network error', 'error');
        } finally {
          btn.classList.remove('loading');
          isSubmitting = false;
        }
      }

      async function updatePaymentMethod() {
        const token = localStorage.getItem('stickernest:customer_token');
        const apiBase = window.__STICKERNEST_API_BASE__ || '/api';

        try {
          const res = await fetch(apiBase + '/commerce/customer/billing-portal', {
            headers: { 'X-Customer-Token': token }
          });
          const data = await res.json();

          if (data.url) {
            window.location.href = data.url;
          }
        } catch (e) {
          showMessage('Could not open billing portal', 'error');
        }
      }

      function emitOutput(outputId, data) {
        window.parent.postMessage({ type: 'widget:output', outputId, data }, '*');
      }

      // Event listeners
      tabs.forEach(tab => {
        tab.onclick = () => switchTab(tab.dataset.tab);
      });

      document.getElementById('subscribeBtn').onclick = subscribe;
      document.getElementById('cancelBtn').onclick = cancelSubscription;
      document.getElementById('changePlanBtn').onclick = () => switchTab('plans');
      document.getElementById('updateCardBtn').onclick = updatePaymentMethod;

      // Widget API
      window.addEventListener('message', (event) => {
        const { type, payload } = event.data || {};

        switch (type) {
          case 'widget:init':
            if (payload?.config) applyConfig(payload.config);
            loadSubscription();
            window.parent.postMessage({ type: 'widget:ready' }, '*');
            break;

          case 'widget:config':
            applyConfig(payload || {});
            break;

          case 'widget:input':
            if (payload?.portId === 'onLogin' && payload.value?.customer) {
              loadSubscription();
            } else if (payload?.portId === 'selectPlan') {
              selectedPlan = payload.value;
              renderPlans();
              updateSubscribeButton();
              switchTab('plans');
            } else if (payload?.portId === 'refresh') {
              loadSubscription();
            }
            break;
        }
      });

      // Listen for login changes
      window.addEventListener('storage', (e) => {
        if (e.key === 'stickernest:customer_token') {
          if (e.newValue) {
            loadSubscription();
          } else {
            subscription = null;
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

export const CustomerSubscriptionWidget: BuiltinWidget = {
  manifest: CustomerSubscriptionWidgetManifest,
  html: CustomerSubscriptionWidgetHTML,
};

export default CustomerSubscriptionWidget;
