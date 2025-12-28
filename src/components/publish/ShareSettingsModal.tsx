/**
 * ShareSettingsModal Component
 * Modal for updating canvas share settings (visibility, slug, password)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { VisibilitySelector } from './VisibilitySelector';
import { SlugEditor } from './SlugEditor';
import { getCanvasManager } from '../../services/canvasManager';
import type { CanvasVisibility } from '../../types/domain';

interface ShareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  canvasName: string;
  currentVisibility: CanvasVisibility;
  currentSlug?: string;
  hasPassword?: boolean;
  onSaved?: (result: { url: string; slug: string; visibility: CanvasVisibility }) => void;
}

export const ShareSettingsModal: React.FC<ShareSettingsModalProps> = ({
  isOpen,
  onClose,
  canvasId,
  canvasName,
  currentVisibility,
  currentSlug,
  hasPassword = false,
  onSaved,
}) => {
  const [visibility, setVisibility] = useState<CanvasVisibility>(currentVisibility);
  const [slug, setSlug] = useState(currentSlug || '');
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | undefined>(undefined);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setVisibility(currentVisibility);
      setSlug(currentSlug || '');
      setPassword(undefined);
      setError(null);
      setIsSlugAvailable(undefined);
    }
  }, [isOpen, currentVisibility, currentSlug]);

  // Mock slug availability check
  const checkSlugAvailability = useCallback(async (slugToCheck: string): Promise<boolean> => {
    if (slugToCheck === currentSlug) return true; // Current slug is always available

    setIsCheckingSlug(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock: consider slug unavailable if it's a common word
    const unavailable = ['test', 'demo', 'admin', 'canvas', 'public', 'private'];
    const available = !unavailable.includes(slugToCheck.toLowerCase());

    setIsSlugAvailable(available);
    setIsCheckingSlug(false);
    return available;
  }, [currentSlug]);

  const handleSave = async () => {
    if (visibility !== 'private' && !slug) {
      setError('Please set a URL for your canvas');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const manager = getCanvasManager('current-user');
      const result = await manager.updateShareSettings(canvasId, {
        visibility,
        slug: visibility !== 'private' ? slug : undefined,
        password,
      });

      if (result.success && result.data) {
        onSaved?.(result.data);
        onClose();
      } else {
        setError(result.error || 'Failed to update settings');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const shareUrl = slug ? `${window.location.origin}/c/${slug}` : '';

  const handleCopyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <SNIcon name="share" size={20} color="#8b5cf6" />
            </div>
            <div>
              <h2 style={styles.title}>Share Settings</h2>
              <p style={styles.subtitle}>{canvasName}</p>
            </div>
          </div>
          <SNIconButton
            icon="x"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Error */}
          {error && (
            <div style={styles.error}>
              <SNIcon name="alertCircle" size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Visibility Selector */}
          <VisibilitySelector
            value={visibility}
            onChange={setVisibility}
            onPasswordChange={setPassword}
            hasPassword={hasPassword}
          />

          {/* Slug Editor (only for non-private) */}
          {visibility !== 'private' && (
            <SlugEditor
              value={slug}
              onChange={setSlug}
              isAvailable={isSlugAvailable}
              isChecking={isCheckingSlug}
              onCheckAvailability={checkSlugAvailability}
            />
          )}

          {/* Share URL Preview (for non-private with slug) */}
          {visibility !== 'private' && slug && (
            <div style={styles.sharePreview}>
              <div style={styles.shareHeader}>
                <SNIcon name="link" size={14} color="#22c55e" />
                <span>Share Link</span>
              </div>
              <div style={styles.shareUrl}>
                <span style={styles.shareUrlText}>{shareUrl}</span>
                <button
                  style={styles.copyButton}
                  onClick={handleCopyUrl}
                >
                  <SNIcon name={showCopySuccess ? 'check' : 'copy'} size={14} />
                  {showCopySuccess ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Quick Share Options */}
              <div style={styles.quickShare}>
                <span style={styles.quickShareLabel}>Share via:</span>
                <div style={styles.quickShareButtons}>
                  <button
                    style={styles.socialButton}
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my canvas: ${canvasName}`)}`, '_blank')}
                    title="Share on Twitter"
                  >
                    <SNIcon name="twitter" size={16} />
                  </button>
                  <button
                    style={styles.socialButton}
                    onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')}
                    title="Share on LinkedIn"
                  >
                    <SNIcon name="linkedin" size={16} />
                  </button>
                  <button
                    style={styles.socialButton}
                    onClick={() => window.open(`mailto:?subject=${encodeURIComponent(canvasName)}&body=${encodeURIComponent(`Check out this canvas: ${shareUrl}`)}`, '_blank')}
                    title="Share via Email"
                  >
                    <SNIcon name="mail" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Embed Code (for public/unlisted) */}
          {(visibility === 'public' || visibility === 'unlisted') && slug && (
            <div style={styles.embedSection}>
              <div style={styles.embedHeader}>
                <SNIcon name="code" size={14} color="#64748b" />
                <span>Embed Code</span>
              </div>
              <textarea
                readOnly
                value={`<iframe src="${window.location.origin}/embed/${slug}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`}
                style={styles.embedCode}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <SNButton variant="ghost" onClick={onClose}>
            Cancel
          </SNButton>
          <SNButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || (visibility !== 'private' && !slug)}
          >
            {isSaving ? (
              <>
                <div style={styles.spinner} />
                Saving...
              </>
            ) : (
              <>
                <SNIcon name="check" size={14} />
                Save Settings
              </>
            )}
          </SNButton>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
  },

  // Content
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 24,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 13,
    color: '#ef4444',
  },

  // Share Preview
  sharePreview: {
    padding: 16,
    background: 'rgba(34, 197, 94, 0.05)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 12,
    marginBottom: 20,
  },
  shareHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 600,
    color: '#22c55e',
  },
  shareUrl: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(15, 15, 25, 0.8)',
    borderRadius: 8,
  },
  shareUrlText: {
    flex: 1,
    fontSize: 13,
    color: '#f1f5f9',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 6,
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Quick Share
  quickShare: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  quickShareLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  quickShareButtons: {
    display: 'flex',
    gap: 8,
  },
  socialButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Embed Section
  embedSection: {
    marginBottom: 20,
  },
  embedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 500,
    color: '#64748b',
  },
  embedCode: {
    width: '100%',
    padding: 12,
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    resize: 'none',
    height: 60,
  },

  // Footer
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: 8,
  },
};

export default ShareSettingsModal;
