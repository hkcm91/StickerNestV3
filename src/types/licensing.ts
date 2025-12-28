/**
 * StickerNest v2 - Creator Rights & Royalty Framework
 *
 * Widget License Manifest (WLM) v1.0
 *
 * This module defines the licensing, royalty, and AI access permission system
 * for all StickerNest assets including widgets, pipelines, stickers, themes, and templates.
 *
 * @see /Docs/LANGUAGE-LIBRARY.md for terminology
 * @version 1.0.0
 */

import { z } from 'zod';

// =============================================================================
// Core Enums & Constants
// =============================================================================

/**
 * Asset types that can be licensed
 */
export const AssetTypeSchema = z.enum([
  'widget',
  'pipeline',
  'sticker',
  'sticker-pack',
  'theme',
  'template',
  'scene',
  'asset', // Generic asset (image, audio, etc.)
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Visibility levels for assets
 */
export const VisibilityLevelSchema = z.enum([
  'public',      // Fully visible, discoverable
  'obfuscated',  // Available but code is protected
  'private',     // Only visible to owner
]);
export type VisibilityLevel = z.infer<typeof VisibilityLevelSchema>;

/**
 * AI access permission levels
 */
export const AIAccessLevelSchema = z.enum([
  'none',  // AI cannot access this asset
  'read',  // AI can analyze but not modify
  'edit',  // AI can suggest modifications (owner only)
  'full',  // AI can fully integrate, remix, generate derivatives
]);
export type AIAccessLevel = z.infer<typeof AIAccessLevelSchema>;

/**
 * Pipeline usage permission levels
 */
export const PipelineUsageLevelSchema = z.enum([
  'none',                  // Cannot be used in pipelines
  'read_only',             // Can be used but not modified
  'derivative_allowed',    // Can create derivatives
  'commercial_derivatives', // Can create commercial derivatives
]);
export type PipelineUsageLevel = z.infer<typeof PipelineUsageLevelSchema>;

/**
 * Fork restriction levels
 */
export const ForkRestrictionSchema = z.enum([
  'none',                     // No restrictions
  'allow_fork',               // Forks allowed
  'allow_fork_with_royalties', // Forks allowed with royalty obligations
  'no_forks',                 // No forks allowed
]);
export type ForkRestriction = z.infer<typeof ForkRestrictionSchema>;

/**
 * Contributor roles
 */
export const ContributorRoleSchema = z.enum([
  'developer',
  'artist',
  'designer',
  'pipeline_creator',
  'ai_contributor',
  'maintainer',
  'translator',
  'tester',
]);
export type ContributorRole = z.infer<typeof ContributorRoleSchema>;

/**
 * Derivation types for lineage tracking
 */
export const DerivationTypeSchema = z.enum([
  'original',     // This is the original asset
  'modified',     // Modified version of parent
  'incorporated', // Parent is incorporated into this
  'reference',    // References parent but doesn't include it
]);
export type DerivationType = z.infer<typeof DerivationTypeSchema>;

/**
 * Compliance status
 */
export const ComplianceStatusSchema = z.enum([
  'compliant',    // All licensing requirements met
  'needs_review', // Requires manual review
  'violation',    // Known licensing violation
  'pending',      // Not yet verified
]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

// =============================================================================
// Royalty System
// =============================================================================

/**
 * Royalty contributor - someone who earns from this asset
 */
export const RoyaltyContributorSchema = z.object({
  /** Contributor's user ID */
  id: z.string(),

  /** Role of this contributor */
  role: ContributorRoleSchema,

  /** Share of royalties (0.0 - 1.0) */
  share: z.number().min(0).max(1),

  /** Display name for attribution */
  displayName: z.string().optional(),

  /** Minimum payout threshold in cents */
  minPayout: z.number().int().min(0).optional(),
});
export type RoyaltyContributor = z.infer<typeof RoyaltyContributorSchema>;

/**
 * Royalty configuration
 */
export const RoyaltyConfigSchema = z.object({
  /** Whether royalties are enabled */
  enable: z.boolean().default(false),

  /** Base royalty rate (0.0 - 1.0) */
  rate: z.number().min(0).max(1).default(0),

  /** List of contributors and their shares */
  contributors: z.array(RoyaltyContributorSchema).default([]),

  /** Minimum royalty amount in cents */
  minimumAmount: z.number().int().min(0).optional(),

  /** Maximum royalty amount in cents (cap) */
  maximumAmount: z.number().int().min(0).optional(),

  /** Whether royalties stack with parent assets */
  stackable: z.boolean().default(true),
});
export type RoyaltyConfig = z.infer<typeof RoyaltyConfigSchema>;

// =============================================================================
// Derivative Rules
// =============================================================================

/**
 * Rules governing derivative works
 */
export const DerivativeRulesSchema = z.object({
  /** Whether forking is allowed */
  allowFork: z.boolean().default(true),

  /** Whether credit/attribution is required */
  requireCredit: z.boolean().default(true),

  /** Whether royalties are required for derivatives */
  requireRoyalty: z.boolean().default(false),

  /** Fork restriction level */
  forkRestrictions: ForkRestrictionSchema.default('allow_fork'),

  /** Custom attribution format */
  attributionFormat: z.string().optional(),

  /** Whether derivatives can be commercial */
  commercialDerivatives: z.boolean().default(true),

  /** Whether derivatives can change the license */
  allowLicenseChange: z.boolean().default(false),
});
export type DerivativeRules = z.infer<typeof DerivativeRulesSchema>;

// =============================================================================
// Resale Rules
// =============================================================================

/**
 * Rules governing resale and redistribution
 */
export const ResaleRulesSchema = z.object({
  /** Whether resale is allowed */
  allowResale: z.boolean().default(true),

  /** Whether listing in marketplace is allowed */
  allowInMarketplace: z.boolean().default(true),

  /** Whether free remix packs are allowed */
  allowFreeRemixPacks: z.boolean().default(false),

  /** Whether bundling with other assets is allowed */
  allowBundling: z.boolean().default(true),

  /** Minimum resale price in cents (if any) */
  minimumResalePrice: z.number().int().min(0).optional(),

  /** Required resale royalty percentage */
  resaleRoyaltyPercent: z.number().min(0).max(1).optional(),
});
export type ResaleRules = z.infer<typeof ResaleRulesSchema>;

// =============================================================================
// AI Access Configuration
// =============================================================================

/**
 * AI-specific access permissions
 */
export const AIAccessConfigSchema = z.object({
  /** Overall AI access level */
  level: AIAccessLevelSchema.default('none'),

  /** Whether AI can analyze this asset */
  canAnalyze: z.boolean().default(false),

  /** Whether AI can modify this asset */
  canModify: z.boolean().default(false),

  /** Whether AI can incorporate this into generated content */
  canIncorporate: z.boolean().default(false),

  /** Whether AI can train on this asset */
  canTrain: z.boolean().default(false),

  /** Specific AI models that are restricted */
  restrictedModels: z.array(z.string()).default([]),

  /** Specific AI models that are allowed (empty = all non-restricted) */
  allowedModels: z.array(z.string()).default([]),

  /** Whether AI-generated derivatives require disclosure */
  requireAIDisclosure: z.boolean().default(true),
});
export type AIAccessConfig = z.infer<typeof AIAccessConfigSchema>;

// =============================================================================
// License Configuration (Full WLM Schema)
// =============================================================================

/**
 * Complete license configuration for an asset
 * This is the core of the Widget License Manifest (WLM) v1.0
 */
export const LicenseConfigSchema = z.object({
  /** Visibility level */
  visibility: VisibilityLevelSchema.default('public'),

  /** AI access permissions */
  aiAccess: AIAccessLevelSchema.default('none'),

  /** Full AI access configuration */
  aiConfig: AIAccessConfigSchema.optional(),

  /** Pipeline usage permissions */
  pipelineUsage: PipelineUsageLevelSchema.default('read_only'),

  /** Rules for derivative works */
  derivativeRules: DerivativeRulesSchema.default({}),

  /** Rules for resale */
  resale: ResaleRulesSchema.default({}),

  /** Royalty configuration */
  royalties: RoyaltyConfigSchema.default({}),

  /** Whether to opt out of AI training globally */
  trainingOptOut: z.boolean().default(true),

  /** Geographic restrictions (ISO country codes) */
  restrictedCountries: z.array(z.string()).default([]),

  /** Restricted use cases */
  restrictedUseCases: z.array(z.string()).default([]),
});
export type LicenseConfig = z.infer<typeof LicenseConfigSchema>;

// =============================================================================
// Asset License Manifest (Complete Schema)
// =============================================================================

/**
 * Complete Asset License Manifest (WLM v1.0)
 * Every asset in StickerNest must include this manifest
 */
export const AssetLicenseManifestSchema = z.object({
  /** Unique asset ID */
  assetId: z.string(),

  /** Creator's user ID */
  creatorId: z.string(),

  /** Type of asset */
  assetType: AssetTypeSchema,

  /** Semantic version */
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/),

  /** License configuration */
  license: LicenseConfigSchema,

  /** Whether to opt out of AI training */
  trainingOptOut: z.boolean().default(true),

  /** Metadata version for schema evolution */
  metadataVersion: z.string().default('1.0'),

  /** When this license was last updated */
  updatedAt: z.string().datetime().optional(),

  /** Digital signature for verification (optional) */
  signature: z.string().optional(),
});
export type AssetLicenseManifest = z.infer<typeof AssetLicenseManifestSchema>;

// =============================================================================
// Asset Lineage (Dependency Tracking)
// =============================================================================

/**
 * A single node in the asset lineage tree
 */
export const AssetLineageNodeSchema = z.object({
  /** Asset ID */
  assetId: z.string(),

  /** Asset name for display */
  name: z.string(),

  /** Type of asset */
  assetType: AssetTypeSchema,

  /** Creator's user ID */
  creatorId: z.string(),

  /** Creator's display name */
  creatorName: z.string().optional(),

  /** How this asset relates to the parent */
  derivationType: DerivationTypeSchema,

  /** License information */
  license: z.object({
    visibility: VisibilityLevelSchema,
    aiAccess: AIAccessLevelSchema,
    requiresAttribution: z.boolean(),
    requiresRoyalty: z.boolean(),
    royaltyRate: z.number().min(0).max(1).optional(),
  }),

  /** Compliance status */
  complianceStatus: ComplianceStatusSchema,

  /** When this was added to the lineage */
  addedAt: z.string().datetime(),
});
export type AssetLineageNode = z.infer<typeof AssetLineageNodeSchema>;

/**
 * Complete asset lineage tree
 */
export const AssetLineageTreeSchema = z.object({
  /** Root asset ID */
  rootAssetId: z.string(),

  /** All nodes in the tree */
  nodes: z.array(AssetLineageNodeSchema),

  /** Parent-child relationships */
  edges: z.array(z.object({
    parentId: z.string(),
    childId: z.string(),
    derivationType: DerivationTypeSchema,
  })),

  /** Computed metrics */
  metrics: z.object({
    /** Total number of dependencies */
    totalDependencies: z.number(),

    /** Total royalty obligation (0.0 - 1.0) */
    totalRoyaltyRate: z.number(),

    /** Number of unique creators */
    uniqueCreators: z.number(),

    /** Whether all dependencies are compliant */
    isFullyCompliant: z.boolean(),

    /** List of compliance issues */
    complianceIssues: z.array(z.string()),
  }),

  /** When this tree was last computed */
  computedAt: z.string().datetime(),
});
export type AssetLineageTree = z.infer<typeof AssetLineageTreeSchema>;

// =============================================================================
// Royalty Calculation
// =============================================================================

/**
 * Individual royalty breakdown item
 */
export const RoyaltyBreakdownItemSchema = z.object({
  /** Asset ID contributing to royalty */
  assetId: z.string(),

  /** Asset name for display */
  assetName: z.string(),

  /** Creator's user ID */
  creatorId: z.string(),

  /** Creator's display name */
  creatorName: z.string().optional(),

  /** Royalty rate for this asset */
  royaltyRate: z.number().min(0).max(1),

  /** Calculated royalty amount in cents */
  royaltyAmount: z.number().int(),

  /** Contributors and their shares */
  contributors: z.array(z.object({
    id: z.string(),
    displayName: z.string().optional(),
    role: ContributorRoleSchema,
    share: z.number(),
    amount: z.number().int(),
  })),
});
export type RoyaltyBreakdownItem = z.infer<typeof RoyaltyBreakdownItemSchema>;

/**
 * Complete royalty calculation result
 */
export const RoyaltyCalculationSchema = z.object({
  /** Base price in cents */
  basePrice: z.number().int(),

  /** Total royalty amount in cents */
  totalRoyaltyAmount: z.number().int(),

  /** Effective royalty rate (cumulative) */
  effectiveRoyaltyRate: z.number().min(0).max(1),

  /** Net amount to primary creator in cents */
  netCreatorAmount: z.number().int(),

  /** Platform fee in cents */
  platformFee: z.number().int(),

  /** Breakdown by dependency */
  breakdown: z.array(RoyaltyBreakdownItemSchema),

  /** Whether any royalty caps were applied */
  capsApplied: z.boolean(),

  /** Warnings about the calculation */
  warnings: z.array(z.string()),

  /** When this calculation was made */
  calculatedAt: z.string().datetime(),
});
export type RoyaltyCalculation = z.infer<typeof RoyaltyCalculationSchema>;

// =============================================================================
// Compliance & Validation
// =============================================================================

/**
 * Compliance issue
 */
export const ComplianceIssueSchema = z.object({
  /** Issue severity */
  severity: z.enum(['error', 'warning', 'info']),

  /** Issue type */
  type: z.enum([
    'missing_attribution',
    'license_violation',
    'royalty_mismatch',
    'ai_access_violation',
    'geographic_restriction',
    'use_case_restriction',
    'missing_license',
    'circular_dependency',
    'expired_license',
  ]),

  /** Affected asset ID */
  assetId: z.string(),

  /** Human-readable message */
  message: z.string(),

  /** Suggested fix */
  suggestion: z.string().optional(),

  /** Whether this can be auto-fixed */
  autoFixable: z.boolean().default(false),
});
export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;

/**
 * Complete compliance report
 */
export const ComplianceReportSchema = z.object({
  /** Asset being checked */
  assetId: z.string(),

  /** Overall compliance status */
  status: ComplianceStatusSchema,

  /** List of issues found */
  issues: z.array(ComplianceIssueSchema),

  /** Number of errors */
  errorCount: z.number().int(),

  /** Number of warnings */
  warningCount: z.number().int(),

  /** When this report was generated */
  generatedAt: z.string().datetime(),

  /** Whether the asset can be published */
  canPublish: z.boolean(),

  /** Blocking issues that prevent publishing */
  blockingIssues: z.array(z.string()),
});
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

// =============================================================================
// AI Access Logging
// =============================================================================

/**
 * AI access log entry
 */
export const AIAccessLogEntrySchema = z.object({
  /** Log entry ID */
  id: z.string(),

  /** Asset being accessed */
  assetId: z.string(),

  /** User requesting access */
  requesterId: z.string(),

  /** Type of access */
  accessType: z.enum(['analyze', 'modify', 'incorporate', 'train']),

  /** AI model used */
  aiModel: z.string(),

  /** Whether access was allowed */
  allowed: z.boolean(),

  /** Reason for denial (if denied) */
  denialReason: z.string().optional(),

  /** Country code of requester */
  countryCode: z.string().optional(),

  /** Timestamp */
  timestamp: z.string().datetime(),
});
export type AIAccessLogEntry = z.infer<typeof AIAccessLogEntrySchema>;

// =============================================================================
// License Check Parameters & Results
// =============================================================================

/**
 * Parameters for checking license access
 */
export const LicenseCheckParamsSchema = z.object({
  /** Asset to check */
  assetId: z.string(),

  /** User requesting access */
  requesterId: z.string(),

  /** Type of access being requested */
  accessType: z.enum(['view', 'use', 'modify', 'incorporate', 'resell', 'ai_analyze', 'ai_modify', 'ai_train']),

  /** AI model (if AI access) */
  aiModel: z.string().optional(),

  /** Country code */
  countryCode: z.string().optional(),

  /** Intended use case */
  useCase: z.string().optional(),

  /** Whether this is for commercial use */
  isCommercial: z.boolean().default(false),
});
export type LicenseCheckParams = z.infer<typeof LicenseCheckParamsSchema>;

/**
 * Result of a license check
 */
export const LicenseCheckResultSchema = z.object({
  /** Whether access is allowed */
  allowed: z.boolean(),

  /** Reason for the decision */
  reason: z.enum([
    'licensed',
    'owner',
    'public_access',
    'denied_visibility',
    'denied_ai_access',
    'denied_derivative',
    'denied_commercial',
    'denied_country',
    'denied_use_case',
    'denied_model',
    'requires_royalty',
    'requires_attribution',
    'not_found',
  ]),

  /** License name/type */
  licenseName: z.string().optional(),

  /** Whether attribution is required */
  requiresAttribution: z.boolean().default(false),

  /** Attribution format if required */
  attributionFormat: z.string().optional(),

  /** Royalty required (in cents, if any) */
  royaltyRequired: z.number().int().optional(),

  /** Human-readable message */
  message: z.string().optional(),

  /** Additional details */
  details: z.record(z.unknown()).optional(),
});
export type LicenseCheckResult = z.infer<typeof LicenseCheckResultSchema>;

// =============================================================================
// Creator License Settings
// =============================================================================

/**
 * Default license settings for a creator
 * These are applied to new assets by default
 */
export const CreatorLicenseDefaultsSchema = z.object({
  /** Default visibility */
  defaultVisibility: VisibilityLevelSchema.default('public'),

  /** Default AI access level */
  defaultAIAccess: AIAccessLevelSchema.default('none'),

  /** Default pipeline usage level */
  defaultPipelineUsage: PipelineUsageLevelSchema.default('read_only'),

  /** Default royalty rate */
  defaultRoyaltyRate: z.number().min(0).max(1).default(0),

  /** Default derivative rules */
  defaultDerivativeRules: DerivativeRulesSchema.default({}),

  /** Default resale rules */
  defaultResaleRules: ResaleRulesSchema.default({}),

  /** Global training opt-out */
  globalTrainingOptOut: z.boolean().default(true),

  /** Attribution format for all assets */
  attributionFormat: z.string().default('Created by {creator}'),
});
export type CreatorLicenseDefaults = z.infer<typeof CreatorLicenseDefaultsSchema>;

// =============================================================================
// Marketplace Transparency
// =============================================================================

/**
 * Transparency information shown in marketplace
 */
export const MarketplaceTransparencySchema = z.object({
  /** Asset ID */
  assetId: z.string(),

  /** Base price in cents */
  basePrice: z.number().int(),

  /** Total royalty obligations */
  totalRoyaltyRate: z.number().min(0).max(1),

  /** Number of dependencies */
  dependencyCount: z.number().int(),

  /** Whether AI contributed to creation */
  aiContributed: z.boolean(),

  /** Whether human artists contributed */
  humanArtistsContributed: z.boolean(),

  /** Whether it uses protected assets */
  usesProtectedAssets: z.boolean(),

  /** Whether AI can modify this */
  aiCanModify: z.boolean(),

  /** Summary warnings */
  warnings: z.array(z.string()),

  /** Dependency breakdown (summary) */
  dependencySummary: z.array(z.object({
    name: z.string(),
    creator: z.string(),
    royaltyRate: z.number(),
  })),
});
export type MarketplaceTransparency = z.infer<typeof MarketplaceTransparencySchema>;

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default license configuration
 */
export const DEFAULT_LICENSE_CONFIG: LicenseConfig = {
  visibility: 'public',
  aiAccess: 'none',
  pipelineUsage: 'read_only',
  derivativeRules: {
    allowFork: true,
    requireCredit: true,
    requireRoyalty: false,
    forkRestrictions: 'allow_fork',
    commercialDerivatives: true,
    allowLicenseChange: false,
  },
  resale: {
    allowResale: true,
    allowInMarketplace: true,
    allowFreeRemixPacks: false,
    allowBundling: true,
  },
  royalties: {
    enable: false,
    rate: 0,
    contributors: [],
    stackable: true,
  },
  trainingOptOut: true,
  restrictedCountries: [],
  restrictedUseCases: [],
};

/**
 * Default creator license settings
 */
export const DEFAULT_CREATOR_LICENSE_DEFAULTS: CreatorLicenseDefaults = {
  defaultVisibility: 'public',
  defaultAIAccess: 'none',
  defaultPipelineUsage: 'read_only',
  defaultRoyaltyRate: 0,
  defaultDerivativeRules: DEFAULT_LICENSE_CONFIG.derivativeRules,
  defaultResaleRules: DEFAULT_LICENSE_CONFIG.resale,
  globalTrainingOptOut: true,
  attributionFormat: 'Created by {creator}',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if AI access is allowed based on config
 */
export function isAIAccessAllowed(
  config: LicenseConfig,
  accessType: 'analyze' | 'modify' | 'incorporate' | 'train',
  aiModel?: string
): boolean {
  const aiConfig = config.aiConfig;

  // Check overall AI access level first
  switch (config.aiAccess) {
    case 'none':
      return false;
    case 'read':
      if (accessType !== 'analyze') return false;
      break;
    case 'edit':
      if (accessType === 'train' || accessType === 'incorporate') return false;
      break;
    case 'full':
      // All access types allowed
      break;
  }

  // Check training opt-out
  if (accessType === 'train' && config.trainingOptOut) {
    return false;
  }

  // Check detailed AI config if present
  if (aiConfig) {
    switch (accessType) {
      case 'analyze':
        if (!aiConfig.canAnalyze) return false;
        break;
      case 'modify':
        if (!aiConfig.canModify) return false;
        break;
      case 'incorporate':
        if (!aiConfig.canIncorporate) return false;
        break;
      case 'train':
        if (!aiConfig.canTrain) return false;
        break;
    }

    // Check model restrictions
    if (aiModel) {
      if (aiConfig.restrictedModels.includes(aiModel)) {
        return false;
      }
      if (aiConfig.allowedModels.length > 0 && !aiConfig.allowedModels.includes(aiModel)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate effective royalty rate from a lineage tree
 */
export function calculateEffectiveRoyaltyRate(lineageTree: AssetLineageTree): number {
  let totalRate = 0;

  for (const node of lineageTree.nodes) {
    if (node.license.requiresRoyalty && node.license.royaltyRate) {
      totalRate += node.license.royaltyRate;
    }
  }

  // Cap at 50% maximum cumulative royalty
  return Math.min(totalRate, 0.5);
}

/**
 * Validate a license manifest
 */
export function validateLicenseManifest(manifest: unknown): {
  valid: boolean;
  errors: string[];
  manifest?: AssetLicenseManifest;
} {
  try {
    const parsed = AssetLicenseManifestSchema.parse(manifest);
    return { valid: true, errors: [], manifest: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }
    return { valid: false, errors: ['Unknown validation error'] };
  }
}
