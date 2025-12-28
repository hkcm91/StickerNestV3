/**
 * StickerNest v2 - Widget Detail Page
 * Full widget view with preview, reviews, and purchase options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/apiClient';
import { useMarketplaceStore } from '../state/useMarketplaceStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';

interface WidgetDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  price: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
  currency: string;
  rating: number;
  ratingCount: number;
  downloadCount: number;
  thumbnailUrl?: string;
  previewImages?: string[];
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
    verified: boolean;
  };
  changelog?: string;
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Review {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const WidgetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLocalDevMode } = useAuth();

  // Marketplace store
  const { initiatePurchase, completePurchase, checkOwnership: checkStoreOwnership } = useMarketplaceStore();

  const [widget, setWidget] = useState<WidgetDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [selectedPriceType, setSelectedPriceType] = useState<'one-time' | 'monthly' | 'yearly'>('one-time');
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'changelog'>('overview');
  const [ownership, setOwnership] = useState<{ owned: boolean; isAuthor: boolean } | null>(null);

  // Handle purchase success callback from Stripe redirect
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus === 'success' && id) {
      completePurchase(id);
      setOwnership({ owned: true, isAuthor: false });
      // Clear the URL params
      navigate(`/marketplace/${id}`, { replace: true });
    }
  }, [searchParams, id, completePurchase, navigate]);

  // Fetch widget details
  useEffect(() => {
    const fetchWidget = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        if (isLocalDevMode) {
          // Mock data for local dev mode
          await new Promise(resolve => setTimeout(resolve, 300));
          setWidget({
            id,
            name: 'Weather Widget Pro',
            description: 'A beautiful weather widget with real-time forecasts, animated weather conditions, and customizable themes. Shows current conditions, hourly forecasts, and 7-day predictions with smooth animations and a clean interface.\n\nFeatures:\n- Real-time weather updates\n- Animated weather icons\n- Hourly and weekly forecasts\n- Multiple location support\n- Dark and light themes\n- Customizable units (°C/°F)',
            category: 'utilities',
            tags: ['weather', 'forecast', 'animated', 'real-time'],
            version: '2.1.0',
            price: 499,
            monthlyPrice: 199,
            yearlyPrice: 1999,
            currency: 'USD',
            rating: 4.8,
            ratingCount: 342,
            downloadCount: 12453,
            creator: {
              id: 'user-1',
              username: 'StickerNest',
              verified: true,
            },
            features: [
              'Real-time weather updates',
              'Animated weather icons',
              'Hourly and weekly forecasts',
              'Multiple location support',
              'Dark and light themes',
            ],
            changelog: '## v2.1.0\n- Added 7-day forecast\n- Performance improvements\n\n## v2.0.0\n- Complete UI redesign\n- Added animations',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          });
          setReviews([
            {
              id: 'review-1',
              userId: 'user-2',
              username: 'JohnDoe',
              rating: 5,
              comment: 'Amazing widget! The animations are so smooth and the forecasts are always accurate.',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 'review-2',
              userId: 'user-3',
              username: 'JaneSmith',
              rating: 4,
              comment: 'Great widget, would love to see more customization options.',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ]);
          setOwnership({ owned: false, isAuthor: false });
          setLoading(false);
          return;
        }

        const [widgetRes, reviewsRes, ownershipRes] = await Promise.all([
          api.get(`/marketplace/${id}`),
          api.get(`/marketplace/${id}/reviews`),
          isAuthenticated ? api.get(`/payments/widgets/${id}/ownership`) : Promise.resolve({ success: true, data: { owned: false, isAuthor: false } }),
        ]);

        if (widgetRes.success && widgetRes.data) {
          setWidget(widgetRes.data);
        } else {
          setError('Widget not found');
        }

        if (reviewsRes.success && reviewsRes.data) {
          setReviews(reviewsRes.data);
        }

        if (ownershipRes.success && ownershipRes.data) {
          setOwnership(ownershipRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load widget');
      } finally {
        setLoading(false);
      }
    };

    fetchWidget();
  }, [id, isAuthenticated, isLocalDevMode]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/marketplace/${id}`);
      return;
    }

    if (!widget) return;

    setPurchasing(true);
    setPurchaseError(null);

    try {
      if (isLocalDevMode) {
        await new Promise(resolve => setTimeout(resolve, 500));
        alert('Purchase simulated in local dev mode!');
        setOwnership({ owned: true, isAuthor: false });
        setPurchasing(false);
        return;
      }

      // Convert price type format for API
      const purchaseType = selectedPriceType === 'one-time' ? 'one_time' : selectedPriceType;

      // Use the marketplace store to initiate purchase
      const checkoutUrl = await initiatePurchase(widget.id, purchaseType as 'one_time' | 'monthly' | 'yearly');

      if (checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = checkoutUrl;
      } else {
        // Purchase completed (free item or already owned)
        setOwnership({ owned: true, isAuthor: false });
      }
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const stars = [];
    const fontSize = size === 'lg' ? 20 : 14;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#fbbf24' : '#4b5563', fontSize }}>
          ★
        </span>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Loading widget...</span>
        </div>
      </div>
    );
  }

  if (error || !widget) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <SNIcon name="warning" size="xl" />
          <h2 style={styles.errorTitle}>Widget Not Found</h2>
          <p style={styles.errorText}>{error || 'This widget does not exist or has been removed.'}</p>
          <SNButton variant="primary" onClick={() => navigate('/marketplace')}>
            Back to Marketplace
          </SNButton>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/marketplace" style={styles.backLink}>
            <SNIcon name="chevronLeft" size="sm" />
            <span>Marketplace</span>
          </Link>
        </div>
        <div style={styles.headerRight}>
          {isAuthenticated ? (
            <Link to="/gallery" style={styles.navLink}>Gallery</Link>
          ) : (
            <SNButton variant="primary" size="sm" onClick={() => navigate('/signup')}>
              Get Started
            </SNButton>
          )}
        </div>
      </header>

      <div style={styles.content}>
        {/* Main info */}
        <div style={styles.mainSection}>
          <div style={styles.widgetHeader}>
            <div style={styles.widgetPreview}>
              {widget.thumbnailUrl ? (
                <img src={widget.thumbnailUrl} alt="" style={styles.previewImg} />
              ) : (
                <SNIcon name="widget" size="xl" />
              )}
            </div>
            <div style={styles.widgetInfo}>
              <div style={styles.titleRow}>
                <h1 style={styles.title}>{widget.name}</h1>
                {widget.creator.verified && (
                  <span style={styles.verifiedBadge}>
                    <SNIcon name="check" size="xs" />
                    Verified
                  </span>
                )}
              </div>
              <Link to={`/creator/${widget.creator.id}`} style={styles.creatorLink}>
                by {widget.creator.username}
              </Link>
              <div style={styles.ratingRow}>
                {renderStars(Math.round(widget.rating), 'lg')}
                <span style={styles.ratingValue}>{widget.rating.toFixed(1)}</span>
                <span style={styles.ratingCount}>({widget.ratingCount} reviews)</span>
              </div>
              <div style={styles.statsRow}>
                <span style={styles.stat}>
                  <SNIcon name="download" size="sm" />
                  {widget.downloadCount.toLocaleString()} downloads
                </span>
                <span style={styles.stat}>
                  <SNIcon name="tag" size="sm" />
                  v{widget.version}
                </span>
                <span style={styles.stat}>
                  <SNIcon name="folder" size="sm" />
                  {widget.category}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            {(['overview', 'reviews', 'changelog'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'reviews' && ` (${reviews.length})`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={styles.tabContent}>
            {activeTab === 'overview' && (
              <>
                <div style={styles.description}>
                  {widget.description.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: '0 0 12px' }}>{line}</p>
                  ))}
                </div>
                {widget.features && widget.features.length > 0 && (
                  <div style={styles.features}>
                    <h3 style={styles.sectionTitle}>Features</h3>
                    <ul style={styles.featureList}>
                      {widget.features.map((feature, i) => (
                        <li key={i} style={styles.featureItem}>
                          <SNIcon name="check" size="sm" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={styles.tags}>
                  {widget.tags.map(tag => (
                    <span key={tag} style={styles.tag}>{tag}</span>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'reviews' && (
              <div style={styles.reviewList}>
                {reviews.length === 0 ? (
                  <p style={styles.emptyText}>No reviews yet</p>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} style={styles.reviewCard}>
                      <div style={styles.reviewHeader}>
                        <div style={styles.reviewAuthor}>
                          <div style={styles.reviewAvatar}>
                            {review.avatarUrl ? (
                              <img src={review.avatarUrl} alt="" />
                            ) : (
                              <SNIcon name="user" size="xs" />
                            )}
                          </div>
                          <span>{review.username}</span>
                        </div>
                        <div style={styles.reviewRating}>
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <p style={styles.reviewComment}>{review.comment}</p>
                      <span style={styles.reviewDate}>{formatDate(review.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'changelog' && (
              <div style={styles.changelog}>
                {widget.changelog ? (
                  <pre style={styles.changelogText}>{widget.changelog}</pre>
                ) : (
                  <p style={styles.emptyText}>No changelog available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Purchase */}
        <aside style={styles.sidebar}>
          <div style={styles.purchaseCard}>
            {ownership?.owned ? (
              <>
                <div style={styles.ownedBadge}>
                  <SNIcon name="check" size="sm" />
                  {ownership.isAuthor ? 'You created this' : 'You own this'}
                </div>
                <SNButton
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={() => navigate('/profile')}
                >
                  Use in Canvas
                </SNButton>
              </>
            ) : widget.price === 0 ? (
              <>
                <div style={styles.priceDisplay}>
                  <span style={styles.freeLabel}>Free</span>
                </div>
                <SNButton
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing ? 'Adding...' : 'Add to Canvas'}
                </SNButton>
              </>
            ) : (
              <>
                <div style={styles.pricingOptions}>
                  {widget.price > 0 && (
                    <button
                      onClick={() => setSelectedPriceType('one-time')}
                      style={{
                        ...styles.priceOption,
                        ...(selectedPriceType === 'one-time' ? styles.priceOptionActive : {}),
                      }}
                    >
                      <span style={styles.priceLabel}>One-time</span>
                      <span style={styles.priceValue}>{formatPrice(widget.price)}</span>
                    </button>
                  )}
                  {widget.monthlyPrice && widget.monthlyPrice > 0 && (
                    <button
                      onClick={() => setSelectedPriceType('monthly')}
                      style={{
                        ...styles.priceOption,
                        ...(selectedPriceType === 'monthly' ? styles.priceOptionActive : {}),
                      }}
                    >
                      <span style={styles.priceLabel}>Monthly</span>
                      <span style={styles.priceValue}>{formatPrice(widget.monthlyPrice)}/mo</span>
                    </button>
                  )}
                  {widget.yearlyPrice && widget.yearlyPrice > 0 && (
                    <button
                      onClick={() => setSelectedPriceType('yearly')}
                      style={{
                        ...styles.priceOption,
                        ...(selectedPriceType === 'yearly' ? styles.priceOptionActive : {}),
                      }}
                    >
                      <span style={styles.priceLabel}>Yearly</span>
                      <span style={styles.priceValue}>{formatPrice(widget.yearlyPrice)}/yr</span>
                    </button>
                  )}
                </div>

                {purchaseError && (
                  <div style={styles.purchaseError}>
                    <SNIcon name="warning" size="sm" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                <SNButton
                  variant="primary"
                  size="lg"
                  style={{ width: '100%' }}
                  onClick={handlePurchase}
                  disabled={purchasing}
                >
                  {purchasing ? 'Processing...' : 'Purchase'}
                </SNButton>
              </>
            )}

            <div style={styles.purchaseMeta}>
              <span>Last updated: {formatDate(widget.updatedAt)}</span>
            </div>
          </div>

          {/* Creator card */}
          <div style={styles.creatorCard}>
            <h3 style={styles.creatorCardTitle}>Created by</h3>
            <div style={styles.creatorInfo}>
              <div style={styles.creatorAvatar}>
                {widget.creator.avatarUrl ? (
                  <img src={widget.creator.avatarUrl} alt="" />
                ) : (
                  <SNIcon name="user" size="sm" />
                )}
              </div>
              <div>
                <span style={styles.creatorName}>{widget.creator.username}</span>
                {widget.creator.verified && (
                  <SNIcon name="check" size="xs" style={{ color: '#22c55e', marginLeft: 4 }} />
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 100%)',
    padding: 20,
  },
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 100%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(15, 15, 25, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
  },
  content: {
    display: 'flex',
    gap: 32,
    padding: 32,
    maxWidth: 1200,
    margin: '0 auto',
  },
  mainSection: {
    flex: 1,
  },
  widgetHeader: {
    display: 'flex',
    gap: 24,
    marginBottom: 32,
  },
  widgetPreview: {
    width: 120,
    height: 120,
    borderRadius: 16,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  widgetInfo: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  verifiedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    background: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 6,
    fontSize: 12,
    color: '#22c55e',
  },
  creatorLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    margin: '4px 0 12px',
    display: 'block',
  },
  ratingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  ratingCount: {
    fontSize: 14,
    color: '#64748b',
  },
  statsRow: {
    display: 'flex',
    gap: 20,
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#94a3b8',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: 24,
  },
  tab: {
    padding: '12px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: '#a78bfa',
    borderBottomColor: '#8b5cf6',
  },
  tabContent: {
    minHeight: 300,
  },
  description: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#94a3b8',
    marginBottom: 24,
  },
  features: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 16px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    fontSize: 14,
    color: '#94a3b8',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    padding: '6px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 6,
    fontSize: 13,
    color: '#a78bfa',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  reviewCard: {
    padding: 20,
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.1)',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewRating: {},
  reviewComment: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: '0 0 8px',
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748b',
  },
  changelog: {},
  changelogText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    padding: 40,
  },
  sidebar: {
    width: 320,
    flexShrink: 0,
  },
  purchaseCard: {
    padding: 24,
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: 20,
  },
  ownedBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
  },
  priceDisplay: {
    textAlign: 'center',
    marginBottom: 16,
  },
  freeLabel: {
    fontSize: 32,
    fontWeight: 700,
    color: '#4ade80',
  },
  pricingOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  priceOption: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  priceOptionActive: {
    background: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
    color: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 600,
  },
  purchaseError: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    color: '#f87171',
    fontSize: 13,
    marginBottom: 16,
  },
  purchaseMeta: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 16,
  },
  creatorCard: {
    padding: 20,
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.1)',
  },
  creatorCardTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px',
  },
  creatorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#f1f5f9',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    textAlign: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  errorText: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
  },
};

export default WidgetDetailPage;
