/**
 * StickerNest v2 - Commerce Routes
 * API endpoints for canvas products, orders, and checkout
 */

import { Router } from 'express';
import express from 'express';
import * as commerceController from '../controllers/commerce/index.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  canvasIdParamSchema,
  reorderProductsSchema,
  createCheckoutSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  refundOrderSchema,
  submitFormSchema,
  listSubmissionsQuerySchema,
  updateSubmissionSchema,
  submissionIdParamSchema,
  sendMagicLinkSchema,
  verifyMagicLinkSchema,
  checkAccessSchema,
} from '../schemas/commerce.schema.js';

const router = Router();

// ============================================================================
// Product Management (Creator-only)
// ============================================================================

/**
 * @route GET /api/commerce/canvas/:canvasId/products
 * @desc List products for a canvas
 * @access Public (shows active only) / Private (shows all for owner)
 */
router.get(
  '/canvas/:canvasId/products',
  optionalAuth,
  validateParams(canvasIdParamSchema),
  commerceController.listProducts
);

/**
 * @route POST /api/commerce/canvas/:canvasId/products
 * @desc Create a product
 * @access Private (owner only)
 */
router.post(
  '/canvas/:canvasId/products',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(createProductSchema),
  commerceController.createProduct
);

/**
 * @route POST /api/commerce/canvas/:canvasId/products/reorder
 * @desc Reorder products
 * @access Private (owner only)
 */
router.post(
  '/canvas/:canvasId/products/reorder',
  authenticate,
  validateParams(canvasIdParamSchema),
  validateBody(reorderProductsSchema),
  commerceController.reorderProducts
);

// ============================================================================
// Public Product Access
// ============================================================================

/**
 * @route GET /api/commerce/products/:productId
 * @desc Get single product
 * @access Public
 */
router.get(
  '/products/:productId',
  validateParams(productIdParamSchema),
  commerceController.getProduct
);

/**
 * @route GET /api/commerce/c/:slug/products
 * @desc Get products by canvas slug
 * @access Public
 */
router.get(
  '/c/:slug/products',
  commerceController.getProductsBySlug
);

/**
 * @route PUT /api/commerce/products/:productId
 * @desc Update a product
 * @access Private (owner only)
 */
router.put(
  '/products/:productId',
  authenticate,
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  commerceController.updateProduct
);

/**
 * @route DELETE /api/commerce/products/:productId
 * @desc Delete a product
 * @access Private (owner only)
 */
router.delete(
  '/products/:productId',
  authenticate,
  validateParams(productIdParamSchema),
  commerceController.deleteProduct
);

// ============================================================================
// Checkout
// ============================================================================

/**
 * @route POST /api/commerce/products/:productId/checkout
 * @desc Create checkout session for a product
 * @access Public
 */
router.post(
  '/products/:productId/checkout',
  validateParams(productIdParamSchema),
  validateBody(createCheckoutSchema),
  commerceController.createCheckout
);

/**
 * @route GET /api/commerce/checkout/success
 * @desc Handle checkout success callback
 * @access Public
 */
router.get(
  '/checkout/success',
  commerceController.checkoutSuccess
);

// ============================================================================
// Orders (Creator Dashboard)
// ============================================================================

/**
 * @route GET /api/commerce/creator/orders
 * @desc List orders for creator
 * @access Private
 */
router.get(
  '/creator/orders',
  authenticate,
  validateQuery(listOrdersQuerySchema),
  commerceController.listCreatorOrders
);

/**
 * @route GET /api/commerce/creator/revenue
 * @desc Get revenue summary
 * @access Private
 */
router.get(
  '/creator/revenue',
  authenticate,
  commerceController.getRevenueSummary
);

/**
 * @route GET /api/commerce/orders/:orderId
 * @desc Get order details
 * @access Private (owner only)
 */
router.get(
  '/orders/:orderId',
  authenticate,
  validateParams(orderIdParamSchema),
  commerceController.getOrder
);

/**
 * @route POST /api/commerce/orders/:orderId/refund
 * @desc Refund an order
 * @access Private (owner only)
 */
router.post(
  '/orders/:orderId/refund',
  authenticate,
  validateParams(orderIdParamSchema),
  validateBody(refundOrderSchema),
  commerceController.refundOrder
);

// ============================================================================
// Form Submissions
// ============================================================================

/**
 * @route POST /api/commerce/forms/submit
 * @desc Submit a form (public endpoint)
 * @access Public
 */
router.post(
  '/forms/submit',
  validateBody(submitFormSchema),
  commerceController.submitForm
);

/**
 * @route GET /api/commerce/creator/submissions
 * @desc List form submissions for creator
 * @access Private
 */
router.get(
  '/creator/submissions',
  authenticate,
  validateQuery(listSubmissionsQuerySchema),
  commerceController.listSubmissions
);

/**
 * @route GET /api/commerce/creator/analytics/leads
 * @desc Get leads summary for creator
 * @access Private
 */
router.get(
  '/creator/analytics/leads',
  authenticate,
  commerceController.getLeadsSummary
);

/**
 * @route GET /api/commerce/submissions/:submissionId
 * @desc Get single submission
 * @access Private (owner only)
 */
router.get(
  '/submissions/:submissionId',
  authenticate,
  validateParams(submissionIdParamSchema),
  commerceController.getSubmission
);

/**
 * @route PUT /api/commerce/submissions/:submissionId
 * @desc Update submission status/notes
 * @access Private (owner only)
 */
router.put(
  '/submissions/:submissionId',
  authenticate,
  validateParams(submissionIdParamSchema),
  validateBody(updateSubmissionSchema),
  commerceController.updateSubmission
);

/**
 * @route DELETE /api/commerce/submissions/:submissionId
 * @desc Delete a submission
 * @access Private (owner only)
 */
router.delete(
  '/submissions/:submissionId',
  authenticate,
  validateParams(submissionIdParamSchema),
  commerceController.deleteSubmission
);

// ============================================================================
// Customer Authentication
// ============================================================================

/**
 * @route POST /api/commerce/customer/magic-link
 * @desc Send magic link to customer email
 * @access Public
 */
router.post(
  '/customer/magic-link',
  validateBody(sendMagicLinkSchema),
  commerceController.sendMagicLink
);

/**
 * @route POST /api/commerce/customer/verify-magic-link
 * @desc Verify magic link token and create session
 * @access Public
 */
router.post(
  '/customer/verify-magic-link',
  validateBody(verifyMagicLinkSchema),
  commerceController.verifyMagicLink
);

/**
 * @route GET /api/commerce/customer/session
 * @desc Get current customer session
 * @access Public (with X-Customer-Token header)
 */
router.get(
  '/customer/session',
  commerceController.getCustomerSession
);

/**
 * @route POST /api/commerce/customer/logout
 * @desc Logout customer (invalidate session)
 * @access Public (with X-Customer-Token header)
 */
router.post(
  '/customer/logout',
  commerceController.logoutCustomer
);

/**
 * @route GET /api/commerce/customer/access
 * @desc Check access to gated content
 * @access Public (with optional X-Customer-Token header)
 */
router.get(
  '/customer/access',
  validateQuery(checkAccessSchema),
  commerceController.checkAccess
);

/**
 * @route GET /api/commerce/customer/orders
 * @desc Get customer's orders
 * @access Private (customer auth via X-Customer-Token)
 */
router.get(
  '/customer/orders',
  commerceController.getCustomerOrders
);

// ============================================================================
// Customer Sign-In Widget Endpoints
// ============================================================================

/**
 * @route POST /api/commerce/customer/login
 * @desc Login with email and password
 * @access Public
 */
router.post(
  '/customer/login',
  commerceController.loginCustomer
);

/**
 * @route POST /api/commerce/customer/register
 * @desc Register new customer
 * @access Public
 */
router.post(
  '/customer/register',
  commerceController.registerCustomer
);

/**
 * @route GET /api/commerce/customer/profile
 * @desc Get customer profile
 * @access Private (customer auth)
 */
router.get(
  '/customer/profile',
  commerceController.getCustomerProfile
);

/**
 * @route PUT /api/commerce/customer/profile
 * @desc Update customer profile
 * @access Private (customer auth)
 */
router.put(
  '/customer/profile',
  commerceController.updateCustomerProfile
);

/**
 * @route POST /api/commerce/customer/avatar
 * @desc Upload customer avatar
 * @access Private (customer auth)
 */
router.post(
  '/customer/avatar',
  commerceController.uploadCustomerAvatar
);

/**
 * @route GET /api/commerce/customer/subscription
 * @desc Get customer subscription info
 * @access Private (customer auth)
 */
router.get(
  '/customer/subscription',
  commerceController.getCustomerSubscription
);

/**
 * @route POST /api/commerce/customer/subscription
 * @desc Create or update subscription
 * @access Private (customer auth)
 */
router.post(
  '/customer/subscription',
  commerceController.createCustomerSubscription
);

/**
 * @route DELETE /api/commerce/customer/subscription
 * @desc Cancel subscription
 * @access Private (customer auth)
 */
router.delete(
  '/customer/subscription',
  commerceController.cancelCustomerSubscription
);

/**
 * @route GET /api/commerce/customer/billing-portal
 * @desc Get Stripe billing portal URL
 * @access Private (customer auth)
 */
router.get(
  '/customer/billing-portal',
  commerceController.getBillingPortal
);

/**
 * @route GET /api/commerce/customer/oauth/:provider
 * @desc Redirect to OAuth provider
 * @access Public
 */
router.get(
  '/customer/oauth/:provider',
  commerceController.oauthRedirect
);

// ============================================================================
// Stripe Webhook (requires raw body)
// ============================================================================

/**
 * @route POST /api/commerce/webhooks/stripe
 * @desc Handle Stripe webhook events
 * @access Public (verified by Stripe signature)
 * @note This route must be registered with raw body parser
 */
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  commerceController.handleStripeWebhook
);

export default router;
