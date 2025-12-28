/**
 * StickerNest v2 - Settings Page
 * User settings with tabs for Profile, Billing, Creator Dashboard, and Embed
 *
 * REFACTORING NOTE (Dec 2024):
 * Section components have been extracted to ./settings/sections/:
 * - ProfileSection.tsx - Profile and account settings
 * - BillingSection.tsx - Subscription and payment management
 * - CreatorSection.tsx - Creator dashboard and widget publishing
 * - EmbedSection.tsx - Embed token management
 * Shared styles are in ./settings/settingsStyles.ts
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SNIcon } from '../shared-ui/SNIcon';
import { ProfileSettings, BillingSettings, CreatorSettings, EmbedSettings } from './settings/sections';
import { styles } from './settings/settingsStyles';
import { AppNavbar } from '../components/AppNavbar';

type SettingsTab = 'profile' | 'billing' | 'creator' | 'embed';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, signOut, refreshUser, isLocalDevMode } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (searchParams.get('tab') as SettingsTab) || 'profile'
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?returnTo=/settings', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
  };

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <AppNavbar pageTitle="Settings" showCreateButton={false} />

      {/* Main content */}
      <div style={styles.content}>
        {/* Sidebar */}
        <nav style={styles.sidebar}>
          <div style={styles.tabList}>
            <button
              onClick={() => handleTabChange('profile')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'profile' ? styles.tabButtonActive : {}),
              }}
            >
              <SNIcon name="user" size="sm" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => handleTabChange('billing')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'billing' ? styles.tabButtonActive : {}),
              }}
            >
              <SNIcon name="creditCard" size="sm" />
              <span>Billing</span>
            </button>
            <button
              onClick={() => handleTabChange('creator')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'creator' ? styles.tabButtonActive : {}),
              }}
            >
              <SNIcon name="star" size="sm" />
              <span>Creator</span>
            </button>
            <button
              onClick={() => handleTabChange('embed')}
              style={{
                ...styles.tabButton,
                ...(activeTab === 'embed' ? styles.tabButtonActive : {}),
              }}
            >
              <SNIcon name="code" size="sm" />
              <span>Embed</span>
            </button>
          </div>

          <div style={styles.sidebarFooter}>
            <button onClick={signOut} style={styles.signOutButton}>
              <SNIcon name="logout" size="sm" />
              <span>Sign out</span>
            </button>
          </div>
        </nav>

        {/* Main panel */}
        <main style={styles.main}>
          {activeTab === 'profile' && (
            <ProfileSettings user={user} onUpdate={refreshUser} isLocalDevMode={isLocalDevMode} />
          )}
          {activeTab === 'billing' && (
            <BillingSettings user={user} isLocalDevMode={isLocalDevMode} />
          )}
          {activeTab === 'creator' && (
            <CreatorSettings user={user} isLocalDevMode={isLocalDevMode} />
          )}
          {activeTab === 'embed' && (
            <EmbedSettings user={user} isLocalDevMode={isLocalDevMode} />
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
