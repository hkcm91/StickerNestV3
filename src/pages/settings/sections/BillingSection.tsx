/**
 * StickerNest v2 - Billing Settings Section
 * Subscription and payment management
 */

import React from 'react';
import { SNIcon } from '../../../shared-ui/SNIcon';
import { SNButton } from '../../../shared-ui/SNButton';
import { styles } from '../settingsStyles';

export interface BillingSettingsProps {
  user: any;
  isLocalDevMode: boolean;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '3 canvases',
      '50 AI generations/month',
      'Basic widgets',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    features: [
      'Unlimited canvases',
      '500 AI generations/month',
      'All widgets',
      'Priority support',
      'Custom domains',
      'Remove branding',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 2999,
    features: [
      'Everything in Pro',
      'Unlimited AI generations',
      'Publish to marketplace',
      'Revenue sharing',
      'API access',
      'White-label embeds',
    ],
  },
];

export const BillingSettings: React.FC<BillingSettingsProps> = ({ user, isLocalDevMode }) => {
  const currentPlan = user?.subscription?.tier || 'free';

  const handleUpgrade = async (planId: string) => {
    if (isLocalDevMode) {
      alert('Billing is disabled in local dev mode');
      return;
    }
    // Redirect to Stripe checkout
    window.location.href = `/api/payments/subscription/checkout?plan=${planId}`;
  };

  return (
    <div style={styles.settingsPanel}>
      <h2 style={styles.panelTitle}>Billing & Subscription</h2>
      <p style={styles.panelDescription}>
        Manage your subscription and payment methods
      </p>

      {isLocalDevMode && (
        <div style={styles.devNotice}>
          <SNIcon name="info" size="sm" />
          <span>Billing features are disabled in local dev mode</span>
        </div>
      )}

      <div style={styles.currentPlan}>
        <div style={styles.currentPlanInfo}>
          <span style={styles.currentPlanLabel}>Current Plan</span>
          <span style={styles.currentPlanName}>
            {plans.find(p => p.id === currentPlan)?.name || 'Free'}
          </span>
        </div>
        {currentPlan !== 'free' && (
          <SNButton variant="ghost" size="sm">
            Manage Subscription
          </SNButton>
        )}
      </div>

      <div style={styles.planGrid}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              ...styles.planCard,
              ...(plan.id === currentPlan ? styles.planCardActive : {}),
            }}
          >
            {plan.id === 'pro' && (
              <div style={styles.popularBadge}>Most Popular</div>
            )}
            <h3 style={styles.planName}>{plan.name}</h3>
            <div style={styles.planPrice}>
              {plan.price === 0 ? (
                <span style={styles.priceAmount}>Free</span>
              ) : (
                <>
                  <span style={styles.priceAmount}>${(plan.price / 100).toFixed(0)}</span>
                  <span style={styles.priceInterval}>/month</span>
                </>
              )}
            </div>
            <ul style={styles.featureList}>
              {plan.features.map((feature, i) => (
                <li key={i} style={styles.featureItem}>
                  <SNIcon name="check" size="xs" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {plan.id === currentPlan ? (
              <SNButton variant="secondary" size="sm" disabled style={{ width: '100%' }}>
                Current Plan
              </SNButton>
            ) : (
              <SNButton
                variant={plan.id === 'pro' ? 'primary' : 'secondary'}
                size="sm"
                style={{ width: '100%' }}
                onClick={() => handleUpgrade(plan.id)}
              >
                {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
              </SNButton>
            )}
          </div>
        ))}
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Payment Method</h3>
        <div style={styles.paymentMethod}>
          <div style={styles.cardPlaceholder}>
            <SNIcon name="creditCard" size="lg" />
            <span>No payment method on file</span>
          </div>
          <SNButton variant="secondary" size="sm">
            Add Payment Method
          </SNButton>
        </div>
      </div>

      <div style={styles.formSection}>
        <h3 style={styles.sectionTitle}>Billing History</h3>
        <div style={styles.emptyState}>
          <SNIcon name="receipt" size="lg" />
          <p>No billing history</p>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings;
