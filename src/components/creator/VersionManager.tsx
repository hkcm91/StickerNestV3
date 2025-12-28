/**
 * StickerNest v2 - Version Manager
 *
 * Allows creators to view and publish new versions of their items.
 */

import React, { useState, useEffect } from 'react';

// ==================
// Types
// ==================

export interface ItemVersion {
  id: string;
  version: string;
  changelog: string;
  createdAt: string;
  downloads: number;
  isLatest: boolean;
}

interface VersionManagerProps {
  itemId: string;
  itemName: string;
  currentVersion: string;
  onClose: () => void;
  onPublishVersion?: (version: string, changelog: string) => Promise<boolean>;
}

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--sn-bg-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    maxWidth: 600,
    width: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--sn-border-primary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: 0,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--sn-text-muted)',
    fontSize: 20,
    cursor: 'pointer',
    padding: 4,
  },
  content: {
    padding: 24,
    overflow: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-secondary)',
    marginBottom: 12,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    background: 'var(--sn-bg-tertiary)',
    padding: 16,
    borderRadius: 'var(--sn-radius-md)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
  },
  input: {
    padding: '10px 14px',
    background: 'var(--sn-bg-secondary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    padding: '10px 14px',
    background: 'var(--sn-bg-secondary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 100,
    fontFamily: 'inherit',
  },
  button: {
    padding: '10px 20px',
    background: 'var(--sn-accent-primary)',
    border: 'none',
    borderRadius: 'var(--sn-radius-md)',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  versionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  versionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-md)',
  },
  versionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  versionNumber: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  latestBadge: {
    fontSize: 10,
    fontWeight: 600,
    background: 'var(--sn-success)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: 'var(--sn-radius-full)',
    textTransform: 'uppercase' as const,
  },
  versionMeta: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
  },
  versionChangelog: {
    fontSize: 12,
    color: 'var(--sn-text-secondary)',
    marginTop: 4,
  },
  versionStats: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 24,
    color: 'var(--sn-text-muted)',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    marginTop: 4,
  },
};

// ==================
// Helper Functions
// ==================

function incrementVersion(version: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3) return '1.0.1';

  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
    default:
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ==================
// Component
// ==================

export const VersionManager: React.FC<VersionManagerProps> = ({
  itemId,
  itemName,
  currentVersion,
  onClose,
  onPublishVersion,
}) => {
  const [versions, setVersions] = useState<ItemVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newVersion, setNewVersion] = useState(incrementVersion(currentVersion, 'patch'));
  const [changelog, setChangelog] = useState('');

  // Fetch versions on mount
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/marketplace/items/${itemId}/versions`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setVersions(data.versions || []);
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [itemId]);

  const handlePublish = async () => {
    if (!newVersion || !changelog.trim()) return;

    setIsPublishing(true);
    try {
      if (onPublishVersion) {
        const success = await onPublishVersion(newVersion, changelog);
        if (success) {
          // Add to local list
          setVersions((prev) => [
            {
              id: Date.now().toString(),
              version: newVersion,
              changelog,
              createdAt: new Date().toISOString(),
              downloads: 0,
              isLatest: true,
            },
            ...prev.map((v) => ({ ...v, isLatest: false })),
          ]);
          setNewVersion(incrementVersion(newVersion, 'patch'));
          setChangelog('');
        }
      } else {
        // Default API call
        const response = await fetch(`/api/marketplace/items/${itemId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ version: newVersion, changelog }),
        });

        if (response.ok) {
          const data = await response.json();
          setVersions((prev) => [
            { ...data.version, isLatest: true },
            ...prev.map((v) => ({ ...v, isLatest: false })),
          ]);
          setNewVersion(incrementVersion(newVersion, 'patch'));
          setChangelog('');
        }
      }
    } catch (error) {
      console.error('Failed to publish version:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle click outside to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Version Manager - {itemName}</h3>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.content}>
          {/* Publish New Version */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Publish New Version</div>
            <div style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Version Number</label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  style={styles.input}
                  placeholder="e.g., 1.0.1"
                />
                <div style={styles.hint}>
                  Current: {currentVersion} · Suggested: {incrementVersion(currentVersion, 'patch')}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Changelog</label>
                <textarea
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  style={styles.textarea}
                  placeholder="Describe what's new in this version..."
                />
              </div>

              <button
                onClick={handlePublish}
                disabled={isPublishing || !newVersion || !changelog.trim()}
                style={{
                  ...styles.button,
                  ...(isPublishing || !newVersion || !changelog.trim() ? styles.buttonDisabled : {}),
                }}
              >
                {isPublishing ? 'Publishing...' : 'Publish Version'}
              </button>
            </div>
          </div>

          {/* Version History */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Version History</div>
            {isLoading ? (
              <div style={styles.emptyState}>Loading versions...</div>
            ) : versions.length === 0 ? (
              <div style={styles.emptyState}>
                No versions published yet. Create your first version above.
              </div>
            ) : (
              <div style={styles.versionList}>
                {versions.map((version) => (
                  <div key={version.id} style={styles.versionItem}>
                    <div style={styles.versionInfo}>
                      <div style={styles.versionNumber}>
                        v{version.version}
                        {version.isLatest && <span style={styles.latestBadge}>Latest</span>}
                      </div>
                      <div style={styles.versionMeta}>
                        Published {formatDate(version.createdAt)}
                      </div>
                      {version.changelog && (
                        <div style={styles.versionChangelog}>{version.changelog}</div>
                      )}
                    </div>
                    <div style={styles.versionStats}>
                      {version.downloads.toLocaleString()} downloads
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionManager;
