/**
 * StickerNest v2 - Creator Dashboard
 *
 * Main dashboard for creators showing:
 * - Account status and onboarding
 * - Earnings overview
 * - Published items
 * - Quick actions
 */

import React, { useEffect, useState } from 'react';
import { useCreatorStore } from '../../state/useCreatorStore';
import { CreatorOnboarding } from './CreatorOnboarding';
import { EarningsPanel } from './EarningsPanel';
import { CreatorItemsList } from './CreatorItemsList';

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--sn-text-secondary)',
    margin: '8px 0 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20,
  },
  section: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 16px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--sn-border-primary)',
    borderTopColor: 'var(--sn-accent-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorBox: {
    padding: 16,
    background: 'var(--sn-error-10, rgba(239, 68, 68, 0.1))',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-error)',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid var(--sn-border-primary)',
    marginBottom: 24,
  },
  tab: {
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--sn-text-secondary)',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: 'var(--sn-accent-secondary)',
    borderBottomColor: 'var(--sn-accent-primary)',
  },
};

// ==================
// Component
// ==================

type TabType = 'overview' | 'items' | 'analytics';

export const CreatorDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const {
    account,
    earnings,
    items,
    isLoading,
    error,
    fetchAccount,
    fetchEarnings,
    fetchItems,
    setError,
  } = useCreatorStore();

  // Fetch data on mount
  useEffect(() => {
    fetchAccount();
    fetchEarnings();
    fetchItems();
  }, [fetchAccount, fetchEarnings, fetchItems]);

  // Show onboarding if not set up
  const needsOnboarding = !account?.onboardingComplete || account?.status === 'pending';

  if (isLoading && !account) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Creator Dashboard</h2>
          <p style={styles.subtitle}>
            Manage your published items and track earnings
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={styles.errorBox}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Onboarding or Dashboard */}
      {needsOnboarding ? (
        <CreatorOnboarding />
      ) : (
        <>
          {/* Tabs */}
          <div style={styles.tabs}>
            {(['overview', 'items', 'analytics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'items' && `My Items (${items.length})`}
                {tab === 'analytics' && 'Analytics'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div style={styles.grid}>
              <EarningsPanel />
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Quick Stats</h3>
                <QuickStats items={items} />
              </div>
            </div>
          )}

          {activeTab === 'items' && <CreatorItemsList />}

          {activeTab === 'analytics' && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Sales Analytics</h3>
              <AnalyticsPlaceholder />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ==================
// Sub-components
// ==================

interface QuickStatsProps {
  items: Array<{ isPublished: boolean; downloads: number; totalEarnings: number }>;
}

const QuickStats: React.FC<QuickStatsProps> = ({ items }) => {
  const publishedCount = items.filter((i) => i.isPublished).length;
  const totalDownloads = items.reduce((sum, i) => sum + i.downloads, 0);
  const totalRevenue = items.reduce((sum, i) => sum + i.totalEarnings, 0);

  const stats = [
    { label: 'Published Items', value: publishedCount },
    { label: 'Total Downloads', value: totalDownloads.toLocaleString() },
    { label: 'Revenue', value: `$${(totalRevenue / 100).toFixed(2)}` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--sn-text-secondary)', fontSize: 14 }}>
            {stat.label}
          </span>
          <span style={{ color: 'var(--sn-text-primary)', fontWeight: 600 }}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const AnalyticsPlaceholder: React.FC = () => (
  <div
    style={{
      textAlign: 'center',
      padding: 40,
      color: 'var(--sn-text-secondary)',
    }}
  >
    <p style={{ fontSize: 14 }}>
      Sales analytics chart coming soon.
      <br />
      Track your daily sales, revenue trends, and top performing items.
    </p>
  </div>
);

export default CreatorDashboard;
