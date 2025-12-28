/**
 * StickerNest v2 - Preview Context
 * Manages preview state across AI sidebar components
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { DraftWidget } from '../../ai/DraftManager';
import type { PreviewSize } from './FloatingPreview';

export interface PreviewState {
  /** Currently previewed draft */
  currentDraft: DraftWidget | null;
  /** Whether the floating preview is open */
  isPreviewOpen: boolean;
  /** Whether preview is pinned to sidebar */
  isPinned: boolean;
  /** Preview window position */
  position: { x: number; y: number };
  /** Preview size preset */
  size: PreviewSize;
  /** Auto-refresh on changes */
  autoRefresh: boolean;
}

export interface PreviewContextValue extends PreviewState {
  /** Set the draft to preview */
  setPreviewDraft: (draft: DraftWidget | null) => void;
  /** Open the preview window */
  openPreview: (draft?: DraftWidget) => void;
  /** Close the preview window */
  closePreview: () => void;
  /** Toggle preview open/closed */
  togglePreview: () => void;
  /** Toggle pin state */
  togglePin: () => void;
  /** Set preview position */
  setPosition: (pos: { x: number; y: number }) => void;
  /** Set preview size */
  setSize: (size: PreviewSize) => void;
  /** Toggle auto-refresh */
  toggleAutoRefresh: () => void;
  /** Refresh the preview */
  refreshPreview: () => void;
  /** Refresh counter for forcing re-renders */
  refreshKey: number;
}

const defaultState: PreviewState = {
  currentDraft: null,
  isPreviewOpen: false,
  isPinned: false,
  position: { x: 100, y: 100 },
  size: 'medium',
  autoRefresh: true,
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

export interface PreviewProviderProps {
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
}

export const PreviewProvider: React.FC<PreviewProviderProps> = ({
  children,
  defaultPosition = { x: 100, y: 100 },
}) => {
  const [state, setState] = useState<PreviewState>({
    ...defaultState,
    position: defaultPosition,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const setPreviewDraft = useCallback((draft: DraftWidget | null) => {
    setState(prev => ({ ...prev, currentDraft: draft }));
    if (draft && state.autoRefresh) {
      setRefreshKey(prev => prev + 1);
    }
  }, [state.autoRefresh]);

  const openPreview = useCallback((draft?: DraftWidget) => {
    setState(prev => ({
      ...prev,
      isPreviewOpen: true,
      currentDraft: draft ?? prev.currentDraft,
    }));
  }, []);

  const closePreview = useCallback(() => {
    setState(prev => ({ ...prev, isPreviewOpen: false }));
  }, []);

  const togglePreview = useCallback(() => {
    setState(prev => ({ ...prev, isPreviewOpen: !prev.isPreviewOpen }));
  }, []);

  const togglePin = useCallback(() => {
    setState(prev => ({ ...prev, isPinned: !prev.isPinned }));
  }, []);

  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState(prev => ({ ...prev, position }));
  }, []);

  const setSize = useCallback((size: PreviewSize) => {
    setState(prev => ({ ...prev, size }));
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  const refreshPreview = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const value: PreviewContextValue = {
    ...state,
    setPreviewDraft,
    openPreview,
    closePreview,
    togglePreview,
    togglePin,
    setPosition,
    setSize,
    toggleAutoRefresh,
    refreshPreview,
    refreshKey,
  };

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  );
};

/**
 * Hook to access preview context
 */
export function usePreview(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreview must be used within a PreviewProvider');
  }
  return context;
}

/**
 * Hook to check if preview context is available (for optional usage)
 */
export function usePreviewOptional(): PreviewContextValue | null {
  return useContext(PreviewContext);
}

export default PreviewContext;

