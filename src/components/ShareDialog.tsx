/**
 * StickerNest v2 - Share Dialog
 * Dialog for configuring canvas sharing settings: visibility, URL, password
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { CanvasVisibility, CanvasShareSettings } from '../types/domain';
import { generateShareUrl, generateEmbedCode } from '../router/AppRouter';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { SNButton } from '../shared-ui/SNButton';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  onUpdateSettings: (canvasId: string, settings: CanvasShareSettings) => Promise<any>;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  canvasId,
  onUpdateSettings,
}) => {
  const [visibility, setVisibility] = useState<CanvasVisibility>('private');
  const [customSlug, setCustomSlug] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'embed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate a random slug
  const generateRandomSlug = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars[Math.floor(Math.random() * chars.length)];
    }
    return slug;
  }, []);

  // Initialize with a random slug
  useEffect(() => {
    if (isOpen && !customSlug) {
      setCustomSlug(generateRandomSlug());
    }
  }, [isOpen, customSlug, generateRandomSlug]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShareUrl(null);
      setEmbedCode(null);
      setError(null);
      setCopied(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);

    // Validate password confirmation
    if (usePassword && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate slug
    if (visibility !== 'private' && !customSlug.trim()) {
      setError('URL slug is required for public/unlisted canvases');
      return;
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    if (customSlug && !/^[a-z0-9-]+$/.test(customSlug)) {
      setError('URL slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsSaving(true);
    try {
      const settings: CanvasShareSettings = {
        visibility,
        slug: visibility !== 'private' ? customSlug : undefined,
        password: usePassword && password ? password : undefined,
      };

      const result = await onUpdateSettings(canvasId, settings);

      if (result.success && result.data) {
        setShareUrl(result.data.url);
        setEmbedCode(generateEmbedCode(result.data.slug));
      } else {
        setError(result.error || 'Failed to update sharing settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SNIcon name="share" size="lg" />
            <h2 style={styles.title}>Share Canvas</h2>
          </div>
          <SNIconButton
            icon="close"
            variant="ghost"
            size="sm"
            tooltip="Close"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Visibility selector */}
          <div style={styles.section}>
            <label style={styles.label}>Visibility</label>
            <div style={styles.visibilityOptions}>
              <button
                style={{
                  ...styles.visibilityButton,
                  ...(visibility === 'private' ? styles.visibilityActive : {}),
                }}
                onClick={() => setVisibility('private')}
              >
                <span style={styles.visibilityIcon}><SNIcon name="lock" size="lg" /></span>
                <span style={styles.visibilityLabel}>Private</span>
                <span style={styles.visibilityDesc}>Only you can access</span>
              </button>
              <button
                style={{
                  ...styles.visibilityButton,
                  ...(visibility === 'unlisted' ? styles.visibilityActive : {}),
                }}
                onClick={() => setVisibility('unlisted')}
              >
                <span style={styles.visibilityIcon}><SNIcon name="link" size="lg" /></span>
                <span style={styles.visibilityLabel}>Unlisted</span>
                <span style={styles.visibilityDesc}>Anyone with the link</span>
              </button>
              <button
                style={{
                  ...styles.visibilityButton,
                  ...(visibility === 'public' ? styles.visibilityActive : {}),
                }}
                onClick={() => setVisibility('public')}
              >
                <span style={styles.visibilityIcon}><SNIcon name="globe" size="lg" /></span>
                <span style={styles.visibilityLabel}>Public</span>
                <span style={styles.visibilityDesc}>Discoverable by all</span>
              </button>
            </div>
          </div>

          {/* URL slug (only for non-private) */}
          {visibility !== 'private' && (
            <div style={styles.section}>
              <label style={styles.label}>Share URL</label>
              <div style={styles.slugInputGroup}>
                <span style={styles.slugPrefix}>stickernest.vercel.app/c/</span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-custom-url"
                  style={styles.slugInput}
                />
                <SNIconButton
                  icon="refresh"
                  variant="glass"
                  size="sm"
                  tooltip="Generate random URL"
                  onClick={() => setCustomSlug(generateRandomSlug())}
                />
              </div>
            </div>
          )}

          {/* Password protection (only for non-private) */}
          {visibility !== 'private' && (
            <div style={styles.section}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  style={styles.checkbox}
                />
                Require password to view
              </label>

              {usePassword && (
                <div style={styles.passwordFields}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={styles.input}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    style={styles.input}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div style={styles.error}>{error}</div>
          )}

          {/* Share URL result */}
          {shareUrl && (
            <div style={styles.resultSection}>
              <label style={styles.label}>Share Link</label>
              <div style={styles.resultBox}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={styles.resultInput}
                />
                <button
                  onClick={() => copyToClipboard(shareUrl, 'url')}
                  style={styles.copyButton}
                >
                  {copied === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Embed code */}
              <label style={{ ...styles.label, marginTop: 16 }}>Embed Code</label>
              <div style={styles.resultBox}>
                <textarea
                  value={embedCode || ''}
                  readOnly
                  style={styles.embedTextarea}
                />
                <button
                  onClick={() => embedCode && copyToClipboard(embedCode, 'embed')}
                  style={styles.copyButton}
                >
                  {copied === 'embed' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <SNButton variant="ghost" onClick={onClose}>
            Cancel
          </SNButton>
          <SNButton
            variant="gradient"
            leftIcon={isSaving ? 'loading' : 'share'}
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : shareUrl ? 'Update Settings' : 'Generate Share Link'}
          </SNButton>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--sn-bg-overlay, rgba(0, 0, 0, 0.7))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  dialog: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
    borderRadius: 'var(--sn-radius-xl, 16px)',
    width: '90%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.1)',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.1))',
    color: 'var(--sn-accent-primary, #8b5cf6)',
  },
  title: {
    margin: 0,
    color: 'var(--sn-text-primary, #f0f4f8)',
    fontSize: 'var(--sn-text-xl, 20px)',
    fontWeight: 600,
  },
  content: {
    padding: 24,
    flex: 1,
    overflow: 'auto',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
  },
  visibilityOptions: {
    display: 'flex',
    gap: 10,
  },
  visibilityButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  visibilityActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  visibilityIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  visibilityLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 4,
  },
  visibilityDesc: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
  },
  slugInputGroup: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  slugPrefix: {
    padding: '12px 0 12px 14px',
    color: '#64748b',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  slugInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: 13,
    padding: '12px 0',
    outline: 'none',
  },
  regenerateButton: {
    background: 'rgba(139, 92, 246, 0.2)',
    border: 'none',
    padding: '12px 14px',
    cursor: 'pointer',
    fontSize: 16,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: '#8b5cf6',
  },
  passwordFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#f87171',
    fontSize: 13,
    marginBottom: 16,
  },
  resultSection: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  resultBox: {
    display: 'flex',
    gap: 8,
  },
  resultInput: {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#10b981',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  embedTextarea: {
    flex: 1,
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    padding: '10px 12px',
    color: '#10b981',
    fontSize: 11,
    fontFamily: 'monospace',
    resize: 'none',
    height: 60,
  },
  copyButton: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    padding: '10px 16px',
    color: '#10b981',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveButton: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default ShareDialog;
