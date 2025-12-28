/**
 * StickerNest v2 - Performance Monitor
 * Real-time FPS, memory, and render performance tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PerformanceStats {
  fps: number;
  memory: number | null;
  renderTime: number;
  domNodes: number;
  longTasks: number;
}

interface PerformanceMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  expanded?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  position = 'bottom-right',
  expanded: initialExpanded = true,
}) => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    memory: null,
    renderTime: 0,
    domNodes: 0,
    longTasks: 0,
  });
  const [expanded, setExpanded] = useState(initialExpanded);
  const [history, setHistory] = useState<number[]>([]);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const rafId = useRef<number>();

  // FPS calculation
  useEffect(() => {
    let longTaskCount = 0;

    // Long task observer
    const observer = new PerformanceObserver((list) => {
      longTaskCount += list.getEntries().length;
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // longtask not supported
    }

    const measureFrame = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / delta);

        // Memory (Chrome only)
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const memoryMB = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null;

        // DOM nodes
        const domNodes = document.getElementsByTagName('*').length;

        const renderTime = delta / frameCount.current;

        setStats({
          fps,
          memory: memoryMB,
          renderTime,
          domNodes,
          longTasks: longTaskCount,
        });

        // Update history for sparkline
        setHistory((prev) => [...prev.slice(-29), fps]);

        // Log FPS to console (dev tools)
        console.log(
          `%c⚡ Performance%c FPS: ${fps} | Frame Time: ${renderTime.toFixed(1)}ms | Memory: ${memoryMB !== null ? `${memoryMB}MB` : 'N/A'} | DOM Nodes: ${domNodes.toLocaleString()} | Long Tasks: ${longTaskCount}`,
          'color: #8b5cf6; font-weight: bold;',
          'color: inherit;'
        );

        frameCount.current = 0;
        lastTime.current = now;
        longTaskCount = 0;
      }

      rafId.current = requestAnimationFrame(measureFrame);
    };

    rafId.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      observer.disconnect();
    };
  }, []);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 8, left: 8 },
    'top-right': { top: 8, right: 8 },
    'bottom-left': { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  };

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#22c55e';
    if (fps >= 30) return '#eab308';
    return '#ef4444';
  };

  const getMemoryColor = (memory: number | null) => {
    if (memory === null) return '#94a3b8';
    if (memory < 100) return '#22c55e';
    if (memory < 200) return '#eab308';
    return '#ef4444';
  };

  if (!import.meta.env.DEV) return null;

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 99998,
        fontFamily: 'monospace',
        fontSize: 11,
        userSelect: 'none',
      }}
    >
      {/* Expanded view */}
      {expanded && (
        <div
          style={{
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 8,
            padding: 12,
            minWidth: 180,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>⚡ Performance</span>
            <button
              onClick={() => setExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              ✕
            </button>
          </div>

          {/* FPS with sparkline */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#94a3b8' }}>FPS</span>
              <span style={{ color: getFPSColor(stats.fps), fontWeight: 'bold' }}>
                {stats.fps}
              </span>
            </div>
            {/* Sparkline */}
            <svg width="100%" height="20" style={{ display: 'block' }}>
              <polyline
                points={history
                  .map((fps, i) => `${(i / 29) * 156},${20 - (fps / 60) * 18}`)
                  .join(' ')}
                fill="none"
                stroke={getFPSColor(stats.fps)}
                strokeWidth="1.5"
              />
              <line x1="0" y1="20" x2="156" y2="20" stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
            </svg>
          </div>

          {/* Memory */}
          {stats.memory !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#94a3b8' }}>Memory</span>
              <span style={{ color: getMemoryColor(stats.memory) }}>
                {stats.memory} MB
              </span>
            </div>
          )}

          {/* DOM Nodes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#94a3b8' }}>DOM Nodes</span>
            <span style={{ color: stats.domNodes > 1500 ? '#eab308' : '#22c55e' }}>
              {stats.domNodes.toLocaleString()}
            </span>
          </div>

          {/* Render Time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#94a3b8' }}>Frame Time</span>
            <span style={{ color: stats.renderTime > 16 ? '#eab308' : '#22c55e' }}>
              {stats.renderTime.toFixed(1)}ms
            </span>
          </div>

          {/* Long Tasks */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Long Tasks</span>
            <span style={{ color: stats.longTasks > 0 ? '#ef4444' : '#22c55e' }}>
              {stats.longTasks}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
