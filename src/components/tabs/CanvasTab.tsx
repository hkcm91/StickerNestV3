/**
 * StickerNest v2 - Canvas Tab Content
 * Renders another canvas inside a tab panel with proportional sizing,
 * aspect ratio preservation, and fit mode options.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Lock,
  AlertCircle,
  Layout,
  ExternalLink,
  Monitor,
  Smartphone,
  Square,
  Expand,
  Info,
} from 'lucide-react';
import type { CanvasTabConfig } from './types';

interface CanvasTabProps {
  /** Tab ID */
  tabId: string;
  /** Tab configuration */
  config: CanvasTabConfig;
  /** Callback to update tab config */
  onConfigChange?: (config: Partial<CanvasTabConfig>) => void;
  /** Accent color */
  accentColor?: string;
  /** Panel width for aspect ratio calculation */
  panelWidth: number;
}

type FitMode = 'contain' | 'cover' | 'fill';

const FIT_MODE_OPTIONS: { value: FitMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'contain', label: 'Fit', icon: <Square size={12} />, description: 'Fit canvas within panel' },
  { value: 'cover', label: 'Cover', icon: <Expand size={12} />, description: 'Fill panel, crop if needed' },
  { value: 'fill', label: 'Stretch', icon: <Monitor size={12} />, description: 'Stretch to fill panel' },
];

export const CanvasTab: React.FC<CanvasTabProps> = ({
  tabId,
  config,
  onConfigChange,
  accentColor = '#8b5cf6',
  panelWidth,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showFitOptions, setShowFitOptions] = useState(false);

  // Canvas dimensions with fallbacks
  const canvasWidth = config.canvasWidth || 1920;
  const canvasHeight = config.canvasHeight || 1080;
  const aspectRatio = canvasWidth / canvasHeight;
  const fitMode = config.fitMode || 'contain';

  // Build the canvas URL
  const canvasUrl = config.slug
    ? `/embed/${config.slug}${config.password ? `?p=${encodeURIComponent(config.password)}` : ''}`
    : config.canvasId
      ? `/embed/${config.canvasId}`
      : null;

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Refresh iframe
  const handleRefresh = useCallback(() => {
    if (iframeRef.current && canvasUrl) {
      setIsLoading(true);
      setHasError(false);
      iframeRef.current.src = canvasUrl;
    }
  }, [canvasUrl]);

  // Open in new tab
  const handleOpenFullPage = useCallback(() => {
    if (config.slug) {
      window.open(`/c/${config.slug}`, '_blank');
    } else if (config.canvasId) {
      window.open(`/canvas/${config.canvasId}`, '_blank');
    }
  }, [config.slug, config.canvasId]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Change fit mode
  const handleFitModeChange = useCallback((mode: FitMode) => {
    onConfigChange?.({ fitMode: mode });
    setShowFitOptions(false);
  }, [onConfigChange]);

  // Handle password submit
  const handlePasswordSubmit = useCallback(() => {
    if (!passwordInput.trim()) return;
    onConfigChange?.({ password: passwordInput });
    setRequiresPassword(false);
    setPasswordError(null);
    setIsLoading(true);
    if (iframeRef.current && config.slug) {
      iframeRef.current.src = `/embed/${config.slug}?p=${encodeURIComponent(passwordInput)}`;
    }
  }, [passwordInput, config.slug, onConfigChange]);

  // No canvas configured
  if (!canvasUrl) {
    return (
      <div style={styles.emptyState}>
        <Layout size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          No Canvas Selected
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Edit this tab to select a canvas to display
        </div>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div style={styles.emptyState}>
        <div style={{ ...styles.iconCircle, background: `${accentColor}22` }}>
          <Lock size={24} style={{ color: accentColor }} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
          Protected Canvas
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, textAlign: 'center' }}>
          This canvas requires a password to view
        </div>
        {passwordError && (
          <div style={styles.errorBadge}>{passwordError}</div>
        )}
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280 }}>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter password"
            style={styles.passwordInput}
            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
          />
          <button onClick={handlePasswordSubmit} style={{ ...styles.button, background: accentColor }}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div style={styles.emptyState}>
        <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 8 }}>
          Failed to Load Canvas
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
          The canvas could not be loaded.
        </div>
        <button onClick={handleRefresh} style={styles.retryButton}>
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  // Canvas preview with proportional sizing
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0a0a12',
        ...(isFullscreen && {
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.98)',
        }),
      }}
    >
      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        {/* Canvas Info */}
        <div style={styles.canvasInfo}>
          <Layout size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <span style={styles.canvasName}>
            {config.canvasName || config.slug || 'Canvas'}
          </span>
          <span style={styles.dimensionBadge}>
            {canvasWidth} × {canvasHeight}
          </span>
        </div>

        {/* Fit Mode Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFitOptions(!showFitOptions)}
            title={`Fit mode: ${fitMode}`}
            style={styles.controlButton}
          >
            {FIT_MODE_OPTIONS.find(o => o.value === fitMode)?.icon}
          </button>
          {showFitOptions && (
            <div style={styles.fitModeDropdown}>
              {FIT_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFitModeChange(option.value)}
                  style={{
                    ...styles.fitModeOption,
                    background: fitMode === option.value ? `${accentColor}22` : 'transparent',
                    color: fitMode === option.value ? accentColor : '#e2e8f0',
                  }}
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button onClick={handleRefresh} title="Refresh" style={styles.controlButton}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={{
            ...styles.controlButton,
            background: isFullscreen ? `${accentColor}33` : undefined,
            color: isFullscreen ? accentColor : undefined,
          }}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Open in Full Page */}
        <button onClick={handleOpenFullPage} title="Open in new tab" style={styles.controlButton}>
          <ExternalLink size={14} />
        </button>
      </div>

      {/* IFrame Container - Centered with CSS aspect ratio */}
      <div style={styles.iframeContainer}>
        {/* Loading Overlay */}
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={{ ...styles.spinner, borderColor: `${accentColor}33`, borderTopColor: accentColor }} />
            <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
              Loading canvas...
            </div>
          </div>
        )}

        {/* Proportional Canvas Frame using CSS aspect-ratio */}
        <div
          style={{
            width: fitMode === 'fill' ? '100%' : 'auto',
            height: fitMode === 'fill' ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: fitMode === 'fill' ? undefined : `${canvasWidth} / ${canvasHeight}`,
            position: 'relative',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <iframe
            ref={iframeRef}
            src={canvasUrl}
            title={`Canvas: ${config.canvasName || config.slug || 'Preview'}`}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#0f0f19',
              objectFit: fitMode === 'cover' ? 'cover' : 'contain',
            }}
          />
        </div>

        {/* Aspect Ratio Info */}
        <div style={styles.aspectRatioInfo}>
          <Info size={10} />
          <span>{aspectRatio.toFixed(2)}:1</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  emptyState: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    color: '#94a3b8',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorBadge: {
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  button: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  retryButton: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.4)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    flexShrink: 0,
  },
  canvasInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  canvasName: {
    fontSize: 12,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dimensionBadge: {
    fontSize: 10,
    color: '#64748b',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 6px',
    borderRadius: 4,
    flexShrink: 0,
  },
  controlButton: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    borderRadius: 6,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#94a3b8',
    transition: 'all 0.15s ease',
  },
  fitModeDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: 'rgba(20, 20, 30, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
    zIndex: 100,
    minWidth: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  fitModeOption: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  iframeContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    background: 'linear-gradient(135deg, #0a0a12 0%, #12121c 100%)',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 18, 0.95)',
    zIndex: 10,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  aspectRatioInfo: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: '#64748b',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '3px 6px',
    borderRadius: 4,
    opacity: 0.6,
  },
};

export default CanvasTab;
