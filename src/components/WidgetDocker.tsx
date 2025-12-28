/**
 * StickerNest v2 - WidgetDocker (Enhanced)
 *
 * Premium floating docker system with:
 * - Multiple docker instances with dropdown selector
 * - Glassmorphism UI with gradient accents
 * - Draggable, closeable tab system
 * - Resizable container with responsive widgets
 * - State persistence across canvases
 * - Docker presets and quick-save
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { WidgetInstance } from '../types/domain';

// Import from modular widget-docker directory
import type {
  DockedWidget,
  DockerInstance,
  DockerPreset,
  WidgetDockerProps,
} from './widget-docker/WidgetDocker.types';
import {
  MIN_WIDTH,
  MAX_WIDTH,
  MIN_HEIGHT,
  MAX_HEIGHT,
  HEADER_HEIGHT,
  TAB_HEIGHT,
} from './widget-docker/constants';
import {
  GlassButton,
  TabItem,
  PresetsPanel,
  DockerDropdown,
} from './widget-docker/components/DockerComponents';

// Re-export types for backward compatibility
export type { DockedWidget, DockerInstance, DockerPreset, WidgetDockerProps };

// Re-export useDockerState hook
export { useDockerState } from './widget-docker/hooks';

// useDockerState hook, GlassButton, TabItem, PresetsPanel, DockerDropdown
// have been extracted to ./widget-docker/ directory

// ============================================
// Main Component
// ============================================

export const WidgetDocker: React.FC<WidgetDockerProps> = ({
  widgets,
  dockedIds,
  visible,
  isEditMode,
  onToggle,
  onDock,
  onUndock,
  renderWidget,
  availableWidgets = [],
  onAddWidget,
  position = { x: 20, y: 80 },
  onPositionChange,
  canvasId,
}) => {
  // Multi-docker state (from parent or internal)
  const [dockers, setDockers] = useState<DockerInstance[]>([
    {
      id: 'default',
      name: 'Main Docker',
      dockedIds: dockedIds,
      position,
      size: { width: 320, height: 400 },
      collapsed: false,
      activeTab: 0,
    },
  ]);
  const [activeDocker, setActiveDocker] = useState('default');

  // Sync dockedIds from props
  useEffect(() => {
    setDockers((prev) =>
      prev.map((d) => (d.id === activeDocker ? { ...d, dockedIds } : d))
    );
  }, [dockedIds, activeDocker]);

  // Sync position from props
  useEffect(() => {
    setDockers((prev) =>
      prev.map((d) => (d.id === activeDocker ? { ...d, position } : d))
    );
  }, [position, activeDocker]);

  const currentDocker = useMemo(
    () => dockers.find((d) => d.id === activeDocker) || dockers[0],
    [dockers, activeDocker]
  );

  // Local state
  const [showPicker, setShowPicker] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);
  const [tabDragIndex, setTabDragIndex] = useState<number | null>(null);
  const [presets, setPresets] = useState<DockerPreset[]>([]);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sn-docker-presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to load docker presets:', e);
      }
    }
  }, []);

  // Save presets to localStorage
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem('sn-docker-presets', JSON.stringify(presets));
    }
  }, [presets]);

  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Docked widgets list
  const docked = useMemo(
    () => widgets.filter((w) => currentDocker.dockedIds.includes(w.id)),
    [widgets, currentDocker.dockedIds]
  );

  // Active tab
  const activeTab = Math.min(currentDocker.activeTab, Math.max(0, docked.length - 1));
  const activeWidget = docked[activeTab];

  // Filtered picker widgets
  const filtered = useMemo(() => {
    if (!search.trim()) return availableWidgets.slice(0, 30);
    const q = search.toLowerCase();
    return availableWidgets
      .filter((w) => w.name.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [availableWidgets, search]);

  // Update docker helper
  const updateCurrentDocker = useCallback(
    (updates: Partial<DockerInstance>) => {
      setDockers((prev) => prev.map((d) => (d.id === activeDocker ? { ...d, ...updates } : d)));
    },
    [activeDocker]
  );

  // Drag handlers
  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!isEditMode || resizing) return;
      e.preventDefault();
      setDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: currentDocker.position.x,
        posY: currentDocker.position.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isEditMode, resizing, currentDocker.position]
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newPos = {
        x: Math.max(0, dragRef.current.posX + dx),
        y: Math.max(0, dragRef.current.posY + dy),
      };
      updateCurrentDocker({ position: newPos });
      onPositionChange?.(newPos);
    },
    [dragging, onPositionChange, updateCurrentDocker]
  );

  const onDragEnd = useCallback((e: React.PointerEvent) => {
    setDragging(false);
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Resize handlers
  const onResizeStart = useCallback(
    (e: React.PointerEvent, direction: string) => {
      if (!isEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      setResizing(direction);
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        width: currentDocker.size.width,
        height: currentDocker.size.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isEditMode, currentDocker.size]
  );

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizing || !resizeRef.current) return;
      const dx = e.clientX - resizeRef.current.startX;
      const dy = e.clientY - resizeRef.current.startY;

      let newWidth = resizeRef.current.width;
      let newHeight = resizeRef.current.height;

      if (resizing.includes('e')) newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeRef.current.width + dx));
      if (resizing.includes('w')) newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeRef.current.width - dx));
      if (resizing.includes('s')) newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.height + dy));
      if (resizing.includes('n')) newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.height - dy));

      updateCurrentDocker({ size: { width: newWidth, height: newHeight } });
    },
    [resizing, updateCurrentDocker]
  );

  const onResizeEnd = useCallback((e: React.PointerEvent) => {
    setResizing(null);
    resizeRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Drop handlers
  const onDropOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDropEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDropLeave = useCallback((e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const wid = e.dataTransfer.getData('text/widget-id');
      if (!wid) return;
      const widget = widgets.find((w) => w.id === wid);
      if (widget && !currentDocker.dockedIds.includes(wid)) {
        onDock(widget);
        updateCurrentDocker({ activeTab: currentDocker.dockedIds.length });
      }
    },
    [widgets, currentDocker.dockedIds, onDock, updateCurrentDocker]
  );

  // Tab reorder handlers
  const handleTabDragStart = useCallback((e: React.DragEvent, index: number) => {
    setTabDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleTabDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleTabDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (tabDragIndex === null || tabDragIndex === dropIndex) return;
      const newDockedIds = [...currentDocker.dockedIds];
      const [removed] = newDockedIds.splice(tabDragIndex, 1);
      newDockedIds.splice(dropIndex, 0, removed);
      updateCurrentDocker({ dockedIds: newDockedIds, activeTab: dropIndex });
      setTabDragIndex(null);
    },
    [tabDragIndex, currentDocker.dockedIds, updateCurrentDocker]
  );

  // Docker management
  const createNewDocker = useCallback(() => {
    const id = `docker-${Date.now()}`;
    const newDocker: DockerInstance = {
      id,
      name: `Docker ${dockers.length + 1}`,
      dockedIds: [],
      position: { x: currentDocker.position.x + 30, y: currentDocker.position.y + 30 },
      size: { width: 320, height: 400 },
      collapsed: false,
      activeTab: 0,
    };
    setDockers((prev) => [...prev, newDocker]);
    setActiveDocker(id);
  }, [dockers.length, currentDocker.position]);

  const deleteDocker = useCallback(
    (id: string) => {
      if (dockers.length <= 1) return;
      setDockers((prev) => prev.filter((d) => d.id !== id));
      if (activeDocker === id) {
        setActiveDocker(dockers.find((d) => d.id !== id)?.id || 'default');
      }
    },
    [dockers, activeDocker]
  );

  const renameDocker = useCallback((id: string, name: string) => {
    setDockers((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }, []);

  // Preset management
  const savePreset = useCallback(
    (name: string) => {
      const preset: DockerPreset = {
        id: `preset-${Date.now()}`,
        name,
        savedAt: Date.now(),
        dockers: dockers.map((d) => ({ ...d })),
      };
      setPresets((prev) => [...prev, preset]);
    },
    [dockers]
  );

  const loadPreset = useCallback((preset: DockerPreset) => {
    setDockers(preset.dockers.map((d) => ({ ...d })));
    if (preset.dockers.length > 0) {
      setActiveDocker(preset.dockers[0].id);
    }
    setShowPresets(false);
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  if (!visible) return null;

  const contentHeight = currentDocker.collapsed
    ? 0
    : currentDocker.size.height - HEADER_HEIGHT - (docked.length > 0 ? TAB_HEIGHT : 0);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: currentDocker.position.x,
        top: currentDocker.position.y,
        width: currentDocker.size.width,
        height: currentDocker.collapsed ? HEADER_HEIGHT : currentDocker.size.height,
        background: 'linear-gradient(145deg, rgba(18,18,24,0.92), rgba(12,12,18,0.95))',
        backdropFilter: 'blur(24px)',
        border: dragOver
          ? '1.5px solid rgba(139,92,246,0.6)'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        boxShadow: `
          0 0 0 1px rgba(0,0,0,0.3),
          0 20px 60px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.05)
        `,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: currentDocker.collapsed ? 'height 0.2s ease' : 'none',
        pointerEvents: 'auto',
      }}
      onDragOver={onDropOver}
      onDragEnter={onDropEnter}
      onDragLeave={onDropLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div
        style={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 8,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor: isEditMode ? 'grab' : 'default',
          userSelect: 'none',
        }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
      >
        {/* Drag indicator */}
        <div
          style={{
            width: 20,
            height: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 2,
            opacity: 0.4,
          }}
        >
          <div style={{ height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
          <div style={{ height: 2, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
        </div>

        {/* Docker selector dropdown */}
        <DockerDropdown
          dockers={dockers}
          activeDocker={activeDocker}
          onSelect={setActiveDocker}
          onCreate={createNewDocker}
          onDelete={deleteDocker}
          onRename={renameDocker}
        />

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <GlassButton onClick={() => setShowPicker(!showPicker)} title="Add widget" active={showPicker}>
          +
        </GlassButton>
        <GlassButton onClick={() => setShowPresets(!showPresets)} title="Presets" active={showPresets}>
          💾
        </GlassButton>
        <GlassButton
          onClick={() => updateCurrentDocker({ collapsed: !currentDocker.collapsed })}
          title={currentDocker.collapsed ? 'Expand' : 'Collapse'}
        >
          {currentDocker.collapsed ? '▼' : '▲'}
        </GlassButton>
        <GlassButton onClick={onToggle} title="Close" danger>
          ×
        </GlassButton>
      </div>

      {/* Presets Panel */}
      <PresetsPanel
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        onSavePreset={savePreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        presets={presets}
      />

      {!currentDocker.collapsed && (
        <>
          {/* Widget Picker */}
          {showPicker && (
            <div
              style={{
                padding: 12,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              <input
                type="text"
                placeholder="Search widgets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: 8,
                  color: '#f0f4f8',
                  fontSize: 13,
                  outline: 'none',
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                {filtered.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onAddWidget?.(w.id);
                      setShowPicker(false);
                      setSearch('');
                    }}
                    style={{
                      padding: '10px 12px',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(168,85,247,0.08))',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 8,
                      color: '#e2e8f0',
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {w.icon && <span style={{ marginRight: 6 }}>{w.icon}</span>}
                    {w.name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div
                    style={{
                      gridColumn: '1/-1',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                      padding: 20,
                      textAlign: 'center',
                    }}
                  >
                    No widgets found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          {docked.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 10px',
                background: 'rgba(0,0,0,0.15)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                overflowX: 'auto',
                minHeight: TAB_HEIGHT,
              }}
            >
              {docked.map((w, i) => (
                <TabItem
                  key={w.id}
                  widget={w}
                  isActive={activeTab === i}
                  onClick={() => updateCurrentDocker({ activeTab: i })}
                  onClose={() => onUndock(w.id)}
                  onDragStart={(e) => handleTabDragStart(e, i)}
                  onDragOver={handleTabDragOver}
                  onDrop={(e) => handleTabDrop(e, i)}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: 10,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {activeWidget ? (
              <div
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Widget header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                    }}
                  >
                    {activeWidget.name}
                  </span>
                  <GlassButton
                    onClick={() => onUndock(activeWidget.id)}
                    title="Undock to canvas"
                    size="sm"
                    danger
                  >
                    ↗
                  </GlassButton>
                </div>
                {/* Widget content - responsive */}
                <div
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    pointerEvents: 'auto',
                  }}
                >
                  {renderWidget(activeWidget, {
                    width: currentDocker.size.width - 22,
                    height: contentHeight - 50,
                  })}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(244,114,182,0.1))',
                    borderRadius: 16,
                    fontSize: 28,
                  }}
                >
                  ⊞
                </div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 200 }}>
                  {isEditMode ? 'Drag widgets here or click + to add' : 'No docked widgets'}
                </div>
                {isEditMode && onAddWidget && (
                  <button
                    onClick={() => setShowPicker(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(168,85,247,0.8))',
                      border: 'none',
                      borderRadius: 10,
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                  >
                    + Add Widget
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Drop overlay */}
      {dragOver && (
        <div
          style={{
            position: 'absolute',
            inset: HEADER_HEIGHT,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(244,114,182,0.15))',
            border: '2px dashed rgba(139,92,246,0.5)',
            borderRadius: '0 0 14px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(168,85,247,0.9))',
              borderRadius: 8,
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
            }}
          >
            Drop to dock
          </span>
        </div>
      )}

      {/* Resize handles */}
      {isEditMode && !currentDocker.collapsed && (
        <>
          {/* Right edge */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: HEADER_HEIGHT,
              width: 6,
              height: `calc(100% - ${HEADER_HEIGHT}px)`,
              cursor: 'ew-resize',
            }}
            onPointerDown={(e) => onResizeStart(e, 'e')}
            onPointerMove={resizing === 'e' ? onResizeMove : undefined}
            onPointerUp={resizing === 'e' ? onResizeEnd : undefined}
          />
          {/* Bottom edge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 6,
              cursor: 'ns-resize',
            }}
            onPointerDown={(e) => onResizeStart(e, 's')}
            onPointerMove={resizing === 's' ? onResizeMove : undefined}
            onPointerUp={resizing === 's' ? onResizeEnd : undefined}
          />
          {/* Bottom-right corner */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 14,
              height: 14,
              cursor: 'nwse-resize',
              background: 'linear-gradient(135deg, transparent 50%, rgba(139,92,246,0.3) 50%)',
              borderRadius: '0 0 14px 0',
            }}
            onPointerDown={(e) => onResizeStart(e, 'se')}
            onPointerMove={resizing === 'se' ? onResizeMove : undefined}
            onPointerUp={resizing === 'se' ? onResizeEnd : undefined}
          />
        </>
      )}
    </div>
  );
};

export default WidgetDocker;
