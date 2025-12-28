/**
 * StickerNest v2 - Shared Widget Browser
 * Browse and search public widgets from other users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { sharedWidgetsClient, type SharedWidget, type SearchParams } from '../../services/sharedWidgetsClient';
import type { RuntimeContext } from '../../runtime/RuntimeContext';

export interface SharedWidgetBrowserProps {
  runtime: RuntimeContext;
  onWidgetSelect: (widget: SharedWidget) => void;
  onWidgetImport: (widget: SharedWidget) => void;
}

type ViewMode = 'popular' | 'recent' | 'search';
type SortBy = 'created_at' | 'downloads' | 'likes';

export const SharedWidgetBrowser: React.FC<SharedWidgetBrowserProps> = ({
  runtime: _runtime,
  onWidgetSelect,
  onWidgetImport,
}) => {
  const [widgets, setWidgets] = useState<SharedWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('downloads');
  const [selectedWidget, setSelectedWidget] = useState<SharedWidget | null>(null);

  // Popular tags (would be fetched from API in production)
  const popularTags = [
    'display', 'input', 'chart', 'form', 'media', 
    'utility', 'game', 'social', 'data', 'animation'
  ];

  // Load widgets based on view mode
  const loadWidgets = useCallback(async () => {
    setLoading(true);
    try {
      let results: SharedWidget[] = [];
      
      switch (viewMode) {
        case 'popular':
          results = await sharedWidgetsClient.getPopularWidgets(20);
          break;
        case 'recent':
          results = await sharedWidgetsClient.getRecentWidgets(20);
          break;
        case 'search':
          const params: SearchParams = {
            query: searchQuery || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            orderBy: sortBy,
            orderDirection: 'desc',
            limit: 30,
          };
          results = await sharedWidgetsClient.searchWidgets(params);
          break;
      }
      
      setWidgets(results);
    } catch (error) {
      console.error('Failed to load widgets:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, searchQuery, selectedTags, sortBy]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setViewMode('search');
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
    setViewMode('search');
  };

  // Handle widget selection
  const handleWidgetClick = (widget: SharedWidget) => {
    setSelectedWidget(widget);
    onWidgetSelect(widget);
  };

  // Handle import
  const handleImport = async (widget: SharedWidget) => {
    await sharedWidgetsClient.incrementDownloads(widget.id);
    onWidgetImport(widget);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 8,
      }}>
        <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem' }}>
          🌐 Community Widgets
        </h4>
        <button
          onClick={loadWidgets}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 4,
            padding: '4px 8px',
            color: '#e2e8f0',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search widgets..."
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#e2e8f0',
            fontSize: '0.85rem',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 12px',
            background: '#8b5cf6',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🔍
        </button>
      </form>

      {/* View Mode Tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['popular', 'recent', 'search'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              flex: 1,
              padding: '6px',
              background: viewMode === mode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
              border: viewMode === mode ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
              borderRadius: 4,
              color: viewMode === mode ? '#e2e8f0' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.75rem',
              textTransform: 'capitalize',
            }}
          >
            {mode === 'popular' ? '🔥 Popular' : mode === 'recent' ? '🕐 Recent' : '🔍 Search'}
          </button>
        ))}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {popularTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            style={{
              padding: '3px 8px',
              background: selectedTags.includes(tag) 
                ? 'rgba(139, 92, 246, 0.3)' 
                : 'rgba(255,255,255,0.05)',
              border: selectedTags.includes(tag)
                ? '1px solid rgba(139, 92, 246, 0.5)'
                : '1px solid transparent',
              borderRadius: 12,
              color: selectedTags.includes(tag) ? '#e2e8f0' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.7rem',
            }}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Sort Options (for search mode) */}
      {viewMode === 'search' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            style={{
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: '#e2e8f0',
              fontSize: '0.75rem',
            }}
          >
            <option value="downloads">Downloads</option>
            <option value="likes">Likes</option>
            <option value="created_at">Date</option>
          </select>
        </div>
      )}

      {/* Widget List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: 20,
            color: '#64748b',
          }}>
            Loading widgets...
          </div>
        ) : widgets.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            padding: 20,
            color: '#64748b',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '2rem', marginBottom: 8 }}>📭</span>
            <span style={{ fontSize: '0.85rem' }}>No widgets found</span>
            {viewMode === 'search' && (
              <span style={{ fontSize: '0.75rem', marginTop: 4 }}>
                Try different search terms or tags
              </span>
            )}
          </div>
        ) : (
          widgets.map(widget => (
            <div
              key={widget.id}
              onClick={() => handleWidgetClick(widget)}
              style={{
                padding: 12,
                background: selectedWidget?.id === widget.id 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                cursor: 'pointer',
                border: selectedWidget?.id === widget.id
                  ? '1px solid rgba(139, 92, 246, 0.4)'
                  : '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
                  {widget.manifest?.name || widget.widget_id}
                </span>
                <span style={{ 
                  fontSize: '0.65rem', 
                  padding: '2px 6px', 
                  background: 'rgba(139, 92, 246, 0.2)',
                  borderRadius: 4,
                  color: '#a78bfa',
                }}>
                  v{widget.manifest?.version || '1.0.0'}
                </span>
              </div>
              
              {widget.description && (
                <p style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '0.75rem', 
                  color: '#94a3b8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {widget.description}
                </p>
              )}
              
              {/* Tags */}
              {widget.tags && widget.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {widget.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                        color: '#64748b',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Stats */}
              <div style={{ 
                display: 'flex', 
                gap: 12, 
                fontSize: '0.7rem', 
                color: '#64748b',
              }}>
                <span>📥 {widget.downloads}</span>
                <span>❤️ {widget.likes}</span>
                <span>
                  📅 {new Date(widget.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              {selectedWidget?.id === widget.id && (
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImport(widget);
                    }}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: '#8b5cf6',
                      border: 'none',
                      borderRadius: 4,
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    📥 Import to Draft
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Would open in preview
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: 4,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    👁️ Preview
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Results count */}
      {!loading && widgets.length > 0 && (
        <div style={{ 
          fontSize: '0.7rem', 
          color: '#64748b', 
          textAlign: 'center',
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          Showing {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default SharedWidgetBrowser;

