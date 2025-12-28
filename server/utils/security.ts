/**
 * Security Utilities
 *
 * Critical security functions for preventing common vulnerabilities:
 * - Open Redirect attacks
 * - SSRF (Server-Side Request Forgery)
 * - URL validation
 */

// ============================================================================
// OPEN REDIRECT PROTECTION
// ============================================================================

/**
 * Get allowed redirect domains from environment or defaults
 */
function getAllowedRedirectDomains(): string[] {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const frontendHost = new URL(frontendUrl).hostname;

  // Allow additional domains via environment variable (comma-separated)
  const additionalDomains = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',').map(d => d.trim()) || [];

  return [
    frontendHost,
    'localhost',
    '127.0.0.1',
    ...additionalDomains,
  ];
}

/**
 * Validate a redirect URL to prevent open redirect attacks
 * Returns the validated URL or a safe default
 *
 * @param redirectUrl - The URL to validate
 * @param defaultUrl - Safe fallback URL
 * @returns Safe redirect URL
 */
export function validateRedirectUrl(redirectUrl: string | undefined, defaultUrl: string): string {
  if (!redirectUrl) {
    return defaultUrl;
  }

  try {
    const url = new URL(redirectUrl);
    const allowedDomains = getAllowedRedirectDomains();

    // Check if the hostname is in the allowed list
    const isAllowed = allowedDomains.some(domain => {
      // Exact match or subdomain match
      return url.hostname === domain ||
             url.hostname.endsWith(`.${domain}`);
    });

    if (!isAllowed) {
      console.warn(`[Security] Blocked redirect to unauthorized domain: ${url.hostname}`);
      return defaultUrl;
    }

    // Block javascript: and data: protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.warn(`[Security] Blocked redirect with dangerous protocol: ${url.protocol}`);
      return defaultUrl;
    }

    return redirectUrl;
  } catch {
    // Invalid URL, return default
    console.warn(`[Security] Blocked invalid redirect URL: ${redirectUrl}`);
    return defaultUrl;
  }
}

// ============================================================================
// SSRF PROTECTION
// ============================================================================

/**
 * List of blocked IP ranges for SSRF protection
 * Includes private networks, loopback, link-local, and cloud metadata endpoints
 */
const BLOCKED_IP_PATTERNS = [
  // Loopback
  /^127\./,
  /^0\./,
  /^localhost$/i,

  // Private networks (RFC 1918)
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,

  // Link-local
  /^169\.254\./,
  /^fe80:/i,

  // IPv6 loopback and private
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,

  // Cloud metadata endpoints
  /^169\.254\.169\.254$/,  // AWS, GCP, Azure metadata
  /^metadata\.google\.internal$/i,
  /^metadata\.goog$/i,
];

/**
 * List of blocked protocols for SSRF protection
 */
const BLOCKED_PROTOCOLS = [
  'file:',
  'ftp:',
  'gopher:',
  'data:',
  'javascript:',
  'vbscript:',
  'dict:',
  'ldap:',
  'ldaps:',
  'tftp:',
];

/**
 * Validate a URL to prevent SSRF attacks
 * Blocks internal IPs, dangerous protocols, and cloud metadata endpoints
 *
 * @param urlString - The URL to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateExternalUrl(urlString: string): { isValid: boolean; error?: string } {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (BLOCKED_PROTOCOLS.includes(url.protocol)) {
      return {
        isValid: false,
        error: `Blocked protocol: ${url.protocol}`,
      };
    }

    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        isValid: false,
        error: `Invalid protocol: ${url.protocol}. Only http and https are allowed.`,
      };
    }

    // Check hostname against blocked patterns
    const hostname = url.hostname.toLowerCase();

    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          isValid: false,
          error: `Blocked hostname: ${hostname} (internal/private address)`,
        };
      }
    }

    // Block URLs with IP addresses that look internal
    // This catches numeric IPs that might bypass string patterns
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const parts = hostname.split('.').map(Number);

      // 10.x.x.x
      if (parts[0] === 10) {
        return { isValid: false, error: 'Blocked: private IP range (10.x.x.x)' };
      }

      // 172.16.x.x - 172.31.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
        return { isValid: false, error: 'Blocked: private IP range (172.16-31.x.x)' };
      }

      // 192.168.x.x
      if (parts[0] === 192 && parts[1] === 168) {
        return { isValid: false, error: 'Blocked: private IP range (192.168.x.x)' };
      }

      // 127.x.x.x
      if (parts[0] === 127) {
        return { isValid: false, error: 'Blocked: loopback address' };
      }

      // 0.x.x.x
      if (parts[0] === 0) {
        return { isValid: false, error: 'Blocked: invalid IP (0.x.x.x)' };
      }

      // 169.254.x.x (link-local, including AWS metadata)
      if (parts[0] === 169 && parts[1] === 254) {
        return { isValid: false, error: 'Blocked: link-local/metadata address' };
      }
    }

    // Block common internal hostnames
    const blockedHostnames = [
      'internal',
      'intranet',
      'corp',
      'private',
      'local',
    ];

    for (const blocked of blockedHostnames) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return {
          isValid: false,
          error: `Blocked hostname pattern: ${hostname}`,
        };
      }
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Validate an array of URLs for SSRF protection
 * Returns first error found or success
 */
export function validateExternalUrls(urls: string[]): { isValid: boolean; error?: string } {
  for (const url of urls) {
    const result = validateExternalUrl(url);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}
