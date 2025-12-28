/**
 * StickerNest v2 - Draft Versioning
 * Version storage and diff utilities for draft widgets
 */

import type { WidgetManifest } from '../types/manifest';

export interface DraftVersion {
  id: string;
  draftId: string;
  versionNumber: number;
  html: string;
  manifest: WidgetManifest;
  timestamp: number;
  description?: string;
  /** Type of change */
  changeType: 'create' | 'edit' | 'regenerate' | 'import';
}

export interface VersionDiff {
  type: 'added' | 'removed' | 'modified';
  path: string;
  oldValue?: any;
  newValue?: any;
}

const STORAGE_KEY = 'stickernest:draft-versions';
const MAX_VERSIONS_PER_DRAFT = 20;

/**
 * Draft Versioning Manager
 */
class DraftVersioningManager {
  private versions: Map<string, DraftVersion[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Save a new version of a draft
   */
  saveVersion(
    draftId: string,
    html: string,
    manifest: WidgetManifest,
    changeType: DraftVersion['changeType'] = 'edit',
    description?: string
  ): DraftVersion {
    const draftVersions = this.versions.get(draftId) || [];
    const versionNumber = draftVersions.length + 1;

    const version: DraftVersion = {
      id: `${draftId}-v${versionNumber}-${Date.now()}`,
      draftId,
      versionNumber,
      html,
      manifest,
      timestamp: Date.now(),
      description,
      changeType,
    };

    // Add to front of array (newest first)
    draftVersions.unshift(version);

    // Trim old versions if exceeds max
    if (draftVersions.length > MAX_VERSIONS_PER_DRAFT) {
      draftVersions.splice(MAX_VERSIONS_PER_DRAFT);
    }

    this.versions.set(draftId, draftVersions);
    this.saveToStorage();

    return version;
  }

  /**
   * Get all versions for a draft
   */
  getVersions(draftId: string): DraftVersion[] {
    return this.versions.get(draftId) || [];
  }

  /**
   * Get a specific version
   */
  getVersion(draftId: string, versionId: string): DraftVersion | null {
    const versions = this.versions.get(draftId);
    if (!versions) return null;
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Get the latest version
   */
  getLatestVersion(draftId: string): DraftVersion | null {
    const versions = this.versions.get(draftId);
    if (!versions || versions.length === 0) return null;
    return versions[0];
  }

  /**
   * Rollback to a specific version
   */
  rollbackTo(draftId: string, versionId: string): DraftVersion | null {
    const version = this.getVersion(draftId, versionId);
    if (!version) return null;

    // Create a new version from the rollback
    return this.saveVersion(
      draftId,
      version.html,
      version.manifest,
      'edit',
      `Rolled back to version ${version.versionNumber}`
    );
  }

  /**
   * Compare two versions and get differences
   */
  compareVersions(draftId: string, versionIdA: string, versionIdB: string): VersionDiff[] {
    const versionA = this.getVersion(draftId, versionIdA);
    const versionB = this.getVersion(draftId, versionIdB);

    if (!versionA || !versionB) return [];

    const diffs: VersionDiff[] = [];

    // Compare HTML
    if (versionA.html !== versionB.html) {
      diffs.push({
        type: 'modified',
        path: 'html',
        oldValue: versionA.html.substring(0, 100) + '...',
        newValue: versionB.html.substring(0, 100) + '...',
      });
    }

    // Compare manifest fields
    this.compareObjects(versionA.manifest, versionB.manifest, 'manifest', diffs);

    return diffs;
  }

  /**
   * Get version count for a draft
   */
  getVersionCount(draftId: string): number {
    return (this.versions.get(draftId) || []).length;
  }

  /**
   * Delete all versions for a draft
   */
  deleteVersions(draftId: string): void {
    this.versions.delete(draftId);
    this.saveToStorage();
  }

  /**
   * Clear all versions
   */
  clearAll(): void {
    this.versions.clear();
    this.saveToStorage();
  }

  // Private methods

  private compareObjects(a: any, b: any, path: string, diffs: VersionDiff[]): void {
    const keysA = Object.keys(a || {});
    const keysB = Object.keys(b || {});
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const fullPath = `${path}.${key}`;
      const valueA = a?.[key];
      const valueB = b?.[key];

      if (valueA === undefined && valueB !== undefined) {
        diffs.push({ type: 'added', path: fullPath, newValue: valueB });
      } else if (valueA !== undefined && valueB === undefined) {
        diffs.push({ type: 'removed', path: fullPath, oldValue: valueA });
      } else if (typeof valueA === 'object' && typeof valueB === 'object') {
        if (Array.isArray(valueA) && Array.isArray(valueB)) {
          if (JSON.stringify(valueA) !== JSON.stringify(valueB)) {
            diffs.push({ type: 'modified', path: fullPath, oldValue: valueA, newValue: valueB });
          }
        } else {
          this.compareObjects(valueA, valueB, fullPath, diffs);
        }
      } else if (valueA !== valueB) {
        diffs.push({ type: 'modified', path: fullPath, oldValue: valueA, newValue: valueB });
      }
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [draftId, versions] of Object.entries(data)) {
          this.versions.set(draftId, versions as DraftVersion[]);
        }
      }
    } catch (error) {
      console.error('[DraftVersioning] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, DraftVersion[]> = {};
      for (const [draftId, versions] of this.versions.entries()) {
        data[draftId] = versions;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[DraftVersioning] Failed to save to storage:', error);
    }
  }
}

// Singleton instance
let versioningInstance: DraftVersioningManager | null = null;

export function getDraftVersioning(): DraftVersioningManager {
  if (!versioningInstance) {
    versioningInstance = new DraftVersioningManager();
  }
  return versioningInstance;
}

export default DraftVersioningManager;

