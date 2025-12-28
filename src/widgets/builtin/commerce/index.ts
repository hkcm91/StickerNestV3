/**
 * StickerNest v2 - Commerce Widgets
 * Complete set of widgets for building white-label storefronts
 *
 * Pipeline Flow Example:
 *
 * [ProductGallery] --onBuyClick--> [CheckoutFlow] --onPurchaseComplete--> [CustomerDashboard]
 *       |                                                                        ^
 *       +--onProductSelect------------------------------------------------------+
 *
 * [CustomerLogin] --onLogin--> [CustomerDashboard]
 *        |
 *        +--onLogin--> [CustomerGate] (unlocks)
 */

import type { BuiltinWidget } from '../index';

// Re-export widget types
export type { BuiltinWidget };

// Import commerce widgets
export { ProductGalleryWidget, ProductGalleryWidgetManifest } from './ProductGalleryWidget';
export { CheckoutFlowWidget, CheckoutFlowWidgetManifest } from './CheckoutFlowWidget';
export { CustomerDashboardWidget, CustomerDashboardWidgetManifest } from './CustomerDashboardWidget';
export { StorefrontLayoutWidget, StorefrontLayoutWidgetManifest } from './StorefrontLayoutWidget';

// Import from parent directory (these were created earlier)
import { ProductCardWidget } from '../ProductCardWidget';
import { LeadCaptureWidget } from '../LeadCaptureWidget';
import { CustomerLoginWidget } from '../CustomerLoginWidget';
import { CustomerGateWidget } from '../CustomerGateWidget';

// Re-export for convenience
export { ProductCardWidget, LeadCaptureWidget, CustomerLoginWidget, CustomerGateWidget };

// Import new widgets
import { ProductGalleryWidget } from './ProductGalleryWidget';
import { CheckoutFlowWidget } from './CheckoutFlowWidget';
import { CustomerDashboardWidget } from './CustomerDashboardWidget';
import { StorefrontLayoutWidget } from './StorefrontLayoutWidget';

/**
 * All commerce widgets for registration
 */
export const COMMERCE_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.product-card': ProductCardWidget,
  'stickernest.lead-capture': LeadCaptureWidget,
  'stickernest.customer-login': CustomerLoginWidget,
  'stickernest.customer-gate': CustomerGateWidget,
  'stickernest.product-gallery': ProductGalleryWidget,
  'stickernest.checkout-flow': CheckoutFlowWidget,
  'stickernest.customer-dashboard': CustomerDashboardWidget,
  'stickernest.storefront-layout': StorefrontLayoutWidget,
};

/**
 * Recommended pipeline templates for common storefront patterns
 */
export const COMMERCE_PIPELINE_TEMPLATES = {
  /**
   * Simple Shop: Browse → Buy → Download
   */
  simpleShop: {
    name: 'Simple Shop',
    description: 'Product gallery with checkout flow',
    connections: [
      {
        source: 'stickernest.product-gallery',
        sourcePort: 'onBuyClick',
        target: 'stickernest.checkout-flow',
        targetPort: 'product',
      },
    ],
  },

  /**
   * Member Area: Login → Dashboard with downloads
   */
  memberArea: {
    name: 'Member Area',
    description: 'Customer login with dashboard access',
    connections: [
      {
        source: 'stickernest.customer-login',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-dashboard',
        targetPort: 'onLogin',
      },
      {
        source: 'stickernest.customer-login',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-gate',
        targetPort: 'checkAccess',
      },
    ],
  },

  /**
   * Full Storefront: Complete e-commerce flow
   */
  fullStorefront: {
    name: 'Full Storefront',
    description: 'Complete shop with login and member area',
    connections: [
      {
        source: 'stickernest.product-gallery',
        sourcePort: 'onBuyClick',
        target: 'stickernest.checkout-flow',
        targetPort: 'product',
      },
      {
        source: 'stickernest.checkout-flow',
        sourcePort: 'onPurchaseComplete',
        target: 'stickernest.customer-dashboard',
        targetPort: 'onPurchase',
      },
      {
        source: 'stickernest.customer-login',
        sourcePort: 'onLogin',
        target: 'stickernest.customer-dashboard',
        targetPort: 'onLogin',
      },
    ],
  },

  /**
   * Lead Generation: Capture leads with gated content
   */
  leadGeneration: {
    name: 'Lead Generation',
    description: 'Lead capture with content gating',
    connections: [
      {
        source: 'stickernest.lead-capture',
        sourcePort: 'onSubmit',
        target: 'stickernest.customer-gate',
        targetPort: 'checkAccess',
      },
    ],
  },
};
