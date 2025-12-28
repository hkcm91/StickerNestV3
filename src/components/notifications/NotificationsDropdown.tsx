/**
 * StickerNest v2 - Notifications Dropdown
 *
 * Bell icon with dropdown showing recent notifications.
 * Uses grouped notifications to avoid spam (e.g., "Alice and 3 others liked your widget").
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { useClickOutside } from '../../hooks/useClickOutside';
import {
  useNotificationStore,
  useNotificationGroups,
  useUnreadCount,
  useNotificationsLoading,
  NotificationGroup,
  NotificationType,
} from '../../state/useNotificationStore';

// =============================================================================
// Types
// =============================================================================

interface NotificationsDropdownProps {
  style?: React.CSSProperties;
}

// =============================================================================
// Component
// =============================================================================

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ style }) => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Use Zustand store for grouped notifications
  const groups = useNotificationGroups();
  const unreadCount = useUnreadCount();
  const loading = useNotificationsLoading();
  const { fetchNotifications, markAsRead, markAllAsRead, subscribe } = useNotificationStore();

  // Load notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Subscribe to real-time updates and fetch initial count
  useEffect(() => {
    fetchNotifications();
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [fetchNotifications, subscribe]);

  // Close on outside click using shared hook
  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const handleMarkGroupRead = async (group: NotificationGroup) => {
    // Mark all notifications in the group as read
    for (const notification of group.notifications) {
      await markAsRead(notification.id);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleGroupClick = (group: NotificationGroup) => {
    handleMarkGroupRead(group);

    // Navigate based on notification type
    if (group.objectType === 'canvas' && group.objectId) {
      navigate(`/c/${group.objectId}`);
    } else if (group.objectType === 'user' && group.actors.length > 0) {
      navigate(`/profile/${group.actors[0].username}`);
    } else if (group.objectType === 'widget' && group.objectId) {
      // Could navigate to widget details page
      navigate(`/widgets/${group.objectId}`);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'follow': return 'user-plus';
      case 'like': return 'heart';
      case 'comment': return 'message-circle';
      case 'fork': return 'git-branch';
      case 'mention': return 'at-sign';
      case 'system': return 'info';
      default: return 'bell';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  /**
   * Format group message based on actors
   * Examples:
   * - "Alice liked your widget"
   * - "Alice and Bob liked your widget"
   * - "Alice, Bob, and 3 others liked your widget"
   */
  const formatGroupMessage = (group: NotificationGroup): string => {
    const { actors, type, count } = group;
    const verb = getVerbForType(type);

    if (actors.length === 0) {
      return `Someone ${verb}`;
    }

    if (actors.length === 1) {
      return `${actors[0].username} ${verb}`;
    }

    if (actors.length === 2) {
      return `${actors[0].username} and ${actors[1].username} ${verb}`;
    }

    const othersCount = count - 2;
    return `${actors[0].username}, ${actors[1].username}, and ${othersCount} other${othersCount > 1 ? 's' : ''} ${verb}`;
  };

  const getVerbForType = (type: NotificationType): string => {
    switch (type) {
      case 'follow': return 'followed you';
      case 'like': return 'liked your content';
      case 'comment': return 'commented on your content';
      case 'fork': return 'forked your widget';
      case 'mention': return 'mentioned you';
      case 'system': return '';
      default: return 'interacted with you';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      {/* Bell Button */}
      <button
        style={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <SNIcon name="bell" size={20} />
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={styles.dropdown}>
          {/* Header */}
          <div style={styles.header}>
            <h3 style={styles.title}>Notifications</h3>
            {unreadCount > 0 && (
              <button style={styles.markAllRead} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div style={styles.content}>
            {loading && groups.length === 0 && (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
              </div>
            )}

            {!loading && groups.length === 0 && (
              <div style={styles.emptyState}>
                <SNIcon name="bellOff" size={32} color="#64748b" />
                <p>No notifications yet</p>
              </div>
            )}

            {groups.slice(0, 10).map((group) => (
              <div
                key={group.id}
                style={{
                  ...styles.notificationItem,
                  ...(group.isUnread ? styles.unread : {}),
                }}
                onClick={() => handleGroupClick(group)}
              >
                {/* Avatar stack for multiple actors */}
                <div style={styles.avatarStack}>
                  {group.actors.slice(0, 3).map((actor, index) => (
                    <div
                      key={actor.id}
                      style={{
                        ...styles.avatar,
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: 3 - index,
                        background: actor.avatarUrl
                          ? `url(${actor.avatarUrl}) center/cover`
                          : `hsl(${actor.username.charCodeAt(0) * 10}, 60%, 50%)`,
                      }}
                    >
                      {!actor.avatarUrl && actor.username[0].toUpperCase()}
                    </div>
                  ))}
                  {group.count > 3 && (
                    <div style={{ ...styles.avatar, marginLeft: -8, background: '#374151' }}>
                      +{group.count - 3}
                    </div>
                  )}
                </div>
                <div style={styles.iconWrapper}>
                  <SNIcon
                    name={getNotificationIcon(group.type)}
                    size={16}
                    color={group.isUnread ? '#8b5cf6' : '#64748b'}
                  />
                </div>
                <div style={styles.notificationContent}>
                  <p style={styles.notificationMessage}>
                    {formatGroupMessage(group)}
                  </p>
                  <span style={styles.notificationTime}>
                    {formatTime(group.latestAt)}
                  </span>
                </div>
                {group.isUnread && <div style={styles.unreadDot} />}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              style={styles.viewAll}
              onClick={() => {
                navigate('/settings?tab=notifications');
                setIsOpen(false);
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  bellButton: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    background: '#ef4444',
    borderRadius: 9,
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 360,
    background: '#1a1a2e',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  markAllRead: {
    background: 'transparent',
    border: 'none',
    fontSize: 13,
    color: '#8b5cf6',
    cursor: 'pointer',
  },
  content: {
    maxHeight: 400,
    overflowY: 'auto',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  avatarStack: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid #1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 600,
    color: '#fff',
  },
  unread: {
    background: 'rgba(139, 92, 246, 0.05)',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#f1f5f9',
    margin: '0 0 2px',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '0 0 4px',
    lineHeight: 1.4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: 6,
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  viewAll: {
    background: 'transparent',
    border: 'none',
    fontSize: 13,
    color: '#8b5cf6',
    cursor: 'pointer',
  },
};

export default NotificationsDropdown;
