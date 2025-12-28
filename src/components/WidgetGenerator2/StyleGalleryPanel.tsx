/**
 * Widget Generator 2.0 - Style Gallery Panel
 *
 * Save and organize design inspiration including:
 * - CSS/Tailwind/SCSS styles
 * - Color palettes
 * - Effects & animations
 * - Any code snippets (HTML, JS, etc.)
 * - Live preview window for snippets
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  StyleSnippet,
  StyleGallery,
  SnippetType,
  ColorPalette,
  PaletteColor,
  EffectMetadata,
  PreviewSettings
} from '../../services/enhancedAIGenerator';
import { createStyleGallery, addStyleSnippet, searchStyleGallery } from '../../services/enhancedAIGenerator';

interface StyleGalleryPanelProps {
  gallery: StyleGallery;
  onGalleryChange: (gallery: StyleGallery) => void;
  selectedSnippets: StyleSnippet[];
  onSelectionChange: (snippets: StyleSnippet[]) => void;
}

// Snippet type configurations
const SNIPPET_TYPES: { value: SnippetType; label: string; icon: string }[] = [
  { value: 'css', label: 'CSS', icon: '🎨' },
  { value: 'tailwind', label: 'Tailwind', icon: '💨' },
  { value: 'scss', label: 'SCSS', icon: '🎭' },
  { value: 'styled-components', label: 'Styled', icon: '💅' },
  { value: 'color-palette', label: 'Colors', icon: '🌈' },
  { value: 'effect', label: 'Effect', icon: '✨' },
  { value: 'animation', label: 'Animation', icon: '🎬' },
  { value: 'gradient', label: 'Gradient', icon: '🌅' },
  { value: 'html', label: 'HTML', icon: '📄' },
  { value: 'javascript', label: 'JavaScript', icon: '⚡' },
  { value: 'typescript', label: 'TypeScript', icon: '📘' },
  { value: 'svg', label: 'SVG', icon: '🔷' }
];

export function StyleGalleryPanel({
  gallery,
  onGalleryChange,
  selectedSnippets,
  onSelectionChange
}: StyleGalleryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<SnippetType | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addMode, setAddMode] = useState<'snippet' | 'palette'>('snippet');
  const [editingSnippet, setEditingSnippet] = useState<Partial<StyleSnippet> | null>(null);
  const [editingPalette, setEditingPalette] = useState<Partial<ColorPalette> | null>(null);
  const [previewSnippet, setPreviewSnippet] = useState<StyleSnippet | null>(null);

  // Filter snippets
  const filteredSnippets = useMemo(() => {
    return searchStyleGallery(gallery, searchQuery, {
      type: typeFilter || undefined,
      category: activeCategory || undefined
    });
  }, [gallery, searchQuery, typeFilter, activeCategory]);

  // Toggle snippet selection
  const toggleSelection = useCallback((snippet: StyleSnippet) => {
    const isSelected = selectedSnippets.some(s => s.id === snippet.id);
    if (isSelected) {
      onSelectionChange(selectedSnippets.filter(s => s.id !== snippet.id));
    } else {
      if (selectedSnippets.length < 5) {
        onSelectionChange([...selectedSnippets, snippet]);
      }
    }
  }, [selectedSnippets, onSelectionChange]);

  // Add new snippet
  const handleAddSnippet = useCallback(() => {
    if (!editingSnippet?.name || !editingSnippet?.code) return;

    const newSnippet = addStyleSnippet(gallery, {
      name: editingSnippet.name,
      description: editingSnippet.description,
      source: editingSnippet.source,
      type: editingSnippet.type || 'css',
      code: editingSnippet.code,
      tags: editingSnippet.tags || [],
      colors: extractColors(editingSnippet.code),
      colorPalette: editingSnippet.colorPalette,
      effectMeta: editingSnippet.effectMeta,
      previewSettings: editingSnippet.previewSettings
    });

    onGalleryChange({ ...gallery });
    setIsAddingNew(false);
    setEditingSnippet(null);
  }, [editingSnippet, gallery, onGalleryChange]);

  // Add color palette
  const handleAddPalette = useCallback(() => {
    if (!editingPalette?.name || !editingPalette?.colors?.length) return;

    // Create a snippet from the palette
    const cssVars = editingPalette.colors
      .map((c, i) => `  ${c.cssVar || `--color-${i + 1}`}: ${c.hex};`)
      .join('\n');

    const newSnippet = addStyleSnippet(gallery, {
      name: editingPalette.name,
      type: 'color-palette',
      code: `:root {\n${cssVars}\n}`,
      tags: ['palette', 'colors', editingPalette.harmony || 'custom'],
      colors: editingPalette.colors.map(c => c.hex),
      colorPalette: editingPalette as ColorPalette
    });

    // Also add to palettes array
    gallery.palettes = [...(gallery.palettes || []), editingPalette as ColorPalette];

    onGalleryChange({ ...gallery });
    setIsAddingNew(false);
    setEditingPalette(null);
  }, [editingPalette, gallery, onGalleryChange]);

  // Delete snippet
  const deleteSnippet = useCallback((snippetId: string) => {
    gallery.snippets = gallery.snippets.filter(s => s.id !== snippetId);
    gallery.categories.forEach(cat => {
      cat.snippetIds = cat.snippetIds.filter(id => id !== snippetId);
    });
    gallery.updatedAt = Date.now();
    onGalleryChange({ ...gallery });
    onSelectionChange(selectedSnippets.filter(s => s.id !== snippetId));
  }, [gallery, onGalleryChange, selectedSnippets, onSelectionChange]);

  return (
    <div className="style-gallery-panel">
      <div className="panel-header">
        <h4>
          <span className="header-icon">🎨</span>
          Style Gallery
        </h4>
        <div className="header-actions">
          <button
            className="add-btn palette"
            onClick={() => {
              setIsAddingNew(true);
              setAddMode('palette');
              setEditingPalette({ name: '', colors: [{ hex: '#667eea' }], harmony: 'custom' });
            }}
          >
            <span>🌈</span> Add Palette
          </button>
          <button
            className="add-btn"
            onClick={() => {
              setIsAddingNew(true);
              setAddMode('snippet');
              setEditingSnippet({ type: 'css', tags: [] });
            }}
          >
            <span>+</span> Add Snippet
          </button>
        </div>
      </div>

      <p className="panel-description">
        Save colors, effects, CSS snippets, and code blocks. Select up to 5 items to
        guide the AI's generation.
      </p>

      {/* Selection Info */}
      {selectedSnippets.length > 0 && (
        <div className="selection-info">
          <span className="selection-count">
            {selectedSnippets.length}/5 selected for generation
          </span>
          <button
            className="clear-selection"
            onClick={() => onSelectionChange([])}
          >
            Clear
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={typeFilter || ''}
          onChange={(e) => setTypeFilter(e.target.value as SnippetType || null)}
          className="type-filter"
        >
          <option value="">All Types</option>
          {SNIPPET_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div className="categories-bar">
        <button
          className={`category-btn ${activeCategory === null ? 'active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {gallery.categories.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
            <span className="cat-count">{cat.snippetIds.length}</span>
          </button>
        ))}
      </div>

      {/* Add New Form */}
      {isAddingNew && addMode === 'snippet' && (
        <AddSnippetForm
          snippet={editingSnippet}
          onSnippetChange={setEditingSnippet}
          onSave={handleAddSnippet}
          onCancel={() => setIsAddingNew(false)}
        />
      )}

      {isAddingNew && addMode === 'palette' && (
        <AddPaletteForm
          palette={editingPalette}
          onPaletteChange={setEditingPalette}
          onSave={handleAddPalette}
          onCancel={() => setIsAddingNew(false)}
        />
      )}

      {/* Preview Modal */}
      {previewSnippet && (
        <PreviewModal
          snippet={previewSnippet}
          onClose={() => setPreviewSnippet(null)}
        />
      )}

      {/* Snippets Grid */}
      {!isAddingNew && (
        <div className="snippets-grid">
          {filteredSnippets.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No snippets found</p>
              <button onClick={() => {
                setIsAddingNew(true);
                setAddMode('snippet');
                setEditingSnippet({ type: 'css', tags: [] });
              }}>Add your first snippet</button>
            </div>
          ) : (
            filteredSnippets.map(snippet => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                isSelected={selectedSnippets.some(s => s.id === snippet.id)}
                onToggleSelect={() => toggleSelection(snippet)}
                onDelete={() => deleteSnippet(snippet.id)}
                onPreview={() => setPreviewSnippet(snippet)}
              />
            ))
          )}
        </div>
      )}

      <style>{`
        .style-gallery-panel {
          padding: 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .panel-header h4 {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        }

        .add-btn.palette {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .panel-description {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--text-secondary, #888);
        }

        .selection-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .selection-count {
          font-size: 13px;
          color: var(--accent-color, #667eea);
        }

        .clear-selection {
          padding: 4px 8px;
          background: transparent;
          border: 1px solid var(--accent-color, #667eea);
          border-radius: 4px;
          color: var(--accent-color, #667eea);
          cursor: pointer;
          font-size: 11px;
        }

        .filters-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .search-input {
          flex: 1;
          padding: 8px 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .type-filter {
          padding: 8px 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
          min-width: 140px;
        }

        .categories-bar {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 6px;
          color: var(--text-secondary, #888);
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .category-btn:hover {
          background: var(--bg-hover, #333);
          color: var(--text-primary, #fff);
        }

        .category-btn.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .cat-count {
          padding: 1px 5px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          font-size: 10px;
        }

        .snippets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 12px;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          color: var(--text-secondary, #888);
        }

        .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state button {
          margin-top: 12px;
          padding: 8px 16px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// ADD SNIPPET FORM
// ============================================================================

interface AddSnippetFormProps {
  snippet: Partial<StyleSnippet> | null;
  onSnippetChange: (snippet: Partial<StyleSnippet> | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

function AddSnippetForm({ snippet, onSnippetChange, onSave, onCancel }: AddSnippetFormProps) {
  const [showPreview, setShowPreview] = useState(false);

  const isEffectType = snippet?.type === 'effect' || snippet?.type === 'animation';
  const isCodeType = ['html', 'javascript', 'typescript', 'svg'].includes(snippet?.type || '');

  return (
    <div className="add-snippet-form">
      <div className="form-header">
        <h5>Add New Snippet</h5>
        <button className="close-btn" onClick={onCancel}>×</button>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            value={snippet?.name || ''}
            onChange={(e) => onSnippetChange({ ...snippet, name: e.target.value })}
            placeholder="e.g., Glassmorphic Card"
          />
        </div>

        <div className="form-group">
          <label>Type *</label>
          <select
            value={snippet?.type || 'css'}
            onChange={(e) => onSnippetChange({ ...snippet, type: e.target.value as SnippetType })}
          >
            {SNIPPET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group full-width">
          <label>Description</label>
          <input
            type="text"
            value={snippet?.description || ''}
            onChange={(e) => onSnippetChange({ ...snippet, description: e.target.value })}
            placeholder="Brief description..."
          />
        </div>

        <div className="form-group full-width">
          <label>Source URL (optional)</label>
          <input
            type="url"
            value={snippet?.source || ''}
            onChange={(e) => onSnippetChange({ ...snippet, source: e.target.value })}
            placeholder="https://dribbble.com/..."
          />
        </div>

        {/* Effect-specific fields */}
        {isEffectType && (
          <div className="form-group full-width effect-fields">
            <label>Effect Settings</label>
            <div className="effect-grid">
              <select
                value={snippet?.effectMeta?.effectType || 'animation'}
                onChange={(e) => onSnippetChange({
                  ...snippet,
                  effectMeta: { ...snippet?.effectMeta, effectType: e.target.value as EffectMetadata['effectType'] }
                })}
              >
                <option value="animation">Animation</option>
                <option value="transition">Transition</option>
                <option value="transform">Transform</option>
                <option value="filter">Filter</option>
                <option value="shadow">Shadow</option>
                <option value="hover">Hover Effect</option>
                <option value="scroll">Scroll Effect</option>
              </select>
              <input
                type="text"
                placeholder="Duration (e.g., 0.3s)"
                value={snippet?.effectMeta?.duration || ''}
                onChange={(e) => onSnippetChange({
                  ...snippet,
                  effectMeta: {
                    effectType: snippet?.effectMeta?.effectType || 'animation',
                    ...snippet?.effectMeta,
                    duration: e.target.value
                  }
                })}
              />
              <input
                type="text"
                placeholder="Timing (e.g., ease-in-out)"
                value={snippet?.effectMeta?.timing || ''}
                onChange={(e) => onSnippetChange({
                  ...snippet,
                  effectMeta: {
                    effectType: snippet?.effectMeta?.effectType || 'animation',
                    ...snippet?.effectMeta,
                    timing: e.target.value
                  }
                })}
              />
            </div>
          </div>
        )}

        <div className="form-group full-width">
          <div className="code-header">
            <label>Code *</label>
            <button
              className="preview-toggle"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? '📝 Edit' : '👁️ Preview'}
            </button>
          </div>
          {!showPreview ? (
            <textarea
              value={snippet?.code || ''}
              onChange={(e) => onSnippetChange({ ...snippet, code: e.target.value })}
              placeholder={getPlaceholderForType(snippet?.type || 'css')}
              rows={10}
            />
          ) : (
            <CodePreview code={snippet?.code || ''} type={snippet?.type || 'css'} />
          )}
        </div>

        {/* Preview Settings */}
        <div className="form-group full-width">
          <label>Preview Background</label>
          <div className="preview-settings-row">
            <input
              type="color"
              value={snippet?.previewSettings?.backgroundColor || '#1a1a1a'}
              onChange={(e) => onSnippetChange({
                ...snippet,
                previewSettings: { ...snippet?.previewSettings, backgroundColor: e.target.value }
              })}
            />
            <input
              type="text"
              value={snippet?.previewSettings?.backgroundColor || '#1a1a1a'}
              onChange={(e) => onSnippetChange({
                ...snippet,
                previewSettings: { ...snippet?.previewSettings, backgroundColor: e.target.value }
              })}
              placeholder="#1a1a1a"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Tags (comma separated)</label>
          <input
            type="text"
            value={(snippet?.tags || []).join(', ')}
            onChange={(e) => onSnippetChange({
              ...snippet,
              tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            })}
            placeholder="button, gradient, hover effect"
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="save-btn"
          onClick={onSave}
          disabled={!snippet?.name || !snippet?.code}
        >
          Save Snippet
        </button>
      </div>

      <style>{`
        .add-snippet-form {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-header h5 {
          margin: 0;
          font-size: 14px;
        }

        .close-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          background: var(--bg-quaternary, #1a1a1a);
          border: none;
          border-radius: 50%;
          color: var(--text-secondary, #888);
          font-size: 18px;
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 8px 12px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .form-group textarea {
          font-family: 'Fira Code', 'Monaco', monospace;
          resize: vertical;
          line-height: 1.5;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .preview-toggle {
          padding: 4px 10px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-secondary, #888);
          font-size: 11px;
          cursor: pointer;
        }

        .preview-toggle:hover {
          background: var(--bg-hover, #333);
        }

        .effect-fields .effect-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .effect-fields select,
        .effect-fields input {
          padding: 8px;
          font-size: 12px;
        }

        .preview-settings-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .preview-settings-row input[type="color"] {
          width: 40px;
          height: 36px;
          padding: 2px;
          cursor: pointer;
        }

        .preview-settings-row input[type="text"] {
          flex: 1;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        .cancel-btn, .save-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid var(--border-color, #333);
          color: var(--text-secondary, #888);
        }

        .save-btn {
          background: var(--accent-color, #667eea);
          border: none;
          color: white;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// ADD PALETTE FORM
// ============================================================================

interface AddPaletteFormProps {
  palette: Partial<ColorPalette> | null;
  onPaletteChange: (palette: Partial<ColorPalette> | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

function AddPaletteForm({ palette, onPaletteChange, onSave, onCancel }: AddPaletteFormProps) {
  const colors = palette?.colors || [];

  const addColor = () => {
    onPaletteChange({
      ...palette,
      colors: [...colors, { hex: '#ffffff' }]
    });
  };

  const updateColor = (index: number, updates: Partial<PaletteColor>) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], ...updates };
    onPaletteChange({ ...palette, colors: newColors });
  };

  const removeColor = (index: number) => {
    onPaletteChange({
      ...palette,
      colors: colors.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="add-palette-form">
      <div className="form-header">
        <h5>🌈 Add Color Palette</h5>
        <button className="close-btn" onClick={onCancel}>×</button>
      </div>

      <div className="palette-form-content">
        <div className="form-row">
          <div className="form-group">
            <label>Palette Name *</label>
            <input
              type="text"
              value={palette?.name || ''}
              onChange={(e) => onPaletteChange({ ...palette, name: e.target.value })}
              placeholder="e.g., Ocean Blues"
            />
          </div>

          <div className="form-group">
            <label>Harmony</label>
            <select
              value={palette?.harmony || 'custom'}
              onChange={(e) => onPaletteChange({ ...palette, harmony: e.target.value as ColorPalette['harmony'] })}
            >
              <option value="custom">Custom</option>
              <option value="complementary">Complementary</option>
              <option value="analogous">Analogous</option>
              <option value="triadic">Triadic</option>
              <option value="split-complementary">Split-Complementary</option>
              <option value="tetradic">Tetradic</option>
              <option value="monochromatic">Monochromatic</option>
            </select>
          </div>
        </div>

        {/* Color Swatches Preview */}
        <div className="palette-preview">
          {colors.map((color, i) => (
            <div
              key={i}
              className="preview-swatch"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>

        {/* Color Inputs */}
        <div className="colors-list">
          {colors.map((color, index) => (
            <div key={index} className="color-row">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(index, { hex: e.target.value })}
              />
              <input
                type="text"
                value={color.hex}
                onChange={(e) => updateColor(index, { hex: e.target.value })}
                placeholder="#000000"
                className="hex-input"
              />
              <input
                type="text"
                value={color.name || ''}
                onChange={(e) => updateColor(index, { name: e.target.value })}
                placeholder="Color name"
                className="name-input"
              />
              <select
                value={color.role || 'custom'}
                onChange={(e) => updateColor(index, { role: e.target.value as PaletteColor['role'] })}
                className="role-select"
              >
                <option value="custom">Custom</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="accent">Accent</option>
                <option value="background">Background</option>
                <option value="text">Text</option>
                <option value="border">Border</option>
              </select>
              <input
                type="text"
                value={color.cssVar || ''}
                onChange={(e) => updateColor(index, { cssVar: e.target.value })}
                placeholder="--var-name"
                className="var-input"
              />
              <button className="remove-color-btn" onClick={() => removeColor(index)}>×</button>
            </div>
          ))}
        </div>

        <button className="add-color-btn" onClick={addColor}>
          + Add Color
        </button>
      </div>

      <div className="form-actions">
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button
          className="save-btn"
          onClick={onSave}
          disabled={!palette?.name || !colors.length}
        >
          Save Palette
        </button>
      </div>

      <style>{`
        .add-palette-form {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-header h5 {
          margin: 0;
          font-size: 14px;
        }

        .close-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          background: var(--bg-quaternary, #1a1a1a);
          border: none;
          border-radius: 50%;
          color: var(--text-secondary, #888);
          font-size: 18px;
          cursor: pointer;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary, #888);
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 8px 12px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .palette-preview {
          display: flex;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .preview-swatch {
          flex: 1;
          min-width: 40px;
        }

        .colors-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .color-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-row input[type="color"] {
          width: 40px;
          height: 36px;
          padding: 2px;
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          cursor: pointer;
        }

        .color-row .hex-input {
          width: 90px;
          padding: 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-family: monospace;
          font-size: 12px;
        }

        .color-row .name-input {
          flex: 1;
          padding: 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 12px;
        }

        .color-row .role-select {
          width: 100px;
          padding: 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 11px;
        }

        .color-row .var-input {
          width: 110px;
          padding: 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-family: monospace;
          font-size: 11px;
        }

        .remove-color-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-muted, #666);
          cursor: pointer;
        }

        .remove-color-btn:hover {
          background: var(--error-color, #e74c3c);
          border-color: var(--error-color, #e74c3c);
          color: white;
        }

        .add-color-btn {
          width: 100%;
          padding: 10px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px dashed var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 13px;
        }

        .add-color-btn:hover {
          border-color: var(--accent-color, #667eea);
          color: var(--accent-color, #667eea);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        .cancel-btn, .save-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid var(--border-color, #333);
          color: var(--text-secondary, #888);
        }

        .save-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          color: white;
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// CODE PREVIEW COMPONENT
// ============================================================================

function CodePreview({ code, type }: { code: string; type: SnippetType }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    let html = '';

    if (type === 'css' || type === 'scss' || type === 'styled-components') {
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box; }
              .preview-element { padding: 16px 32px; background: #667eea; color: white; border-radius: 8px; font-family: sans-serif; }
              ${code}
            </style>
          </head>
          <body>
            <div class="preview-element">Preview Element</div>
          </body>
        </html>
      `;
    } else if (type === 'html' || type === 'svg') {
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; background: #1a1a1a; color: white; font-family: sans-serif; }
            </style>
          </head>
          <body>${code}</body>
        </html>
      `;
    } else if (type === 'gradient') {
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; width: 100%; height: 100vh; background: ${code}; }
            </style>
          </head>
          <body></body>
        </html>
      `;
    } else if (type === 'animation' || type === 'effect') {
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; background: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              .animated { padding: 20px 40px; background: #667eea; color: white; border-radius: 8px; font-family: sans-serif; }
              ${code}
            </style>
          </head>
          <body>
            <div class="animated">Animated Element</div>
          </body>
        </html>
      `;
    } else if (type === 'color-palette') {
      // Extract colors from CSS variables
      const colorMatches = code.match(/#[0-9A-Fa-f]{3,8}/g) || [];
      const colorDivs = colorMatches.map(c => `<div style="flex:1;background:${c}"></div>`).join('');
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; height: 100vh; display: flex; }
            </style>
          </head>
          <body>${colorDivs}</body>
        </html>
      `;
    } else {
      html = `
        <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; background: #1a1a1a; color: #888; font-family: monospace; white-space: pre-wrap; }
            </style>
          </head>
          <body>${escapeHtml(code)}</body>
        </html>
      `;
    }

    doc.open();
    doc.write(html);
    doc.close();
  }, [code, type]);

  return (
    <div className="code-preview-container">
      <iframe
        ref={iframeRef}
        title="Code Preview"
        sandbox="allow-same-origin"
      />
      <style>{`
        .code-preview-container {
          border-radius: 6px;
          overflow: hidden;
          background: #1a1a1a;
        }

        .code-preview-container iframe {
          width: 100%;
          height: 200px;
          border: none;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// PREVIEW MODAL
// ============================================================================

function PreviewModal({ snippet, onClose }: { snippet: StyleSnippet; onClose: () => void }) {
  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{snippet.name}</h4>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {/* Live Preview */}
          <div className="preview-section">
            <h5>Live Preview</h5>
            <div
              className="live-preview"
              style={{ backgroundColor: snippet.previewSettings?.backgroundColor || '#1a1a1a' }}
            >
              <CodePreview code={snippet.code} type={snippet.type} />
            </div>
          </div>

          {/* Color Palette Display */}
          {snippet.colorPalette && (
            <div className="palette-section">
              <h5>Color Palette</h5>
              <div className="palette-colors">
                {snippet.colorPalette.colors.map((color, i) => (
                  <div key={i} className="palette-color">
                    <div className="color-swatch" style={{ backgroundColor: color.hex }} />
                    <div className="color-info">
                      <span className="color-hex">{color.hex}</span>
                      {color.name && <span className="color-name">{color.name}</span>}
                      {color.cssVar && <code className="color-var">{color.cssVar}</code>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Display */}
          <div className="code-section">
            <div className="code-header">
              <h5>Code</h5>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(snippet.code)}
              >
                📋 Copy
              </button>
            </div>
            <pre className="code-display">{snippet.code}</pre>
          </div>

          {/* Metadata */}
          <div className="meta-section">
            <span className="type-badge">{snippet.type}</span>
            {snippet.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {snippet.source && (
              <a href={snippet.source} target="_blank" rel="noopener noreferrer" className="source-link">
                View Source →
              </a>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .preview-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .preview-modal {
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color, #333);
        }

        .modal-header h4 {
          margin: 0;
          font-size: 16px;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          padding: 0;
          background: var(--bg-tertiary, #252525);
          border: none;
          border-radius: 50%;
          color: var(--text-secondary, #888);
          font-size: 20px;
          cursor: pointer;
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .preview-section, .palette-section, .code-section {
          margin-bottom: 20px;
        }

        .preview-section h5, .palette-section h5, .code-section h5 {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .live-preview {
          border-radius: 8px;
          overflow: hidden;
          min-height: 200px;
        }

        .palette-colors {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .palette-color {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 6px;
        }

        .color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .color-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .color-hex {
          font-family: monospace;
          font-size: 13px;
        }

        .color-name {
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .color-var {
          font-size: 11px;
          color: var(--accent-color, #667eea);
          background: var(--bg-quaternary, #1a1a1a);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .code-header h5 {
          margin: 0;
        }

        .copy-btn {
          padding: 6px 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 12px;
        }

        .copy-btn:hover {
          background: var(--accent-color, #667eea);
          border-color: var(--accent-color, #667eea);
          color: white;
        }

        .code-display {
          margin: 0;
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          font-family: 'Fira Code', monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre-wrap;
          color: var(--text-secondary, #888);
        }

        .meta-section {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .type-badge {
          padding: 4px 10px;
          background: var(--accent-color, #667eea);
          border-radius: 4px;
          font-size: 11px;
          color: white;
          text-transform: uppercase;
        }

        .tag {
          padding: 4px 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary, #888);
        }

        .source-link {
          margin-left: auto;
          font-size: 12px;
          color: var(--accent-color, #667eea);
          text-decoration: none;
        }

        .source-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SNIPPET CARD COMPONENT
// ============================================================================

interface SnippetCardProps {
  snippet: StyleSnippet;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

function SnippetCard({ snippet, isSelected, onToggleSelect, onDelete, onPreview }: SnippetCardProps) {
  const typeInfo = SNIPPET_TYPES.find(t => t.value === snippet.type);

  return (
    <div className={`snippet-card ${isSelected ? 'selected' : ''}`}>
      {/* Color Preview for palettes */}
      {snippet.colors && snippet.colors.length > 0 && (
        <div className="color-preview">
          {snippet.colors.slice(0, 6).map((color, i) => (
            <div
              key={i}
              className="color-bar"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="snippet-header">
        <div className="snippet-info">
          <h5 className="snippet-name">{snippet.name}</h5>
          <span className="snippet-type">
            {typeInfo?.icon} {typeInfo?.label || snippet.type}
          </span>
        </div>

        <div className="snippet-actions">
          <button
            className="preview-btn"
            onClick={onPreview}
            title="Preview"
          >
            👁️
          </button>
          <button
            className={`select-btn ${isSelected ? 'selected' : ''}`}
            onClick={onToggleSelect}
            title={isSelected ? 'Deselect' : 'Select for generation'}
          >
            {isSelected ? '✓' : '+'}
          </button>
          <button
            className="delete-btn"
            onClick={onDelete}
            title="Delete snippet"
          >
            ×
          </button>
        </div>
      </div>

      {/* Mini Code Preview */}
      <div className="code-preview-mini">
        <pre>{snippet.code.slice(0, 150)}{snippet.code.length > 150 ? '...' : ''}</pre>
      </div>

      {/* Tags */}
      {snippet.tags.length > 0 && (
        <div className="snippet-tags">
          {snippet.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <style>{`
        .snippet-card {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: border-color 0.2s;
        }

        .snippet-card.selected {
          border-color: var(--accent-color, #667eea);
        }

        .color-preview {
          display: flex;
          height: 6px;
        }

        .color-bar {
          flex: 1;
        }

        .snippet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 12px;
        }

        .snippet-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .snippet-name {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
        }

        .snippet-type {
          font-size: 10px;
          color: var(--text-muted, #666);
        }

        .snippet-actions {
          display: flex;
          gap: 4px;
        }

        .select-btn, .delete-btn, .preview-btn {
          width: 24px;
          height: 24px;
          padding: 0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .preview-btn {
          background: var(--bg-quaternary, #1a1a1a);
          color: var(--text-secondary, #888);
        }

        .preview-btn:hover {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .select-btn {
          background: var(--bg-quaternary, #1a1a1a);
          color: var(--text-secondary, #888);
        }

        .select-btn.selected {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .delete-btn {
          background: transparent;
          color: var(--text-muted, #666);
        }

        .delete-btn:hover {
          background: var(--error-color, #e74c3c);
          color: white;
        }

        .code-preview-mini {
          padding: 0 12px;
        }

        .code-preview-mini pre {
          margin: 0;
          padding: 10px;
          background: var(--bg-quaternary, #1a1a1a);
          border-radius: 6px;
          font-family: 'Fira Code', monospace;
          font-size: 10px;
          line-height: 1.4;
          color: var(--text-muted, #666);
          overflow: hidden;
          max-height: 70px;
          white-space: pre-wrap;
        }

        .snippet-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 10px 12px;
        }

        .tag {
          padding: 2px 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-secondary, #888);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function extractColors(code: string): string[] {
  const colors: string[] = [];

  // Extract hex colors
  const hexMatches = code.match(/#[0-9A-Fa-f]{3,8}/g);
  if (hexMatches) colors.push(...hexMatches);

  // Extract rgb/rgba colors
  const rgbMatches = code.match(/rgba?\([^)]+\)/g);
  if (rgbMatches) colors.push(...rgbMatches);

  // Extract hsl/hsla colors
  const hslMatches = code.match(/hsla?\([^)]+\)/g);
  if (hslMatches) colors.push(...hslMatches);

  // Remove duplicates and limit
  return [...new Set(colors)].slice(0, 10);
}

function getPlaceholderForType(type: SnippetType): string {
  switch (type) {
    case 'css':
      return '.element {\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  border-radius: 8px;\n  box-shadow: 0 4px 15px rgba(0,0,0,0.2);\n}';
    case 'tailwind':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-xl hover:scale-105 transition-transform';
    case 'animation':
      return '@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(10px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.animated {\n  animation: fadeIn 0.3s ease-out;\n}';
    case 'effect':
      return '.hover-effect {\n  transition: all 0.3s ease;\n}\n\n.hover-effect:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 10px 20px rgba(0,0,0,0.2);\n}';
    case 'gradient':
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    case 'html':
      return '<div class="card">\n  <h2>Title</h2>\n  <p>Content here...</p>\n</div>';
    case 'javascript':
    case 'typescript':
      return 'const animate = (element) => {\n  element.classList.add("active");\n  setTimeout(() => {\n    element.classList.remove("active");\n  }, 300);\n};';
    case 'svg':
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">\n  <circle cx="12" cy="12" r="10" />\n</svg>';
    default:
      return 'Paste your code here...';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default StyleGalleryPanel;
