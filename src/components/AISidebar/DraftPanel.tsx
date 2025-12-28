/**
 * StickerNest v2 - Draft Panel
 * Manages and displays draft widgets
 *
 * Updated with new design system: SNIcon, SNIconButton, SNButton
 */

import React, { useState } from 'react';
import { getDraftManager, type DraftWidget } from '../../ai/DraftManager';
import { SNIcon, type IconName } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNButton } from '../../shared-ui/SNButton';

export interface DraftPanelProps {
  drafts: DraftWidget[];
  onAddToCanvas: (draft: DraftWidget) => void;
  onPreview: (draft: DraftWidget) => void;
  onEdit?: (draft: DraftWidget) => void;
  onHistory?: (draft: DraftWidget) => void;
  onExport?: (draft: DraftWidget) => void;
  onConnect?: (draft: DraftWidget) => void;
}

export const DraftPanel: React.FC<DraftPanelProps> = ({
  drafts,
  onAddToCanvas,
  onPreview,
  onEdit,
  onHistory,
  onExport,
  onConnect,
}) => {
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

  const handleDiscard = (draftId: string) => {
    const draftManager = getDraftManager();
    draftManager.discardDraft(draftId);
  };

  const handleClearAll = () => {
    if (window.confirm('Discard all drafts?')) {
      const draftManager = getDraftManager();
      draftManager.clearAll();
    }
  };

  const getStatusColor = (status: DraftWidget['status']) => {
    switch (status) {
      case 'validated':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'validating':
      case 'saving':
        return '#f59e0b';
      case 'saved':
        return '#3b82f6';
      default:
        return '#94a3b8';
    }
  };

  const getStatusIcon = (status: DraftWidget['status']): IconName => {
    switch (status) {
      case 'validated':
      case 'saved':
        return 'success';
      case 'failed':
        return 'error';
      case 'validating':
      case 'saving':
        return 'loading';
      default:
        return 'file';
    }
  };

  const getStatusLabel = (status: DraftWidget['status']) => {
    switch (status) {
      case 'validated':
        return 'Validated';
      case 'failed':
        return 'Failed';
      case 'validating':
        return 'Validating';
      case 'saving':
        return 'Saving';
      case 'saved':
        return 'Saved';
      default:
        return 'Draft';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (drafts.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--sn-text-tertiary, #64748b)',
        }}
      >
        <div style={{ marginBottom: '12px', color: 'var(--sn-accent-primary, #8b5cf6)', opacity: 0.7 }}>
          <SNIcon name="file" size="2xl" />
        </div>
        <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--sn-text-secondary, #94a3b8)' }}>
          No drafts yet
        </div>
        <div style={{ fontSize: '0.75rem' }}>
          Generated widgets will appear here before being saved.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--sn-border-primary, rgba(255,255,255,0.1))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'var(--sn-text-secondary, #94a3b8)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <SNIcon name="file" size="xs" />
          {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
        </span>
        <SNButton
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          style={{ color: 'var(--sn-error, #ef4444)' }}
        >
          Clear All
        </SNButton>
      </div>

      {/* Draft List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {drafts.map((draft) => (
          <div
            key={draft.id}
            style={{
              background: 'var(--sn-glass-bg, rgba(255,255,255,0.05))',
              borderRadius: '8px',
              marginBottom: '8px',
              overflow: 'hidden',
              border: '1px solid var(--sn-border-primary, rgba(255,255,255,0.05))',
            }}
          >
            {/* Draft Header */}
            <div
              onClick={() =>
                setExpandedDraft(expandedDraft === draft.id ? null : draft.id)
              }
              style={{
                padding: '12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: 'var(--sn-text-primary, #e2e8f0)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <SNIcon name="widget" size="sm" />
                  {draft.manifest.name}
                </div>
                <div
                  style={{
                    color: 'var(--sn-text-tertiary, #64748b)',
                    fontSize: '0.7rem',
                    marginBottom: '4px',
                    marginLeft: 22,
                  }}
                >
                  {draft.manifest.id} v{draft.manifest.version}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 22 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: getStatusColor(draft.status),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <SNIcon
                      name={getStatusIcon(draft.status)}
                      size="xs"
                      spin={draft.status === 'validating' || draft.status === 'saving'}
                    />
                    {getStatusLabel(draft.status)}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--sn-text-tertiary, #64748b)' }}>
                    • {formatTime(draft.lastModified)}
                  </span>
                </div>
              </div>
              <span
                style={{
                  color: 'var(--sn-text-tertiary, #64748b)',
                  transition: 'transform 0.2s',
                  transform: expandedDraft === draft.id ? 'rotate(180deg)' : 'none',
                }}
              >
                <SNIcon name="chevronDown" size="sm" />
              </span>
            </div>

            {/* Expanded Content */}
            {expandedDraft === draft.id && (
              <div
                style={{
                  padding: '0 12px 12px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Validation Score */}
                {draft.validationResult && (
                  <div
                    style={{
                      padding: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      marginTop: '8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ color: '#94a3b8' }}>Validation Score</span>
                      <span
                        style={{
                          color:
                            draft.validationResult.score >= 80
                              ? '#10b981'
                              : draft.validationResult.score >= 50
                              ? '#f59e0b'
                              : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {draft.validationResult.score}/100
                      </span>
                    </div>
                    {draft.validationResult.errors.length > 0 && (
                      <div style={{ color: '#ef4444' }}>
                        {draft.validationResult.errors.length} error(s)
                      </div>
                    )}
                    {draft.validationResult.warnings.length > 0 && (
                      <div style={{ color: '#f59e0b' }}>
                        {draft.validationResult.warnings.length} warning(s)
                      </div>
                    )}
                  </div>
                )}

                {/* Security Report */}
                {draft.securityReport && (
                  <div
                    style={{
                      padding: '8px',
                      background: draft.securityReport.passed
                        ? 'rgba(16, 185, 129, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '4px',
                      marginTop: '8px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        color: draft.securityReport.passed ? '#10b981' : '#ef4444',
                        fontWeight: 600,
                        marginBottom: '4px',
                      }}
                    >
                      Security: {draft.securityReport.passed ? 'Passed' : 'Failed'}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      Score: {draft.securityReport.score}/100
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {draft.metadata?.prompt && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.65rem',
                        color: '#64748b',
                        marginBottom: '4px',
                      }}
                    >
                      Prompt
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {draft.metadata.prompt}
                    </div>
                  </div>
                )}

                {/* Primary Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px',
                  }}
                >
                  <SNButton
                    variant="glass"
                    size="sm"
                    leftIcon="eye"
                    onClick={() => onPreview(draft)}
                    style={{ flex: 1 }}
                  >
                    Preview
                  </SNButton>
                  <SNButton
                    variant="gradient"
                    size="sm"
                    leftIcon="add"
                    onClick={() => onAddToCanvas(draft)}
                    style={{ flex: 1 }}
                  >
                    Add to Canvas
                  </SNButton>
                </div>

                {/* Secondary Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    marginTop: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  {onEdit && (
                    <SNIconButton
                      icon="edit"
                      variant="glass"
                      size="sm"
                      tooltip="Edit code"
                      onClick={() => onEdit(draft)}
                    />
                  )}
                  {onConnect && (
                    <SNIconButton
                      icon="plug"
                      variant="glass"
                      size="sm"
                      tooltip="Connect to widgets"
                      onClick={() => onConnect(draft)}
                    />
                  )}
                  {onHistory && (
                    <SNIconButton
                      icon="history"
                      variant="glass"
                      size="sm"
                      tooltip="Version history"
                      onClick={() => onHistory(draft)}
                    />
                  )}
                  {onExport && (
                    <SNIconButton
                      icon="export"
                      variant="glass"
                      size="sm"
                      tooltip="Export widget"
                      onClick={() => onExport(draft)}
                    />
                  )}
                  <SNIconButton
                    icon="delete"
                    variant="danger"
                    size="sm"
                    tooltip="Discard draft"
                    onClick={() => handleDiscard(draft.id)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

