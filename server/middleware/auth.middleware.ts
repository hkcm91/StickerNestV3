import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticationError, AuthorizationError } from '../utils/AppErrors.js';
import { logger } from '../utils/logger.js';

/**
 * JWT payload structure for access tokens
 */
export interface AccessTokenPayload {
  userId: string;
  username: string;
  type: 'access';
  iat: number;
  exp: number;
}

/**
 * JWT payload structure for refresh tokens
 */
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * Authenticated user attached to request
 */
export interface AuthUser {
  userId: string;
  username: string;
}

/**
 * Extend Express Request type with auth user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Middleware to authenticate requests using JWT access token
 * Attaches user info to request if valid
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No access token provided');
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Attach user to request
    req.user = {
      userId: payload.userId,
      username: payload.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Access token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid access token'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for public endpoints that have enhanced features for authenticated users
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type === 'access') {
      req.user = {
        userId: payload.userId,
        username: payload.username,
      };
    }

    next();
  } catch {
    // Token invalid or expired, continue without user
    logger.debug('Optional auth failed, continuing without user');
    next();
  }
}

/**
 * Verify an access token (used by WebSocket server)
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token expired');
    }
    throw new AuthenticationError('Invalid access token');
  }
}

/**
 * Verify a refresh token from HTTP-only cookie
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token expired');
    }
    throw new AuthenticationError('Invalid refresh token');
  }
}

/**
 * Parse duration string to seconds (e.g., "15m" -> 900, "7d" -> 604800)
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Generate access and refresh tokens
 */
export function generateTokens(
  userId: string,
  username: string,
  sessionId: string
): { accessToken: string; refreshToken: string } {
  const accessOptions: SignOptions = {
    expiresIn: parseDuration(env.JWT_ACCESS_EXPIRES_IN),
  };

  const refreshOptions: SignOptions = {
    expiresIn: parseDuration(env.JWT_REFRESH_EXPIRES_IN),
  };

  const accessToken = jwt.sign(
    {
      userId,
      username,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    accessOptions
  );

  const refreshToken = jwt.sign(
    {
      userId,
      sessionId,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    refreshOptions
  );

  return { accessToken, refreshToken };
}

/**
 * Middleware to require ownership of a resource
 * Must be used after authenticate middleware
 */
export function requireOwnership(
  getResourceUserId: (req: Request) => string | Promise<string>
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const resourceUserId = await getResourceUserId(req);

      if (resourceUserId !== req.user.userId) {
        throw new AuthorizationError('You do not have access to this resource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Decode token without verification (useful for debugging)
 */
export function decodeToken(token: string): AccessTokenPayload | RefreshTokenPayload | null {
  const decoded = jwt.decode(token);
  return decoded as AccessTokenPayload | RefreshTokenPayload | null;
}
