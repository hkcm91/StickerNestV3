import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TrayState {
  isOpen: boolean;
  activeTab: string;
  width: number;
}

export interface UseTrayStateOptions {
  defaultOpen?: boolean;
  defaultTab?: string;
  defaultWidth?: number;
  persistKey?: string;
}

export interface UseTrayStateReturn {
  isOpen: boolean;
  activeTab: string;
  width: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveTab: (tabId: string) => void;
  setWidth: (width: number) => void;
  reset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to manage slide-out tray state
 */
export function useTrayState(options: UseTrayStateOptions = {}): UseTrayStateReturn {
  const {
    defaultOpen = false,
    defaultTab = '',
    defaultWidth = 320,
    persistKey,
  } = options;

  // Load initial state from localStorage if persistKey provided
  const getInitialState = (): TrayState => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`tray-state-${persistKey}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to load tray state from localStorage:', e);
      }
    }
    return {
      isOpen: defaultOpen,
      activeTab: defaultTab,
      width: defaultWidth,
    };
  };

  const [state, setState] = useState<TrayState>(getInitialState);

  // Persist state to localStorage when it changes
  const persistState = useCallback((newState: TrayState) => {
    if (persistKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`tray-state-${persistKey}`, JSON.stringify(newState));
      } catch (e) {
        console.warn('Failed to persist tray state to localStorage:', e);
      }
    }
  }, [persistKey]);

  const setIsOpen = useCallback((isOpen: boolean) => {
    setState(prev => {
      const newState = { ...prev, isOpen };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const setActiveTab = useCallback((activeTab: string) => {
    setState(prev => {
      const newState = { ...prev, activeTab };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const setWidth = useCallback((width: number) => {
    setState(prev => {
      const newState = { ...prev, width };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const open = useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const toggle = useCallback(() => setIsOpen(!state.isOpen), [setIsOpen, state.isOpen]);

  const reset = useCallback(() => {
    const defaultState = {
      isOpen: defaultOpen,
      activeTab: defaultTab,
      width: defaultWidth,
    };
    setState(defaultState);
    persistState(defaultState);
  }, [defaultOpen, defaultTab, defaultWidth, persistState]);

  return useMemo(() => ({
    isOpen: state.isOpen,
    activeTab: state.activeTab,
    width: state.width,
    open,
    close,
    toggle,
    setIsOpen,
    setActiveTab,
    setWidth,
    reset,
  }), [state, open, close, toggle, setIsOpen, setActiveTab, setWidth, reset]);
}

/**
 * Hook to manage multiple trays together
 */
export function useMultiTrayState(trays: Record<string, UseTrayStateOptions>) {
  const trayStates = Object.entries(trays).reduce((acc, [key, options]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    acc[key] = useTrayState(options);
    return acc;
  }, {} as Record<string, UseTrayStateReturn>);

  // Close all trays
  const closeAll = useCallback(() => {
    Object.values(trayStates).forEach(tray => tray.close());
  }, [trayStates]);

  // Open a specific tray (optionally closing others)
  const openTray = useCallback((trayId: string, exclusive = false) => {
    if (exclusive) {
      Object.entries(trayStates).forEach(([id, tray]) => {
        if (id === trayId) {
          tray.open();
        } else {
          tray.close();
        }
      });
    } else {
      trayStates[trayId]?.open();
    }
  }, [trayStates]);

  return {
    trays: trayStates,
    closeAll,
    openTray,
  };
}

export default useTrayState;
