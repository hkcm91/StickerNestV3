/**
 * StickerNest v2 - Customer Authentication Controller
 * Handles magic link auth and customer sessions for canvas pages
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/error-types.js';
import type { SendMagicLinkInput } from '../../schemas/commerce.schema.js';

const MAGIC_LINK_EXPIRY_HOURS = 24;
const SESSION_EXPIRY_DAYS = 30;

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'stickernest_salt').digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Send magic link to customer email
 */
export async function sendMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const input: SendMagicLinkInput = req.body;

    const creator = await db.user.findUnique({
      where: { id: input.creatorId },
      select: { id: true, displayName: true },
    });

    if (!creator) {
      throw new AppError('Creator not found', 404);
    }

    let customer = await db.canvasCustomer.findFirst({
      where: {
        email: input.email.toLowerCase(),
        creatorId: input.creatorId,
      },
    });

    if (!customer) {
      customer = await db.canvasCustomer.create({
        data: {
          email: input.email.toLowerCase(),
          creatorId: input.creatorId,
          authProvider: 'magic_link',
        },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + MAGIC_LINK_EXPIRY_HOURS);

    await db.magicLinkToken.create({
      data: {
        token,
        customerId: customer.id,
        expiresAt,
        redirectUrl: input.redirectUrl,
      },
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const magicLinkUrl = `${baseUrl}/auth/customer/verify?token=${token}`;

    logger.info({ email: input.email, magicLinkUrl }, 'Magic link generated (email not sent in dev)');

    res.json({
      success: true,
      message: 'Magic link sent to your email',
      ...(process.env.NODE_ENV !== 'production' && { magicLinkUrl }),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify magic link token and create session
 */
export async function verifyMagicLink(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.body;

    const magicLink = await db.magicLinkToken.findUnique({
      where: { token },
      include: {
        customer: {
          select: { id: true, email: true, name: true, avatarUrl: true, creatorId: true },
        },
      },
    });

    if (!magicLink) {
      throw new AppError('Invalid or expired link', 400);
    }

    if (magicLink.usedAt) {
      throw new AppError('Link already used', 400);
    }

    if (magicLink.expiresAt < new Date()) {
      throw new AppError('Link has expired', 400);
    }

    await db.magicLinkToken.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    await db.canvasCustomer.update({
      where: { id: magicLink.customerId },
      data: {
        emailVerified: true,
        lastSeenAt: new Date(),
      },
    });

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db.customerSession.create({
      data: {
        token: sessionToken,
        customerId: magicLink.customerId,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    logger.info({ customerId: magicLink.customerId }, 'Customer logged in via magic link');

    res.json({
      success: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: magicLink.customer.id,
        email: magicLink.customer.email,
        name: magicLink.customer.name,
        avatarUrl: magicLink.customer.avatarUrl,
      },
      redirectUrl: magicLink.redirectUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current customer session
 */
export async function getCustomerSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      return res.json({ success: true, session: null });
    }

    const session = await db.customerSession.findUnique({
      where: { token },
      include: {
        customer: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.json({ success: true, session: null });
    }

    await db.canvasCustomer.update({
      where: { id: session.customerId },
      data: { lastSeenAt: new Date() },
    });

    res.json({
      success: true,
      session: {
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        customer: session.customer,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout customer (invalidate session)
 */
export async function logoutCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (token) {
      await db.customerSession.deleteMany({
        where: { token },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Check access to gated content
 */
export async function checkAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { canvasId, widgetId } = req.query as { canvasId: string; widgetId?: string };
    const token = req.headers['x-customer-token'] as string;

    const gates = await db.contentGate.findMany({
      where: {
        canvasId,
        ...(widgetId ? { OR: [{ targetId: null }, { targetId: widgetId }] } : { targetId: null }),
      },
    });

    if (gates.length === 0) {
      return res.json({ allowed: true });
    }

    let customer = null;
    if (token) {
      const session = await db.customerSession.findUnique({
        where: { token },
        include: { customer: true },
      });

      if (session && session.expiresAt > new Date()) {
        customer = session.customer;
      }
    }

    for (const gate of gates) {
      if (gate.requiresAuth && !customer) {
        return res.json({ allowed: false, reason: 'auth_required', gateId: gate.id });
      }

      if (gate.requiresSubscription && gate.subscriptionProductId) {
        if (!customer) {
          return res.json({ allowed: false, reason: 'subscription_required', gateId: gate.id });
        }

        const subscription = await db.canvasOrder.findFirst({
          where: {
            customerId: customer.id,
            productId: gate.subscriptionProductId,
            status: 'paid',
            product: { productType: 'subscription' },
          },
        });

        if (!subscription) {
          return res.json({ allowed: false, reason: 'subscription_required', gateId: gate.id });
        }
      }

      if (gate.requiresPurchase && gate.purchaseProductId) {
        if (!customer) {
          return res.json({ allowed: false, reason: 'purchase_required', gateId: gate.id });
        }

        const purchase = await db.canvasOrder.findFirst({
          where: {
            customerId: customer.id,
            productId: gate.purchaseProductId,
            status: 'paid',
          },
        });

        if (!purchase) {
          return res.json({ allowed: false, reason: 'purchase_required', gateId: gate.id });
        }
      }
    }

    res.json({ allowed: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer's orders (for customer portal)
 */
export async function getCustomerOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    const orders = await db.canvasOrder.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, imageUrl: true, downloadUrl: true },
        },
      },
    });

    res.json({
      orders: orders.map((order: {
        id: string;
        orderNumber: string;
        product: { name: string; imageUrl: string | null; downloadUrl: string | null };
        amountCents: number;
        currency: string;
        status: string;
        createdAt: Date;
      }) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        productName: order.product.name,
        productImage: order.product.imageUrl,
        amountCents: order.amountCents,
        currency: order.currency,
        status: order.status,
        downloadUrl: order.status === 'paid' ? order.product.downloadUrl : null,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login with email and password
 */
export async function loginCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, creatorId } = req.body;

    if (!email || !password || !creatorId) {
      throw new AppError('Email, password, and creatorId are required', 400);
    }

    const customer = await db.canvasCustomer.findFirst({
      where: {
        email: email.toLowerCase(),
        creatorId,
      },
    });

    if (!customer || !customer.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!verifyPassword(password, customer.passwordHash)) {
      throw new AppError('Invalid email or password', 401);
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db.customerSession.create({
      data: {
        token: sessionToken,
        customerId: customer.id,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    await db.canvasCustomer.update({
      where: { id: customer.id },
      data: { lastSeenAt: new Date() },
    });

    logger.info({ customerId: customer.id }, 'Customer logged in with password');

    res.json({
      success: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register new customer with email and password
 */
export async function registerCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, creatorId } = req.body;

    if (!email || !creatorId) {
      throw new AppError('Email and creatorId are required', 400);
    }

    const creator = await db.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new AppError('Creator not found', 404);
    }

    // Check if customer already exists
    const existing = await db.canvasCustomer.findFirst({
      where: {
        email: email.toLowerCase(),
        creatorId,
      },
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 400);
    }

    // Create customer
    const customer = await db.canvasCustomer.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        creatorId,
        authProvider: password ? 'password' : 'magic_link',
        passwordHash: password ? hashPassword(password) : null,
        emailVerified: false,
      },
    });

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await db.customerSession.create({
      data: {
        token: sessionToken,
        customerId: customer.id,
        expiresAt,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    logger.info({ customerId: customer.id }, 'Customer registered');

    res.json({
      success: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer profile
 */
export async function getCustomerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
      include: {
        customer: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    const customer = session.customer;

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        avatarUrl: customer.avatarUrl,
        emailVerified: customer.emailVerified,
        preferences: customer.preferences || {
          productUpdates: true,
          orderNotifications: true,
          marketing: false,
        },
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    const { name, preferences, currentPassword, newPassword } = req.body;

    // Handle password change
    if (newPassword) {
      const customer = await db.canvasCustomer.findUnique({
        where: { id: session.customerId },
      });

      if (customer?.passwordHash && !verifyPassword(currentPassword, customer.passwordHash)) {
        throw new AppError('Current password is incorrect', 400);
      }
    }

    const updated = await db.canvasCustomer.update({
      where: { id: session.customerId },
      data: {
        ...(name !== undefined && { name }),
        ...(preferences && { preferences }),
        ...(newPassword && { passwordHash: hashPassword(newPassword) }),
      },
    });

    logger.info({ customerId: session.customerId }, 'Customer profile updated');

    res.json({
      success: true,
      customer: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarUrl: updated.avatarUrl,
        preferences: updated.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload customer avatar
 */
export async function uploadCustomerAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    // In production, handle file upload to storage (S3, etc.)
    // For now, return a placeholder
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.customerId}`;

    await db.canvasCustomer.update({
      where: { id: session.customerId },
      data: { avatarUrl },
    });

    res.json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer subscription info
 */
export async function getCustomerSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
      include: { customer: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    // Find active subscription
    const subscription = await db.canvasOrder.findFirst({
      where: {
        customerId: session.customerId,
        status: 'paid',
        product: { productType: 'subscription' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });

    // Get billing history
    const billingHistory = await db.canvasOrder.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { product: { select: { name: true } } },
    });

    // Get available plans (from creator's products)
    const plans = await db.canvasProduct.findMany({
      where: {
        creatorId: session.customer.creatorId,
        productType: 'subscription',
        status: 'active',
      },
      orderBy: { priceCents: 'asc' },
    });

    res.json({
      success: true,
      subscription: subscription ? {
        id: subscription.id,
        planId: subscription.productId,
        planName: subscription.product.name,
        amountCents: subscription.amountCents,
        interval: 'month',
        status: 'active',
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        features: subscription.product.description?.split(',') || [],
        paymentMethod: null, // Would come from Stripe
      } : null,
      plans: plans.map((p: { id: string; name: string; priceCents: number; description: string | null }) => ({
        id: p.id,
        name: p.name,
        price: p.priceCents,
        interval: 'month',
        features: p.description?.split(',') || [],
        popular: p.name.toLowerCase().includes('pro'),
      })),
      billingHistory: billingHistory.map((b: { id: string; createdAt: Date; product: { name: string }; amountCents: number; status: string }) => ({
        id: b.id,
        date: b.createdAt.toISOString(),
        description: b.product.name,
        amountCents: b.amountCents,
        status: b.status,
      })),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create/update subscription (redirect to Stripe checkout)
 */
export async function createCustomerSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;
    const { planId } = req.body;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    const plan = await db.canvasProduct.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new AppError('Plan not found', 404);
    }

    // In production, create Stripe checkout session
    // For now, return success
    res.json({
      success: true,
      message: 'Subscription created (mock)',
      subscription: {
        planId,
        planName: plan.name,
        status: 'active',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel subscription
 */
export async function cancelCustomerSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    // In production, cancel via Stripe
    logger.info({ customerId: session.customerId }, 'Customer cancelled subscription');

    res.json({
      success: true,
      message: 'Subscription cancelled',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Stripe billing portal URL
 */
export async function getBillingPortal(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-customer-token'] as string;

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = await db.customerSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired', 401);
    }

    // In production, create Stripe billing portal session
    // For now, return placeholder
    res.json({
      success: true,
      url: null,
      message: 'Billing portal not configured',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * OAuth redirect handler (placeholder)
 */
export async function oauthRedirect(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider } = req.params;
    const { creator, redirect } = req.query;

    // In production, redirect to OAuth provider
    logger.info({ provider, creator, redirect }, 'OAuth redirect requested');

    res.json({
      success: false,
      message: `OAuth with ${provider} is not configured`,
    });
  } catch (error) {
    next(error);
  }
}
