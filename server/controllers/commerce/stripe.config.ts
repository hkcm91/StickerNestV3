/**
 * StickerNest v2 - Stripe Configuration
 * Shared Stripe client and configuration for commerce controllers
 */

import Stripe from 'stripe';
import { AppError } from '../../utils/error-types.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
export const APP_URL = process.env.APP_URL || 'http://localhost:5173';
export const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

let stripe: Stripe | null = null;

if (STRIPE_SECRET_KEY?.startsWith('sk_')) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Get the Stripe client (may be null if not configured)
 */
export function getStripe(): Stripe | null {
  return stripe;
}

/**
 * Get the Stripe client or throw if not configured
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new AppError('Stripe is not configured', 503);
  }
  return stripe;
}
