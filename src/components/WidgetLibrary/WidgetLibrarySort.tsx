/**
 * StickerNest v2 - Widget Library Sort
 * Sort dropdown menu
 */

import React, { useState, useRef, useCallback } from 'react';
import { useLibraryStore, SortMode } from '../../state/useLibraryStore';
import { getSortModeDisplayName } from '../../utils/libraryUtils';
import { useClickOutside } from '../../hooks/useClickOutside';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';

const SORT_OPTIONS: SortMode[] = [
  'newest',
  'oldest',
  'alpha-asc',
  'alpha-desc',
  'most-used',
  'least-used',
  'by-type',
  'by-pipeline',
  'recently-updated',
];

export const WidgetLibrarySort: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTab = useLibraryStore((s) => s.activeTab);
  const widgetSortMode = useLibraryStore((s) => s.widgetSortMode);
  const stickerSortMode = useLibraryStore((s) => s.stickerSortMode);
  const setWidgetSortMode = useLibraryStore((s) => s.setWidgetSortMode);
  const setStickerSortMode = useLibraryStore((s) => s.setStickerSortMode);

  const currentSort = activeTab === 'widgets' ? widgetSortMode : stickerSortMode;
  const setSort = activeTab === 'widgets' ? setWidgetSortMode : setStickerSortMode;

  // Available options differ by tab
  const availableOptions = activeTab === 'stickers'
    ? SORT_OPTIONS.filter((o) => !['by-pipeline', 'most-used', 'least-used'].includes(o))
    : SORT_OPTIONS;

  // Close menu on outside click using shared hook
  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(menuRef, handleClose);

  if (activeTab === 'upload') return null;

  return (
    <>
      <style>{`
        .library-sort {
          position: relative;
        }

        .library-sort-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .library-sort-trigger:hover {
          background: rgba(0, 0, 0, 0.3);
          border-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .library-sort-trigger.open {
          background: rgba(102, 126, 234, 0.2);
          border-color: rgba(102, 126, 234, 0.4);
          color: white;
        }

        .library-sort-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 180px;
          background: #1e1e2e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 100;
          overflow: hidden;
        }

        .library-sort-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .library-sort-option:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .library-sort-option.selected {
          background: rgba(102, 126, 234, 0.15);
          color: #667eea;
        }

        .library-sort-check {
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .library-sort-option.selected .library-sort-check {
          opacity: 1;
        }
      `}</style>

      <div className="library-sort" ref={menuRef}>
        <button
          className={`library-sort-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ArrowUpDown size={14} />
          <span>{getSortModeDisplayName(currentSort)}</span>
          <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {isOpen && (
          <div className="library-sort-menu">
            {availableOptions.map((option) => (
              <button
                key={option}
                className={`library-sort-option ${currentSort === option ? 'selected' : ''}`}
                onClick={() => {
                  setSort(option);
                  setIsOpen(false);
                }}
              >
                <span>{getSortModeDisplayName(option)}</span>
                <Check size={14} className="library-sort-check" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default WidgetLibrarySort;
