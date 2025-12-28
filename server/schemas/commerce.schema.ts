/**
 * StickerNest v2 - Commerce Validation Schemas
 * Zod schemas for commerce API endpoints
 */

import { z } from 'zod';

// ============================================================================
// Product Schemas
// ============================================================================

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  priceCents: z.number().int().min(0),
  compareAtPriceCents: z.number().int().min(0).optional(),
  productType: z.enum(['one_time', 'subscription', 'digital_download']).default('one_time'),
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
  downloadUrl: z.string().url().optional(),
  trackInventory: z.boolean().default(false),
  inventoryCount: z.number().int().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial().extend({
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const productIdParamSchema = z.object({
  productId: z.string().cuid(),
});

export const canvasIdParamSchema = z.object({
  canvasId: z.string().cuid(),
});

export const reorderProductsSchema = z.object({
  productIds: z.array(z.string().cuid()),
});

// ============================================================================
// Checkout Schemas
// ============================================================================

export const createCheckoutSchema = z.object({
  customerEmail: z.string().email().optional(),
  customerName: z.string().max(200).optional(),
  returnUrl: z.string().url().optional(),
});

// ============================================================================
// Order Schemas
// ============================================================================

export const orderIdParamSchema = z.object({
  orderId: z.string().cuid(),
});

export const listOrdersQuerySchema = z.object({
  canvasId: z.string().cuid().optional(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded', 'partial_refund']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const refundOrderSchema = z.object({
  amountCents: z.number().int().min(0).optional(), // Partial refund amount
});

// ============================================================================
// Form Submission Schemas
// ============================================================================

export const submitFormSchema = z.object({
  canvasId: z.string().cuid(),
  widgetId: z.string(),
  formType: z.string().max(50).default('generic'),
  formData: z.record(z.any()),
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

export const listSubmissionsQuerySchema = z.object({
  canvasId: z.string().cuid().optional(),
  formType: z.string().optional(),
  status: z.enum(['new', 'contacted', 'converted', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateSubmissionSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'archived']).optional(),
  notes: z.string().max(2000).optional(),
});

export const submissionIdParamSchema = z.object({
  submissionId: z.string().cuid(),
});

// ============================================================================
// Customer Auth Schemas
// ============================================================================

export const sendMagicLinkSchema = z.object({
  email: z.string().email(),
  creatorId: z.string().cuid(),
  canvasId: z.string().cuid().optional(),
  redirectUrl: z.string().url().optional(),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().length(64), // 32 bytes hex = 64 chars
});

export const checkAccessSchema = z.object({
  canvasId: z.string().cuid(),
  widgetId: z.string().optional(),
});

// ============================================================================
// Notification Settings Schemas
// ============================================================================

export const updateNotificationSettingsSchema = z.object({
  emailOnFormSubmission: z.boolean().optional(),
  emailOnOrder: z.boolean().optional(),
  emailDigestFrequency: z.enum(['instant', 'daily', 'weekly', 'none']).optional(),
  notificationEmail: z.string().email().optional().nullable(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookEnabled: z.boolean().optional(),
  webhookEvents: z.array(z.string()).optional(),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type SubmitFormInput = z.infer<typeof submitFormSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type SendMagicLinkInput = z.infer<typeof sendMagicLinkSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
