/**
 * ExplorePage
 * Public canvas discovery page at /explore
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { AppNavbar } from '../components/AppNavbar';
import { useExploreStore, type SortOption, type ViewMode } from '../state/useExploreStore';
import { CanvasCard, CanvasGrid, ShareModal } from '../components/public';
import type { CanvasPreview } from '../types/profile';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    canvases,
    featuredCanvases,
    categories,
    popularTags,
    filters,
    viewMode,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    searchResults,
    isSearching,
    fetchCanvases,
    fetchFeatured,
    loadMore,
    setCategory,
    setTags,
    setSortBy,
    clearFilters,
    setSearchQuery,
    search,
    clearSearch,
    setViewMode,
  } = useExploreStore();

  const [showFilters, setShowFilters] = useState(false);
  const [likedCanvases, setLikedCanvases] = useState<Set<string>>(new Set());
  const [shareCanvas, setShareCanvas] = useState<CanvasPreview | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    fetchCanvases();
    fetchFeatured();
    document.title = 'Explore Canvases | StickerNest';
    return () => {
      document.title = 'StickerNest';
    };
  }, [fetchCanvases, fetchFeatured]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        search(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleLike = useCallback((canvasId: string) => {
    setLikedCanvases((prev) => {
      const next = new Set(prev);
      if (next.has(canvasId)) {
        next.delete(canvasId);
      } else {
        next.add(canvasId);
      }
      return next;
    });
  }, []);

  const handleShare = useCallback((canvas: CanvasPreview) => {
    setShareCanvas(canvas);
  }, []);

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    if (currentTags.includes(tag)) {
      setTags(currentTags.filter(t => t !== tag));
    } else {
      setTags([...currentTags, tag]);
    }
  };

  const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: 'trending', label: 'Trending', icon: 'zap' },
    { value: 'newest', label: 'Newest', icon: 'clock' },
    { value: 'popular', label: 'Most Liked', icon: 'heart' },
    { value: 'mostViewed', label: 'Most Viewed', icon: 'eye' },
  ];

  const displayCanvases = searchQuery.trim() ? searchResults : canvases;
  const hasActiveFilters = filters.category || (filters.tags && filters.tags.length > 0);

  return (
    <div style={styles.page}>
      {/* Navigation */}
      <AppNavbar />

      {/* Page Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>
              <SNIcon name="compass" size={28} color="#8b5cf6" />
              Explore
            </h1>
            <p style={styles.subtitle}>
              Discover amazing canvases created by the community
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <div style={styles.searchBar}>
            <SNIcon name="search" size={18} color="#64748b" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search canvases, creators, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                style={styles.clearSearch}
                onClick={() => {
                  clearSearch();
                  searchInputRef.current?.focus();
                }}
              >
                <SNIcon name="x" size={14} />
              </button>
            )}
            {isSearching && (
              <div style={styles.searchSpinner} />
            )}
          </div>
        </div>
      </header>

      <div style={styles.mainContent}>
        {/* Sidebar Filters */}
        <aside style={styles.sidebar}>
          {/* Categories */}
          <div style={styles.filterSection}>
            <h3 style={styles.filterTitle}>Categories</h3>
            <div style={styles.categoryList}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  style={{
                    ...styles.categoryButton,
                    ...(filters.category === category.id || (!filters.category && category.id === 'all')
                      ? styles.categoryButtonActive
                      : {}),
                  }}
                  onClick={() => setCategory(category.id === 'all' ? undefined : category.id)}
                >
                  <SNIcon name={category.icon as any} size={16} />
                  <span style={styles.categoryName}>{category.name}</span>
                  <span style={styles.categoryCount}>{category.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tags */}
          <div style={styles.filterSection}>
            <h3 style={styles.filterTitle}>Popular Tags</h3>
            <div style={styles.tagList}>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  style={{
                    ...styles.tagButton,
                    ...(filters.tags?.includes(tag) ? styles.tagButtonActive : {}),
                  }}
                  onClick={() => handleTagToggle(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button style={styles.clearFilters} onClick={clearFilters}>
              <SNIcon name="x" size={14} />
              Clear Filters
            </button>
          )}
        </aside>

        {/* Main Content Area */}
        <main style={styles.content}>
          {/* Featured Section (only show when no search/filters) */}
          {!searchQuery && !hasActiveFilters && featuredCanvases.length > 0 && (
            <section style={styles.featuredSection}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  <SNIcon name="star" size={20} color="#f59e0b" />
                  Featured
                </h2>
              </div>
              <div style={styles.featuredGrid}>
                {featuredCanvases.map((canvas) => (
                  <CanvasCard
                    key={canvas.id}
                    canvas={canvas}
                    variant="grid"
                    showAuthor
                    showStats
                    showActions
                    onLike={handleLike}
                    onShare={handleShare}
                    isLiked={likedCanvases.has(canvas.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              {searchQuery ? (
                <span style={styles.resultCount}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </span>
              ) : (
                <span style={styles.resultCount}>
                  {hasActiveFilters ? `Filtered results` : 'All Canvases'}
                </span>
              )}
            </div>

            <div style={styles.toolbarRight}>
              {/* Sort Dropdown */}
              <div style={styles.sortContainer}>
                <label style={styles.sortLabel}>Sort by:</label>
                <select
                  style={styles.sortSelect}
                  value={filters.sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle */}
              <div style={styles.viewToggle}>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
                  }}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <SNIcon name="grid" size={16} />
                </button>
                <button
                  style={{
                    ...styles.viewButton,
                    ...(viewMode === 'list' ? styles.viewButtonActive : {}),
                  }}
                  onClick={() => setViewMode('list')}
                  title="List view"
                >
                  <SNIcon name="list" size={16} />
                </button>
              </div>

              {/* Mobile Filter Toggle */}
              <button
                style={styles.mobileFilterToggle}
                onClick={() => setShowFilters(!showFilters)}
              >
                <SNIcon name="filter" size={16} />
                Filters
              </button>
            </div>
          </div>

          {/* Canvas Grid */}
          <CanvasGrid
            canvases={displayCanvases}
            viewMode={viewMode}
            showAuthor
            isLoading={isLoading}
            hasMore={hasMore && !searchQuery}
            onLoadMore={loadMore}
            onLike={handleLike}
            likedIds={likedCanvases}
            emptyMessage={
              searchQuery
                ? `No canvases found for "${searchQuery}"`
                : hasActiveFilters
                ? 'No canvases match your filters'
                : 'No canvases yet'
            }
            emptyIcon={searchQuery ? 'search' : 'layout'}
            columns={viewMode === 'grid' ? 3 : 1}
          />

          {/* Infinite Scroll Trigger */}
          {hasMore && !searchQuery && (
            <div ref={loadMoreRef} style={styles.loadMoreTrigger}>
              {isLoadingMore && (
                <div style={styles.loadingMore}>
                  <div style={styles.spinner} />
                  <span>Loading more...</span>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Share Modal */}
      {shareCanvas && (
        <ShareModal
          isOpen={!!shareCanvas}
          onClose={() => setShareCanvas(null)}
          type="canvas"
          data={{
            url: `${window.location.origin}/c/${shareCanvas.slug || shareCanvas.id}`,
            title: `${shareCanvas.name} | StickerNest`,
            description: shareCanvas.description,
            image: shareCanvas.thumbnailUrl,
          }}
          embedCode={`<iframe src="${window.location.origin}/embed/${shareCanvas.slug || shareCanvas.id}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 100%)',
  },

  // Header
  header: {
    padding: '40px 40px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    maxWidth: 1400,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {},
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 32,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    margin: 0,
  },

  // Search
  searchContainer: {
    maxWidth: 600,
    margin: '0 auto',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 15,
  },
  clearSearch: {
    width: 24,
    height: 24,
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  searchSpinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Main Layout
  mainContent: {
    display: 'flex',
    maxWidth: 1400,
    margin: '0 auto',
    padding: '32px 40px',
    gap: 32,
  },

  // Sidebar
  sidebar: {
    width: 240,
    flexShrink: 0,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  categoryButtonActive: {
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#a78bfa',
  },
  categoryName: {
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: '#64748b',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tagButtonActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    color: '#a78bfa',
  },
  clearFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Content
  content: {
    flex: 1,
    minWidth: 0,
  },

  // Featured Section
  featuredSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    padding: '12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  toolbarLeft: {},
  resultCount: {
    fontSize: 14,
    color: '#64748b',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  sortContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  sortSelect: {
    padding: '8px 12px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
  },
  viewToggle: {
    display: 'flex',
    background: 'rgba(15, 15, 25, 0.8)',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  viewButtonActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    color: '#a78bfa',
  },
  mobileFilterToggle: {
    display: 'none', // Show only on mobile via media query
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 13,
    cursor: 'pointer',
  },

  // Load More
  loadMoreTrigger: {
    padding: '40px 0',
    display: 'flex',
    justifyContent: 'center',
  },
  loadingMore: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default ExplorePage;
