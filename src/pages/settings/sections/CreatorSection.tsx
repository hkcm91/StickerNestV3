/**
 * StickerNest v2 - Creator Settings Section
 * Creator dashboard, widget publishing, and analytics
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../../services/apiClient';
import { SNIcon } from '../../../shared-ui/SNIcon';
import { SNButton } from '../../../shared-ui/SNButton';
import { useToast } from '../../../shared-ui';
import { styles } from '../settingsStyles';

export interface CreatorSettingsProps {
  user: any;
  isLocalDevMode: boolean;
}

interface PublishedWidget {
  id: string;
  name: string;
  category: string;
  isFree: boolean;
  oneTimePrice: number | null;
  downloads: number;
  rating: number;
  isPublished: boolean;
}

interface CreatorStats {
  totalEarnings: number;
  pendingPayout: number;
  salesCount: number;
  isCreator: boolean;
  canReceivePayments: boolean;
}

interface CreatorAnalytics {
  overview: {
    totalWidgets: number;
    publishedWidgets: number;
    totalDownloads: number;
    totalRevenue: number;
    avgRating: number;
  };
  recentDownloads: Array<{ date: string; count: number }>;
  topWidgets: Array<{ id: string; name: string; downloads: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

const WIDGET_CATEGORIES = [
  { id: 'utilities', name: 'Utilities' },
  { id: 'data', name: 'Data & Analytics' },
  { id: 'media', name: 'Media & Content' },
  { id: 'productivity', name: 'Productivity' },
  { id: 'social', name: 'Social' },
  { id: 'ai', name: 'AI & ML' },
  { id: 'games', name: 'Games' },
];

export const CreatorSettings: React.FC<CreatorSettingsProps> = ({ user, isLocalDevMode }) => {
  const toast = useToast();
  const isCreator = user?.role === 'creator' || user?.subscription?.tier === 'creator';
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [publishedWidgets, setPublishedWidgets] = useState<PublishedWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'widgets' | 'analytics'>('overview');

  // Publish form state
  const [newWidget, setNewWidget] = useState({
    name: '',
    description: '',
    category: 'utilities',
    isFree: true,
    price: 0,
    tags: '',
  });

  // Fetch creator data
  useEffect(() => {
    const fetchCreatorData = async () => {
      if (!isCreator) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (isLocalDevMode) {
          // Mock data
          setCreatorStats({
            totalEarnings: 12500,
            pendingPayout: 2500,
            salesCount: 47,
            isCreator: true,
            canReceivePayments: true,
          });
          setPublishedWidgets([
            {
              id: 'widget-1',
              name: 'Weather Widget Pro',
              category: 'utilities',
              isFree: false,
              oneTimePrice: 499,
              downloads: 342,
              rating: 4.8,
              isPublished: true,
            },
            {
              id: 'widget-2',
              name: 'Chart Builder',
              category: 'data',
              isFree: true,
              oneTimePrice: null,
              downloads: 128,
              rating: 4.2,
              isPublished: true,
            },
          ]);
          // Mock analytics
          const mockDownloads = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            return {
              date: date.toISOString().split('T')[0],
              count: Math.floor(Math.random() * 20) + 5,
            };
          });
          setAnalytics({
            overview: {
              totalWidgets: 2,
              publishedWidgets: 2,
              totalDownloads: 470,
              totalRevenue: 12500,
              avgRating: 4.5,
            },
            recentDownloads: mockDownloads,
            topWidgets: [
              { id: 'widget-1', name: 'Weather Widget Pro', downloads: 342, revenue: 9800 },
              { id: 'widget-2', name: 'Chart Builder', downloads: 128, revenue: 0 },
            ],
            revenueByMonth: [
              { month: '2025-07', revenue: 1500 },
              { month: '2025-08', revenue: 2200 },
              { month: '2025-09', revenue: 1800 },
              { month: '2025-10', revenue: 3100 },
              { month: '2025-11', revenue: 2400 },
              { month: '2025-12', revenue: 1500 },
            ],
          });
          setLoading(false);
          return;
        }

        const [statsRes, widgetsRes, analyticsRes] = await Promise.all([
          api.get<CreatorStats>('/payments/creator/earnings'),
          api.get<PublishedWidget[]>('/marketplace/my-widgets'),
          api.get<CreatorAnalytics>('/marketplace/analytics'),
        ]);

        if (statsRes.success && statsRes.data) {
          setCreatorStats(statsRes.data);
        }
        if (widgetsRes.success && widgetsRes.data) {
          setPublishedWidgets(widgetsRes.data);
        }
        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
      } catch (err) {
        console.error('Failed to load creator data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorData();
  }, [isCreator, isLocalDevMode]);

  const handleConnectStripe = async () => {
    if (isLocalDevMode) {
      alert('Creator features are disabled in local dev mode');
      return;
    }
    window.location.href = '/api/payments/creator/onboarding';
  };

  const handlePublishWidget = async () => {
    if (!newWidget.name.trim()) {
      toast.warning('Widget name is required');
      return;
    }
    if (!newWidget.description.trim()) {
      toast.warning('Description is required');
      return;
    }

    setPublishing(true);

    try {
      if (isLocalDevMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const mockWidget: PublishedWidget = {
          id: `widget-${Date.now()}`,
          name: newWidget.name,
          category: newWidget.category,
          isFree: newWidget.isFree,
          oneTimePrice: newWidget.isFree ? 0 : newWidget.price,
          downloads: 0,
          rating: 0,
          isPublished: false,
        };
        setPublishedWidgets([mockWidget, ...publishedWidgets]);
        setShowPublishModal(false);
        setNewWidget({ name: '', description: '', category: 'utilities', isFree: true, price: 0, tags: '' });
        toast.success('Widget created successfully!', { title: 'Widget Published' });
        setPublishing(false);
        return;
      }

      const response = await api.post('/marketplace/widgets', {
        name: newWidget.name,
        description: newWidget.description,
        category: newWidget.category,
        isFree: newWidget.isFree,
        oneTimePrice: newWidget.isFree ? 0 : newWidget.price,
        tags: newWidget.tags.split(',').map(t => t.trim()).filter(Boolean),
      });

      if (response.success) {
        const widgetsRes = await api.get<PublishedWidget[]>('/marketplace/my-widgets');
        if (widgetsRes.success && widgetsRes.data) {
          setPublishedWidgets(widgetsRes.data);
        }
        setShowPublishModal(false);
        setNewWidget({ name: '', description: '', category: 'utilities', isFree: true, price: 0, tags: '' });
        toast.success('Widget created successfully!', { title: 'Widget Published' });
      } else {
        toast.error(response.error?.message || 'Failed to publish widget');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish widget');
    } finally {
      setPublishing(false);
    }
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div style={styles.settingsPanel}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading creator dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.settingsPanel}>
      <h2 style={styles.panelTitle}>Creator Dashboard</h2>
      <p style={styles.panelDescription}>
        Publish widgets and earn money from the marketplace
      </p>

      {!isCreator && (
        <div style={styles.upgradePrompt}>
          <div style={styles.upgradeIcon}>
            <SNIcon name="star" size="xl" />
          </div>
          <h3 style={styles.upgradeTitle}>Become a Creator</h3>
          <p style={styles.upgradeDescription}>
            Upgrade to Creator plan to publish widgets on the marketplace and earn revenue
          </p>
          <SNButton variant="primary">
            Upgrade to Creator
          </SNButton>
        </div>
      )}

      {isCreator && (
        <>
          {/* Tab Navigation */}
          <div style={styles.creatorTabs}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                ...styles.creatorTab,
                ...(activeTab === 'overview' ? styles.creatorTabActive : {}),
              }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('widgets')}
              style={{
                ...styles.creatorTab,
                ...(activeTab === 'widgets' ? styles.creatorTabActive : {}),
              }}
            >
              Widgets
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                ...styles.creatorTab,
                ...(activeTab === 'analytics' ? styles.creatorTabActive : {}),
              }}
            >
              Analytics
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{analytics?.overview.publishedWidgets || 0}</span>
                  <span style={styles.statLabel}>Published Widgets</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{analytics?.overview.totalDownloads || 0}</span>
                  <span style={styles.statLabel}>Total Downloads</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{formatPrice(analytics?.overview.totalRevenue || 0)}</span>
                  <span style={styles.statLabel}>Lifetime Earnings</span>
                </div>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>★ {analytics?.overview.avgRating || 0}</span>
                  <span style={styles.statLabel}>Avg Rating</span>
                </div>
              </div>

              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Stripe Connect</h3>
                <p style={styles.sectionDescription}>
                  Connect your Stripe account to receive payments for your widgets
                </p>
                {creatorStats?.canReceivePayments ? (
                  <div style={styles.connectedAccount}>
                    <SNIcon name="check" size="sm" />
                    <span>Stripe account connected</span>
                    <SNButton variant="ghost" size="sm" onClick={handleConnectStripe}>
                      Manage
                    </SNButton>
                  </div>
                ) : (
                  <SNButton variant="primary" onClick={handleConnectStripe}>
                    Connect Stripe Account
                  </SNButton>
                )}
              </div>

              {/* Top Performing Widgets */}
              {analytics?.topWidgets && analytics.topWidgets.length > 0 && (
                <div style={styles.formSection}>
                  <h3 style={styles.sectionTitle}>Top Performing Widgets</h3>
                  <div style={styles.topWidgetsList}>
                    {analytics.topWidgets.slice(0, 3).map((widget, idx) => (
                      <div key={widget.id} style={styles.topWidgetRow}>
                        <span style={styles.topWidgetRank}>#{idx + 1}</span>
                        <span style={styles.topWidgetName}>{widget.name}</span>
                        <span style={styles.topWidgetStat}>{widget.downloads} downloads</span>
                        <span style={styles.topWidgetRevenue}>{formatPrice(widget.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Widgets Tab */}
          {activeTab === 'widgets' && (
            <div style={styles.formSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={styles.sectionTitle}>Your Widgets</h3>
                <SNButton variant="primary" size="sm" onClick={() => setShowPublishModal(true)}>
                  <SNIcon name="plus" size="sm" />
                  Publish Widget
                </SNButton>
              </div>
              {publishedWidgets.length === 0 ? (
                <div style={styles.emptyState}>
                  <SNIcon name="widget" size="lg" />
                  <p>No published widgets yet</p>
                  <SNButton variant="secondary" size="sm" onClick={() => setShowPublishModal(true)}>
                    Publish Your First Widget
                  </SNButton>
                </div>
              ) : (
                <div style={styles.widgetList}>
                  {publishedWidgets.map(widget => (
                    <div key={widget.id} style={styles.widgetCard}>
                      <div style={styles.widgetCardInfo}>
                        <h4 style={styles.widgetCardName}>{widget.name}</h4>
                        <span style={styles.widgetCardCategory}>{widget.category}</span>
                        {!widget.isPublished && (
                          <span style={styles.draftBadge}>Draft</span>
                        )}
                      </div>
                      <div style={styles.widgetCardStats}>
                        <span>{widget.downloads} downloads</span>
                        <span>★ {widget.rating.toFixed(1)}</span>
                        <span style={widget.isFree ? styles.freeTag : styles.priceTag}>
                          {widget.isFree ? 'Free' : formatPrice(widget.oneTimePrice || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <>
              {/* Downloads Chart (Simple bar visualization) */}
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Downloads (Last 30 Days)</h3>
                <div style={styles.chartContainer}>
                  <div style={styles.barChart}>
                    {analytics.recentDownloads.slice(-14).map((day, idx) => {
                      const maxCount = Math.max(...analytics.recentDownloads.map(d => d.count), 1);
                      const height = (day.count / maxCount) * 100;
                      return (
                        <div key={idx} style={styles.barWrapper}>
                          <div
                            style={{
                              ...styles.bar,
                              height: `${height}%`,
                            }}
                            title={`${day.date}: ${day.count} downloads`}
                          />
                          <span style={styles.barLabel}>
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Revenue by Month */}
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Revenue by Month</h3>
                {analytics.revenueByMonth.length > 0 ? (
                  <div style={styles.revenueGrid}>
                    {analytics.revenueByMonth.map((month) => (
                      <div key={month.month} style={styles.revenueCard}>
                        <span style={styles.revenueMonth}>
                          {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        <span style={styles.revenueAmount}>{formatPrice(month.revenue)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <SNIcon name="chart" size="lg" />
                    <p>No revenue data yet</p>
                  </div>
                )}
              </div>

              {/* All Widgets Performance */}
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Widget Performance</h3>
                {analytics.topWidgets.length > 0 ? (
                  <div style={styles.performanceTable}>
                    <div style={styles.tableHeader}>
                      <span style={{ flex: 2 }}>Widget</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>Downloads</span>
                      <span style={{ flex: 1, textAlign: 'right' }}>Revenue</span>
                    </div>
                    {analytics.topWidgets.map((widget) => (
                      <div key={widget.id} style={styles.tableRow}>
                        <span style={{ flex: 2, color: '#f1f5f9' }}>{widget.name}</span>
                        <span style={{ flex: 1, textAlign: 'right' }}>{widget.downloads}</span>
                        <span style={{ flex: 1, textAlign: 'right', color: '#4ade80' }}>
                          {formatPrice(widget.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    <SNIcon name="widget" size="lg" />
                    <p>No widget data yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Publish Widget Modal */}
      {showPublishModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPublishModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Publish Widget to Marketplace</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Widget Name</label>
              <input
                type="text"
                value={newWidget.name}
                onChange={e => setNewWidget({ ...newWidget, name: e.target.value })}
                placeholder="My Awesome Widget"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={newWidget.description}
                onChange={e => setNewWidget({ ...newWidget, description: e.target.value })}
                placeholder="Describe what your widget does..."
                style={{ ...styles.input, minHeight: 100, resize: 'vertical' }}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Category</label>
              <select
                value={newWidget.category}
                onChange={e => setNewWidget({ ...newWidget, category: e.target.value })}
                style={styles.select}
              >
                {WIDGET_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tags (comma-separated)</label>
              <input
                type="text"
                value={newWidget.tags}
                onChange={e => setNewWidget({ ...newWidget, tags: e.target.value })}
                placeholder="weather, forecast, animated"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newWidget.isFree}
                  onChange={e => setNewWidget({ ...newWidget, isFree: e.target.checked })}
                />
                <span>Free widget</span>
              </label>
            </div>

            {!newWidget.isFree && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Price (in cents, e.g. 499 = $4.99)</label>
                <input
                  type="number"
                  value={newWidget.price}
                  onChange={e => setNewWidget({ ...newWidget, price: parseInt(e.target.value) || 0 })}
                  placeholder="499"
                  style={styles.input}
                  min={99}
                />
              </div>
            )}

            <div style={styles.modalActions}>
              <SNButton variant="ghost" onClick={() => setShowPublishModal(false)}>
                Cancel
              </SNButton>
              <SNButton
                variant="primary"
                onClick={handlePublishWidget}
                disabled={publishing}
              >
                {publishing ? 'Publishing...' : 'Publish Widget'}
              </SNButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorSettings;
