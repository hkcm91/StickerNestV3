/**
 * StickerNest v2 - Canvas Selector
 * Configuration step for Canvas tabs - allows users to select
 * their own canvases, public canvases, or enter a slug/URL
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Search,
  Layout,
  Globe,
  Lock,
  Link2,
  User,
  Eye,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCanvasManager, type CanvasListItem } from '../../services/canvasManager';
import type { CanvasTabConfig, CanvasBrowserFilters, CanvasBrowserItem } from '../tabs/types';

interface CanvasSelectorProps {
  config: Partial<CanvasTabConfig>;
  onConfigChange: (config: Partial<CanvasTabConfig>) => void;
  onTitleChange: (title: string) => void;
  title: string;
  accentColor?: string;
}

type SourceTab = 'my-canvases' | 'public' | 'url';

export const CanvasSelector: React.FC<CanvasSelectorProps> = ({
  config,
  onConfigChange,
  onTitleChange,
  title,
  accentColor = '#8b5cf6',
}) => {
  const { user } = useAuth();
  const [activeSource, setActiveSource] = useState<SourceTab>('my-canvases');
  const [searchQuery, setSearchQuery] = useState('');
  const [slugInput, setSlugInput] = useState(config.slug || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [myCanvases, setMyCanvases] = useState<CanvasListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoTitle, setHasAutoTitle] = useState(!title);

  // Load user's canvases
  useEffect(() => {
    const loadCanvases = async () => {
      if (!user?.id) {
        // In local dev mode, load from localStorage
        setIsLoading(true);
        try {
          const manager = getCanvasManager('local-user');
          const canvases = await manager.listCanvases();
          setMyCanvases(canvases);
        } catch (err) {
          console.error('Failed to load canvases:', err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const manager = getCanvasManager(user.id);
        const canvases = await manager.listCanvases();
        setMyCanvases(canvases);
      } catch (err) {
        console.error('Failed to load canvases:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeSource === 'my-canvases') {
      loadCanvases();
    }
  }, [user?.id, activeSource]);

  // Filter canvases based on search
  const filteredCanvases = useMemo(() => {
    if (!searchQuery.trim()) return myCanvases;
    const query = searchQuery.toLowerCase();
    return myCanvases.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
    );
  }, [myCanvases, searchQuery]);

  const handleCanvasSelect = useCallback((canvas: CanvasListItem) => {
    onConfigChange({
      ...config,
      canvasId: canvas.id,
      canvasName: canvas.name,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      isOwn: true,
    });
    if (hasAutoTitle) {
      onTitleChange(canvas.name);
    }
  }, [config, onConfigChange, onTitleChange, hasAutoTitle]);

  const handleSlugSubmit = useCallback(() => {
    if (!slugInput.trim()) return;

    // Parse slug from URL if pasted
    let slug = slugInput.trim();
    if (slug.includes('/c/')) {
      const match = slug.match(/\/c\/([a-zA-Z0-9]+)/);
      if (match) {
        slug = match[1];
      }
    } else if (slug.includes('stickernest')) {
      // Try to extract slug from full URL
      const match = slug.match(/stickernest[^\/]*\/c\/([a-zA-Z0-9]+)/);
      if (match) {
        slug = match[1];
      }
    }

    onConfigChange({
      ...config,
      slug,
      password: passwordInput || undefined,
      isOwn: false,
    });

    if (hasAutoTitle) {
      onTitleChange(`Canvas: ${slug}`);
    }
  }, [slugInput, passwordInput, config, onConfigChange, onTitleChange, hasAutoTitle]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTitleChange(e.target.value);
    setHasAutoTitle(false);
  }, [onTitleChange]);

  const sourceTabs: { id: SourceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'my-canvases', label: 'My Canvases', icon: <User size={14} /> },
    { id: 'public', label: 'Public', icon: <Globe size={14} /> },
    { id: 'url', label: 'Enter URL/Slug', icon: <Link2 size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Source Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 10,
          padding: 4,
        }}
      >
        {sourceTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSource(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: activeSource === tab.id ? `${accentColor}22` : 'transparent',
              border: 'none',
              borderRadius: 8,
              color: activeSource === tab.id ? accentColor : '#94a3b8',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Canvases / Public Tab Content */}
      {(activeSource === 'my-canvases' || activeSource === 'public') && (
        <>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            >
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search canvases..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {/* Canvas List */}
          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  color: '#94a3b8',
                }}
              >
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: 8 }}>Loading canvases...</span>
              </div>
            ) : filteredCanvases.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: '#94a3b8',
                  fontSize: 13,
                }}
              >
                {searchQuery ? 'No canvases match your search' : 'No canvases found'}
              </div>
            ) : (
              filteredCanvases.map((canvas) => {
                const isSelected = config.canvasId === canvas.id;
                return (
                  <button
                    key={canvas.id}
                    onClick={() => handleCanvasSelect(canvas)}
                    style={{
                      width: '100%',
                      padding: 12,
                      background: isSelected ? `${accentColor}22` : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: 48,
                        height: 36,
                        borderRadius: 6,
                        background: canvas.thumbnailUrl
                          ? `url(${canvas.thumbnailUrl}) center/cover`
                          : 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {!canvas.thumbnailUrl && <Layout size={16} style={{ color: '#94a3b8' }} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: isSelected ? accentColor : '#e2e8f0',
                          marginBottom: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {canvas.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 11,
                          color: '#64748b',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          {canvas.visibility === 'public' ? (
                            <Globe size={10} />
                          ) : canvas.visibility === 'unlisted' ? (
                            <Eye size={10} />
                          ) : (
                            <Lock size={10} />
                          )}
                          {canvas.visibility}
                        </span>
                        <span>{canvas.width} x {canvas.height}</span>
                        {canvas.hasPassword && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Lock size={10} />
                            Protected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: accentColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* URL/Slug Tab Content */}
      {activeSource === 'url' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: 8,
              }}
            >
              Canvas URL or Slug
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              >
                <Link2 size={16} />
              </div>
              <input
                type="text"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="https://stickernest.app/c/abc123 or just abc123"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSlugSubmit();
                  }
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Paste a canvas link or enter the slug directly
            </div>
          </div>

          {/* Password field (optional) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 500,
                color: '#94a3b8',
                marginBottom: 8,
              }}
            >
              Password (if protected)
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              >
                <Lock size={16} />
              </div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password if required"
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Load button */}
          <button
            onClick={handleSlugSubmit}
            disabled={!slugInput.trim()}
            style={{
              padding: '12px 20px',
              background: slugInput.trim() ? accentColor : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 10,
              color: slugInput.trim() ? 'white' : '#64748b',
              fontSize: 14,
              fontWeight: 500,
              cursor: slugInput.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            Load Canvas
          </button>

          {/* Selected canvas indicator */}
          {config.slug && (
            <div
              style={{
                padding: 12,
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}33`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Layout size={18} style={{ color: accentColor }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>
                  Canvas Selected
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Slug: {config.slug}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Title */}
      <div style={{ marginTop: 8 }}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: '#94a3b8',
            marginBottom: 8,
          }}
        >
          Tab Title
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Canvas Tab"
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
          }}
        />
      </div>

      {/* Spinner animation style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CanvasSelector;
