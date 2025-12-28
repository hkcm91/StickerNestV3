/**
 * ShareModal Component
 * Modal for sharing profiles and canvases
 */

import React, { useState } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import type { SharePlatform, ShareData } from '../../types/profile';

interface ShareModalProps {
  /** Share data */
  data: ShareData;
  /** Whether sharing a profile or canvas */
  type: 'profile' | 'canvas';
  /** Embed code (for canvases) */
  embedCode?: string;
  /** Close handler */
  onClose: () => void;
  /** Is open */
  isOpen: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  data,
  type,
  embedCode,
  onClose,
  isOpen,
}) => {
  const [copied, setCopied] = useState<'url' | 'embed' | null>(null);
  const [activeTab, setActiveTab] = useState<'share' | 'embed'>('share');

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: 'url' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = (platform: SharePlatform) => {
    const { url, title, description } = data;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDesc = encodeURIComponent(description || '');

    const shareUrls: Record<SharePlatform, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
      copy: url,
    };

    if (platform === 'copy') {
      handleCopy(url, 'url');
      return;
    }

    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer,width=600,height=400');
  };

  const socialButtons: { platform: SharePlatform; icon: string; label: string; color: string }[] = [
    { platform: 'twitter', icon: 'twitter', label: 'Twitter', color: '#1DA1F2' },
    { platform: 'facebook', icon: 'facebook', label: 'Facebook', color: '#4267B2' },
    { platform: 'linkedin', icon: 'linkedin', label: 'LinkedIn', color: '#0077B5' },
    { platform: 'email', icon: 'mail', label: 'Email', color: '#EA4335' },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            Share {type === 'profile' ? 'Profile' : 'Canvas'}
          </h2>
          <SNIconButton
            icon="x"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        {/* Tabs (only for canvas) */}
        {type === 'canvas' && embedCode && (
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'share' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('share')}
            >
              Share
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'embed' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('embed')}
            >
              Embed
            </button>
          </div>
        )}

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div style={styles.content}>
            {/* URL Input */}
            <div style={styles.section}>
              <label style={styles.label}>Link</label>
              <div style={styles.urlRow}>
                <input
                  type="text"
                  value={data.url}
                  readOnly
                  style={styles.urlInput}
                />
                <SNButton
                  variant={copied === 'url' ? 'secondary' : 'primary'}
                  onClick={() => handleCopy(data.url, 'url')}
                >
                  {copied === 'url' ? 'Copied!' : 'Copy'}
                </SNButton>
              </div>
            </div>

            {/* Social Buttons */}
            <div style={styles.section}>
              <label style={styles.label}>Share on</label>
              <div style={styles.socialRow}>
                {socialButtons.map(({ platform, icon, label, color }) => (
                  <button
                    key={platform}
                    style={styles.socialButton}
                    onClick={() => handleShare(platform)}
                    title={label}
                  >
                    <div
                      style={{
                        ...styles.socialIcon,
                        background: color,
                      }}
                    >
                      <SNIcon name={icon as any} size={18} color="#fff" />
                    </div>
                    <span style={styles.socialLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code placeholder */}
            <div style={styles.section}>
              <label style={styles.label}>QR Code</label>
              <div style={styles.qrContainer}>
                <div style={styles.qrPlaceholder}>
                  <SNIcon name="qrCode" size={32} color="#64748b" />
                  <span style={styles.qrText}>Scan to view</span>
                </div>
                <SNButton variant="ghost" size="sm">
                  Download PNG
                </SNButton>
              </div>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && embedCode && (
          <div style={styles.content}>
            <div style={styles.section}>
              <label style={styles.label}>Embed Code</label>
              <div style={styles.embedContainer}>
                <textarea
                  value={embedCode}
                  readOnly
                  style={styles.embedTextarea}
                  rows={4}
                />
                <SNButton
                  variant={copied === 'embed' ? 'secondary' : 'primary'}
                  onClick={() => handleCopy(embedCode, 'embed')}
                  fullWidth
                >
                  {copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}
                </SNButton>
              </div>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Preview</label>
              <div style={styles.previewContainer}>
                <div style={styles.previewFrame}>
                  <SNIcon name="layout" size={24} color="#64748b" />
                  <span style={styles.previewText}>Canvas Preview</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    padding: '0 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  urlRow: {
    display: 'flex',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
  },
  socialRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  socialButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  qrContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  qrPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrText: {
    fontSize: 10,
    color: '#64748b',
  },
  embedContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  embedTextarea: {
    width: '100%',
    padding: 12,
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 12,
    fontFamily: 'monospace',
    resize: 'none',
    outline: 'none',
  },
  previewContainer: {
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  previewFrame: {
    aspectRatio: '16 / 9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(139, 92, 246, 0.05)',
  },
  previewText: {
    fontSize: 12,
    color: '#64748b',
  },
};

export default ShareModal;
