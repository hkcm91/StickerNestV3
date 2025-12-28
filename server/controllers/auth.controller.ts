import { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

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
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input: RegisterInput = req.body;

  const result = await authService.register(input);

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
  });
});

/**
 * Login a user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const input: LoginInput = req.body;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress;

  const result = await authService.login(input, userAgent, ipAddress);

  // Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.json({
    success: true,
    user: result.user,
    accessToken: result.accessToken,
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // Get refresh token from cookie or body
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'No refresh token provided',
      },
    });
    return;
  }

  const tokens = await authService.refresh(refreshToken);

  // Set new refresh token in cookie
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

  res.json({
    success: true,
    accessToken: tokens.accessToken,
  });
});

/**
 * Logout current session
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  // Clear the refresh token cookie
  res.clearCookie('refreshToken', { path: '/api/auth' });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Logout all sessions
 * POST /api/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
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

  await authService.logoutAll(req.user.userId);

  // Clear the refresh token cookie
  res.clearCookie('refreshToken', { path: '/api/auth' });

  res.json({
    success: true,
    message: 'All sessions logged out',
  });
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
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

  const user = await authService.getUser(req.user.userId);

  res.json({
    success: true,
    user,
  });
});

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
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

  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.userId, currentPassword, newPassword);

  // Clear the refresh token cookie since all sessions are invalidated
  res.clearCookie('refreshToken', { path: '/api/auth' });

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});
