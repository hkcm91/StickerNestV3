/**
 * StickerNest v2 - Feature Flags Panel
 * Visual interface for managing feature flags
 */

import React, { useState, useEffect } from 'react';
import { checkFeatureFlag, setFeatureFlag } from '../../utils/debug';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  category: 'ui' | 'debug' | 'experimental' | 'performance';
}

// Define available feature flags
const defaultFlags: Omit<FeatureFlag, 'enabled'>[] = [
  // UI Flags
  { name: 'showGridLines', description: 'Show grid lines on canvas', category: 'ui' },
  { name: 'darkMode', description: 'Force dark mode theme', category: 'ui' },
  { name: 'compactUI', description: 'Use compact UI layout', category: 'ui' },
  { name: 'animateTransitions', description: 'Enable UI animations', category: 'ui' },

  // Debug Flags
  { name: 'verboseLogging', description: 'Enable verbose console logging', category: 'debug' },
  { name: 'showRenderCount', description: 'Show render counts on components', category: 'debug' },
  { name: 'highlightUpdates', description: 'Highlight components on update', category: 'debug' },
  { name: 'logStateChanges', description: 'Log all state changes', category: 'debug' },
  { name: 'showEventBus', description: 'Log event bus traffic', category: 'debug' },

  // Experimental
  { name: 'newPipelineEditor', description: 'New pipeline editor UI', category: 'experimental' },
  { name: 'aiAutoComplete', description: 'AI-powered auto-complete', category: 'experimental' },
  { name: 'widgetPreview', description: 'Widget hover preview', category: 'experimental' },
  { name: 'gestureControls', description: 'Advanced gesture controls', category: 'experimental' },

  // Performance
  { name: 'lazyLoadWidgets', description: 'Lazy load widget iframes', category: 'performance' },
  { name: 'virtualizeList', description: 'Virtualize long lists', category: 'performance' },
  { name: 'debounceUpdates', description: 'Debounce frequent updates', category: 'performance' },
  { name: 'cacheResponses', description: 'Cache API responses', category: 'performance' },
];

interface FeatureFlagsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  ui: '#8b5cf6',
  debug: '#f59e0b',
  experimental: '#ec4899',
  performance: '#22c55e',
};

const categoryIcons: Record<string, string> = {
  ui: '🎨',
  debug: '🐛',
  experimental: '🧪',
  performance: '⚡',
};

export const FeatureFlagsPanel: React.FC<FeatureFlagsPanelProps> = ({ isOpen, onClose }) => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load flags on mount
  useEffect(() => {
    const loadedFlags = defaultFlags.map((flag) => ({
      ...flag,
      enabled: checkFeatureFlag(flag.name),
    }));
    setFlags(loadedFlags);
  }, [isOpen]);

  const toggleFlag = (flagName: string) => {
    setFlags((prev) =>
      prev.map((flag) => {
        if (flag.name === flagName) {
          const newEnabled = !flag.enabled;
          setFeatureFlag(flagName, newEnabled);
          return { ...flag, enabled: newEnabled };
        }
        return flag;
      })
    );
  };

  const enableAll = (category?: string) => {
    setFlags((prev) =>
      prev.map((flag) => {
        if (!category || flag.category === category) {
          setFeatureFlag(flag.name, true);
          return { ...flag, enabled: true };
        }
        return flag;
      })
    );
  };

  const disableAll = (category?: string) => {
    setFlags((prev) =>
      prev.map((flag) => {
        if (!category || flag.category === category) {
          setFeatureFlag(flag.name, false);
          return { ...flag, enabled: false };
        }
        return flag;
      })
    );
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      !searchQuery ||
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || flag.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ui', 'debug', 'experimental', 'performance'];

  if (!import.meta.env.DEV || !isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 480,
        maxHeight: '80vh',
        background: 'rgba(15, 15, 25, 0.98)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 12,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚩</span>
          <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: 16 }}>
            Feature Flags
          </span>
          <span
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#8b5cf6',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11,
            }}
          >
            {flags.filter((f) => f.enabled).length} active
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Search & Category Filters */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        }}
      >
        <input
          type="text"
          placeholder="Search flags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(30, 30, 50, 0.5)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 13,
            outline: 'none',
            marginBottom: 12,
          }}
        />

        {/* Category buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '6px 12px',
              background: !activeCategory ? 'rgba(139, 92, 246, 0.3)' : 'rgba(30, 30, 50, 0.5)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: 6,
              color: !activeCategory ? '#8b5cf6' : '#94a3b8',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              style={{
                padding: '6px 12px',
                background:
                  activeCategory === cat
                    ? `${categoryColors[cat]}30`
                    : 'rgba(30, 30, 50, 0.5)',
                border: `1px solid ${activeCategory === cat ? categoryColors[cat] : 'rgba(139, 92, 246, 0.2)'}`,
                borderRadius: 6,
                color: activeCategory === cat ? categoryColors[cat] : '#94a3b8',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{categoryIcons[cat]}</span>
              <span style={{ textTransform: 'capitalize' }}>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flags list */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 0',
        }}
      >
        {filteredFlags.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
            No flags match your search
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <div
              key={flag.name}
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid rgba(30, 30, 50, 0.5)',
              }}
            >
              {/* Category indicator */}
              <span
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  background: categoryColors[flag.category],
                }}
              />

              {/* Flag info */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: '#e2e8f0',
                    fontWeight: 500,
                    marginBottom: 2,
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  {flag.name}
                </div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{flag.description}</div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleFlag(flag.name)}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  border: 'none',
                  background: flag.enabled
                    ? categoryColors[flag.category]
                    : 'rgba(100, 116, 139, 0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: flag.enabled ? 25 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => enableAll(activeCategory || undefined)}
            style={{
              padding: '8px 16px',
              background: 'rgba(34, 197, 94, 0.2)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 6,
              color: '#22c55e',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Enable {activeCategory ? activeCategory : 'All'}
          </button>
          <button
            onClick={() => disableAll(activeCategory || undefined)}
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 6,
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Disable {activeCategory ? activeCategory : 'All'}
          </button>
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 6,
            color: '#8b5cf6',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          🔄 Reload to Apply
        </button>
      </div>
    </div>
  );
};

export default FeatureFlagsPanel;
