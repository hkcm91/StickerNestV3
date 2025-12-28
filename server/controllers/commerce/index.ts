/**
 * StickerNest v2 - Commerce Controllers Index
 * Re-exports all commerce controller functions
 */

// Products
export {
  listProducts,
  getProductsBySlug,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
} from './products.controller.js';

// Checkout & Stripe
export {
  createCheckout,
  checkoutSuccess,
  handleStripeWebhook,
} from './checkout.controller.js';

// Orders
export {
  listCreatorOrders,
  getOrder,
  refundOrder,
} from './orders.controller.js';

// Forms & Leads
export {
  submitForm,
  listSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
} from './forms.controller.js';

// Customer Auth
export {
  sendMagicLink,
  verifyMagicLink,
  getCustomerSession,
  logoutCustomer,
  checkAccess,
  getCustomerOrders,
  // New signin widget endpoints
  loginCustomer,
  registerCustomer,
  getCustomerProfile,
  updateCustomerProfile,
  uploadCustomerAvatar,
  getCustomerSubscription,
  createCustomerSubscription,
  cancelCustomerSubscription,
  getBillingPortal,
  oauthRedirect,
} from './customer-auth.controller.js';

// Analytics
export {
  getRevenueSummary,
  getLeadsSummary,
} from './analytics.controller.js';

// Stripe Config
export { getStripe, requireStripe, APP_URL, PLATFORM_FEE_PERCENT } from './stripe.config.js';
