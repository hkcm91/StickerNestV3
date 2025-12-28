/**
 * StickerNest v2 - Commerce API Module
 * Canvas products, orders, checkout, forms, and customer auth
 */

import { request } from './client';
import type { ApiResponse, PaginatedResponse } from './types';
import type {
  CanvasProduct,
  CanvasOrder,
  FormSubmission,
  CreateProductInput,
  UpdateProductInput,
  CreateCheckoutInput,
  CheckoutResponse,
  SubmitFormInput,
  CustomerSession,
  AccessCheckResult,
  CreatorNotificationSettings,
  RevenueSummary,
  LeadsSummary,
} from '../../types/commerce';

// ============================================================================
// Products API
// ============================================================================

export const productsApi = {
  /**
   * List products for a canvas
   */
  async list(canvasId: string): Promise<ApiResponse<{ products: CanvasProduct[] }>> {
    return request<{ products: CanvasProduct[] }>(`/commerce/canvas/${canvasId}/products`, {
      method: 'GET',
    });
  },

  /**
   * Get a single product
   */
  async get(productId: string): Promise<ApiResponse<{ product: CanvasProduct }>> {
    return request<{ product: CanvasProduct }>(`/commerce/products/${productId}`, {
      method: 'GET',
    });
  },

  /**
   * Create a new product
   */
  async create(canvasId: string, input: CreateProductInput): Promise<ApiResponse<{ product: CanvasProduct }>> {
    return request<{ product: CanvasProduct }>(`/commerce/canvas/${canvasId}/products`, {
      method: 'POST',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Update a product
   */
  async update(productId: string, input: UpdateProductInput): Promise<ApiResponse<{ product: CanvasProduct }>> {
    return request<{ product: CanvasProduct }>(`/commerce/products/${productId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Delete a product
   */
  async delete(productId: string): Promise<ApiResponse<void>> {
    return request<void>(`/commerce/products/${productId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },

  /**
   * Reorder products
   */
  async reorder(canvasId: string, productIds: string[]): Promise<ApiResponse<void>> {
    return request<void>(`/commerce/canvas/${canvasId}/products/reorder`, {
      method: 'POST',
      requiresAuth: true,
      body: { productIds },
    });
  },
};

// ============================================================================
// Checkout API
// ============================================================================

export const checkoutApi = {
  /**
   * Create a checkout session for a product
   */
  async create(productId: string, input: CreateCheckoutInput = {}): Promise<ApiResponse<CheckoutResponse>> {
    return request<CheckoutResponse>(`/commerce/products/${productId}/checkout`, {
      method: 'POST',
      body: input,
    });
  },

  /**
   * Verify a checkout session (after redirect back from Stripe)
   */
  async verify(sessionId: string): Promise<ApiResponse<{ order: CanvasOrder }>> {
    return request<{ order: CanvasOrder }>(`/commerce/checkout/${sessionId}/verify`, {
      method: 'GET',
    });
  },
};

// ============================================================================
// Orders API
// ============================================================================

export interface ListOrdersQuery {
  canvasId?: string;
  status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  limit?: number;
  offset?: number;
}

export const ordersApi = {
  /**
   * List orders for creator
   */
  async list(query?: ListOrdersQuery): Promise<ApiResponse<PaginatedResponse<CanvasOrder>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return request<PaginatedResponse<CanvasOrder>>(
      `/commerce/creator/orders${queryString ? `?${queryString}` : ''}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Get a single order
   */
  async get(orderId: string): Promise<ApiResponse<{ order: CanvasOrder }>> {
    return request<{ order: CanvasOrder }>(`/commerce/orders/${orderId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Refund an order
   */
  async refund(orderId: string, amountCents?: number): Promise<ApiResponse<{ order: CanvasOrder }>> {
    return request<{ order: CanvasOrder }>(`/commerce/orders/${orderId}/refund`, {
      method: 'POST',
      requiresAuth: true,
      body: amountCents !== undefined ? { amountCents } : {},
    });
  },
};

// ============================================================================
// Form Submissions API
// ============================================================================

export interface ListSubmissionsQuery {
  canvasId?: string;
  formType?: string;
  status?: 'new' | 'contacted' | 'converted' | 'archived';
  limit?: number;
  offset?: number;
}

export const formsApi = {
  /**
   * Submit a form (public endpoint)
   */
  async submit(input: SubmitFormInput): Promise<ApiResponse<{ submission: FormSubmission }>> {
    return request<{ submission: FormSubmission }>('/commerce/forms/submit', {
      method: 'POST',
      body: input,
    });
  },

  /**
   * List form submissions for creator
   */
  async list(query?: ListSubmissionsQuery): Promise<ApiResponse<PaginatedResponse<FormSubmission>>> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return request<PaginatedResponse<FormSubmission>>(
      `/commerce/creator/submissions${queryString ? `?${queryString}` : ''}`,
      { method: 'GET', requiresAuth: true }
    );
  },

  /**
   * Get a single submission
   */
  async get(submissionId: string): Promise<ApiResponse<{ submission: FormSubmission }>> {
    return request<{ submission: FormSubmission }>(`/commerce/submissions/${submissionId}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Update submission status/notes
   */
  async update(
    submissionId: string,
    input: { status?: 'new' | 'contacted' | 'converted' | 'archived'; notes?: string }
  ): Promise<ApiResponse<{ submission: FormSubmission }>> {
    return request<{ submission: FormSubmission }>(`/commerce/submissions/${submissionId}`, {
      method: 'PUT',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Delete a submission
   */
  async delete(submissionId: string): Promise<ApiResponse<void>> {
    return request<void>(`/commerce/submissions/${submissionId}`, {
      method: 'DELETE',
      requiresAuth: true,
    });
  },
};

// ============================================================================
// Customer Auth API
// ============================================================================

const CUSTOMER_TOKEN_KEY = 'stickernest:customer_token';

export const customerAuthApi = {
  /**
   * Send magic link to customer email
   */
  async sendMagicLink(email: string, creatorId: string, canvasId?: string, redirectUrl?: string): Promise<ApiResponse<void>> {
    return request<void>('/commerce/customer/magic-link', {
      method: 'POST',
      body: { email, creatorId, canvasId, redirectUrl },
    });
  },

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<ApiResponse<CustomerSession>> {
    const response = await request<CustomerSession>('/commerce/customer/verify-magic-link', {
      method: 'POST',
      body: { token },
    });

    // Store token on success
    if (response.success && response.data?.token) {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, response.data.token);
    }

    return response;
  },

  /**
   * Check access to gated content
   */
  async checkAccess(canvasId: string, widgetId?: string): Promise<ApiResponse<AccessCheckResult>> {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    const params = new URLSearchParams({ canvasId });
    if (widgetId) params.set('widgetId', widgetId);

    return request<AccessCheckResult>(`/commerce/customer/access?${params.toString()}`, {
      method: 'GET',
      headers: token ? { 'X-Customer-Token': token } : undefined,
    });
  },

  /**
   * Get current customer session
   */
  async getSession(): Promise<ApiResponse<CustomerSession | null>> {
    const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!token) {
      return { success: true, data: null };
    }

    return request<CustomerSession>('/commerce/customer/session', {
      method: 'GET',
      headers: { 'X-Customer-Token': token },
    });
  },

  /**
   * Logout customer
   */
  logout(): void {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  },

  /**
   * Get stored customer token
   */
  getToken(): string | null {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  },
};

// ============================================================================
// Creator Settings API
// ============================================================================

export const creatorCommerceApi = {
  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<ApiResponse<{ settings: CreatorNotificationSettings }>> {
    return request<{ settings: CreatorNotificationSettings }>('/commerce/creator/notification-settings', {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    input: Partial<Omit<CreatorNotificationSettings, 'id' | 'creatorId'>>
  ): Promise<ApiResponse<{ settings: CreatorNotificationSettings }>> {
    return request<{ settings: CreatorNotificationSettings }>('/commerce/creator/notification-settings', {
      method: 'PUT',
      requiresAuth: true,
      body: input,
    });
  },

  /**
   * Get revenue summary
   */
  async getRevenueSummary(days = 30): Promise<ApiResponse<RevenueSummary>> {
    return request<RevenueSummary>(`/commerce/creator/analytics/revenue?days=${days}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },

  /**
   * Get leads summary
   */
  async getLeadsSummary(days = 30): Promise<ApiResponse<LeadsSummary>> {
    return request<LeadsSummary>(`/commerce/creator/analytics/leads?days=${days}`, {
      method: 'GET',
      requiresAuth: true,
    });
  },
};

// ============================================================================
// Combined Commerce API Export
// ============================================================================

export const commerceApi = {
  products: productsApi,
  checkout: checkoutApi,
  orders: ordersApi,
  forms: formsApi,
  customerAuth: customerAuthApi,
  creator: creatorCommerceApi,
};

export default commerceApi;
