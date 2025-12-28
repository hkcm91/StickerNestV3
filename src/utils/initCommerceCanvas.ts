/**
 * StickerNest v2 - Commerce Demo Canvas Initialization
 *
 * Creates a pre-configured commerce canvas with all storefront widgets
 * set up and wired together for testing the white-label e-commerce flow.
 */

import type { WidgetInstance } from '../types/domain';

// ==================
// Constants
// ==================

const COMMERCE_CANVAS_ID = 'commerce-storefront-demo';
const CANVAS_PREFIX = 'stickernest-canvas-';
const CANVAS_INDEX_KEY = 'stickernest-canvas-index';
const DEMO_CONFIG_KEY = 'sn_demo_canvases';

// ==================
// Commerce Canvas Data
// ==================

const COMMERCE_CANVAS_DATA = {
  canvas: {
    id: COMMERCE_CANVAS_ID,
    userId: 'demo-creator',
    name: 'Storefront Demo',
    slug: 'storefront-demo',
    visibility: 'public' as const,
    createdAt: new Date().toISOString(),
    width: 1400,
    height: 900,
    hasPassword: false,
    description: 'Complete commerce storefront demo with all widgets connected',
    backgroundConfig: {
      type: 'gradient' as const,
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    },
  },
  widgets: [
    // ========================================
    // HEADER SECTION
    // ========================================

    // Store Title
    {
      id: 'commerce-widget-title',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 20 },
      sizePreset: 'lg' as const,
      width: 400,
      height: 60,
      rotation: 0,
      zIndex: 100,
      state: {
        text: 'Creator Store Demo',
        fontSize: 32,
        fontFamily: 'system-ui',
        fontWeight: 'bold',
        textAlign: 'left',
        color: '#f8fafc',
      },
      visible: true,
      locked: false,
    },

    // Customer Login Widget (top right)
    {
      id: 'commerce-widget-login',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.customer-login',
      version: '1.0.0',
      position: { x: 1100, y: 20 },
      sizePreset: 'sm' as const,
      width: 280,
      height: 200,
      rotation: 0,
      zIndex: 90,
      state: {
        accentColor: '#8b5cf6',
        title: 'Customer Login',
        subtitle: 'Enter your email for access',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // MAIN CONTENT - LEFT SIDE: PRODUCT GALLERY
    // ========================================

    // Product Gallery Widget
    {
      id: 'commerce-widget-gallery',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.product-gallery',
      version: '1.0.0',
      position: { x: 40, y: 100 },
      sizePreset: 'lg' as const,
      width: 680,
      height: 480,
      rotation: 0,
      zIndex: 50,
      state: {
        columns: 2,
        showPrices: true,
        showDescriptions: true,
        cardStyle: 'elevated',
        emptyMessage: 'Add products in creator dashboard',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // MAIN CONTENT - RIGHT SIDE: CHECKOUT FLOW
    // ========================================

    // Checkout Flow Widget
    {
      id: 'commerce-widget-checkout',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.checkout-flow',
      version: '1.0.0',
      position: { x: 740, y: 100 },
      sizePreset: 'md' as const,
      width: 340,
      height: 320,
      rotation: 0,
      zIndex: 50,
      state: {
        buttonText: 'Complete Purchase',
        accentColor: '#10b981',
        showOrderSummary: true,
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // CUSTOMER DASHBOARD (BELOW CHECKOUT)
    // ========================================

    // Customer Dashboard Widget
    {
      id: 'commerce-widget-dashboard',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.customer-dashboard',
      version: '1.0.0',
      position: { x: 740, y: 440 },
      sizePreset: 'md' as const,
      width: 340,
      height: 300,
      rotation: 0,
      zIndex: 50,
      state: {
        showOrders: true,
        showDownloads: true,
        accentColor: '#8b5cf6',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // LEAD CAPTURE (BOTTOM LEFT)
    // ========================================

    // Lead Capture Widget
    {
      id: 'commerce-widget-leadcapture',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.lead-capture',
      version: '1.0.0',
      position: { x: 40, y: 600 },
      sizePreset: 'md' as const,
      width: 340,
      height: 200,
      rotation: 0,
      zIndex: 40,
      state: {
        title: 'Get Updates',
        subtitle: 'Subscribe for new product launches',
        buttonText: 'Subscribe',
        accentColor: '#f59e0b',
        fields: ['email'],
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // CUSTOMER GATE (FOR GATED CONTENT)
    // ========================================

    // Customer Gate Widget (bottom center)
    {
      id: 'commerce-widget-gate',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.customer-gate',
      version: '1.0.0',
      position: { x: 400, y: 600 },
      sizePreset: 'md' as const,
      width: 320,
      height: 200,
      rotation: 0,
      zIndex: 40,
      state: {
        gateType: 'auth',
        lockedMessage: 'Login to access exclusive content',
        unlockedContent: 'Welcome! You now have access to premium content.',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // PRODUCT CARDS (INDIVIDUAL)
    // ========================================

    // Product Card 1
    {
      id: 'commerce-widget-product1',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.product-card',
      version: '1.0.0',
      position: { x: 1100, y: 240 },
      sizePreset: 'sm' as const,
      width: 280,
      height: 320,
      rotation: 0,
      zIndex: 45,
      state: {
        name: 'Digital Art Pack',
        price: 1999,
        currency: 'USD',
        buttonText: 'Buy Now',
        buttonColor: '#8b5cf6',
        theme: 'dark',
        description: 'High-quality digital art assets',
      },
      visible: true,
      locked: false,
    },

    // Product Card 2
    {
      id: 'commerce-widget-product2',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.product-card',
      version: '1.0.0',
      position: { x: 1100, y: 580 },
      sizePreset: 'sm' as const,
      width: 280,
      height: 320,
      rotation: 0,
      zIndex: 45,
      state: {
        name: 'Premium Templates',
        price: 4999,
        currency: 'USD',
        buttonText: 'Get Access',
        buttonColor: '#10b981',
        theme: 'dark',
        description: 'Professional design templates',
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // INSTRUCTIONS TEXT
    // ========================================

    {
      id: 'commerce-widget-instructions',
      canvasId: COMMERCE_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 40, y: 820 },
      sizePreset: 'lg' as const,
      width: 680,
      height: 60,
      rotation: 0,
      zIndex: 30,
      state: {
        text: 'Pipeline Flow: ProductGallery → CheckoutFlow → CustomerDashboard | CustomerLogin → CustomerGate',
        fontSize: 13,
        fontFamily: 'monospace',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },
  ] as WidgetInstance[],

  // ==================
  // PIPELINES - Widget Connections
  // ==================
  pipelines: [
    // Pipeline 1: Product Gallery → Checkout Flow
    // When user clicks "Buy" on a product in gallery, send to checkout
    {
      id: 'pipeline-gallery-checkout',
      name: 'Product Selection to Checkout',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-gallery-buy',
          sourceWidgetId: 'commerce-widget-gallery',
          sourcePortId: 'onBuyClick',
          targetWidgetId: 'commerce-widget-checkout',
          targetPortId: 'product',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 2: Checkout Flow → Customer Dashboard
    // When purchase completes, update dashboard
    {
      id: 'pipeline-checkout-dashboard',
      name: 'Purchase to Dashboard',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-checkout-purchase',
          sourceWidgetId: 'commerce-widget-checkout',
          sourcePortId: 'onPurchaseComplete',
          targetWidgetId: 'commerce-widget-dashboard',
          targetPortId: 'onPurchase',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 3: Customer Login → Customer Dashboard
    // When customer logs in, update dashboard
    {
      id: 'pipeline-login-dashboard',
      name: 'Login to Dashboard',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-login-dashboard',
          sourceWidgetId: 'commerce-widget-login',
          sourcePortId: 'onLogin',
          targetWidgetId: 'commerce-widget-dashboard',
          targetPortId: 'onLogin',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 4: Customer Login → Customer Gate
    // When customer logs in, unlock gated content
    {
      id: 'pipeline-login-gate',
      name: 'Login to Unlock Content',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-login-gate',
          sourceWidgetId: 'commerce-widget-login',
          sourcePortId: 'onLogin',
          targetWidgetId: 'commerce-widget-gate',
          targetPortId: 'checkAccess',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 5: Lead Capture → Customer Gate
    // When lead submits form, unlock gated content
    {
      id: 'pipeline-lead-gate',
      name: 'Lead Capture to Gate',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-lead-gate',
          sourceWidgetId: 'commerce-widget-leadcapture',
          sourcePortId: 'onSubmit',
          targetWidgetId: 'commerce-widget-gate',
          targetPortId: 'checkAccess',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 6: Product Card 1 → Checkout Flow
    {
      id: 'pipeline-product1-checkout',
      name: 'Product Card 1 to Checkout',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-product1-buy',
          sourceWidgetId: 'commerce-widget-product1',
          sourcePortId: 'onBuy',
          targetWidgetId: 'commerce-widget-checkout',
          targetPortId: 'product',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },

    // Pipeline 7: Product Card 2 → Checkout Flow
    {
      id: 'pipeline-product2-checkout',
      name: 'Product Card 2 to Checkout',
      canvasId: COMMERCE_CANVAS_ID,
      enabled: true,
      connections: [
        {
          id: 'conn-product2-buy',
          sourceWidgetId: 'commerce-widget-product2',
          sourcePortId: 'onBuy',
          targetWidgetId: 'commerce-widget-checkout',
          targetPortId: 'product',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  entities: [],
};

// ==================
// Initialization Functions
// ==================

/**
 * Check if commerce canvas already exists
 */
function commerceCanvasExists(): boolean {
  try {
    const key = `${CANVAS_PREFIX}${COMMERCE_CANVAS_ID}`;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Save canvas to localStorage
 */
function saveCanvas(): void {
  try {
    const key = `${CANVAS_PREFIX}${COMMERCE_CANVAS_ID}`;
    localStorage.setItem(key, JSON.stringify(COMMERCE_CANVAS_DATA));
  } catch (e) {
    console.error('[initCommerceCanvas] Failed to save canvas:', e);
  }
}

/**
 * Update canvas index to include commerce canvas
 */
function updateCanvasIndex(): void {
  try {
    const indexStr = localStorage.getItem(CANVAS_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];

    if (!index.includes(COMMERCE_CANVAS_ID)) {
      index.unshift(COMMERCE_CANVAS_ID); // Add at beginning for easy access
      localStorage.setItem(CANVAS_INDEX_KEY, JSON.stringify(index));
    }
  } catch (e) {
    console.error('[initCommerceCanvas] Failed to update canvas index:', e);
  }
}

/**
 * Register canvas as a demo canvas
 */
function registerAsDemoCanvas(): void {
  try {
    const configStr = localStorage.getItem(DEMO_CONFIG_KEY);
    const config = configStr
      ? JSON.parse(configStr)
      : { canvases: [], defaultCanvasId: undefined };

    // Check if already registered
    const alreadyRegistered = config.canvases.some(
      (c: { canvasId: string }) => c.canvasId === COMMERCE_CANVAS_ID
    );

    if (!alreadyRegistered) {
      config.canvases.unshift({
        canvasId: COMMERCE_CANVAS_ID,
        label: 'Commerce Storefront Demo',
        description: 'Test the complete e-commerce widget pipeline',
      });

      localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('[initCommerceCanvas] Failed to register demo canvas:', e);
  }
}

/**
 * Initialize the commerce demo canvas
 * Creates a pre-configured canvas with all commerce widgets if it doesn't exist
 */
export function initCommerceCanvas(): void {
  const exists = commerceCanvasExists();

  if (!exists) {
    console.log('[initCommerceCanvas] Creating commerce storefront canvas...');
    saveCanvas();
    updateCanvasIndex();
    registerAsDemoCanvas();
    console.log('[initCommerceCanvas] Commerce canvas created and registered');
  } else {
    // Just ensure it's registered as a demo
    registerAsDemoCanvas();
    console.log('[initCommerceCanvas] Commerce canvas already exists, ensured registration');
  }
}

/**
 * Force reset the commerce canvas to default state
 */
export function resetCommerceCanvas(): void {
  console.log('[initCommerceCanvas] Resetting commerce canvas to defaults...');
  saveCanvas();
  updateCanvasIndex();
  registerAsDemoCanvas();
  console.log('[initCommerceCanvas] Commerce canvas reset complete');
}

/**
 * Get the commerce canvas ID for reference
 */
export function getCommerceCanvasId(): string {
  return COMMERCE_CANVAS_ID;
}

export default initCommerceCanvas;
