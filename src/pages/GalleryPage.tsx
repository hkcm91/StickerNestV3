/**
 * StickerNest v2 - Gallery Page (User Profile)
 * User's profile page with canvas gallery, follow functionality, and stats
 * Can view own profile or other users' public profiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canvasApi, userApi, followApi, type Canvas, type UserStats, type ExtendedUserProfile } from '../services/apiClient';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { ProfileHeader } from '../components/public/ProfileHeader';
import { ThumbnailUploadModal } from '../components/ThumbnailUploadModal';
import type { PublicProfile, ProfileTab } from '../types/profile';

// Extend Canvas with widget count and slug for display
interface GalleryCanvas extends Canvas {
  widgetCount: number;
  slug?: string;
}

interface GalleryStats extends UserStats {
  aiGenerationsLimit: number;
}

const GalleryPage: React.FC = () => {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, signOut, isLocalDevMode } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Canvas and stats state
  const [canvases, setCanvases] = useState<GalleryCanvas[]>([]);
  const [stats, setStats] = useState<GalleryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [activeTab, setActiveTab] = useState<'public' | 'private' | 'favorites'>('public');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');

  // Modal state
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [thumbnailModalCanvas, setThumbnailModalCanvas] = useState<string | null>(null);

  const copySlugUrl = useCallback((slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }, []);

  // Determine if viewing own profile
  useEffect(() => {
    const viewingOwnProfile = !username || (user?.username === username);
    setIsOwnProfile(Boolean(viewingOwnProfile));
  }, [username, user]);

  // Fetch profile and canvases data
  const fetchData = useCallback(async () => {
    console.log('[Gallery] fetchData called, username:', username, 'isLocalDevMode:', isLocalDevMode);

    setLoading(true);
    setError(null);

    try {
      if (isLocalDevMode) {
        console.log('[Gallery] In local dev mode, loading from localStorage');
        // Load canvases from localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        const indexStr = localStorage.getItem('stickernest-canvas-index');
        const canvasIds: string[] = indexStr ? JSON.parse(indexStr) : [];

        const loadedCanvases: GalleryCanvas[] = [];
        for (const canvasId of canvasIds) {
          const canvasStr = localStorage.getItem(`stickernest-canvas-${canvasId}`);
          if (canvasStr) {
            try {
              const canvasData = JSON.parse(canvasStr);
              loadedCanvases.push({
                id: canvasData.canvas.id,
                name: canvasData.canvas.name || 'Untitled Canvas',
                description: canvasData.canvas.description || '',
                visibility: canvasData.canvas.visibility || 'private',
                widgets: canvasData.widgets || [],
                widgetCount: canvasData.widgets?.length || 0,
                viewCount: canvasData.canvas.viewCount || 0,
                slug: canvasData.canvas.slug,
                settings: {},
                updatedAt: canvasData.canvas.updatedAt || canvasData.canvas.createdAt || new Date().toISOString(),
                createdAt: canvasData.canvas.createdAt || new Date().toISOString(),
                ownerId: canvasData.canvas.userId || 'demo-user-123',
                owner: {
                  id: canvasData.canvas.userId || 'demo-user-123',
                  username: user?.username || 'user',
                  avatarUrl: undefined,
                },
              });
            } catch (e) {
              console.warn('[Gallery] Failed to parse canvas:', canvasId, e);
            }
          }
        }

        // Sort by updatedAt descending
        loadedCanvases.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setCanvases(loadedCanvases);

        // In local dev mode, we need a basic profile without API
        // Use minimal data from auth context
        if (user) {
          const localProfile: PublicProfile = {
            id: user.id,
            username: user.username || 'user',
            displayName: user.displayName || user.username || 'User',
            avatarUrl: user.avatarUrl,
            isVerified: false,
            isCreator: false,
            role: 'user',
            stats: {
              publicCanvases: loadedCanvases.filter(c => c.visibility === 'public').length,
              followers: 0,
              following: 0,
              totalViews: loadedCanvases.reduce((sum, c) => sum + (c.viewCount || 0), 0),
              totalLikes: 0,
            },
            createdAt: new Date().toISOString(),
          };
          setProfile(localProfile);
        }
        setStats({
          canvasCount: loadedCanvases.length,
          widgetCount: loadedCanvases.reduce((sum, c) => sum + (c.widgetCount || 0), 0),
          totalViews: loadedCanvases.reduce((sum, c) => sum + (c.viewCount || 0), 0),
          totalAiGenerations: 0,
          storageUsed: 0,
          storageLimit: 1024 * 1024 * 1024,
          aiGenerationsLimit: 100,
        });
        setLoading(false);
        return;
      }

      // Fetch profile data
      let profileResponse;
      if (username) {
        // Viewing someone else's profile
        profileResponse = await userApi.getProfileByUsername(username);
      } else {
        // Viewing own profile
        profileResponse = await userApi.getProfile();
      }

      if (profileResponse.success && profileResponse.data) {
        const apiProfile = profileResponse.data.profile;

        // Map to PublicProfile format
        const publicProfile: PublicProfile = {
          id: apiProfile.id,
          username: apiProfile.username,
          email: apiProfile.email,
          displayName: apiProfile.displayName || apiProfile.username,
          avatarUrl: apiProfile.avatarUrl,
          bannerUrl: undefined,
          bio: apiProfile.bio,
          website: apiProfile.website,
          location: apiProfile.location,
          socialLinks: apiProfile.socialLinks,
          isVerified: apiProfile.isVerified || false,
          isCreator: apiProfile.isCreator || false,
          role: apiProfile.role || 'user',
          stats: {
            publicCanvases: apiProfile.stats?.publicCanvases || 0,
            followers: apiProfile.stats?.followers || 0,
            following: apiProfile.stats?.following || 0,
            totalViews: apiProfile.stats?.totalViews || 0,
            totalLikes: 0,
          },
          createdAt: apiProfile.createdAt,
          joinedAt: apiProfile.createdAt,
        };

        setProfile(publicProfile);

        // Also check if this is the user's own profile by comparing user IDs
        // This handles cases where username comparison fails (e.g., OAuth users)
        const isOwn = user && publicProfile.id === user.id;
        if (isOwn) {
          setIsOwnProfile(true);
        }

        // Check follow status if viewing another user's profile
        if (!isOwn && !isOwnProfile && isAuthenticated) {
          const followResponse = await followApi.isFollowing(publicProfile.id);
          if (followResponse.success && followResponse.data) {
            setIsFollowing(followResponse.data.isFollowing);
          }
        }
      } else {
        setError(profileResponse.error?.message || 'Failed to load profile');
        setLoading(false);
        return;
      }

      // Fetch canvases and stats in parallel
      const [canvasResponse, statsResponse] = await Promise.all([
        canvasApi.list({ sortBy: 'updatedAt', sortOrder: 'desc' }),
        userApi.getStats(),
      ]);

      if (canvasResponse.success && canvasResponse.data) {
        // Map API canvases to gallery format
        const galleryCanvases: GalleryCanvas[] = canvasResponse.data.items.map(canvas => ({
          ...canvas,
          widgetCount: canvas.widgets?.length || 0,
        }));
        setCanvases(galleryCanvases);
      } else {
        setError(canvasResponse.error?.message || 'Failed to load canvases');
      }

      if (statsResponse.success && statsResponse.data) {
        setStats({
          ...statsResponse.data,
          aiGenerationsLimit: 100, // TODO: Get from subscription tier
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [username, authLoading, isAuthenticated, isLocalDevMode, user, isOwnProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!profile || followLoading || !isAuthenticated) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const response = await followApi.unfollow(profile.id);
        if (response.success) {
          setIsFollowing(false);
          setProfile(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, followers: prev.stats.followers - 1 }
          } : null);
        }
      } else {
        const response = await followApi.follow(profile.id);
        if (response.success) {
          setIsFollowing(true);
          setProfile(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, followers: prev.stats.followers + 1 }
          } : null);
        }
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      if (isLocalDevMode) {
        // Create canvas and persist to localStorage
        const canvasId = `canvas-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const canvasData = {
          canvas: {
            id: canvasId,
            userId: user?.id || 'demo-user-123',
            name: newCanvasName,
            visibility: 'private',
            createdAt: now,
            updatedAt: now,
            width: 1920,
            height: 1080,
            hasPassword: false,
          },
          widgets: [],
          pipelines: [],
          entities: [],
        };

        // Save to localStorage
        localStorage.setItem(`stickernest-canvas-${canvasId}`, JSON.stringify(canvasData));

        // Update canvas index
        const indexStr = localStorage.getItem('stickernest-canvas-index');
        const index: string[] = indexStr ? JSON.parse(indexStr) : [];
        if (!index.includes(canvasId)) {
          index.push(canvasId);
          localStorage.setItem('stickernest-canvas-index', JSON.stringify(index));
        }

        const newCanvas: GalleryCanvas = {
          id: canvasId,
          name: newCanvasName,
          visibility: 'private',
          widgets: [],
          widgetCount: 0,
          viewCount: 0,
          settings: {},
          updatedAt: now,
          createdAt: now,
          ownerId: user?.id || 'demo-user-123',
        };
        setCanvases(prev => [newCanvas, ...prev]);
        setShowNewCanvasModal(false);
        setNewCanvasName('');
        navigate(`/create/${newCanvas.id}`);
        return;
      }

      const response = await canvasApi.create({ name: newCanvasName });

      if (response.success && response.data) {
        const newCanvas: GalleryCanvas = {
          ...response.data.canvas,
          widgetCount: 0,
        };
        setCanvases(prev => [newCanvas, ...prev]);
        setShowNewCanvasModal(false);
        setNewCanvasName('');
        navigate(`/create/${newCanvas.id}`);
      } else {
        setError(response.error?.message || 'Failed to create canvas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create canvas');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    if (!confirm('Are you sure you want to delete this canvas? This action cannot be undone.')) return;

    try {
      if (isLocalDevMode) {
        // Delete from localStorage
        localStorage.removeItem(`stickernest-canvas-${canvasId}`);

        // Update canvas index
        const indexStr = localStorage.getItem('stickernest-canvas-index');
        const index: string[] = indexStr ? JSON.parse(indexStr) : [];
        const newIndex = index.filter(id => id !== canvasId);
        localStorage.setItem('stickernest-canvas-index', JSON.stringify(newIndex));

        setCanvases(prev => prev.filter(c => c.id !== canvasId));
        return;
      }

      const response = await canvasApi.delete(canvasId);

      if (response.success) {
        setCanvases(prev => prev.filter(c => c.id !== canvasId));
      } else {
        setError(response.error?.message || 'Failed to delete canvas');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete canvas');
    }
  };

  const handleSaveThumbnail = async (canvasId: string, thumbnailDataUrl: string) => {
    try {
      if (isLocalDevMode) {
        // Save to localStorage
        const canvasStr = localStorage.getItem(`stickernest-canvas-${canvasId}`);
        if (canvasStr) {
          const canvasData = JSON.parse(canvasStr);
          canvasData.canvas.thumbnail = thumbnailDataUrl;
          localStorage.setItem(`stickernest-canvas-${canvasId}`, JSON.stringify(canvasData));

          // Update state
          setCanvases(prev => prev.map(c =>
            c.id === canvasId ? { ...c, thumbnail: thumbnailDataUrl } : c
          ));
        }
        return;
      }

      // Upload to API
      const response = await canvasApi.update(canvasId, { thumbnail: thumbnailDataUrl });

      if (response.success && response.data) {
        setCanvases(prev => prev.map(c =>
          c.id === canvasId ? { ...c, thumbnail: thumbnailDataUrl } : c
        ));
      } else {
        throw new Error(response.error?.message || 'Failed to save thumbnail');
      }
    } catch (err) {
      console.error('Failed to save thumbnail:', err);
      throw err;
    }
  };

  // Filter canvases by active tab
  const filteredCanvases = canvases.filter(canvas => {
    if (activeTab === 'public') return canvas.visibility === 'public';
    if (activeTab === 'private') return canvas.visibility === 'private' || canvas.visibility === 'unlisted';
    if (activeTab === 'favorites') return false; // TODO: Implement favorites
    return true;
  });

  const sortedCanvases = [...filteredCanvases].sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading profile...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={styles.errorContainer}>
        <SNIcon name="alertCircle" size={48} color="#ef4444" />
        <h2 style={styles.errorTitle}>Profile Not Found</h2>
        <p style={styles.errorText}>{error}</p>
        <SNButton variant="secondary" onClick={() => navigate('/')}>
          Go Home
        </SNButton>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Profile Header */}
      {profile && (
        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={handleFollowToggle}
        />
      )}

      {/* Main content */}
      <main style={styles.main}>
        {/* Tab Navigation */}
        <section style={styles.tabsSection}>
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
              <span style={styles.tabCount}>
                {canvases.filter(c => c.visibility === 'public').length}
              </span>
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
                  <span style={styles.tabCount}>
                    {canvases.filter(c => c.visibility === 'private' || c.visibility === 'unlisted').length}
                  </span>
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
                  <span style={styles.tabCount}>0</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* Canvases section */}
        <section style={styles.canvasesSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              {activeTab === 'public' ? 'Public Canvases' : activeTab === 'private' ? 'Private Canvases' : 'Favorites'}
            </h2>
            <div style={styles.sectionActions}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={styles.sortSelect}
              >
                <option value="updated">Recently updated</option>
                <option value="created">Recently created</option>
                <option value="name">Name</option>
              </select>
              <div style={styles.viewToggle}>
                <SNIconButton
                  icon="grid"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                />
                <SNIconButton
                  icon="list"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                />
              </div>
              {isOwnProfile && (
                <SNButton
                  variant="primary"
                  onClick={() => setShowNewCanvasModal(true)}
                >
                  <SNIcon name="plus" size="sm" />
                  New Canvas
                </SNButton>
              )}
            </div>
          </div>

          {error && (
            <div style={styles.error}>
              <SNIcon name="warning" size="sm" />
              <span>{error}</span>
              <SNButton variant="ghost" size="sm" onClick={() => setError(null)}>
                Dismiss
              </SNButton>
            </div>
          )}

          {sortedCanvases.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <SNIcon name={activeTab === 'favorites' ? 'heart' : 'canvas'} size="xl" />
              </div>
              <h3 style={styles.emptyTitle}>
                {activeTab === 'favorites'
                  ? 'No favorites yet'
                  : activeTab === 'public'
                  ? isOwnProfile ? 'No public canvases yet' : `${profile?.displayName} hasn't published any canvases yet`
                  : 'No private canvases yet'}
              </h3>
              <p style={styles.emptyText}>
                {activeTab === 'favorites'
                  ? 'Canvases you favorite will appear here'
                  : isOwnProfile
                  ? 'Create your first canvas to start building interactive experiences'
                  : 'Check back later for new content'}
              </p>
              {isOwnProfile && activeTab !== 'favorites' && (
                <SNButton variant="primary" onClick={() => setShowNewCanvasModal(true)}>
                  Create Canvas
                </SNButton>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div style={styles.canvasGrid}>
              {sortedCanvases.map((canvas) => (
                <div key={canvas.id} style={styles.canvasCard}>
                  <Link to={`/create/${canvas.id}`} style={styles.canvasCardLink}>
                    <div style={styles.canvasThumbnail}>
                      {canvas.thumbnail ? (
                        <img src={canvas.thumbnail} alt="" style={styles.thumbnailImg} />
                      ) : (
                        <div style={styles.thumbnailPlaceholder}>
                          <SNIcon name="canvas" size="xl" />
                        </div>
                      )}
                      <div style={styles.visibilityBadge}>
                        <SNIcon
                          name={canvas.visibility === 'public' ? 'globe' : canvas.visibility === 'unlisted' ? 'link' : 'lock'}
                          size="xs"
                        />
                      </div>
                    </div>
                    <div style={styles.canvasInfo}>
                      <h3 style={styles.canvasName}>{canvas.name}</h3>
                      <p style={styles.canvasMeta}>
                        {canvas.widgetCount} widgets • {formatDate(canvas.updatedAt)}
                      </p>
                      {canvas.slug && (
                        <div style={styles.slugRow}>
                          <span style={styles.slugText}>/c/{canvas.slug}</span>
                          <button
                            style={{
                              ...styles.copyButton,
                              ...(copiedSlug === canvas.slug ? styles.copyButtonCopied : {}),
                            }}
                            onClick={(e) => copySlugUrl(canvas.slug!, e)}
                            title="Copy URL"
                          >
                            <SNIcon name={copiedSlug === canvas.slug ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <div style={styles.canvasActions}>
                      <SNIconButton
                        icon="image"
                        variant="ghost"
                        size="sm"
                        tooltip="Upload Thumbnail"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setThumbnailModalCanvas(canvas.id);
                        }}
                      />
                      <SNIconButton
                        icon="edit"
                        variant="ghost"
                        size="sm"
                        tooltip="Edit"
                        onClick={() => navigate(`/create/${canvas.id}`)}
                      />
                      <SNIconButton
                        icon="share"
                        variant="ghost"
                        size="sm"
                        tooltip="Share"
                        onClick={() => {/* TODO: Open share modal */}}
                      />
                      <SNIconButton
                        icon="delete"
                        variant="ghost"
                        size="sm"
                        tooltip="Delete"
                        onClick={() => handleDeleteCanvas(canvas.id)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.canvasList}>
              {sortedCanvases.map((canvas) => (
                <div key={canvas.id} style={styles.canvasListItem}>
                  <Link to={`/create/${canvas.id}`} style={styles.canvasListLink}>
                    <div style={styles.listThumbnail}>
                      {canvas.thumbnail ? (
                        <img src={canvas.thumbnail} alt="" style={styles.listThumbnailImg} />
                      ) : (
                        <SNIcon name="canvas" size="lg" />
                      )}
                    </div>
                    <div style={styles.listInfo}>
                      <h3 style={styles.listName}>{canvas.name}</h3>
                      <p style={styles.listMeta}>
                        {canvas.widgetCount} widgets • {canvas.viewCount || 0} views • {formatDate(canvas.updatedAt)}
                      </p>
                      {canvas.slug && (
                        <div style={styles.slugRowList}>
                          <span style={styles.slugTextList}>/c/{canvas.slug}</span>
                          <button
                            style={{
                              ...styles.copyButtonSmall,
                              ...(copiedSlug === canvas.slug ? styles.copyButtonCopied : {}),
                            }}
                            onClick={(e) => copySlugUrl(canvas.slug!, e)}
                            title="Copy URL"
                          >
                            <SNIcon name={copiedSlug === canvas.slug ? 'check' : 'copy'} size="xs" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={styles.listVisibility}>
                      <SNIcon
                        name={canvas.visibility === 'public' ? 'globe' : canvas.visibility === 'unlisted' ? 'link' : 'lock'}
                        size="sm"
                      />
                      <span>{canvas.visibility}</span>
                    </div>
                  </Link>
                  {isOwnProfile && (
                    <div style={styles.listActions}>
                      <SNIconButton icon="image" variant="ghost" size="sm" onClick={() => setThumbnailModalCanvas(canvas.id)} tooltip="Upload Thumbnail" />
                      <SNIconButton icon="edit" variant="ghost" size="sm" onClick={() => navigate(`/create/${canvas.id}`)} />
                      <SNIconButton icon="share" variant="ghost" size="sm" onClick={() => {}} />
                      <SNIconButton icon="delete" variant="ghost" size="sm" onClick={() => handleDeleteCanvas(canvas.id)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Thumbnail Upload Modal */}
      {thumbnailModalCanvas && (
        <ThumbnailUploadModal
          isOpen={true}
          onClose={() => setThumbnailModalCanvas(null)}
          onSave={(dataUrl) => handleSaveThumbnail(thumbnailModalCanvas, dataUrl)}
          canvasId={thumbnailModalCanvas}
          currentThumbnail={canvases.find(c => c.id === thumbnailModalCanvas)?.thumbnail}
        />
      )}

      {/* New Canvas Modal */}
      {showNewCanvasModal && (
        <div style={styles.modalOverlay} onClick={() => setShowNewCanvasModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create New Canvas</h2>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Canvas Name</label>
              <input
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                placeholder="My Awesome Canvas"
                autoFocus
                style={styles.input}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCanvas()}
              />
            </div>
            <div style={styles.modalActions}>
              <SNButton variant="ghost" onClick={() => setShowNewCanvasModal(false)}>
                Cancel
              </SNButton>
              <SNButton
                variant="primary"
                onClick={handleCreateCanvas}
                disabled={!newCanvasName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Canvas'}
              </SNButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%)',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%)',
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
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 40px 60px',
  },
  // Tabs
  tabsSection: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    marginBottom: 40,
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
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#8b5cf6',
    borderBottomColor: '#8b5cf6',
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    color: '#8b5cf6',
  },
  // Canvases Section
  canvasesSection: {
    background: 'rgba(30, 30, 46, 0.3)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid rgba(139, 92, 246, 0.1)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  sectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  sortSelect: {
    padding: '8px 12px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
  },
  viewToggle: {
    display: 'flex',
    gap: 4,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 20,
    color: '#f87171',
    fontSize: 14,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    color: '#8b5cf6',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 8px',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    margin: '0 0 24px',
  },
  canvasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 20,
  },
  canvasCard: {
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  canvasCardLink: {
    display: 'block',
    textDecoration: 'none',
    color: 'inherit',
  },
  canvasThumbnail: {
    position: 'relative',
    aspectRatio: '16/10',
    background: 'rgba(139, 92, 246, 0.05)',
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
    color: '#64748b',
  },
  visibilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
  },
  canvasInfo: {
    padding: 16,
  },
  canvasName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  canvasMeta: {
    fontSize: 12,
    color: '#64748b',
    margin: '6px 0 0',
  },
  slugRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: '4px 8px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 6,
    width: 'fit-content',
  },
  slugText: {
    fontSize: 11,
    color: '#a78bfa',
    fontFamily: 'monospace',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    border: 'none',
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 4,
    color: '#a78bfa',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  copyButtonCopied: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
  },
  slugRowList: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  slugTextList: {
    fontSize: 11,
    color: '#8b5cf6',
    fontFamily: 'monospace',
  },
  copyButtonSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    border: 'none',
    background: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 4,
    color: '#a78bfa',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  canvasActions: {
    display: 'flex',
    gap: 4,
    padding: '0 12px 12px',
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
  },
  canvasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  canvasListItem: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 8,
    border: '1px solid rgba(139, 92, 246, 0.1)',
    padding: 12,
    gap: 12,
  },
  canvasListLink: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    textDecoration: 'none',
    color: 'inherit',
  },
  listThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6',
    overflow: 'hidden',
  },
  listThumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  listMeta: {
    fontSize: 12,
    color: '#64748b',
    margin: '4px 0 0',
  },
  listVisibility: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#64748b',
    fontSize: 12,
  },
  listActions: {
    display: 'flex',
    gap: 4,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(30, 30, 46, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
};

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('[data-gallery-styles]')) {
  styleSheet.setAttribute('data-gallery-styles', '');
  document.head.appendChild(styleSheet);
}

export default GalleryPage;
