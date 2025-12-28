/**
 * PublicProfilePage
 * Public-facing user profile page accessible at /@username
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { usePublicProfileStore } from '../../state/usePublicProfileStore';
import {
  ProfileHeader,
  ProfileTabs,
  ProfileAbout,
  CanvasGrid,
} from '../../components/public';
import type { ProfileTab } from '../../types/profile';

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const {
    profile,
    canvases,
    collections,
    favorites,
    activeTab,
    isLoading,
    error,
    isFollowing,
    followLoading,
    fetchProfile,
    fetchCanvases,
    fetchCollections,
    fetchFavorites,
    setActiveTab,
    toggleFollow,
  } = usePublicProfileStore();

  const [likedCanvases, setLikedCanvases] = useState<Set<string>>(new Set());

  // Fetch profile data on mount
  useEffect(() => {
    if (username) {
      // Remove @ prefix if present
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
      fetchProfile(cleanUsername);
    }
  }, [username, fetchProfile]);

  // Fetch tab data when tab changes
  useEffect(() => {
    if (!profile) return;

    switch (activeTab) {
      case 'canvases':
        if (canvases.length === 0) {
          fetchCanvases(profile.id);
        }
        break;
      case 'collections':
        if (collections.length === 0) {
          fetchCollections(profile.id);
        }
        break;
      case 'favorites':
        if (favorites.length === 0) {
          fetchFavorites(profile.id);
        }
        break;
    }
  }, [activeTab, profile, canvases.length, collections.length, favorites.length, fetchCanvases, fetchCollections, fetchFavorites]);

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
  };

  const handleLike = (canvasId: string) => {
    setLikedCanvases((prev) => {
      const next = new Set(prev);
      if (next.has(canvasId)) {
        next.delete(canvasId);
      } else {
        next.add(canvasId);
      }
      return next;
    });
    // TODO: Call API to persist like
  };

  // Loading state
  if (isLoading && !profile) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading profile...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>
          <SNIcon name="alertCircle" size={48} color="#ef4444" />
        </div>
        <h2 style={styles.errorTitle}>Profile Not Found</h2>
        <p style={styles.errorText}>{error}</p>
        <SNButton variant="secondary" onClick={() => navigate('/explore')}>
          Explore Canvases
        </SNButton>
      </div>
    );
  }

  // No profile found
  if (!profile) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>
          <SNIcon name="userX" size={48} color="#64748b" />
        </div>
        <h2 style={styles.errorTitle}>User Not Found</h2>
        <p style={styles.errorText}>
          The user @{username} doesn't exist or their profile is private.
        </p>
        <SNButton variant="secondary" onClick={() => navigate('/explore')}>
          Explore Canvases
        </SNButton>
      </div>
    );
  }

  // Get current tab content
  const getCurrentTabContent = () => {
    switch (activeTab) {
      case 'canvases':
        return (
          <CanvasGrid
            canvases={canvases}
            viewMode="grid"
            isLoading={isLoading}
            onLike={handleLike}
            likedIds={likedCanvases}
            emptyMessage={`${profile.displayName} hasn't published any canvases yet`}
            emptyIcon="layout"
          />
        );

      case 'collections':
        return (
          <div style={styles.collectionsGrid}>
            {collections.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <SNIcon name="folder" size={48} color="rgba(139, 92, 246, 0.3)" />
                </div>
                <p style={styles.emptyText}>No collections yet</p>
              </div>
            ) : (
              collections.map((collection) => (
                <div
                  key={collection.id}
                  style={styles.collectionCard}
                  onClick={() => navigate(`/u/${profile.username}/collections/${collection.slug || collection.id}`)}
                >
                  <div style={styles.collectionThumbnail}>
                    {collection.coverUrl ? (
                      <img
                        src={collection.coverUrl}
                        alt={collection.name}
                        style={styles.collectionImg}
                      />
                    ) : (
                      <SNIcon name="folder" size={32} color="rgba(139, 92, 246, 0.4)" />
                    )}
                  </div>
                  <div style={styles.collectionInfo}>
                    <h3 style={styles.collectionName}>{collection.name}</h3>
                    <span style={styles.collectionCount}>
                      {collection.canvasCount} {collection.canvasCount === 1 ? 'canvas' : 'canvases'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case 'favorites':
        return (
          <CanvasGrid
            canvases={favorites}
            viewMode="grid"
            showAuthor
            isLoading={isLoading}
            onLike={handleLike}
            likedIds={likedCanvases}
            emptyMessage={`${profile.displayName} hasn't favorited any canvases yet`}
            emptyIcon="heart"
          />
        );

      case 'about':
        return <ProfileAbout profile={profile} />;

      default:
        return null;
    }
  };

  const pageTitle = `${profile.displayName} (@${profile.username}) | StickerNest`;

  // Set page title
  useEffect(() => {
    document.title = pageTitle;
    return () => {
      document.title = 'StickerNest';
    };
  }, [pageTitle]);

  return (
    <div style={styles.page}>
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={false} // TODO: Check against current user
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={toggleFollow}
        />

        {/* Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          canvasCounts={{
            all: profile.stats.publicCanvases,
            collections: collections.length,
            favorites: favorites.length,
          }}
        />

        {/* Tab Content */}
        <div style={styles.content}>
          {getCurrentTabContent()}
        </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%)',
  },
  content: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 40px 60px',
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },

  // Error
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 16,
    padding: 20,
    textAlign: 'center',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  errorText: {
    fontSize: 15,
    color: '#64748b',
    margin: '0 0 16px',
    maxWidth: 400,
  },

  // Empty state
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    background: 'rgba(139, 92, 246, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    margin: 0,
  },

  // Collections grid
  collectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
  },
  collectionCard: {
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  collectionThumbnail: {
    aspectRatio: '1',
    background: 'rgba(139, 92, 246, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  collectionInfo: {
    padding: 16,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 4px',
  },
  collectionCount: {
    fontSize: 12,
    color: '#64748b',
  },
};

export default PublicProfilePage;
