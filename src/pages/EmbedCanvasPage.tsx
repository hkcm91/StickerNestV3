/**
 * StickerNest v2 - Embed Canvas Page
 * Minimal view for embedding canvases in iframes
 */

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CanvasRenderer } from '../components/CanvasRenderer';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { CanvasRuntime } from '../runtime/CanvasRuntime';
import { getCanvasManager, type CanvasData } from '../services/canvasManager';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_CANVAS_SETTINGS, type CanvasSettings } from '../types/domain';

const EmbedCanvasPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Runtime instances
  const [runtime, setRuntime] = useState<RuntimeContext | null>(null);
  const [canvasRuntime, setCanvasRuntime] = useState<CanvasRuntime | null>(null);

  const urlPassword = searchParams.get('p') || undefined;

  const { isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!slug || isAuthLoading) {
      if (!slug) {
        setError('Invalid embed URL');
        setIsLoading(false);
      }
      return;
    }

    loadEmbeddedCanvas(slug, urlPassword);
  }, [slug, urlPassword, isAuthLoading]);

  const loadEmbeddedCanvas = async (slug: string, password?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const manager = getCanvasManager('embed-viewer');
      const result = await manager.loadCanvasBySlug(slug, password);

      if (!result.success) {
        if (result.error === 'Password required') {
          setRequiresPassword(true);
          setIsLoading(false);
          return;
        }
        throw new Error(result.error || 'Failed to load canvas');
      }

      setCanvasData(result.data!);
      setRequiresPassword(false);

      // Initialize minimal runtimes
      const newRuntime = new RuntimeContext('embed-viewer', result.data!.canvas.id);
      const newCanvasRuntime = new CanvasRuntime({
        canvasId: result.data!.canvas.id,
        userId: 'embed-viewer',
        mode: 'view',
        debugEnabled: false,
      });

      result.data!.widgets.forEach(widget => {
        newRuntime.addWidgetInstance(widget);
      });

      setRuntime(newRuntime);
      setCanvasRuntime(newCanvasRuntime);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canvas');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug && passwordInput) {
      loadEmbeddedCanvas(slug, passwordInput);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
      </div>
    );
  }

  // Password required
  if (requiresPassword) {
    return (
      <div style={styles.container}>
        <form onSubmit={handlePasswordSubmit} style={styles.passwordForm}>
          <span style={styles.lockIcon}>🔒</span>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            style={styles.passwordInput}
            autoFocus
          />
          <button type="submit" style={styles.passwordButton}>
            View
          </button>
        </form>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorText}>{error}</div>
      </div>
    );
  }

  // Canvas
  if (!canvasData || !runtime || !canvasRuntime) {
    return null;
  }

  // Build settings with canvas background config
  const canvasSettings: CanvasSettings = {
    ...DEFAULT_CANVAS_SETTINGS,
    background: canvasData.canvas.backgroundConfig,
  };

  return (
    <div style={styles.embedContainer}>
      <CanvasRenderer
        runtime={runtime}
        canvasRuntime={canvasRuntime}
        mode="view"
        canvasWidth={canvasData.canvas.width || 1920}
        canvasHeight={canvasData.canvas.height || 1080}
        settings={canvasSettings}
      />
      {/* Subtle branding */}
      <a
        href={`${window.location.origin}/c/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.watermark}
      >
        Made with StickerNest
      </a>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f19',
  },
  embedContainer: {
    width: '100%',
    height: '100vh',
    position: 'relative',
    background: '#0f0f19',
    overflow: 'hidden',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  passwordForm: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    fontSize: 20,
  },
  passwordInput: {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    color: 'white',
    fontSize: 13,
    width: 150,
  },
  passwordButton: {
    padding: '8px 16px',
    background: '#8b5cf6',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  watermark: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 10,
    textDecoration: 'none',
    padding: '4px 8px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
  },
};

export default EmbedCanvasPage;
