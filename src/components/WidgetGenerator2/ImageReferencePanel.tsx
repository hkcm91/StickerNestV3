/**
 * Widget Generator 2.0 - Image Reference Panel
 *
 * Allows users to upload, paste, or link images to guide AI generation.
 * Features:
 * - Drag & drop upload
 * - Paste from clipboard
 * - URL import
 * - Image analysis preview
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageReference, ImageAnalysis } from '../../services/enhancedAIGenerator';
import {
  createImageReferenceFromFile,
  createImageReferenceFromUrl,
  createImageReferenceFromPaste,
  analyzeImage
} from '../../services/enhancedAIGenerator';

interface ImageReferencePanelProps {
  images: ImageReference[];
  onImagesChange: (images: ImageReference[]) => void;
  maxImages?: number;
}

export function ImageReferencePanel({
  images,
  onImagesChange,
  maxImages = 5
}: ImageReferencePanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const newImages: ImageReference[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (images.length + newImages.length >= maxImages) break;

      const dataUrl = await readFileAsDataUrl(file);
      const imageRef = createImageReferenceFromFile(file, dataUrl);
      newImages.push(imageRef);
    }

    if (newImages.length > 0) {
      const updated = [...images, ...newImages];
      onImagesChange(updated);

      // Analyze images
      for (const img of newImages) {
        analyzeImageAsync(img);
      }
    }
  }, [images, maxImages, onImagesChange]);

  // Handle URL import
  const handleUrlImport = useCallback(() => {
    if (!urlInput.trim()) return;
    if (images.length >= maxImages) return;

    const imageRef = createImageReferenceFromUrl(urlInput.trim());
    onImagesChange([...images, imageRef]);
    setUrlInput('');

    analyzeImageAsync(imageRef);
  }, [urlInput, images, maxImages, onImagesChange]);

  // Handle paste
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file && images.length < maxImages) {
            const dataUrl = await readFileAsDataUrl(file);
            const imageRef = createImageReferenceFromPaste(dataUrl);
            onImagesChange([...images, imageRef]);
            analyzeImageAsync(imageRef);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [images, maxImages, onImagesChange]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  // Remove image
  const removeImage = useCallback((id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  }, [images, onImagesChange]);

  // Analyze image async
  const analyzeImageAsync = async (image: ImageReference) => {
    setIsAnalyzing(image.id);
    try {
      const analysis = await analyzeImage(image);
      image.analyzedFeatures = analysis;
      onImagesChange([...images]); // Trigger re-render
    } catch (error) {
      console.error('Image analysis failed:', error);
    } finally {
      setIsAnalyzing(null);
    }
  };

  return (
    <div className="image-reference-panel">
      <div className="panel-header">
        <h4>
          <span className="header-icon">🖼️</span>
          Image References
        </h4>
        <span className="image-count">{images.length}/{maxImages}</span>
      </div>

      <p className="panel-description">
        Upload or paste images to guide the visual design. The AI will analyze
        colors, layout, and elements to inform generation.
      </p>

      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${images.length >= maxImages ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          style={{ display: 'none' }}
        />

        <div className="drop-content">
          <span className="drop-icon">📤</span>
          <span className="drop-text">
            {isDragOver ? 'Drop images here' : 'Click or drag images here'}
          </span>
          <span className="drop-hint">
            Supports PNG, JPG, GIF • Max {maxImages} images
          </span>
        </div>
      </div>

      {/* URL Import */}
      <div className="url-import">
        <input
          type="url"
          placeholder="Or paste image URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
          disabled={images.length >= maxImages}
        />
        <button
          onClick={handleUrlImport}
          disabled={!urlInput.trim() || images.length >= maxImages}
        >
          Add
        </button>
      </div>

      {/* Paste Hint */}
      <div className="paste-hint">
        <span className="hint-icon">💡</span>
        <span>Pro tip: Press Ctrl+V (Cmd+V) to paste images from clipboard</span>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="image-grid">
          {images.map(image => (
            <div key={image.id} className="image-card">
              <div className="image-preview">
                <img
                  src={image.data}
                  alt={image.name || 'Reference image'}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" fill="%23888">Error</text></svg>';
                  }}
                />
                {isAnalyzing === image.id && (
                  <div className="analyzing-overlay">
                    <span className="spinner">🔄</span>
                    <span>Analyzing...</span>
                  </div>
                )}
                <button
                  className="remove-btn"
                  onClick={() => removeImage(image.id)}
                  title="Remove image"
                >
                  ×
                </button>
              </div>

              {image.analyzedFeatures && (
                <ImageAnalysisDisplay analysis={image.analyzedFeatures} />
              )}

              <div className="image-meta">
                <span className="image-type">{image.type}</span>
                {image.name && <span className="image-name">{image.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .image-reference-panel {
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

        .header-icon {
          font-size: 18px;
        }

        .image-count {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .panel-description {
          margin: 0 0 16px;
          font-size: 13px;
          color: var(--text-secondary, #888);
        }

        .drop-zone {
          padding: 32px;
          border: 2px dashed var(--border-color, #333);
          border-radius: 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .drop-zone:hover:not(.disabled) {
          border-color: var(--accent-color, #667eea);
          background: rgba(102, 126, 234, 0.1);
        }

        .drop-zone.drag-over {
          border-color: var(--accent-color, #667eea);
          background: rgba(102, 126, 234, 0.2);
        }

        .drop-zone.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .drop-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .drop-icon {
          font-size: 32px;
        }

        .drop-text {
          font-size: 14px;
          color: var(--text-primary, #fff);
        }

        .drop-hint {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .url-import {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .url-import input {
          flex: 1;
          padding: 10px 14px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .url-import input:focus {
          outline: none;
          border-color: var(--accent-color, #667eea);
        }

        .url-import button {
          padding: 10px 20px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          cursor: pointer;
        }

        .url-import button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .paste-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .hint-icon {
          font-size: 14px;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .image-card {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          overflow: hidden;
        }

        .image-preview {
          position: relative;
          aspect-ratio: 16/10;
          overflow: hidden;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .analyzing-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-size: 12px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .remove-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          padding: 0;
          background: rgba(231, 76, 60, 0.9);
          border: none;
          border-radius: 50%;
          color: white;
          font-size: 16px;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .image-card:hover .remove-btn {
          opacity: 1;
        }

        .image-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: var(--text-muted, #666);
        }

        .image-type {
          padding: 2px 6px;
          background: var(--bg-quaternary, #1a1a1a);
          border-radius: 4px;
          text-transform: uppercase;
        }

        .image-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// IMAGE ANALYSIS DISPLAY
// ============================================================================

function ImageAnalysisDisplay({ analysis }: { analysis: ImageAnalysis }) {
  return (
    <div className="analysis-display">
      {/* Color Palette */}
      <div className="analysis-row">
        <span className="analysis-label">Colors:</span>
        <div className="color-palette">
          {analysis.colors.slice(0, 5).map((color, i) => (
            <div
              key={i}
              className="color-swatch"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Layout & Style */}
      <div className="analysis-row">
        <span className="analysis-tag">{analysis.layout}</span>
        <span className="analysis-tag">{analysis.style}</span>
      </div>

      {/* Elements */}
      <div className="analysis-row">
        <span className="analysis-label">Elements:</span>
        <span className="element-count">{analysis.elements.length} detected</span>
      </div>

      <style>{`
        .analysis-display {
          padding: 8px 12px;
          border-top: 1px solid var(--border-color, #333);
        }

        .analysis-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .analysis-row:last-child {
          margin-bottom: 0;
        }

        .analysis-label {
          font-size: 11px;
          color: var(--text-muted, #666);
        }

        .color-palette {
          display: flex;
          gap: 4px;
        }

        .color-swatch {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .analysis-tag {
          padding: 2px 6px;
          background: var(--accent-color, #667eea);
          border-radius: 4px;
          font-size: 10px;
          color: white;
          text-transform: capitalize;
        }

        .element-count {
          font-size: 11px;
          color: var(--text-secondary, #888);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default ImageReferencePanel;
