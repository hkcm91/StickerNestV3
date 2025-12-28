/**
 * StickerNest v2 - Sign-In Widgets
 * Complete set of customer authentication and account management widgets
 *
 * Pipeline Flow Example:
 *
 * [CustomerAccountMenu] --onSignInClick--> [CustomerSignIn]
 *        |                                      |
 *        +--onProfileClick---+                  +--onLogin--> [CustomerProfile]
 *        |                   |                  |                    |
 *        |                   v                  +--onLogin--> [CustomerDashboard]
 *        |           [CustomerProfile]          |
 *        |                                      +--onLogin--> [CustomerSubscription]
 *        +--onSubscriptionClick--> [CustomerSubscription]
 *        |
 *        +--onOrdersClick--> [CustomerDashboard]
 *
 * All sign-in widgets share authentication state via localStorage events
 * and can be connected via pipelines for reactive updates.
 */

import type { BuiltinWidget } from '../index';

// Re-export widget types
export type { BuiltinWidget };

// Import sign-in widgets
export { CustomerSignInWidget, CustomerSignInWidgetManifest } from './CustomerSignInWidget';
export { CustomerProfileWidget, CustomerProfileWidgetManifest } from './CustomerProfileWidget';
export { CustomerSubscriptionWidget, CustomerSubscriptionWidgetManifest } from './CustomerSubscriptionWidget';
export { CustomerAccountMenuWidget, CustomerAccountMenuWidgetManifest } from './CustomerAccountMenuWidget';

// Import for registry
import { CustomerSignInWidget } from './CustomerSignInWidget';
import { CustomerProfileWidget } from './CustomerProfileWidget';
import { CustomerSubscriptionWidget } from './CustomerSubscriptionWidget';
import { CustomerAccountMenuWidget } from './CustomerAccountMenuWidget';

/**
 * All sign-in widgets for registration
 */
export const SIGNIN_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.customer-signin': CustomerSignInWidget,
  'stickernest.customer-profile': CustomerProfileWidget,
  'stickernest.customer-subscription': CustomerSubscriptionWidget,
  'stickernest.customer-account-menu': CustomerAccountMenuWidget,
};

/**
 * Recommended pipeline templates for common sign-in patterns
 */
export const SIGNIN_PIPELINE_TEMPLATES = {
  /**
   * Basic Account: Sign-in with profile
   * Simple authentication flow for basic member areas
   */
  basicAccount: {
    name: 'Basic Account',
    description: 'Sign-in with profile management',
    connections: [
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-profile',
        targetPort: 'onLogin',
      },
    ],
  },

  /**
   * Full Account Hub: Complete account management
   * Account menu connecting to all account widgets
   */
  fullAccountHub: {
    name: 'Full Account Hub',
    description: 'Complete account management with menu navigation',
    connections: [
      // Menu triggers SignIn
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onSignInClick',
        target: 'stickernest.customer-signin',
        targetPort: 'showLogin',
      },
      // SignIn updates Menu
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-account-menu',
        targetPort: 'onLogin',
      },
      // SignIn updates Profile
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-profile',
        targetPort: 'onLogin',
      },
      // SignIn updates Subscription
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-subscription',
        targetPort: 'onLogin',
      },
      // Menu navigates to Profile
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onProfileClick',
        target: 'stickernest.customer-profile',
        targetPort: 'refresh',
      },
      // Menu navigates to Subscription
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onSubscriptionClick',
        target: 'stickernest.customer-subscription',
        targetPort: 'refresh',
      },
    ],
  },

  /**
   * Subscription Flow: Sign-in with subscription management
   * For SaaS-style member areas with paid plans
   */
  subscriptionFlow: {
    name: 'Subscription Flow',
    description: 'Sign-in with subscription plan management',
    connections: [
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-subscription',
        targetPort: 'onLogin',
      },
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onRegister',
        target: 'stickernest.customer-subscription',
        targetPort: 'selectPlan',
        // New registrations go to plan selection
      },
    ],
  },

  /**
   * Commerce Integration: Sign-in connected to commerce widgets
   * Connects to existing CustomerDashboard and CustomerGate
   */
  commerceIntegration: {
    name: 'Commerce Integration',
    description: 'Sign-in integrated with commerce dashboard and gating',
    connections: [
      // SignIn to Dashboard
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-dashboard',
        targetPort: 'onLogin',
      },
      // SignIn to Gate
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-gate',
        targetPort: 'checkAccess',
      },
      // Logout propagation
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogout',
        target: 'stickernest.customer-account-menu',
        targetPort: 'onLogout',
      },
    ],
  },

  /**
   * Member Portal: Complete member area setup
   * Full sign-in system with profile, subscription, and orders
   */
  memberPortal: {
    name: 'Member Portal',
    description: 'Complete member area with all account features',
    connections: [
      // Account Menu as hub
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onSignInClick',
        target: 'stickernest.customer-signin',
        targetPort: 'showLogin',
      },
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onProfileClick',
        target: 'stickernest.customer-profile',
        targetPort: 'refresh',
      },
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onSubscriptionClick',
        target: 'stickernest.customer-subscription',
        targetPort: 'refresh',
      },
      {
        source: 'stickernest.customer-account-menu',
        sourcePort: 'onOrdersClick',
        target: 'stickernest.customer-dashboard',
        targetPort: 'refresh',
      },
      // Auth propagation
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-account-menu',
        targetPort: 'onLogin',
      },
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-profile',
        targetPort: 'onLogin',
      },
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-subscription',
        targetPort: 'onLogin',
      },
      {
        source: 'stickernest.customer-signin',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-dashboard',
        targetPort: 'onLogin',
      },
      // Profile updates propagate
      {
        source: 'stickernest.customer-profile',
        sourcePort: 'onProfileUpdate',
        target: 'stickernest.customer-account-menu',
        targetPort: 'onLogin',
      },
    ],
  },
};

/**
 * Get all sign-in widget manifests
 */
export function getSignInManifests() {
  return Object.values(SIGNIN_WIDGETS).map(w => w.manifest);
}
