/**
 * StickerNest v2 - Commerce Orders Controller
 * Handles order management for creators
 */

import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/error-types.js';
import { requireStripe } from './stripe.config.js';

/**
 * List orders for creator
 */
export async function listCreatorOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { canvasId, status, limit = 50, offset = 0 } = req.query;

    const where: any = { creatorId: userId };
    if (canvasId) where.canvasId = canvasId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      db.canvasOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
        include: {
          product: { select: { name: true, imageUrl: true } },
        },
      }),
      db.canvasOrder.count({ where }),
    ]);

    res.json({ orders, total });
  } catch (error) {
    next(error);
  }
}

/**
 * Get order details
 */
export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;

    const order = await db.canvasOrder.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order || order.creatorId !== userId) {
      throw new AppError('Order not found', 404);
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
}

/**
 * Refund an order
 */
export async function refundOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const { amountCents } = req.body;

    const stripeClient = requireStripe();

    const order = await db.canvasOrder.findUnique({
      where: { id: orderId },
      include: {
        product: {
          include: {
            creator: {
              include: {
                creatorAccount: { select: { stripeAccountId: true } },
              },
            },
          },
        },
      },
    });

    if (!order || order.creatorId !== userId) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'paid') {
      throw new AppError('Order cannot be refunded', 400);
    }

    if (!order.stripePaymentIntentId) {
      throw new AppError('No payment to refund', 400);
    }

    const stripeAccountId = order.product.creator.creatorAccount?.stripeAccountId;
    if (!stripeAccountId) {
      throw new AppError('Seller account not found', 400);
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripePaymentIntentId,
      ...(amountCents && { amount: amountCents }),
    };

    await stripeClient.refunds.create(refundParams, {
      stripeAccount: stripeAccountId,
    });

    const isFullRefund = !amountCents || amountCents >= order.amountCents;
    await db.canvasOrder.update({
      where: { id: orderId },
      data: { status: isFullRefund ? 'refunded' : 'partial_refund' },
    });

    logger.info({ orderId, amountCents, isFullRefund }, 'Order refunded');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
