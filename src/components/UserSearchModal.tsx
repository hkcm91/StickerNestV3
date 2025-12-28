/**
 * StickerNest v2 - User Search Modal
 * Modal for searching and discovering users
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import {
  useUserSearchStore,
  useSearchQuery,
  useSearchResults,
  useSearchLoading,
  useSearchModalOpen,
  useRecentSearches,
  useSuggestedUsers,
  type SearchableUser,
} from '../state/useUserSearchStore';
import { useFollowStore } from '../state/useFollowStore';

// ============================================
// User Search Modal Component
// ============================================

export const UserSearchModal: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Store state
  const query = useSearchQuery();
  const results = useSearchResults();
  const isLoading = useSearchLoading();
  const isModalOpen = useSearchModalOpen();
  const recentSearches = useRecentSearches();
  const suggestedUsers = useSuggestedUsers();

  // Store actions
  const { setQuery, searchUsers, closeModal, addRecentSearch, loadSuggestedUsers, clearRecentSearches } =
    useUserSearchStore();
  const { toggleFollow, isFollowing } = useFollowStore();

  // Load suggested users on mount
  useEffect(() => {
    if (isModalOpen && suggestedUsers.length === 0) {
      loadSuggestedUsers();
    }
  }, [isModalOpen, suggestedUsers.length, loadSuggestedUsers]);

  // Focus input when modal opens
  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        searchUsers(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchUsers]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const handleUserClick = useCallback(
    (user: SearchableUser) => {
      addRecentSearch(user.username);
      closeModal();
      navigate(`/u/${user.username}`);
    },
    [addRecentSearch, closeModal, navigate]
  );

  const handleFollowClick = useCallback(
    (e: React.MouseEvent, userId: string) => {
      e.stopPropagation();
      toggleFollow(userId);
    },
    [toggleFollow]
  );

  if (!isModalOpen) return null;

  return (
    <div style={styles.overlay} onClick={closeModal}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Find People</h2>
          <SNIconButton icon="x" variant="ghost" size="sm" onClick={closeModal} />
        </div>

        {/* Search Input */}
        <div style={styles.searchContainer}>
          <SNIcon name="search" size={18} color="#64748b" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            style={styles.searchInput}
          />
          {query && (
            <SNIconButton
              icon="x"
              variant="ghost"
              size="sm"
              onClick={() => setQuery('')}
            />
          )}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Loading */}
          {isLoading && (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span>Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && query && results.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Results</h3>
              <div style={styles.userList}>
                {results.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isFollowing={isFollowing(user.id)}
                    onUserClick={() => handleUserClick(user)}
                    onFollowClick={(e) => handleFollowClick(e, user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div style={styles.emptyState}>
              <SNIcon name="userX" size={48} color="rgba(139, 92, 246, 0.3)" />
              <p style={styles.emptyText}>No users found for "{query}"</p>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>Recent</h3>
                <button style={styles.clearButton} onClick={clearRecentSearches}>
                  Clear
                </button>
              </div>
              <div style={styles.recentList}>
                {recentSearches.map((username) => (
                  <button
                    key={username}
                    style={styles.recentItem}
                    onClick={() => {
                      closeModal();
                      navigate(`/u/${username}`);
                    }}
                  >
                    <SNIcon name="clock" size={14} color="#64748b" />
                    <span>@{username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Users */}
          {!query && suggestedUsers.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Suggested</h3>
              <div style={styles.userList}>
                {suggestedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    isFollowing={isFollowing(user.id)}
                    onUserClick={() => handleUserClick(user)}
                    onFollowClick={(e) => handleFollowClick(e, user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!query && recentSearches.length === 0 && suggestedUsers.length === 0 && (
            <div style={styles.emptyState}>
              <SNIcon name="users" size={48} color="rgba(139, 92, 246, 0.3)" />
              <p style={styles.emptyText}>Search for users to follow</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// User Card Component
// ============================================

interface UserCardProps {
  user: SearchableUser;
  isFollowing: boolean;
  onUserClick: () => void;
  onFollowClick: (e: React.MouseEvent) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  isFollowing,
  onUserClick,
  onFollowClick,
}) => {
  return (
    <div style={styles.userCard} onClick={onUserClick}>
      <div style={styles.userAvatar}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.username} style={styles.avatarImg} />
        ) : (
          <span style={styles.avatarText}>
            {user.displayName[0] || user.username[0]}
          </span>
        )}
        {user.isVerified && (
          <div style={styles.verifiedBadge}>
            <SNIcon name="check" size={10} color="#fff" />
          </div>
        )}
      </div>

      <div style={styles.userInfo}>
        <div style={styles.userName}>
          <span style={styles.displayName}>{user.displayName}</span>
          {user.isCreator && (
            <span style={styles.creatorBadge}>Creator</span>
          )}
        </div>
        <span style={styles.username}>@{user.username}</span>
        {user.bio && <p style={styles.bio}>{user.bio}</p>}
        <div style={styles.userStats}>
          <span>{user.followerCount} followers</span>
          <span>•</span>
          <span>{user.canvasCount} canvases</span>
        </div>
      </div>

      <SNButton
        variant={isFollowing ? 'secondary' : 'primary'}
        size="sm"
        onClick={onFollowClick}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </SNButton>
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 100,
    zIndex: 9999,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: 'calc(100vh - 200px)',
    background: 'rgba(20, 20, 30, 0.98)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: 15,
    outline: 'none',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '40px 20px',
    color: '#64748b',
    fontSize: 14,
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  clearButton: {
    background: 'transparent',
    border: 'none',
    color: '#8b5cf6',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
  },
  userAvatar: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    background: '#22c55e',
    borderRadius: 4,
    border: '2px solid rgba(20, 20, 30, 0.98)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  creatorBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#8b5cf6',
    background: 'rgba(139, 92, 246, 0.15)',
    padding: '2px 6px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  username: {
    fontSize: 13,
    color: '#64748b',
  },
  bio: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '4px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    fontSize: 11,
    color: '#64748b',
  },
};

// Add spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .user-search-modal .user-card:hover {
      background: rgba(139, 92, 246, 0.1) !important;
      border-color: rgba(139, 92, 246, 0.2) !important;
    }
    .user-search-modal .recent-item:hover {
      background: rgba(139, 92, 246, 0.1) !important;
    }
  `;
  if (!document.querySelector('[data-user-search-styles]')) {
    styleSheet.setAttribute('data-user-search-styles', '');
    document.head.appendChild(styleSheet);
  }
}

export default UserSearchModal;
