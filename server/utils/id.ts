import { nanoid, customAlphabet } from 'nanoid';

/**
 * Default ID length
 */
const DEFAULT_ID_LENGTH = 21;

/**
 * Custom alphabet for URL-safe IDs (excludes ambiguous characters)
 */
const URL_SAFE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Lowercase alphanumeric alphabet for widget IDs
 */
const WIDGET_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generate a unique ID using nanoid
 */
export function generateId(length: number = DEFAULT_ID_LENGTH): string {
  return nanoid(length);
}

/**
 * Generate a URL-safe unique ID
 */
export function generateUrlSafeId(length: number = DEFAULT_ID_LENGTH): string {
  const generator = customAlphabet(URL_SAFE_ALPHABET, length);
  return generator();
}

/**
 * ID generators for specific entity types
 * These follow the naming conventions used in the frontend
 */
export const idGenerators = {
  /**
   * User ID - format: usr_{nanoid}
   */
  user: () => `usr_${nanoid(16)}`,

  /**
   * Session ID - format: ses_{nanoid}
   */
  session: () => `ses_${nanoid(16)}`,

  /**
   * Canvas ID - format: cnv_{nanoid}
   */
  canvas: () => `cnv_${nanoid(16)}`,

  /**
   * Widget instance ID - format: wgt_{nanoid}
   * Must be unique within a canvas
   */
  widgetInstance: () => `wgt_${nanoid(16)}`,

  /**
   * Widget definition ID - lowercase alphanumeric
   * Must match manifest validation rules: ^[a-z][a-z0-9-]*$
   */
  widgetDefinition: (name: string) => {
    const generator = customAlphabet(WIDGET_ID_ALPHABET, 8);
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    return `${safeName}-${generator()}`;
  },

  /**
   * Pipeline ID - format: pipe_{nanoid}
   */
  pipeline: () => `pipe_${nanoid(16)}`,

  /**
   * Asset ID - format: ast_{nanoid}
   */
  asset: () => `ast_${nanoid(16)}`,

  /**
   * Event ID - format: evt_{nanoid}
   */
  event: () => `evt_${nanoid(16)}`,

  /**
   * Invite token - long random string for security
   */
  inviteToken: () => nanoid(32),

  /**
   * Widget package ID - format: pkg_{nanoid}
   */
  widgetPackage: () => `pkg_${nanoid(16)}`,

  /**
   * Marketplace item ID - format: mkt_{nanoid}
   */
  marketplaceItem: () => `mkt_${nanoid(16)}`,

  /**
   * Marketplace item version ID - format: mkv_{nanoid}
   */
  marketplaceItemVersion: () => `mkv_${nanoid(16)}`,

  /**
   * Marketplace purchase ID - format: pur_{nanoid}
   */
  marketplacePurchase: () => `pur_${nanoid(16)}`,

  /**
   * Version ID - format: ver_{nanoid}
   */
  version: () => `ver_${nanoid(16)}`,

  /**
   * Comment ID - format: cmt_{nanoid}
   */
  comment: () => `cmt_${nanoid(16)}`,

  /**
   * Rating ID - format: rtg_{nanoid}
   */
  rating: () => `rtg_${nanoid(16)}`,

  /**
   * Group ID - format: grp_{nanoid}
   */
  group: () => `grp_${nanoid(16)}`,

  /**
   * Layer ID - format: lyr_{nanoid}
   */
  layer: () => `lyr_${nanoid(16)}`,

  /**
   * Sticker ID - format: stk_{nanoid}
   */
  sticker: () => `stk_${nanoid(16)}`,

  /**
   * Dock zone ID - format: dock_{nanoid}
   */
  dockZone: () => `dock_${nanoid(16)}`,

  /**
   * OAuth account ID - format: oauth_{nanoid}
   */
  oauthAccount: () => `oauth_${nanoid(16)}`,
};

/**
 * Validate a widget definition ID format
 * Must be lowercase alphanumeric with hyphens, 2-64 chars, starting with letter
 */
export function isValidWidgetDefId(id: string): boolean {
  return /^[a-z][a-z0-9-]{1,63}$/.test(id);
}

/**
 * Validate semantic version format
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version);
}

/**
 * Parse a prefixed ID to extract the type and value
 */
export function parseId(id: string): { type: string; value: string } | null {
  const match = id.match(/^([a-z]+)_(.+)$/);
  if (!match) return null;
  return { type: match[1], value: match[2] };
}

/**
 * Check if an ID has a specific prefix
 */
export function hasIdPrefix(id: string, prefix: string): boolean {
  return id.startsWith(`${prefix}_`);
}
