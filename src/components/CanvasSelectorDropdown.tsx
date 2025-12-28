/**
 * StickerNest v2 - Canvas Selector Dropdown
 * Dropdown menu for selecting, editing, and deleting canvases
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { CanvasListItem } from '../services/canvasManager';

interface CanvasSelectorDropdownProps {
  canvases: CanvasListItem[];
  currentCanvasId: string;
  onSelect: (canvasId: string) => void;
  onRename: (canvasId: string, newName: string) => Promise<void>;
  onDelete: (canvasId: string) => Promise<void>;
  onCreate: () => void;
  isLoading?: boolean;
}

export const CanvasSelectorDropdown: React.FC<CanvasSelectorDropdownProps> = ({
  canvases,
  currentCanvasId,
  onSelect,
  onRename,
  onDelete,
  onCreate,
  isLoading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentCanvas = canvases.find(c => c.id === currentCanvasId);

  // Close dropdown when clicking outside using shared hook
  const handleClickOutside = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
    setDeleteConfirmId(null);
  }, []);
  useClickOutside(dropdownRef, handleClickOutside);

  // Focus input when editing
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (e: React.MouseEvent, canvas: CanvasListItem) => {
    e.stopPropagation();
    setEditingId(canvas.id);
    setEditName(canvas.name);
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editName.trim()) {
      await onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleStartDelete = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(canvasId);
    setEditingId(null);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    await onDelete(canvasId);
    setDeleteConfirmId(null);
  };

  const handleSelect = (canvasId: string) => {
    if (editingId || deleteConfirmId) return;
    onSelect(canvasId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={styles.container}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.trigger}
        disabled={isLoading}
        title={currentCanvas?.name || 'Select Canvas'}
      >
        <span style={styles.triggerIcon}>🎨</span>
        <span style={styles.triggerText}>
          Canvas
        </span>
        <span style={{
          ...styles.triggerArrow,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div style={styles.menu}>
          {/* Canvas list */}
          <div style={styles.canvasList}>
            {canvases.length === 0 ? (
              <div style={styles.emptyState}>
                No canvases yet. Create one to get started!
              </div>
            ) : (
              canvases.map(canvas => (
                <div
                  key={canvas.id}
                  style={{
                    ...styles.canvasItem,
                    ...(canvas.id === currentCanvasId ? styles.canvasItemActive : {}),
                  }}
                  onClick={() => handleSelect(canvas.id)}
                >
                  {editingId === canvas.id ? (
                    // Edit mode
                    <form onSubmit={handleSaveEdit} style={styles.editForm}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={styles.editInput}
                        onKeyDown={(e) => e.key === 'Escape' && handleCancelEdit()}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button type="submit" style={styles.editSaveBtn}>✓</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                        style={styles.editCancelBtn}
                      >
                        ✕
                      </button>
                    </form>
                  ) : deleteConfirmId === canvas.id ? (
                    // Delete confirmation
                    <div style={styles.deleteConfirm}>
                      <span style={styles.deleteText}>Delete "{canvas.name}"?</span>
                      <button
                        onClick={(e) => handleConfirmDelete(e, canvas.id)}
                        style={styles.deleteYesBtn}
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                        style={styles.deleteNoBtn}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    // Normal display
                    <>
                      <div style={styles.canvasInfo}>
                        <div style={styles.canvasName}>{canvas.name}</div>
                        <div style={styles.canvasMeta}>
                          {canvas.width}x{canvas.height} • {canvas.widgetCount} widgets
                          {canvas.visibility !== 'private' && (
                            <span style={styles.visibilityBadge}>
                              {canvas.visibility === 'public' ? '🌐' : '🔗'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={styles.canvasActions}>
                        <button
                          onClick={(e) => handleStartEdit(e, canvas)}
                          style={styles.actionBtn}
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => handleStartDelete(e, canvas.id)}
                          style={styles.actionBtn}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Create new canvas button */}
          <div style={styles.menuFooter}>
            <button onClick={() => { onCreate(); setIsOpen(false); }} style={styles.createBtn}>
              <span>+</span> New Canvas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    minWidth: 180,
    maxWidth: 280,
    transition: 'all 0.2s ease',
  },
  triggerIcon: {
    fontSize: 14,
  },
  triggerText: {
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  triggerArrow: {
    fontSize: 8,
    color: '#94a3b8',
    transition: 'transform 0.2s ease',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    minWidth: 280,
    maxWidth: 360,
    background: '#1a1a2e',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  canvasList: {
    maxHeight: 320,
    overflowY: 'auto',
  },
  emptyState: {
    padding: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
  },
  canvasItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'background 0.15s ease',
  },
  canvasItemActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderLeft: '3px solid #8b5cf6',
  },
  canvasInfo: {
    flex: 1,
    minWidth: 0,
  },
  canvasName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  canvasMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  visibilityBadge: {
    fontSize: 10,
  },
  canvasActions: {
    display: 'flex',
    gap: 4,
    marginLeft: 8,
    opacity: 0.6,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    fontSize: 12,
    borderRadius: 4,
    transition: 'opacity 0.15s ease',
  },
  editForm: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  editInput: {
    flex: 1,
    padding: '6px 10px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
  },
  editSaveBtn: {
    background: '#22c55e',
    border: 'none',
    borderRadius: 4,
    padding: '4px 8px',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  editCancelBtn: {
    background: '#64748b',
    border: 'none',
    borderRadius: 4,
    padding: '4px 8px',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
  deleteConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  deleteText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 500,
  },
  deleteYesBtn: {
    background: '#ef4444',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteNoBtn: {
    background: '#64748b',
    border: 'none',
    borderRadius: 4,
    padding: '4px 10px',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  menuFooter: {
    padding: 12,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  createBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
  },
};

export default CanvasSelectorDropdown;
