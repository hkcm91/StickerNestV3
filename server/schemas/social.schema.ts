/**
 * Social Layer Validation Schemas
 * Zod schemas for social API endpoints
 */

import { z } from 'zod';

// ============================================
// User Profile Schemas
// ============================================

export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  twitterHandle: z.string().max(50).optional(),
  githubHandle: z.string().max(50).optional(),
  discordHandle: z.string().max(50).optional(),
  privacyMode: z.enum(['public', 'friends_only', 'private']).optional(),
  showOnlineStatus: z.boolean().optional(),
  allowDMs: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

// ============================================
// Follow System Schemas
// ============================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================
// Notification Schemas
// ============================================

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

// ============================================
// Chat Schemas
// ============================================

export const createChatRoomSchema = z.object({
  type: z.enum(['direct', 'group']),
  memberIds: z.array(z.string()).min(1).max(50),
  name: z.string().max(100).optional(), // For group chats
});

export const roomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

export const messageIdParamSchema = z.object({
  roomId: z.string().min(1),
  messageId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  contentType: z.enum(['text', 'image', 'file', 'canvas_link', 'widget_link']).default('text'),
  replyToId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file']),
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
  })).max(10).optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

export const chatMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().optional(), // Cursor-based: get messages before this ID
});

// ============================================
// Activity Feed Schemas
// ============================================

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  type: z.enum([
    'canvas_created',
    'canvas_published',
    'canvas_updated',
    'canvas_shared',
    'widget_published',
    'widget_installed',
    'user_followed',
    'user_joined',
    'collab_started',
    'comment_added',
    'item_purchased',
  ]).optional(),
});

// ============================================
// Collaboration Schemas
// ============================================

export const createCollabRoomSchema = z.object({
  canvasId: z.string().min(1),
  allowAnonymous: z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(50).default(10),
});

export const collabRoomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

export const inviteToCollabSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['editor', 'viewer']).default('editor'),
});

// ============================================
// Export Types
// ============================================

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type CreateCollabRoomInput = z.infer<typeof createCollabRoomSchema>;
export type InviteToCollabInput = z.infer<typeof inviteToCollabSchema>;
