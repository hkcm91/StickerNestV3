import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { env, isDevelopment } from './config/env.js';
import { getScalingConfig, logScalingConfig, getScalingMode } from './config/scaling.js';
import { swaggerSpec } from './config/swagger.js';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './db/client.js';
import { log } from './utils/logger.js';
import {
  corsMiddleware,
  requestLoggerWithFilter,
  errorHandler,
  notFoundHandler,
  setupUncaughtHandlers,
  defaultLimiter,
} from './middleware/index.js';
import {
  createWebSocketServer,
  createScalableWebSocketServer,
  CanvasWebSocketServer,
  ScalableCanvasWebSocketServer,
} from './websocket/index.js';
import { getPubSubAdapter, closePubSubAdapter } from './lib/pubsub/index.js';
import { getQueueAdapter, closeQueueAdapter, QUEUES } from './lib/queue/index.js';
import { getCacheAdapter, closeCacheAdapter } from './lib/cache/index.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import canvasRoutes from './routes/canvas.routes.js';
import widgetRoutes from './routes/widget.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import creatorRoutes from './routes/creator.routes.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import eventsRoutes from './routes/events.routes.js';
import jobRoutes from './routes/job.routes.js';
// import { paymentRoutes } from './payments/routes.js';
// import embedRoutes from './routes/embed.routes.js';
import userRoutes from './routes/user.routes.js';
import proxyRoutes from './routes/proxy.routes.js';
import commerceRoutes from './routes/commerce.routes.js';
import socialRoutes from './routes/social.routes.js';

// Job processor imports
import { initializeJobProcessors } from './jobs/index.js';
import { authService } from './services/auth.service.js';

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // Trust proxy (important for rate limiting behind load balancer)
  app.set('trust proxy', 1);

  // Security middleware with enhanced headers
  app.use(helmet({
    contentSecurityPolicy: isDevelopment ? false : undefined,
    crossOriginEmbedderPolicy: false, // Required for widget iframes
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin requests for assets
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'sameorigin' }, // Allow iframes from same origin only
    dnsPrefetchControl: { allow: false },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }));

  // CORS
  app.use(corsMiddleware);

  // Body parsing
  // Stripe webhook needs raw body for signature verification
  // app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  // Regular JSON parsing for other routes
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parsing (for refresh tokens)
  app.use(cookieParser());

  // Request logging
  app.use(requestLoggerWithFilter);

  // Rate limiting (applied globally, routes can override)
  app.use(defaultLimiter);

  // Health check endpoint (before other routes)
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealthy = await checkDatabaseHealth();
    const scalingConfig = getScalingConfig();
    const status = dbHealthy ? 'healthy' : 'degraded';

    res.status(dbHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      scaling: scalingConfig.mode,
      services: {
        database: dbHealthy ? 'up' : 'down',
        pubsub: scalingConfig.pubsub.adapter,
        queue: scalingConfig.queue.adapter,
        cache: scalingConfig.cache.adapter,
      },
    });
  });

  // API Documentation (Swagger UI)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StickerNest API Docs',
  }));

  // OpenAPI spec endpoint
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API info endpoint
  app.get('/api', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'StickerNest v2 API',
      version: '2.0.0',
      documentation: '/api/docs',
      endpoints: {
        auth: '/api/auth',
        canvas: '/api/canvas',
        marketplace: '/api/marketplace',
        ai: '/api/ai',
        upload: '/api/upload',
        events: '/api/events',
        jobs: '/api/jobs',
        payments: '/api/payments',
        embed: '/api/embed',
        health: '/api/health',
      },
    });
  });

  // API health check
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbHealthy = await checkDatabaseHealth();
    const scalingConfig = getScalingConfig();

    res.status(dbHealthy ? 200 : 503).json({
      success: dbHealthy,
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: env.NODE_ENV,
      scaling: {
        mode: scalingConfig.mode,
        features: scalingConfig.features,
      },
      services: {
        database: dbHealthy ? 'up' : 'down',
        pubsub: scalingConfig.pubsub.adapter,
        queue: scalingConfig.queue.adapter,
      },
    });
  });

  // Stats endpoint for monitoring (internal use)
  app.get('/api/stats', async (_req: Request, res: Response) => {
    const scalingConfig = getScalingConfig();

    try {
      // Get queue stats if available
      const queueAdapter = await getQueueAdapter();
      const queueStats = await Promise.all([
        queueAdapter.getStats(QUEUES.AI_GENERATION),
        queueAdapter.getStats(QUEUES.AI_IMAGE),
        queueAdapter.getStats(QUEUES.EXPORT),
      ]);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        scaling: scalingConfig,
        queues: {
          [QUEUES.AI_GENERATION]: queueStats[0],
          [QUEUES.AI_IMAGE]: queueStats[1],
          [QUEUES.EXPORT]: queueStats[2],
        },
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        uptime: Math.round(process.uptime()),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      });
    }
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/canvas', canvasRoutes);
  app.use('/api/canvas/:id/widgets', widgetRoutes); // Widget routes nested under canvas
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/creator', creatorRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/jobs', jobRoutes);
  // app.use('/api/payments', paymentRoutes);
  // app.use('/api/embed', embedRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/proxy', proxyRoutes);
  app.use('/api/commerce', commerceRoutes);
  app.use('/api/social', socialRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  // Setup uncaught error handlers
  setupUncaughtHandlers();

  let wsServer: CanvasWebSocketServer | ScalableCanvasWebSocketServer | null = null;

  try {
    // Log scaling configuration
    logScalingConfig();

    // Connect to database
    log.info('Connecting to database...');
    await connectDatabase();

    // Initialize scaling adapters
    const scalingConfig = getScalingConfig();
    const scalingMode = getScalingMode();

    // Initialize pub/sub adapter (for distributed WebSocket)
    const pubsubAdapter = await getPubSubAdapter(scalingConfig.pubsub);
    log.info(`PubSub adapter initialized: ${pubsubAdapter.getName()}`);

    // Initialize queue adapter (for background jobs)
    const queueAdapter = await getQueueAdapter(scalingConfig.queue);
    log.info(`Queue adapter initialized: ${queueAdapter.getName()}`);

    // Initialize cache adapter
    const cacheAdapter = await getCacheAdapter(scalingConfig.cache);
    log.info(`Cache adapter initialized: ${cacheAdapter.getName()}`);

    // Initialize job processors
    initializeJobProcessors(queueAdapter, {
      imageConcurrency: 2,
      videoConcurrency: 1,
      widgetConcurrency: 2,
      loraConcurrency: 1,
    });
    log.info('Job processors initialized');

    // Schedule expired session cleanup (every 6 hours)
    const SESSION_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const sessionCleanupInterval = setInterval(async () => {
      try {
        const deletedCount = await authService.cleanupExpiredSessions();
        if (deletedCount > 0) {
          log.info(`Cleaned up ${deletedCount} expired sessions`);
        }
      } catch (error) {
        log.error('Failed to cleanup expired sessions', error as Error);
      }
    }, SESSION_CLEANUP_INTERVAL_MS);
    log.info('Session cleanup scheduled (every 6 hours)');

    // Create Express app
    const app = createApp();

    // Create HTTP server (needed for WebSocket)
    const httpServer = createServer(app);

    // Initialize WebSocket server (use scalable version in distributed mode)
    if (scalingMode === 'distributed') {
      wsServer = createScalableWebSocketServer(httpServer, {
        pubsub: pubsubAdapter,
      });
      log.info('Scalable WebSocket server initialized on /ws (distributed mode)');
    } else {
      wsServer = createWebSocketServer(httpServer);
      log.info('WebSocket server initialized on /ws (local mode)');
    }

    // Start listening
    httpServer.listen(env.PORT, env.HOST, () => {
      log.info(`Server started`, {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
        scalingMode,
        url: `http://${env.HOST}:${env.PORT}`,
      });

      const modeDisplay = scalingMode === 'distributed' ? 'DISTRIBUTED' : 'LOCAL';
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   StickerNest v2 Backend Server                           ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(42)}║
║   Scaling:     ${modeDisplay.padEnd(42)}║
║   Server:      http://${env.HOST}:${env.PORT}${' '.repeat(36 - env.HOST.length - env.PORT.toString().length)}║
║   WebSocket:   ws://${env.HOST}:${env.PORT}/ws${' '.repeat(34 - env.HOST.length - env.PORT.toString().length)}║
║   API Docs:    http://${env.HOST}:${env.PORT}/api/docs${' '.repeat(28 - env.HOST.length - env.PORT.toString().length)}║
║   Health:      http://${env.HOST}:${env.PORT}/health${' '.repeat(29 - env.HOST.length - env.PORT.toString().length)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      log.info(`Received ${signal}, shutting down gracefully...`);

      // Clear session cleanup interval
      clearInterval(sessionCleanupInterval);
      log.info('Session cleanup interval cleared');

      // Stop WebSocket server
      if (wsServer) {
        if ('stop' in wsServer && typeof wsServer.stop === 'function') {
          await wsServer.stop();
        }
        log.info('WebSocket server stopped');
      }

      // Close pub/sub adapter
      await closePubSubAdapter();
      log.info('PubSub adapter closed');

      // Close queue adapter
      await closeQueueAdapter();
      log.info('Queue adapter closed');

      // Close cache adapter
      await closeCacheAdapter();
      log.info('Cache adapter closed');

      httpServer.close(async () => {
        log.info('HTTP server closed');

        await disconnectDatabase();
        log.info('Database connection closed');

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    log.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { createApp };
