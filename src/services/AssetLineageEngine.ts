/**
 * StickerNest v2 - Asset Lineage Tracking Engine (ALTE)
 *
 * Tracks the ancestry and dependencies of all assets for:
 * - Royalty calculation
 * - Attribution chain building
 * - Compliance verification
 * - Circular dependency detection
 *
 * @version 1.0.0
 */

import type {
  AssetType,
  AssetLineageNode,
  AssetLineageTree,
  DerivationType,
  ComplianceStatus,
  ComplianceIssue,
  LicenseConfig,
  RoyaltyCalculation,
  RoyaltyBreakdownItem,
} from '../types/licensing';

// =============================================================================
// Types
// =============================================================================

/**
 * Asset reference for lineage tracking
 */
export interface AssetReference {
  assetId: string;
  name: string;
  assetType: AssetType;
  creatorId: string;
  creatorName?: string;
  license: LicenseConfig;
  version: string;
}

/**
 * Dependency declaration from an asset manifest
 */
export interface AssetDependency {
  parentAssetId: string;
  derivationType: DerivationType;
  description?: string;
}

/**
 * Lineage storage interface
 */
export interface LineageStorage {
  getAsset(assetId: string): Promise<AssetReference | null>;
  getDependencies(assetId: string): Promise<AssetDependency[]>;
  getChildren(assetId: string): Promise<string[]>;
  saveDependency(childId: string, dependency: AssetDependency): Promise<void>;
  removeDependency(childId: string, parentId: string): Promise<void>;
}

/**
 * Lineage computation options
 */
export interface LineageComputationOptions {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Whether to include indirect dependencies */
  includeIndirect?: boolean;
  /** Whether to compute royalty metrics */
  computeRoyalties?: boolean;
  /** Whether to check compliance */
  checkCompliance?: boolean;
}

// =============================================================================
// Asset Lineage Tracking Engine
// =============================================================================

export class AssetLineageEngine {
  private storage: LineageStorage;
  private cache: Map<string, AssetLineageTree> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(storage: LineageStorage) {
    this.storage = storage;
  }

  /**
   * Build the complete lineage tree for an asset
   */
  async buildLineageTree(
    assetId: string,
    options: LineageComputationOptions = {}
  ): Promise<AssetLineageTree> {
    const {
      maxDepth = 10,
      includeIndirect = true,
      computeRoyalties = true,
      checkCompliance = true,
    } = options;

    // Check cache
    const cached = this.cache.get(assetId);
    if (cached && Date.now() - new Date(cached.computedAt).getTime() < this.cacheTimeout) {
      return cached;
    }

    const nodes: AssetLineageNode[] = [];
    const edges: Array<{ parentId: string; childId: string; derivationType: DerivationType }> = [];
    const visited = new Set<string>();
    const complianceIssues: string[] = [];

    // Build tree recursively
    await this.traverseLineage(
      assetId,
      null,
      'original' as DerivationType,
      0,
      maxDepth,
      nodes,
      edges,
      visited,
      complianceIssues
    );

    // Compute metrics
    const totalRoyaltyRate = computeRoyalties
      ? this.computeTotalRoyaltyRate(nodes)
      : 0;

    const uniqueCreators = new Set(nodes.map(n => n.creatorId)).size;

    const isFullyCompliant = checkCompliance
      ? nodes.every(n => n.complianceStatus === 'compliant')
      : true;

    const tree: AssetLineageTree = {
      rootAssetId: assetId,
      nodes,
      edges,
      metrics: {
        totalDependencies: nodes.length - 1, // Exclude root
        totalRoyaltyRate,
        uniqueCreators,
        isFullyCompliant,
        complianceIssues,
      },
      computedAt: new Date().toISOString(),
    };

    // Cache result
    this.cache.set(assetId, tree);

    return tree;
  }

  /**
   * Add a dependency to an asset
   */
  async addDependency(
    childAssetId: string,
    parentAssetId: string,
    derivationType: DerivationType,
    description?: string
  ): Promise<{ success: boolean; issues: ComplianceIssue[] }> {
    // Check for circular dependency
    const wouldCreateCycle = await this.wouldCreateCycle(childAssetId, parentAssetId);
    if (wouldCreateCycle) {
      return {
        success: false,
        issues: [{
          severity: 'error',
          type: 'circular_dependency',
          assetId: childAssetId,
          message: `Adding ${parentAssetId} as a dependency would create a circular reference`,
          autoFixable: false,
        }],
      };
    }

    // Check license compatibility
    const parent = await this.storage.getAsset(parentAssetId);
    if (!parent) {
      return {
        success: false,
        issues: [{
          severity: 'error',
          type: 'not_found' as any,
          assetId: parentAssetId,
          message: `Parent asset ${parentAssetId} not found`,
          autoFixable: false,
        }],
      };
    }

    // Check if derivatives are allowed
    if (!parent.license.derivativeRules.allowFork && derivationType !== 'reference') {
      return {
        success: false,
        issues: [{
          severity: 'error',
          type: 'license_violation',
          assetId: parentAssetId,
          message: `Asset ${parent.name} does not allow derivative works`,
          autoFixable: false,
        }],
      };
    }

    // Save the dependency
    await this.storage.saveDependency(childAssetId, {
      parentAssetId,
      derivationType,
      description,
    });

    // Invalidate cache
    this.invalidateCache(childAssetId);

    return { success: true, issues: [] };
  }

  /**
   * Remove a dependency
   */
  async removeDependency(childAssetId: string, parentAssetId: string): Promise<void> {
    await this.storage.removeDependency(childAssetId, parentAssetId);
    this.invalidateCache(childAssetId);
  }

  /**
   * Get all assets that depend on this asset (children)
   */
  async getChildren(assetId: string): Promise<string[]> {
    return this.storage.getChildren(assetId);
  }

  /**
   * Get direct dependencies of an asset (parents)
   */
  async getDependencies(assetId: string): Promise<AssetDependency[]> {
    return this.storage.getDependencies(assetId);
  }

  /**
   * Calculate royalties for a sale
   */
  async calculateRoyalties(
    assetId: string,
    salePrice: number,
    platformFeePercent: number = 0.15
  ): Promise<RoyaltyCalculation> {
    const tree = await this.buildLineageTree(assetId, {
      computeRoyalties: true,
    });

    const breakdown: RoyaltyBreakdownItem[] = [];
    let totalRoyaltyAmount = 0;

    // Calculate royalties for each dependency
    for (const node of tree.nodes) {
      if (node.assetId === assetId) continue; // Skip the root asset
      if (!node.license.requiresRoyalty || !node.license.royaltyRate) continue;

      const royaltyAmount = Math.floor(salePrice * node.license.royaltyRate);
      totalRoyaltyAmount += royaltyAmount;

      breakdown.push({
        assetId: node.assetId,
        assetName: node.name,
        creatorId: node.creatorId,
        creatorName: node.creatorName,
        royaltyRate: node.license.royaltyRate,
        royaltyAmount,
        contributors: [], // Would be populated from full license data
      });
    }

    // Apply caps if needed
    const maxRoyalty = Math.floor(salePrice * 0.5); // 50% cap
    const capsApplied = totalRoyaltyAmount > maxRoyalty;
    if (capsApplied) {
      // Scale down proportionally
      const scaleFactor = maxRoyalty / totalRoyaltyAmount;
      for (const item of breakdown) {
        item.royaltyAmount = Math.floor(item.royaltyAmount * scaleFactor);
      }
      totalRoyaltyAmount = maxRoyalty;
    }

    const platformFee = Math.floor(salePrice * platformFeePercent);
    const effectiveRoyaltyRate = salePrice > 0 ? totalRoyaltyAmount / salePrice : 0;
    const netCreatorAmount = salePrice - totalRoyaltyAmount - platformFee;

    const warnings: string[] = [];
    if (capsApplied) {
      warnings.push('Royalty cap of 50% was applied. Individual royalties were scaled proportionally.');
    }
    if (netCreatorAmount < salePrice * 0.35) {
      warnings.push('After royalties and fees, you will receive less than 35% of the sale price.');
    }

    return {
      basePrice: salePrice,
      totalRoyaltyAmount,
      effectiveRoyaltyRate,
      netCreatorAmount,
      platformFee,
      breakdown,
      capsApplied,
      warnings,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check compliance for an asset
   */
  async checkCompliance(assetId: string): Promise<ComplianceIssue[]> {
    const tree = await this.buildLineageTree(assetId, {
      checkCompliance: true,
    });

    const issues: ComplianceIssue[] = [];

    for (const node of tree.nodes) {
      if (node.assetId === assetId) continue; // Skip root

      // Check attribution requirements
      if (node.license.requiresAttribution) {
        // This would check against stored attribution data
        issues.push({
          severity: 'warning',
          type: 'missing_attribution',
          assetId: node.assetId,
          message: `Asset "${node.name}" requires attribution`,
          suggestion: `Add attribution: "Uses ${node.name} by ${node.creatorName || node.creatorId}"`,
          autoFixable: false,
        });
      }

      // Check for license violations based on status
      if (node.complianceStatus === 'violation') {
        issues.push({
          severity: 'error',
          type: 'license_violation',
          assetId: node.assetId,
          message: `Asset "${node.name}" has a licensing violation`,
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Generate attribution chain for an asset
   */
  async generateAttributionChain(assetId: string): Promise<string[]> {
    const tree = await this.buildLineageTree(assetId);
    const attributions: string[] = [];

    for (const node of tree.nodes) {
      if (node.assetId === assetId) continue;
      if (node.license.requiresAttribution) {
        const creator = node.creatorName || node.creatorId;
        attributions.push(`Uses "${node.name}" by ${creator}`);
      }
    }

    return attributions;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async traverseLineage(
    assetId: string,
    parentId: string | null,
    derivationType: DerivationType,
    depth: number,
    maxDepth: number,
    nodes: AssetLineageNode[],
    edges: Array<{ parentId: string; childId: string; derivationType: DerivationType }>,
    visited: Set<string>,
    complianceIssues: string[]
  ): Promise<void> {
    if (depth > maxDepth) {
      complianceIssues.push(`Max depth exceeded at asset ${assetId}`);
      return;
    }

    if (visited.has(assetId)) {
      complianceIssues.push(`Circular dependency detected at asset ${assetId}`);
      return;
    }

    visited.add(assetId);

    const asset = await this.storage.getAsset(assetId);
    if (!asset) {
      complianceIssues.push(`Asset ${assetId} not found`);
      return;
    }

    // Add node
    const node: AssetLineageNode = {
      assetId: asset.assetId,
      name: asset.name,
      assetType: asset.assetType,
      creatorId: asset.creatorId,
      creatorName: asset.creatorName,
      derivationType,
      license: {
        visibility: asset.license.visibility,
        aiAccess: asset.license.aiAccess,
        requiresAttribution: asset.license.derivativeRules.requireCredit,
        requiresRoyalty: asset.license.royalties.enable,
        royaltyRate: asset.license.royalties.rate,
      },
      complianceStatus: 'compliant' as ComplianceStatus, // Would be computed
      addedAt: new Date().toISOString(),
    };
    nodes.push(node);

    // Add edge if not root
    if (parentId) {
      edges.push({
        parentId: assetId,
        childId: parentId,
        derivationType,
      });
    }

    // Traverse dependencies (parents)
    const dependencies = await this.storage.getDependencies(assetId);
    for (const dep of dependencies) {
      await this.traverseLineage(
        dep.parentAssetId,
        assetId,
        dep.derivationType,
        depth + 1,
        maxDepth,
        nodes,
        edges,
        visited,
        complianceIssues
      );
    }
  }

  private async wouldCreateCycle(childId: string, newParentId: string): Promise<boolean> {
    const visited = new Set<string>();
    return this.detectCycle(newParentId, childId, visited);
  }

  private async detectCycle(
    currentId: string,
    targetId: string,
    visited: Set<string>
  ): Promise<boolean> {
    if (currentId === targetId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);

    const deps = await this.storage.getDependencies(currentId);
    for (const dep of deps) {
      if (await this.detectCycle(dep.parentAssetId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }

  private computeTotalRoyaltyRate(nodes: AssetLineageNode[]): number {
    let totalRate = 0;

    for (const node of nodes) {
      if (node.license.requiresRoyalty && node.license.royaltyRate) {
        totalRate += node.license.royaltyRate;
      }
    }

    // Cap at 50%
    return Math.min(totalRate, 0.5);
  }

  private invalidateCache(assetId: string): void {
    this.cache.delete(assetId);

    // Also invalidate children (assets that depend on this)
    // This would need async handling in a real implementation
  }

  /**
   * Clear all cached lineage trees
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// In-Memory Storage Implementation (for development/testing)
// =============================================================================

export class InMemoryLineageStorage implements LineageStorage {
  private assets: Map<string, AssetReference> = new Map();
  private dependencies: Map<string, AssetDependency[]> = new Map();

  async getAsset(assetId: string): Promise<AssetReference | null> {
    return this.assets.get(assetId) || null;
  }

  async getDependencies(assetId: string): Promise<AssetDependency[]> {
    return this.dependencies.get(assetId) || [];
  }

  async getChildren(assetId: string): Promise<string[]> {
    const children: string[] = [];

    for (const [childId, deps] of this.dependencies) {
      if (deps.some(d => d.parentAssetId === assetId)) {
        children.push(childId);
      }
    }

    return children;
  }

  async saveDependency(childId: string, dependency: AssetDependency): Promise<void> {
    const deps = this.dependencies.get(childId) || [];

    // Check if dependency already exists
    const existing = deps.findIndex(d => d.parentAssetId === dependency.parentAssetId);
    if (existing >= 0) {
      deps[existing] = dependency;
    } else {
      deps.push(dependency);
    }

    this.dependencies.set(childId, deps);
  }

  async removeDependency(childId: string, parentId: string): Promise<void> {
    const deps = this.dependencies.get(childId) || [];
    const filtered = deps.filter(d => d.parentAssetId !== parentId);
    this.dependencies.set(childId, filtered);
  }

  // Helper methods for testing
  registerAsset(asset: AssetReference): void {
    this.assets.set(asset.assetId, asset);
  }

  clear(): void {
    this.assets.clear();
    this.dependencies.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let lineageEngineInstance: AssetLineageEngine | null = null;

/**
 * Get or create the global lineage engine
 */
export function getLineageEngine(storage?: LineageStorage): AssetLineageEngine {
  if (!lineageEngineInstance) {
    if (!storage) {
      storage = new InMemoryLineageStorage();
    }
    lineageEngineInstance = new AssetLineageEngine(storage);
  }
  return lineageEngineInstance;
}

/**
 * Reset the lineage engine (for testing)
 */
export function resetLineageEngine(): void {
  lineageEngineInstance = null;
}

export default AssetLineageEngine;
