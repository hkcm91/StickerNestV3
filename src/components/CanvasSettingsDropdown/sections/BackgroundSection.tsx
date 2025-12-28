/**
 * StickerNest v2 - Background Section
 * Background image upload and settings
 */

import React, { useState, useCallback, useRef } from 'react';
import { useCanvasAppearanceStore } from '../../../state/useCanvasAppearanceStore';
import { SNIcon } from '../../../shared-ui/SNIcon';
import { SNToggle } from '../../../shared-ui/SNToggle';
import { SNSlider } from '../../../shared-ui/SNSlider';

export const BackgroundSection: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const background = useCanvasAppearanceStore((s) => s.background);
  const setBackground = useCanvasAppearanceStore((s) => s.setBackground);
  const setBackgroundImage = useCanvasAppearanceStore((s) => s.setBackgroundImage);
  const removeBackgroundImage = useCanvasAppearanceStore((s) => s.removeBackgroundImage);

  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBackgroundImage(result);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(file);
  }, [setBackgroundImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return;

    try {
      new URL(urlInput);
      setBackgroundImage(urlInput.trim());
      setUrlInput('');
      setError(null);
    } catch {
      setError('Please enter a valid URL');
    }
  }, [urlInput, setBackgroundImage]);

  const handleRemove = useCallback(() => {
    removeBackgroundImage();
    setError(null);
  }, [removeBackgroundImage]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image', { type: imageType });
          handleFileSelect(file);
          return;
        }
      }
      setError('No image found in clipboard');
    } catch {
      setError('Failed to read clipboard');
    }
  }, [handleFileSelect]);

  const handleOpacityChange = useCallback((opacity: number) => {
    setBackground({ imageOpacity: opacity });
  }, [setBackground]);

  const handleBlurChange = useCallback((blur: number) => {
    setBackground({ imageBlur: blur });
  }, [setBackground]);

  const handleFixedToggle = useCallback((fixed: boolean) => {
    setBackground({ imageFixed: fixed });
  }, [setBackground]);

  return (
    <div style={styles.container}>
      {/* Current Background Preview */}
      {background.imageUrl && (
        <div style={styles.preview}>
          <div
            style={{
              ...styles.previewImage,
              backgroundImage: `url(${background.imageUrl})`,
              opacity: background.imageOpacity / 100,
              filter: background.imageBlur > 0 ? `blur(${background.imageBlur}px)` : 'none',
            }}
          />
          <button onClick={handleRemove} style={styles.removeButton}>
            <SNIcon name="trash" size="sm" />
            Remove
          </button>
        </div>
      )}

      {/* Upload Zone */}
      {!background.imageUrl && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...styles.dropZone,
            borderColor: dragOver
              ? 'var(--sn-accent-primary)'
              : 'var(--sn-border-secondary)',
            background: dragOver
              ? 'rgba(139, 92, 246, 0.1)'
              : 'var(--sn-bg-tertiary)',
          }}
        >
          <SNIcon name="upload" size="lg" color="var(--sn-text-muted)" />
          <span style={styles.dropText}>
            Drop image here or click to upload
          </span>
          <span style={styles.dropHint}>
            PNG, JPG, WebP up to 10MB
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {/* URL Input */}
      <div style={styles.urlSection}>
        <span style={styles.label}>Or paste URL</span>
        <div style={styles.urlInputWrapper}>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            style={styles.urlInput}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <button onClick={handleUrlSubmit} style={styles.urlButton}>
            <SNIcon name="check" size="sm" />
          </button>
        </div>
      </div>

      {/* Paste from Clipboard */}
      <button onClick={handlePaste} style={styles.pasteButton}>
        <SNIcon name="paste" size="sm" />
        Paste from Clipboard
      </button>

      {/* Error Message */}
      {error && (
        <div style={styles.error}>
          <SNIcon name="alertCircle" size="sm" />
          {error}
        </div>
      )}

      {/* Image Settings */}
      {background.imageUrl && (
        <div style={styles.settings}>
          <div style={styles.divider} />

          <SNSlider
            value={background.imageOpacity}
            min={0}
            max={100}
            step={5}
            label="Opacity"
            showValue
            formatValue={(v) => `${v}%`}
            onChange={handleOpacityChange}
            size="sm"
          />

          <SNSlider
            value={background.imageBlur}
            min={0}
            max={20}
            step={1}
            label="Blur"
            showValue
            formatValue={(v) => `${v}px`}
            onChange={handleBlurChange}
            size="sm"
          />

          <SNToggle
            checked={background.imageFixed}
            onChange={handleFixedToggle}
            label="Fixed Position"
            size="sm"
          />
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  preview: {
    position: 'relative',
    width: '100%',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid var(--sn-border-secondary)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  removeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 500,
    background: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 8,
    border: '2px dashed',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dropText: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--sn-text-primary)',
  },
  dropHint: {
    fontSize: 10,
    color: 'var(--sn-text-muted)',
  },
  urlSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
  },
  urlInputWrapper: {
    display: 'flex',
    gap: 6,
  },
  urlInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 12,
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 6,
    color: 'var(--sn-text-primary)',
    outline: 'none',
  },
  urlButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    background: 'var(--sn-accent-primary)',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  pasteButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '8px 12px',
    fontSize: 12,
    fontWeight: 500,
    background: 'var(--sn-bg-tertiary)',
    color: 'var(--sn-text-secondary)',
    border: '1px solid var(--sn-border-secondary)',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    fontSize: 11,
    background: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--sn-error)',
    borderRadius: 6,
  },
  settings: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  divider: {
    height: 1,
    background: 'var(--sn-border-secondary)',
    margin: '4px 0',
  },
};

export default BackgroundSection;
