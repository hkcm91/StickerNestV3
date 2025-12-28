/**
 * StickerNest v2 - State Inspector
 * Real-time view of Zustand store state with tree navigation
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '../../state/useCanvasStore';
import { useStickerStore } from '../../state/useStickerStore';

interface StateInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TreeNodeProps {
  label: string;
  value: unknown;
  depth?: number;
  defaultExpanded?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ label, value, depth = 0, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isExpandable = value !== null && typeof value === 'object';
  const isMap = value instanceof Map;
  const isSet = value instanceof Set;
  const isArray = Array.isArray(value);

  const getValuePreview = (): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value.slice(0, 50)}${value.length > 50 ? '...' : ''}"`;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (isMap) return `Map(${value.size})`;
    if (isSet) return `Set(${value.size})`;
    if (isArray) return `Array(${value.length})`;
    if (typeof value === 'function') return 'ƒ()';
    return `{${Object.keys(value).length} keys}`;
  };

  const getValueColor = (): string => {
    if (value === null || value === undefined) return '#94a3b8';
    if (typeof value === 'string') return '#22c55e';
    if (typeof value === 'number') return '#3b82f6';
    if (typeof value === 'boolean') return '#f59e0b';
    if (typeof value === 'function') return '#8b5cf6';
    return '#e2e8f0';
  };

  const getChildren = (): [string, unknown][] => {
    if (isMap) return Array.from(value.entries());
    if (isSet) return Array.from(value).map((v, i) => [String(i), v]);
    if (isArray) return value.map((v, i) => [String(i), v]);
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value);
    }
    return [];
  };

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 0',
          cursor: isExpandable ? 'pointer' : 'default',
        }}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        {isExpandable && (
          <span style={{ color: '#64748b', fontSize: 10, width: 12 }}>
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!isExpandable && <span style={{ width: 12 }} />}
        <span style={{ color: '#a78bfa' }}>{label}</span>
        <span style={{ color: '#64748b' }}>:</span>
        <span style={{ color: getValueColor(), fontSize: 11 }}>{getValuePreview()}</span>
      </div>
      {expanded && isExpandable && (
        <div>
          {getChildren().map(([key, val]) => (
            <TreeNode key={key} label={key} value={val} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const StateInspector: React.FC<StateInspectorProps> = ({ isOpen, onClose }) => {
  const [activeStore, setActiveStore] = useState<'canvas' | 'sticker'>('canvas');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get store states
  const canvasState = useCanvasStore();
  const stickerState = useStickerStore();

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 500);
    return () => clearInterval(interval);
  }, [autoRefresh, isOpen]);

  // Filter state based on search
  const filteredState = useMemo(() => {
    const state = activeStore === 'canvas' ? canvasState : stickerState;
    if (!searchQuery) return state;

    const filtered: Record<string, unknown> = {};
    Object.entries(state).forEach(([key, value]) => {
      if (key.toLowerCase().includes(searchQuery.toLowerCase())) {
        filtered[key] = value;
      }
    });
    return filtered;
  }, [activeStore, canvasState, stickerState, searchQuery, refreshKey]);

  if (!import.meta.env.DEV || !isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100vh',
        background: 'rgba(15, 15, 25, 0.98)',
        borderLeft: '1px solid rgba(139, 92, 246, 0.3)',
        zIndex: 99997,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>State Inspector</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>

      {/* Store tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        {(['canvas', 'sticker'] as const).map((store) => (
          <button
            key={store}
            onClick={() => setActiveStore(store)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: activeStore === store ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeStore === store ? '2px solid #8b5cf6' : '2px solid transparent',
              color: activeStore === store ? '#8b5cf6' : '#94a3b8',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {store}Store
          </button>
        ))}
      </div>

      {/* Search & controls */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Filter state..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'rgba(30, 30, 50, 0.5)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 4,
            color: '#e2e8f0',
            fontSize: 11,
            outline: 'none',
          }}
        />
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            padding: '6px 10px',
            background: autoRefresh ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.2)',
            border: `1px solid ${autoRefresh ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
            borderRadius: 4,
            color: autoRefresh ? '#22c55e' : '#64748b',
            cursor: 'pointer',
            fontSize: 10,
          }}
          title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        >
          {autoRefresh ? '🔄' : '⏸'}
        </button>
      </div>

      {/* State tree */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 12,
        }}
      >
        {Object.entries(filteredState)
          .filter(([key]) => typeof filteredState[key as keyof typeof filteredState] !== 'function')
          .map(([key, value]) => (
            <TreeNode
              key={key}
              label={key}
              value={value}
              defaultExpanded={key === 'widgets' || key === 'selection' || key === 'stickers'}
            />
          ))}
      </div>

      {/* Footer with stats */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#64748b',
          fontSize: 10,
        }}
      >
        <span>
          {activeStore === 'canvas'
            ? `${canvasState.widgets.size} widgets`
            : `${stickerState.stickers.size} stickers`}
        </span>
        <span>Last update: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default StateInspector;
