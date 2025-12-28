/**
 * StickerNest v2 - Version Types
 * Types for widget versioning and upgrade tracking
 */

// ==================
// Version Types
// ==================

/** Semantic version components */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/** Version constraint types */
export type VersionConstraint =
  | { type: 'exact'; version: string }
  | { type: 'range'; min?: string; max?: string }
  | { type: 'compatible'; version: string } // ^x.y.z
  | { type: 'approximate'; version: string }; // ~x.y.z

/** Widget version info */
export interface WidgetVersion {
  /** Widget definition ID */
  widgetDefId: string;
  /** Current version */
  version: string;
  /** Previous versions available */
  previousVersions?: string[];
  /** Changelog for current version */
  changelog?: string;
  /** Whether an update is available */
  updateAvailable?: boolean;
  /** Latest available version */
  latestVersion?: string;
  /** Breaking changes from previous version */
  breakingChanges?: string[];
}

/** Version history entry */
export interface VersionHistoryEntry {
  /** Version string */
  version: string;
  /** When this version was created */
  createdAt: number;
  /** Description of changes */
  description?: string;
  /** Widget HTML/code at this version */
  code?: string;
  /** Manifest at this version */
  manifest?: Record<string, unknown>;
  /** Who created this version */
  author?: string;
}

/** Widget version history */
export interface WidgetVersionHistory {
  /** Widget definition ID */
  widgetDefId: string;
  /** Version history */
  versions: VersionHistoryEntry[];
  /** Current version index */
  currentVersionIndex: number;
}

// ==================
// Version Helpers
// ==================

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): SemanticVersion {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
  );

  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

/**
 * Format a semantic version back to string
 */
export function formatVersion(version: SemanticVersion): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) result += `-${version.prerelease}`;
  if (version.build) result += `+${version.build}`;
  return result;
}

/**
 * Compare two version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (vA.major !== vB.major) return vA.major < vB.major ? -1 : 1;
  if (vA.minor !== vB.minor) return vA.minor < vB.minor ? -1 : 1;
  if (vA.patch !== vB.patch) return vA.patch < vB.patch ? -1 : 1;

  // Prerelease versions are lower than release
  if (vA.prerelease && !vB.prerelease) return -1;
  if (!vA.prerelease && vB.prerelease) return 1;

  // Compare prerelease strings
  if (vA.prerelease && vB.prerelease) {
    return vA.prerelease.localeCompare(vB.prerelease);
  }

  return 0;
}

/**
 * Increment version
 */
export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch'
): string {
  const parsed = parseVersion(version);

  switch (type) {
    case 'major':
      parsed.major++;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case 'minor':
      parsed.minor++;
      parsed.patch = 0;
      break;
    case 'patch':
      parsed.patch++;
      break;
  }

  // Clear prerelease on increment
  parsed.prerelease = undefined;

  return formatVersion(parsed);
}

/**
 * Check if version satisfies a constraint
 */
export function satisfiesConstraint(
  version: string,
  constraint: VersionConstraint
): boolean {
  switch (constraint.type) {
    case 'exact':
      return compareVersions(version, constraint.version) === 0;

    case 'range':
      if (constraint.min && compareVersions(version, constraint.min) < 0) return false;
      if (constraint.max && compareVersions(version, constraint.max) > 0) return false;
      return true;

    case 'compatible': {
      // ^x.y.z - compatible with x.y.z (same major, >= minor.patch)
      const base = parseVersion(constraint.version);
      const target = parseVersion(version);
      return (
        target.major === base.major &&
        (target.minor > base.minor ||
          (target.minor === base.minor && target.patch >= base.patch))
      );
    }

    case 'approximate': {
      // ~x.y.z - approximately equal (same major.minor, >= patch)
      const base = parseVersion(constraint.version);
      const target = parseVersion(version);
      return (
        target.major === base.major &&
        target.minor === base.minor &&
        target.patch >= base.patch
      );
    }

    default:
      return false;
  }
}

/**
 * Check if update is a breaking change
 */
export function isBreakingChange(oldVersion: string, newVersion: string): boolean {
  const oldParsed = parseVersion(oldVersion);
  const newParsed = parseVersion(newVersion);

  // Major version change is breaking
  return newParsed.major > oldParsed.major;
}

/**
 * Generate migration path between versions
 */
export function getMigrationPath(
  currentVersion: string,
  targetVersion: string,
  availableVersions: string[]
): string[] {
  const sorted = [...availableVersions].sort(compareVersions);
  const currentIndex = sorted.indexOf(currentVersion);
  const targetIndex = sorted.indexOf(targetVersion);

  if (currentIndex === -1 || targetIndex === -1) {
    return [];
  }

  if (currentIndex < targetIndex) {
    // Upgrade path
    return sorted.slice(currentIndex + 1, targetIndex + 1);
  } else {
    // Downgrade path
    return sorted.slice(targetIndex, currentIndex).reverse();
  }
}

export default {
  parseVersion,
  formatVersion,
  compareVersions,
  incrementVersion,
  satisfiesConstraint,
  isBreakingChange,
  getMigrationPath,
};
