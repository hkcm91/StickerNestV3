/**
 * StickerNest v2 - Debug Keyboard Shortcuts
 * Provides keyboard shortcuts for debugging features
 */

import { useEffect, useCallback } from 'react';
import { debug } from '../utils/debug';

interface DebugShortcuts {
  toggleDebugPanel?: () => void;
  toggleDevMode?: () => void;
  clearConsole?: () => void;
  dumpState?: () => void;
}

/**
 * Hook for debug keyboard shortcuts
 *
 * Shortcuts:
 * - Ctrl+Shift+D: Toggle debug panel
 * - Ctrl+Shift+M: Toggle dev mode
 * - Ctrl+Shift+C: Clear console
 * - Ctrl+Shift+S: Dump state to console
 */
export function useDebugShortcuts(callbacks: DebugShortcuts): void {
  const {
    toggleDebugPanel,
    toggleDevMode,
    clearConsole,
    dumpState,
  } = callbacks;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only work in development
      if (!import.meta.env.DEV) return;

      // Check for Ctrl+Shift or Cmd+Shift
      const isModified = (event.ctrlKey || event.metaKey) && event.shiftKey;
      if (!isModified) return;

      switch (event.key.toLowerCase()) {
        case 'd':
          // Ctrl+Shift+D: Toggle debug panel
          event.preventDefault();
          if (toggleDebugPanel) {
            toggleDebugPanel();
            debug.info('Debug panel toggled');
          }
          break;

        case 'm':
          // Ctrl+Shift+M: Toggle dev mode
          event.preventDefault();
          if (toggleDevMode) {
            toggleDevMode();
            debug.info('Dev mode toggled');
          }
          break;

        case 'c':
          // Ctrl+Shift+C: Clear console (avoid conflict with copy)
          // Only if not in an input field
          if (
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA'
          ) {
            event.preventDefault();
            if (clearConsole) {
              clearConsole();
            } else {
              debug.clear();
            }
          }
          break;

        case 's':
          // Ctrl+Shift+S: Dump state
          event.preventDefault();
          if (dumpState) {
            dumpState();
          }
          break;

        case 'p':
          // Ctrl+Shift+P: Performance snapshot
          event.preventDefault();
          logPerformanceSnapshot();
          break;

        case 'r':
          // Ctrl+Shift+R: Log render tree info
          event.preventDefault();
          logRenderInfo();
          break;
      }
    },
    [toggleDebugPanel, toggleDevMode, clearConsole, dumpState]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Log performance snapshot to console
 */
function logPerformanceSnapshot(): void {
  debug.group('Performance Snapshot', () => {
    // Memory (if available)
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    if (memory) {
      console.log('Memory:', {
        usedHeap: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        totalHeap: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    // Navigation timing
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navTiming) {
      console.log('Page Load:', {
        domContentLoaded: `${navTiming.domContentLoadedEventEnd.toFixed(0)}ms`,
        loadComplete: `${navTiming.loadEventEnd.toFixed(0)}ms`,
      });
    }

    // Long tasks (if available)
    const longTasks = performance.getEntriesByType('longtask');
    if (longTasks.length > 0) {
      console.log('Long Tasks:', longTasks.length);
      longTasks.forEach((task, i) => {
        console.log(`  Task ${i + 1}: ${task.duration.toFixed(2)}ms`);
      });
    }

    // Resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter((r) => r.initiatorType === 'script');
    const cssResources = resources.filter((r) => r.initiatorType === 'link' || r.name.endsWith('.css'));
    console.log('Resources:', {
      total: resources.length,
      scripts: jsResources.length,
      styles: cssResources.length,
    });
  });
}

/**
 * Log render information
 */
function logRenderInfo(): void {
  debug.group('Render Info', () => {
    // Count DOM nodes
    const nodeCount = document.getElementsByTagName('*').length;
    console.log('DOM Nodes:', nodeCount);

    // Count React roots
    const reactRoots = document.querySelectorAll('[data-reactroot]');
    console.log('React Roots:', reactRoots.length);

    // Count iframes (widgets)
    const iframes = document.querySelectorAll('iframe');
    console.log('Widget Iframes:', iframes.length);

    // Count event listeners (estimate)
    console.log('Tip: Use Performance tab in DevTools for detailed render analysis');
  });
}

/**
 * Hook to show available shortcuts on first load
 */
export function useShowShortcutsHint(): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const hasShownHint = sessionStorage.getItem('sn_shortcuts_hint_shown');
    if (!hasShownHint) {
      console.log(
        '%c⌨️ Debug Shortcuts Available:',
        'color: #8b5cf6; font-weight: bold;'
      );
      console.log('  Ctrl+Shift+D: Toggle debug panel');
      console.log('  Ctrl+Shift+M: Toggle dev mode');
      console.log('  Ctrl+Shift+P: Performance snapshot');
      console.log('  Ctrl+Shift+R: Render info');
      console.log('  Ctrl+Shift+S: Dump state');
      sessionStorage.setItem('sn_shortcuts_hint_shown', 'true');
    }
  }, []);
}

export default useDebugShortcuts;
