/**
 * StickerNest v2 - Version History
 * Timeline of draft versions with rollback capability
 *
 * Updated with new design system: SNIcon, SNIconButton, SNButton
 */

import React, { useState, useEffect } from 'react';
import { getDraftVersioning, type DraftVersion, type VersionDiff } from '../../ai/DraftVersioning';
import type { DraftWidget } from '../../ai/DraftManager';
import { SNIcon, type IconName } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNButton } from '../../shared-ui/SNButton';

export interface VersionHistoryProps {
  draft: DraftWidget;
  onRollback: (version: DraftVersion) => void;
  onCompare: (versionA: DraftVersion, versionB: DraftVersion) => void;
  onClose: () => void;
}

const CHANGE_TYPE_INFO: Record<DraftVersion['changeType'], { icon: IconName; label: string; color: string }> = {
  create: { icon: 'wand', label: 'Created', color: '#10b981' },
  edit: { icon: 'edit', label: 'Edited', color: '#8b5cf6' },
  regenerate: { icon: 'refresh', label: 'Regenerated', color: '#f59e0b' },
  import: { icon: 'import', label: 'Imported', color: '#3b82f6' },
};

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  draft,
  onRollback,
  onCompare,
  onClose,
}) => {
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState<VersionDiff[]>([]);

  const versioning = getDraftVersioning();

  // Load versions
  useEffect(() => {
    const loadVersions = () => {
      const draftVersions = versioning.getVersions(draft.id);
      setVersions(draftVersions);
    };

    loadVersions();
  }, [draft.id]);

  // Toggle version selection for comparison
  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        // Only allow 2 selections
        if (next.size >= 2) {
          const firstItem = next.values().next().value;
          if (firstItem) {
            next.delete(firstItem);
          }
        }
        next.add(versionId);
      }
      return next;
    });
  };

  // Compare selected versions
  const handleCompare = () => {
    const selected = Array.from(selectedVersions);
    if (selected.length !== 2) return;

    const diffs = versioning.compareVersions(draft.id, selected[0], selected[1]);
    setDiffResult(diffs);
    setShowDiff(true);

    const versionA = versions.find(v => v.id === selected[0]);
    const versionB = versions.find(v => v.id === selected[1]);
    if (versionA && versionB) {
      onCompare(versionA, versionB);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    // Less than an hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    // Format as date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
      }}>
        <h4 style={{ margin: 0, color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <SNIcon name="history" size="md" />
          Version History
        </h4>
        <SNIconButton
          icon="close"
          variant="ghost"
          size="sm"
          tooltip="Close"
          onClick={onClose}
        />
      </div>

      {/* Current Draft Info */}
      <div style={{
        padding: '10px 12px',
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: 6,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginBottom: 4 }}>
          Current Draft
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
          {draft.manifest.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
          {versions.length} version{versions.length !== 1 ? 's' : ''} saved
        </div>
      </div>

      {/* Compare Mode */}
      {selectedVersions.size === 2 && (
        <div style={{ display: 'flex', gap: 8 }}>
          <SNButton
            variant="gradient"
            leftIcon="search"
            onClick={handleCompare}
            style={{ flex: 1 }}
          >
            Compare Selected
          </SNButton>
          <SNButton
            variant="glass"
            onClick={() => setSelectedVersions(new Set())}
          >
            Clear
          </SNButton>
        </div>
      )}

      {/* Diff View */}
      {showDiff && diffResult.length > 0 && (
        <div style={{
          padding: 12,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 6,
          maxHeight: 150,
          overflowY: 'auto',
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#94a3b8', 
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Changes ({diffResult.length})</span>
            <button
              onClick={() => setShowDiff(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              Hide
            </button>
          </div>
          {diffResult.map((diff, i) => (
            <div 
              key={i}
              style={{
                padding: '6px 8px',
                background: diff.type === 'added' 
                  ? 'rgba(16, 185, 129, 0.1)'
                  : diff.type === 'removed'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(251, 191, 36, 0.1)',
                borderRadius: 4,
                marginBottom: 4,
                fontSize: '0.7rem',
              }}
            >
              <span style={{ 
                color: diff.type === 'added' 
                  ? '#10b981'
                  : diff.type === 'removed'
                  ? '#ef4444'
                  : '#fbbf24',
                marginRight: 8,
              }}>
                {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : '~'}
              </span>
              <span style={{ color: '#94a3b8' }}>{diff.path}</span>
            </div>
          ))}
        </div>
      )}

      {/* Version Timeline */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {versions.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 30,
            color: 'var(--sn-text-tertiary, #64748b)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 8, color: 'var(--sn-accent-primary, #8b5cf6)', opacity: 0.7 }}>
              <SNIcon name="history" size="2xl" />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--sn-text-secondary, #94a3b8)' }}>No versions saved yet</span>
            <span style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Versions are saved automatically as you edit
            </span>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 6,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'rgba(255,255,255,0.1)',
            }} />

            {versions.map((version, index) => {
              const info = CHANGE_TYPE_INFO[version.changeType];
              const isSelected = selectedVersions.has(version.id);
              const isLatest = index === 0;

              return (
                <div
                  key={version.id}
                  style={{
                    position: 'relative',
                    paddingLeft: 16,
                    paddingBottom: 16,
                  }}
                >
                  {/* Timeline dot */}
                  <div
                    onClick={() => toggleVersionSelection(version.id)}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 4,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: isSelected ? '#8b5cf6' : info.color,
                      border: isSelected ? '3px solid rgba(139, 92, 246, 0.5)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  />

                  {/* Version card */}
                  <div
                    style={{
                      padding: '10px 12px',
                      background: isSelected 
                        ? 'rgba(139, 92, 246, 0.1)' 
                        : 'rgba(255,255,255,0.03)',
                      borderRadius: 6,
                      border: isSelected 
                        ? '1px solid rgba(139, 92, 246, 0.4)'
                        : '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: info.color }}>
                          <SNIcon name={info.icon} size="sm" />
                        </span>
                        <span style={{
                          fontSize: '0.8rem',
                          color: 'var(--sn-text-primary, #e2e8f0)',
                          fontWeight: 500,
                        }}>
                          Version {version.versionNumber}
                        </span>
                        {isLatest && (
                          <span style={{
                            fontSize: '0.6rem',
                            padding: '2px 6px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: 4,
                            color: 'var(--sn-success, #10b981)',
                          }}>
                            LATEST
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--sn-text-tertiary, #64748b)' }}>
                        {formatTime(version.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', color: info.color }}>
                      {info.label}
                    </div>

                    {version.description && (
                      <p style={{ 
                        margin: '6px 0 0 0', 
                        fontSize: '0.75rem', 
                        color: '#94a3b8',
                      }}>
                        {version.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 8,
                    }}>
                      {!isLatest && (
                        <SNButton
                          variant="glass"
                          size="sm"
                          leftIcon="undo"
                          onClick={() => onRollback(version)}
                          style={{ color: '#fbbf24' }}
                        >
                          Rollback
                        </SNButton>
                      )}
                      <SNButton
                        variant={isSelected ? 'primary' : 'ghost'}
                        size="sm"
                        leftIcon={isSelected ? 'success' : 'circle'}
                        onClick={() => toggleVersionSelection(version.id)}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </SNButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{ 
        fontSize: '0.7rem', 
        color: '#64748b', 
        textAlign: 'center',
        paddingTop: 8,
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        Select 2 versions to compare • Click rollback to restore
      </div>
    </div>
  );
};

export default VersionHistory;

