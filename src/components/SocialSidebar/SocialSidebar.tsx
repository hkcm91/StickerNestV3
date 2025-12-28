/**
 * StickerNest v2 - Social Sidebar
 * ================================
 *
 * Sidebar panel for social features: activity feed, online friends, and notifications.
 * Part of the "hidden social layer" that can be toggled on/off.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon, type IconName } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import {
  useSocialStore,
  type SocialPrivacyMode,
} from '../../state/useSocialStore';
import {
  useFeedStore,
  useActivitiesForFeed,
  useFeedLoading,
  type FeedActivity,
} from '../../state/useFeedStore';
import {
  useNotificationStore,
  useUnreadCount,
} from '../../state/useNotificationStore';

// Design tokens (matching AISidebar)
const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
    elevated: '#1e1e38',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
    muted: '#475569',
  },
  accent: '#8b5cf6',
  accentHover: '#7c3aed',
  accentMuted: 'rgba(139, 92, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.15)',
  success: '#22c55e',
  error: '#ef4444',
  online: '#10b981',
};

export interface SocialSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type SocialTab = 'feed' | 'friends' | 'settings';

export const SocialSidebar: React.FC<SocialSidebarProps> = ({
  isOpen,
  onToggle,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SocialTab>('feed');

  // Social store
  const {
    following,
    followers,
    onlineFriends,
    settings,
    profileCache,
    toggleSocialLayer,
    setPrivacyMode,
    updateSettings,
    getCachedProfile,
    toggleFollow,
  } = useSocialStore();

  // Feed store
  const { fetchFeed, loadMore } = useFeedStore();
  const friendsActivities = useActivitiesForFeed('friends');
  const isFeedLoading = useFeedLoading('friends');

  // Notifications
  const unreadCount = useUnreadCount();
  const { fetchNotifications } = useNotificationStore();

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchFeed('friends');
      fetchNotifications();
    }
  }, [isOpen, fetchFeed, fetchNotifications]);

  // Handle activity click
  const handleActivityClick = useCallback((activity: FeedActivity) => {
    if (activity.object_type === 'canvas') {
      navigate(`/c/${activity.object_id}`);
    } else if (activity.object_type === 'widget') {
      navigate(`/widgets/${activity.object_id}`);
    } else if (activity.actor_id) {
      navigate(`/profile/${activity.profiles?.username}`);
    }
  }, [navigate]);

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  // Get verb for activity
  const getActivityVerb = (activity: FeedActivity): string => {
    switch (activity.verb) {
      case 'published': return 'published';
      case 'forked': return 'forked';
      case 'liked': return 'liked';
      case 'commented': return 'commented on';
      default: return 'interacted with';
    }
  };

  // Get icon for activity
  const getActivityIcon = (verb: FeedActivity['verb']): IconName => {
    switch (verb) {
      case 'published': return 'globe';
      case 'forked': return 'gitBranch';
      case 'liked': return 'heart';
      case 'commented': return 'messageCircle';
      default: return 'bell';
    }
  };

  // Styles
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    width: isOpen ? 320 : 48,
    height: '100vh',
    background: theme.bg.primary,
    borderLeft: `1px solid ${theme.border}`,
    transition: 'width 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  };

  const headerStyle: React.CSSProperties = {
    padding: isOpen ? '16px' : '12px 8px',
    borderBottom: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const tabsStyle: React.CSSProperties = {
    display: isOpen ? 'flex' : 'none',
    gap: 4,
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.border}`,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    background: active ? theme.accentMuted : 'transparent',
    border: 'none',
    borderRadius: 6,
    color: active ? theme.accent : theme.text.secondary,
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    flex: 1,
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    display: isOpen ? 'block' : 'none',
  };

  // Collapsed view - just icons
  if (!isOpen) {
    return (
      <div style={containerStyle}>
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SNIconButton
            icon="users"
            onClick={onToggle}
            tooltip="Open Social"
            size={32}
          />
          {unreadCount > 0 && (
            <div style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <SNIcon name="bell" size={20} color={theme.text.secondary} />
              <span style={{
                position: 'absolute',
                top: -4,
                right: 4,
                minWidth: 16,
                height: 16,
                background: theme.error,
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
          {onlineFriends.size > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: theme.online,
              }} />
              <span style={{ fontSize: 10, color: theme.text.tertiary }}>
                {onlineFriends.size}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <SNIconButton
          icon="chevronRight"
          onClick={onToggle}
          tooltip="Close Social"
          size="sm"
        />
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: theme.text.primary, fontSize: '1rem' }}>
            Social
          </h3>
          <p style={{ margin: 0, color: theme.text.tertiary, fontSize: '0.75rem' }}>
            {onlineFriends.size} online • {following.size} following
          </p>
        </div>
        {unreadCount > 0 && (
          <div style={{
            padding: '4px 8px',
            background: theme.accentMuted,
            borderRadius: 12,
            fontSize: '0.75rem',
            color: theme.accent,
          }}>
            {unreadCount} new
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={tabsStyle}>
        <button style={tabStyle(activeTab === 'feed')} onClick={() => setActiveTab('feed')}>
          Feed
        </button>
        <button style={tabStyle(activeTab === 'friends')} onClick={() => setActiveTab('friends')}>
          Friends
        </button>
        <button style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>
          Settings
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === 'feed' && (
          <FeedTabContent
            activities={friendsActivities}
            isLoading={isFeedLoading}
            onActivityClick={handleActivityClick}
            onLoadMore={() => loadMore('friends')}
            formatTime={formatTime}
            getActivityVerb={getActivityVerb}
            getActivityIcon={getActivityIcon}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsTabContent
            following={following}
            followers={followers}
            onlineFriends={onlineFriends}
            getCachedProfile={getCachedProfile}
            onUnfollow={(id) => toggleFollow(id)}
            onProfileClick={(username) => navigate(`/profile/${username}`)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTabContent
            settings={settings}
            onToggleSocialLayer={toggleSocialLayer}
            onPrivacyModeChange={setPrivacyMode}
            onSettingsChange={updateSettings}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Feed Tab
// ============================================================================

interface FeedTabProps {
  activities: FeedActivity[];
  isLoading: boolean;
  onActivityClick: (activity: FeedActivity) => void;
  onLoadMore: () => void;
  formatTime: (date: string) => string;
  getActivityVerb: (activity: FeedActivity) => string;
  getActivityIcon: (verb: FeedActivity['verb']) => IconName;
}

const FeedTabContent: React.FC<FeedTabProps> = ({
  activities,
  isLoading,
  onActivityClick,
  onLoadMore,
  formatTime,
  getActivityVerb,
  getActivityIcon,
}) => {
  if (activities.length === 0 && !isLoading) {
    return (
      <div style={{
        padding: 32,
        textAlign: 'center',
        color: theme.text.tertiary,
      }}>
        <SNIcon name="users" size={40} color={theme.text.muted} />
        <p style={{ marginTop: 12 }}>No activity yet</p>
        <p style={{ fontSize: '0.8rem' }}>Follow creators to see their activity here</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          onClick={() => onActivityClick(activity)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = theme.bg.tertiary}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          {/* Avatar */}
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: activity.profiles?.avatar_url
              ? `url(${activity.profiles.avatar_url}) center/cover`
              : `hsl(${(activity.profiles?.username || 'U').charCodeAt(0) * 10}, 60%, 50%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}>
            {!activity.profiles?.avatar_url && (activity.profiles?.username?.[0] || 'U').toUpperCase()}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontSize: '0.85rem',
              color: theme.text.primary,
              lineHeight: 1.4,
            }}>
              <span style={{ fontWeight: 500 }}>{activity.profiles?.username}</span>
              {' '}
              <span style={{ color: theme.text.secondary }}>{getActivityVerb(activity)}</span>
              {' '}
              <span style={{ color: theme.text.primary }}>
                {activity.object_type === 'widget' ? 'a widget' : 'a canvas'}
              </span>
            </p>
            <span style={{ fontSize: '0.75rem', color: theme.text.muted }}>
              {formatTime(activity.created_at)}
            </span>
          </div>

          {/* Icon */}
          <SNIcon name={getActivityIcon(activity.verb)} size={14} color={theme.text.tertiary} />
        </div>
      ))}

      {isLoading && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{
            width: 20,
            height: 20,
            border: `2px solid ${theme.accentMuted}`,
            borderTopColor: theme.accent,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      )}

      {activities.length > 0 && !isLoading && (
        <button
          onClick={onLoadMore}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: 6,
            color: theme.text.secondary,
            fontSize: '0.8rem',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Load more
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Friends Tab
// ============================================================================

interface FriendsTabProps {
  following: Set<string>;
  followers: Set<string>;
  onlineFriends: Set<string>;
  getCachedProfile: (id: string) => { username: string; avatarUrl: string | null } | undefined;
  onUnfollow: (id: string) => void;
  onProfileClick: (username: string) => void;
}

const FriendsTabContent: React.FC<FriendsTabProps> = ({
  following,
  followers,
  onlineFriends,
  getCachedProfile,
  onUnfollow,
  onProfileClick,
}) => {
  // Sort: online first, then by name
  const sortedFollowing = Array.from(following).sort((a, b) => {
    const aOnline = onlineFriends.has(a) ? 1 : 0;
    const bOnline = onlineFriends.has(b) ? 1 : 0;
    return bOnline - aOnline;
  });

  if (following.size === 0) {
    return (
      <div style={{
        padding: 32,
        textAlign: 'center',
        color: theme.text.tertiary,
      }}>
        <SNIcon name="userPlus" size={40} color={theme.text.muted} />
        <p style={{ marginTop: 12 }}>Not following anyone yet</p>
        <p style={{ fontSize: '0.8rem' }}>Discover creators to follow</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      {/* Online section */}
      {onlineFriends.size > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{
            padding: '4px 12px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: theme.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Online Now ({onlineFriends.size})
          </p>
          {Array.from(onlineFriends).map((id) => {
            const profile = getCachedProfile(id);
            return (
              <FriendRow
                key={id}
                id={id}
                username={profile?.username || 'User'}
                avatarUrl={profile?.avatarUrl || null}
                isOnline={true}
                onProfileClick={onProfileClick}
                onUnfollow={onUnfollow}
              />
            );
          })}
        </div>
      )}

      {/* All following */}
      <p style={{
        padding: '4px 12px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: theme.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Following ({following.size})
      </p>
      {sortedFollowing.filter(id => !onlineFriends.has(id)).map((id) => {
        const profile = getCachedProfile(id);
        return (
          <FriendRow
            key={id}
            id={id}
            username={profile?.username || 'User'}
            avatarUrl={profile?.avatarUrl || null}
            isOnline={false}
            onProfileClick={onProfileClick}
            onUnfollow={onUnfollow}
          />
        );
      })}
    </div>
  );
};

interface FriendRowProps {
  id: string;
  username: string;
  avatarUrl: string | null;
  isOnline: boolean;
  onProfileClick: (username: string) => void;
  onUnfollow: (id: string) => void;
}

const FriendRow: React.FC<FriendRowProps> = ({
  id,
  username,
  avatarUrl,
  isOnline,
  onProfileClick,
  onUnfollow,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 6,
      cursor: 'pointer',
    }}
    onClick={() => onProfileClick(username)}
  >
    <div style={{ position: 'relative' }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: avatarUrl
          ? `url(${avatarUrl}) center/cover`
          : `hsl(${username.charCodeAt(0) * 10}, 60%, 50%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
      }}>
        {!avatarUrl && username[0].toUpperCase()}
      </div>
      {isOnline && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: theme.online,
          border: `2px solid ${theme.bg.primary}`,
        }} />
      )}
    </div>
    <span style={{ flex: 1, color: theme.text.primary, fontSize: '0.9rem' }}>
      {username}
    </span>
    <button
      onClick={(e) => { e.stopPropagation(); onUnfollow(id); }}
      style={{
        padding: '4px 8px',
        background: 'transparent',
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        color: theme.text.tertiary,
        fontSize: '0.7rem',
        cursor: 'pointer',
      }}
    >
      Unfollow
    </button>
  </div>
);

// ============================================================================
// Settings Tab
// ============================================================================

interface SocialSettings {
  enabled: boolean;
  privacyMode: SocialPrivacyMode;
  showOnlineStatus: boolean;
  showActivityFeed: boolean;
  allowComments: boolean;
  showNotificationBadge: boolean;
}

interface SettingsTabProps {
  settings: SocialSettings;
  onToggleSocialLayer: () => void;
  onPrivacyModeChange: (mode: SocialPrivacyMode) => void;
  onSettingsChange: (settings: Partial<SocialSettings>) => void;
}

const SettingsTabContent: React.FC<SettingsTabProps> = ({
  settings,
  onToggleSocialLayer,
  onPrivacyModeChange,
  onSettingsChange,
}) => {
  const privacyModes: { value: SocialPrivacyMode; label: string; desc: string }[] = [
    { value: 'public', label: 'Public', desc: 'Everyone can see your activity' },
    { value: 'friends', label: 'Friends Only', desc: 'Only mutual follows' },
    { value: 'hidden', label: 'Hidden', desc: 'Social layer invisible' },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Master toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div>
          <p style={{ margin: 0, color: theme.text.primary, fontWeight: 500 }}>
            Social Layer
          </p>
          <p style={{ margin: '4px 0 0', color: theme.text.tertiary, fontSize: '0.8rem' }}>
            Show social features on canvas
          </p>
        </div>
        <ToggleSwitch checked={settings.enabled} onChange={onToggleSocialLayer} />
      </div>

      {/* Privacy mode */}
      <div style={{ padding: '16px 0', borderBottom: `1px solid ${theme.border}` }}>
        <p style={{ margin: '0 0 12px', color: theme.text.primary, fontWeight: 500 }}>
          Privacy Mode
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {privacyModes.map((mode) => (
            <label
              key={mode.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: settings.privacyMode === mode.value ? theme.accentMuted : theme.bg.secondary,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="privacy"
                checked={settings.privacyMode === mode.value}
                onChange={() => onPrivacyModeChange(mode.value)}
                style={{ accentColor: theme.accent }}
              />
              <div>
                <p style={{ margin: 0, color: theme.text.primary, fontSize: '0.9rem' }}>
                  {mode.label}
                </p>
                <p style={{ margin: 0, color: theme.text.tertiary, fontSize: '0.75rem' }}>
                  {mode.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Other settings */}
      <div style={{ padding: '12px 0' }}>
        <SettingToggle
          label="Show Online Status"
          checked={settings.showOnlineStatus}
          onChange={(v) => onSettingsChange({ showOnlineStatus: v })}
        />
        <SettingToggle
          label="Show Activity Feed"
          checked={settings.showActivityFeed}
          onChange={(v) => onSettingsChange({ showActivityFeed: v })}
        />
        <SettingToggle
          label="Allow Comments"
          checked={settings.allowComments}
          onChange={(v) => onSettingsChange({ allowComments: v })}
        />
        <SettingToggle
          label="Notification Badge"
          checked={settings.showNotificationBadge}
          onChange={(v) => onSettingsChange({ showNotificationBadge: v })}
        />
      </div>
    </div>
  );
};

// Toggle switch component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: checked ? theme.accent : theme.bg.tertiary,
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
    }}
  >
    <div style={{
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: 3,
      left: checked ? 23 : 3,
      transition: 'left 0.2s',
    }} />
  </button>
);

// Setting toggle row
const SettingToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
  }}>
    <span style={{ color: theme.text.secondary, fontSize: '0.9rem' }}>{label}</span>
    <ToggleSwitch checked={checked} onChange={() => onChange(!checked)} />
  </div>
);

export default SocialSidebar;
