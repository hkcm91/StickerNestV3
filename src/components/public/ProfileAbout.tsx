/**
 * ProfileAbout Component
 * About section for profile pages
 */

import React from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import type { PublicProfile } from '../../types/profile';

interface ProfileAboutProps {
  profile: PublicProfile;
}

export const ProfileAbout: React.FC<ProfileAboutProps> = ({ profile }) => {
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const socialPlatforms = [
    { key: 'twitter', icon: 'twitter', label: 'Twitter', urlPrefix: 'https://twitter.com/' },
    { key: 'github', icon: 'github', label: 'GitHub', urlPrefix: 'https://github.com/' },
    { key: 'instagram', icon: 'instagram', label: 'Instagram', urlPrefix: 'https://instagram.com/' },
    { key: 'linkedin', icon: 'linkedin', label: 'LinkedIn', urlPrefix: 'https://linkedin.com/in/' },
    { key: 'youtube', icon: 'youtube', label: 'YouTube', urlPrefix: 'https://youtube.com/@' },
  ] as const;

  return (
    <div style={styles.container}>
      {/* Bio Section */}
      {profile.bio && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>About</h3>
          <p style={styles.bioText}>{profile.bio}</p>
        </div>
      )}

      {/* Details Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Details</h3>
        <div style={styles.detailsList}>
          {profile.location && (
            <div style={styles.detailItem}>
              <SNIcon name="mapPin" size={16} color="#64748b" />
              <span style={styles.detailLabel}>Location</span>
              <span style={styles.detailValue}>{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div style={styles.detailItem}>
              <SNIcon name="link" size={16} color="#64748b" />
              <span style={styles.detailLabel}>Website</span>
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.detailLink}
              >
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
          <div style={styles.detailItem}>
            <SNIcon name="calendar" size={16} color="#64748b" />
            <span style={styles.detailLabel}>Joined</span>
            <span style={styles.detailValue}>
              {formatDate(profile.joinedAt || profile.createdAt)}
            </span>
          </div>
          {profile.isCreator && (
            <div style={styles.detailItem}>
              <SNIcon name="ai" size={16} color="#8b5cf6" />
              <span style={styles.detailLabel}>Status</span>
              <span style={{ ...styles.detailValue, color: '#a78bfa' }}>Creator</span>
            </div>
          )}
          {profile.isVerified && (
            <div style={styles.detailItem}>
              <SNIcon name="badgeCheck" size={16} color="#3b82f6" />
              <span style={styles.detailLabel}>Verification</span>
              <span style={{ ...styles.detailValue, color: '#60a5fa' }}>Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Social Links Section */}
      {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Social Links</h3>
          <div style={styles.socialGrid}>
            {socialPlatforms.map(({ key, icon, label, urlPrefix }) => {
              const handle = profile.socialLinks?.[key as keyof typeof profile.socialLinks];
              if (!handle) return null;

              return (
                <a
                  key={key}
                  href={`${urlPrefix}${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.socialCard}
                >
                  <div style={styles.socialIcon}>
                    <SNIcon name={icon as any} size={20} color="#f1f5f9" />
                  </div>
                  <div style={styles.socialInfo}>
                    <span style={styles.socialPlatform}>{label}</span>
                    <span style={styles.socialHandle}>@{handle}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Activity</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{profile.stats.publicCanvases}</span>
            <span style={styles.statLabel}>Public Canvases</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{profile.stats.totalViews.toLocaleString()}</span>
            <span style={styles.statLabel}>Total Views</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{(profile.stats.totalLikes ?? 0).toLocaleString()}</span>
            <span style={styles.statLabel}>Total Likes</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statValue}>{profile.stats.followers}</span>
            <span style={styles.statLabel}>Followers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 16px',
  },
  bioText: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 1.7,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },

  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#f1f5f9',
  },
  detailLink: {
    fontSize: 14,
    color: '#8b5cf6',
    textDecoration: 'none',
    transition: 'opacity 0.15s',
  },

  socialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  socialCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  socialPlatform: {
    fontSize: 13,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  socialHandle: {
    fontSize: 12,
    color: '#64748b',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: 20,
    background: 'rgba(20, 20, 30, 0.5)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
};

export default ProfileAbout;
