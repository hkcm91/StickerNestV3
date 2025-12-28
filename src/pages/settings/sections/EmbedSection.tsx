/**
 * StickerNest v2 - Embed Settings Section
 * Embed token management for external website embedding
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/apiClient';
import { SNIcon } from '../../../shared-ui/SNIcon';
import { SNButton } from '../../../shared-ui/SNButton';
import { SNIconButton } from '../../../shared-ui/SNIconButton';
import { styles } from '../settingsStyles';

export interface EmbedSettingsProps {
  user: any;
  isLocalDevMode: boolean;
}

interface EmbedToken {
  id: string;
  token: string;
  canvasId: string;
  canvasName: string;
  allowedOrigins: string[];
  mode: 'view' | 'interact';
  showBranding: boolean;
  expiresAt: string | null;
  createdAt: string;
  viewCount: number;
}

export const EmbedSettings: React.FC<EmbedSettingsProps> = ({ user, isLocalDevMode }) => {
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [canvases, setCanvases] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New token form state
  const [newToken, setNewToken] = useState({
    canvasId: '',
    allowedOrigins: '',
    mode: 'view' as 'view' | 'interact',
    showBranding: true,
  });

  // Fetch embed tokens
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (isLocalDevMode) {
          // Mock data for local dev
          setTokens([
            {
              id: 'token-1',
              token: 'emb_mocktoken123456789',
              canvasId: 'canvas-1',
              canvasName: 'My First Canvas',
              allowedOrigins: ['localhost:3000', '*.example.com'],
              mode: 'view',
              showBranding: true,
              expiresAt: null,
              createdAt: new Date().toISOString(),
              viewCount: 142,
            },
          ]);
          setCanvases([
            { id: 'canvas-1', name: 'My First Canvas' },
            { id: 'canvas-2', name: 'Dashboard Demo' },
          ]);
          setLoading(false);
          return;
        }

        const [tokensRes, canvasesRes] = await Promise.all([
          api.get<EmbedToken[]>('/embed/tokens'),
          api.get<{ items: Array<{ id: string; name: string }> }>('/canvas'),
        ]);

        if (tokensRes.success && tokensRes.data) {
          setTokens(tokensRes.data);
        }
        if (canvasesRes.success && canvasesRes.data) {
          setCanvases(canvasesRes.data.items?.map((c) => ({ id: c.id, name: c.name })) || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load embed data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isLocalDevMode]);

  const handleCreateToken = async () => {
    if (!newToken.canvasId) {
      setError('Please select a canvas');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      if (isLocalDevMode) {
        // Mock creation
        const mockToken: EmbedToken = {
          id: `token-${Date.now()}`,
          token: `emb_mock${Math.random().toString(36).slice(2)}`,
          canvasId: newToken.canvasId,
          canvasName: canvases.find(c => c.id === newToken.canvasId)?.name || 'Unknown',
          allowedOrigins: newToken.allowedOrigins.split(',').map(o => o.trim()).filter(Boolean),
          mode: newToken.mode,
          showBranding: newToken.showBranding,
          expiresAt: null,
          createdAt: new Date().toISOString(),
          viewCount: 0,
        };
        setTokens([mockToken, ...tokens]);
        setShowCreateModal(false);
        setNewToken({ canvasId: '', allowedOrigins: '', mode: 'view', showBranding: true });
        setCreating(false);
        return;
      }

      const response = await api.post('/embed/tokens', {
        canvasId: newToken.canvasId,
        allowedOrigins: newToken.allowedOrigins.split(',').map(o => o.trim()).filter(Boolean),
        mode: newToken.mode,
        showBranding: newToken.showBranding,
      });

      if (response.success) {
        const tokensRes = await api.get<EmbedToken[]>('/embed/tokens');
        if (tokensRes.success && tokensRes.data) {
          setTokens(tokensRes.data);
        }
        setShowCreateModal(false);
        setNewToken({ canvasId: '', allowedOrigins: '', mode: 'view', showBranding: true });
      } else {
        setError(response.error?.message || 'Failed to create token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to delete this embed token?')) return;

    try {
      if (isLocalDevMode) {
        setTokens(tokens.filter(t => t.id !== tokenId));
        return;
      }

      const response = await api.delete(`/embed/tokens/${tokenId}`);
      if (response.success) {
        setTokens(tokens.filter(t => t.id !== tokenId));
      } else {
        setError(response.error?.message || 'Failed to delete token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete token');
    }
  };

  const copyEmbedCode = (token: EmbedToken) => {
    const embedCode = `<iframe
  src="${window.location.origin}/embed/${token.canvasId}?token=${token.token}"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedToken(token.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div style={styles.settingsPanel}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading embed settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.settingsPanel}>
      <h2 style={styles.panelTitle}>Embed Settings</h2>
      <p style={styles.panelDescription}>
        Manage embed tokens to allow your canvases to be embedded on external websites
      </p>

      {error && (
        <div style={styles.errorMessage}>
          <SNIcon name="warning" size="sm" />
          <span>{error}</span>
        </div>
      )}

      <SNButton
        variant="primary"
        onClick={() => setShowCreateModal(true)}
        style={{ marginBottom: 24 }}
      >
        <SNIcon name="plus" size="sm" />
        Create Embed Token
      </SNButton>

      {tokens.length === 0 ? (
        <div style={styles.emptyState}>
          <SNIcon name="code" size="lg" />
          <p>No embed tokens yet</p>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Create a token to embed your canvases on other websites
          </p>
        </div>
      ) : (
        <div style={styles.tokenList}>
          {tokens.map(token => (
            <div key={token.id} style={styles.tokenCard}>
              <div style={styles.tokenHeader}>
                <div>
                  <h4 style={styles.tokenCanvasName}>{token.canvasName}</h4>
                  <code style={styles.tokenCode}>{token.token.slice(0, 20)}...</code>
                </div>
                <div style={styles.tokenActions}>
                  <SNIconButton
                    icon={copiedToken === token.id ? 'check' : 'copy'}
                    variant="ghost"
                    size="sm"
                    tooltip="Copy embed code"
                    onClick={() => copyEmbedCode(token)}
                  />
                  <SNIconButton
                    icon="trash"
                    variant="ghost"
                    size="sm"
                    tooltip="Delete token"
                    onClick={() => handleDeleteToken(token.id)}
                  />
                </div>
              </div>
              <div style={styles.tokenMeta}>
                <span style={styles.tokenBadge}>
                  {token.mode === 'interact' ? 'Interactive' : 'View only'}
                </span>
                {token.showBranding && (
                  <span style={styles.tokenBadge}>Branded</span>
                )}
                <span style={styles.tokenStats}>
                  <SNIcon name="eye" size="xs" />
                  {token.viewCount} views
                </span>
              </div>
              {token.allowedOrigins.length > 0 && (
                <div style={styles.tokenOrigins}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Allowed origins: </span>
                  {token.allowedOrigins.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Token Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create Embed Token</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Canvas</label>
              <select
                value={newToken.canvasId}
                onChange={e => setNewToken({ ...newToken, canvasId: e.target.value })}
                style={styles.select}
              >
                <option value="">Select a canvas...</option>
                {canvases.map(canvas => (
                  <option key={canvas.id} value={canvas.id}>{canvas.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Allowed Origins (comma-separated)</label>
              <input
                type="text"
                value={newToken.allowedOrigins}
                onChange={e => setNewToken({ ...newToken, allowedOrigins: e.target.value })}
                placeholder="example.com, *.mysite.com"
                style={styles.input}
              />
              <span style={styles.helpText}>Leave empty to allow all origins</span>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mode</label>
              <select
                value={newToken.mode}
                onChange={e => setNewToken({ ...newToken, mode: e.target.value as 'view' | 'interact' })}
                style={styles.select}
              >
                <option value="view">View only</option>
                <option value="interact">Interactive</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newToken.showBranding}
                  onChange={e => setNewToken({ ...newToken, showBranding: e.target.checked })}
                />
                <span>Show StickerNest branding</span>
              </label>
            </div>

            <div style={styles.modalActions}>
              <SNButton variant="ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </SNButton>
              <SNButton
                variant="primary"
                onClick={handleCreateToken}
                disabled={creating || !newToken.canvasId}
              >
                {creating ? 'Creating...' : 'Create Token'}
              </SNButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbedSettings;
