/**
 * StickerNest v2 - Global Search Component
 *
 * Command palette style search with keyboard navigation
 * Searches across canvases, users, and widgets
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { searchApi, Canvas, ExtendedUserProfile, MarketplaceWidget } from '../../services/apiClient';

// =============================================================================
// Types
// =============================================================================

type SearchResultType = 'canvas' | 'user' | 'widget';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  url: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'canvases' | 'users' | 'widgets'>('all');

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchApi.search({
          q: query,
          type: activeTab,
          pageSize: 10,
        });

        if (response.success && response.data) {
          const allResults: SearchResult[] = [];

          // Add canvases
          if (activeTab === 'all' || activeTab === 'canvases') {
            response.data.canvases.items.forEach((canvas: Canvas) => {
              allResults.push({
                id: canvas.id,
                type: 'canvas',
                title: canvas.name,
                subtitle: canvas.owner ? `by @${canvas.owner.username}` : undefined,
                thumbnail: canvas.thumbnail,
                url: `/c/${canvas.slug || canvas.id}`,
              });
            });
          }

          // Add users
          if (activeTab === 'all' || activeTab === 'users') {
            response.data.users.items.forEach((user: ExtendedUserProfile) => {
              allResults.push({
                id: user.id,
                type: 'user',
                title: user.displayName || user.username,
                subtitle: `@${user.username}`,
                thumbnail: user.avatarUrl,
                url: `/profile/${user.username}`,
              });
            });
          }

          // Add widgets
          if (activeTab === 'all' || activeTab === 'widgets') {
            response.data.widgets.items.forEach((widget: MarketplaceWidget) => {
              allResults.push({
                id: widget.id,
                type: 'widget',
                title: widget.name,
                subtitle: widget.shortDescription || widget.category,
                thumbnail: widget.thumbnail,
                url: `/marketplace/${widget.id}`,
              });
            });
          }

          setResults(allResults);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].url);
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [results, selectedIndex, navigate, onClose]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onClose();
  };

  // Get icon for result type
  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'canvas': return 'layout';
      case 'user': return 'user';
      case 'widget': return 'box';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Search Modal */}
      <div style={styles.modal}>
        {/* Search Input */}
        <div style={styles.inputWrapper}>
          <SNIcon name="search" size={20} color="#64748b" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search canvases, users, widgets..."
            style={styles.input}
          />
          {loading && (
            <div style={styles.spinner} />
          )}
          <div style={styles.shortcut}>ESC</div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['all', 'canvases', 'users', 'widgets'] as const).map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Results */}
        <div style={styles.results}>
          {query && results.length === 0 && !loading && (
            <div style={styles.emptyState}>
              <SNIcon name="search" size={32} color="#64748b" />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {!query && (
            <div style={styles.emptyState}>
              <SNIcon name="search" size={32} color="#64748b" />
              <p>Start typing to search...</p>
              <div style={styles.hints}>
                <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
                <span><kbd>Enter</kbd> Select</span>
                <span><kbd>Esc</kbd> Close</span>
              </div>
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              style={{
                ...styles.resultItem,
                ...(index === selectedIndex ? styles.resultItemSelected : {}),
              }}
              onClick={() => handleResultClick(result)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div style={styles.resultIcon}>
                {result.thumbnail ? (
                  <img src={result.thumbnail} alt="" style={styles.resultThumbnail} />
                ) : (
                  <SNIcon name={getTypeIcon(result.type)} size={20} color="#8b5cf6" />
                )}
              </div>
              <div style={styles.resultInfo}>
                <span style={styles.resultTitle}>{result.title}</span>
                {result.subtitle && (
                  <span style={styles.resultSubtitle}>{result.subtitle}</span>
                )}
              </div>
              <div style={styles.resultType}>
                {result.type}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerHint}>
            <kbd>⌘</kbd><kbd>K</kbd> to open search
          </span>
        </div>
      </div>
    </>
  );
};

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 9998,
  },
  modal: {
    position: 'fixed',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 640,
    background: '#1a1a2e',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    zIndex: 9999,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    color: '#f1f5f9',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  shortcut: {
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    fontSize: 12,
    color: '#64748b',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tab: {
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    color: '#8b5cf6',
  },
  results: {
    maxHeight: 400,
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    gap: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  hints: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    fontSize: 12,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  resultItemSelected: {
    background: 'rgba(139, 92, 246, 0.1)',
  },
  resultIcon: {
    width: 40,
    height: 40,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  resultInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#64748b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultType: {
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    fontSize: 11,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  footerHint: {
    fontSize: 12,
    color: '#64748b',
  },
};

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default GlobalSearch;
