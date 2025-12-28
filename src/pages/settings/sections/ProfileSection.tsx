/**
 * StickerNest v2 - Profile Settings Section
 * User profile and account settings
 */

import React, { useState, useEffect } from 'react';
import { userApi } from '../../../services/apiClient';
import { SNIcon } from '../../../shared-ui/SNIcon';
import { SNButton } from '../../../shared-ui/SNButton';
import { useToast } from '../../../shared-ui';
import { styles } from '../settingsStyles';

export interface ProfileSettingsProps {
  user: any;
  onUpdate: () => void;
  isLocalDevMode: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdate, isLocalDevMode }) => {
  const toast = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [location, setLocation] = useState(user?.location || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Social links
  const [twitter, setTwitter] = useState(user?.socialLinks?.twitter || '');
  const [github, setGithub] = useState(user?.socialLinks?.github || '');
  const [discord, setDiscord] = useState(user?.socialLinks?.discord || '');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setWebsite(user?.website || '');
    setLocation(user?.location || '');
    setEmail(user?.email || '');
    setAvatarUrl(user?.avatarUrl || '');
    setTwitter(user?.socialLinks?.twitter || '');
    setGithub(user?.socialLinks?.github || '');
    setDiscord(user?.socialLinks?.discord || '');
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      if (isLocalDevMode) {
        // Create a local preview in dev mode
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarUrl(reader.result as string);
          toast.success('Avatar updated');
          setUploadingAvatar(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const response = await userApi.uploadAvatar(file);
      if (response.success && response.data) {
        setAvatarUrl(response.data.avatarUrl);
        toast.success('Avatar uploaded successfully');
        onUpdate();
      } else {
        toast.error(response.error?.message || 'Failed to upload avatar');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      if (isLocalDevMode) {
        await new Promise(resolve => setTimeout(resolve, 300));
        toast.success('Profile updated successfully');
        setSaving(false);
        return;
      }

      const response = await userApi.updateProfile({
        username,
        displayName,
        bio,
        website,
        location,
        avatarUrl,
        socialLinks: {
          twitter: twitter || undefined,
          github: github || undefined,
          discord: discord || undefined,
        },
      });

      if (response.success) {
        toast.success('Profile updated successfully');
        onUpdate();
      } else {
        toast.error(response.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = username !== (user?.username || '') ||
    displayName !== (user?.displayName || '') ||
    bio !== (user?.bio || '') ||
    website !== (user?.website || '') ||
    location !== (user?.location || '') ||
    twitter !== (user?.socialLinks?.twitter || '') ||
    github !== (user?.socialLinks?.github || '') ||
    discord !== (user?.socialLinks?.discord || '');

  return (
    <div style={styles.settingsPanel}>
      <h2 style={styles.panelTitle}>Profile Settings</h2>
      <p style={styles.panelDescription}>
        Manage your public profile and account information
      </p>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Public Profile</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>Avatar</label>
          <div style={styles.avatarUpload}>
            <div style={styles.avatarPreview}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={styles.avatarPreviewImg} />
              ) : (
                <SNIcon name="user" size="xl" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <SNButton
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
            </SNButton>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Your username"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              placeholder="Your display name"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={styles.textarea}
            placeholder="Tell others about yourself..."
            rows={3}
            maxLength={160}
          />
          <p style={styles.fieldHint}>{bio.length}/160 characters</p>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={styles.input}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={styles.input}
              placeholder="City, Country"
            />
          </div>
        </div>
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Social Links</h3>
        <p style={styles.sectionDescription}>
          Add your social profiles to help others find you
        </p>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            <SNIcon name="twitter" size={14} /> Twitter
          </label>
          <div style={styles.socialInput}>
            <span style={styles.socialPrefix}>twitter.com/</span>
            <input
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              style={styles.socialInputField}
              placeholder="username"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            <SNIcon name="github" size={14} /> GitHub
          </label>
          <div style={styles.socialInput}>
            <span style={styles.socialPrefix}>github.com/</span>
            <input
              type="text"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              style={styles.socialInputField}
              placeholder="username"
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            <SNIcon name="messageCircle" size={14} /> Discord
          </label>
          <input
            type="text"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            style={styles.input}
            placeholder="username#0000"
          />
        </div>
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Account</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            disabled
            style={{ ...styles.input, opacity: 0.6, cursor: 'not-allowed' }}
          />
          <p style={styles.fieldHint}>Email cannot be changed</p>
        </div>
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Security</h3>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <SNButton variant="secondary" size="sm">
            Change Password
          </SNButton>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Two-Factor Authentication</label>
          <div style={styles.toggleRow}>
            <span style={styles.toggleLabel}>Not enabled</span>
            <SNButton variant="secondary" size="sm">
              Enable 2FA
            </SNButton>
          </div>
        </div>
      </div>

      <div style={styles.formActions}>
        <SNButton
          variant="primary"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </SNButton>
      </div>
    </div>
  );
};

export default ProfileSettings;
