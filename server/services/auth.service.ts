import { db } from '../db/client.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { idGenerators } from '../utils/id.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.middleware.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../utils/AppErrors.js';
import { logger } from '../utils/logger.js';
import type { RegisterInput, LoginInput, UserResponse } from '../schemas/auth.schema.js';

// Account lockout configuration
const LOCKOUT_THRESHOLD = 5; // Number of failed attempts before lockout
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const FAILED_ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for tracking attempts

// In-memory store for failed login attempts
// In production, consider using Redis for distributed setups
interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}
const failedAttempts = new Map<string, FailedAttempt>();

/**
 * Auth service - handles user authentication
 */
export class AuthService {
  /**
   * Check if an email is currently locked out
   */
  private isLockedOut(email: string): { locked: boolean; remainingMs?: number } {
    const attempts = failedAttempts.get(email);
    if (!attempts?.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();
    if (now < attempts.lockedUntil) {
      return {
        locked: true,
        remainingMs: attempts.lockedUntil - now,
      };
    }

    // Lockout expired, reset
    failedAttempts.delete(email);
    return { locked: false };
  }

  /**
   * Record a failed login attempt
   */
  private recordFailedAttempt(email: string): { locked: boolean; attemptsRemaining: number } {
    const now = Date.now();
    let attempts = failedAttempts.get(email);

    if (!attempts || now - attempts.firstAttempt > FAILED_ATTEMPT_WINDOW_MS) {
      // First attempt or window expired
      attempts = {
        count: 1,
        firstAttempt: now,
        lockedUntil: null,
      };
    } else {
      attempts.count++;
    }

    // Check if we've hit the threshold
    if (attempts.count >= LOCKOUT_THRESHOLD) {
      attempts.lockedUntil = now + LOCKOUT_DURATION_MS;
      failedAttempts.set(email, attempts);
      logger.warn({ email, lockoutDurationMs: LOCKOUT_DURATION_MS }, 'Account locked due to too many failed login attempts');
      return { locked: true, attemptsRemaining: 0 };
    }

    failedAttempts.set(email, attempts);
    return {
      locked: false,
      attemptsRemaining: LOCKOUT_THRESHOLD - attempts.count,
    };
  }

  /**
   * Clear failed attempts after successful login
   */
  private clearFailedAttempts(email: string): void {
    failedAttempts.delete(email);
  }
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<{
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if username or email already exists
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.email },
        ],
      },
    });

    if (existing) {
      if (existing.username === input.username) {
        throw new ConflictError('Username already taken');
      }
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await db.user.create({
      data: {
        id: idGenerators.user(),
        username: input.username,
        email: input.email,
        password: hashedPassword,
      },
    });

    // Create session
    const sessionId = idGenerators.session();
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.username,
      sessionId
    );

    // Store session in database
    await db.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login a user
   */
  async login(input: LoginInput, userAgent?: string, ipAddress?: string): Promise<{
    user: UserResponse;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check if account is locked out
    const lockoutStatus = this.isLockedOut(input.email);
    if (lockoutStatus.locked) {
      const remainingMinutes = Math.ceil((lockoutStatus.remainingMs || 0) / 60000);
      throw new AuthenticationError(
        `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.`
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      // Record failed attempt even for non-existent users (prevent enumeration)
      this.recordFailedAttempt(input.email);
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user has a password (OAuth-only users don't)
    if (!user.password) {
      throw new AuthenticationError('This account uses social login. Please sign in with your connected provider.');
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.password);
    if (!isValid) {
      const failedResult = this.recordFailedAttempt(input.email);
      if (failedResult.locked) {
        throw new AuthenticationError(
          `Account temporarily locked due to too many failed attempts. Try again in 15 minutes.`
        );
      }
      // Don't reveal how many attempts remain to prevent enumeration
      throw new AuthenticationError('Invalid email or password');
    }

    // Clear failed attempts on successful login
    this.clearFailedAttempts(input.email);

    // Create session
    const sessionId = idGenerators.session();
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.username,
      sessionId
    );

    // Store session in database
    await db.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: this.formatUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token (throws if invalid)
    verifyRefreshToken(refreshToken);

    // Find session in database
    const session = await db.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } });
      throw new AuthenticationError('Refresh token expired');
    }

    // Generate new tokens
    const newSessionId = idGenerators.session();
    const tokens = generateTokens(
      session.user.id,
      session.user.username,
      newSessionId
    );

    // Rotate refresh token - delete old, create new
    await db.$transaction([
      db.session.delete({ where: { id: session.id } }),
      db.session.create({
        data: {
          id: newSessionId,
          userId: session.userId,
          refreshToken: tokens.refreshToken,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return tokens;
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await db.session.deleteMany({
      where: { refreshToken },
    });
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await db.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get current user
   */
  async getUser(userId: string): Promise<UserResponse> {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return this.formatUser(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // If user has a password, verify current password
    if (user.password) {
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }
    }

    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword);
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions
    await db.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Clean up expired sessions (can be run as a cron job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  /**
   * Format user for response (exclude sensitive fields)
   */
  private formatUser(user: { id: string; username: string; email: string; createdAt: Date }): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
