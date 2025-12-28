/**
 * StickerNest v2 - SEO Meta Fields
 * Form fields for editing SEO metadata in publish dialog
 *
 * ALPHA NOTES:
 * - Provides real-time character count for title/description
 * - Shows previews of how content will appear in search/social
 */

import React, { useCallback } from 'react';
import { SNInput } from '../../shared-ui/SNInput';
import { SNIcon } from '../../shared-ui/SNIcon';
import type { CanvasSEOMetadata } from '../../types/publish';

interface SEOMetaFieldsProps {
  /** Current SEO settings */
  seo: CanvasSEOMetadata | undefined;
  /** Canvas name (used as default title) */
  canvasName: string;
  /** Callback when SEO changes */
  onChange: (updates: Partial<CanvasSEOMetadata>) => void;
  /** Callback to reset to defaults */
  onReset?: () => void;
}

export const SEOMetaFields: React.FC<SEOMetaFieldsProps> = ({
  seo = {},
  canvasName,
  onChange,
  onReset,
}) => {
  // Character limits for SEO fields
  const TITLE_LIMIT = 60;
  const DESCRIPTION_LIMIT = 160;

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ title: e.target.value });
  }, [onChange]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ description: e.target.value });
  }, [onChange]);

  const handleKeywordsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
    onChange({ keywords });
  }, [onChange]);

  const handleTwitterCreatorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove @ if user includes it
    const value = e.target.value.replace('@', '');
    onChange({ twitterCreator: value });
  }, [onChange]);

  const handleIndexingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ allowIndexing: e.target.checked });
  }, [onChange]);

  const handleTwitterCardChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ twitterCard: e.target.value as CanvasSEOMetadata['twitterCard'] });
  }, [onChange]);

  // Display values with defaults
  const displayTitle = seo.title || canvasName || '';
  const displayDescription = seo.description || '';
  const displayKeywords = (seo.keywords || []).join(', ');

  return (
    <div style={styles.container}>
      {/* Section Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <SNIcon name="search" size="sm" />
          <span>Search Engine Optimization</span>
        </div>
        {onReset && (
          <button onClick={onReset} style={styles.resetButton}>
            Reset to defaults
          </button>
        )}
      </div>

      {/* Title */}
      <div style={styles.field}>
        <div style={styles.fieldHeader}>
          <label style={styles.label}>Page Title</label>
          <span style={{
            ...styles.charCount,
            color: displayTitle.length > TITLE_LIMIT ? 'var(--sn-error)' : 'var(--sn-text-tertiary)',
          }}>
            {displayTitle.length}/{TITLE_LIMIT}
          </span>
        </div>
        <SNInput
          value={seo.title || ''}
          onChange={handleTitleChange}
          placeholder={canvasName || 'Enter page title'}
          fullWidth
          helperText="Shown in browser tabs and search results"
        />
      </div>

      {/* Description */}
      <div style={styles.field}>
        <div style={styles.fieldHeader}>
          <label style={styles.label}>Description</label>
          <span style={{
            ...styles.charCount,
            color: displayDescription.length > DESCRIPTION_LIMIT ? 'var(--sn-warning)' : 'var(--sn-text-tertiary)',
          }}>
            {displayDescription.length}/{DESCRIPTION_LIMIT}
          </span>
        </div>
        <textarea
          value={seo.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Brief description for search engines and social sharing..."
          style={styles.textarea}
          rows={3}
        />
        <span style={styles.helperText}>
          Appears in search results and when shared on social media
        </span>
      </div>

      {/* Keywords */}
      <div style={styles.field}>
        <label style={styles.label}>Keywords</label>
        <SNInput
          value={displayKeywords}
          onChange={handleKeywordsChange}
          placeholder="canvas, interactive, design"
          fullWidth
          helperText="Comma-separated keywords (optional)"
        />
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Social Section Header */}
      <div style={styles.sectionHeader}>
        <SNIcon name="share" size="sm" />
        <span>Social Sharing</span>
      </div>

      {/* Twitter Card Type */}
      <div style={styles.field}>
        <label style={styles.label}>Twitter Card Type</label>
        <select
          value={seo.twitterCard || 'summary_large_image'}
          onChange={handleTwitterCardChange}
          style={styles.select}
        >
          <option value="summary">Summary (small image)</option>
          <option value="summary_large_image">Large Image (recommended)</option>
          <option value="player">Player (for interactive content)</option>
        </select>
      </div>

      {/* Twitter Creator */}
      <div style={styles.field}>
        <label style={styles.label}>Twitter Creator</label>
        <SNInput
          value={seo.twitterCreator || ''}
          onChange={handleTwitterCreatorChange}
          placeholder="username"
          leftElement={<span style={{ color: 'var(--sn-text-tertiary)' }}>@</span>}
          fullWidth
          helperText="Your Twitter handle (optional)"
        />
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Advanced Section */}
      <div style={styles.sectionHeader}>
        <SNIcon name="settings" size="sm" />
        <span>Advanced</span>
      </div>

      {/* Allow Indexing */}
      <div style={styles.checkboxField}>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={seo.allowIndexing !== false}
            onChange={handleIndexingChange}
            style={styles.checkbox}
          />
          <span>Allow search engines to index this page</span>
        </label>
        <span style={styles.helperText}>
          Disable if you want the page to stay private from search
        </span>
      </div>

      {/* Search Preview */}
      <div style={styles.preview}>
        <div style={styles.previewTitle}>Search Preview</div>
        <div style={styles.previewCard}>
          <div style={styles.previewUrl}>
            stickernest.app › c › your-slug
          </div>
          <div style={styles.previewHeadline}>
            {displayTitle || 'Untitled Canvas'}
          </div>
          <div style={styles.previewDescription}>
            {displayDescription || 'No description provided. Add a description to improve how your page appears in search results.'}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--sn-text-primary)',
    fontWeight: 600,
    fontSize: 14,
  },
  resetButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--sn-text-tertiary)',
    fontSize: 12,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--sn-text-secondary)',
    fontWeight: 500,
    fontSize: 13,
    marginTop: 8,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
  },
  charCount: {
    fontSize: 11,
  },
  textarea: {
    background: 'var(--sn-bg-primary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    padding: '10px 12px',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    resize: 'vertical',
    minHeight: 60,
    fontFamily: 'inherit',
    outline: 'none',
  },
  select: {
    background: 'var(--sn-bg-primary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 'var(--sn-radius-md)',
    padding: '10px 12px',
    color: 'var(--sn-text-primary)',
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
  },
  helperText: {
    fontSize: 11,
    color: 'var(--sn-text-tertiary)',
  },
  divider: {
    height: 1,
    background: 'var(--sn-border-primary)',
    margin: '8px 0',
  },
  checkboxField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--sn-text-primary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--sn-accent-primary)',
  },
  preview: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sn-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  previewCard: {
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-md)',
    padding: 12,
    border: '1px solid var(--sn-border-primary)',
  },
  previewUrl: {
    fontSize: 12,
    color: '#1a73e8',
    marginBottom: 2,
  },
  previewHeadline: {
    fontSize: 18,
    color: '#1a0dab',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  previewDescription: {
    fontSize: 13,
    color: '#545454',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
};

export default SEOMetaFields;
