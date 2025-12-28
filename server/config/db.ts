import { env } from './env.js';

/**
 * Database configuration
 * Supports PostgreSQL via Supabase or standalone
 */
export const dbConfig = {
  /**
   * Database URL from environment
   */
  url: env.DATABASE_URL,

  /**
   * Connection pool settings
   */
  pool: {
    min: 2,
    max: 10,
  },

  /**
   * Prisma logging configuration
   */
  logging: env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,

  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout: 30000,
};

/**
 * Table names matching Supabase schema
 * Used for raw queries if needed
 */
export const tableNames = {
  users: 'users',
  sessions: 'sessions',
  canvases: 'canvases',
  canvasVersions: 'canvas_versions',
  widgetInstances: 'widget_instances',
  pipelines: 'pipelines',
  widgetPackages: 'widget_packages',
  widgetPackageVersions: 'widget_package_versions',
  widgetRatings: 'widget_ratings',
  widgetComments: 'widget_comments',
  eventRecords: 'event_records',
  assets: 'assets',
  inviteTokens: 'invite_tokens',
} as const;

export type TableName = typeof tableNames[keyof typeof tableNames];
