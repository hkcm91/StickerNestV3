/**
 * StickerNest v2 - Favorites Page
 * User's favorite canvases with collections support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { favoritesApi } from '../services/api';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { AppNavbar } from '../components/AppNavbar';

interface FavoriteCanvas {
  id: string;
  canvasId: string;
  createdAt: string;
  collectionId?: string;
  canvas?: {
    id: string;
    name: string;
    description?: string;
    visibility: string;
    slug?: string;
    thumbnail?: string;
    viewCount?: number;
    createdAt?: string;
    updatedAt?: string;
    owner?: {
      id: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
    };
  };
}

interface FavoriteCollection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: string;
}

// Mock data for local dev mode
const MOCK_FAVORITES: FavoriteCanvas[] = [
  {
    id: 'fav-1',
    canvasId: 'canvas-demo-1',
    createdAt: '2024-12-01T00:00:00Z',
    canvas: {
      id: 'canvas-demo-1',
      name: 'Beautiful Dashboard',
      description: 'A stunning data visualization dashboard with real-time updates',
      visibility: 'public',
      slug: 'beautiful-dashboard',
      viewCount: 5420,
      createdAt: '2024-10-15T00:00:00Z',
      updatedAt: '2024-12-10T00:00:00Z',
      owner: {
        id: 'user-2',
        username: 'creativecoder',
        displayName: 'Creative Coder',
      },
    },
  },
  {
    id: 'fav-2',
    canvasId: 'canvas-demo-2',
    createdAt: '2024-11-20T00:00:00Z',
    canvas: {
      id: 'canvas-demo-2',
      name: 'Interactive Tutorial',
      description: 'Step-by-step coding tutorial with live examples',
      visibility: 'public',
      slug: 'interactive-tutorial',
      viewCount: 3200,
      createdAt: '2024-09-20T00:00:00Z',
      updatedAt: '2024-11-28T00:00:00Z',
      owner: {
        id: 'user-3',
        username: 'techteacher',
        displayName: 'Tech Teacher',
      },
    },
  },
  {
    id: 'fav-3',
    canvasId: 'canvas-demo-3',
    createdAt: '2024-11-15T00:00:00Z',
    canvas: {
      id: 'canvas-demo-3',
      name: 'Music Visualizer',
      description: 'Real-time audio visualization with WebGL effects',
      visibility: 'public',
      slug: 'music-visualizer',
      viewCount: 1850,
      createdAt: '2024-08-10T00:00:00Z',
      updatedAt: '2024-11-15T00:00:00Z',
      owner: {
        id: 'user-4',
        username: 'sounddesigner',
        displayName: 'Sound Designer',
      },
    },
  },
];

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLocalDevMode } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteCanvas[]>([]);
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Fetch favorites and collections
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isLocalDevMode) {
        // Use mock data in local dev mode
        await new Promise((resolve) => setTimeout(resolve, 300));
        setFavorites(MOCK_FAVORITES);
        setCollections([]);
        setLoading(false);
        return;
      }

      const [favoritesRes, collectionsRes] = await Promise.all([
        favoritesApi.list(activeCollection || undefined),
        favoritesApi.listCollections(),
      ]);

      if (favoritesRes.success && favoritesRes.data) {
        setFavorites(favoritesRes.data.items as unknown as FavoriteCanvas[]);
      } else {
        setError(favoritesRes.error?.message || 'Failed to load favorites');
      }

      if (collectionsRes.success && collectionsRes.data) {
        setCollections(collectionsRes.data.collections as unknown as FavoriteCollection[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [isLocalDevMode, activeCollection]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveFavorite = async (canvasId: string) => {
    try {
      if (!isLocalDevMode) {
        const res = await favoritesApi.remove(canvasId);
        if (!res.success) {
          throw new Error(res.error?.message || 'Failed to remove favorite');
        }
      }
      setFavorites((prev) => prev.filter((f) => f.canvasId !== canvasId));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      if (!isLocalDevMode) {
        const res = await favoritesApi.createCollection({ name: newCollectionName });
        if (res.success && res.data) {
          setCollections((prev) => [...prev, res.data.collection as unknown as FavoriteCollection]);
        }
      } else {
        // Mock collection creation
        const newCollection: FavoriteCollection = {
          id: `col-${Date.now()}`,
          name: newCollectionName,
          isPublic: false,
          itemCount: 0,
          createdAt: new Date().toISOString(),
        };
        setCollections((prev) => [...prev, newCollection]);
      }
      setNewCollectionName('');
      setShowNewCollection(false);
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sn-bg-primary, #0f0f19)',
        color: 'var(--sn-text-primary, #e2e8f0)',
      }}
    >
      <AppNavbar pageTitle="Favorites" />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SNIcon name="heart" size="lg" color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Favorites</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--sn-text-secondary)' }}>
                {favorites.length} canvas{favorites.length !== 1 ? 'es' : ''} saved
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                padding: 4,
              }}
            >
              <SNIconButton
                icon="grid"
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                tooltip="Grid view"
              />
              <SNIconButton
                icon="list"
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                tooltip="List view"
              />
            </div>

            {/* Create Collection */}
            <SNButton
              variant="secondary"
              size="sm"
              onClick={() => setShowNewCollection(true)}
              style={{ gap: 6 }}
            >
              <SNIcon name="folder" size="sm" />
              New Collection
            </SNButton>
          </div>
        </div>

        {/* Collections Bar */}
        {collections.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 24,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            <button
              onClick={() => setActiveCollection(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: activeCollection === null ? 'var(--sn-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: activeCollection === null ? 'white' : 'var(--sn-text-secondary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              All Favorites
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setActiveCollection(col.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background:
                    activeCollection === col.id ? 'var(--sn-accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeCollection === col.id ? 'white' : 'var(--sn-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <SNIcon name="folder" size="xs" />
                {col.name}
                <span style={{ opacity: 0.7 }}>({col.itemCount})</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 60,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(139, 92, 246, 0.2)',
                borderTopColor: 'var(--sn-accent-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              padding: 24,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 12,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'center',
            }}
          >
            <SNIcon name="warning" size="lg" color="#ef4444" />
            <p style={{ margin: '12px 0 0', color: '#ef4444' }}>{error}</p>
            <SNButton variant="secondary" size="sm" onClick={fetchData} style={{ marginTop: 12 }}>
              Try Again
            </SNButton>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && favorites.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 60,
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 16,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <SNIcon name="heart" size="xl" color="#f97316" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>No favorites yet</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--sn-text-secondary)' }}>
              Explore canvases and click the heart icon to save them here
            </p>
            <SNButton variant="primary" onClick={() => navigate('/explore')}>
              <SNIcon name="compass" size="sm" />
              Explore Canvases
            </SNButton>
          </div>
        )}

        {/* Favorites Grid */}
        {!loading && !error && favorites.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
              gap: viewMode === 'grid' ? 20 : 12,
            }}
          >
            {favorites.map((fav) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                viewMode={viewMode}
                onRemove={() => handleRemoveFavorite(fav.canvasId)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* New Collection Modal */}
        {showNewCollection && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowNewCollection(false)}
          >
            <div
              style={{
                background: 'var(--sn-bg-secondary)',
                borderRadius: 16,
                padding: 24,
                width: '90%',
                maxWidth: 400,
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>New Collection</h3>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  color: 'var(--sn-text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                <SNButton variant="ghost" size="sm" onClick={() => setShowNewCollection(false)}>
                  Cancel
                </SNButton>
                <SNButton variant="primary" size="sm" onClick={handleCreateCollection}>
                  Create
                </SNButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Favorite Card Component
interface FavoriteCardProps {
  favorite: FavoriteCanvas;
  viewMode: 'grid' | 'list';
  onRemove: () => void;
  formatDate: (date: string) => string;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ favorite, viewMode, onRemove, formatDate }) => {
  const navigate = useNavigate();
  const canvas = favorite.canvas;

  if (!canvas) return null;

  const handleClick = () => {
    if (canvas.slug) {
      navigate(`/c/${canvas.slug}`);
    } else {
      navigate(`/canvas/${canvas.id}`);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            width: 60,
            height: 45,
            borderRadius: 8,
            background: canvas.thumbnail
              ? `url(${canvas.thumbnail}) center/cover`
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            flexShrink: 0,
          }}
        />

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {canvas.name}
          </h4>
          <div style={{ fontSize: 12, color: 'var(--sn-text-secondary)', display: 'flex', gap: 12 }}>
            <span>by @{canvas.owner?.username || 'unknown'}</span>
            <span>•</span>
            <span>{canvas.viewCount?.toLocaleString() || 0} views</span>
          </div>
        </div>

        {/* Actions */}
        <SNIconButton
          icon="heart"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          tooltip="Remove from favorites"
          style={{ color: '#ef4444' }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 160,
          background: canvas.thumbnail
            ? `url(${canvas.thumbnail}) center/cover`
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          position: 'relative',
        }}
      >
        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Remove from favorites"
        >
          <SNIcon name="heart" size="sm" color="#ef4444" />
        </button>

        {/* Owner Badge */}
        {canvas.owner && (
          <Link
            to={`/u/${canvas.owner.username}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 20,
              textDecoration: 'none',
              color: 'white',
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: canvas.owner.avatarUrl
                  ? `url(${canvas.owner.avatarUrl}) center/cover`
                  : 'var(--sn-accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!canvas.owner.avatarUrl && (
                <span style={{ fontSize: 10, fontWeight: 600 }}>
                  {canvas.owner.username[0].toUpperCase()}
                </span>
              )}
            </div>
            @{canvas.owner.username}
          </Link>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 16 }}>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {canvas.name}
        </h3>
        {canvas.description && (
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              color: 'var(--sn-text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {canvas.description}
          </p>
        )}

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 12,
            color: 'var(--sn-text-muted)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SNIcon name="eye" size="xs" />
            {canvas.viewCount?.toLocaleString() || 0}
          </span>
          <span>Saved {formatDate(favorite.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
