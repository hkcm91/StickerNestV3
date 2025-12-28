import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as oauthController from '../controllers/oauth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public (requires valid refresh token)
 */
router.post(
  '/refresh',
  authLimiter,
  validateBody(refreshSchema),
  authController.refresh
);

/**
 * @route POST /api/auth/logout
 * @desc Logout current session
 * @access Public
 */
router.post('/logout', authController.logout);

/**
 * @route POST /api/auth/logout-all
 * @desc Logout all sessions for user
 * @access Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

// ============================================
// OAuth Routes
// ============================================

/**
 * @route GET /api/auth/oauth/providers
 * @desc Get list of enabled OAuth providers
 * @access Public
 */
router.get('/oauth/providers', oauthController.getEnabledProviders);

/**
 * @route GET /api/auth/oauth/linked
 * @desc Get linked OAuth providers for current user
 * @access Private
 */
router.get('/oauth/linked', authenticate, oauthController.getLinkedProviders);

/**
 * @route GET /api/auth/oauth/:provider
 * @desc Initiate OAuth flow - redirects to provider
 * @access Public
 */
router.get('/oauth/:provider', authLimiter, oauthController.initiateOAuth);

/**
 * @route GET /api/auth/oauth/:provider/callback
 * @desc Handle OAuth callback from provider (redirect)
 * @access Public
 */
router.get('/oauth/:provider/callback', oauthController.handleOAuthCallbackGet);

/**
 * @route POST /api/auth/oauth/:provider/callback
 * @desc Handle OAuth callback with authorization code
 * @access Public
 */
router.post('/oauth/:provider/callback', authLimiter, oauthController.handleOAuthCallbackPost);

/**
 * @route POST /api/auth/oauth/:provider/link
 * @desc Link OAuth provider to existing account
 * @access Private
 */
router.post('/oauth/:provider/link', authenticate, oauthController.linkProvider);

/**
 * @route DELETE /api/auth/oauth/:provider/unlink
 * @desc Unlink OAuth provider from account
 * @access Private
 */
router.delete('/oauth/:provider/unlink', authenticate, oauthController.unlinkProvider);

export default router;
