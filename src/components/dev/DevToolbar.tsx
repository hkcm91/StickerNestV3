/**
 * StickerNest v2 - Dev Toolbar
 * Floating toolbar with quick access to all dev tools
 */

import React, { useState, useEffect } from 'react';
import { PerformanceMonitor } from './PerformanceMonitor';
import { StateInspector } from './StateInspector';
import { MessageLogger } from './MessageLogger';
import { FeatureFlagsPanel } from './FeatureFlagsPanel';
import { ComponentHighlighter } from './ComponentHighlighter';
import { DemoCanvasManager } from './DemoCanvasManager';
import { debug } from '../../utils/debug';
import { useDraggableButton } from '../../hooks/useDraggableButton';
import { useDevStore } from '../../state/useDevStore';

type Tool = 'perf' | 'state' | 'messages' | 'flags' | 'highlight' | 'console' | 'demo';

interface ToolConfig {
  id: Tool;
  icon: string;
  label: string;
  shortcut: string;
}

const tools: ToolConfig[] = [
  { id: 'perf', icon: '⚡', label: 'Performance', shortcut: 'P' },
  { id: 'state', icon: '🔍', label: 'State Inspector', shortcut: 'S' },
  { id: 'messages', icon: '📨', label: 'Message Logger', shortcut: 'M' },
  { id: 'flags', icon: '🚩', label: 'Feature Flags', shortcut: 'F' },
  { id: 'highlight', icon: '🎯', label: 'Component Highlighter', shortcut: 'H' },
  { id: 'demo', icon: '🎬', label: 'Demo Canvases', shortcut: 'D' },
  { id: 'console', icon: '📋', label: 'Copy Debug Info', shortcut: 'C' },
];

export const DevToolbar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTools, setActiveTools] = useState<Set<Tool>>(new Set(['perf']));
  
  // Use store for button position
  const toolbarButtonVerticalPosition = useDevStore((s) => s.toolbarButtonVerticalPosition);
  const toolbarButtonSide = useDevStore((s) => s.toolbarButtonSide);
  const setToolbarButtonVerticalPosition = useDevStore((s) => s.setToolbarButtonVerticalPosition);
  const setToolbarButtonSide = useDevStore((s) => s.setToolbarButtonSide);
  
  // Legacy position state for toolbar panel (can be removed if not needed)
  const [position, setPosition] = useState<'left' | 'right'>(toolbarButtonSide);
  
  // Use draggable button hook
  const {
    buttonRef,
    isDragging,
    isTransitioning,
    handleMouseDown,
    handleTouchStart,
    handleClick,
  } = useDraggableButton({
    verticalPosition: toolbarButtonVerticalPosition,
    side: toolbarButtonSide,
    onVerticalPositionChange: setToolbarButtonVerticalPosition,
    onSideChange: setToolbarButtonSide,
  });
  
  // Sync position state with toolbar button side
  useEffect(() => {
    setPosition(toolbarButtonSide);
  }, [toolbarButtonSide]);

  // Toggle tool
  const toggleTool = (tool: Tool) => {
    if (tool === 'console') {
      copyDebugInfo();
      return;
    }

    setActiveTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
      } else {
        next.add(tool);
      }
      return next;
    });
  };

  // Copy debug info to clipboard
  const copyDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      memory: (performance as unknown as { memory?: object }).memory || 'N/A',
      localStorage: Object.keys(localStorage).length + ' keys',
    };

    navigator.clipboard.writeText(JSON.stringify(info, null, 2)).then(() => {
      debug.success('Debug info copied to clipboard!');
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close toolbar
      if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
        setActiveTools(new Set());
        return;
      }

      // Alt + ` to toggle toolbar
      if (e.altKey && e.key === '`') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
        return;
      }

      // Alt + key for tool shortcuts when expanded
      if (e.altKey && isExpanded) {
        const tool = tools.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
        if (tool) {
          e.preventDefault();
          toggleTool(tool.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* Close button at top of screen - always visible when expanded */}
      {isExpanded && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
            setActiveTools(new Set());
          }}
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '48px',
            height: '48px',
            background: '#ef4444',
            border: '4px solid #ffffff',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: 'bold',
            lineHeight: '1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            margin: '0',
            zIndex: '2147483647',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.8), 0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.6)',
            transition: 'all 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.15)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 1), 0 0 0 5px rgba(239, 68, 68, 0.5), 0 0 60px rgba(239, 68, 68, 0.8)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.8), 0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.6)';
          }}
          title="Close dev tools"
          aria-label="Close dev tools"
        >
          ×
        </button>
      )}

      {/* Floating toolbar */}
      <div
        style={{
          position: 'fixed',
          top: `${toolbarButtonVerticalPosition}%`,
          [toolbarButtonSide]: 0,
          transform: 'translateY(-50%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: toolbarButtonSide === 'left' ? 'flex-start' : 'flex-end',
          transition: isTransitioning && !isDragging
            ? 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none',
        }}
      >
        {/* Toggle button - hidden by default */}
        <button
          ref={buttonRef}
          onClick={(e) => handleClick(e, () => setIsExpanded(!isExpanded))}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            width: 36,
            height: 36,
            background: 'rgba(139, 92, 246, 0.15)', // Subtle background
            border: '1px solid rgba(139, 92, 246, 0.3)', // Subtle border
            borderRadius: toolbarButtonSide === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
            color: 'rgba(255, 255, 255, 0.7)', // Subtle icon color
            cursor: isDragging ? 'grabbing' : 'grab',
            fontSize: 16,
            display: isExpanded ? 'flex' : 'none', // Hidden when not expanded
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)', // Subtle shadow
            opacity: isDragging ? 0.9 : 0.75, // Subtle opacity
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transform: isDragging ? 'scale(1.1)' : 'scale(1)',
            transition: isTransitioning && !isDragging
              ? 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease'
              : 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.opacity = '0.75';
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }
          }}
          title="Dev Tools (Alt+`)"
        >
          🛠
        </button>

        {/* Expanded toolbar */}
        {isExpanded && (
          <div
            style={{
              background: 'rgba(15, 15, 25, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: position === 'left' ? '0 8px 8px 0' : '8px 0 0 8px',
              padding: '8px 4px',
              marginTop: 4,
              backdropFilter: 'blur(8px)',
              position: 'relative',
            }}
          >
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  background: activeTools.has(tool.id)
                    ? 'rgba(139, 92, 246, 0.3)'
                    : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: activeTools.has(tool.id) ? '#8b5cf6' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                title={`${tool.label} (Alt+${tool.shortcut})`}
              >
                <span style={{ fontSize: 14 }}>{tool.icon}</span>
                <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{tool.label}</span>
                <span
                  style={{
                    fontSize: 9,
                    color: '#64748b',
                    background: 'rgba(100, 116, 139, 0.2)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {tool.shortcut}
                </span>
              </button>
            ))}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: 'rgba(139, 92, 246, 0.2)',
                margin: '8px 12px',
              }}
            />

            {/* Quick actions */}
            <div style={{ padding: '0 8px' }}>
              <button
                onClick={() => setPosition((p) => (p === 'left' ? 'right' : 'left'))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: 'rgba(100, 116, 139, 0.1)',
                  border: '1px solid rgba(100, 116, 139, 0.2)',
                  borderRadius: 4,
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 10,
                  marginBottom: 4,
                }}
              >
                ↔ Move to {position === 'left' ? 'Right' : 'Left'}
              </button>

              <button
                onClick={() => {
                  setActiveTools(new Set());
                  setIsExpanded(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 4,
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
              >
                ✕ Close All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tool components */}
      {activeTools.has('perf') && <PerformanceMonitor position="bottom-right" expanded={true} />}

      <StateInspector
        isOpen={activeTools.has('state')}
        onClose={() => toggleTool('state')}
      />

      <MessageLogger
        isOpen={activeTools.has('messages')}
        onClose={() => toggleTool('messages')}
      />

      <FeatureFlagsPanel
        isOpen={activeTools.has('flags')}
        onClose={() => toggleTool('flags')}
      />

      <ComponentHighlighter
        enabled={activeTools.has('highlight')}
        onDisable={() => toggleTool('highlight')}
      />

      <DemoCanvasManager
        isOpen={activeTools.has('demo')}
        onClose={() => toggleTool('demo')}
      />
    </>
  );
};

export default DevToolbar;
