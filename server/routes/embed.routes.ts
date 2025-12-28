/**
 * StickerNest v2 - Embed Routes
 *
 * Server routes for canvas embedding functionality.
 * Handles embed token management, canvas access validation,
 * and analytics tracking for embedded canvases.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { NotFoundError, AuthorizationError } from '../utils/AppErrors.js';
import { log } from '../utils/logger.js';

const router = Router();

// ============================================================================
// TYPES
// ============================================================================

interface EmbedValidationQuery {
  canvasId: string;
  mode?: string;
  token?: string;
}

interface CreateTokenBody {
  canvasId: string;
  allowedOrigins?: string[];
  mode?: 'view' | 'interact';
  expiresIn?: number; // seconds
  showBranding?: boolean;
  theme?: string;
}

interface TrackEventBody {
  canvasId: string;
  token?: string;
  event: 'view' | 'interact' | 'error';
  data?: Record<string, unknown>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a secure embed token
 */
function generateEmbedToken(): string {
  return `emb_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Check if an origin is allowed for an embed token
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  // Empty array means all origins allowed
  if (allowedOrigins.length === 0) return true;
  if (!origin) return false;

  return allowedOrigins.some(allowed => {
    // Support wildcard subdomains
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === domain.replace(/^\./, '');
    }
    return origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`;
  });
}

/**
 * Get canvas with visibility check for embedding
 */
async function getCanvasForEmbed(canvasId: string, token?: string) {
  const canvas = await db.canvas.findUnique({
    where: { id: canvasId },
    include: {
      user: {
        select: { id: true, username: true, displayName: true }
      }
    }
  });

  if (!canvas) {
    throw new NotFoundError('Canvas', canvasId);
  }

  // If canvas is public, allow access
  if (canvas.visibility === 'public') {
    return canvas;
  }

  // If canvas is unlisted, require valid embed token
  if (canvas.visibility === 'unlisted' && token) {
    const embedToken = await db.embedToken.findUnique({
      where: { token }
    });

    if (embedToken &&
        embedToken.canvasId === canvasId &&
        embedToken.isActive &&
        (!embedToken.expiresAt || embedToken.expiresAt > new Date())) {
      return canvas;
    }
  }

  // Private canvases require a valid embed token
  if (token) {
    const embedToken = await db.embedToken.findUnique({
      where: { token }
    });

    if (embedToken &&
        embedToken.canvasId === canvasId &&
        embedToken.isActive &&
        (!embedToken.expiresAt || embedToken.expiresAt > new Date())) {
      return canvas;
    }
  }

  throw new AuthorizationError('Canvas is not available for embedding');
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/embed/validate
 * Validates that a canvas can be embedded and returns embed configuration
 */
router.get('/validate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { canvasId, mode, token } = req.query as unknown as EmbedValidationQuery;
    const origin = req.get('origin');

    if (!canvasId) {
      return res.status(400).json({
        success: false,
        error: 'Canvas ID is required'
      });
    }

    // Check if canvas exists and is embeddable
    const canvas = await getCanvasForEmbed(canvasId, token as string);

    // If token provided, validate origin
    if (token) {
      const embedToken = await db.embedToken.findUnique({
        where: { token }
      });

      if (embedToken && !isOriginAllowed(origin, embedToken.allowedOrigins)) {
        return res.status(403).json({
          success: false,
          error: 'Origin not allowed for this embed token'
        });
      }
    }

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    // Determine allowed modes based on canvas settings
    const allowedModes = canvas.visibility === 'public'
      ? ['view', 'interact']
      : ['view'];

    res.json({
      success: true,
      valid: true,
      embedUrl: `${baseUrl}/embed/${canvas.slug || canvasId}`,
      canvas: {
        id: canvas.id,
        name: canvas.name,
        slug: canvas.slug,
        width: canvas.width,
        height: canvas.height,
        visibility: canvas.visibility,
        owner: {
          username: canvas.user.username,
          displayName: canvas.user.displayName
        }
      },
      allowedModes,
      settings: {
        showBranding: true,
        allowInteraction: allowedModes.includes(mode || 'view')
      }
    });

  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return res.status(error instanceof NotFoundError ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
    log.error('[Embed] Validation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate canvas'
    });
  }
});

/**
 * GET /api/embed/canvas/:canvasId
 * Get canvas data for embedding (includes widgets)
 */
router.get('/canvas/:canvasId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { canvasId } = req.params;
    const { token } = req.query;
    const origin = req.get('origin');

    // Get canvas with embed permission check
    const canvas = await getCanvasForEmbed(canvasId, token as string);

    // Validate origin if token provided
    if (token) {
      const embedToken = await db.embedToken.findUnique({
        where: { token: token as string }
      });

      if (embedToken) {
        if (!isOriginAllowed(origin, embedToken.allowedOrigins)) {
          return res.status(403).json({
            success: false,
            error: 'Origin not allowed'
          });
        }

        // Increment view count on the token
        await db.embedToken.update({
          where: { id: embedToken.id },
          data: { viewCount: { increment: 1 } }
        });
      }
    }

    // Fetch widgets for the canvas
    const widgets = await db.widgetInstance.findMany({
      where: { canvasId: canvas.id },
      orderBy: { zIndex: 'asc' }
    });

    // Increment canvas view count
    await db.canvas.update({
      where: { id: canvas.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      success: true,
      canvas: {
        id: canvas.id,
        name: canvas.name,
        slug: canvas.slug,
        width: canvas.width,
        height: canvas.height,
        backgroundConfig: canvas.backgroundConfig,
        settings: canvas.settings,
        owner: {
          username: canvas.user.username,
          displayName: canvas.user.displayName
        }
      },
      widgets: widgets.map(w => ({
        id: w.id,
        widgetDefId: w.widgetDefId,
        version: w.version,
        position: { x: w.positionX, y: w.positionY },
        width: w.width,
        height: w.height,
        rotation: w.rotation,
        zIndex: w.zIndex,
        state: w.state,
        metadata: w.metadata,
        visible: w.visible,
        opacity: w.opacity
      }))
    });

  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return res.status(error instanceof NotFoundError ? 404 : 403).json({
        success: false,
        error: error.message
      });
    }
    log.error('[Embed] Canvas load error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to load canvas'
    });
  }
});

/**
 * POST /api/embed/tokens
 * Create an embed token for a canvas (requires authentication)
 */
router.post('/tokens', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      canvasId,
      allowedOrigins = [],
      mode = 'view',
      expiresIn,
      showBranding = true,
      theme = 'dark'
    } = req.body as CreateTokenBody;

    if (!canvasId) {
      return res.status(400).json({
        success: false,
        error: 'Canvas ID is required'
      });
    }

    // Verify user owns the canvas
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId }
    });

    if (!canvas) {
      return res.status(404).json({
        success: false,
        error: 'Canvas not found'
      });
    }

    if (canvas.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this canvas'
      });
    }

    // Generate token and save to database
    const token = generateEmbedToken();
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    const embedToken = await db.embedToken.create({
      data: {
        canvasId,
        token,
        allowedOrigins,
        mode,
        showBranding,
        theme,
        expiresAt,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      token: embedToken.token,
      id: embedToken.id,
      canvasId,
      allowedOrigins,
      mode,
      showBranding,
      theme,
      expiresAt: expiresAt?.toISOString() || null,
      createdAt: embedToken.createdAt.toISOString()
    });

  } catch (error) {
    log.error('[Embed] Token creation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create embed token'
    });
  }
});

/**
 * GET /api/embed/tokens
 * List embed tokens for a canvas (requires authentication)
 */
router.get('/tokens', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { canvasId } = req.query;

    if (!canvasId) {
      return res.status(400).json({
        success: false,
        error: 'Canvas ID is required'
      });
    }

    // Verify user owns the canvas
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId as string }
    });

    if (!canvas) {
      return res.status(404).json({
        success: false,
        error: 'Canvas not found'
      });
    }

    if (canvas.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this canvas'
      });
    }

    // Get all tokens for this canvas
    const tokens = await db.embedToken.findMany({
      where: { canvasId: canvasId as string },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      tokens: tokens.map(t => ({
        id: t.id,
        token: t.token,
        allowedOrigins: t.allowedOrigins,
        mode: t.mode,
        showBranding: t.showBranding,
        theme: t.theme,
        viewCount: t.viewCount,
        isActive: t.isActive,
        expiresAt: t.expiresAt?.toISOString() || null,
        createdAt: t.createdAt.toISOString()
      }))
    });

  } catch (error) {
    log.error('[Embed] Token list error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to list tokens'
    });
  }
});

/**
 * PATCH /api/embed/tokens/:tokenId
 * Update an embed token (requires authentication)
 */
router.patch('/tokens/:tokenId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tokenId } = req.params;
    const { allowedOrigins, mode, showBranding, theme, isActive } = req.body;

    // Get the token and verify ownership
    const embedToken = await db.embedToken.findUnique({
      where: { id: tokenId },
      include: { canvas: true }
    });

    if (!embedToken) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    if (embedToken.canvas.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this token'
      });
    }

    // Update the token
    const updated = await db.embedToken.update({
      where: { id: tokenId },
      data: {
        ...(allowedOrigins !== undefined && { allowedOrigins }),
        ...(mode !== undefined && { mode }),
        ...(showBranding !== undefined && { showBranding }),
        ...(theme !== undefined && { theme }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json({
      success: true,
      token: {
        id: updated.id,
        token: updated.token,
        allowedOrigins: updated.allowedOrigins,
        mode: updated.mode,
        showBranding: updated.showBranding,
        theme: updated.theme,
        isActive: updated.isActive,
        viewCount: updated.viewCount
      }
    });

  } catch (error) {
    log.error('[Embed] Token update error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update token'
    });
  }
});

/**
 * DELETE /api/embed/tokens/:tokenId
 * Revoke/delete an embed token (requires authentication)
 */
router.delete('/tokens/:tokenId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tokenId } = req.params;

    // Get the token and verify ownership
    const embedToken = await db.embedToken.findUnique({
      where: { id: tokenId },
      include: { canvas: true }
    });

    if (!embedToken) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    if (embedToken.canvas.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this token'
      });
    }

    // Delete the token
    await db.embedToken.delete({
      where: { id: tokenId }
    });

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    log.error('[Embed] Token revocation error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke token'
    });
  }
});

/**
 * POST /api/embed/track
 * Track embed view/interaction (analytics)
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { canvasId, token, event, data } = req.body as TrackEventBody;

    if (!canvasId || !event) {
      return res.status(400).json({
        success: false,
        error: 'Canvas ID and event are required'
      });
    }

    // Validate event type
    const validEvents = ['view', 'interact', 'error'];
    if (!validEvents.includes(event)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event type'
      });
    }

    // Record the event
    await db.eventRecord.create({
      data: {
        canvasId,
        eventType: `embed_${event}`,
        payload: {
          token: token || null,
          origin: req.get('origin') || null,
          userAgent: req.get('user-agent') || null,
          ...data
        } as Record<string, unknown>
      }
    });

    // If this is a view event and token provided, increment token view count
    if (event === 'view' && token) {
      await db.embedToken.updateMany({
        where: {
          token,
          canvasId
        },
        data: { viewCount: { increment: 1 } }
      });
    }

    res.json({ success: true });

  } catch (error) {
    log.error('[Embed] Track error:', error as Error);
    // Don't fail on tracking errors - just log
    res.json({ success: true });
  }
});

/**
 * GET /api/embed/stats/:canvasId
 * Get embed statistics for a canvas (requires authentication)
 */
router.get('/stats/:canvasId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { canvasId } = req.params;

    // Verify user owns the canvas
    const canvas = await db.canvas.findUnique({
      where: { id: canvasId }
    });

    if (!canvas) {
      return res.status(404).json({
        success: false,
        error: 'Canvas not found'
      });
    }

    if (canvas.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not own this canvas'
      });
    }

    // Get embed statistics
    const [tokens, totalViews, recentEvents] = await Promise.all([
      // Token stats
      db.embedToken.aggregate({
        where: { canvasId },
        _count: { id: true },
        _sum: { viewCount: true }
      }),
      // Total embed views from events
      db.eventRecord.count({
        where: {
          canvasId,
          eventType: 'embed_view'
        }
      }),
      // Recent embed events (last 7 days)
      db.eventRecord.findMany({
        where: {
          canvasId,
          eventType: { startsWith: 'embed_' },
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      })
    ]);

    // Group events by day
    const eventsByDay = recentEvents.reduce((acc, event) => {
      const day = event.timestamp.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      stats: {
        activeTokens: tokens._count.id,
        totalTokenViews: tokens._sum.viewCount || 0,
        totalEmbedViews: totalViews,
        viewsByDay: eventsByDay,
        recentEventsCount: recentEvents.length
      }
    });

  } catch (error) {
    log.error('[Embed] Stats error:', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get embed stats'
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;
