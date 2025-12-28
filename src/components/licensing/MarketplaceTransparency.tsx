/**
 * StickerNest v2 - Marketplace Transparency Panel
 *
 * Displays licensing transparency information for marketplace listings.
 * Shows royalty obligations, dependencies, AI access, and warnings.
 *
 * @version 1.0.0
 */

import React, { useState } from 'react';
import type { MarketplaceTransparency as TransparencyData, RoyaltyCalculation } from '../../types/licensing';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';

interface MarketplaceTransparencyProps {
  data: TransparencyData;
  royaltyCalculation?: RoyaltyCalculation;
  onAcknowledge?: () => void;
  showFullDetails?: boolean;
}

export const MarketplaceTransparencyPanel: React.FC<MarketplaceTransparencyProps> = ({
  data,
  royaltyCalculation,
  onAcknowledge,
  showFullDetails = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(showFullDetails);

  // ==========================================================================
  // Styles
  // ==========================================================================

  const containerStyle: React.CSSProperties = {
    background: 'var(--sn-bg-elevated, rgba(255, 255, 255, 0.03))',
    borderRadius: 'var(--sn-radius-lg, 12px)',
    border: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.1))',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--sn-bg-subtle, rgba(255, 255, 255, 0.02))',
    borderBottom: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.08))',
    cursor: 'pointer',
  };

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.05))',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--sn-text-secondary, #94a3b8)',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const valueStyle: React.CSSProperties = {
    color: 'var(--sn-text-primary, #f1f5f9)',
    fontSize: 13,
    fontWeight: 500,
  };

  const warningStyle: React.CSSProperties = {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    borderRadius: 'var(--sn-radius-md, 8px)',
    padding: '12px',
    margin: '12px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  };

  const infoStyle: React.CSSProperties = {
    ...warningStyle,
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
  };

  const successStyle: React.CSSProperties = {
    ...warningStyle,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  };

  const dependencyListStyle: React.CSSProperties = {
    padding: '12px 16px',
  };

  const dependencyItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'var(--sn-bg-input, rgba(255, 255, 255, 0.03))',
    borderRadius: 'var(--sn-radius-sm, 6px)',
    marginBottom: '6px',
  };

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    background: `${color}20`,
    color: color,
    borderRadius: '4px',
    fontSize: 11,
    fontWeight: 500,
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatPercent = (rate: number): string => {
    return `${Math.round(rate * 100)}%`;
  };

  const getRoyaltyColor = (rate: number): string => {
    if (rate <= 0.1) return '#22c55e'; // Green
    if (rate <= 0.25) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div style={containerStyle}>
      {/* Header - Always visible */}
      <div
        style={headerStyle}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SNIcon name="shieldCheck" size={20} color="var(--sn-accent-primary, #8b5cf6)" />
          <span style={{ color: 'var(--sn-text-primary)', fontSize: 14, fontWeight: 500 }}>
            License & Transparency
          </span>
          {data.warnings.length > 0 && (
            <span style={badgeStyle('#fbbf24')}>
              {data.warnings.length} notice{data.warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <SNIcon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="var(--sn-text-tertiary)"
        />
      </div>

      {/* Quick Stats - Always visible */}
      <div style={statRowStyle}>
        <span style={labelStyle}>
          <SNIcon name="percent" size={14} />
          Total Royalty Obligation
        </span>
        <span style={{ ...valueStyle, color: getRoyaltyColor(data.totalRoyaltyRate) }}>
          {formatPercent(data.totalRoyaltyRate)}
        </span>
      </div>

      <div style={statRowStyle}>
        <span style={labelStyle}>
          <SNIcon name="gitBranch" size={14} />
          Dependencies
        </span>
        <span style={valueStyle}>
          {data.dependencyCount} component{data.dependencyCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <>
          {/* AI & Creation Info */}
          <div style={statRowStyle}>
            <span style={labelStyle}>
              <SNIcon name="bot" size={14} />
              AI Contributed
            </span>
            <span style={valueStyle}>
              {data.aiContributed ? (
                <span style={badgeStyle('#8b5cf6')}>Yes</span>
              ) : (
                <span style={badgeStyle('#22c55e')}>No</span>
              )}
            </span>
          </div>

          <div style={statRowStyle}>
            <span style={labelStyle}>
              <SNIcon name="user" size={14} />
              Human Artists
            </span>
            <span style={valueStyle}>
              {data.humanArtistsContributed ? (
                <span style={badgeStyle('#22c55e')}>Yes</span>
              ) : (
                <span style={badgeStyle('#64748b')}>No</span>
              )}
            </span>
          </div>

          <div style={statRowStyle}>
            <span style={labelStyle}>
              <SNIcon name="edit" size={14} />
              AI Can Modify
            </span>
            <span style={valueStyle}>
              {data.aiCanModify ? (
                <span style={badgeStyle('#fbbf24')}>Yes</span>
              ) : (
                <span style={badgeStyle('#22c55e')}>No</span>
              )}
            </span>
          </div>

          <div style={statRowStyle}>
            <span style={labelStyle}>
              <SNIcon name="lock" size={14} />
              Uses Protected Assets
            </span>
            <span style={valueStyle}>
              {data.usesProtectedAssets ? (
                <span style={badgeStyle('#fbbf24')}>Yes</span>
              ) : (
                <span style={badgeStyle('#22c55e')}>No</span>
              )}
            </span>
          </div>

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div style={warningStyle}>
              <SNIcon name="alertTriangle" size={18} color="#fbbf24" />
              <div>
                <div style={{ color: '#fbbf24', fontWeight: 500, fontSize: 13 }}>
                  Important Notices
                </div>
                <ul style={{ margin: '8px 0 0', paddingLeft: '16px', color: 'var(--sn-text-secondary)', fontSize: 12 }}>
                  {data.warnings.map((warning, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Dependency Breakdown */}
          {data.dependencySummary.length > 0 && (
            <div style={dependencyListStyle}>
              <div style={{ ...labelStyle, marginBottom: '10px' }}>
                Dependency Breakdown
              </div>
              {data.dependencySummary.map((dep, i) => (
                <div key={i} style={dependencyItemStyle}>
                  <div>
                    <div style={{ color: 'var(--sn-text-primary)', fontSize: 13, fontWeight: 500 }}>
                      {dep.name}
                    </div>
                    <div style={{ color: 'var(--sn-text-tertiary)', fontSize: 11 }}>
                      by {dep.creator}
                    </div>
                  </div>
                  <span style={{ ...valueStyle, color: getRoyaltyColor(dep.royaltyRate) }}>
                    {formatPercent(dep.royaltyRate)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Royalty Calculation Details */}
          {royaltyCalculation && (
            <div style={infoStyle}>
              <SNIcon name="calculator" size={18} color="#3b82f6" />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#60a5fa', fontWeight: 500, fontSize: 13, marginBottom: 8 }}>
                  Earnings Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: 12 }}>
                  <div style={{ color: 'var(--sn-text-secondary)' }}>Base Price:</div>
                  <div style={{ color: 'var(--sn-text-primary)', textAlign: 'right' }}>
                    {formatPrice(royaltyCalculation.basePrice)}
                  </div>

                  <div style={{ color: 'var(--sn-text-secondary)' }}>Platform Fee:</div>
                  <div style={{ color: 'var(--sn-text-primary)', textAlign: 'right' }}>
                    -{formatPrice(royaltyCalculation.platformFee)}
                  </div>

                  <div style={{ color: 'var(--sn-text-secondary)' }}>Royalties:</div>
                  <div style={{ color: '#fbbf24', textAlign: 'right' }}>
                    -{formatPrice(royaltyCalculation.totalRoyaltyAmount)}
                  </div>

                  <div style={{ color: 'var(--sn-text-primary)', fontWeight: 500, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                    You Receive:
                  </div>
                  <div style={{ color: '#22c55e', fontWeight: 600, textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                    {formatPrice(royaltyCalculation.netCreatorAmount)}
                  </div>
                </div>

                {royaltyCalculation.warnings.length > 0 && (
                  <div style={{ marginTop: 10, padding: '8px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: 4 }}>
                    {royaltyCalculation.warnings.map((w, i) => (
                      <div key={i} style={{ color: '#fbbf24', fontSize: 11, marginBottom: 2 }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acknowledgment */}
          {onAcknowledge && (
            <div style={{ padding: '12px 16px' }}>
              <SNButton
                variant="primary"
                onClick={onAcknowledge}
                style={{ width: '100%' }}
              >
                I Understand These Obligations
              </SNButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Compact version for displaying in widget cards
 */
export const MarketplaceTransparencyBadge: React.FC<{
  royaltyRate: number;
  aiContributed: boolean;
  dependencyCount: number;
}> = ({ royaltyRate, aiContributed, dependencyCount }) => {
  const badgeContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    fontSize: 10,
    color: 'var(--sn-text-secondary)',
  };

  return (
    <div style={badgeContainerStyle}>
      {royaltyRate > 0 && (
        <span style={{
          ...badgeStyle,
          background: royaltyRate > 0.25 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)',
          color: royaltyRate > 0.25 ? '#ef4444' : '#fbbf24',
        }}>
          <SNIcon name="percent" size={10} />
          {Math.round(royaltyRate * 100)}% royalty
        </span>
      )}
      {aiContributed && (
        <span style={{ ...badgeStyle, background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
          <SNIcon name="bot" size={10} />
          AI
        </span>
      )}
      {dependencyCount > 0 && (
        <span style={badgeStyle}>
          <SNIcon name="gitBranch" size={10} />
          {dependencyCount} deps
        </span>
      )}
    </div>
  );
};

export default MarketplaceTransparencyPanel;
