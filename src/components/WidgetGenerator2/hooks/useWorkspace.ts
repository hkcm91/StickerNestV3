/**
 * Widget Generator 2.0 - useWorkspace Hook
 *
 * Manages workspace state for batch widget generation.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  SpecJSON,
  WorkspaceManifest,
  GeneratedWidgetPackage
} from '../../../types/specjson';
import {
  createWorkspace,
  addWidgetToWorkspace,
  removeWidgetFromWorkspace,
  updateWidgetInWorkspace,
  compileWorkspace,
  getWorkspaceStatus,
  canAddWidget,
  MAX_WIDGETS_PER_WORKSPACE
} from '../../../services/workspaceCompiler';

export interface UseWorkspaceReturn {
  // State
  workspace: WorkspaceManifest | null;
  packages: Map<string, GeneratedWidgetPackage>;
  isCompiling: boolean;
  compilationErrors: string[];

  // Actions
  createNew: (name: string) => void;
  addWidget: (spec: SpecJSON) => { success: boolean; error?: string };
  removeWidget: (widgetId: string) => boolean;
  updateWidget: (widgetId: string, spec: SpecJSON) => { success: boolean; error?: string };
  compile: () => Promise<boolean>;
  reset: () => void;

  // Computed
  status: ReturnType<typeof getWorkspaceStatus> | null;
  canAdd: boolean;
  maxWidgets: number;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspace, setWorkspace] = useState<WorkspaceManifest | null>(null);
  const [packages, setPackages] = useState<Map<string, GeneratedWidgetPackage>>(new Map());
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationErrors, setCompilationErrors] = useState<string[]>([]);

  // Create new workspace
  const createNew = useCallback((name: string) => {
    const ws = createWorkspace(name);
    setWorkspace(ws);
    setPackages(new Map());
    setCompilationErrors([]);
  }, []);

  // Add widget to workspace
  const addWidget = useCallback((spec: SpecJSON) => {
    if (!workspace) {
      return { success: false, error: 'No workspace created' };
    }

    const result = addWidgetToWorkspace(workspace, spec);
    if (result.success) {
      setWorkspace({ ...workspace }); // Trigger re-render
    }
    return result;
  }, [workspace]);

  // Remove widget from workspace
  const removeWidget = useCallback((widgetId: string) => {
    if (!workspace) return false;

    const success = removeWidgetFromWorkspace(workspace, widgetId);
    if (success) {
      setWorkspace({ ...workspace });
      // Remove package if exists
      const newPackages = new Map(packages);
      newPackages.delete(widgetId);
      setPackages(newPackages);
    }
    return success;
  }, [workspace, packages]);

  // Update widget in workspace
  const updateWidget = useCallback((widgetId: string, spec: SpecJSON) => {
    if (!workspace) {
      return { success: false, error: 'No workspace created' };
    }

    const result = updateWidgetInWorkspace(workspace, widgetId, spec);
    if (result.success) {
      setWorkspace({ ...workspace });
      // Invalidate package cache
      const newPackages = new Map(packages);
      newPackages.delete(widgetId);
      setPackages(newPackages);
    }
    return result;
  }, [workspace, packages]);

  // Compile all widgets in workspace
  const compile = useCallback(async () => {
    if (!workspace) return false;

    setIsCompiling(true);
    setCompilationErrors([]);

    try {
      const result = await compileWorkspace(workspace, {
        parallel: true,
        stopOnError: false,
        includeTests: true
      });

      setWorkspace({ ...result.workspace });
      setPackages(result.packages);

      if (!result.success) {
        setCompilationErrors(result.errors.map(e => `[${e.widgetId}] ${e.message}`));
      }

      return result.success;
    } catch (error) {
      setCompilationErrors([error instanceof Error ? error.message : 'Unknown error']);
      return false;
    } finally {
      setIsCompiling(false);
    }
  }, [workspace]);

  // Reset workspace
  const reset = useCallback(() => {
    setWorkspace(null);
    setPackages(new Map());
    setIsCompiling(false);
    setCompilationErrors([]);
  }, []);

  // Computed values
  const status = useMemo(() => {
    return workspace ? getWorkspaceStatus(workspace) : null;
  }, [workspace]);

  const canAdd = useMemo(() => {
    return workspace ? canAddWidget(workspace) : false;
  }, [workspace]);

  return {
    workspace,
    packages,
    isCompiling,
    compilationErrors,
    createNew,
    addWidget,
    removeWidget,
    updateWidget,
    compile,
    reset,
    status,
    canAdd,
    maxWidgets: MAX_WIDGETS_PER_WORKSPACE
  };
}

export default useWorkspace;
