/**
 * StickerNest v2 - Thumbnail Upload Modal
 * Upload and crop canvas thumbnails with preview
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { SNIconButton } from '../shared-ui/SNIconButton';

interface ThumbnailUploadModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Save thumbnail callback */
  onSave: (thumbnailDataUrl: string) => Promise<void>;
  /** Canvas ID for screenshot option */
  canvasId?: string;
  /** Current thumbnail URL */
  currentThumbnail?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ThumbnailUploadModal: React.FC<ThumbnailUploadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  canvasId,
  currentThumbnail,
}) => {
  const [image, setImage] = useState<string | null>(currentThumbnail || null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | 'free'>('16:9');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (currentThumbnail && !image) {
      setImage(currentThumbnail);
    }
  }, [currentThumbnail, image]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      // Reset crop area when new image loaded
      setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCaptureCanvas = useCallback(async () => {
    if (!canvasId) return;

    try {
      // Find the canvas element
      const canvasElement = document.querySelector(`[data-canvas-id="${canvasId}"]`) as HTMLCanvasElement;
      if (!canvasElement) {
        // Try to find any canvas on the page
        const anyCanvas = document.querySelector('canvas');
        if (anyCanvas) {
          const dataUrl = anyCanvas.toDataURL('image/png');
          setImage(dataUrl);
          setCropArea({ x: 0, y: 0, width: 100, height: 100 });
        } else {
          alert('Could not find canvas to capture');
        }
        return;
      }

      const dataUrl = canvasElement.toDataURL('image/png');
      setImage(dataUrl);
      setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    } catch (err) {
      console.error('Failed to capture canvas:', err);
      alert('Failed to capture canvas screenshot');
    }
  }, [canvasId]);

  const getCroppedImage = useCallback((): string | null => {
    if (!imageRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    // Set canvas size for output (fixed to 800x450 for 16:9 or 800x800 for 1:1)
    const outputWidth = aspectRatio === '1:1' ? 800 : 800;
    const outputHeight = aspectRatio === '1:1' ? 800 : 450;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Calculate crop dimensions in source image coordinates
    const cropX = (cropArea.x / 100) * img.naturalWidth;
    const cropY = (cropArea.y / 100) * img.naturalHeight;
    const cropWidth = (cropArea.width / 100) * img.naturalWidth;
    const cropHeight = (cropArea.height / 100) * img.naturalHeight;

    // Draw cropped image
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  }, [cropArea, aspectRatio]);

  const handleSave = async () => {
    const croppedImage = getCroppedImage();
    if (!croppedImage) {
      alert('Please select an image first');
      return;
    }

    setSaving(true);
    try {
      await onSave(croppedImage);
      onClose();
    } catch (err) {
      console.error('Failed to save thumbnail:', err);
      alert('Failed to save thumbnail');
    } finally {
      setSaving(false);
    }
  };

  const updateCropArea = (updates: Partial<CropArea>) => {
    setCropArea(prev => {
      const newArea = { ...prev, ...updates };

      // Ensure within bounds
      newArea.x = Math.max(0, Math.min(100 - newArea.width, newArea.x));
      newArea.y = Math.max(0, Math.min(100 - newArea.height, newArea.y));

      // Apply aspect ratio constraint if not free
      if (aspectRatio === '16:9') {
        const targetHeight = (newArea.width * 9) / 16;
        if (targetHeight <= 100 - newArea.y) {
          newArea.height = targetHeight;
        } else {
          newArea.height = 100 - newArea.y;
          newArea.width = (newArea.height * 16) / 9;
        }
      } else if (aspectRatio === '1:1') {
        newArea.height = newArea.width;
      }

      return newArea;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Upload Thumbnail</h2>
          <SNIconButton
            icon="x"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        <div style={styles.content}>
          {/* Upload Options */}
          {!image && (
            <div style={styles.uploadSection}>
              <div style={styles.uploadOptions}>
                <SNButton
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <SNIcon name="upload" size="sm" />
                  Upload Image
                </SNButton>

                {canvasId && (
                  <SNButton
                    variant="secondary"
                    onClick={handleCaptureCanvas}
                  >
                    <SNIcon name="camera" size="sm" />
                    Capture Canvas
                  </SNButton>
                )}
              </div>

              <p style={styles.uploadHint}>
                Upload a custom image or capture your current canvas
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Image Preview and Crop */}
          {image && (
            <>
              <div style={styles.toolbarSection}>
                <div style={styles.aspectRatioButtons}>
                  <span style={styles.label}>Aspect Ratio:</span>
                  <button
                    style={{
                      ...styles.aspectButton,
                      ...(aspectRatio === '16:9' ? styles.aspectButtonActive : {}),
                    }}
                    onClick={() => setAspectRatio('16:9')}
                  >
                    16:9
                  </button>
                  <button
                    style={{
                      ...styles.aspectButton,
                      ...(aspectRatio === '1:1' ? styles.aspectButtonActive : {}),
                    }}
                    onClick={() => setAspectRatio('1:1')}
                  >
                    1:1
                  </button>
                  <button
                    style={{
                      ...styles.aspectButton,
                      ...(aspectRatio === 'free' ? styles.aspectButtonActive : {}),
                    }}
                    onClick={() => setAspectRatio('free')}
                  >
                    Free
                  </button>
                </div>

                <SNButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImage(null);
                    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
                  }}
                >
                  <SNIcon name="upload" size="sm" />
                  Change Image
                </SNButton>
              </div>

              <div style={styles.previewSection}>
                <div style={styles.imageContainer}>
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Preview"
                    style={styles.image}
                    draggable={false}
                  />

                  {/* Crop overlay */}
                  <div
                    style={{
                      ...styles.cropOverlay,
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`,
                    }}
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      setDragStart({
                        x: e.clientX - (cropArea.x / 100) * e.currentTarget.parentElement!.clientWidth,
                        y: e.clientY - (cropArea.y / 100) * e.currentTarget.parentElement!.clientHeight,
                      });
                      e.preventDefault();
                    }}
                  >
                    <div style={styles.cropBorder} />

                    {/* Resize handles */}
                    <div
                      style={{ ...styles.resizeHandle, ...styles.resizeHandleSE }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Resize logic would go here
                      }}
                    />
                  </div>
                </div>

                {/* Hidden canvas for cropping */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              {/* Crop controls */}
              <div style={styles.controls}>
                <div style={styles.controlRow}>
                  <label style={styles.controlLabel}>Position X:</label>
                  <input
                    type="range"
                    min="0"
                    max={100 - cropArea.width}
                    value={cropArea.x}
                    onChange={(e) => updateCropArea({ x: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <span style={styles.controlValue}>{Math.round(cropArea.x)}%</span>
                </div>

                <div style={styles.controlRow}>
                  <label style={styles.controlLabel}>Position Y:</label>
                  <input
                    type="range"
                    min="0"
                    max={100 - cropArea.height}
                    value={cropArea.y}
                    onChange={(e) => updateCropArea({ y: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <span style={styles.controlValue}>{Math.round(cropArea.y)}%</span>
                </div>

                <div style={styles.controlRow}>
                  <label style={styles.controlLabel}>Size:</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={cropArea.width}
                    onChange={(e) => updateCropArea({ width: Number(e.target.value) })}
                    style={styles.slider}
                  />
                  <span style={styles.controlValue}>{Math.round(cropArea.width)}%</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <SNButton variant="ghost" onClick={onClose}>
            Cancel
          </SNButton>
          <SNButton
            variant="primary"
            onClick={handleSave}
            disabled={!image || saving}
          >
            {saving ? 'Saving...' : 'Save Thumbnail'}
          </SNButton>
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9998,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    background: 'rgba(30, 30, 46, 0.98)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  content: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    textAlign: 'center',
  },
  uploadOptions: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  uploadHint: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    background: 'rgba(15, 15, 25, 0.5)',
    borderRadius: 8,
  },
  aspectRatioButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    marginRight: 8,
  },
  aspectButton: {
    padding: '6px 12px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 6,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  aspectButtonActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
    color: '#8b5cf6',
  },
  previewSection: {
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    maxHeight: 400,
    background: '#0a0a12',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '100%',
    maxHeight: 400,
    display: 'block',
  },
  cropOverlay: {
    position: 'absolute',
    border: '2px solid #8b5cf6',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
    cursor: 'move',
  },
  cropBorder: {
    position: 'absolute',
    inset: 0,
    border: '1px dashed rgba(139, 92, 246, 0.5)',
  },
  resizeHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    background: '#8b5cf6',
    border: '2px solid #fff',
    borderRadius: '50%',
    cursor: 'nwse-resize',
  },
  resizeHandleSE: {
    bottom: -6,
    right: -6,
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    background: 'rgba(15, 15, 25, 0.5)',
    borderRadius: 8,
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  controlLabel: {
    fontSize: 13,
    color: '#94a3b8',
    minWidth: 80,
  },
  slider: {
    flex: 1,
    height: 4,
    background: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
  },
  controlValue: {
    fontSize: 13,
    color: '#8b5cf6',
    minWidth: 40,
    textAlign: 'right',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid rgba(139, 92, 246, 0.1)',
  },
};

export default ThumbnailUploadModal;
