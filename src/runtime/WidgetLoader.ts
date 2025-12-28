/**
 * StickerNest v2 - WidgetLoader
 * Loads widget bundles from Supabase storage
 * Distinguishes between official widgets and user-uploaded bundles
 * Creates sandbox hosts for widget instances
 */

import type { WidgetDefinition, WidgetInstance } from '../types/domain';
import type { WidgetManifest, WidgetBundle, WidgetBundleFile, WidgetMetadata } from '../types/manifest';
import { fetchWidgetManifest, getPublicUrl, BUCKETS } from '../services/supabaseClient';
import { WidgetSandboxHost, SandboxConfig } from './WidgetSandboxHost';
import { EventBus } from './EventBus';
import { isBuiltinWidget, getBuiltinWidget } from '../widgets/builtin';

export interface LoadedWidget {
  manifest: WidgetManifest;
  metadata: WidgetMetadata;
  assetBaseUrl: string;
}

export class WidgetLoader {
  private baseStorageUrl: string;

  constructor(baseStorageUrl: string) {
    this.baseStorageUrl = baseStorageUrl;
  }

  /**
   * Load a widget definition by ID
   * Tries official widgets first, then falls back to user widgets
   */
  async loadDefinition(widgetDefId: string, userId?: string): Promise<WidgetDefinition> {
    // Try loading as official widget first
    try {
      const manifest = await this.loadOfficialManifest(widgetDefId);
      if (manifest) {
        return this.manifestToDefinition(manifest);
      }
    } catch (e) {
      // Not an official widget, continue
    }

    // Try loading as user widget
    if (userId) {
      try {
        const manifest = await this.loadUserManifest(widgetDefId, userId);
        if (manifest) {
          return this.manifestToDefinition(manifest);
        }
      } catch (e) {
        // Not a user widget
      }
    }

    throw new Error(`Widget definition not found: ${widgetDefId}`);
  }

  /**
   * Load a widget instance with its manifest and asset URLs
   */
  async loadInstance(instance: WidgetInstance, userId: string): Promise<LoadedWidget> {
    // Check if this is a built-in widget
    if (isBuiltinWidget(instance.widgetDefId)) {
      const builtin = getBuiltinWidget(instance.widgetDefId);
      if (builtin) {
        return {
          manifest: builtin.manifest,
          metadata: {
            widgetId: instance.widgetDefId,
            userId: 'builtin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOfficial: true,
            isAIGenerated: false,
            // Include the inline HTML for builtin widgets
            generatedHtml: builtin.html
          },
          assetBaseUrl: '' // Built-in widgets don't have external assets
        };
      }
    }
    // Check if this is an AI-generated widget with inline content
    if (instance.metadata?.source === 'generated' && instance.metadata?.generatedContent) {
      const { manifest, html } = instance.metadata.generatedContent;
      console.log('[WidgetLoader] Loading AI-generated widget:', manifest.id);

      // Ensure required manifest fields have defaults for AI-generated widgets
      const normalizedManifest = {
        ...manifest,
        kind: manifest.kind || '2d',
        capabilities: {
          draggable: manifest.capabilities?.draggable ?? true,
          resizable: manifest.capabilities?.resizable ?? true,
          ...manifest.capabilities
        }
      };

      return {
        manifest: normalizedManifest,
        metadata: {
          widgetId: normalizedManifest.id,
          userId: 'ai-generated',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isOfficial: false,
          isAIGenerated: true,
          generatedHtml: html // Store the HTML for sandbox creation
        },
        assetBaseUrl: '' // No external assets for generated widgets
      };
    }

    // Check if this is a local widget (dev mode)
    if (instance.metadata?.source === 'local') {
      const manifest = await this.loadLocalManifest(instance.widgetDefId);
      if (manifest) {
        return {
          manifest,
          metadata: {
            widgetId: instance.widgetDefId,
            userId: 'local',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOfficial: false,
            isAIGenerated: false
          },
          assetBaseUrl: `/test-widgets/${instance.widgetDefId}`
        };
      }
    }

    // Try official widget first
    try {
      const manifest = await this.loadOfficialManifest(instance.widgetDefId, instance.version);
      if (manifest) {
        return {
          manifest,
          metadata: {
            widgetId: instance.widgetDefId,
            userId: 'official',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isOfficial: true,
            isAIGenerated: false
          },
          assetBaseUrl: this.resolveOfficialAssetUrl(instance.widgetDefId, manifest.version)
        };
      }
    } catch {
      // Not an official widget
    }

    // Load as user widget
    const manifest = await this.loadUserManifest(instance.widgetDefId, userId, instance.version);
    if (!manifest) {
      throw new Error(`Widget instance definition not found: ${instance.widgetDefId}`);
    }

    // Metadata loading is optional/placeholder for now as we don't have a DB yet
    const metadata: WidgetMetadata = {
      widgetId: instance.widgetDefId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isOfficial: false,
      isAIGenerated: false
    };

    return {
      manifest,
      metadata,
      assetBaseUrl: this.resolveUserAssetUrl(instance.widgetDefId, userId, manifest.version)
    };
  }

  /**
   * Load manifest for a local test widget (dev mode)
   */
  async loadLocalManifest(widgetId: string): Promise<WidgetManifest | null> {
    try {
      const response = await fetch(`/test-widgets/${widgetId}/manifest.json`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn(`Failed to load local manifest for ${widgetId}:`, error);
      return null;
    }
  }

  /**
   * Create a sandbox host for a widget instance
   * This is the main entry point for mounting widgets
   */
  async createSandbox(
    instance: WidgetInstance,
    userId: string,
    eventBus: EventBus,
    debugEnabled: boolean = false
  ): Promise<WidgetSandboxHost> {
    // Load the widget manifest and metadata
    const loadedWidget = await this.loadInstance(instance, userId);

    // Create sandbox config
    const config: SandboxConfig = {
      widgetInstance: instance,
      manifest: loadedWidget.manifest,
      assetBaseUrl: loadedWidget.assetBaseUrl,
      debugEnabled,
      // Pass generated HTML for AI widgets and builtin widgets
      generatedHtml: (loadedWidget.metadata as any).generatedHtml || undefined
    };

    // Create and return sandbox host
    return WidgetSandboxHost.fromConfig(config, eventBus);
  }

  /**
   * Create a sandbox host for local preview (using blob URLs)
   * Used by WidgetPreview for testing before upload
   */
  createLocalSandbox(
    manifest: WidgetManifest,
    files: File[],
    eventBus: EventBus,
    debugEnabled: boolean = true
  ): WidgetSandboxHost {
    // Create blob URLs for all files
    const localAssets = new Map<string, string>();
    files.forEach(file => {
      // Handle both flat files and folder uploads
      let filename = file.name;
      if ((file as any).webkitRelativePath) {
        const parts = (file as any).webkitRelativePath.split('/');
        if (parts.length > 1) {
          filename = parts.slice(1).join('/');
        }
      }
      localAssets.set(filename, URL.createObjectURL(file));
    });

    // Create a temporary instance for preview
    const previewInstance: WidgetInstance = {
      id: `preview-${Date.now()}`,
      canvasId: 'preview',
      widgetDefId: manifest.id,
      position: { x: 0, y: 0 },
      sizePreset: 'md',
      width: 400,
      height: 300,
      rotation: 0,
      zIndex: 1,
      state: {}
    };

    // For local preview, use blob: as base URL (assets are resolved via localAssets map)
    const config: SandboxConfig = {
      widgetInstance: previewInstance,
      manifest,
      assetBaseUrl: 'blob:',
      debugEnabled,
      localAssets
    };

    return WidgetSandboxHost.fromConfig(config, eventBus);
  }

  /**
   * Load manifest for an official widget
   */
  async loadOfficialManifest(widgetId: string, version: string = 'latest'): Promise<WidgetManifest | null> {
    const path = `${widgetId}/${version}/manifest.json`;
    return fetchWidgetManifest(BUCKETS.OFFICIAL_WIDGETS, path);
  }

  /**
   * Load manifest for a user-uploaded widget
   */
  async loadUserManifest(widgetId: string, userId: string, version: string = 'latest'): Promise<WidgetManifest | null> {
    const path = `${userId}/${widgetId}/${version}/manifest.json`;
    return fetchWidgetManifest(BUCKETS.WIDGETS, path);
  }

  /**
   * Load the complete widget bundle (manifest + all files)
   * Note: This is expensive and usually only needed for editing/exporting
   */
  async loadWidgetBundle(widgetId: string, userId: string, version: string = 'latest'): Promise<WidgetBundle> {
    const manifest = await this.loadUserManifest(widgetId, userId, version);
    if (!manifest) throw new Error('Manifest not found');

    const files: WidgetBundleFile[] = [];

    // Helper to fetch file content
    const fetchFile = async (filePath: string) => {
      const url = this.resolveUserAssetUrl(widgetId, userId, version, filePath);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${filePath}`);
      return res.text();
    };

    // Load entry file
    const entryContent = await fetchFile(manifest.entry);
    files.push({
      path: manifest.entry,
      content: entryContent,
      type: this.getFileType(manifest.entry)
    });

    // Load asset files if defined
    if (manifest.assets) {
      for (const assetPath of manifest.assets) {
        try {
          const assetContent = await fetchFile(assetPath);
          files.push({
            path: assetPath,
            content: assetContent,
            type: this.getFileType(assetPath)
          });
        } catch (error) {
          console.warn(`Failed to load asset: ${assetPath}`, error);
        }
      }
    }

    return { manifest, files };
  }

  /**
   * Resolve asset URL for an official widget
   */
  resolveOfficialAssetUrl(widgetId: string, version: string, assetPath?: string): string {
    const basePath = `${widgetId}/${version}`;
    const path = assetPath ? `${basePath}/${assetPath}` : basePath;
    return getPublicUrl(BUCKETS.OFFICIAL_WIDGETS, path);
  }

  /**
   * Resolve asset URL for a user widget
   */
  resolveUserAssetUrl(widgetId: string, userId: string, version: string, assetPath?: string): string {
    const basePath = `${userId}/${widgetId}/${version}`;
    const path = assetPath ? `${basePath}/${assetPath}` : basePath;
    return getPublicUrl(BUCKETS.WIDGETS, path);
  }

  /**
   * Check if a widget is official
   */
  async isOfficialWidget(widgetId: string): Promise<boolean> {
    const manifest = await this.loadOfficialManifest(widgetId);
    return !!manifest;
  }

  /**
   * Validate a manifest object
   * Throws if invalid
   */
  validateManifest(manifest: any): asserts manifest is WidgetManifest {
    const errors: string[] = [];

    // Required fields
    if (!manifest.id || typeof manifest.id !== 'string') {
      errors.push('Missing or invalid "id" (must be a string)');
    }
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Missing or invalid "name" (must be a string)');
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Missing or invalid "version" (must be a string)');
    }
    if (!manifest.entry || typeof manifest.entry !== 'string') {
      errors.push('Missing or invalid "entry" (must be a string)');
    }

    // Kind validation
    const validKinds = ['2d', '3d', 'audio', 'video', 'hybrid'];
    if (!manifest.kind || !validKinds.includes(manifest.kind)) {
      errors.push(`Missing or invalid "kind" (must be one of: ${validKinds.join(', ')})`);
    }

    // Capabilities validation
    if (!manifest.capabilities || typeof manifest.capabilities !== 'object') {
      errors.push('Missing or invalid "capabilities" object');
    } else {
      if (typeof manifest.capabilities.draggable !== 'boolean') {
        errors.push('capabilities.draggable must be a boolean');
      }
      if (typeof manifest.capabilities.resizable !== 'boolean') {
        errors.push('capabilities.resizable must be a boolean');
      }
    }

    // Assets validation (optional but must be array if present)
    if (manifest.assets !== undefined && !Array.isArray(manifest.assets)) {
      errors.push('"assets" must be an array if provided');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid manifest:\n- ${errors.join('\n- ')}`);
    }
  }

  // Private helper methods

  private manifestToDefinition(manifest: WidgetManifest): WidgetDefinition {
    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      kind: manifest.kind,
      entry: manifest.entry,
      inputs: manifest.inputs || {},
      outputs: manifest.outputs || {},
      capabilities: manifest.capabilities,
      assets: manifest.assets,
      sandbox: manifest.sandbox
    };
  }

  private getFileType(filePath: string): WidgetBundleFile['type'] {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'js':
        return 'js';
      case 'tsx':
      case 'ts':
        return 'tsx';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      default:
        return 'asset';
    }
  }
}
