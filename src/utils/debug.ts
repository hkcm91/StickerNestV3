/**
 * StickerNest v2 - Debug Utilities
 * Pretty logging and debugging tools for vibe coding
 */

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Color palette for console logging
const colors = {
  widget: '#8b5cf6',    // Purple
  event: '#06b6d4',     // Cyan
  pipeline: '#22c55e',  // Green
  render: '#f59e0b',    // Amber
  error: '#ef4444',     // Red
  warn: '#eab308',      // Yellow
  info: '#3b82f6',      // Blue
  success: '#10b981',   // Emerald
  perf: '#ec4899',      // Pink
};

/**
 * Styled console logging with emojis and colors
 */
export const debug = {
  /** Widget-related logs */
  widget: (...args: unknown[]) => {
    if (!isDev) return;
    console.log(
      '%c🧩 Widget',
      `color: ${colors.widget}; font-weight: bold;`,
      ...args
    );
  },

  /** Event bus logs */
  event: (...args: unknown[]) => {
    if (!isDev) return;
    console.log(
      '%c📡 Event',
      `color: ${colors.event}; font-weight: bold;`,
      ...args
    );
  },

  /** Pipeline-related logs */
  pipeline: (...args: unknown[]) => {
    if (!isDev) return;
    console.log(
      '%c🔗 Pipeline',
      `color: ${colors.pipeline}; font-weight: bold;`,
      ...args
    );
  },

  /** Render tracking logs */
  render: (componentName: string, renderCount?: number) => {
    if (!isDev) return;
    const countStr = renderCount !== undefined ? ` #${renderCount}` : '';
    console.log(
      `%c🔄 Render${countStr}`,
      `color: ${colors.render}; font-weight: bold;`,
      componentName
    );
  },

  /** Error logs */
  error: (...args: unknown[]) => {
    if (!isDev) return;
    console.error(
      '%c❌ Error',
      `color: ${colors.error}; font-weight: bold;`,
      ...args
    );
  },

  /** Warning logs */
  warn: (...args: unknown[]) => {
    if (!isDev) return;
    console.warn(
      '%c⚠️ Warning',
      `color: ${colors.warn}; font-weight: bold;`,
      ...args
    );
  },

  /** Info logs */
  info: (...args: unknown[]) => {
    if (!isDev) return;
    console.info(
      '%c💡 Info',
      `color: ${colors.info}; font-weight: bold;`,
      ...args
    );
  },

  /** Success logs */
  success: (...args: unknown[]) => {
    if (!isDev) return;
    console.log(
      '%c✅ Success',
      `color: ${colors.success}; font-weight: bold;`,
      ...args
    );
  },

  /** Performance logs */
  perf: (label: string, durationMs: number) => {
    if (!isDev) return;
    const color = durationMs > 100 ? colors.warn : durationMs > 16 ? colors.perf : colors.success;
    console.log(
      `%c⏱️ Perf`,
      `color: ${color}; font-weight: bold;`,
      `${label}: ${durationMs.toFixed(2)}ms`
    );
  },

  /** Group logs together */
  group: (label: string, fn: () => void) => {
    if (!isDev) return;
    console.group(`%c📁 ${label}`, 'color: #94a3b8; font-weight: bold;');
    fn();
    console.groupEnd();
  },

  /** Collapsed group logs */
  groupCollapsed: (label: string, fn: () => void) => {
    if (!isDev) return;
    console.groupCollapsed(`%c📁 ${label}`, 'color: #94a3b8; font-weight: bold;');
    fn();
    console.groupEnd();
  },

  /** Table display for objects/arrays */
  table: (data: unknown) => {
    if (!isDev) return;
    console.table(data);
  },

  /** Trace with stack */
  trace: (label: string) => {
    if (!isDev) return;
    console.trace(`%c🔍 Trace: ${label}`, 'color: #94a3b8;');
  },

  /** Time tracking */
  time: (label: string) => {
    if (!isDev) return;
    console.time(`⏱️ ${label}`);
  },

  timeEnd: (label: string) => {
    if (!isDev) return;
    console.timeEnd(`⏱️ ${label}`);
  },

  /** Count calls */
  count: (label: string) => {
    if (!isDev) return;
    console.count(`📊 ${label}`);
  },

  /** Clear console */
  clear: () => {
    if (!isDev) return;
    console.clear();
  },
};

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(label: string, fn: () => T): T {
  if (!isDev) return fn();

  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  debug.perf(label, duration);
  return result;
}

/**
 * Async performance measurement
 */
export async function measurePerformanceAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isDev) return fn();

  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  debug.perf(label, duration);
  return result;
}

/**
 * Track render counts for components
 * Usage: const renderCount = useRenderCount('MyComponent');
 */
import { useRef, useEffect } from 'react';

export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    if (isDev) {
      debug.render(componentName, renderCount.current);
    }
  });

  return renderCount.current;
}

/**
 * Track why a component re-rendered
 * Usage: useWhyDidYouRender('MyComponent', { prop1, prop2 });
 */
export function useWhyDidYouRender(
  componentName: string,
  props: Record<string, unknown>
): void {
  const previousProps = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (!isDev) return;

    const changedProps: Record<string, { from: unknown; to: unknown }> = {};

    Object.keys(props).forEach((key) => {
      if (previousProps.current[key] !== props[key]) {
        changedProps[key] = {
          from: previousProps.current[key],
          to: props[key],
        };
      }
    });

    if (Object.keys(changedProps).length > 0) {
      debug.groupCollapsed(`🔍 ${componentName} re-rendered due to:`, () => {
        Object.entries(changedProps).forEach(([key, { from, to }]) => {
          console.log(`  ${key}:`, { from, to });
        });
      });
    }

    previousProps.current = { ...props };
  });
}

/**
 * Log state changes in Zustand stores
 */
export function logStateChange(
  storeName: string,
  prevState: unknown,
  nextState: unknown
): void {
  if (!isDev) return;

  debug.groupCollapsed(`📦 ${storeName} state changed`, () => {
    console.log('Previous:', prevState);
    console.log('Next:', nextState);
  });
}

/**
 * Assert condition in development
 */
export function devAssert(
  condition: boolean,
  message: string
): asserts condition {
  if (!isDev) return;
  if (!condition) {
    debug.error(`Assertion failed: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Feature flag checker with logging
 */
export function checkFeatureFlag(flagName: string, defaultValue = false): boolean {
  const value = localStorage.getItem(`sn_flag_${flagName}`);
  const enabled = value !== null ? value === 'true' : defaultValue;

  if (isDev) {
    debug.info(`Feature flag "${flagName}":`, enabled ? 'enabled' : 'disabled');
  }

  return enabled;
}

/**
 * Set a feature flag
 */
export function setFeatureFlag(flagName: string, enabled: boolean): void {
  localStorage.setItem(`sn_flag_${flagName}`, String(enabled));
  if (isDev) {
    debug.success(`Feature flag "${flagName}" set to:`, enabled);
  }
}

// Export isDev for conditional checks elsewhere
export { isDev };

// Make debug available globally in development for console access
if (isDev && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).snDebug = debug;
  (window as unknown as Record<string, unknown>).snFlags = {
    check: checkFeatureFlag,
    set: setFeatureFlag,
    list: () => {
      const flags: Record<string, boolean> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('sn_flag_')) {
          flags[key.replace('sn_flag_', '')] = localStorage.getItem(key) === 'true';
        }
      }
      debug.table(flags);
      return flags;
    },
  };
  console.log(
    '%c🎨 StickerNest Debug Tools Available!',
    'color: #8b5cf6; font-size: 14px; font-weight: bold;'
  );
  console.log('  • window.snDebug - Logging utilities');
  console.log('  • window.snFlags - Feature flag management');
}
