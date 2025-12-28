import { PrismaClient } from '@prisma/client';
import { isDevelopment } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Re-export PrismaClient type for use in services
export type { PrismaClient };

/**
 * Prisma client singleton
 */
let prisma: PrismaClient;

/**
 * Get or create the Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: isDevelopment
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
            { level: 'warn', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
    });

    // Log queries in development
    if (isDevelopment) {
      prisma.$on('query' as never, (e: { query: string; duration: number }) => {
        logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma query');
      });
    }
  }

  return prisma;
}

/**
 * Export the Prisma client instance
 */
export const db = getPrismaClient();

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await db.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await db.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting from database');
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Transaction helper
 */
export type Transaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute operations in a transaction
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.$transaction(fn);
}
