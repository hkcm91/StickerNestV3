/**
 * StickerNest v2 - User Profile Page
 *
 * Displays user profile with multiple gallery views:
 * - Public Gallery (portfolio)
 * - Private Gallery (personal canvases)
 * - Favorites (bookmarked canvases from others)
 *
 * Can view own profile or other users' public profiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import {
  userApi,
  followApi,
  canvasApi,
  favoritesApi,
  ExtendedUserProfile,
  Canvas,
  FavoriteCanvas,
} from '../services/apiClient';

// =============================================================================
// Types
// =============================================================================

interface CanvasItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  visibility: 'private' | 'unlisted' | 'public';
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

type GalleryTab = 'public' | 'private' | 'favorites';

// Local dev mode check
const isLocalDevMode = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

// =============================================================================
// Mock Data (for local development)
// =============================================================================

const mockProfile: ExtendedUserProfile = {
  id: 'user-1',
  email: 'demo@example.com',
  username: 'creativecoder',
  displayName: 'Creative Coder',
  avatarUrl: undefined,
  bio: 'Designer & developer building interactive experiences. Love exploring new creative tools.',
  website: 'https://creativecoder.dev',
  role: 'creator',
  createdAt: '2024-01-15T00:00:00Z',
  isCreator: true,
  stats: {
    publicCanvases: 12,
    followers: 234,
    following: 89,
    totalViews: 5420,
  },
};

const mockCanvases: CanvasItem[] = [
  {
    id: '1',
    name: 'Portfolio Dashboard',
    thumbnailUrl: undefined,
    visibility: 'public',
    viewCount: 1250,
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
  },
  {
    id: '2',
    name: 'Project Tracker',
    thumbnailUrl: undefined,
    visibility: 'public',
    viewCount: 890,
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2024-12-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Design System Showcase',
    thumbnailUrl: undefined,
    visibility: 'public',
    viewCount: 2100,
    createdAt: '2024-09-20T00:00:00Z',
    updatedAt: '2024-11-28T00:00:00Z',
  },
  {
    id: '4',
    name: 'Personal Notes',
    thumbnailUrl: undefined,
    visibility: 'private',
    viewCount: 45,
    createdAt: '2024-11-10T00:00:00Z',
    updatedAt: '2024-12-04T00:00:00Z',
  },
  {
    id: '5',
    name: 'Draft Ideas',
    thumbnailUrl: undefined,
    visibility: 'private',
    viewCount: 12,
    createdAt: '2024-11-25T00:00:00Z',
    updatedAt: '2024-12-03T00:00:00Z',
  },
];

const mockFavorites: CanvasItem[] = [
  {
    id: 'fav-1',
    name: 'Amazing Dashboard by Sarah',
    thumbnailUrl: undefined,
    visibility: 'public',
    viewCount: 5600,
    createdAt: '2024-08-10T00:00:00Z',
    updatedAt: '2024-11-20T00:00:00Z',
    creator: {
      id: 'user-2',
      username: 'sarahdesigns',
      avatarUrl: undefined,
    },
  },
  {
    id: 'fav-2',
    name: 'Interactive Tutorial',
    thumbnailUrl: undefined,
    visibility: 'public',
    viewCount: 3200,
    createdAt: '2024-07-15T00:00:00Z',
    updatedAt: '2024-10-30T00:00:00Z',
    creator: {
      id: 'user-3',
      username: 'techteacher',
      avatarUrl: undefined,
    },
  },
];

// =============================================================================
// Component
// =============================================================================

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<GalleryTab>('public');
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Determine if viewing own profile
  useEffect(() => {
    const viewingOwnProfile = !username || (user?.username === username);
    setIsOwnProfile(Boolean(viewingOwnProfile));

    // Load profile data
    loadProfile(viewingOwnProfile ? undefined : username);
  }, [username, user]);

  // Load canvases when tab changes
  useEffect(() => {
    loadCanvases(activeTab);
  }, [activeTab, isOwnProfile, profile]);

  // Check follow status
  useEffect(() => {
    if (profile && !isOwnProfile && isAuthenticated) {
      checkFollowStatus(profile.id);
    }
  }, [profile, isOwnProfile, isAuthenticated]);

  const loadProfile = useCallback(async (profileUsername?: string) => {
    setLoading(true);
    try {
      if (isLocalDevMode) {
        // Use mock data in local dev mode
        setProfile(mockProfile);
        return;
      }

      let response;
      if (profileUsername) {
        response = await userApi.getProfileByUsername(profileUsername);
      } else {
        response = await userApi.getProfile();
      }

      if (response.success && response.data) {
        setProfile(response.data.profile);
      } else {
        console.error('Failed to load profile:', response.error);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fall back to mock data if API fails
      if (isLocalDevMode) {
        setProfile(mockProfile);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCanvases = useCallback(async (tab: GalleryTab) => {
    try {
      if (isLocalDevMode) {
        // Use mock data in local dev mode
        if (tab === 'public') {
          setCanvases(mockCanvases.filter(c => c.visibility === 'public'));
        } else if (tab === 'private') {
          setCanvases(mockCanvases.filter(c => c.visibility === 'private'));
        } else if (tab === 'favorites') {
          setCanvases(mockFavorites);
        }
        return;
      }

      if (tab === 'favorites') {
        const response = await favoritesApi.list();
        if (response.success && response.data) {
          setCanvases(response.data.items.map((fav: FavoriteCanvas) => ({
            id: fav.canvas.id,
            name: fav.canvas.name,
            thumbnailUrl: fav.canvas.thumbnail,
            visibility: fav.canvas.visibility,
            viewCount: fav.canvas.viewCount || 0,
            createdAt: fav.canvas.createdAt,
            updatedAt: fav.canvas.updatedAt,
            creator: fav.canvas.owner,
          })));
        }
      } else {
        const response = await canvasApi.list({ visibility: tab });
        if (response.success && response.data) {
          setCanvases(response.data.items.map((canvas: Canvas) => ({
            id: canvas.id,
            name: canvas.name,
            thumbnailUrl: canvas.thumbnail,
            visibility: canvas.visibility,
            viewCount: canvas.viewCount || 0,
            createdAt: canvas.createdAt,
            updatedAt: canvas.updatedAt,
            creator: canvas.owner,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load canvases:', error);
      // Fall back to mock data
      if (isLocalDevMode) {
        if (tab === 'public') {
          setCanvases(mockCanvases.filter(c => c.visibility === 'public'));
        } else if (tab === 'private') {
          setCanvases(mockCanvases.filter(c => c.visibility === 'private'));
        } else if (tab === 'favorites') {
          setCanvases(mockFavorites);
        }
      }
    }
  }, [profile]);

  const checkFollowStatus = async (userId: string) => {
    if (isLocalDevMode) return;
    try {
      const response = await followApi.isFollowing(userId);
      if (response.success && response.data) {
        setIsFollowing(response.data.isFollowing);
      }
    } catch (error) {
      console.error('Failed to check follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!profile || !isAuthenticated) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followApi.unfollow(profile.id);
        setIsFollowing(false);
        setProfile(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, followers: prev.stats.followers - 1 }
        } : null);
      } else {
        await followApi.follow(profile.id);
        setIsFollowing(true);
        setProfile(prev => prev ? {
          ...prev,
          stats: { ...prev.stats, followers: prev.stats.followers + 1 }
        } : null);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.errorContainer}>
        <SNIcon name="userX" size={48} color="#64748b" />
        <h2 style={styles.errorTitle}>User not found</h2>
        <p style={styles.errorText}>
          The profile you're looking for doesn't exist or has been removed.
        </p>
        <SNButton variant="primary" onClick={() => navigate('/')}>
          Go Home
        </SNButton>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <SNIconButton
            icon="arrowLeft"
            onClick={() => navigate(-1)}
            variant="ghost"
          />
          <Link to="/" style={styles.logoLink}>
            <div style={styles.logoIcon}>
              <SNIcon name="sticker" size={18} color="#fff" />
            </div>
            <span style={styles.logoText}>StickerNest</span>
          </Link>
        </div>
        <div style={styles.headerRight}>
          {isAuthenticated ? (
            <SNButton variant="ghost" onClick={() => navigate('/gallery')}>
              Gallery
            </SNButton>
          ) : (
            <SNButton variant="primary" onClick={() => navigate('/login')}>
              Sign In
            </SNButton>
          )}
        </div>
      </header>

      {/* Profile Header */}
      <section style={styles.profileHeader}>
        <div style={styles.profileInfo}>
          <div style={styles.avatar}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} style={styles.avatarImg} />
            ) : (
              <span style={styles.avatarText}>
                {profile.displayName?.[0] || profile.username[0]}
              </span>
            )}
            {profile.isCreator && (
              <div style={styles.creatorBadge}>
                <SNIcon name="check" size={12} color="#fff" />
              </div>
            )}
          </div>

          <div style={styles.profileDetails}>
            <div style={styles.nameRow}>
              <h1 style={styles.displayName}>
                {profile.displayName || profile.username}
              </h1>
              {isOwnProfile && (
                <SNButton
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  Edit Profile
                </SNButton>
              )}
              {!isOwnProfile && isAuthenticated && (
                <SNButton
                  variant={isFollowing ? "secondary" : "primary"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </SNButton>
              )}
            </div>
            <p style={styles.username}>@{profile.username}</p>
            {profile.bio && <p style={styles.bio}>{profile.bio}</p>}

            <div style={styles.metaRow}>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" style={styles.metaLink}>
                  <SNIcon name="link" size={14} />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span style={styles.metaItem}>
                <SNIcon name="calendar" size={14} />
                Joined {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{profile.stats.publicCanvases}</span>
            <span style={styles.statLabel}>Canvases</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{formatNumber(profile.stats.followers)}</span>
            <span style={styles.statLabel}>Followers</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{formatNumber(profile.stats.following)}</span>
            <span style={styles.statLabel}>Following</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{formatNumber(profile.stats.totalViews)}</span>
            <span style={styles.statLabel}>Views</span>
          </div>
        </div>
      </section>

      {/* Gallery Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'public' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('public')}
          >
            <SNIcon name="globe" size={16} />
            Public
          </button>
          {isOwnProfile && (
            <>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'private' ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab('private')}
              >
                <SNIcon name="lock" size={16} />
                Private
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'favorites' ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab('favorites')}
              >
                <SNIcon name="heart" size={16} />
                Favorites
              </button>
            </>
          )}
        </div>
      </div>

      {/* Canvas Gallery */}
      <section style={styles.gallery}>
        {canvases.length === 0 ? (
          <div style={styles.emptyState}>
            <SNIcon
              name={activeTab === 'favorites' ? 'heart' : 'layout'}
              size={48}
              color="#64748b"
            />
            <h3 style={styles.emptyTitle}>
              {activeTab === 'favorites'
                ? 'No favorites yet'
                : activeTab === 'private'
                ? 'No private canvases'
                : 'No public canvases'}
            </h3>
            <p style={styles.emptyText}>
              {activeTab === 'favorites'
                ? 'Canvases you bookmark will appear here'
                : isOwnProfile
                ? 'Create your first canvas to get started'
                : 'This user hasn\'t published any canvases yet'}
            </p>
            {isOwnProfile && activeTab !== 'favorites' && (
              <SNButton variant="primary" onClick={() => navigate('/gallery')}>
                Create Canvas
              </SNButton>
            )}
          </div>
        ) : (
          <div style={styles.canvasGrid}>
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                style={styles.canvasCard}
                onClick={() => navigate(`/c/${canvas.id}`)}
              >
                <div style={styles.canvasThumbnail}>
                  {canvas.thumbnailUrl ? (
                    <img src={canvas.thumbnailUrl} alt={canvas.name} style={styles.thumbnailImg} />
                  ) : (
                    <div style={styles.thumbnailPlaceholder}>
                      <SNIcon name="layout" size={32} color="rgba(139, 92, 246, 0.3)" />
                    </div>
                  )}
                  <div style={styles.canvasOverlay}>
                    <SNButton variant="primary" size="sm">View Canvas</SNButton>
                  </div>
                </div>

                <div style={styles.canvasInfo}>
                  <h3 style={styles.canvasName}>{canvas.name}</h3>
                  {canvas.creator && (
                    <p style={styles.canvasCreator}>
                      by @{canvas.creator.username}
                    </p>
                  )}
                  <div style={styles.canvasMeta}>
                    <span style={styles.canvasMetaItem}>
                      <SNIcon name="eye" size={12} />
                      {formatNumber(canvas.viewCount)}
                    </span>
                    <span style={styles.canvasMetaItem}>
                      {formatDate(canvas.updatedAt)}
                    </span>
                  </div>
                </div>

                {isOwnProfile && activeTab !== 'favorites' && (
                  <div style={styles.canvasActions}>
                    <SNIconButton
                      icon="edit"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/canvas/${canvas.id}`);
                      }}
                    />
                    <SNIconButton
                      icon="moreHorizontal"
                      size="sm"
                      variant="ghost"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                {activeTab === 'favorites' && (
                  <SNIconButton
                    icon="heart"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Remove from favorites
                    }}
                    style={styles.favoriteButton}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a12',
    color: '#f1f5f9',
  },

  // Loading & Error
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a12',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a12',
    gap: 16,
    padding: 40,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 16px',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 40px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
    color: 'inherit',
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#f1f5f9',
  },

  // Profile Header
  profileHeader: {
    padding: '40px 80px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  profileInfo: {
    display: 'flex',
    gap: 32,
    marginBottom: 32,
  },
  avatar: {
    position: 'relative',
    width: 120,
    height: 120,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderRadius: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    objectFit: 'cover',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
  },
  creatorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    background: '#22c55e',
    borderRadius: 8,
    border: '3px solid #0a0a12',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  displayName: {
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  username: {
    fontSize: 16,
    color: '#64748b',
    margin: '0 0 12px',
  },
  bio: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: '0 0 16px',
    maxWidth: 600,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#64748b',
  },
  metaLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#8b5cf6',
    textDecoration: 'none',
  },

  // Stats
  statsRow: {
    display: 'flex',
    gap: 48,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
  },

  // Tabs
  tabsContainer: {
    padding: '0 80px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tabs: {
    display: 'flex',
    gap: 8,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 0.2s, border-color 0.2s',
  },
  tabActive: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
  },

  // Gallery
  gallery: {
    padding: '40px 80px',
  },
  canvasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 24,
  },
  canvasCard: {
    position: 'relative',
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  canvasThumbnail: {
    position: 'relative',
    aspectRatio: '16 / 10',
    background: 'rgba(15, 15, 25, 0.8)',
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
  },
  canvasOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  canvasInfo: {
    padding: 16,
  },
  canvasName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  canvasCreator: {
    fontSize: 13,
    color: '#8b5cf6',
    margin: '0 0 8px',
  },
  canvasMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  canvasMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#64748b',
  },
  canvasActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    gap: 4,
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#ef4444',
  },

  // Empty State
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 40px',
    textAlign: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
    maxWidth: 400,
  },
};

// Add hover styles via CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .canvas-card:hover {
    transform: translateY(-4px);
    border-color: rgba(139, 92, 246, 0.3) !important;
  }

  .canvas-card:hover .canvas-overlay,
  .canvas-card:hover .canvas-actions {
    opacity: 1 !important;
  }
`;
document.head.appendChild(styleSheet);

export default ProfilePage;
