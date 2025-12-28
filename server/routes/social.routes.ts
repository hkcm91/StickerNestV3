/**
 * StickerNest v2 - Social Routes
 *
 * API routes for social features:
 * - User profiles
 * - Follow/unfollow system
 * - Block system
 * - Notifications
 * - Chat messaging
 * - Activity feeds
 */

import { Router } from 'express';
import * as socialController from '../controllers/social.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { createLimiter } from '../middleware/rateLimit.middleware.js';
import {
  updateProfileSchema,
  userIdParamSchema,
  paginationQuerySchema,
  notificationIdParamSchema,
  notificationQuerySchema,
  createChatRoomSchema,
  roomIdParamSchema,
  messageIdParamSchema,
  sendMessageSchema,
  updateMessageSchema,
  addReactionSchema,
  chatMessagesQuerySchema,
  feedQuerySchema,
} from '../schemas/social.schema.js';

const router = Router();

// Rate limiters
const socialLimiter = createLimiter(60 * 1000, 100, 'Too many requests');
const chatLimiter = createLimiter(60 * 1000, 200, 'Too many chat requests');

// ============================================
// User Profile Routes
// ============================================

/**
 * @route GET /api/social/profile/:userId
 * @desc Get user profile
 * @access Public (respects privacy settings)
 */
router.get(
  '/profile/:userId',
  optionalAuth,
  validateParams(userIdParamSchema),
  socialController.getProfile
);

/**
 * @route PUT /api/social/profile
 * @desc Update own profile
 * @access Private
 */
router.put(
  '/profile',
  authenticate,
  validateBody(updateProfileSchema),
  socialController.updateProfile
);

// ============================================
// Follow System Routes
// ============================================

/**
 * @route POST /api/social/follow/:userId
 * @desc Follow a user
 * @access Private
 */
router.post(
  '/follow/:userId',
  authenticate,
  socialLimiter,
  validateParams(userIdParamSchema),
  socialController.followUser
);

/**
 * @route DELETE /api/social/follow/:userId
 * @desc Unfollow a user
 * @access Private
 */
router.delete(
  '/follow/:userId',
  authenticate,
  socialLimiter,
  validateParams(userIdParamSchema),
  socialController.unfollowUser
);

/**
 * @route GET /api/social/follow/:userId/check
 * @desc Check if following a user
 * @access Private
 */
router.get(
  '/follow/:userId/check',
  authenticate,
  validateParams(userIdParamSchema),
  socialController.checkFollowing
);

/**
 * @route GET /api/social/followers/:userId
 * @desc Get user's followers
 * @access Public
 */
router.get(
  '/followers/:userId',
  optionalAuth,
  validateParams(userIdParamSchema),
  validateQuery(paginationQuerySchema),
  socialController.getFollowers
);

/**
 * @route GET /api/social/following/:userId
 * @desc Get users that a user is following
 * @access Public
 */
router.get(
  '/following/:userId',
  optionalAuth,
  validateParams(userIdParamSchema),
  validateQuery(paginationQuerySchema),
  socialController.getFollowing
);

// ============================================
// Block System Routes
// ============================================

/**
 * @route POST /api/social/block/:userId
 * @desc Block a user
 * @access Private
 */
router.post(
  '/block/:userId',
  authenticate,
  socialLimiter,
  validateParams(userIdParamSchema),
  socialController.blockUser
);

/**
 * @route DELETE /api/social/block/:userId
 * @desc Unblock a user
 * @access Private
 */
router.delete(
  '/block/:userId',
  authenticate,
  socialLimiter,
  validateParams(userIdParamSchema),
  socialController.unblockUser
);

/**
 * @route GET /api/social/blocked
 * @desc Get blocked users
 * @access Private
 */
router.get(
  '/blocked',
  authenticate,
  socialController.getBlockedUsers
);

// ============================================
// Notification Routes
// ============================================

/**
 * @route GET /api/social/notifications
 * @desc Get notifications
 * @access Private
 */
router.get(
  '/notifications',
  authenticate,
  validateQuery(notificationQuerySchema),
  socialController.getNotifications
);

/**
 * @route GET /api/social/notifications/unread/count
 * @desc Get unread notification count
 * @access Private
 */
router.get(
  '/notifications/unread/count',
  authenticate,
  socialController.getUnreadCount
);

/**
 * @route POST /api/social/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.post(
  '/notifications/:id/read',
  authenticate,
  validateParams(notificationIdParamSchema),
  socialController.markAsRead
);

/**
 * @route POST /api/social/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.post(
  '/notifications/read-all',
  authenticate,
  socialController.markAllAsRead
);

/**
 * @route DELETE /api/social/notifications/:id
 * @desc Delete notification
 * @access Private
 */
router.delete(
  '/notifications/:id',
  authenticate,
  validateParams(notificationIdParamSchema),
  socialController.deleteNotification
);

// ============================================
// Chat Routes
// ============================================

/**
 * @route GET /api/social/chat/rooms
 * @desc Get chat rooms
 * @access Private
 */
router.get(
  '/chat/rooms',
  authenticate,
  socialController.getChatRooms
);

/**
 * @route POST /api/social/chat/rooms
 * @desc Create chat room
 * @access Private
 */
router.post(
  '/chat/rooms',
  authenticate,
  chatLimiter,
  validateBody(createChatRoomSchema),
  socialController.createChatRoom
);

/**
 * @route GET /api/social/chat/rooms/:roomId/messages
 * @desc Get chat messages
 * @access Private
 */
router.get(
  '/chat/rooms/:roomId/messages',
  authenticate,
  validateParams(roomIdParamSchema),
  validateQuery(chatMessagesQuerySchema),
  socialController.getChatMessages
);

/**
 * @route POST /api/social/chat/rooms/:roomId/messages
 * @desc Send message
 * @access Private
 */
router.post(
  '/chat/rooms/:roomId/messages',
  authenticate,
  chatLimiter,
  validateParams(roomIdParamSchema),
  validateBody(sendMessageSchema),
  socialController.sendMessage
);

/**
 * @route PATCH /api/social/chat/rooms/:roomId/messages/:messageId
 * @desc Update message
 * @access Private
 */
router.patch(
  '/chat/rooms/:roomId/messages/:messageId',
  authenticate,
  chatLimiter,
  validateParams(messageIdParamSchema),
  validateBody(updateMessageSchema),
  socialController.updateMessage
);

/**
 * @route DELETE /api/social/chat/rooms/:roomId/messages/:messageId
 * @desc Delete message
 * @access Private
 */
router.delete(
  '/chat/rooms/:roomId/messages/:messageId',
  authenticate,
  validateParams(messageIdParamSchema),
  socialController.deleteMessage
);

/**
 * @route POST /api/social/chat/rooms/:roomId/messages/:messageId/reactions
 * @desc Add reaction to message
 * @access Private
 */
router.post(
  '/chat/rooms/:roomId/messages/:messageId/reactions',
  authenticate,
  chatLimiter,
  validateParams(messageIdParamSchema),
  validateBody(addReactionSchema),
  socialController.addReaction
);

/**
 * @route DELETE /api/social/chat/rooms/:roomId/messages/:messageId/reactions
 * @desc Remove reaction from message
 * @access Private
 */
router.delete(
  '/chat/rooms/:roomId/messages/:messageId/reactions',
  authenticate,
  validateParams(messageIdParamSchema),
  validateBody(addReactionSchema),
  socialController.removeReaction
);

// ============================================
// Activity Feed Routes
// ============================================

/**
 * @route GET /api/social/feed/global
 * @desc Get global activity feed
 * @access Public
 */
router.get(
  '/feed/global',
  optionalAuth,
  validateQuery(feedQuerySchema),
  socialController.getGlobalFeed
);

/**
 * @route GET /api/social/feed/following
 * @desc Get following feed
 * @access Private
 */
router.get(
  '/feed/following',
  authenticate,
  validateQuery(feedQuerySchema),
  socialController.getFollowingFeed
);

/**
 * @route GET /api/social/feed/user/:userId
 * @desc Get user's activity
 * @access Public (respects privacy settings)
 */
router.get(
  '/feed/user/:userId',
  optionalAuth,
  validateParams(userIdParamSchema),
  validateQuery(feedQuerySchema),
  socialController.getUserActivity
);

export default router;
