/**
 * Canvas Background Upload Dialog
 * Allows uploading a photo or pasting a URL to set canvas background
 */

import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface CanvasBackgroundUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetBackground: (url: string) => void;
  onRemoveBackground?: () => void;
  accentColor?: string;
}

export const CanvasBackgroundUploadDialog: React.FC<CanvasBackgroundUploadDialogProps> = ({
  isOpen,
  onClose,
  onSetBackground,
  onRemoveBackground,
  accentColor = '#8b5cf6',
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
      onSetBackground(url);
      setUrl('');
      onClose();
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        onSetBackground(result);
        onClose();
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
          e.preventDefault();
          return;
        }
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(15, 15, 25, 0.98)',
          backdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: 20,
          border: `1px solid rgba(255, 255, 255, 0.15)`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: 500,
          padding: 24,
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: 'var(--sn-text-secondary)',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--sn-text-primary)',
            marginBottom: 24,
            marginTop: 0,
          }}
        >
          Set Canvas Background
        </h2>

        {/* URL Input */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--sn-text-secondary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Paste Image URL
          </label>
          <form onSubmit={handleUrlSubmit}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://example.com/image.jpg"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${error ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 8,
                  color: 'var(--sn-text-primary)',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = `${accentColor}80`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: accentColor,
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <LinkIcon size={16} />
                Set
              </button>
            </div>
          </form>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--sn-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            OR
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>

        {/* File Upload */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--sn-text-secondary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Upload Image
          </label>
          <div
            style={{
              border: `2px dashed ${dragActive ? accentColor : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              background: dragActive ? `${accentColor}15` : 'rgba(255, 255, 255, 0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload
              size={32}
              style={{
                color: 'var(--sn-text-secondary)',
                marginBottom: 12,
                display: 'block',
                margin: '0 auto 12px',
              }}
            />
            <div
              style={{
                fontSize: 14,
                color: 'var(--sn-text-primary)',
                marginBottom: 4,
              }}
            >
              Drop image here or click to browse
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--sn-text-muted)',
              }}
            >
              You can also paste an image (Ctrl+V / Cmd+V)
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Remove Background Button */}
        {onRemoveBackground && (
          <>
            <div
              style={{
                marginTop: 24,
                paddingTop: 24,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
            <button
              onClick={() => {
                onRemoveBackground?.();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '10px 20px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
            >
              <X size={16} />
              Remove Background Image
            </button>
          </>
        )}
      </div>
    </div>
  );
};

