/**
 * StickerNest v2 - Storefront Layout Demo Canvas
 *
 * Creates a pre-configured canvas using the StorefrontLayoutWidget
 * which provides a complete white-label e-commerce experience in a single widget.
 */

import type { WidgetInstance } from '../types/domain';

// ==================
// Constants
// ==================

const STOREFRONT_CANVAS_ID = 'storefront-layout-demo';
const CANVAS_PREFIX = 'stickernest-canvas-';
const CANVAS_INDEX_KEY = 'stickernest-canvas-index';
const DEMO_CONFIG_KEY = 'sn_demo_canvases';

// ==================
// Storefront Canvas Data
// ==================

const STOREFRONT_CANVAS_DATA = {
  canvas: {
    id: STOREFRONT_CANVAS_ID,
    userId: 'demo-creator',
    name: 'White-Label Storefront',
    slug: 'white-label-store',
    visibility: 'public' as const,
    createdAt: new Date().toISOString(),
    width: 1400,
    height: 900,
    hasPassword: false,
    description: 'Complete white-label storefront using StorefrontLayoutWidget',
    backgroundConfig: {
      type: 'solid' as const,
      color: '#0f172a',
    },
  },
  widgets: [
    // ========================================
    // STOREFRONT LAYOUT - FULL SCREEN
    // ========================================
    {
      id: 'storefront-layout-main',
      canvasId: STOREFRONT_CANVAS_ID,
      widgetDefId: 'stickernest.storefront-layout',
      version: '1.0.0',
      position: { x: 20, y: 20 },
      sizePreset: 'xl' as const,
      width: 1200,
      height: 800,
      rotation: 0,
      zIndex: 50,
      state: {
        // Store Identity
        storeName: 'Creator Shop',
        storeTagline: 'Digital products by creators, for creators',
        storeLogo: '',

        // Layout Options
        layout: 'standard',
        showHeader: true,
        showCart: true,
        showFooter: true,

        // Theme Colors (Purple theme)
        primaryColor: '#8b5cf6',
        secondaryColor: '#06b6d4',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        accentColor: '#f59e0b',

        // Product Display
        productsPerRow: 3,
        productCardStyle: 'card',
        showPrices: true,
        showQuickBuy: true,

        // Cart Behavior
        cartPosition: 'sidebar',
        showCartCount: true,

        // Customer Account
        enableGuestCheckout: true,
        showAccountMenu: true,
        requireLogin: false,

        // Footer
        footerText: 'Powered by StickerNest - White-Label E-Commerce',
        showPaymentIcons: true,
        socialLinks: {
          instagram: '',
          twitter: '',
          tiktok: '',
        },
      },
      visible: true,
      locked: false,
    },

    // ========================================
    // INSTRUCTIONS PANEL (FLOATING)
    // ========================================
    {
      id: 'storefront-instructions',
      canvasId: STOREFRONT_CANVAS_ID,
      widgetDefId: 'stickernest.basic-text',
      version: '1.0.0',
      position: { x: 1240, y: 20 },
      sizePreset: 'sm' as const,
      width: 140,
      height: 250,
      rotation: 0,
      zIndex: 100,
      state: {
        text: 'Storefront Layout Widget\n\nAll-in-one:\n- Product Grid\n- Cart Sidebar\n- Checkout\n- Account\n- Customer Auth\n\nFully customizable via config',
        fontSize: 11,
        fontFamily: 'system-ui',
        fontWeight: 'normal',
        textAlign: 'left',
        color: '#94a3b8',
      },
      visible: true,
      locked: false,
    },
  ] as WidgetInstance[],

  // No external pipelines needed - StorefrontLayout handles internal routing
  pipelines: [],
  entities: [],
};

// ==================
// Initialization Functions
// ==================

function storefrontCanvasExists(): boolean {
  try {
    const key = `${CANVAS_PREFIX}${STOREFRONT_CANVAS_ID}`;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function saveCanvas(): void {
  try {
    const key = `${CANVAS_PREFIX}${STOREFRONT_CANVAS_ID}`;
    localStorage.setItem(key, JSON.stringify(STOREFRONT_CANVAS_DATA));
  } catch (e) {
    console.error('[initStorefrontCanvas] Failed to save canvas:', e);
  }
}

function updateCanvasIndex(): void {
  try {
    const indexStr = localStorage.getItem(CANVAS_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];

    if (!index.includes(STOREFRONT_CANVAS_ID)) {
      index.unshift(STOREFRONT_CANVAS_ID);
      localStorage.setItem(CANVAS_INDEX_KEY, JSON.stringify(index));
    }
  } catch (e) {
    console.error('[initStorefrontCanvas] Failed to update canvas index:', e);
  }
}

function registerAsDemoCanvas(): void {
  try {
    const configStr = localStorage.getItem(DEMO_CONFIG_KEY);
    const config = configStr
      ? JSON.parse(configStr)
      : { canvases: [], defaultCanvasId: undefined };

    const alreadyRegistered = config.canvases.some(
      (c: { canvasId: string }) => c.canvasId === STOREFRONT_CANVAS_ID
    );

    if (!alreadyRegistered) {
      config.canvases.unshift({
        canvasId: STOREFRONT_CANVAS_ID,
        label: 'White-Label Storefront',
        description: 'Complete e-commerce in one widget',
      });

      localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('[initStorefrontCanvas] Failed to register demo canvas:', e);
  }
}

/**
 * Initialize the storefront layout demo canvas
 */
export function initStorefrontCanvas(): void {
  const exists = storefrontCanvasExists();

  if (!exists) {
    console.log('[initStorefrontCanvas] Creating storefront layout canvas...');
    saveCanvas();
    updateCanvasIndex();
    registerAsDemoCanvas();
    console.log('[initStorefrontCanvas] Storefront canvas created and registered');
  } else {
    registerAsDemoCanvas();
    console.log('[initStorefrontCanvas] Storefront canvas already exists, ensured registration');
  }
}

/**
 * Force reset the storefront canvas to default state
 */
export function resetStorefrontCanvas(): void {
  console.log('[initStorefrontCanvas] Resetting storefront canvas to defaults...');
  saveCanvas();
  updateCanvasIndex();
  registerAsDemoCanvas();
  console.log('[initStorefrontCanvas] Storefront canvas reset complete');
}

/**
 * Get the storefront canvas ID for reference
 */
export function getStorefrontCanvasId(): string {
  return STOREFRONT_CANVAS_ID;
}

export default initStorefrontCanvas;
