/**
 * StickerNest v2 - URL Preview Tab Content
 * Renders a website/URL in an iframe inside a tab panel
 * Supports proxy fallback for sites that block iframe embedding
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  AlertCircle,
  Globe,
  Shield,
  ShieldOff,
  Info,
  Link2,
  Image,
} from 'lucide-react';
import type { UrlPreviewTabConfig, UrlMetadata } from './types';

interface UrlPreviewTabProps {
  /** Tab ID */
  tabId: string;
  /** Tab configuration */
  config: UrlPreviewTabConfig;
  /** Callback to update tab config */
  onConfigChange?: (config: Partial<UrlPreviewTabConfig>) => void;
  /** Accent color */
  accentColor?: string;
}

type LoadState = 'loading' | 'loaded' | 'error' | 'blocked';
type EmbedMode = 'direct' | 'proxy' | 'preview-card';

// Get API base URL
const getApiBaseUrl = () => {
  // In production, use same origin
  // In development, use the configured API URL or localhost:3001
  if (import.meta.env.PROD) {
    return '';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

export const UrlPreviewTab: React.FC<UrlPreviewTabProps> = ({
  tabId,
  config,
  onConfigChange,
  accentColor = '#8b5cf6',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [embedMode, setEmbedMode] = useState<EmbedMode>('direct');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showProxyInfo, setShowProxyInfo] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // SECURITY: Sandbox permissions for external URL previews
  // Note: External URLs may legitimately need same-origin for their functionality
  // This is intentional for URL preview use case (user explicitly loading external content)
  // Widget iframes use stricter sandboxing (allow-scripts only)
  const sandboxPermissions = config.sandboxPermissions || [
    'allow-scripts',
    'allow-same-origin', // Required for external sites to function
    'allow-forms',       // Allow form submission on external sites
    // Note: popups are NOT allowed by default for security
  ];

  // Extract domain for display
  const displayDomain = (() => {
    try {
      const url = new URL(config.url);
      return url.hostname;
    } catch {
      return config.url;
    }
  })();

  // Get the actual URL to load (direct or proxied)
  const getIframeSrc = useCallback(() => {
    if (!config.url) return '';

    if (embedMode === 'proxy') {
      const apiBase = getApiBaseUrl();
      return `${apiBase}/api/proxy/frame?url=${encodeURIComponent(config.url)}`;
    }

    return config.url;
  }, [config.url, embedMode]);

  // Fetch URL metadata for preview cards
  const fetchMetadata = useCallback(async () => {
    if (!config.url) return;

    setMetadataLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(
        `${apiBase}/api/proxy/metadata?url=${encodeURIComponent(config.url)}`
      );
      const data = await response.json();

      if (data.success && data.metadata) {
        setMetadata(data.metadata);

        // If metadata says it can't embed, switch to appropriate mode
        if (!data.metadata.canEmbed && config.proxyMode !== 'never') {
          setEmbedMode('proxy');
        }
      }
    } catch (error) {
      console.warn('Failed to fetch URL metadata:', error);
    } finally {
      setMetadataLoading(false);
    }
  }, [config.url, config.proxyMode]);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setLoadState('loaded');
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // If direct load failed, try proxy
    if (embedMode === 'direct' && config.proxyMode !== 'never') {
      setEmbedMode('proxy');
      setLoadState('loading');
      setLoadAttempt((prev) => prev + 1);
    } else if (embedMode === 'proxy') {
      // Proxy also failed, show preview card
      setEmbedMode('preview-card');
      setLoadState('blocked');
    } else {
      setLoadState('error');
    }
  }, [embedMode, config.proxyMode]);

  // Refresh iframe
  const handleRefresh = useCallback(() => {
    if (embedMode === 'preview-card') {
      // Reset to try direct load again
      setEmbedMode('direct');
      setLoadAttempt(0);
    }

    if (iframeRef.current) {
      setLoadState('loading');
      setLoadAttempt((prev) => prev + 1);
      iframeRef.current.src = getIframeSrc();
    }
  }, [embedMode, getIframeSrc]);

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    window.open(config.url, '_blank', 'noopener,noreferrer');
  }, [config.url]);

  // Toggle fullscreen
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Toggle proxy mode manually
  const handleToggleProxy = useCallback(() => {
    const newMode = embedMode === 'proxy' ? 'direct' : 'proxy';
    setEmbedMode(newMode);
    setLoadState('loading');
    setLoadAttempt((prev) => prev + 1);
  }, [embedMode]);

  // Set up load timeout to detect blocked iframes
  useEffect(() => {
    if (loadState === 'loading' && config.url && embedMode !== 'preview-card') {
      // Some sites don't trigger error events when blocked, so use timeout
      loadTimeoutRef.current = setTimeout(() => {
        // Check if iframe actually loaded by trying to access it
        // (This won't work for cross-origin but the timeout itself is useful)
        if (loadState === 'loading') {
          // Don't auto-fail on timeout since some sites are just slow
          // But fetch metadata to show info
          if (!metadata) {
            fetchMetadata();
          }
        }
      }, 8000);

      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    }
  }, [loadState, config.url, embedMode, metadata, fetchMetadata]);

  // Fetch metadata when URL changes
  useEffect(() => {
    if (config.url) {
      fetchMetadata();
    }
  }, [config.url, fetchMetadata]);

  // Auto-proxy mode handling
  useEffect(() => {
    if (config.proxyMode === 'always' && embedMode === 'direct') {
      setEmbedMode('proxy');
    }
  }, [config.proxyMode, embedMode]);

  // No URL configured
  if (!config.url) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          color: '#94a3b8',
        }}
      >
        <Globe size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
          No URL Configured
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Edit this tab to set a URL to preview
        </div>
      </div>
    );
  }

  // Preview card mode (when iframe embedding is completely blocked)
  if (embedMode === 'preview-card') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Controls Bar */}
        {config.showControls !== false && (
          <ControlsBar
            displayDomain={displayDomain}
            isLoading={metadataLoading}
            isFullscreen={isFullscreen}
            embedMode={embedMode}
            showProxyInfo={showProxyInfo}
            accentColor={accentColor}
            allowFullscreen={config.allowFullscreen}
            onRefresh={handleRefresh}
            onOpenExternal={handleOpenExternal}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleProxy={handleToggleProxy}
            onToggleProxyInfo={() => setShowProxyInfo(!showProxyInfo)}
          />
        )}

        {/* Preview Card Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            gap: 16,
          }}
        >
          {/* Preview Image */}
          {metadata?.image ? (
            <div
              style={{
                width: '100%',
                maxWidth: 400,
                aspectRatio: '1.91 / 1',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <img
                src={metadata.image}
                alt={metadata.title || 'Preview'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  // Hide broken image
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}44)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {metadata?.favicon ? (
                <img
                  src={metadata.favicon}
                  alt=""
                  style={{ width: 48, height: 48 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe size={48} style={{ color: accentColor, opacity: 0.7 }} />
              )}
            </div>
          )}

          {/* Site Info */}
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: 8,
              }}
            >
              {metadata?.title || displayDomain}
            </div>

            {metadata?.description && (
              <div
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                  marginBottom: 12,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {metadata.description}
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Link2 size={12} />
              {displayDomain}
            </div>
          </div>

          {/* Blocked Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: 'rgba(234, 179, 8, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(234, 179, 8, 0.2)',
            }}
          >
            <ShieldOff size={14} style={{ color: '#eab308' }} />
            <span style={{ fontSize: 12, color: '#eab308' }}>
              This site prevents iframe embedding
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={14} />
              Try Again
            </button>

            <button
              onClick={handleOpenExternal}
              style={{
                padding: '10px 20px',
                background: accentColor,
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ExternalLink size={14} />
              Open in Browser
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal iframe mode (direct or proxied)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.2)',
        ...(isFullscreen && {
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.95)',
        }),
      }}
    >
      {/* Controls Bar */}
      {config.showControls !== false && (
        <ControlsBar
          displayDomain={displayDomain}
          isLoading={loadState === 'loading'}
          isFullscreen={isFullscreen}
          embedMode={embedMode}
          showProxyInfo={showProxyInfo}
          accentColor={accentColor}
          allowFullscreen={config.allowFullscreen}
          onRefresh={handleRefresh}
          onOpenExternal={handleOpenExternal}
          onToggleFullscreen={handleToggleFullscreen}
          onToggleProxy={handleToggleProxy}
          onToggleProxyInfo={() => setShowProxyInfo(!showProxyInfo)}
        />
      )}

      {/* Proxy Info Banner */}
      {showProxyInfo && embedMode === 'proxy' && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            fontSize: 11,
            color: '#a78bfa',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Info size={12} />
          <span>
            Proxy mode active - content is being loaded through our server to bypass embedding
            restrictions. Some features may not work correctly.
          </span>
          <button
            onClick={() => setShowProxyInfo(false)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* IFrame Container */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Loading Overlay */}
        {loadState === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 15, 25, 0.9)',
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${accentColor}33`,
                borderTopColor: accentColor,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
              Loading {displayDomain}
              {embedMode === 'proxy' && ' (via proxy)'}...
            </div>
            {embedMode === 'proxy' && (
              <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                Using proxy to bypass embedding restrictions
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {loadState === 'error' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 15, 25, 0.95)',
              padding: 24,
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 8 }}>
              Failed to Load
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, maxWidth: 280 }}>
              This website may not allow embedding, or there was a network error.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRefresh}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={handleOpenExternal}
                style={{
                  padding: '8px 16px',
                  background: accentColor,
                  border: 'none',
                  borderRadius: 8,
                  color: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ExternalLink size={12} />
                Open Externally
              </button>
            </div>
          </div>
        )}

        {/* IFrame */}
        <iframe
          key={`${embedMode}-${loadAttempt}`}
          ref={iframeRef}
          src={getIframeSrc()}
          title={`Preview: ${displayDomain}`}
          sandbox={sandboxPermissions.join(' ')}
          allow={config.allowFullscreen !== false ? 'fullscreen' : undefined}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white',
          }}
        />
      </div>

      {/* Spinner Animation Style */}
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

// Controls Bar Component
interface ControlsBarProps {
  displayDomain: string;
  isLoading: boolean;
  isFullscreen: boolean;
  embedMode: EmbedMode;
  showProxyInfo: boolean;
  accentColor: string;
  allowFullscreen?: boolean;
  onRefresh: () => void;
  onOpenExternal: () => void;
  onToggleFullscreen: () => void;
  onToggleProxy: () => void;
  onToggleProxyInfo: () => void;
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  displayDomain,
  isLoading,
  isFullscreen,
  embedMode,
  showProxyInfo,
  accentColor,
  allowFullscreen,
  onRefresh,
  onOpenExternal,
  onToggleFullscreen,
  onToggleProxy,
  onToggleProxyInfo,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0,
      }}
    >
      {/* Refresh Button */}
      <ControlButton
        onClick={onRefresh}
        title="Refresh"
        isActive={false}
        accentColor={accentColor}
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </ControlButton>

      {/* URL Display */}
      <div
        style={{
          flex: 1,
          padding: '6px 10px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 6,
          fontSize: 11,
          color: '#94a3b8',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {embedMode === 'proxy' ? (
          <Shield size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
        ) : (
          <Globe size={12} style={{ flexShrink: 0 }} />
        )}
        {displayDomain}
        {embedMode === 'proxy' && (
          <span
            style={{
              fontSize: 9,
              color: '#8b5cf6',
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '1px 4px',
              borderRadius: 3,
              marginLeft: 4,
            }}
          >
            PROXY
          </span>
        )}
      </div>

      {/* Proxy Toggle Button */}
      {embedMode !== 'preview-card' && (
        <ControlButton
          onClick={onToggleProxy}
          title={
            embedMode === 'proxy'
              ? 'Switch to direct loading'
              : 'Switch to proxy mode (bypasses embedding restrictions)'
          }
          isActive={embedMode === 'proxy'}
          accentColor={accentColor}
        >
          {embedMode === 'proxy' ? <Shield size={14} /> : <ShieldOff size={14} />}
        </ControlButton>
      )}

      {/* Proxy Info Button (only in proxy mode) */}
      {embedMode === 'proxy' && (
        <ControlButton
          onClick={onToggleProxyInfo}
          title="Proxy information"
          isActive={showProxyInfo}
          accentColor={accentColor}
        >
          <Info size={14} />
        </ControlButton>
      )}

      {/* Open External Button */}
      <ControlButton
        onClick={onOpenExternal}
        title="Open in new tab"
        isActive={false}
        accentColor={accentColor}
      >
        <ExternalLink size={14} />
      </ControlButton>

      {/* Fullscreen Button */}
      {allowFullscreen !== false && (
        <ControlButton
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          isActive={isFullscreen}
          accentColor={accentColor}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </ControlButton>
      )}
    </div>
  );
};

// Control Button Component
interface ControlButtonProps {
  onClick: () => void;
  title: string;
  isActive: boolean;
  accentColor: string;
  children: React.ReactNode;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  title,
  isActive,
  accentColor,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isActive ? `${accentColor}33` : isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: 6,
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isActive ? accentColor : isHovered ? '#e2e8f0' : '#94a3b8',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
};

export default UrlPreviewTab;
