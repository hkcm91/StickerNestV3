/**
 * StickerNest v2 - Collections Panel
 *
 * Sidebar panel for managing canvas collections/folders
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { collectionsApi, CanvasCollection } from '../../services/apiClient';
import { useToast } from '../../shared-ui';

// =============================================================================
// Types
// =============================================================================

interface CollectionsPanelProps {
  selectedCollection: string | null;
  onSelectCollection: (id: string | null) => void;
}

const COLLECTION_COLORS = [
  '#8b5cf6', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#6366f1',
];

const COLLECTION_ICONS = [
  'folder', 'star', 'heart', 'bookmark', 'archive', 'briefcase', 'code', 'music',
];

// =============================================================================
// Component
// =============================================================================

export const CollectionsPanel: React.FC<CollectionsPanelProps> = ({
  selectedCollection,
  onSelectCollection,
}) => {
  const toast = useToast();

  const [collections, setCollections] = useState<CanvasCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLLECTION_COLORS[0],
    icon: COLLECTION_ICONS[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      const response = await collectionsApi.list();
      if (response.success && response.data) {
        setCollections(response.data.collections);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    setSubmitting(true);
    try {
      const response = await collectionsApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        icon: formData.icon,
      });

      if (response.success && response.data) {
        setCollections(prev => [...prev, response.data!.collection]);
        setShowCreateForm(false);
        resetForm();
        toast.success('Collection created');
      } else {
        toast.error(response.error?.message || 'Failed to create collection');
      }
    } catch (error) {
      toast.error('Failed to create collection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      toast.error('Please enter a collection name');
      return;
    }

    setSubmitting(true);
    try {
      const response = await collectionsApi.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        icon: formData.icon,
      });

      if (response.success && response.data) {
        setCollections(prev =>
          prev.map(c => (c.id === id ? response.data!.collection : c))
        );
        setEditingId(null);
        resetForm();
        toast.success('Collection updated');
      } else {
        toast.error(response.error?.message || 'Failed to update collection');
      }
    } catch (error) {
      toast.error('Failed to update collection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection? Canvases will not be deleted.')) return;

    try {
      const response = await collectionsApi.delete(id);
      if (response.success) {
        setCollections(prev => prev.filter(c => c.id !== id));
        if (selectedCollection === id) {
          onSelectCollection(null);
        }
        toast.success('Collection deleted');
      } else {
        toast.error(response.error?.message || 'Failed to delete collection');
      }
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const startEditing = (collection: CanvasCollection) => {
    setEditingId(collection.id);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color: collection.color || COLLECTION_COLORS[0],
      icon: collection.icon || COLLECTION_ICONS[0],
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: COLLECTION_COLORS[0],
      icon: COLLECTION_ICONS[0],
    });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Collections</h3>
        <SNIconButton
          icon="plus"
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            resetForm();
          }}
        />
      </div>

      {/* All Canvases */}
      <button
        style={{
          ...styles.collectionItem,
          ...(selectedCollection === null ? styles.collectionItemActive : {}),
        }}
        onClick={() => onSelectCollection(null)}
      >
        <div style={styles.collectionIcon}>
          <SNIcon name="layout" size={16} color="#8b5cf6" />
        </div>
        <span style={styles.collectionName}>All Canvases</span>
      </button>

      {/* Collections List */}
      {loading && (
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
        </div>
      )}

      {collections.map((collection) => (
        <div key={collection.id} style={styles.collectionWrapper}>
          {editingId === collection.id ? (
            <CollectionForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => handleUpdate(collection.id)}
              onCancel={() => {
                setEditingId(null);
                resetForm();
              }}
              submitting={submitting}
              submitLabel="Update"
            />
          ) : (
            <button
              style={{
                ...styles.collectionItem,
                ...(selectedCollection === collection.id ? styles.collectionItemActive : {}),
              }}
              onClick={() => onSelectCollection(collection.id)}
            >
              <div
                style={{
                  ...styles.collectionIcon,
                  background: `${collection.color || '#8b5cf6'}20`,
                }}
              >
                <SNIcon
                  name={(collection.icon as any) || 'folder'}
                  size={16}
                  color={collection.color || '#8b5cf6'}
                />
              </div>
              <span style={styles.collectionName}>{collection.name}</span>
              <span style={styles.collectionCount}>{collection.canvasCount}</span>
              <div style={styles.collectionActions}>
                <SNIconButton
                  icon="edit"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(collection);
                  }}
                />
                {!collection.isDefault && (
                  <SNIconButton
                    icon="trash"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(collection.id);
                    }}
                  />
                )}
              </div>
            </button>
          )}
        </div>
      ))}

      {/* Create Form */}
      {showCreateForm && (
        <CollectionForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onCancel={() => {
            setShowCreateForm(false);
            resetForm();
          }}
          submitting={submitting}
          submitLabel="Create"
        />
      )}
    </div>
  );
};

// =============================================================================
// Collection Form Sub-component
// =============================================================================

interface CollectionFormProps {
  formData: {
    name: string;
    description: string;
    color: string;
    icon: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}

const CollectionForm: React.FC<CollectionFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}) => (
  <div style={styles.form}>
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
      placeholder="Collection name"
      style={styles.input}
      autoFocus
    />

    <input
      type="text"
      value={formData.description}
      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
      placeholder="Description (optional)"
      style={styles.input}
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
                ...(formData.color === color ? styles.colorOptionSelected : {}),
              }}
              onClick={() => setFormData(prev => ({ ...prev, color }))}
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
                ...(formData.icon === icon ? styles.iconOptionSelected : {}),
              }}
              onClick={() => setFormData(prev => ({ ...prev, icon }))}
            >
              <SNIcon name={icon as any} size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>

    <div style={styles.formActions}>
      <SNButton variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </SNButton>
      <SNButton
        variant="primary"
        size="sm"
        onClick={onSubmit}
        disabled={submitting || !formData.name.trim()}
      >
        {submitting ? 'Saving...' : submitLabel}
      </SNButton>
    </div>
  </div>
);

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: 16,
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(15, 15, 25, 0.4)',
    width: 260,
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  collectionWrapper: {},
  collectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    marginBottom: 4,
  },
  collectionItemActive: {
    background: 'rgba(139, 92, 246, 0.1)',
    color: '#f1f5f9',
  },
  collectionIcon: {
    width: 28,
    height: 28,
    background: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collectionName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  collectionCount: {
    fontSize: 12,
    color: '#64748b',
    flexShrink: 0,
  },
  collectionActions: {
    display: 'flex',
    gap: 2,
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  form: {
    padding: 12,
    background: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    color: '#f1f5f9',
    fontSize: 13,
    outline: 'none',
    marginBottom: 8,
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
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
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
    width: 26,
    height: 26,
    background: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  iconOptionSelected: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
    color: '#8b5cf6',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
};

// Add hover effect via stylesheet
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .collection-item:hover .collection-actions {
    opacity: 1 !important;
  }
`;
document.head.appendChild(styleSheet);

export default CollectionsPanel;
