/**
 * StickerNest v2 - Marketplace Page
 * Browse and discover widgets from the community
 * Now wired to backend API via apiClient
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { marketplaceApi, api, type MarketplaceWidget } from '../services/apiClient';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { useToast } from '../shared-ui';

// Extended widget interface for display
interface DisplayWidget extends MarketplaceWidget {
  isOfficial: boolean;
  isVerified: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'data', name: 'Data & Analytics', icon: 'chart' },
  { id: 'media', name: 'Media & Content', icon: 'image' },
  { id: 'productivity', name: 'Productivity', icon: 'calendar' },
  { id: 'social', name: 'Social', icon: 'users' },
  { id: 'ai', name: 'AI & ML', icon: 'ai' },
  { id: 'games', name: 'Games', icon: 'gamepad' },
  { id: 'utilities', name: 'Utilities', icon: 'tool' },
];

const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLocalDevMode } = useAuth();

  const [widgets, setWidgets] = useState<DisplayWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>(
    (searchParams.get('sort') as 'popular' | 'recent' | 'rating') || 'popular'
  );
  const [filterFree, setFilterFree] = useState(searchParams.get('free') === 'true');
  const [selectedWidget, setSelectedWidget] = useState<DisplayWidget | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // Handle widget purchase
  const handlePurchase = async (widget: DisplayWidget, priceType: 'one-time' | 'monthly' | 'yearly' = 'one-time') => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/marketplace?selected=${widget.id}`);
      return;
    }

    setPurchasing(true);

    try {
      if (isLocalDevMode) {
        // Mock purchase for local dev mode
        await new Promise(resolve => setTimeout(resolve, 500));
        toast.success('Widget added to your canvas!', { title: 'Purchase Complete' });
        setSelectedWidget(null);
        setPurchasing(false);
        return;
      }

      const response = await api.post<{ free?: boolean; url?: string }>(`/payments/widgets/${widget.id}/purchase`, {
        priceType,
      });

      if (response.success && response.data) {
        if (response.data.free) {
          // Free widget - already added
          toast.success('Widget added to your canvas!', { title: 'Added Successfully' });
          setSelectedWidget(null);
        } else if (response.data.url) {
          // Redirect to Stripe checkout
          toast.info('Redirecting to checkout...');
          window.location.href = response.data.url;
        }
      } else {
        toast.error(response.error?.message || 'Failed to initiate purchase');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate purchase');
    } finally {
      setPurchasing(false);
    }
  };

  // Fetch widgets
  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isLocalDevMode) {
        // Mock data for local dev mode
        await new Promise(resolve => setTimeout(resolve, 300));

        let mockWidgets: DisplayWidget[] = [
          {
            id: 'pkg-1',
            name: 'Weather Widget',
            description: 'Beautiful weather display with forecasts and animations. Shows current conditions, hourly and weekly forecasts with smooth animations.',
            shortDescription: 'Beautiful weather display with forecasts',
            category: 'utilities',
            tags: ['weather', 'forecast', 'animated'],
            version: '1.2.0',
            price: 0,
            currency: 'USD',
            rating: 4.8,
            ratingCount: 342,
            downloadCount: 12453,
            creator: {
              id: 'user-1',
              username: 'StickerNest',
              verified: true,
            },
            isOfficial: true,
            isVerified: true,
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pkg-2',
            name: 'Analytics Dashboard',
            description: 'Real-time analytics visualization with charts and graphs. Connect to your data sources and visualize metrics beautifully.',
            shortDescription: 'Real-time analytics visualization',
            category: 'data',
            tags: ['analytics', 'charts', 'dashboard'],
            version: '2.0.1',
            price: 999,
            currency: 'USD',
            rating: 4.6,
            ratingCount: 198,
            downloadCount: 8921,
            creator: {
              id: 'user-2',
              username: 'DataViz Pro',
              verified: true,
            },
            isOfficial: false,
            isVerified: true,
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pkg-3',
            name: 'Spotify Player',
            description: 'Embed and control your Spotify playback directly in your canvas. Features album art, playback controls, and queue management.',
            shortDescription: 'Embed and control your Spotify playback',
            category: 'media',
            tags: ['music', 'spotify', 'player'],
            version: '1.5.0',
            price: 0,
            currency: 'USD',
            rating: 4.9,
            ratingCount: 521,
            downloadCount: 15632,
            creator: {
              id: 'user-3',
              username: 'MusicMaker',
              verified: true,
            },
            isOfficial: false,
            isVerified: true,
            createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pkg-4',
            name: 'AI Image Generator',
            description: 'Generate images using AI directly in your canvas. Powered by state-of-the-art diffusion models with style presets.',
            shortDescription: 'Generate images using AI',
            category: 'ai',
            tags: ['ai', 'image', 'generation', 'stable-diffusion'],
            version: '1.0.0',
            price: 499,
            currency: 'USD',
            rating: 4.7,
            ratingCount: 89,
            downloadCount: 5234,
            creator: {
              id: 'user-1',
              username: 'StickerNest',
              verified: true,
            },
            isOfficial: true,
            isVerified: true,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pkg-5',
            name: 'Todo List',
            description: 'Simple and elegant todo list with persistence. Features subtasks, due dates, and categories.',
            shortDescription: 'Simple and elegant todo list',
            category: 'productivity',
            tags: ['todo', 'tasks', 'productivity'],
            version: '2.1.0',
            price: 0,
            currency: 'USD',
            rating: 4.5,
            ratingCount: 678,
            downloadCount: 23451,
            creator: {
              id: 'user-4',
              username: 'ProductivityPro',
              verified: true,
            },
            isOfficial: false,
            isVerified: true,
            createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'pkg-6',
            name: 'Live Chat',
            description: 'Real-time chat widget for collaboration. Supports channels, direct messages, and file sharing.',
            shortDescription: 'Real-time chat widget',
            category: 'social',
            tags: ['chat', 'messaging', 'collaboration'],
            version: '1.3.2',
            price: 799,
            currency: 'USD',
            rating: 4.4,
            ratingCount: 156,
            downloadCount: 6789,
            creator: {
              id: 'user-5',
              username: 'ChatMaster',
              verified: false,
            },
            isOfficial: false,
            isVerified: false,
            createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];

        // Apply filters client-side for mock data
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          mockWidgets = mockWidgets.filter(w =>
            w.name.toLowerCase().includes(query) ||
            w.description.toLowerCase().includes(query) ||
            w.tags.some(t => t.toLowerCase().includes(query))
          );
        }

        if (activeCategory !== 'all') {
          mockWidgets = mockWidgets.filter(w => w.category === activeCategory);
        }

        if (filterFree) {
          mockWidgets = mockWidgets.filter(w => w.price === 0);
        }

        // Sort
        switch (sortBy) {
          case 'popular':
            mockWidgets.sort((a, b) => b.downloadCount - a.downloadCount);
            break;
          case 'recent':
            mockWidgets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            break;
          case 'rating':
            mockWidgets.sort((a, b) => b.rating - a.rating);
            break;
        }

        setWidgets(mockWidgets);
        setTotalCount(mockWidgets.length);
        setLoading(false);
        return;
      }

      // Build query parameters
      const response = await marketplaceApi.list({
        search: searchQuery || undefined,
        category: activeCategory !== 'all' ? activeCategory : undefined,
        sortBy,
        maxPrice: filterFree ? 0 : undefined,
      });

      if (response.success && response.data) {
        // Map API response to display format
        const displayWidgets: DisplayWidget[] = response.data.items.map(widget => ({
          ...widget,
          isOfficial: widget.creator.username === 'StickerNest',
          isVerified: widget.creator.verified || false,
        }));
        setWidgets(displayWidgets);
        setTotalCount(response.data.total);
      } else {
        setError(response.error?.message || 'Failed to load marketplace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeCategory, sortBy, filterFree, isLocalDevMode]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeCategory !== 'all') params.set('category', activeCategory);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    if (filterFree) params.set('free', 'true');
    setSearchParams(params, { replace: true });
  }, [searchQuery, activeCategory, sortBy, filterFree, setSearchParams]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#fbbf24' : '#4b5563' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/" style={styles.logoLink}>
            <div style={styles.logoIcon}>
              <SNIcon name="sticker" size="lg" />
            </div>
            <span style={styles.logoText}>StickerNest</span>
          </Link>
          <span style={styles.headerDivider}>/</span>
          <span style={styles.headerTitle}>Marketplace</span>
        </div>

        <div style={styles.headerRight}>
          {isAuthenticated ? (
            <>
              <Link to="/gallery" style={styles.navLink}>
                Gallery
              </Link>
              <div style={styles.avatar}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" style={styles.avatarImg} />
                ) : (
                  <SNIcon name="user" size="sm" />
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.navLink}>Sign in</Link>
              <SNButton variant="primary" onClick={() => navigate('/signup')}>
                Get Started
              </SNButton>
            </>
          )}
        </div>
      </header>

      <div style={styles.content}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.searchContainer}>
            <SNIcon name="search" size="sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search widgets..."
              style={styles.searchInput}
            />
          </div>

          <nav style={styles.categories}>
            <h3 style={styles.sidebarTitle}>Categories</h3>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  ...styles.categoryButton,
                  ...(activeCategory === cat.id ? styles.categoryButtonActive : {}),
                }}
              >
                <SNIcon name={cat.icon as any} size="sm" />
                <span>{cat.name}</span>
              </button>
            ))}
          </nav>

          <div style={styles.filters}>
            <h3 style={styles.sidebarTitle}>Filters</h3>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filterFree}
                onChange={(e) => setFilterFree(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Free only</span>
            </label>
          </div>
        </aside>

        {/* Main content */}
        <main style={styles.main}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.resultCount}>
              {loading ? 'Loading...' : `${totalCount} widgets`}
            </div>
            <div style={styles.sortContainer}>
              <span style={styles.sortLabel}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={styles.sortSelect}
              >
                <option value="popular">Most Popular</option>
                <option value="recent">Recently Updated</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div style={styles.error}>
              <SNIcon name="warning" size="sm" />
              <span>{error}</span>
              <SNButton variant="ghost" size="sm" onClick={() => { setError(null); fetchWidgets(); }}>
                Retry
              </SNButton>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div style={styles.loadingGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} style={styles.skeletonCard}>
                  <div style={styles.skeletonImage} />
                  <div style={styles.skeletonTitle} />
                  <div style={styles.skeletonText} />
                </div>
              ))}
            </div>
          ) : widgets.length === 0 ? (
            <div style={styles.emptyState}>
              <SNIcon name="search" size="xl" />
              <h3 style={styles.emptyTitle}>No widgets found</h3>
              <p style={styles.emptyText}>
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div style={styles.grid}>
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  style={styles.card}
                  onClick={() => navigate(`/marketplace/${widget.id}`)}
                >
                  <div style={styles.cardPreview}>
                    {widget.thumbnail ? (
                      <img src={widget.thumbnail} alt="" style={styles.previewImg} />
                    ) : (
                      <div style={styles.previewPlaceholder}>
                        <SNIcon name="widget" size="xl" />
                      </div>
                    )}
                    {widget.isOfficial && (
                      <div style={styles.officialBadge}>
                        <SNIcon name="check" size="xs" />
                        Official
                      </div>
                    )}
                    {widget.isVerified && !widget.isOfficial && (
                      <div style={styles.verifiedBadge}>
                        <SNIcon name="check" size="xs" />
                      </div>
                    )}
                  </div>

                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{widget.name}</h3>
                    <p style={styles.cardDescription}>
                      {widget.shortDescription || widget.description}
                    </p>

                    <div style={styles.cardMeta}>
                      <div style={styles.authorInfo}>
                        <div style={styles.authorAvatar}>
                          {widget.creator.avatarUrl ? (
                            <img src={widget.creator.avatarUrl} alt="" />
                          ) : (
                            <SNIcon name="user" size="xs" />
                          )}
                        </div>
                        <span style={styles.authorName}>{widget.creator.username}</span>
                      </div>
                      <div style={styles.stats}>
                        <span style={styles.rating}>
                          {renderStars(Math.round(widget.rating))}
                          <span style={styles.ratingCount}>({widget.ratingCount})</span>
                        </span>
                        <span style={styles.installs}>
                          <SNIcon name="download" size="xs" />
                          {formatNumber(widget.downloadCount)}
                        </span>
                      </div>
                    </div>

                    <div style={styles.cardFooter}>
                      <div style={styles.tags}>
                        {widget.tags.slice(0, 3).map((tag) => (
                          <span key={tag} style={styles.tag}>{tag}</span>
                        ))}
                      </div>
                      <div style={styles.price}>
                        {widget.price === 0 ? (
                          <span style={styles.freeLabel}>Free</span>
                        ) : (
                          <span style={styles.priceLabel}>{formatPrice(widget.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Widget detail modal */}
      {selectedWidget && (
        <div style={styles.modalOverlay} onClick={() => setSelectedWidget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <SNIconButton
              icon="close"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedWidget(null)}
              style={{ position: 'absolute', top: 16, right: 16 }}
            />

            <div style={styles.modalHeader}>
              <div style={styles.modalPreview}>
                {selectedWidget.thumbnail ? (
                  <img src={selectedWidget.thumbnail} alt="" />
                ) : (
                  <SNIcon name="widget" size="xl" />
                )}
              </div>
              <div style={styles.modalInfo}>
                <h2 style={styles.modalTitle}>{selectedWidget.name}</h2>
                <p style={styles.modalAuthor}>by {selectedWidget.creator.username}</p>
                <div style={styles.modalRating}>
                  {renderStars(Math.round(selectedWidget.rating))}
                  <span>{selectedWidget.rating.toFixed(1)}</span>
                  <span style={styles.ratingCount}>({selectedWidget.ratingCount} reviews)</span>
                </div>
              </div>
            </div>

            <p style={styles.modalDescription}>{selectedWidget.description}</p>

            <div style={styles.modalStats}>
              <div style={styles.modalStat}>
                <SNIcon name="download" size="sm" />
                <span>{formatNumber(selectedWidget.downloadCount)} installs</span>
              </div>
              <div style={styles.modalStat}>
                <SNIcon name="tag" size="sm" />
                <span>v{selectedWidget.version}</span>
              </div>
            </div>

            <div style={styles.modalTags}>
              {selectedWidget.tags.map((tag) => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>

            <div style={styles.modalActions}>
              {selectedWidget.price === 0 ? (
                <SNButton
                  variant="primary"
                  size="lg"
                  style={{ flex: 1 }}
                  onClick={() => handlePurchase(selectedWidget)}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    'Adding...'
                  ) : (
                    <>
                      <SNIcon name="plus" size="sm" />
                      Add to Canvas
                    </>
                  )}
                </SNButton>
              ) : (
                <SNButton
                  variant="primary"
                  size="lg"
                  style={{ flex: 1 }}
                  onClick={() => handlePurchase(selectedWidget, 'one-time')}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    'Processing...'
                  ) : (
                    <>
                      <SNIcon name="cart" size="sm" />
                      Purchase for {formatPrice(selectedWidget.price)}
                    </>
                  )}
                </SNButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 100%)',
    display: 'flex',
    flexDirection: 'column',
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
    gap: 12,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
  },
  logoIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  headerDivider: {
    color: '#4b5563',
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#94a3b8',
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: 14,
    padding: '8px 12px',
    borderRadius: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  content: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: 260,
    padding: 20,
    borderRight: '1px solid rgba(139, 92, 246, 0.1)',
    background: 'rgba(15, 15, 25, 0.4)',
    flexShrink: 0,
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px',
  },
  categories: {
    marginBottom: 24,
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  categoryButtonActive: {
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#a78bfa',
  },
  filters: {
    paddingTop: 16,
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#8b5cf6',
  },
  main: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  resultCount: {
    color: '#94a3b8',
    fontSize: 14,
  },
  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  sortSelect: {
    padding: '8px 12px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    color: '#f87171',
    marginBottom: 24,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  skeletonCard: {
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    padding: 16,
    animation: 'pulse 1.5s infinite',
  },
  skeletonImage: {
    height: 160,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonText: {
    height: 14,
    width: '80%',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 4,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '16px 0 8px',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    background: 'rgba(30, 30, 46, 0.6)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.1)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cardPreview: {
    position: 'relative',
    height: 160,
    background: 'rgba(139, 92, 246, 0.05)',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
  },
  officialBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(34, 197, 94, 0.9)',
    borderRadius: 6,
    color: '#fff',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 8px',
  },
  cardDescription: {
    fontSize: 13,
    color: '#94a3b8',
    margin: '0 0 12px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  authorName: {
    fontSize: 12,
    color: '#64748b',
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
  },
  ratingCount: {
    color: '#64748b',
    fontSize: 11,
  },
  installs: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: '#64748b',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
  },
  tags: {
    display: 'flex',
    gap: 6,
  },
  tag: {
    padding: '4px 8px',
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 4,
    fontSize: 11,
    color: '#a78bfa',
  },
  price: {
    fontSize: 14,
    fontWeight: 600,
  },
  freeLabel: {
    color: '#4ade80',
  },
  priceLabel: {
    color: '#f1f5f9',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: 500,
    background: 'rgba(30, 30, 46, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    padding: 24,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    gap: 16,
    marginBottom: 20,
  },
  modalPreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  modalInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: 0,
  },
  modalAuthor: {
    fontSize: 14,
    color: '#94a3b8',
    margin: '4px 0 8px',
  },
  modalRating: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    color: '#f1f5f9',
  },
  modalDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  modalStats: {
    display: 'flex',
    gap: 20,
    marginBottom: 16,
  },
  modalStat: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#64748b',
  },
  modalTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalActions: {
    display: 'flex',
    gap: 12,
  },
  purchaseError: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    color: '#f87171',
    fontSize: 14,
  },
};

export default MarketplacePage;
