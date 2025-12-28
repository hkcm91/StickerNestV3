/**
 * StickerNest v2 - Chat Service
 * =============================
 *
 * Backend service for real-time canvas chat messaging.
 * Uses Supabase Realtime for WebSocket-based message delivery.
 *
 * ## Architecture Notes for Future Developers
 *
 * This service integrates with:
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      CHAT FLOW                              │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  User Input ──► ChatService.sendMessage()                   │
 * │                        │                                    │
 * │                        ▼                                    │
 * │               Database INSERT                               │
 * │                        │                                    │
 * │                        ▼                                    │
 * │              Supabase Realtime                              │
 * │                        │                                    │
 * │                        ▼                                    │
 * │         ChatService.subscribeToCanvas()                     │
 * │                        │                                    │
 * │                        ▼                                    │
 * │              LiveChatWidget (EventBus)                      │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Database Schema (chat_messages table)
 *
 * | Column       | Type      | Description                       |
 * |--------------|-----------|-----------------------------------|
 * | id           | uuid      | Primary key                       |
 * | canvas_id    | uuid      | Canvas the message belongs to     |
 * | user_id      | uuid      | Message author                    |
 * | content      | text      | Message content                   |
 * | reply_to     | uuid      | Reply to message ID (nullable)    |
 * | metadata     | jsonb     | Additional data (reactions, etc.) |
 * | created_at   | timestamp | Creation timestamp                |
 * | updated_at   | timestamp | Last update timestamp             |
 *
 * ## Supabase Realtime Setup
 *
 * ```sql
 * -- Create chat_messages table
 * CREATE TABLE chat_messages (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
 *   user_id UUID NOT NULL REFERENCES profiles(id),
 *   content TEXT NOT NULL,
 *   reply_to UUID REFERENCES chat_messages(id),
 *   metadata JSONB DEFAULT '{}',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 *
 * -- Index for canvas queries
 * CREATE INDEX idx_chat_messages_canvas_id ON chat_messages(canvas_id);
 *
 * -- Enable realtime
 * ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
 *
 * -- RLS policies
 * CREATE POLICY "Users can read messages from accessible canvases"
 *   ON chat_messages FOR SELECT
 *   USING (EXISTS (
 *     SELECT 1 FROM canvases
 *     WHERE canvases.id = chat_messages.canvas_id
 *     AND (canvases.is_public OR canvases.user_id = auth.uid())
 *   ));
 *
 * CREATE POLICY "Users can insert their own messages"
 *   ON chat_messages FOR INSERT
 *   WITH CHECK (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can update their own messages"
 *   ON chat_messages FOR UPDATE
 *   USING (auth.uid() = user_id);
 *
 * CREATE POLICY "Users can delete their own messages"
 *   ON chat_messages FOR DELETE
 *   USING (auth.uid() = user_id);
 * ```
 *
 * ## Typing Indicators
 *
 * Typing indicators use Supabase Broadcast (not postgres_changes)
 * for lower latency ephemeral state. See subscribeToTyping().
 *
 * @see LiveChatWidget - For the chat UI widget
 * @see SocialEventBridge - For event routing
 */

import { supabaseClient, isLocalDevMode } from '../supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ==================
// Types
// ==================

/**
 * Chat message from the database
 */
export interface ChatMessageRow {
  id: string;
  canvas_id: string;
  user_id: string;
  content: string;
  reply_to: string | null;
  metadata: {
    reactions?: Record<string, string[]>; // emoji -> userIds
    edited?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chat message with joined profile data
 */
export interface ChatMessageWithProfile extends ChatMessageRow {
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

/**
 * Typing indicator payload
 */
export interface TypingIndicator {
  canvasId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: number;
}

/**
 * Callback type for message subscription
 */
export type MessageCallback = (
  payload: RealtimePostgresChangesPayload<ChatMessageRow>
) => void;

/**
 * Callback type for typing subscription
 */
export type TypingCallback = (indicator: TypingIndicator) => void;

// ==================
// Service State
// ==================

/** Active message subscriptions by canvas ID */
const messageChannels: Map<string, RealtimeChannel> = new Map();

/** Active typing channels by canvas ID */
const typingChannels: Map<string, RealtimeChannel> = new Map();

/** Debounced typing state to avoid spamming */
const lastTypingBroadcast: Map<string, number> = new Map();
const TYPING_DEBOUNCE_MS = 1000;

// ==================
// Service Methods
// ==================

export const ChatService = {
  /**
   * Fetch message history for a canvas
   *
   * @param canvasId - Canvas to fetch messages for
   * @param limit - Maximum number to fetch (default 50)
   * @param before - Fetch messages before this timestamp (for pagination)
   * @returns Array of messages with profile data
   *
   * @example
   * const messages = await ChatService.getMessages('canvas-123', 50);
   */
  async getMessages(
    canvasId: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessageWithProfile[]> {
    if (!supabaseClient) {
      if (isLocalDevMode) {
        console.log('[ChatService] Local dev mode - returning mock data');
        return [];
      }
      return [];
    }

    let query = supabaseClient
      .from('chat_messages')
      .select('*, profiles!user_id(*)')
      .eq('canvas_id', canvasId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ChatService] Failed to fetch messages:', error);
      throw error;
    }

    // Reverse to get chronological order
    return ((data || []) as ChatMessageWithProfile[]).reverse();
  },

  /**
   * Send a new chat message
   *
   * @param canvasId - Canvas to send message in
   * @param content - Message content
   * @param replyTo - Optional message ID being replied to
   * @returns The created message
   *
   * @example
   * const message = await ChatService.sendMessage('canvas-123', 'Hello!');
   */
  async sendMessage(
    canvasId: string,
    content: string,
    replyTo?: string
  ): Promise<ChatMessageWithProfile> {
    if (!supabaseClient) {
      throw new Error('Supabase client not available');
    }

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabaseClient
      .from('chat_messages')
      .insert({
        canvas_id: canvasId,
        user_id: user.id,
        content: content.trim(),
        reply_to: replyTo || null,
        metadata: {},
      })
      .select('*, profiles!user_id(*)')
      .single();

    if (error) {
      console.error('[ChatService] Failed to send message:', error);
      throw error;
    }

    return data as ChatMessageWithProfile;
  },

  /**
   * Update a message (content or metadata)
   *
   * @param messageId - Message to update
   * @param updates - Partial updates (content or metadata)
   */
  async updateMessage(
    messageId: string,
    updates: { content?: string; metadata?: Record<string, unknown> }
  ): Promise<void> {
    if (!supabaseClient) return;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.metadata = { ...(updateData.metadata as object || {}), edited: true };
    }

    if (updates.metadata !== undefined) {
      updateData.metadata = updates.metadata;
    }

    const { error } = await supabaseClient
      .from('chat_messages')
      .update(updateData)
      .eq('id', messageId);

    if (error) {
      console.error('[ChatService] Failed to update message:', error);
      throw error;
    }
  },

  /**
   * Delete a message
   *
   * @param messageId - Message to delete
   */
  async deleteMessage(messageId: string): Promise<void> {
    if (!supabaseClient) return;

    const { error } = await supabaseClient
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('[ChatService] Failed to delete message:', error);
      throw error;
    }
  },

  /**
   * Add a reaction to a message
   *
   * @param messageId - Message to react to
   * @param emoji - Reaction emoji
   * @param userId - User adding the reaction
   */
  async addReaction(
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    if (!supabaseClient) return;

    // Fetch current message to update reactions
    const { data: message, error: fetchError } = await supabaseClient
      .from('chat_messages')
      .select('metadata')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('[ChatService] Failed to fetch message for reaction:', fetchError);
      throw fetchError;
    }

    const metadata = (message?.metadata || {}) as {
      reactions?: Record<string, string[]>;
    };
    const reactions = metadata.reactions || {};

    // Toggle reaction
    if (reactions[emoji]?.includes(userId)) {
      // Remove reaction
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add reaction
      if (!reactions[emoji]) reactions[emoji] = [];
      reactions[emoji].push(userId);
    }

    const { error } = await supabaseClient
      .from('chat_messages')
      .update({ metadata: { ...metadata, reactions } })
      .eq('id', messageId);

    if (error) {
      console.error('[ChatService] Failed to add reaction:', error);
      throw error;
    }
  },

  /**
   * Subscribe to messages for a canvas
   *
   * NOTE: Uses Supabase postgres_changes for real-time message delivery.
   *
   * ## Implementation Notes for Future Developers
   *
   * 1. Subscriptions are per-canvas (canvasId filter)
   * 2. Multiple widgets can subscribe to the same canvas
   * 3. Call the returned unsubscribe function to clean up
   *
   * @param canvasId - Canvas to subscribe to
   * @param callback - Function called when messages change
   * @returns Unsubscribe function
   *
   * @example
   * const unsubscribe = ChatService.subscribeToMessages('canvas-123', (payload) => {
   *   if (payload.eventType === 'INSERT') {
   *     console.log('New message:', payload.new);
   *   }
   * });
   */
  subscribeToMessages(canvasId: string, callback: MessageCallback): () => void {
    if (!supabaseClient) {
      console.log('[ChatService] No Supabase client - skipping subscription');
      return () => {};
    }

    // Clean up existing subscription for this canvas
    if (messageChannels.has(canvasId)) {
      const existingChannel = messageChannels.get(canvasId)!;
      supabaseClient.removeChannel(existingChannel);
      messageChannels.delete(canvasId);
    }

    const channelName = `chat:${canvasId}:${Date.now()}`;

    const channel = supabaseClient
      .channel(channelName)
      .on<ChatMessageRow>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          console.log('[ChatService] Realtime event:', payload.eventType);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[ChatService] Messages subscription (${canvasId}):`, status);
      });

    messageChannels.set(canvasId, channel);

    return () => {
      if (messageChannels.has(canvasId) && supabaseClient) {
        const ch = messageChannels.get(canvasId)!;
        supabaseClient.removeChannel(ch);
        messageChannels.delete(canvasId);
        console.log(`[ChatService] Unsubscribed from messages (${canvasId})`);
      }
    };
  },

  /**
   * Subscribe to typing indicators for a canvas
   *
   * NOTE: Uses Supabase Broadcast (not postgres_changes) for low-latency
   * ephemeral typing indicators that don't persist to the database.
   *
   * @param canvasId - Canvas to subscribe to
   * @param callback - Function called when typing state changes
   * @returns Unsubscribe function
   *
   * @example
   * const unsubscribe = ChatService.subscribeToTyping('canvas-123', (indicator) => {
   *   console.log(`${indicator.userName} is ${indicator.isTyping ? 'typing' : 'not typing'}`);
   * });
   */
  subscribeToTyping(canvasId: string, callback: TypingCallback): () => void {
    if (!supabaseClient) {
      return () => {};
    }

    // Clean up existing subscription
    if (typingChannels.has(canvasId)) {
      const existingChannel = typingChannels.get(canvasId)!;
      supabaseClient.removeChannel(existingChannel);
      typingChannels.delete(canvasId);
    }

    const channelName = `typing:${canvasId}`;

    const channel = supabaseClient
      .channel(channelName)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        callback(payload as TypingIndicator);
      })
      .subscribe((status) => {
        console.log(`[ChatService] Typing subscription (${canvasId}):`, status);
      });

    typingChannels.set(canvasId, channel);

    return () => {
      if (typingChannels.has(canvasId) && supabaseClient) {
        const ch = typingChannels.get(canvasId)!;
        supabaseClient.removeChannel(ch);
        typingChannels.delete(canvasId);
      }
    };
  },

  /**
   * Broadcast typing indicator
   *
   * NOTE: Debounced to avoid spamming the channel.
   *
   * @param canvasId - Canvas being typed in
   * @param userId - User typing
   * @param userName - User's display name
   * @param isTyping - Whether user is typing
   */
  broadcastTyping(
    canvasId: string,
    userId: string,
    userName: string,
    isTyping: boolean
  ): void {
    if (!supabaseClient) return;

    // Debounce typing broadcasts
    const now = Date.now();
    const key = `${canvasId}:${userId}`;
    const lastBroadcast = lastTypingBroadcast.get(key) || 0;

    if (isTyping && now - lastBroadcast < TYPING_DEBOUNCE_MS) {
      return; // Skip - too soon since last broadcast
    }

    lastTypingBroadcast.set(key, now);

    // Get or create typing channel
    let channel = typingChannels.get(canvasId);

    if (!channel) {
      // Create ephemeral channel for broadcast
      const channelName = `typing:${canvasId}`;
      channel = supabaseClient.channel(channelName);
      channel.subscribe();
      typingChannels.set(canvasId, channel);
    }

    const indicator: TypingIndicator = {
      canvasId,
      userId,
      userName,
      isTyping,
      timestamp: now,
    };

    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: indicator,
    });
  },

  /**
   * Get the number of messages in a canvas
   *
   * @param canvasId - Canvas to count messages for
   */
  async getMessageCount(canvasId: string): Promise<number> {
    if (!supabaseClient) return 0;

    const { count, error } = await supabaseClient
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('canvas_id', canvasId);

    if (error) {
      console.error('[ChatService] Failed to get message count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Check if user is subscribed to a canvas's messages
   */
  isSubscribed(canvasId: string): boolean {
    return messageChannels.has(canvasId);
  },

  /**
   * Cleanup all subscriptions
   *
   * Call this when the app/component unmounts to clean up all channels.
   */
  cleanup(): void {
    if (!supabaseClient) return;

    // Clean up message channels
    messageChannels.forEach((channel, canvasId) => {
      supabaseClient.removeChannel(channel);
      console.log(`[ChatService] Cleaned up message channel (${canvasId})`);
    });
    messageChannels.clear();

    // Clean up typing channels
    typingChannels.forEach((channel, canvasId) => {
      supabaseClient.removeChannel(channel);
      console.log(`[ChatService] Cleaned up typing channel (${canvasId})`);
    });
    typingChannels.clear();

    // Clear typing debounce state
    lastTypingBroadcast.clear();
  },
};

export default ChatService;
