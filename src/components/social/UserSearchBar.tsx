/**
 * StickerNest v2 - User Search Bar
 * Search for users with autocomplete
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SNIcon } from '../../shared-ui/SNIcon';
import { searchApi } from '../../services/apiClient';

interface UserResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isCreator?: boolean;
}

interface UserSearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Callback when user selected */
  onUserSelect?: (user: UserResult) => void;
}

export const UserSearchBar: React.FC<UserSearchBarProps> = ({
  placeholder = 'Search users...',
  autoFocus = false,
  onUserSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search users with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchApi.searchUsers(query, 1, 10);
        if (response.success && response.data) {
          setResults(response.data.items);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Failed to search users:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserClick = useCallback((user: UserResult) => {
    if (onUserSelect) {
      onUserSelect(user);
    } else {
      navigate(`/u/${user.username}`);
    }
    setQuery('');
    setShowResults(false);
  }, [onUserSelect, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleUserClick(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  }, [results, selectedIndex, handleUserClick]);

  return (
    <div style={styles.container}>
      <div style={styles.inputContainer}>
        <SNIcon name="search" size="sm" color="#64748b" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={styles.input}
        />
        {loading && (
          <div style={styles.spinner} />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div ref={resultsRef} style={styles.results}>
          {results.map((user, index) => (
            <button
              key={user.id}
              style={{
                ...styles.resultItem,
                ...(index === selectedIndex ? styles.resultItemActive : {}),
              }}
              onClick={() => handleUserClick(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div style={styles.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} style={styles.avatarImg} />
                ) : (
                  <span style={styles.avatarText}>
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div style={styles.userInfo}>
                <div style={styles.userNameRow}>
                  <span style={styles.displayName}>
                    {user.displayName || user.username}
                  </span>
                  {user.isVerified && (
                    <SNIcon name="check" size={12} color="#8b5cf6" />
                  )}
                  {user.isCreator && (
                    <span style={styles.creatorBadge}>Creator</span>
                  )}
                </div>
                <span style={styles.username}>@{user.username}</span>
              </div>

              <SNIcon name="chevronRight" size="sm" color="#64748b" />
            </button>
          ))}
        </div>
      )}

      {showResults && query.trim() && results.length === 0 && !loading && (
        <div ref={resultsRef} style={styles.results}>
          <div style={styles.emptyState}>
            <SNIcon name="userX" size={24} color="#64748b" />
            <span>No users found</span>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    transition: 'all 0.15s',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  results: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    maxHeight: 400,
    background: 'rgba(30, 30, 46, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    overflow: 'auto',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 12,
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  resultItemActive: {
    background: 'rgba(139, 92, 246, 0.1)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  displayName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  username: {
    fontSize: 12,
    color: '#64748b',
  },
  creatorBadge: {
    padding: '2px 6px',
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    color: '#a78bfa',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
    color: '#64748b',
    fontSize: 14,
  },
};

// Add keyframe animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('[data-user-search-styles]')) {
  styleSheet.setAttribute('data-user-search-styles', '');
  document.head.appendChild(styleSheet);
}

export default UserSearchBar;
