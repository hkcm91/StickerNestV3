/**
 * StickerNest v2 - Earnings Panel
 *
 * Displays creator earnings summary with charts and payout options.
 */

import React from 'react';
import { useCreatorStore } from '../../state/useCreatorStore';

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    padding: 20,
  },
  cardLabel: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--sn-text-primary)',
  },
  cardValueSmall: {
    fontSize: 14,
    color: 'var(--sn-text-secondary)',
    marginTop: 4,
  },
  success: {
    color: 'var(--sn-success)',
  },
  warning: {
    color: 'var(--sn-warning)',
  },
  payoutSection: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: '0 0 16px',
  },
  payoutInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--sn-success)',
  },
  payoutNote: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
  },
  button: {
    padding: '12px 24px',
    background: 'var(--sn-accent-primary)',
    border: 'none',
    borderRadius: 'var(--sn-radius-md)',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  buttonSecondary: {
    background: 'transparent',
    border: '1px solid var(--sn-border-primary)',
    color: 'var(--sn-text-primary)',
  },
  statsRow: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap' as const,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
  },
  statText: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--sn-text-muted)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
  },
  chartPlaceholder: {
    height: 200,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--sn-text-muted)',
    fontSize: 14,
  },
  alertBox: {
    padding: 16,
    borderRadius: 'var(--sn-radius-md)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertInfo: {
    background: 'var(--sn-info-bg)',
    border: '1px solid var(--sn-info)',
  },
  alertWarning: {
    background: 'var(--sn-warning-bg)',
    border: '1px solid var(--sn-warning)',
  },
  alertIcon: {
    fontSize: 18,
    flexShrink: 0,
  },
  alertText: {
    fontSize: 13,
    color: 'var(--sn-text-secondary)',
    lineHeight: 1.5,
  },
};

// ==================
// Helper Functions
// ==================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

// ==================
// Sales Chart Component
// ==================

interface SalesChartProps {
  data: Array<{ date: string; sales: number; revenue: number }>;
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  const chartWidth = 600;
  const chartHeight = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Get max values for scaling
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const maxSales = Math.max(...data.map(d => d.sales), 1);

  // Scale functions
  const xScale = (index: number) => (index / (data.length - 1 || 1)) * innerWidth;
  const yScaleRevenue = (value: number) => innerHeight - (value / maxRevenue) * innerHeight;
  const yScaleSales = (value: number) => innerHeight - (value / maxSales) * innerHeight;

  // Generate paths
  const revenuePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleRevenue(d.revenue)}`)
    .join(' ');

  const salesPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScaleSales(d.sales)}`)
    .join(' ');

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Show every nth label to avoid crowding
  const labelInterval = Math.ceil(data.length / 7);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', maxWidth: chartWidth, height: 'auto' }}
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                y1={tick * innerHeight}
                x2={innerWidth}
                y2={tick * innerHeight}
                stroke="var(--sn-border-primary)"
                strokeOpacity={0.3}
              />
              <text
                x={-8}
                y={tick * innerHeight + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--sn-text-muted)"
              >
                ${((1 - tick) * maxRevenue / 100).toFixed(0)}
              </text>
            </g>
          ))}

          {/* Revenue area fill */}
          <path
            d={`${revenuePath} L ${xScale(data.length - 1)} ${innerHeight} L ${xScale(0)} ${innerHeight} Z`}
            fill="url(#revenueGradient)"
            opacity={0.3}
          />

          {/* Revenue line */}
          <path
            d={revenuePath}
            fill="none"
            stroke="var(--sn-success)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sales line */}
          <path
            d={salesPath}
            fill="none"
            stroke="var(--sn-accent-primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4,4"
          />

          {/* X-axis labels */}
          {data.map((d, i) => (
            i % labelInterval === 0 && (
              <text
                key={d.date}
                x={xScale(i)}
                y={innerHeight + 20}
                textAnchor="middle"
                fontSize={10}
                fill="var(--sn-text-muted)"
              >
                {formatDate(d.date)}
              </text>
            )
          ))}

          {/* Data points - revenue */}
          {data.map((d, i) => (
            <circle
              key={`rev-${d.date}`}
              cx={xScale(i)}
              cy={yScaleRevenue(d.revenue)}
              r={3}
              fill="var(--sn-success)"
            />
          ))}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--sn-success)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </g>
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        marginTop: 12,
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 16,
            height: 3,
            background: 'var(--sn-success)',
            borderRadius: 2,
          }} />
          <span style={{ color: 'var(--sn-text-muted)' }}>Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 16,
            height: 3,
            background: 'var(--sn-accent-primary)',
            borderRadius: 2,
          }} />
          <span style={{ color: 'var(--sn-text-muted)' }}>Sales Count</span>
        </div>
      </div>
    </div>
  );
};

// ==================
// Component
// ==================

export const EarningsPanel: React.FC = () => {
  const {
    earnings,
    analytics,
    isLoadingEarnings,
    isLoadingAnalytics,
    requestPayout,
    openStripeDashboard,
  } = useCreatorStore();

  const handleRequestPayout = async () => {
    const result = await requestPayout();
    if (result?.success) {
      alert('Payout requested successfully!');
    }
  };

  const handleOpenDashboard = async () => {
    await openStripeDashboard();
  };

  // Minimum payout threshold (in cents)
  const MIN_PAYOUT = 1000; // $10.00
  const canRequestPayout = (earnings?.availableBalance || 0) >= MIN_PAYOUT;

  if (isLoadingEarnings || isLoadingAnalytics) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: 'var(--sn-text-muted)', margin: 0 }}>
            Loading earnings data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Summary Cards */}
      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Earnings</div>
          <div style={styles.cardValue}>
            {formatCurrency(earnings?.totalEarnings || 0)}
          </div>
          <div style={styles.cardValueSmall}>All time</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Available Balance</div>
          <div style={{ ...styles.cardValue, ...styles.success }}>
            {formatCurrency(earnings?.availableBalance || 0)}
          </div>
          <div style={styles.cardValueSmall}>Ready for payout</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Pending</div>
          <div style={{ ...styles.cardValue, ...styles.warning }}>
            {formatCurrency(earnings?.pendingBalance || 0)}
          </div>
          <div style={styles.cardValueSmall}>Processing</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Paid Out</div>
          <div style={styles.cardValue}>
            {formatCurrency(earnings?.totalPaidOut || 0)}
          </div>
          <div style={styles.cardValueSmall}>To your bank</div>
        </div>
      </div>

      {/* Payout Section */}
      <div style={styles.payoutSection}>
        <h3 style={styles.sectionTitle}>Request Payout</h3>

        <div style={styles.payoutInfo}>
          <div>
            <div style={styles.payoutAmount}>
              {formatCurrency(earnings?.availableBalance || 0)}
            </div>
            <div style={styles.payoutNote}>Available for payout</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleOpenDashboard}
              style={{ ...styles.button, ...styles.buttonSecondary }}
            >
              Stripe Dashboard
            </button>
            <button
              onClick={handleRequestPayout}
              disabled={!canRequestPayout}
              style={{
                ...styles.button,
                ...(!canRequestPayout ? styles.buttonDisabled : {}),
              }}
            >
              Request Payout
            </button>
          </div>
        </div>

        {!canRequestPayout && (
          <div style={{ ...styles.alertBox, ...styles.alertInfo }}>
            <span style={styles.alertIcon}>ℹ️</span>
            <span style={styles.alertText}>
              Minimum payout amount is $10.00. Keep creating and selling to reach the threshold!
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Quick Stats</h3>
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <div style={{ ...styles.statIcon, background: 'var(--sn-info-bg)' }}>
              📦
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>Total Sales</span>
              <span style={styles.statValue}>
                {formatNumber(analytics?.totalSales || 0)}
              </span>
            </div>
          </div>

          <div style={styles.statItem}>
            <div style={{ ...styles.statIcon, background: 'var(--sn-success-bg)' }}>
              💵
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>Revenue (30d)</span>
              <span style={styles.statValue}>
                {formatCurrency(analytics?.revenueByPeriod?.month || 0)}
              </span>
            </div>
          </div>

          <div style={styles.statItem}>
            <div style={{ ...styles.statIcon, background: 'var(--sn-accent-primary-20)' }}>
              ⬇️
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>Downloads</span>
              <span style={styles.statValue}>
                {formatNumber(
                  analytics?.topItems?.reduce((sum, item) => sum + item.downloads, 0) || 0
                )}
              </span>
            </div>
          </div>

          <div style={styles.statItem}>
            <div style={{ ...styles.statIcon, background: 'var(--sn-warning-bg)' }}>
              ⭐
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>Avg Rating</span>
              <span style={styles.statValue}>
                {analytics?.topItems?.[0]?.rating?.toFixed(1) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Sales Over Time</h3>
        {analytics?.dailySales && analytics.dailySales.length > 0 ? (
          <SalesChart data={analytics.dailySales} />
        ) : (
          <div style={styles.chartPlaceholder}>
            📊 No sales data yet
          </div>
        )}
      </div>

      {/* Top Performing Items */}
      {analytics?.topItems && analytics.topItems.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Top Performing Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {analytics.topItems.slice(0, 5).map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  background: 'var(--sn-bg-tertiary)',
                  borderRadius: 'var(--sn-radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--sn-accent-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span style={{ fontWeight: 500, color: 'var(--sn-text-primary)' }}>
                    {item.name}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <span style={{ fontSize: 13, color: 'var(--sn-text-muted)' }}>
                    {item.sales} sales
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--sn-success)', fontWeight: 600 }}>
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsPanel;
