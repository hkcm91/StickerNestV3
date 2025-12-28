/**
 * AddToCollectionModal Component
 * Modal for adding a canvas to one or more collections
 */

import React, { useState, useEffect } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import {
  useCollectionsStore,
  useCollections,
  type Collection,
} from '../../state/useCollectionsStore';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasId: string;
  canvasName: string;
  onSuccess?: () => void;
}

const COLLECTION_COLORS = [
  '#8b5cf6', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#6366f1',
];

const COLLECTION_ICONS = [
  'folder', 'star', 'heart', 'bookmark', 'archive', 'briefcase', 'code', 'music',
];

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  canvasId,
  canvasName,
  onSuccess,
}) => {
  const collections = useCollections();
  const {
    loadCollections,
    addCanvasToCollection,
    removeCanvasFromCollection,
    createCollection,
    getCollectionsForCanvas,
  } = useCollectionsStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    color: COLLECTION_COLORS[0],
    icon: COLLECTION_ICONS[0],
  });

  // Load collections on mount
  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen, loadCollections]);

  // Initialize selected collections
  useEffect(() => {
    if (isOpen && canvasId) {
      const currentCollections = getCollectionsForCanvas(canvasId);
      setSelectedIds(new Set(currentCollections.map((c) => c.id)));
    }
  }, [isOpen, canvasId, getCollectionsForCanvas]);

  const handleToggleCollection = (collectionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const handleCreateCollection = async () => {
    if (!newCollection.name.trim()) return;

    const created = await createCollection({
      name: newCollection.name.trim(),
      color: newCollection.color,
      icon: newCollection.icon,
    });

    setSelectedIds((prev) => new Set([...prev, created.id]));
    setShowCreateForm(false);
    setNewCollection({
      name: '',
      color: COLLECTION_COLORS[0],
      icon: COLLECTION_ICONS[0],
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const currentCollections = getCollectionsForCanvas(canvasId);
      const currentIds = new Set(currentCollections.map((c) => c.id));

      // Add to new collections
      for (const id of selectedIds) {
        if (!currentIds.has(id)) {
          await addCanvasToCollection(id, canvasId);
        }
      }

      // Remove from deselected collections
      for (const id of currentIds) {
        if (!selectedIds.has(id)) {
          await removeCanvasFromCollection(id, canvasId);
        }
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to update collections:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <SNIcon name="folder" size={20} color="#8b5cf6" />
            </div>
            <div>
              <h2 style={styles.title}>Add to Collection</h2>
              <p style={styles.subtitle}>{canvasName}</p>
            </div>
          </div>
          <SNIconButton icon="x" variant="ghost" size="sm" onClick={onClose} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Collections List */}
          <div style={styles.collectionsList}>
            {collections.length === 0 ? (
              <div style={styles.emptyState}>
                <SNIcon name="folder" size={32} color="#64748b" />
                <p>No collections yet</p>
                <p style={styles.emptyHint}>Create one to organize your canvases</p>
              </div>
            ) : (
              collections.map((collection) => (
                <button
                  key={collection.id}
                  style={{
                    ...styles.collectionItem,
                    ...(selectedIds.has(collection.id) ? styles.collectionItemSelected : {}),
                  }}
                  onClick={() => handleToggleCollection(collection.id)}
                >
                  <div
                    style={{
                      ...styles.collectionIcon,
                      background: `${collection.color}20`,
                    }}
                  >
                    <SNIcon
                      name={collection.icon as any}
                      size={18}
                      color={collection.color}
                    />
                  </div>
                  <div style={styles.collectionInfo}>
                    <span style={styles.collectionName}>{collection.name}</span>
                    <span style={styles.collectionCount}>
                      {collection.canvasCount} canvases
                    </span>
                  </div>
                  <div
                    style={{
                      ...styles.checkbox,
                      ...(selectedIds.has(collection.id) ? styles.checkboxChecked : {}),
                    }}
                  >
                    {selectedIds.has(collection.id) && (
                      <SNIcon name="check" size={12} color="#fff" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Create New Collection */}
          {showCreateForm ? (
            <div style={styles.createForm}>
              <input
                type="text"
                value={newCollection.name}
                onChange={(e) =>
                  setNewCollection((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Collection name"
                style={styles.input}
                autoFocus
              />

              <div style={styles.optionsRow}>
                <div style={styles.optionGroup}>
                  <span style={styles.optionLabel}>Color</span>
                  <div style={styles.colorOptions}>
                    {COLLECTION_COLORS.map((color) => (
                      <button
                        key={color}
                        style={{
                          ...styles.colorOption,
                          background: color,
                          ...(newCollection.color === color
                            ? styles.colorOptionSelected
                            : {}),
                        }}
                        onClick={() =>
                          setNewCollection((prev) => ({ ...prev, color }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div style={styles.optionGroup}>
                  <span style={styles.optionLabel}>Icon</span>
                  <div style={styles.iconOptions}>
                    {COLLECTION_ICONS.map((icon) => (
                      <button
                        key={icon}
                        style={{
                          ...styles.iconOption,
                          ...(newCollection.icon === icon
                            ? styles.iconOptionSelected
                            : {}),
                        }}
                        onClick={() =>
                          setNewCollection((prev) => ({ ...prev, icon }))
                        }
                      >
                        <SNIcon name={icon as any} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={styles.createActions}>
                <SNButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </SNButton>
                <SNButton
                  variant="primary"
                  size="sm"
                  onClick={handleCreateCollection}
                  disabled={!newCollection.name.trim()}
                >
                  Create
                </SNButton>
              </div>
            </div>
          ) : (
            <button
              style={styles.createButton}
              onClick={() => setShowCreateForm(true)}
            >
              <SNIcon name="plus" size={16} />
              <span>Create New Collection</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerInfo}>
            {selectedIds.size > 0 && (
              <span>{selectedIds.size} collection(s) selected</span>
            )}
          </div>
          <div style={styles.footerActions}>
            <SNButton variant="ghost" onClick={onClose}>
              Cancel
            </SNButton>
            <SNButton
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </SNButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80vh',
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Content
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 16,
  },
  collectionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    margin: 0,
  },
  collectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  collectionItemSelected: {
    background: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collectionInfo: {
    flex: 1,
    minWidth: 0,
  },
  collectionName: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  collectionCount: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  checkboxChecked: {
    background: '#8b5cf6',
    borderColor: '#8b5cf6',
  },

  // Create Button
  createButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    padding: '14px 16px',
    background: 'transparent',
    border: '1px dashed rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Create Form
  createForm: {
    marginTop: 12,
    padding: 16,
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  optionsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 12,
  },
  optionGroup: {
    flex: 1,
  },
  optionLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  colorOptions: {
    display: 'flex',
    gap: 4,
  },
  colorOption: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  colorOptionSelected: {
    borderColor: '#fff',
  },
  iconOptions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  iconOption: {
    width: 28,
    height: 28,
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  iconOptionSelected: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
    color: '#8b5cf6',
  },
  createActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  footerInfo: {
    fontSize: 13,
    color: '#64748b',
  },
  footerActions: {
    display: 'flex',
    gap: 8,
  },
};

export default AddToCollectionModal;
