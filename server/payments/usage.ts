/**
 * StickerNest v2 - Usage Tracking Service
 *
 * Tracks user resource usage against subscription limits.
 * Supports multiple storage backends (in-memory, Redis, database).
 */

import type { IUsageService, UsageData, LimitType } from './middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface UsageRecord {
  userId: string;
  canvasCount: number;
  widgetCount: number;
  publishedWidgetCount: number;
  storageUsedBytes: number;
  aiCreditsUsed: number;
  bandwidthUsedBytes: number;
  periodStart: Date;
  periodEnd: Date;
  updatedAt: Date;
}

export interface UsageSnapshot {
  userId: string;
  period: string; // YYYY-MM format
  aiCreditsUsed: number;
  bandwidthUsedBytes: number;
  peakStorageBytes: number;
  createdAt: Date;
}

export type StorageBackend = 'memory' | 'redis' | 'database';

// ============================================================================
// REDIS CLIENT INTERFACE
// ============================================================================

export interface IRedisClient {
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, field: string, value: string): Promise<void>;
  hIncrBy(key: string, field: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ============================================================================
// DATABASE CLIENT INTERFACE
// ============================================================================

export interface IDatabaseClient {
  getUserUsage(userId: string): Promise<UsageRecord | null>;
  upsertUserUsage(userId: string, data: Partial<UsageRecord>): Promise<UsageRecord>;
  incrementField(userId: string, field: string, amount: number): Promise<void>;
  saveSnapshot(snapshot: UsageSnapshot): Promise<void>;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

class InMemoryUsageStore {
  private data: Map<string, UsageData> = new Map();
  private snapshots: Map<string, UsageSnapshot[]> = new Map();

  getDefaultUsage(): UsageData {
    return {
      canvasCount: 0,
      widgetCount: 0,
      publishedWidgetCount: 0,
      storageUsedBytes: 0,
      aiCreditsUsed: 0,
      bandwidthUsedBytes: 0,
    };
  }

  get(userId: string): UsageData {
    return this.data.get(userId) || this.getDefaultUsage();
  }

  set(userId: string, usage: UsageData): void {
    this.data.set(userId, usage);
  }

  increment(userId: string, field: keyof UsageData, amount: number): void {
    const usage = this.get(userId);
    (usage[field] as number) += amount;
    this.set(userId, usage);
  }

  decrement(userId: string, field: keyof UsageData, amount: number): void {
    const usage = this.get(userId);
    (usage[field] as number) = Math.max(0, (usage[field] as number) - amount);
    this.set(userId, usage);
  }

  addSnapshot(userId: string, snapshot: UsageSnapshot): void {
    const userSnapshots = this.snapshots.get(userId) || [];
    userSnapshots.push(snapshot);
    this.snapshots.set(userId, userSnapshots);
  }

  getSnapshots(userId: string): UsageSnapshot[] {
    return this.snapshots.get(userId) || [];
  }
}

// ============================================================================
// USAGE SERVICE IMPLEMENTATION
// ============================================================================

export class UsageService implements IUsageService {
  private backend: StorageBackend;
  private memoryStore: InMemoryUsageStore;
  private redisClient?: IRedisClient;
  private databaseClient?: IDatabaseClient;

  constructor(
    backend: StorageBackend = 'memory',
    options?: {
      redis?: IRedisClient;
      database?: IDatabaseClient;
    }
  ) {
    this.backend = backend;
    this.memoryStore = new InMemoryUsageStore();

    if (backend === 'redis' && options?.redis) {
      this.redisClient = options.redis;
    }

    if (backend === 'database' && options?.database) {
      this.databaseClient = options.database;
    }
  }

  private getUsageKey(userId: string): string {
    return `usage:${userId}`;
  }

  private limitTypeToField(type: LimitType): keyof UsageData {
    const mapping: Record<LimitType, keyof UsageData> = {
      canvas: 'canvasCount',
      widget: 'widgetCount',
      published_widget: 'publishedWidgetCount',
      storage: 'storageUsedBytes',
      ai_credits: 'aiCreditsUsed',
      bandwidth: 'bandwidthUsedBytes',
    };
    return mapping[type];
  }

  async getUserUsage(userId: string): Promise<UsageData> {
    switch (this.backend) {
      case 'redis':
        return this.getUsageFromRedis(userId);
      case 'database':
        return this.getUsageFromDatabase(userId);
      default:
        return this.memoryStore.get(userId);
    }
  }

  private async getUsageFromRedis(userId: string): Promise<UsageData> {
    if (!this.redisClient) {
      return this.memoryStore.get(userId);
    }

    const key = this.getUsageKey(userId);
    const data = await this.redisClient.hGetAll(key);

    if (!data || Object.keys(data).length === 0) {
      return this.memoryStore.getDefaultUsage();
    }

    return {
      canvasCount: parseInt(data.canvasCount || '0', 10),
      widgetCount: parseInt(data.widgetCount || '0', 10),
      publishedWidgetCount: parseInt(data.publishedWidgetCount || '0', 10),
      storageUsedBytes: parseInt(data.storageUsedBytes || '0', 10),
      aiCreditsUsed: parseInt(data.aiCreditsUsed || '0', 10),
      bandwidthUsedBytes: parseInt(data.bandwidthUsedBytes || '0', 10),
    };
  }

  private async getUsageFromDatabase(userId: string): Promise<UsageData> {
    if (!this.databaseClient) {
      return this.memoryStore.get(userId);
    }

    const record = await this.databaseClient.getUserUsage(userId);

    if (!record) {
      return this.memoryStore.getDefaultUsage();
    }

    return {
      canvasCount: record.canvasCount,
      widgetCount: record.widgetCount,
      publishedWidgetCount: record.publishedWidgetCount,
      storageUsedBytes: record.storageUsedBytes,
      aiCreditsUsed: record.aiCreditsUsed,
      bandwidthUsedBytes: record.bandwidthUsedBytes,
    };
  }

  async incrementUsage(userId: string, type: LimitType, amount: number = 1): Promise<void> {
    const field = this.limitTypeToField(type);

    switch (this.backend) {
      case 'redis':
        await this.incrementInRedis(userId, field, amount);
        break;
      case 'database':
        await this.incrementInDatabase(userId, field, amount);
        break;
      default:
        this.memoryStore.increment(userId, field, amount);
    }
  }

  private async incrementInRedis(userId: string, field: string, amount: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const key = this.getUsageKey(userId);
    await this.redisClient.hIncrBy(key, field, amount);
    // Set expiry to 35 days (covers monthly billing + buffer)
    await this.redisClient.expire(key, 35 * 24 * 60 * 60);
  }

  private async incrementInDatabase(userId: string, field: string, amount: number): Promise<void> {
    if (!this.databaseClient) {
      return;
    }

    await this.databaseClient.incrementField(userId, field, amount);
  }

  async decrementUsage(userId: string, type: LimitType, amount: number = 1): Promise<void> {
    const field = this.limitTypeToField(type);

    switch (this.backend) {
      case 'redis':
        await this.decrementInRedis(userId, field, amount);
        break;
      case 'database':
        await this.incrementInDatabase(userId, field, -amount);
        break;
      default:
        this.memoryStore.decrement(userId, field, amount);
    }
  }

  private async decrementInRedis(userId: string, field: string, amount: number): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const key = this.getUsageKey(userId);
    const current = await this.redisClient.hGetAll(key);
    const currentValue = parseInt(current[field] || '0', 10);
    const newValue = Math.max(0, currentValue - amount);
    await this.redisClient.hSet(key, field, newValue.toString());
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    // First, snapshot the current usage
    await this.saveMonthlySnapshot(userId);

    // Reset monthly counters
    switch (this.backend) {
      case 'redis':
        await this.resetMonthlyInRedis(userId);
        break;
      case 'database':
        await this.resetMonthlyInDatabase(userId);
        break;
      default:
        const usage = this.memoryStore.get(userId);
        usage.aiCreditsUsed = 0;
        usage.bandwidthUsedBytes = 0;
        this.memoryStore.set(userId, usage);
    }
  }

  private async resetMonthlyInRedis(userId: string): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    const key = this.getUsageKey(userId);
    await this.redisClient.hSet(key, 'aiCreditsUsed', '0');
    await this.redisClient.hSet(key, 'bandwidthUsedBytes', '0');
  }

  private async resetMonthlyInDatabase(userId: string): Promise<void> {
    if (!this.databaseClient) {
      return;
    }

    await this.databaseClient.upsertUserUsage(userId, {
      aiCreditsUsed: 0,
      bandwidthUsedBytes: 0,
    });
  }

  private async saveMonthlySnapshot(userId: string): Promise<void> {
    const usage = await this.getUserUsage(userId);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const snapshot: UsageSnapshot = {
      userId,
      period,
      aiCreditsUsed: usage.aiCreditsUsed,
      bandwidthUsedBytes: usage.bandwidthUsedBytes,
      peakStorageBytes: usage.storageUsedBytes,
      createdAt: now,
    };

    if (this.backend === 'database' && this.databaseClient) {
      await this.databaseClient.saveSnapshot(snapshot);
    } else {
      this.memoryStore.addSnapshot(userId, snapshot);
    }
  }

  /**
   * Get usage history for a user
   */
  async getUsageHistory(userId: string, months: number = 6): Promise<UsageSnapshot[]> {
    if (this.backend === 'memory') {
      return this.memoryStore.getSnapshots(userId).slice(-months);
    }

    // For Redis/Database, this would query historical snapshots
    // Implementation depends on storage structure
    return [];
  }

  /**
   * Check if user is approaching limit (80% threshold)
   */
  async isApproachingLimit(
    userId: string,
    type: LimitType,
    limit: number
  ): Promise<{ approaching: boolean; percentage: number }> {
    const usage = await this.getUserUsage(userId);
    const field = this.limitTypeToField(type);
    const current = usage[field] as number;
    const percentage = (current / limit) * 100;

    return {
      approaching: percentage >= 80,
      percentage,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let usageServiceInstance: UsageService | null = null;

/**
 * Get the usage service instance
 */
export function getUsageService(): UsageService {
  if (!usageServiceInstance) {
    usageServiceInstance = new UsageService('memory');
  }
  return usageServiceInstance;
}

/**
 * Initialize usage service with specific backend
 */
export function initUsageService(
  backend: StorageBackend,
  options?: {
    redis?: IRedisClient;
    database?: IDatabaseClient;
  }
): UsageService {
  usageServiceInstance = new UsageService(backend, options);
  return usageServiceInstance;
}

// ============================================================================
// MONTHLY RESET SCHEDULER
// ============================================================================

/**
 * Schedule monthly usage resets for all users
 * Should be called by a cron job or scheduler
 */
export async function scheduleMonthlyResets(
  getUserIds: () => Promise<string[]>,
  usageService: UsageService
): Promise<void> {
  const userIds = await getUserIds();

  for (const userId of userIds) {
    try {
      await usageService.resetMonthlyUsage(userId);
      console.log(`[Usage] Reset monthly usage for user: ${userId}`);
    } catch (error) {
      console.error(`[Usage] Failed to reset usage for user ${userId}:`, error);
    }
  }
}

// ============================================================================
// USAGE ALERTS
// ============================================================================

export interface UsageAlert {
  userId: string;
  type: LimitType;
  percentage: number;
  limit: number;
  current: number;
  timestamp: Date;
}

export type AlertHandler = (alert: UsageAlert) => void | Promise<void>;

const alertHandlers: AlertHandler[] = [];

/**
 * Register an alert handler
 */
export function onUsageAlert(handler: AlertHandler): () => void {
  alertHandlers.push(handler);
  return () => {
    const index = alertHandlers.indexOf(handler);
    if (index >= 0) {
      alertHandlers.splice(index, 1);
    }
  };
}

/**
 * Emit a usage alert
 */
export async function emitUsageAlert(alert: UsageAlert): Promise<void> {
  for (const handler of alertHandlers) {
    try {
      await handler(alert);
    } catch (error) {
      console.error('[Usage] Alert handler error:', error);
    }
  }
}

/**
 * Check and emit alerts for a user
 */
export async function checkAndEmitAlerts(
  userId: string,
  limits: Record<LimitType, number>,
  usageService: UsageService
): Promise<void> {
  const usage = await usageService.getUserUsage(userId);
  const thresholds = [80, 90, 100]; // Alert at 80%, 90%, and 100%

  const checks: Array<{ type: LimitType; current: number; limit: number }> = [
    { type: 'canvas', current: usage.canvasCount, limit: limits.canvas },
    { type: 'widget', current: usage.widgetCount, limit: limits.widget },
    { type: 'ai_credits', current: usage.aiCreditsUsed, limit: limits.ai_credits },
    { type: 'storage', current: usage.storageUsedBytes, limit: limits.storage },
    { type: 'bandwidth', current: usage.bandwidthUsedBytes, limit: limits.bandwidth },
  ];

  for (const check of checks) {
    const percentage = (check.current / check.limit) * 100;

    for (const threshold of thresholds) {
      if (percentage >= threshold && percentage < threshold + 10) {
        await emitUsageAlert({
          userId,
          type: check.type,
          percentage,
          limit: check.limit,
          current: check.current,
          timestamp: new Date(),
        });
        break;
      }
    }
  }
}
