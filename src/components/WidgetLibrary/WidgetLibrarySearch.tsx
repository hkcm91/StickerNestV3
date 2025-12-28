/**
 * StickerNest v2 - Widget Library Search
 * Unified search bar with debouncing
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useLibraryStore } from '../../state/useLibraryStore';
import { Search, X } from 'lucide-react';

interface Props {
  placeholder?: string;
}

export const WidgetLibrarySearch: React.FC<Props> = ({
  placeholder = 'Search widgets, stickers, tags...',
}) => {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);
  const clearSearch = useLibraryStore((s) => s.clearSearch);
  const activeTab = useLibraryStore((s) => s.activeTab);

  const [localValue, setLocalValue] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localValue);
    }, 200);
    return () => clearTimeout(timer);
  }, [localValue, setSearchQuery]);

  // Sync local value when store changes externally
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    clearSearch();
  }, [clearSearch]);

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'widgets':
        return 'Search widgets by name, tag, or description...';
      case 'stickers':
        return 'Search stickers by name, pack, or tag...';
      case 'upload':
        return 'Search uploads...';
      default:
        return placeholder;
    }
  };

  return (
    <>
      <style>{`
        .library-search {
          position: relative;
          margin-bottom: 12px;
        }

        .library-search-input {
          width: 100%;
          padding: 10px 36px 10px 36px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }

        .library-search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .library-search-input:focus {
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .library-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
        }

        .library-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .library-search-input:not(:placeholder-shown) ~ .library-search-clear {
          opacity: 1;
        }

        .library-search-clear:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
      `}</style>

      <div className="library-search">
        <Search className="library-search-icon" size={16} />
        <input
          type="text"
          className="library-search-input"
          placeholder={getPlaceholder()}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClear();
          }}
        />
        {localValue && (
          <button className="library-search-clear" onClick={handleClear}>
            <X size={14} />
          </button>
        )}
      </div>
    </>
  );
};

export default WidgetLibrarySearch;
