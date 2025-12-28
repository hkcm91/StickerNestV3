/**
 * Widget Generator 2.0 - Workspace Compiler (Module C)
 *
 * Enables 1–5 widget batch generation:
 * - Creates batch SpecJSON lists
 * - Validates no conflicting names
 * - Ensures unique IDs
 * - Ensures asset folders don't collide
 * - Builds unified WorkspaceManifest.json
 *
 * VERSION: 2.0.0
 */

import type {
  SpecJSON,
  WorkspaceManifest,
  WorkspaceWidgetEntry,
  WorkspaceExportConfig,
  GeneratedWidgetPackage,
  SpecValidationResult
} from '../types/specjson';
import { generateWidgetPackage, TEMPLATE_ENGINE_VERSION } from './widgetTemplateEngine';
import { validateSpecJSON, validateWorkspaceManifest } from '../utils/specJsonValidator';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MAX_WIDGETS_PER_WORKSPACE = 5;
export const WORKSPACE_VERSION = '2.0.0';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkspaceCompilationResult {
  success: boolean;
  workspace: WorkspaceManifest;
  packages: Map<string, GeneratedWidgetPackage>;
  errors: WorkspaceCompilationError[];
  warnings: string[];
}

export interface WorkspaceCompilationError {
  widgetId: string;
  message: string;
  code: string;
}

export interface BatchCompilationOptions {
  parallel?: boolean;
  stopOnError?: boolean;
  minify?: boolean;
  includeTests?: boolean;
}

// ============================================================================
// WORKSPACE FACTORY
// ============================================================================

/**
 * Create a new empty workspace
 */
export function createWorkspace(name: string): WorkspaceManifest {
  const id = generateWorkspaceId(name);

  return {
    id,
    name,
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    widgets: [],
    sharedDependencies: {},
    sharedAssets: [],
    exportConfig: {
      format: 'bundle',
      includeSpecs: true,
      includeTests: true,
      minify: false
    }
  };
}

/**
 * Generate a workspace ID from name
 */
function generateWorkspaceId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `ws-${base}-${Date.now().toString(36)}`;
}

// ============================================================================
// WIDGET MANAGEMENT
// ============================================================================

/**
 * Add a widget spec to the workspace
 */
export function addWidgetToWorkspace(
  workspace: WorkspaceManifest,
  spec: SpecJSON
): { success: boolean; error?: string } {
  // Check max widgets
  if (workspace.widgets.length >= MAX_WIDGETS_PER_WORKSPACE) {
    return {
      success: false,
      error: `Maximum ${MAX_WIDGETS_PER_WORKSPACE} widgets per workspace`
    };
  }

  // Check for duplicate ID
  if (workspace.widgets.some(w => w.spec.id === spec.id)) {
    return {
      success: false,
      error: `Widget with ID '${spec.id}' already exists in workspace`
    };
  }

  // Validate the spec
  const validation = validateSpecJSON(spec);
  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid spec: ${validation.errors[0].message}`
    };
  }

  // Generate folder name
  const folderName = generateFolderName(workspace, spec.id);

  // Add to workspace
  workspace.widgets.push({
    spec,
    folderName,
    status: 'pending',
    lastBuildAt: undefined
  });

  workspace.updatedAt = Date.now();

  return { success: true };
}

/**
 * Remove a widget from the workspace
 */
export function removeWidgetFromWorkspace(
  workspace: WorkspaceManifest,
  widgetId: string
): boolean {
  const index = workspace.widgets.findIndex(w => w.spec.id === widgetId);
  if (index === -1) return false;

  workspace.widgets.splice(index, 1);
  workspace.updatedAt = Date.now();
  return true;
}

/**
 * Update a widget spec in the workspace
 */
export function updateWidgetInWorkspace(
  workspace: WorkspaceManifest,
  widgetId: string,
  spec: SpecJSON
): { success: boolean; error?: string } {
  const index = workspace.widgets.findIndex(w => w.spec.id === widgetId);
  if (index === -1) {
    return { success: false, error: `Widget '${widgetId}' not found` };
  }

  // Validate new spec
  const validation = validateSpecJSON(spec);
  if (!validation.valid) {
    return { success: false, error: validation.errors[0].message };
  }

  // Check for ID collision if ID changed
  if (spec.id !== widgetId) {
    if (workspace.widgets.some(w => w.spec.id === spec.id && w.spec.id !== widgetId)) {
      return { success: false, error: `Widget ID '${spec.id}' already exists` };
    }
    // Update folder name if ID changed
    workspace.widgets[index].folderName = generateFolderName(workspace, spec.id);
  }

  workspace.widgets[index].spec = spec;
  workspace.widgets[index].status = 'pending';
  workspace.updatedAt = Date.now();

  return { success: true };
}

/**
 * Generate a unique folder name for the widget
 */
function generateFolderName(workspace: WorkspaceManifest, widgetId: string): string {
  const existingFolders = new Set(workspace.widgets.map(w => w.folderName));
  let folderName = widgetId;
  let counter = 1;

  while (existingFolders.has(folderName)) {
    folderName = `${widgetId}-${counter}`;
    counter++;
  }

  return folderName;
}

// ============================================================================
// BATCH COMPILATION
// ============================================================================

/**
 * Compile all widgets in the workspace
 */
export async function compileWorkspace(
  workspace: WorkspaceManifest,
  options: BatchCompilationOptions = {}
): Promise<WorkspaceCompilationResult> {
  const {
    parallel = true,
    stopOnError = false,
    minify = false,
    includeTests = true
  } = options;

  const errors: WorkspaceCompilationError[] = [];
  const warnings: string[] = [];
  const packages = new Map<string, GeneratedWidgetPackage>();

  // Validate workspace first
  const workspaceValidation = validateWorkspaceManifest(workspace);
  if (!workspaceValidation.valid) {
    for (const error of workspaceValidation.errors) {
      errors.push({
        widgetId: 'workspace',
        message: error.message,
        code: error.code
      });
    }
    if (stopOnError) {
      return { success: false, workspace, packages, errors, warnings };
    }
  }

  for (const warning of workspaceValidation.warnings) {
    warnings.push(`[workspace] ${warning.message}`);
  }

  // Pre-compilation validation
  const preValidation = preCompileValidation(workspace);
  errors.push(...preValidation.errors);
  warnings.push(...preValidation.warnings);

  if (errors.length > 0 && stopOnError) {
    return { success: false, workspace, packages, errors, warnings };
  }

  // Compile widgets
  if (parallel) {
    // Parallel compilation
    const compilationPromises = workspace.widgets.map(async (entry) => {
      return compileWidget(entry, minify, includeTests);
    });

    const results = await Promise.all(compilationPromises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const entry = workspace.widgets[i];

      if (result.error) {
        errors.push({
          widgetId: entry.spec.id,
          message: result.error,
          code: 'COMPILATION_ERROR'
        });
        entry.status = 'error';
        entry.error = result.error;
      } else if (result.package) {
        packages.set(entry.spec.id, result.package);
        entry.status = 'ready';
        entry.lastBuildAt = Date.now();
      }
    }
  } else {
    // Sequential compilation
    for (const entry of workspace.widgets) {
      const result = await compileWidget(entry, minify, includeTests);

      if (result.error) {
        errors.push({
          widgetId: entry.spec.id,
          message: result.error,
          code: 'COMPILATION_ERROR'
        });
        entry.status = 'error';
        entry.error = result.error;

        if (stopOnError) break;
      } else if (result.package) {
        packages.set(entry.spec.id, result.package);
        entry.status = 'ready';
        entry.lastBuildAt = Date.now();
      }
    }
  }

  workspace.updatedAt = Date.now();

  return {
    success: errors.length === 0,
    workspace,
    packages,
    errors,
    warnings
  };
}

/**
 * Compile a single widget entry
 */
async function compileWidget(
  entry: WorkspaceWidgetEntry,
  minify: boolean,
  includeTests: boolean
): Promise<{ package?: GeneratedWidgetPackage; error?: string }> {
  entry.status = 'building';

  try {
    const pkg = generateWidgetPackage(entry.spec, {
      minify,
      includeTests,
      includeComments: !minify,
      targetFormat: 'html'
    });

    return { package: pkg };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown compilation error'
    };
  }
}

/**
 * Pre-compilation validation
 */
function preCompileValidation(workspace: WorkspaceManifest): {
  errors: WorkspaceCompilationError[];
  warnings: string[];
} {
  const errors: WorkspaceCompilationError[] = [];
  const warnings: string[] = [];

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const entry of workspace.widgets) {
    if (ids.has(entry.spec.id)) {
      errors.push({
        widgetId: entry.spec.id,
        message: `Duplicate widget ID: ${entry.spec.id}`,
        code: 'DUPLICATE_ID'
      });
    }
    ids.add(entry.spec.id);
  }

  // Check for duplicate folder names
  const folders = new Set<string>();
  for (const entry of workspace.widgets) {
    if (folders.has(entry.folderName)) {
      errors.push({
        widgetId: entry.spec.id,
        message: `Duplicate folder name: ${entry.folderName}`,
        code: 'DUPLICATE_FOLDER'
      });
    }
    folders.add(entry.folderName);
  }

  // Check for conflicting display names (warning only)
  const names = new Map<string, string[]>();
  for (const entry of workspace.widgets) {
    const name = entry.spec.displayName.toLowerCase();
    if (!names.has(name)) {
      names.set(name, []);
    }
    names.get(name)!.push(entry.spec.id);
  }
  for (const [name, widgetIds] of names) {
    if (widgetIds.length > 1) {
      warnings.push(
        `Multiple widgets have similar display name "${name}": ${widgetIds.join(', ')}`
      );
    }
  }

  // Check for asset conflicts
  const assets = new Map<string, string>();
  for (const entry of workspace.widgets) {
    if (entry.spec.visual.defaultAsset) {
      const asset = entry.spec.visual.defaultAsset;
      if (assets.has(asset) && assets.get(asset) !== entry.spec.id) {
        warnings.push(
          `Asset "${asset}" is used by multiple widgets: ${assets.get(asset)}, ${entry.spec.id}`
        );
      }
      assets.set(asset, entry.spec.id);
    }
  }

  return { errors, warnings };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export workspace as a bundle
 */
export function exportWorkspaceBundle(
  workspace: WorkspaceManifest,
  packages: Map<string, GeneratedWidgetPackage>
): WorkspaceBundle {
  const bundle: WorkspaceBundle = {
    manifest: workspace,
    widgets: {},
    exportedAt: Date.now(),
    version: WORKSPACE_VERSION
  };

  for (const [id, pkg] of packages) {
    bundle.widgets[id] = {
      spec: pkg.spec,
      files: pkg.files.map(f => ({
        path: f.path,
        content: f.content,
        type: f.type
      }))
    };
  }

  return bundle;
}

export interface WorkspaceBundle {
  manifest: WorkspaceManifest;
  widgets: Record<string, {
    spec: SpecJSON;
    files: Array<{ path: string; content: string; type: string }>;
  }>;
  exportedAt: number;
  version: string;
}

/**
 * Generate workspace manifest JSON
 */
export function generateWorkspaceManifestJson(workspace: WorkspaceManifest): string {
  return JSON.stringify({
    id: workspace.id,
    name: workspace.name,
    version: workspace.version,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    widgetCount: workspace.widgets.length,
    widgets: workspace.widgets.map(w => ({
      id: w.spec.id,
      displayName: w.spec.displayName,
      version: w.spec.version,
      folderName: w.folderName,
      status: w.status
    })),
    exportConfig: workspace.exportConfig,
    generatorVersion: TEMPLATE_ENGINE_VERSION
  }, null, 2);
}

// ============================================================================
// BATCH SPEC CREATION
// ============================================================================

/**
 * Create multiple SpecJSON from templates
 */
export function createBatchSpecs(
  templates: Array<{
    name: string;
    category: SpecJSON['category'];
    description: string;
    baseTemplate?: Partial<SpecJSON>;
  }>
): SpecJSON[] {
  return templates.map((template, index) => {
    const id = template.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const baseSpec: SpecJSON = {
      id,
      version: '1.0.0',
      displayName: template.name,
      category: template.category,
      description: template.description,
      visual: {
        type: 'html',
        skins: []
      },
      state: {},
      events: {
        triggers: {} as Record<string, string[]>
      },
      actions: {},
      api: {
        exposes: [],
        accepts: [],
        inputs: [],
        outputs: []
      },
      dependencies: {},
      permissions: {
        allowPipelineUse: true,
        allowForking: true,
        allowMarketplace: false
      },
      ...template.baseTemplate
    };

    return baseSpec;
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if workspace can accept more widgets
 */
export function canAddWidget(workspace: WorkspaceManifest): boolean {
  return workspace.widgets.length < MAX_WIDGETS_PER_WORKSPACE;
}

/**
 * Get workspace status summary
 */
export function getWorkspaceStatus(workspace: WorkspaceManifest): {
  total: number;
  pending: number;
  building: number;
  ready: number;
  error: number;
} {
  const counts = {
    total: workspace.widgets.length,
    pending: 0,
    building: 0,
    ready: 0,
    error: 0
  };

  for (const widget of workspace.widgets) {
    switch (widget.status) {
      case 'pending': counts.pending++; break;
      case 'building': counts.building++; break;
      case 'ready': counts.ready++; break;
      case 'error': counts.error++; break;
    }
  }

  return counts;
}

/**
 * Clone a workspace (for versioning)
 */
export function cloneWorkspace(
  workspace: WorkspaceManifest,
  newName?: string
): WorkspaceManifest {
  const clone = JSON.parse(JSON.stringify(workspace)) as WorkspaceManifest;
  clone.id = generateWorkspaceId(newName || workspace.name);
  clone.name = newName || `${workspace.name} (copy)`;
  clone.createdAt = Date.now();
  clone.updatedAt = Date.now();

  // Reset build status
  for (const widget of clone.widgets) {
    widget.status = 'pending';
    widget.lastBuildAt = undefined;
    widget.error = undefined;
  }

  return clone;
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  createWorkspace,
  addWidgetToWorkspace,
  removeWidgetFromWorkspace,
  updateWidgetInWorkspace,
  compileWorkspace,
  exportWorkspaceBundle,
  generateWorkspaceManifestJson,
  createBatchSpecs,
  canAddWidget,
  getWorkspaceStatus,
  cloneWorkspace
};
