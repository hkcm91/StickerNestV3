/**
 * StickerNest v2 - Commerce API Unit Tests
 * Tests for the client-side commerce API service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  productsApi,
  checkoutApi,
  ordersApi,
  formsApi,
  customerAuthApi,
  creatorCommerceApi,
} from './commerce';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

/**
 * Create a valid mock JWT token with future expiration
 */
function createMockJwt(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'user-123',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  }));
  return `${header}.${payload}.mock-signature`;
}

describe('Commerce API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ========================================
  // Products API Tests
  // ========================================
  describe('productsApi', () => {
    describe('list', () => {
      it('should fetch products for a canvas', async () => {
        const mockProducts = [
          { id: 'prod-1', name: 'Product 1', priceCents: 1999 },
          { id: 'prod-2', name: 'Product 2', priceCents: 2999 },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, products: mockProducts }),
        });

        const result = await productsApi.list('canvas-123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/canvas/canvas-123/products'),
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('get', () => {
      it('should fetch a single product', async () => {
        const mockProduct = { id: 'prod-1', name: 'Test Product', priceCents: 1999 };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, product: mockProduct }),
        });

        const result = await productsApi.get('prod-1');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/products/prod-1'),
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('create', () => {
      it('should create a new product with auth', async () => {
        mockStorage['stickernest:access_token'] = createMockJwt();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, product: { id: 'new-prod' } }),
        });

        const result = await productsApi.create('canvas-123', {
          name: 'New Product',
          priceCents: 999,
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/canvas/canvas-123/products'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Headers),
          })
        );
        expect(result.success).toBe(true);
      });
    });
  });

  // ========================================
  // Checkout API Tests
  // ========================================
  describe('checkoutApi', () => {
    describe('create', () => {
      it('should create checkout session', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            url: 'https://checkout.stripe.com/session-123',
            sessionId: 'session-123',
          }),
        });

        const result = await checkoutApi.create('prod-1', {
          customerEmail: 'test@example.com',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/products/prod-1/checkout'),
          expect.objectContaining({ method: 'POST' })
        );
        expect(result.success).toBe(true);
      });
    });

    describe('verify', () => {
      it('should verify checkout session', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            order: { orderNumber: 'ORD-123', status: 'paid' },
          }),
        });

        const result = await checkoutApi.verify('session-123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/checkout/session-123/verify'),
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.success).toBe(true);
      });
    });
  });

  // ========================================
  // Orders API Tests
  // ========================================
  describe('ordersApi', () => {
    describe('list', () => {
      it('should fetch creator orders with auth', async () => {
        mockStorage['stickernest:access_token'] = createMockJwt();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
          }),
        });

        const result = await ordersApi.list({ limit: 10 });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/creator/orders'),
          expect.any(Object)
        );
      });
    });

    describe('refund', () => {
      it('should refund an order', async () => {
        mockStorage['stickernest:access_token'] = createMockJwt();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, order: { status: 'refunded' } }),
        });

        const result = await ordersApi.refund('order-123', 1000);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/orders/order-123/refund'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  // ========================================
  // Forms API Tests
  // ========================================
  describe('formsApi', () => {
    describe('submit', () => {
      it('should submit a form without auth', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            submission: { id: 'sub-123' },
          }),
        });

        const result = await formsApi.submit({
          canvasId: 'canvas-123',
          formType: 'contact',
          formData: { email: 'test@example.com', message: 'Hello' },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/forms/submit'),
          expect.objectContaining({ method: 'POST' })
        );
        expect(result.success).toBe(true);
      });

      it('should include UTM parameters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, submission: { id: 'sub-123' } }),
        });

        await formsApi.submit({
          canvasId: 'canvas-123',
          formType: 'newsletter',
          formData: { email: 'test@example.com' },
          utm_source: 'twitter',
          utm_medium: 'social',
          utm_campaign: 'launch',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('utm_source'),
          })
        );
      });
    });
  });

  // ========================================
  // Customer Auth API Tests
  // ========================================
  describe('customerAuthApi', () => {
    describe('sendMagicLink', () => {
      it('should send magic link request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, message: 'Magic link sent' }),
        });

        const result = await customerAuthApi.sendMagicLink(
          'test@example.com',
          'creator-123',
          'canvas-123'
        );

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/customer/magic-link'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    describe('verifyMagicLink', () => {
      it('should verify token and store session', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            data: {
              token: 'session-token-123',
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
              customer: { id: 'cust-123', email: 'test@example.com' },
            },
          }),
        });

        const result = await customerAuthApi.verifyMagicLink('magic-token-123');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/customer/verify-magic-link'),
          expect.objectContaining({ method: 'POST' })
        );
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'stickernest:customer_token',
          'session-token-123'
        );
      });
    });

    describe('checkAccess', () => {
      it('should check access with customer token', async () => {
        mockStorage['stickernest:customer_token'] = 'customer-token-123';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ success: true, data: { allowed: true } }),
        });

        const result = await customerAuthApi.checkAccess('canvas-123', 'widget-456');

        // Verify correct endpoint and query params
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/customer/access?canvasId=canvas-123&widgetId=widget-456'),
          expect.objectContaining({ method: 'GET' })
        );
        expect(result.success).toBe(true);
      });

      it('should return denied when not authenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            data: { allowed: false, reason: 'auth_required' },
          }),
        });

        const result = await customerAuthApi.checkAccess('canvas-123');

        expect(result.success).toBe(true);
      });
    });

    describe('logout', () => {
      it('should clear customer token', () => {
        mockStorage['stickernest:customer_token'] = 'token-123';

        customerAuthApi.logout();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('stickernest:customer_token');
      });
    });

    describe('getToken', () => {
      it('should return stored token', () => {
        mockStorage['stickernest:customer_token'] = 'stored-token';

        const token = customerAuthApi.getToken();

        expect(token).toBe('stored-token');
      });

      it('should return null when no token', () => {
        const token = customerAuthApi.getToken();

        expect(token).toBeNull();
      });
    });
  });

  // ========================================
  // Creator Commerce API Tests
  // ========================================
  describe('creatorCommerceApi', () => {
    describe('getRevenueSummary', () => {
      it('should fetch revenue summary', async () => {
        mockStorage['stickernest:access_token'] = createMockJwt();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            data: {
              totalRevenue: 50000,
              totalOrders: 25,
              averageOrderValue: 2000,
            },
          }),
        });

        const result = await creatorCommerceApi.getRevenueSummary(30);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/creator/analytics/revenue?days=30'),
          expect.any(Object)
        );
      });
    });

    describe('getLeadsSummary', () => {
      it('should fetch leads summary', async () => {
        mockStorage['stickernest:access_token'] = createMockJwt();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            success: true,
            data: {
              totalLeads: 100,
              newLeads: 25,
              conversionRate: 12.5,
            },
          }),
        });

        const result = await creatorCommerceApi.getLeadsSummary(7);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/commerce/creator/analytics/leads?days=7'),
          expect.any(Object)
        );
      });
    });
  });
});
