/**
 * StickerNest v2 - Commerce Products Controller
 * Handles canvas product CRUD operations
 */

import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/error-types.js';
import { getStripe } from './stripe.config.js';
import type { CreateProductInput, UpdateProductInput } from '../../schemas/commerce.schema.js';

/**
 * List products for a canvas
 */
export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { canvasId } = req.params;
    const userId = req.user?.id;

    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: { userId: true, visibility: true },
    });

    if (!canvas) {
      throw new AppError('Canvas not found', 404);
    }

    const isOwner = userId === canvas.userId;
    const includeInactive = isOwner && req.query.includeInactive === 'true';

    const products = await db.canvasProduct.findMany({
      where: {
        canvasId,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: { sortOrder: 'asc' },
    });

    const productsWithStock = products.map(p => ({
      ...p,
      inStock: !p.trackInventory || p.inventoryCount > 0,
    }));

    res.json({ products: productsWithStock });
  } catch (error) {
    next(error);
  }
}

/**
 * Get products by canvas slug (public)
 */
export async function getProductsBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    const canvas = await db.canvas.findUnique({
      where: { slug },
      select: { id: true, visibility: true },
    });

    if (!canvas) {
      throw new AppError('Canvas not found', 404);
    }

    if (canvas.visibility === 'private') {
      throw new AppError('Canvas is private', 403);
    }

    const products = await db.canvasProduct.findMany({
      where: {
        canvasId: canvas.id,
        active: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    const productsWithStock = products.map(p => ({
      ...p,
      inStock: !p.trackInventory || p.inventoryCount > 0,
    }));

    res.json({ products: productsWithStock });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product
 */
export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;

    const product = await db.canvasProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    res.json({
      product: {
        ...product,
        inStock: !product.trackInventory || product.inventoryCount > 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a product
 */
export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { canvasId } = req.params;
    const userId = req.user!.id;
    const input: CreateProductInput = req.body;

    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: { userId: true },
    });

    if (!canvas || canvas.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;

    const stripe = getStripe();
    if (stripe) {
      const creator = await db.creatorAccount.findUnique({
        where: { userId },
        select: { stripeAccountId: true, onboardingComplete: true },
      });

      if (creator?.onboardingComplete && creator.stripeAccountId) {
        const stripeProduct = await stripe.products.create(
          {
            name: input.name,
            description: input.description || undefined,
            images: input.imageUrl ? [input.imageUrl] : [],
            metadata: { canvasId, creatorId: userId },
          },
          { stripeAccount: creator.stripeAccountId }
        );

        const priceParams: Stripe.PriceCreateParams = {
          product: stripeProduct.id,
          currency: 'usd',
          unit_amount: input.priceCents,
          metadata: { canvasId, creatorId: userId },
        };

        if (input.productType === 'subscription' && input.billingInterval) {
          priceParams.recurring = {
            interval: input.billingInterval === 'monthly' ? 'month' : 'year',
          };
        }

        const stripePrice = await stripe.prices.create(priceParams, {
          stripeAccount: creator.stripeAccountId,
        });

        stripeProductId = stripeProduct.id;
        stripePriceId = stripePrice.id;
      }
    }

    const product = await db.canvasProduct.create({
      data: {
        canvasId,
        creatorId: userId,
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        priceCents: input.priceCents,
        compareAtPriceCents: input.compareAtPriceCents,
        productType: input.productType || 'one_time',
        billingInterval: input.billingInterval,
        downloadUrl: input.downloadUrl,
        trackInventory: input.trackInventory || false,
        inventoryCount: input.inventoryCount || 0,
        stripeProductId,
        stripePriceId,
      },
    });

    logger.info({ productId: product.id, canvasId }, 'Product created');

    res.status(201).json({
      product: {
        ...product,
        inStock: !product.trackInventory || product.inventoryCount > 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a product
 */
export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;
    const input: UpdateProductInput = req.body;

    const product = await db.canvasProduct.findUnique({
      where: { id: productId },
      select: { creatorId: true },
    });

    if (!product || product.creatorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const updated = await db.canvasProduct.update({
      where: { id: productId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.priceCents !== undefined && { priceCents: input.priceCents }),
        ...(input.compareAtPriceCents !== undefined && { compareAtPriceCents: input.compareAtPriceCents }),
        ...(input.productType !== undefined && { productType: input.productType }),
        ...(input.billingInterval !== undefined && { billingInterval: input.billingInterval }),
        ...(input.downloadUrl !== undefined && { downloadUrl: input.downloadUrl }),
        ...(input.trackInventory !== undefined && { trackInventory: input.trackInventory }),
        ...(input.inventoryCount !== undefined && { inventoryCount: input.inventoryCount }),
        ...(input.active !== undefined && { active: input.active }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });

    res.json({
      product: {
        ...updated,
        inStock: !updated.trackInventory || updated.inventoryCount > 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params;
    const userId = req.user!.id;

    const product = await db.canvasProduct.findUnique({
      where: { id: productId },
      select: { creatorId: true },
    });

    if (!product || product.creatorId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await db.canvasProduct.delete({
      where: { id: productId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Reorder products
 */
export async function reorderProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { canvasId } = req.params;
    const userId = req.user!.id;
    const { productIds } = req.body as { productIds: string[] };

    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
      select: { userId: true },
    });

    if (!canvas || canvas.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await Promise.all(
      productIds.map((id, index) =>
        db.canvasProduct.updateMany({
          where: { id, canvasId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
