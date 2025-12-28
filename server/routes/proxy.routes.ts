/**
 * StickerNest v2 - URL Proxy Routes
 * Provides endpoints for proxying URLs and fetching metadata
 * to work around iframe embedding restrictions (X-Frame-Options, CSP)
 */

import { Router, Request, Response } from 'express';
import { authLimiter } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// URL validation helper
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Blocklist of domains that should never be proxied (security)
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  // Add internal network ranges
];

function isBlockedDomain(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();

  // Block localhost and internal addresses
  if (BLOCKED_DOMAINS.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
    return true;
  }

  // Block private IP ranges
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) {
    return true;
  }

  return false;
}

/**
 * @swagger
 * /api/proxy/metadata:
 *   get:
 *     summary: Fetch URL metadata (Open Graph, title, description, favicon)
 *     tags: [Proxy]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL to fetch metadata from
 *     responses:
 *       200:
 *         description: URL metadata
 *       400:
 *         description: Invalid URL
 *       500:
 *         description: Failed to fetch metadata
 */
router.get('/metadata', authLimiter, async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing URL parameter',
    });
  }

  const url = new URL(targetUrl);

  if (isBlockedDomain(url)) {
    return res.status(403).json({
      success: false,
      error: 'This domain cannot be accessed',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'StickerNest/2.0 (URL Preview Bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      });
    }

    const contentType = response.headers.get('content-type') || '';

    // Only parse HTML content
    if (!contentType.includes('text/html')) {
      return res.json({
        success: true,
        metadata: {
          url: targetUrl,
          finalUrl: response.url,
          title: url.hostname,
          description: null,
          image: null,
          favicon: `${url.protocol}//${url.hostname}/favicon.ico`,
          siteName: url.hostname,
          type: contentType,
          canEmbed: false,
          embedError: 'Non-HTML content',
        },
      });
    }

    const html = await response.text();

    // Check if the page can be embedded
    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');

    let canEmbed = true;
    let embedError: string | null = null;

    if (xFrameOptions) {
      const value = xFrameOptions.toUpperCase();
      if (value === 'DENY' || value === 'SAMEORIGIN') {
        canEmbed = false;
        embedError = `X-Frame-Options: ${xFrameOptions}`;
      }
    }

    if (csp && csp.includes('frame-ancestors')) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/i);
      if (match) {
        const ancestors = match[1].trim().toLowerCase();
        if (ancestors === "'none'" || ancestors === "'self'") {
          canEmbed = false;
          embedError = `CSP frame-ancestors: ${ancestors}`;
        }
      }
    }

    // Parse metadata from HTML
    const metadata = parseHtmlMetadata(html, url);

    res.json({
      success: true,
      metadata: {
        ...metadata,
        url: targetUrl,
        finalUrl: response.url,
        canEmbed,
        embedError,
      },
    });
  } catch (error) {
    logger.error({ error, url: targetUrl }, 'Failed to fetch URL metadata');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('abort');

    res.status(500).json({
      success: false,
      error: isTimeout ? 'Request timeout' : 'Failed to fetch URL metadata',
      details: errorMessage,
    });
  }
});

/**
 * @swagger
 * /api/proxy/frame:
 *   get:
 *     summary: Proxy a URL for iframe embedding (strips restrictive headers)
 *     tags: [Proxy]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: URL to proxy
 *     responses:
 *       200:
 *         description: Proxied content
 *       400:
 *         description: Invalid URL
 *       403:
 *         description: Domain blocked
 *       500:
 *         description: Proxy error
 */
router.get('/frame', authLimiter, async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl || !isValidUrl(targetUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing URL parameter',
    });
  }

  const url = new URL(targetUrl);

  if (isBlockedDomain(url)) {
    return res.status(403).json({
      success: false,
      error: 'This domain cannot be accessed',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for content

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Upstream server returned ${response.status}`,
      });
    }

    const contentType = response.headers.get('content-type') || 'text/html';

    // Set response headers - remove X-Frame-Options and restrictive CSP
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Proxied-From', targetUrl);

    // Allow framing from our own origin
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");

    // Stream the response body
    if (contentType.includes('text/html')) {
      let html = await response.text();

      // Inject base tag to fix relative URLs
      const baseTag = `<base href="${url.origin}${url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1)}">`;

      // Insert base tag after <head> if it exists
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
      } else {
        // Prepend if no head tag
        html = baseTag + html;
      }

      res.send(html);
    } else {
      // For non-HTML content, stream directly
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (error) {
    logger.error({ error, url: targetUrl }, 'Failed to proxy URL');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('abort');

    res.status(500).json({
      success: false,
      error: isTimeout ? 'Request timeout' : 'Failed to proxy URL',
    });
  }
});

/**
 * Parse HTML metadata (Open Graph, Twitter Cards, standard meta tags)
 */
function parseHtmlMetadata(html: string, url: URL): Record<string, string | null> {
  const getMetaContent = (nameOrProperty: string): string | null => {
    // Try property attribute (Open Graph)
    let match = html.match(new RegExp(`<meta[^>]*property=["']${nameOrProperty}["'][^>]*content=["']([^"']+)["']`, 'i'));
    if (match) return match[1];

    // Try name attribute
    match = html.match(new RegExp(`<meta[^>]*name=["']${nameOrProperty}["'][^>]*content=["']([^"']+)["']`, 'i'));
    if (match) return match[1];

    // Try content before name/property
    match = html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${nameOrProperty}["']`, 'i'));
    if (match) return match[1];

    return null;
  };

  // Get title
  let title = getMetaContent('og:title') || getMetaContent('twitter:title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : null;
  }

  // Get description
  const description = getMetaContent('og:description') ||
                      getMetaContent('twitter:description') ||
                      getMetaContent('description');

  // Get image
  let image = getMetaContent('og:image') || getMetaContent('twitter:image');
  if (image && !image.startsWith('http')) {
    // Make relative URLs absolute
    image = new URL(image, url.origin).href;
  }

  // Get favicon
  let favicon: string | null = null;
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                       html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (faviconMatch) {
    favicon = faviconMatch[1];
    if (!favicon.startsWith('http')) {
      favicon = new URL(favicon, url.origin).href;
    }
  } else {
    favicon = `${url.protocol}//${url.hostname}/favicon.ico`;
  }

  // Get site name
  const siteName = getMetaContent('og:site_name') || url.hostname;

  // Get type
  const type = getMetaContent('og:type') || 'website';

  // Get theme color
  const themeColor = getMetaContent('theme-color');

  return {
    title: title ? decodeHtmlEntities(title) : url.hostname,
    description: description ? decodeHtmlEntities(description) : null,
    image,
    favicon,
    siteName: decodeHtmlEntities(siteName),
    type,
    themeColor,
  };
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

export default router;
