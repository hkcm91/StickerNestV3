/**
 * StickerNest v2 - Creator Onboarding
 *
 * Guides users through Stripe Connect setup to become creators.
 */

import React, { useState } from 'react';
import { useCreatorStore } from '../../state/useCreatorStore';

// ==================
// Styles
// ==================

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--sn-bg-secondary)',
    borderRadius: 'var(--sn-radius-lg)',
    border: '1px solid var(--sn-border-primary)',
    padding: 32,
    maxWidth: 600,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    margin: '0 0 8px',
  },
  description: {
    fontSize: 14,
    color: 'var(--sn-text-secondary)',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    color: 'var(--sn-text-primary)',
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'var(--sn-success-bg)',
    color: 'var(--sn-success)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
  },
  input: {
    padding: '10px 14px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  note: {
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    marginTop: 8,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 'var(--sn-radius-full)',
    fontSize: 12,
    fontWeight: 500,
  },
  statusPending: {
    background: 'var(--sn-warning-bg)',
    color: 'var(--sn-warning)',
  },
  statusOnboarding: {
    background: 'var(--sn-info-bg)',
    color: 'var(--sn-info)',
  },
};

// ==================
// Countries
// ==================

const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
];

// ==================
// Component
// ==================

export const CreatorOnboarding: React.FC = () => {
  const { account, isLoading, startOnboarding } = useCreatorStore();
  const [country, setCountry] = useState('US');

  const handleStartOnboarding = async () => {
    const url = await startOnboarding(undefined, country);
    if (url) {
      window.location.href = url;
    }
  };

  // Show continue button if already started onboarding
  if (account?.status === 'onboarding') {
    return (
      <div style={styles.container}>
        <div style={styles.icon}>🎨</div>
        <h3 style={styles.title}>Continue Onboarding</h3>
        <p style={styles.description}>
          You've started the creator onboarding process. Click below to continue
          setting up your Stripe account.
        </p>

        <div style={{ marginBottom: 24 }}>
          <span style={{ ...styles.statusBadge, ...styles.statusOnboarding }}>
            ⏳ Onboarding in progress
          </span>
        </div>

        <button
          onClick={handleStartOnboarding}
          disabled={isLoading}
          style={{
            ...styles.button,
            ...(isLoading ? styles.buttonDisabled : {}),
          }}
        >
          {isLoading ? 'Loading...' : 'Continue Setup'}
        </button>

        <p style={styles.note}>
          You'll be redirected to Stripe to complete your account setup.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.icon}>💰</div>
      <h3 style={styles.title}>Become a Creator</h3>
      <p style={styles.description}>
        Start selling your widgets, sticker packs, and templates on the
        StickerNest marketplace. Set up your creator account to receive payouts.
      </p>

      <div style={styles.features}>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>✓</span>
          <span>Sell widgets, stickers, and templates</span>
        </div>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>✓</span>
          <span>Keep 85% of every sale</span>
        </div>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>✓</span>
          <span>Get paid via Stripe (bank or debit card)</span>
        </div>
        <div style={styles.feature}>
          <span style={styles.featureIcon}>✓</span>
          <span>Track sales and analytics</span>
        </div>
      </div>

      <div style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={styles.select}
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleStartOnboarding}
          disabled={isLoading}
          style={{
            ...styles.button,
            ...(isLoading ? styles.buttonDisabled : {}),
          }}
        >
          {isLoading ? 'Starting...' : 'Start Creator Setup'}
        </button>
      </div>

      <p style={styles.note}>
        You'll be redirected to Stripe to complete identity verification and
        payment setup. This usually takes 5-10 minutes.
      </p>
    </div>
  );
};

export default CreatorOnboarding;
