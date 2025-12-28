/**
 * StickerNest v2 - Developer Mode
 * Supports "developer canvas" vs "parent/user canvas" distinction
 * Controls visibility and editing of developer-only widgets
 */

import { EventBus } from './EventBus';

// ==================
// Types
// ==================

/**
 * Developer canvas mode - distinct from the main CanvasMode ("view" | "edit" | "connect")
 * This controls developer-specific visibility and behavior, not the canvas interaction mode.
 */
export type DeveloperCanvasMode = 'developer' | 'user' | 'preview';

export interface DeveloperModeConfig {
  /** Whether dev mode is enabled globally */
  enabled: boolean;
  /** Current developer canvas mode */
  mode: DeveloperCanvasMode;
  /** Show debug overlays */
  showDebugOverlays: boolean;
  /** Show performance metrics */
  showPerformanceMetrics: boolean;
  /** Show event flow indicators */
  showEventFlow: boolean;
  /** Allow editing locked widgets */
  allowEditingLocked: boolean;
  /** Show hidden widgets */
  showHiddenWidgets: boolean;
  /** Enable experimental features */
  experimentalFeatures: boolean;
}

export interface WidgetVisibility {
  widgetId: string;
  /** Visible in developer mode */
  devMode: boolean;
  /** Visible in user mode */
  userMode: boolean;
  /** Visible in preview mode */
  previewMode: boolean;
}

export interface DeveloperModeState {
  config: DeveloperModeConfig;
  /** Widget-specific visibility overrides */
  widgetVisibility: Map<string, WidgetVisibility>;
  /** Developer-only widget IDs */
  developerOnlyWidgets: Set<string>;
  /** Hidden in preview mode */
  hiddenInPreview: Set<string>;
}

// ==================
// Default Config
// ==================

const DEFAULT_CONFIG: DeveloperModeConfig = {
  enabled: false,
  mode: 'user',
  showDebugOverlays: false,
  showPerformanceMetrics: false,
  showEventFlow: false,
  allowEditingLocked: false,
  showHiddenWidgets: false,
  experimentalFeatures: false,
};

// Categories of developer-only widgets
const DEVELOPER_WIDGET_CATEGORIES = new Set([
  'debug',
  'stress',
  'developer',
  'internal',
]);

// Widget IDs that are always developer-only
const DEVELOPER_ONLY_WIDGET_IDS = new Set([
  'identity-debugger',
  'transport-monitor',
  'event-flooder',
  'latency-simulator',
  'random-state-mutator',
  'stress-generator',
  'sandbox-breaker',
  'echo-widget',
]);

// ==================
// Developer Mode Manager
// ==================

export class DeveloperModeManager {
  private state: DeveloperModeState;
  private eventBus: EventBus | null = null;
  private subscribers: Set<(state: DeveloperModeState) => void> = new Set();

  constructor(initialConfig?: Partial<DeveloperModeConfig>) {
    this.state = {
      config: { ...DEFAULT_CONFIG, ...initialConfig },
      widgetVisibility: new Map(),
      developerOnlyWidgets: new Set(DEVELOPER_ONLY_WIDGET_IDS),
      hiddenInPreview: new Set(),
    };
  }

  /**
   * Connect to event bus for emitting mode change events
   */
  connectEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Get current configuration
   */
  getConfig(): DeveloperModeConfig {
    return { ...this.state.config };
  }

  /**
   * Get current developer canvas mode
   */
  getMode(): DeveloperCanvasMode {
    return this.state.config.mode;
  }

  /**
   * Check if developer mode is enabled
   */
  isDeveloperMode(): boolean {
    return this.state.config.enabled && this.state.config.mode === 'developer';
  }

  /**
   * Check if in user mode
   */
  isUserMode(): boolean {
    return this.state.config.mode === 'user';
  }

  /**
   * Check if in preview mode
   */
  isPreviewMode(): boolean {
    return this.state.config.mode === 'preview';
  }

  /**
   * Enable developer mode
   */
  enable(): void {
    this.updateConfig({
      enabled: true,
      mode: 'developer',
    });
  }

  /**
   * Disable developer mode (switch to user mode)
   */
  disable(): void {
    this.updateConfig({
      enabled: false,
      mode: 'user',
    });
  }

  /**
   * Toggle developer mode
   */
  toggle(): boolean {
    const newEnabled = !this.state.config.enabled;
    this.updateConfig({
      enabled: newEnabled,
      mode: newEnabled ? 'developer' : 'user',
    });
    return newEnabled;
  }

  /**
   * Set developer canvas mode
   */
  setMode(mode: DeveloperCanvasMode): void {
    this.updateConfig({ mode });
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DeveloperModeConfig>): void {
    const previousMode = this.state.config.mode;
    this.state.config = { ...this.state.config, ...updates };

    // Emit event if mode changed
    if (previousMode !== this.state.config.mode) {
      this.emitModeChanged(previousMode, this.state.config.mode);
    }

    this.notifySubscribers();
  }

  /**
   * Register a widget as developer-only
   */
  registerDeveloperOnlyWidget(widgetId: string): void {
    this.state.developerOnlyWidgets.add(widgetId);
    this.notifySubscribers();
  }

  /**
   * Unregister a widget from developer-only
   */
  unregisterDeveloperOnlyWidget(widgetId: string): void {
    this.state.developerOnlyWidgets.delete(widgetId);
    this.notifySubscribers();
  }

  /**
   * Check if a widget is developer-only
   */
  isDeveloperOnlyWidget(widgetId: string): boolean {
    return this.state.developerOnlyWidgets.has(widgetId);
  }

  /**
   * Check if a widget should be visible in current mode
   */
  isWidgetVisible(widgetId: string, category?: string): boolean {
    // Check category-based visibility
    if (category && DEVELOPER_WIDGET_CATEGORIES.has(category)) {
      return this.isDeveloperMode();
    }

    // Check explicit developer-only list
    if (this.state.developerOnlyWidgets.has(widgetId)) {
      return this.isDeveloperMode();
    }

    // Check widget-specific visibility override
    const visibility = this.state.widgetVisibility.get(widgetId);
    if (visibility) {
      switch (this.state.config.mode) {
        case 'developer':
          return visibility.devMode;
        case 'user':
          return visibility.userMode;
        case 'preview':
          return visibility.previewMode;
      }
    }

    // Check hidden in preview
    if (this.isPreviewMode() && this.state.hiddenInPreview.has(widgetId)) {
      return false;
    }

    // Show hidden widgets if config allows
    if (this.state.config.showHiddenWidgets) {
      return true;
    }

    // Default: visible in all modes
    return true;
  }

  /**
   * Set widget visibility for specific modes
   */
  setWidgetVisibility(widgetId: string, visibility: Partial<WidgetVisibility>): void {
    const existing = this.state.widgetVisibility.get(widgetId) || {
      widgetId,
      devMode: true,
      userMode: true,
      previewMode: true,
    };

    this.state.widgetVisibility.set(widgetId, {
      ...existing,
      ...visibility,
    });

    this.notifySubscribers();
  }

  /**
   * Hide widget in preview mode
   */
  hideInPreview(widgetId: string): void {
    this.state.hiddenInPreview.add(widgetId);
    this.notifySubscribers();
  }

  /**
   * Show widget in preview mode
   */
  showInPreview(widgetId: string): void {
    this.state.hiddenInPreview.delete(widgetId);
    this.notifySubscribers();
  }

  /**
   * Get all visible widgets for current mode
   */
  filterVisibleWidgets<T extends { id: string; category?: string }>(widgets: T[]): T[] {
    return widgets.filter(w => this.isWidgetVisible(w.id, w.category));
  }

  /**
   * Check if editing is allowed for a widget
   */
  canEditWidget(widgetId: string, isLocked: boolean): boolean {
    // In preview mode, no editing
    if (this.isPreviewMode()) {
      return false;
    }

    // If locked and not allowing edit of locked
    if (isLocked && !this.state.config.allowEditingLocked) {
      return this.isDeveloperMode();
    }

    // Developer-only widgets can only be edited in dev mode
    if (this.isDeveloperOnlyWidget(widgetId)) {
      return this.isDeveloperMode();
    }

    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: DeveloperModeState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get debug info
   */
  getDebugInfo(): object {
    return {
      config: this.state.config,
      developerOnlyWidgets: Array.from(this.state.developerOnlyWidgets),
      hiddenInPreview: Array.from(this.state.hiddenInPreview),
      visibilityOverrides: Array.from(this.state.widgetVisibility.entries()),
    };
  }

  /**
   * Persist config to localStorage
   */
  persistConfig(): void {
    try {
      localStorage.setItem('sn-developer-mode', JSON.stringify(this.state.config));
    } catch (e) {
      console.warn('Failed to persist developer mode config:', e);
    }
  }

  /**
   * Load config from localStorage
   */
  loadPersistedConfig(): void {
    try {
      const stored = localStorage.getItem('sn-developer-mode');
      if (stored) {
        const config = JSON.parse(stored);
        this.updateConfig(config);
      }
    } catch (e) {
      console.warn('Failed to load persisted developer mode config:', e);
    }
  }

  // ==================
  // Private Methods
  // ==================

  private notifySubscribers(): void {
    this.subscribers.forEach(cb => cb(this.state));
  }

  private emitModeChanged(from: DeveloperCanvasMode, to: DeveloperCanvasMode): void {
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'devMode.changed',
        scope: 'canvas',
        payload: {
          previousMode: from,
          currentMode: to,
          isDeveloper: to === 'developer',
          config: this.state.config,
        },
      });
    }
  }
}

// ==================
// Singleton Instance
// ==================

let developerModeInstance: DeveloperModeManager | null = null;

/**
 * Get or create the global developer mode manager
 */
export function getDeveloperModeManager(
  initialConfig?: Partial<DeveloperModeConfig>
): DeveloperModeManager {
  if (!developerModeInstance) {
    developerModeInstance = new DeveloperModeManager(initialConfig);
  }
  return developerModeInstance;
}

/**
 * Reset the developer mode manager (for testing)
 */
export function resetDeveloperModeManager(): void {
  developerModeInstance = null;
}

// ==================
// React Hook Helper
// ==================

/**
 * Hook helper state type for React integration
 */
export interface DeveloperModeHookState {
  isDeveloperMode: boolean;
  mode: DeveloperCanvasMode;
  config: DeveloperModeConfig;
  toggle: () => void;
  setMode: (mode: DeveloperCanvasMode) => void;
  isWidgetVisible: (widgetId: string, category?: string) => boolean;
}

export default DeveloperModeManager;
