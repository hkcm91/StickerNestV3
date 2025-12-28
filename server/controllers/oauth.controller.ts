import { Request, Response } from 'express';
import { oauthService, type OAuthProvider } from '../services/oauth.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { ValidationError } from '../utils/AppErrors.js';
import { validateRedirectUrl } from '../utils/security.js';

/**
 * Cookie options for refresh token
 */
const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

/**
 * Valid OAuth providers
 */
const VALID_PROVIDERS = ['google', 'github', 'discord'] as const;

/**
 * Validate provider parameter
 */
function validateProvider(provider: string): OAuthProvider {
  if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    throw new ValidationError(`Invalid provider: ${provider}`);
  }
  return provider as OAuthProvider;
}

/**
 * Get OAuth redirect URI based on request
 */
function getRedirectUri(req: Request, provider: string): string {
  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL ||
    `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
}

/**
 * Get frontend callback URL
 */
function getFrontendCallbackUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Initiate OAuth flow - redirects to provider
 * GET /api/auth/oauth/:provider
 *
 * SECURITY: Validates redirect URL to prevent open redirect attacks
 */
export const initiateOAuth = asyncHandler(async (req: Request, res: Response) => {
  const provider = validateProvider(req.params.provider);
  const redirectUri = getRedirectUri(req, provider);

  // SECURITY: Validate redirect URL to prevent open redirect attacks
  const defaultCallback = getFrontendCallbackUrl() + '/auth/callback';
  const requestedRedirect = req.query.redirect as string | undefined;
  const frontendRedirect = validateRedirectUrl(requestedRedirect, defaultCallback);

  const state = Buffer.from(JSON.stringify({ redirect: frontendRedirect })).toString('base64url');

  const authUrl = oauthService.getAuthUrl(provider, redirectUri, state);

  res.redirect(authUrl);
});

/**
 * Handle OAuth callback from provider (GET request from redirect)
 * GET /api/auth/oauth/:provider/callback
 *
 * SECURITY: Validates redirect URL and uses URL fragment for token
 * to prevent token leakage via referrer headers and logs
 */
export const handleOAuthCallbackGet = asyncHandler(async (req: Request, res: Response) => {
  const provider = validateProvider(req.params.provider);
  const { code, state, error, error_description } = req.query;

  // Parse and validate redirect URL from state
  const defaultCallback = getFrontendCallbackUrl() + '/auth/callback';
  let frontendRedirect = defaultCallback;

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state as string, 'base64url').toString());
      if (decoded.redirect) {
        // SECURITY: Validate redirect URL to prevent open redirect attacks
        frontendRedirect = validateRedirectUrl(decoded.redirect, defaultCallback);
      }
    } catch {
      // Ignore state parsing errors, use default
    }
  }

  // Handle OAuth errors
  if (error) {
    const errorMessage = error_description || error;
    const errorUrl = new URL(frontendRedirect);
    errorUrl.searchParams.set('error', 'oauth_error');
    errorUrl.searchParams.set('error_description', String(errorMessage));
    res.redirect(errorUrl.toString());
    return;
  }

  if (!code) {
    const errorUrl = new URL(frontendRedirect);
    errorUrl.searchParams.set('error', 'oauth_error');
    errorUrl.searchParams.set('error_description', 'No authorization code received');
    res.redirect(errorUrl.toString());
    return;
  }

  try {
    const redirectUri = getRedirectUri(req, provider);
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await oauthService.handleCallback(
      provider,
      code as string,
      redirectUri,
      userAgent,
      ipAddress
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

    // SECURITY: Use URL fragment (#) instead of query params (?)
    // Fragments are NOT sent to the server in HTTP requests, so:
    // - Not logged in server access logs
    // - Not leaked via Referrer headers
    // - Not visible in proxy logs
    const successUrl = new URL(frontendRedirect);
    const fragmentParams = new URLSearchParams();
    fragmentParams.set('access_token', result.accessToken);
    fragmentParams.set('provider', provider);
    if (result.isNewUser) {
      fragmentParams.set('new_user', 'true');
    }
    successUrl.hash = fragmentParams.toString();

    res.redirect(successUrl.toString());
  } catch (err) {
    const errorUrl = new URL(frontendRedirect);
    errorUrl.searchParams.set('error', 'oauth_error');
    errorUrl.searchParams.set('error_description', err instanceof Error ? err.message : 'Authentication failed');
    res.redirect(errorUrl.toString());
  }
});

/**
 * Handle OAuth callback with authorization code (POST request from frontend)
 * POST /api/auth/oauth/:provider/callback
 */
export const handleOAuthCallbackPost = asyncHandler(async (req: Request, res: Response) => {
  const provider = validateProvider(req.params.provider);
  const { code, redirectUri } = req.body;

  if (!code) {
    throw new ValidationError('Authorization code is required');
  }

  const finalRedirectUri = redirectUri || getRedirectUri(req, provider);
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress;

  const result = await oauthService.handleCallback(
    provider,
    code,
    finalRedirectUri,
    userAgent,
    ipAddress
  );

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
    isNewUser: result.isNewUser,
  });
});

/**
 * Link OAuth provider to existing account
 * POST /api/auth/oauth/:provider/link
 */
export const linkProvider = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const provider = validateProvider(req.params.provider);
  const { code, redirectUri } = req.body;

  if (!code) {
    throw new ValidationError('Authorization code is required');
  }

  const finalRedirectUri = redirectUri || getRedirectUri(req, provider);

  await oauthService.linkProvider(req.user.userId, provider, code, finalRedirectUri);

  res.json({
    success: true,
    message: `${provider} account linked successfully`,
  });
});

/**
 * Unlink OAuth provider from account
 * DELETE /api/auth/oauth/:provider/unlink
 */
export const unlinkProvider = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const provider = validateProvider(req.params.provider);

  await oauthService.unlinkProvider(req.user.userId, provider);

  res.json({
    success: true,
    message: `${provider} account unlinked successfully`,
  });
});

/**
 * Get linked OAuth providers
 * GET /api/auth/oauth/linked
 */
export const getLinkedProviders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Not authenticated',
      },
    });
    return;
  }

  const providers = await oauthService.getLinkedProviders(req.user.userId);

  res.json({
    success: true,
    providers,
  });
});

/**
 * Get list of enabled OAuth providers
 * GET /api/auth/oauth/providers
 */
export const getEnabledProviders = asyncHandler(async (_req: Request, res: Response) => {
  const providers = oauthService.getEnabledProviders();

  res.json({
    success: true,
    providers,
  });
});
