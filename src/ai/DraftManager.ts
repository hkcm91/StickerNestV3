/**
 * StickerNest v2 - Draft Manager
 * Manages in-memory and persisted draft widgets
 * Handles draft lifecycle: create, preview, validate, save, discard
 */

import type { WidgetManifest } from '../types/manifest';
import type { ValidationResult } from './ProtocolEnforcer';

/** Draft widget status */
export type DraftStatus = 'draft' | 'validating' | 'validated' | 'failed' | 'saving' | 'saved';

/** Security report for a draft */
export interface DraftSecurityReport {
  passed: boolean;
  score: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    location?: string;
  }>;
  testedAt: number;
}

/** Draft widget structure */
export interface DraftWidget {
  /** Unique draft ID */
  id: string;
  /** Widget manifest */
  manifest: WidgetManifest;
  /** Widget HTML content */
  html: string;
  /** Additional files (CSS, JS, etc.) */
  additionalFiles?: Record<string, string>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modification timestamp */
  lastModified: number;
  /** Current status */
  status: DraftStatus;
  /** AI conversation ID that created this */
  conversationId?: string;
  /** Validation result */
  validationResult?: ValidationResult;
  /** Security test result */
  securityReport?: DraftSecurityReport;
  /** Generation metadata */
  metadata?: {
    prompt?: string;
    model?: string;
    mode?: 'new' | 'variation' | 'modification';
    sourceWidgetId?: string;
  };
}

/** Draft change event */
export interface DraftChangeEvent {
  type: 'created' | 'updated' | 'validated' | 'saved' | 'discarded';
  draftId: string;
  draft?: DraftWidget;
}

/** Draft manager configuration */
export interface DraftManagerConfig {
  /** Maximum number of drafts to keep */
  maxDrafts: number;
  /** Auto-save interval in milliseconds (0 = disabled) */
  autoSaveInterval: number;
  /** Storage key prefix */
  storagePrefix: string;
}

const DEFAULT_CONFIG: DraftManagerConfig = {
  maxDrafts: 10,
  autoSaveInterval: 30000, // 30 seconds
  storagePrefix: 'stickernest:drafts',
};

/**
 * Draft Manager - handles widget draft lifecycle
 */
export class DraftManager {
  private drafts: Map<string, DraftWidget> = new Map();
  private config: DraftManagerConfig;
  private changeListeners: Set<(event: DraftChangeEvent) => void> = new Set();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<DraftManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
    this.startAutoSave();
  }

  /**
   * Create a new draft
   */
  createDraft(
    manifest: WidgetManifest,
    html: string,
    options?: {
      conversationId?: string;
      metadata?: DraftWidget['metadata'];
      additionalFiles?: Record<string, string>;
    }
  ): DraftWidget {
    const id = this.generateDraftId();
    const now = Date.now();

    const draft: DraftWidget = {
      id,
      manifest,
      html,
      additionalFiles: options?.additionalFiles,
      createdAt: now,
      lastModified: now,
      status: 'draft',
      conversationId: options?.conversationId,
      metadata: options?.metadata,
    };

    // Enforce max drafts limit (FIFO eviction)
    if (this.drafts.size >= this.config.maxDrafts) {
      const oldest = this.getOldestDraft();
      if (oldest) {
        this.discardDraft(oldest.id, false); // Don't notify for auto-eviction
      }
    }

    this.drafts.set(id, draft);
    this.notifyChange({ type: 'created', draftId: id, draft });
    this.saveToStorage();

    return draft;
  }

  /**
   * Update an existing draft
   */
  updateDraft(
    id: string,
    updates: Partial<Pick<DraftWidget, 'manifest' | 'html' | 'additionalFiles' | 'status'>>
  ): DraftWidget | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    const updatedDraft: DraftWidget = {
      ...draft,
      ...updates,
      lastModified: Date.now(),
    };

    this.drafts.set(id, updatedDraft);
    this.notifyChange({ type: 'updated', draftId: id, draft: updatedDraft });
    this.saveToStorage();

    return updatedDraft;
  }

  /**
   * Set validation result for a draft
   */
  setValidationResult(id: string, result: ValidationResult): DraftWidget | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    const updatedDraft: DraftWidget = {
      ...draft,
      validationResult: result,
      status: result.valid ? 'validated' : 'failed',
      lastModified: Date.now(),
    };

    this.drafts.set(id, updatedDraft);
    this.notifyChange({ type: 'validated', draftId: id, draft: updatedDraft });
    this.saveToStorage();

    return updatedDraft;
  }

  /**
   * Set security report for a draft
   */
  setSecurityReport(id: string, report: DraftSecurityReport): DraftWidget | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    const updatedDraft: DraftWidget = {
      ...draft,
      securityReport: report,
      lastModified: Date.now(),
    };

    // Update status if security failed
    if (!report.passed && updatedDraft.status === 'validated') {
      updatedDraft.status = 'failed';
    }

    this.drafts.set(id, updatedDraft);
    this.notifyChange({ type: 'updated', draftId: id, draft: updatedDraft });
    this.saveToStorage();

    return updatedDraft;
  }

  /**
   * Get a draft by ID
   */
  getDraft(id: string): DraftWidget | null {
    return this.drafts.get(id) || null;
  }

  /**
   * Get all drafts
   */
  getAllDrafts(): DraftWidget[] {
    return Array.from(this.drafts.values());
  }

  /**
   * Get drafts by status
   */
  getDraftsByStatus(status: DraftStatus): DraftWidget[] {
    return this.getAllDrafts().filter(d => d.status === status);
  }

  /**
   * Get drafts by conversation ID
   */
  getDraftsByConversation(conversationId: string): DraftWidget[] {
    return this.getAllDrafts().filter(d => d.conversationId === conversationId);
  }

  /**
   * Discard a draft
   */
  discardDraft(id: string, notify = true): boolean {
    const draft = this.drafts.get(id);
    if (!draft) return false;

    this.drafts.delete(id);
    
    if (notify) {
      this.notifyChange({ type: 'discarded', draftId: id });
    }
    
    this.saveToStorage();
    return true;
  }

  /**
   * Mark a draft as saved (after successful file write)
   */
  markAsSaved(id: string): DraftWidget | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    const updatedDraft: DraftWidget = {
      ...draft,
      status: 'saved',
      lastModified: Date.now(),
    };

    this.drafts.set(id, updatedDraft);
    this.notifyChange({ type: 'saved', draftId: id, draft: updatedDraft });
    this.saveToStorage();

    return updatedDraft;
  }

  /**
   * Subscribe to draft changes
   */
  onChange(listener: (event: DraftChangeEvent) => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * Get draft count
   */
  getDraftCount(): number {
    return this.drafts.size;
  }

  /**
   * Clear all drafts
   */
  clearAll(): void {
    const ids = Array.from(this.drafts.keys());
    this.drafts.clear();
    
    for (const id of ids) {
      this.notifyChange({ type: 'discarded', draftId: id });
    }
    
    this.saveToStorage();
  }

  /**
   * Export draft for file save
   */
  exportDraft(id: string): { manifest: string; html: string; files: Record<string, string> } | null {
    const draft = this.drafts.get(id);
    if (!draft) return null;

    return {
      manifest: JSON.stringify(draft.manifest, null, 2),
      html: draft.html,
      files: draft.additionalFiles || {},
    };
  }

  /**
   * Cleanup - stop auto-save and clear listeners
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.changeListeners.clear();
  }

  // Private methods

  private generateDraftId(): string {
    return `draft-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  }

  private getOldestDraft(): DraftWidget | null {
    let oldest: DraftWidget | null = null;
    
    for (const draft of this.drafts.values()) {
      // Don't evict saved or validated drafts
      if (draft.status === 'saved' || draft.status === 'validated') {
        continue;
      }
      
      if (!oldest || draft.createdAt < oldest.createdAt) {
        oldest = draft;
      }
    }
    
    // If no evictable drafts found, get the actual oldest
    if (!oldest) {
      for (const draft of this.drafts.values()) {
        if (!oldest || draft.createdAt < oldest.createdAt) {
          oldest = draft;
        }
      }
    }
    
    return oldest;
  }

  private notifyChange(event: DraftChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[DraftManager] Listener error:', error);
      }
    }
  }

  private startAutoSave(): void {
    if (this.config.autoSaveInterval <= 0) return;

    this.autoSaveTimer = setInterval(() => {
      this.saveToStorage();
    }, this.config.autoSaveInterval);
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.drafts.entries());
      localStorage.setItem(this.config.storagePrefix, JSON.stringify(data));
    } catch (error) {
      console.warn('[DraftManager] Failed to save to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const json = localStorage.getItem(this.config.storagePrefix);
      if (!json) return;

      const data = JSON.parse(json) as Array<[string, DraftWidget]>;
      
      for (const [id, draft] of data) {
        // Validate draft structure
        if (draft.id && draft.manifest && draft.html) {
          this.drafts.set(id, draft);
        }
      }
    } catch (error) {
      console.warn('[DraftManager] Failed to load from storage:', error);
    }
  }
}

/** Singleton instance */
let managerInstance: DraftManager | null = null;

/**
 * Get the draft manager singleton
 */
export function getDraftManager(): DraftManager {
  if (!managerInstance) {
    managerInstance = new DraftManager();
  }
  return managerInstance;
}

/**
 * Create a new draft manager instance (for testing)
 */
export function createDraftManager(config?: Partial<DraftManagerConfig>): DraftManager {
  return new DraftManager(config);
}

