/**
 * SaveSharePanel
 * Save and share functionality for canvas editor
 */

import React from 'react';
import {
  Save,
  Lock,
  Link2,
  Globe,
  RefreshCw,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CanvasVisibility } from '../../types/domain';

const styles = {
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    color: '#e2e8f0',
    textDecoration: 'none',
  },
};

export interface SaveSharePanelProps {
  showSavePanel: boolean;
  setShowSavePanel: (show: boolean) => void;
  visibility: CanvasVisibility;
  setVisibility: (vis: CanvasVisibility) => void;
  customSlug: string;
  setCustomSlug: (slug: string) => void;
  shareUrl: string | null;
  copied: boolean;
  isSaving: boolean;
  saveStatus: string | null;
  onSaveWithVisibility: () => Promise<void>;
  onCreateCanvas: () => Promise<void>;
  onCopyToClipboard: (text: string) => Promise<void>;
  generateRandomSlug: () => string;
}

export const SaveSharePanel: React.FC<SaveSharePanelProps> = ({
  showSavePanel,
  setShowSavePanel,
  visibility,
  setVisibility,
  customSlug,
  setCustomSlug,
  shareUrl,
  copied,
  isSaving,
  saveStatus,
  onSaveWithVisibility,
  onCreateCanvas,
  onCopyToClipboard,
  generateRandomSlug,
}) => {
  return (
    <div className="sn-features">
      {/* Save Panel Header - Expandable */}
      <button
        onClick={() => setShowSavePanel(!showSavePanel)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--sn-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Save size={16} style={{ color: 'var(--sn-cozy-mint)' }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Save & Share</span>
        </div>
        {showSavePanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Save Panel */}
      {showSavePanel && (
        <div style={{ marginTop: 12 }}>
          {/* Visibility Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--sn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
              Visibility
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Private */}
              <button
                onClick={() => setVisibility('private')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 8px',
                  background: visibility === 'private' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${visibility === 'private' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Lock size={18} style={{ color: visibility === 'private' ? '#a78bfa' : '#94a3b8' }} />
                <span style={{ fontSize: 12, color: visibility === 'private' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Private</span>
              </button>

              {/* Unlisted */}
              <button
                onClick={() => setVisibility('unlisted')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 8px',
                  background: visibility === 'unlisted' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${visibility === 'unlisted' ? 'rgba(251, 146, 60, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Link2 size={18} style={{ color: visibility === 'unlisted' ? '#fb923c' : '#94a3b8' }} />
                <span style={{ fontSize: 12, color: visibility === 'unlisted' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Unlisted</span>
              </button>

              {/* Public */}
              <button
                onClick={() => setVisibility('public')}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 8px',
                  background: visibility === 'public' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${visibility === 'public' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Globe size={18} style={{ color: visibility === 'public' ? '#10b981' : '#94a3b8' }} />
                <span style={{ fontSize: 12, color: visibility === 'public' ? '#e2e8f0' : '#94a3b8', fontWeight: 500 }}>Public</span>
              </button>
            </div>
          </div>

          {/* Slug URL Input (only for non-private) */}
          {visibility !== 'private' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: 'var(--sn-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                Share URL
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 8,
                border: '1px solid rgba(139, 92, 246, 0.2)',
                overflow: 'hidden',
              }}>
                <span style={{ padding: '10px 0 10px 12px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                  /c/
                </span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-url"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    fontSize: 12,
                    padding: '10px 0',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => setCustomSlug(generateRandomSlug())}
                  style={{
                    background: 'rgba(139, 92, 246, 0.2)',
                    border: 'none',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#a78bfa',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Generate random URL"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Share URL Result (after saving) */}
          {shareUrl && visibility !== 'private' && (
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
            }}>
              <label style={{ fontSize: 11, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Share Link
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: '#10b981',
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={() => onCopyToClipboard(shareUrl)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: copied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: '#10b981',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={onSaveWithVisibility}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: isSaving
                ? 'rgba(139, 92, 246, 0.3)'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(168, 85, 247, 0.8) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 10,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : saveStatus || (visibility === 'private' ? 'Save Canvas' : 'Save & Publish')}
          </button>
        </div>
      )}

      {/* Quick Actions (collapsed state) */}
      {!showSavePanel && (
        <>
          <button
            onClick={onCreateCanvas}
            style={{
              ...styles.featureItem,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              padding: '8px 0',
            }}
          >
            <Plus size={16} style={{ color: 'var(--sn-cozy-pink)' }} />
            <span>Create New Canvas</span>
          </button>
          <Link
            to="/gallery"
            style={{
              ...styles.featureItem,
              textDecoration: 'none',
              padding: '8px 0',
            }}
          >
            <FolderOpen size={16} style={{ color: 'var(--sn-cozy-coral-soft)' }} />
            <span>Open Gallery</span>
          </Link>
        </>
      )}
    </div>
  );
};
