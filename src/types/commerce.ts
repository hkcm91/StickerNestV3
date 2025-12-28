/**
 * StickerNest v2 - Commerce Types
 * Types for shoppable canvas pages, products, orders, and customers
 */

// ============================================================================
// Product Types
// ============================================================================

export type CanvasProductType = 'one_time' | 'subscription' | 'digital_download';
export type BillingInterval = 'monthly' | 'yearly';

export interface CanvasProduct {
  id: string;
  canvasId: string;
  creatorId: string;

  // Product details
  name: string;
  description?: string;
  imageUrl?: string;

  // Pricing (in cents)
  priceCents: number;
  compareAtPriceCents?: number;
  currency: string;

  // Type
  productType: CanvasProductType;
  billingInterval?: BillingInterval;

  // For digital downloads
  downloadUrl?: string;
  downloadLimit: number;

  // Inventory
  trackInventory: boolean;
  inventoryCount: number;

  // Status
  active: boolean;
  sortOrder: number;

  // Computed
  inStock: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  imageUrl?: string;
  priceCents: number;
  compareAtPriceCents?: number;
  productType?: CanvasProductType;
  billingInterval?: BillingInterval;
  downloadUrl?: string;
  trackInventory?: boolean;
  inventoryCount?: number;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  active?: boolean;
  sortOrder?: number;
}

// ============================================================================
// Order Types
// ============================================================================

export type CanvasOrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';

export interface CanvasOrder {
  id: string;
  orderNumber: string;

  // Relations
  canvasId: string;
  productId: string;
  creatorId: string;
  customerId?: string;

  // Customer info
  customerEmail: string;
  customerName?: string;

  // Pricing
  amountCents: number;
  currency: string;

  // Status
  status: CanvasOrderStatus;

  // Fulfillment
  fulfilledAt?: string;
  downloadCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Expanded relations
  product?: CanvasProduct;
}

export interface CreateCheckoutInput {
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

// ============================================================================
// Form Submission Types
// ============================================================================

export type FormSubmissionStatus = 'new' | 'contacted' | 'converted' | 'archived';

export interface FormSubmission {
  id: string;
  canvasId: string;
  creatorId: string;
  widgetId: string;

  // Form data
  formData: Record<string, any>;
  formType: string;

  // Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  // Status
  status: FormSubmissionStatus;
  notes?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Expanded
  canvas?: { name: string; slug?: string };
}

export interface SubmitFormInput {
  canvasId: string;
  widgetId: string;
  formType?: string;
  formData: Record<string, any>;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// ============================================================================
// Customer Types
// ============================================================================

export type CustomerAuthProvider = 'magic_link' | 'google' | 'email_password';

export interface CanvasCustomer {
  id: string;
  creatorId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  authProvider: CustomerAuthProvider;
  emailVerified: boolean;
  totalOrders: number;
  totalSpentCents: number;
  createdAt: string;
  lastSeenAt?: string;
}

export interface CustomerSession {
  token: string;
  expiresAt: string;
  customer: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
}

// ============================================================================
// Content Gate Types
// ============================================================================

export type ContentGateType = 'canvas' | 'widget' | 'section';

export interface ContentGate {
  id: string;
  canvasId: string;
  gateType: ContentGateType;
  targetId?: string;
  requiresAuth: boolean;
  requiresSubscription: boolean;
  subscriptionProductId?: string;
  requiresPurchase: boolean;
  purchaseProductId?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: 'auth_required' | 'subscription_required' | 'purchase_required';
  gateId?: string;
}

// ============================================================================
// Notification Settings Types
// ============================================================================

export interface CreatorNotificationSettings {
  id: string;
  creatorId: string;
  emailOnFormSubmission: boolean;
  emailOnOrder: boolean;
  emailDigestFrequency: 'instant' | 'daily' | 'weekly' | 'none';
  notificationEmail?: string;
  webhookUrl?: string;
  webhookEnabled: boolean;
  webhookEvents: string[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface RevenueSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface LeadsSummary {
  totalLeads: number;
  newLeads: number;
  conversionRate: number;
  leadsByType: Record<string, number>;
  leadsByDay: Array<{
    date: string;
    count: number;
  }>;
}
