/**
 * StickerNest v2 - API Client (Backward Compatibility Layer)
 *
 * REFACTORING NOTE (Dec 2024):
 * This file has been refactored into modular files under ./api/:
 * - ./api/types.ts    - All shared type definitions
 * - ./api/client.ts   - HTTP client and token management
 * - ./api/auth.ts     - Authentication API
 * - ./api/canvas.ts   - Canvas CRUD API
 * - ./api/marketplace.ts - Marketplace APIs
 * - ./api/user.ts     - User profile API
 * - ./api/social.ts   - Follow system API
 * - ./api/favorites.ts - Favorites API
 * - ./api/notifications.ts - Notifications API
 * - ./api/search.ts   - Search API
 * - ./api/comments.ts - Comments API
 * - ./api/collections.ts - Collections API
 * - ./api/templates.ts - Templates API
 * - ./api/reviews.ts  - Reviews API
 * - ./api/verification.ts - Verification API
 * - ./api/oauth.ts    - OAuth API
 * - ./api/index.ts    - Combined exports
 *
 * This file maintains backward compatibility by re-exporting everything.
 * New code should import directly from '@/services/api' for cleaner imports.
 */

// Re-export everything from the api module for backward compatibility
export * from './api';
export { default } from './api';
