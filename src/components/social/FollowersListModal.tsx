/**
 * StickerNest v2 - Followers/Following List Modal
 * Display list of followers or following users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { FollowButton } from '../public/FollowButton';
import { followApi, type FollowedUser } from '../../services/apiClient';

interface FollowersListModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** User ID to show followers/following for */
  userId: string;
  /** Username for display */
  username: string;
  /** Mode: followers or following */
  mode: 'followers' | 'following';
  /** Current user ID (for follow state) */
  currentUserId?: string;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  isOpen,
  onClose,
  userId,
  username,
  mode,
  currentUserId,
}) => {
  const [users, setUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = mode === 'followers'
          ? await followApi.getFollowers(userId)
          : await followApi.getFollowing(userId);

        if (response.success && response.data) {
          setUsers(response.data.users);

          // Check follow status for each user if currentUserId is provided
          if (currentUserId) {
            const states: Record<string, boolean> = {};
            for (const user of response.data.users) {
              if (user.id !== currentUserId) {
                const statusResponse = await followApi.isFollowing(user.id);
                if (statusResponse.success && statusResponse.data) {
                  states[user.id] = statusResponse.data.isFollowing;
                }
              }
            }
            setFollowStates(states);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${mode}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userId, mode, currentUserId]);

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUserId || followLoading[targetUserId]) return;

    setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const isCurrentlyFollowing = followStates[targetUserId];

      if (isCurrentlyFollowing) {
        const response = await followApi.unfollow(targetUserId);
        if (response.success) {
          setFollowStates(prev => ({ ...prev, [targetUserId]: false }));
        }
      } else {
        const response = await followApi.follow(targetUserId);
        if (response.success) {
          setFollowStates(prev => ({ ...prev, [targetUserId]: true }));
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserClick = (clickedUsername: string) => {
    onClose();
    navigate(`/u/${clickedUsername}`);
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {mode === 'followers' ? `${username}'s Followers` : `Following`}
          </h2>
          <SNIconButton
            icon="x"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Loading...</span>
            </div>
          ) : users.length === 0 ? (
            <div style={styles.emptyState}>
              <SNIcon name="users" size={48} color="#64748b" />
              <h3 style={styles.emptyTitle}>
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </h3>
              <p style={styles.emptyText}>
                {mode === 'followers'
                  ? 'When users follow this profile, they will appear here'
                  : 'When this user follows others, they will appear here'}
              </p>
            </div>
          ) : (
            <div style={styles.userList}>
              {users.map((user) => (
                <div key={user.id} style={styles.userItem}>
                  <button
                    style={styles.userButton}
                    onClick={() => handleUserClick(user.username)}
                  >
                    <div style={styles.avatar}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} style={styles.avatarImg} />
                      ) : (
                        <span style={styles.avatarText}>
                          {(user.displayName || user.username)[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={styles.userInfo}>
                      <div style={styles.userNameRow}>
                        <span style={styles.displayName}>
                          {user.displayName || user.username}
                        </span>
                        {user.isCreator && (
                          <span style={styles.creatorBadge}>Creator</span>
                        )}
                      </div>
                      <span style={styles.username}>@{user.username}</span>
                      <span style={styles.followDate}>
                        Followed {new Date(user.followedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </button>

                  {currentUserId && user.id !== currentUserId && (
                    <FollowButton
                      isFollowing={followStates[user.id] || false}
                      isLoading={followLoading[user.id] || false}
                      onClick={() => handleFollowToggle(user.id)}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9998,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 600,
    maxHeight: '80vh',
    background: 'rgba(30, 30, 46, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  spinner: {
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
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    textAlign: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
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
  userList: {
    padding: 12,
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    transition: 'background 0.15s',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    padding: 0,
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
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
    fontWeight: 600,
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  displayName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  username: {
    display: 'block',
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  followDate: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
  },
  creatorBadge: {
    padding: '2px 6px',
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#a78bfa',
  },
};

// Add keyframe animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('[data-followers-modal-styles]')) {
  styleSheet.setAttribute('data-followers-modal-styles', '');
  document.head.appendChild(styleSheet);
}

export default FollowersListModal;
