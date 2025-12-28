/**
 * ProfileHeader Component
 * Full profile header with banner, avatar, stats, and actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import type { PublicProfile } from '../../types/profile';
import { UserAvatar } from './UserAvatar';
import { ProfileStats } from './ProfileStats';
import { FollowButton } from './FollowButton';
import { ShareModal } from './ShareModal';

interface ProfileHeaderProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  onFollowToggle: () => void;
  onSearchClick?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
  isFollowing,
  followLoading,
  onFollowToggle,
  onSearchClick,
}) => {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const profileUrl = `${window.location.origin}/u/${profile.username}`;

  return (
    <>
      {/* Banner */}
      <div style={styles.bannerContainer}>
        {profile.bannerUrl ? (
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            style={styles.bannerImage}
          />
        ) : (
          <div style={styles.bannerGradient} />
        )}
        <div style={styles.bannerOverlay} />
      </div>

      {/* Profile Info Section */}
      <div style={styles.profileSection}>
        <div style={styles.profileContent}>
          {/* Avatar */}
          <div style={styles.avatarContainer}>
            <UserAvatar
              username={profile.username}
              displayName={profile.displayName}
              avatarUrl={profile.avatarUrl}
              size="2xl"
              isVerified={profile.isVerified}
            />
          </div>

          {/* Info */}
          <div style={styles.infoContainer}>
            {/* Name & Actions Row */}
            <div style={styles.nameRow}>
              <div style={styles.nameGroup}>
                <h1 style={styles.displayName}>{profile.displayName}</h1>
                {profile.isCreator && (
                  <div style={styles.creatorBadge}>
                    <SNIcon name="ai" size={12} />
                    <span>Creator</span>
                  </div>
                )}
              </div>

              <div style={styles.actionButtons}>
                {isOwnProfile ? (
                  <SNButton
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/settings')}
                  >
                    <SNIcon name="edit" size={14} />
                    Edit Profile
                  </SNButton>
                ) : (
                  <FollowButton
                    isFollowing={isFollowing}
                    isLoading={followLoading}
                    onClick={onFollowToggle}
                    showIcon
                  />
                )}
                <SNIconButton
                  icon="share"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  tooltip="Share profile"
                />
                {onSearchClick && (
                  <SNIconButton
                    icon="search"
                    variant="ghost"
                    size="sm"
                    onClick={onSearchClick}
                    tooltip="Find people"
                  />
                )}
                <SNIconButton
                  icon="moreHorizontal"
                  variant="ghost"
                  size="sm"
                  tooltip="More options"
                />
              </div>
            </div>

            {/* Username */}
            <p style={styles.username}>@{profile.username}</p>

            {/* Bio */}
            {profile.bio && (
              <p style={styles.bio}>{profile.bio}</p>
            )}

            {/* Meta Info */}
            <div style={styles.metaRow}>
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.metaLink}
                >
                  <SNIcon name="link" size={14} />
                  <span>{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                </a>
              )}
              {profile.location && (
                <span style={styles.metaItem}>
                  <SNIcon name="mapPin" size={14} />
                  <span>{profile.location}</span>
                </span>
              )}
              <span style={styles.metaItem}>
                <SNIcon name="calendar" size={14} />
                <span>Joined {formatDate(profile.joinedAt || profile.createdAt)}</span>
              </span>
            </div>

            {/* Social Links */}
            {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
              <div style={styles.socialLinks}>
                {profile.socialLinks.twitter && (
                  <a
                    href={`https://twitter.com/${profile.socialLinks.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                    title="Twitter"
                  >
                    <SNIcon name="twitter" size={16} />
                  </a>
                )}
                {profile.socialLinks.github && (
                  <a
                    href={`https://github.com/${profile.socialLinks.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                    title="GitHub"
                  >
                    <SNIcon name="github" size={16} />
                  </a>
                )}
                {profile.socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${profile.socialLinks.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                    title="Instagram"
                  >
                    <SNIcon name="instagram" size={16} />
                  </a>
                )}
                {profile.socialLinks.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${profile.socialLinks.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                    title="LinkedIn"
                  >
                    <SNIcon name="linkedin" size={16} />
                  </a>
                )}
                {profile.socialLinks.youtube && (
                  <a
                    href={`https://youtube.com/@${profile.socialLinks.youtube}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.socialLink}
                    title="YouTube"
                  >
                    <SNIcon name="youtube" size={16} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={styles.statsContainer}>
          <ProfileStats
            stats={profile.stats}
            size="md"
          />
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        type="profile"
        data={{
          url: profileUrl,
          title: `${profile.displayName} (@${profile.username}) | StickerNest`,
          description: profile.bio,
          image: profile.avatarUrl,
        }}
      />
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bannerContainer: {
    position: 'relative',
    height: 280,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bannerGradient: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(139, 92, 246, 0.1) 100%)',
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(10, 10, 18, 1) 0%, rgba(10, 10, 18, 0.5) 50%, rgba(10, 10, 18, 0) 100%)',
  },

  profileSection: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 40px',
    marginTop: -80,
    position: 'relative',
    zIndex: 1,
  },
  profileContent: {
    display: 'flex',
    gap: 32,
    marginBottom: 32,
  },
  avatarContainer: {
    flexShrink: 0,
  },

  infoContainer: {
    flex: 1,
    paddingTop: 40,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  nameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  creatorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    color: '#a78bfa',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  username: {
    fontSize: 16,
    color: '#64748b',
    margin: '0 0 16px',
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
    flexWrap: 'wrap',
    marginBottom: 16,
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
    transition: 'opacity 0.15s',
  },

  socialLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  socialLink: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },

  statsContainer: {
    padding: '24px 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
};

export default ProfileHeader;
