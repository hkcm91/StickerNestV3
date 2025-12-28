/**
 * Social Layer Controller
 * Handles follow system, notifications, chat, and activity feeds
 */

import type { Request, Response } from 'express';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';
import type { AuthUser } from '../middleware/auth.middleware.js';
import type {
  UpdateProfileInput,
  CreateChatRoomInput,
  SendMessageInput,
  UpdateMessageInput,
  AddReactionInput,
} from '../schemas/social.schema.js';

// ============================================
// User Profile
// ============================================

/**
 * Get user profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const profile = await db.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ success: false, error: 'Profile not found' });
      return;
    }

    // Check privacy settings
    const currentUser = (req as Request & { user?: AuthUser }).user;
    const isOwner = currentUser?.userId === userId;

    if (profile.privacyMode === 'private' && !isOwner) {
      res.status(403).json({ success: false, error: 'Profile is private' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...profile,
        isOwner,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get profile');
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const data = req.body as UpdateProfileInput;

    const profile = await db.userProfile.upsert({
      where: { userId: user.userId },
      update: data,
      create: {
        userId: user.userId,
        ...data,
      },
    });

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error({ error }, 'Failed to update profile');
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

// ============================================
// Follow System
// ============================================

/**
 * Follow a user
 */
export async function followUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { userId: targetUserId } = req.params;

    if (user.userId === targetUserId) {
      res.status(400).json({ success: false, error: 'Cannot follow yourself' });
      return;
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Check if blocked
    const blocked = await db.block.findFirst({
      where: {
        OR: [
          { blockerId: user.userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: user.userId },
        ],
      },
    });

    if (blocked) {
      res.status(403).json({ success: false, error: 'Cannot follow this user' });
      return;
    }

    // Create follow
    await db.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: user.userId,
          followingId: targetUserId,
        },
      },
      create: {
        followerId: user.userId,
        followingId: targetUserId,
      },
      update: {},
    });

    // Update follower counts
    await Promise.all([
      db.userProfile.upsert({
        where: { userId: user.userId },
        update: { followingCount: { increment: 1 } },
        create: { userId: user.userId, followingCount: 1 },
      }),
      db.userProfile.upsert({
        where: { userId: targetUserId },
        update: { followerCount: { increment: 1 } },
        create: { userId: targetUserId, followerCount: 1 },
      }),
    ]);

    // Create notification
    await db.notification.create({
      data: {
        userId: targetUserId,
        type: 'follow',
        title: 'New follower',
        body: `${user.username} started following you`,
        actorId: user.userId,
        actionUrl: `/profile/${user.username}`,
      },
    });

    // Create activity
    await db.activity.create({
      data: {
        actorId: user.userId,
        type: 'user_followed',
        targetType: 'user',
        targetId: targetUserId,
        targetUserId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to follow user');
    res.status(500).json({ success: false, error: 'Failed to follow user' });
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { userId: targetUserId } = req.params;

    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.userId,
          followingId: targetUserId,
        },
      },
    });

    if (!follow) {
      res.status(404).json({ success: false, error: 'Not following this user' });
      return;
    }

    await db.follow.delete({
      where: { id: follow.id },
    });

    // Update follower counts
    await Promise.all([
      db.userProfile.update({
        where: { userId: user.userId },
        data: { followingCount: { decrement: 1 } },
      }),
      db.userProfile.update({
        where: { userId: targetUserId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to unfollow user');
    res.status(500).json({ success: false, error: 'Failed to unfollow user' });
  }
}

/**
 * Check if following a user
 */
export async function checkFollowing(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { userId: targetUserId } = req.params;

    const follow = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.userId,
          followingId: targetUserId,
        },
      },
    });

    res.json({ success: true, data: { isFollowing: !!follow } });
  } catch (error) {
    logger.error({ error }, 'Failed to check following status');
    res.status(500).json({ success: false, error: 'Failed to check following status' });
  }
}

/**
 * Get followers
 */
export async function getFollowers(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };

    const [followers, total] = await Promise.all([
      db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.follow.count({ where: { followingId: userId } }),
    ]);

    res.json({
      success: true,
      data: followers.map((f) => ({
        id: f.follower.id,
        username: f.follower.username,
        displayName: f.follower.profile?.displayName,
        avatarUrl: f.follower.profile?.avatarUrl,
        bio: f.follower.profile?.bio,
        followedAt: f.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get followers');
    res.status(500).json({ success: false, error: 'Failed to get followers' });
  }
}

/**
 * Get following
 */
export async function getFollowing(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };

    const [following, total] = await Promise.all([
      db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.follow.count({ where: { followerId: userId } }),
    ]);

    res.json({
      success: true,
      data: following.map((f) => ({
        id: f.following.id,
        username: f.following.username,
        displayName: f.following.profile?.displayName,
        avatarUrl: f.following.profile?.avatarUrl,
        bio: f.following.profile?.bio,
        followedAt: f.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get following');
    res.status(500).json({ success: false, error: 'Failed to get following' });
  }
}

// ============================================
// Block System
// ============================================

/**
 * Block a user
 */
export async function blockUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { userId: targetUserId } = req.params;

    if (user.userId === targetUserId) {
      res.status(400).json({ success: false, error: 'Cannot block yourself' });
      return;
    }

    // Remove any existing follow relationships
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: user.userId, followingId: targetUserId },
          { followerId: targetUserId, followingId: user.userId },
        ],
      },
    });

    // Create block
    await db.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: user.userId,
          blockedId: targetUserId,
        },
      },
      create: {
        blockerId: user.userId,
        blockedId: targetUserId,
      },
      update: {},
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to block user');
    res.status(500).json({ success: false, error: 'Failed to block user' });
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { userId: targetUserId } = req.params;

    await db.block.deleteMany({
      where: {
        blockerId: user.userId,
        blockedId: targetUserId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to unblock user');
    res.status(500).json({ success: false, error: 'Failed to unblock user' });
  }
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;

    const blocks = await db.block.findMany({
      where: { blockerId: user.userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: blocks.map((b) => ({
        id: b.blocked.id,
        username: b.blocked.username,
        displayName: b.blocked.profile?.displayName,
        avatarUrl: b.blocked.profile?.avatarUrl,
        blockedAt: b.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get blocked users');
    res.status(500).json({ success: false, error: 'Failed to get blocked users' });
  }
}

// ============================================
// Notifications
// ============================================

/**
 * Get notifications
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { page, pageSize, unreadOnly } = req.query as unknown as {
      page: number;
      pageSize: number;
      unreadOnly: boolean;
    };

    const where = {
      userId: user.userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get notifications');
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;

    const count = await db.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
      },
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    logger.error({ error }, 'Failed to get unread count');
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { id } = req.params;

    await db.notification.updateMany({
      where: {
        id,
        userId: user.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to mark notification as read');
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;

    await db.notification.updateMany({
      where: {
        userId: user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to mark all notifications as read');
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { id } = req.params;

    await db.notification.deleteMany({
      where: {
        id,
        userId: user.userId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete notification');
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
}

// ============================================
// Chat
// ============================================

/**
 * Get chat rooms
 */
export async function getChatRooms(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;

    const rooms = await db.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: user.userId,
            leftAt: null,
          },
        },
        isArchived: false,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    res.json({
      success: true,
      data: rooms.map((room) => {
        const otherMembers = room.members.filter((m) => m.userId !== user.userId);
        const myMembership = room.members.find((m) => m.userId === user.userId);
        const lastMessage = room.messages[0];

        return {
          id: room.id,
          name: room.name || otherMembers.map((m) => m.user.username).join(', '),
          avatarUrl: room.avatarUrl || (otherMembers[0]?.user.profile?.avatarUrl),
          roomType: room.roomType,
          members: otherMembers.map((m) => ({
            id: m.user.userId,
            username: m.user.username,
            displayName: m.user.profile?.displayName,
            avatarUrl: m.user.profile?.avatarUrl,
          })),
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
          } : null,
          unreadCount: myMembership?.lastReadAt && lastMessage
            ? (lastMessage.createdAt > myMembership.lastReadAt ? 1 : 0)
            : 0,
          isMuted: myMembership?.isMuted || false,
        };
      }),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get chat rooms');
    res.status(500).json({ success: false, error: 'Failed to get chat rooms' });
  }
}

/**
 * Create chat room
 */
export async function createChatRoom(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { type, memberIds, name } = req.body as CreateChatRoomInput;

    // For direct messages, check if room already exists
    if (type === 'direct' && memberIds.length === 1) {
      const existingRoom = await db.chatRoom.findFirst({
        where: {
          roomType: 'direct',
          members: {
            every: {
              userId: { in: [user.userId, memberIds[0]] },
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (existingRoom) {
        res.json({ success: true, data: existingRoom });
        return;
      }
    }

    const allMemberIds = [user.userId, ...memberIds.filter((id) => id !== user.userId)];

    const room = await db.chatRoom.create({
      data: {
        name: type === 'group' ? name : null,
        roomType: type,
        members: {
          create: allMemberIds.map((memberId, index) => ({
            userId: memberId,
            role: index === 0 ? 'owner' : 'member',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    logger.error({ error }, 'Failed to create chat room');
    res.status(500).json({ success: false, error: 'Failed to create chat room' });
  }
}

/**
 * Get chat messages
 */
export async function getChatMessages(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { roomId } = req.params;
    const { page, pageSize, before } = req.query as unknown as {
      page: number;
      pageSize: number;
      before?: string;
    };

    // Verify membership
    const membership = await db.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.leftAt) {
      res.status(403).json({ success: false, error: 'Not a member of this room' });
      return;
    }

    const where = {
      roomId,
      isDeleted: false,
      ...(before ? { id: { lt: before } } : {}),
    };

    const [messages, total] = await Promise.all([
      db.chatMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          reactions: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: before ? 0 : (page - 1) * pageSize,
        take: pageSize,
      }),
      db.chatMessage.count({ where: { roomId, isDeleted: false } }),
    ]);

    // Update last read
    await db.chatRoomMember.update({
      where: {
        roomId_userId: {
          roomId,
          userId: user.userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get chat messages');
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
}

/**
 * Send chat message
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { roomId } = req.params;
    const { content, contentType, replyToId, attachments } = req.body as SendMessageInput;

    // Verify membership
    const membership = await db.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.leftAt) {
      res.status(403).json({ success: false, error: 'Not a member of this room' });
      return;
    }

    const message = await db.chatMessage.create({
      data: {
        roomId,
        senderId: user.userId,
        content,
        contentType,
        replyToId,
        attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    // Update room last message time
    await db.chatRoom.update({
      where: { id: roomId },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error({ error }, 'Failed to send message');
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

/**
 * Update chat message
 */
export async function updateMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { roomId, messageId } = req.params;
    const { content } = req.body as UpdateMessageInput;

    const message = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        roomId,
        senderId: user.userId,
        isDeleted: false,
      },
    });

    if (!message) {
      res.status(404).json({ success: false, error: 'Message not found' });
      return;
    }

    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ error }, 'Failed to update message');
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
}

/**
 * Delete chat message
 */
export async function deleteMessage(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { roomId, messageId } = req.params;

    const message = await db.chatMessage.findFirst({
      where: {
        id: messageId,
        roomId,
        senderId: user.userId,
        isDeleted: false,
      },
    });

    if (!message) {
      res.status(404).json({ success: false, error: 'Message not found' });
      return;
    }

    await db.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete message');
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
}

/**
 * Add reaction to message
 */
export async function addReaction(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { roomId, messageId } = req.params;
    const { emoji } = req.body as AddReactionInput;

    // Verify membership
    const membership = await db.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: user.userId,
        },
      },
    });

    if (!membership || membership.leftAt) {
      res.status(403).json({ success: false, error: 'Not a member of this room' });
      return;
    }

    await db.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.userId,
          emoji,
        },
      },
      create: {
        messageId,
        userId: user.userId,
        emoji,
      },
      update: {},
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to add reaction');
    res.status(500).json({ success: false, error: 'Failed to add reaction' });
  }
}

/**
 * Remove reaction from message
 */
export async function removeReaction(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { messageId } = req.params;
    const { emoji } = req.body as AddReactionInput;

    await db.messageReaction.deleteMany({
      where: {
        messageId,
        userId: user.userId,
        emoji,
      },
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to remove reaction');
    res.status(500).json({ success: false, error: 'Failed to remove reaction' });
  }
}

// ============================================
// Activity Feed
// ============================================

/**
 * Get global activity feed
 */
export async function getGlobalFeed(req: Request, res: Response): Promise<void> {
  try {
    const { page, pageSize, type } = req.query as unknown as {
      page: number;
      pageSize: number;
      type?: string;
    };

    const where = {
      visibility: 'public' as const,
      ...(type ? { type: type as never } : {}),
    };

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.activity.count({ where }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get global feed');
    res.status(500).json({ success: false, error: 'Failed to get global feed' });
  }
}

/**
 * Get following feed (activities from users you follow)
 */
export async function getFollowingFeed(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    const { page, pageSize, type } = req.query as unknown as {
      page: number;
      pageSize: number;
      type?: string;
    };

    // Get list of users we follow
    const following = await db.follow.findMany({
      where: { followerId: user.userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    const where = {
      actorId: { in: followingIds },
      visibility: { in: ['public' as const, 'followers_only' as const] },
      ...(type ? { type: type as never } : {}),
    };

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.activity.count({ where }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get following feed');
    res.status(500).json({ success: false, error: 'Failed to get following feed' });
  }
}

/**
 * Get user's activity
 */
export async function getUserActivity(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { page, pageSize, type } = req.query as unknown as {
      page: number;
      pageSize: number;
      type?: string;
    };

    const currentUser = (req as Request & { user?: AuthUser }).user;
    const isOwner = currentUser?.userId === userId;

    // Check if following for visibility
    const isFollowing = currentUser
      ? await db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.userId,
              followingId: userId,
            },
          },
        })
      : null;

    const visibility = isOwner
      ? undefined // Owner sees all
      : isFollowing
        ? { in: ['public' as const, 'followers_only' as const] }
        : 'public' as const;

    const where = {
      actorId: userId,
      ...(visibility ? { visibility } : {}),
      ...(type ? { type: type as never } : {}),
    };

    const [activities, total] = await Promise.all([
      db.activity.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.activity.count({ where }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get user activity');
    res.status(500).json({ success: false, error: 'Failed to get user activity' });
  }
}
