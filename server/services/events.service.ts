import { db } from '../db/client.js';
import { idGenerators } from '../utils/id.js';
import { NotFoundError, AuthorizationError } from '../utils/AppErrors.js';
import type {
  CreateEventInput,
  EventQuery,
  EventResponse,
} from '../schemas/events.schema.js';

// JSON type alias for Prisma JSON fields
type JsonValue = unknown;

/**
 * Events service - handles event logging for canvases
 */
export class EventsService {
  /**
   * Create an event record
   */
  async createEvent(
    canvasId: string,
    userId: string,
    input: CreateEventInput
  ): Promise<EventResponse> {
    // Verify canvas access
    await this.verifyCanvasAccess(canvasId, userId);

    const event = await db.eventRecord.create({
      data: {
        id: idGenerators.event(),
        canvasId,
        eventType: input.type,
        channel: input.channel,
        payload: input.payload as JsonValue,
        sourceType: input.source,
        sourceId: input.sourceId,
        sourceUserId: userId,
        targetType: input.target,
        targetId: input.targetId,
      },
    });

    return this.formatEvent(event);
  }

  /**
   * Get events for a canvas
   */
  async getEvents(
    canvasId: string,
    userId: string,
    query: EventQuery
  ): Promise<{
    events: EventResponse[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    // Verify canvas access
    await this.verifyCanvasAccess(canvasId, userId);

    const where: {
      canvasId: string;
      eventType?: string;
      channel?: string;
      sourceType?: string;
      sourceUserId?: string;
      timestamp?: Record<string, unknown>;
    } = { canvasId };

    if (query.type) {
      where.eventType = query.type;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }

    if (query.sourceUserId) {
      where.sourceUserId = query.sourceUserId;
    }

    if (query.since) {
      where.timestamp = { gte: query.since };
    }

    if (query.until) {
      where.timestamp = {
        ...(where.timestamp || {}),
        lte: query.until,
      };
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {
      timestamp: query.sortOrder,
    };

    const [events, total] = await Promise.all([
      db.eventRecord.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      db.eventRecord.count({ where }),
    ]);

    return {
      events: events.map((e: Parameters<EventsService['formatEvent']>[0]) => this.formatEvent(e)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Get events since a timestamp (for polling)
   */
  async getEventsSince(
    canvasId: string,
    userId: string,
    since: Date,
    limit: number = 100
  ): Promise<EventResponse[]> {
    await this.verifyCanvasAccess(canvasId, userId);

    const events = await db.eventRecord.findMany({
      where: {
        canvasId,
        timestamp: { gt: since },
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    return events.map((e: Parameters<EventsService['formatEvent']>[0]) => this.formatEvent(e));
  }

  /**
   * Delete old events (cleanup)
   */
  async cleanupOldEvents(canvasId: string, olderThan: Date): Promise<number> {
    const result = await db.eventRecord.deleteMany({
      where: {
        canvasId,
        timestamp: { lt: olderThan },
      },
    });
    return result.count;
  }

  /**
   * Get event statistics for a canvas
   */
  async getEventStats(canvasId: string, userId: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByChannel: Record<string, number>;
    recentActivity: { date: string; count: number }[];
  }> {
    await this.verifyCanvasAccess(canvasId, userId);

    const [
      totalEvents,
      eventsByType,
      eventsByChannel,
      recentActivity,
    ] = await Promise.all([
      db.eventRecord.count({ where: { canvasId } }),

      db.eventRecord.groupBy({
        by: ['eventType'],
        where: { canvasId },
        _count: true,
      }),

      db.eventRecord.groupBy({
        by: ['channel'],
        where: { canvasId },
        _count: true,
      }),

      // Get daily counts for last 7 days
      db.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM event_records
        WHERE canvas_id = ${canvasId}
          AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `,
    ]);

    return {
      totalEvents,
      eventsByType: Object.fromEntries(
        eventsByType.map((e: { eventType: string; _count: number }) => [e.eventType, e._count])
      ),
      eventsByChannel: Object.fromEntries(
        eventsByChannel.map((e: { channel: string; _count: number }) => [e.channel, e._count])
      ),
      recentActivity: recentActivity.map((r: { date: string; count: bigint }) => ({
        date: r.date,
        count: Number(r.count),
      })),
    };
  }

  /**
   * Verify user has access to canvas
   */
  private async verifyCanvasAccess(canvasId: string, userId: string): Promise<void> {
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId },
    });

    if (!canvas) {
      throw new NotFoundError('Canvas', canvasId);
    }

    // For events, require ownership or public canvas
    if (canvas.userId !== userId && canvas.visibility === 'private') {
      throw new AuthorizationError('Not authorized to access canvas events');
    }
  }

  /**
   * Format event for response
   */
  private formatEvent(event: {
    id: string;
    canvasId: string;
    eventType: string;
    channel: string;
    payload: JsonValue;
    sourceType: string | null;
    sourceId: string | null;
    sourceUserId: string | null;
    targetType: string | null;
    targetId: string | null;
    timestamp: Date;
  }): EventResponse {
    return {
      id: event.id,
      canvasId: event.canvasId,
      eventType: event.eventType,
      channel: event.channel,
      payload: event.payload,
      sourceType: event.sourceType,
      sourceId: event.sourceId,
      sourceUserId: event.sourceUserId,
      targetType: event.targetType,
      targetId: event.targetId,
      timestamp: event.timestamp.toISOString(),
    };
  }
}

// Export singleton instance
export const eventsService = new EventsService();
