/**
 * StickerNest v2 - Widget Bundler
 *
 * Bundles widget code and assets into a distributable package.
 * Handles minification, optimization, and hash generation.
 */

import type { WidgetManifest } from '../types/manifest';
import type { WidgetBundle, BundleFile, BundleFileType } from '../types/widget';

// ============================================================================
// TYPES
// ============================================================================

export interface BundlerOptions {
  /** Minify JavaScript */
  minify?: boolean;
  /** Include source maps */
  sourceMaps?: boolean;
  /** Optimize for size */
  optimizeSize?: boolean;
  /** Generate integrity hashes */
  generateHashes?: boolean;
}

export interface BundleSource {
  manifest: WidgetManifest;
  entryCode: string;
  assets?: Map<string, string | Uint8Array>;
}

export interface BundleResult {
  bundle: WidgetBundle;
  success: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a simple hash for content integrity
 */
async function generateHash(content: string | Uint8Array): Promise<string> {
  const data = typeof content === 'string'
    ? new TextEncoder().encode(content)
    : content;

  // Use SubtleCrypto if available (browser)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: simple hash
  let hash = 0;
  const str = typeof content === 'string' ? content : new TextDecoder().decode(data);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Get file type from path
 */
function getFileType(path: string): BundleFileType {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
      return 'js';
    case 'ts':
      return 'ts';
    case 'tsx':
      return 'tsx';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'svg':
      return 'svg';
    case 'png':
      return 'png';
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'gif':
      return 'gif';
    default:
      return 'asset';
  }
}

/**
 * Minify JavaScript (simple version)
 */
function minifyJS(code: string): string {
  // Basic minification - removes comments and excess whitespace
  // In production, use a proper minifier like Terser
  return code
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove excess whitespace
    .replace(/\s+/g, ' ')
    // Remove spaces around operators (basic)
    .replace(/\s*([{}();,:])\s*/g, '$1')
    // Trim
    .trim();
}

/**
 * Minify CSS (simple version)
 */
function minifyCSS(css: string): string {
  return css
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove excess whitespace
    .replace(/\s+/g, ' ')
    // Remove spaces around special chars
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    // Trim
    .trim();
}

/**
 * Minify HTML (simple version)
 */
function minifyHTML(html: string): string {
  return html
    // Remove HTML comments (but not IE conditionals)
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // Collapse whitespace
    .replace(/>\s+</g, '><')
    // Trim
    .trim();
}

// ============================================================================
// BUNDLER
// ============================================================================

export class WidgetBundler {
  private options: BundlerOptions;

  constructor(options: BundlerOptions = {}) {
    this.options = {
      minify: true,
      sourceMaps: false,
      optimizeSize: true,
      generateHashes: true,
      ...options,
    };
  }

  /**
   * Bundle a widget from source
   */
  async bundle(source: BundleSource): Promise<BundleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const files: BundleFile[] = [];
    let totalSize = 0;

    try {
      // Process manifest
      const manifestJson = JSON.stringify(source.manifest, null, this.options.optimizeSize ? 0 : 2);
      const manifestHash = this.options.generateHashes ? await generateHash(manifestJson) : undefined;
      const manifestSize = new Blob([manifestJson]).size;

      files.push({
        path: 'manifest.json',
        content: manifestJson,
        type: 'json',
        size: manifestSize,
        hash: manifestHash,
      });
      totalSize += manifestSize;

      // Process entry code
      let processedCode = source.entryCode;

      // Determine if entry is HTML or JS
      const isHTML = source.manifest.entry.endsWith('.html');

      if (isHTML) {
        // For HTML entries, minify embedded JS and CSS
        if (this.options.minify) {
          // Minify inline scripts
          processedCode = processedCode.replace(
            /<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi,
            (match) => {
              const scriptContent = match.replace(/<script[^>]*>([\s\S]*?)<\/script>/i, '$1');
              const minified = minifyJS(scriptContent);
              return match.replace(scriptContent, minified);
            }
          );

          // Minify inline styles
          processedCode = processedCode.replace(
            /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi,
            (match) => {
              const styleContent = match.replace(/<style[^>]*>([\s\S]*?)<\/style>/i, '$1');
              const minified = minifyCSS(styleContent);
              return match.replace(styleContent, minified);
            }
          );

          // Minify HTML structure
          processedCode = minifyHTML(processedCode);
        }
      } else {
        // For JS entries, minify
        if (this.options.minify) {
          processedCode = minifyJS(processedCode);
        }
      }

      const codeHash = this.options.generateHashes ? await generateHash(processedCode) : undefined;
      const codeSize = new Blob([processedCode]).size;

      files.push({
        path: source.manifest.entry,
        content: processedCode,
        type: isHTML ? 'html' : 'js',
        size: codeSize,
        hash: codeHash,
      });
      totalSize += codeSize;

      // Process assets
      if (source.assets) {
        for (const [path, content] of source.assets) {
          const isText = typeof content === 'string';
          let processedContent = content;

          if (isText && this.options.minify) {
            const ext = path.split('.').pop()?.toLowerCase();
            if (ext === 'js' || ext === 'mjs') {
              processedContent = minifyJS(content as string);
            } else if (ext === 'css') {
              processedContent = minifyCSS(content as string);
            } else if (ext === 'html') {
              processedContent = minifyHTML(content as string);
            }
          }

          const assetSize = typeof processedContent === 'string'
            ? new Blob([processedContent]).size
            : processedContent.length;
          const assetHash = this.options.generateHashes ? await generateHash(processedContent) : undefined;

          files.push({
            path,
            content: processedContent,
            type: getFileType(path),
            size: assetSize,
            hash: assetHash,
          });
          totalSize += assetSize;
        }
      }

      // Generate bundle hash
      const bundleHashContent = files.map(f => f.hash || f.path).join('');
      const bundleHash = await generateHash(bundleHashContent);

      const bundle: WidgetBundle = {
        manifest: source.manifest,
        files,
        totalSize,
        hash: bundleHash,
        createdAt: Date.now(),
      };

      return {
        bundle,
        success: true,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Bundling failed: ${(error as Error).message}`);
      return {
        bundle: null as unknown as WidgetBundle,
        success: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Bundle a widget from inline HTML (for AI-generated widgets)
   */
  async bundleInlineHTML(manifest: WidgetManifest, html: string): Promise<BundleResult> {
    return this.bundle({
      manifest: {
        ...manifest,
        entry: 'index.html',
      },
      entryCode: html,
    });
  }

  /**
   * Get bundle size estimate without full bundling
   */
  estimateSize(source: BundleSource): number {
    let size = JSON.stringify(source.manifest).length;
    size += source.entryCode.length;

    if (source.assets) {
      for (const [, content] of source.assets) {
        size += typeof content === 'string' ? content.length : content.length;
      }
    }

    // Estimate compression (typically 30-50% reduction)
    if (this.options.minify) {
      size = Math.floor(size * 0.6);
    }

    return size;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bundleWidget = async (
  source: BundleSource,
  options?: BundlerOptions
): Promise<BundleResult> => {
  const bundler = new WidgetBundler(options);
  return bundler.bundle(source);
};

export const bundleInlineWidget = async (
  manifest: WidgetManifest,
  html: string,
  options?: BundlerOptions
): Promise<BundleResult> => {
  const bundler = new WidgetBundler(options);
  return bundler.bundleInlineHTML(manifest, html);
};
