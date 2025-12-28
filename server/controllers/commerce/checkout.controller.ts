/**
 * StickerNest v2 - Commerce Checkout Controller
 * Handles checkout sessions and Stripe webhooks
 */

import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/error-types.js';
import { requireStripe, APP_URL, PLATFORM_FEE_PERCENT } from './stripe.config.js';
import type { CreateCheckoutInput } from '../../schemas/commerce.schema.js';

/**
 * Create checkout session for a product
 */
export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const input: CreateCheckoutInput = req.body;

    const stripeClient = requireStripe();

    const product = await db.canvasProduct.findUnique({
      where: { id: productId },
      include: {
        canvas: { select: { slug: true, name: true } },
        creator: {
          include: {
            creatorAccount: { select: { stripeAccountId: true, onboardingComplete: true } },
          },
        },
      },
    });

    if (!product || !product.active) {
      throw new AppError('Product not found', 404);
    }

    if (product.trackInventory && product.inventoryCount <= 0) {
      throw new AppError('Product is out of stock', 400);
    }

    const stripeAccountId = product.creator.creatorAccount?.stripeAccountId;
    if (!stripeAccountId || !product.stripePriceId) {
      throw new AppError('Seller not configured for payments', 400);
    }

    const platformFee = Math.round(product.priceCents * (PLATFORM_FEE_PERCENT / 100));
    const canvasUrl = `${APP_URL}/c/${product.canvas?.slug || product.canvasId}`;
    const successUrl = input.returnUrl || `${canvasUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = input.returnUrl || `${canvasUrl}?checkout=cancelled`;
    const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: product.productType === 'subscription' ? 'subscription' : 'payment',
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.customerEmail,
      metadata: {
        productId: product.id,
        canvasId: product.canvasId,
        creatorId: product.creatorId,
        customerName: input.customerName || '',
        orderNumber,
      },
      ...(product.productType !== 'subscription' && {
        payment_intent_data: {
          application_fee_amount: platformFee,
          metadata: { productId: product.id, canvasId: product.canvasId, orderNumber },
        },
      }),
      ...(product.productType === 'subscription' && {
        subscription_data: {
          application_fee_percent: PLATFORM_FEE_PERCENT,
          metadata: { productId: product.id, canvasId: product.canvasId, orderNumber },
        },
      }),
    };

    const session = await stripeClient.checkout.sessions.create(sessionParams, {
      stripeAccount: stripeAccountId,
    });

    await db.canvasOrder.create({
      data: {
        orderNumber,
        canvasId: product.canvasId,
        productId: product.id,
        creatorId: product.creatorId,
        customerEmail: input.customerEmail || 'guest@checkout.pending',
        customerName: input.customerName,
        amountCents: product.priceCents,
        stripeCheckoutSessionId: session.id,
        status: 'pending',
        metadata: {
          userAgent: req.headers['user-agent'],
          referrer: req.headers.referer,
        },
      },
    });

    logger.info({ orderNumber, productId, sessionId: session.id }, 'Checkout session created');

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle checkout success callback
 */
export async function checkoutSuccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      throw new AppError('Missing session ID', 400);
    }

    const order = await db.canvasOrder.findFirst({
      where: { stripeCheckoutSessionId: session_id },
      include: { product: { select: { name: true, downloadUrl: true } } },
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        productName: order.product.name,
        amountCents: order.amountCents,
        status: order.status,
        downloadUrl: order.status === 'paid' ? order.product.downloadUrl : null,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const stripeClient = requireStripe();
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new AppError('Webhook secret not configured', 500);
    }

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error({ err }, 'Webhook signature verification failed');
      return res.status(400).send('Webhook signature verification failed');
    }

    logger.info({ type: event.type }, 'Processing Stripe webhook');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const result = await db.canvasOrder.updateMany({
          where: { stripeCheckoutSessionId: session.id },
          data: {
            status: 'paid',
            stripePaymentIntentId: session.payment_intent as string,
            customerEmail: session.customer_email || undefined,
          },
        });

        if (result.count > 0) {
          const order = await db.canvasOrder.findFirst({
            where: { stripeCheckoutSessionId: session.id },
            include: { product: true },
          });

          if (order?.product.trackInventory) {
            await db.canvasProduct.update({
              where: { id: order.productId },
              data: { inventoryCount: { decrement: 1 } },
            });
          }

          logger.info({ orderNumber: order?.orderNumber }, 'Order completed');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await db.canvasOrder.updateMany({
          where: { stripePaymentIntentId: paymentIntent.id },
          data: { status: 'failed' },
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const status = charge.refunded ? 'refunded' : 'partial_refund';
        await db.canvasOrder.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { status },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
