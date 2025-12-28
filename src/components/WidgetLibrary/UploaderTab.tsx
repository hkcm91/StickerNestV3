/**
 * StickerNest v2 - Uploader Tab
 * Upload widgets, stickers, and import packs
 */

import React, { useState, useCallback, useRef } from 'react';
import { useLibraryStore } from '../../state/useLibraryStore';
import {
  Upload,
  Package,
  Image,
  Puzzle,
  FileArchive,
  AlertCircle,
  CheckCircle,
  Loader,
  FolderOpen,
} from 'lucide-react';

type UploadType = 'sticker' | 'widget' | 'sticker-pack' | 'widget-pack' | 'pipeline';

interface UploadState {
  type: UploadType | null;
  files: File[];
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

const UPLOAD_OPTIONS: { type: UploadType; label: string; icon: React.ReactNode; description: string; accept: string }[] = [
  {
    type: 'sticker',
    label: 'Sticker',
    icon: <Image size={20} />,
    description: 'PNG, GIF, SVG, or Lottie JSON',
    accept: '.png,.gif,.svg,.json,image/*',
  },
  {
    type: 'widget',
    label: 'Widget',
    icon: <Puzzle size={20} />,
    description: 'Widget folder with manifest.json',
    accept: '.zip,.html',
  },
  {
    type: 'sticker-pack',
    label: 'Sticker Pack',
    icon: <Package size={20} />,
    description: 'ZIP archive of stickers',
    accept: '.zip',
  },
  {
    type: 'widget-pack',
    label: 'Widget Pack',
    icon: <FileArchive size={20} />,
    description: 'ZIP with multiple widgets',
    accept: '.zip',
  },
];

export const UploaderTab: React.FC = () => {
  const [state, setState] = useState<UploadState>({
    type: null,
    files: [],
    isProcessing: false,
    error: null,
    success: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addSticker = useLibraryStore((s) => s.addSticker);
  const addToRecentlyAdded = useLibraryStore((s) => s.addToRecentlyAdded);

  const handleSelectType = useCallback((type: UploadType) => {
    setState((prev) => ({ ...prev, type, error: null, success: null }));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setState((prev) => ({ ...prev, files, error: null, success: null }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setState((prev) => ({ ...prev, files, error: null, success: null }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const processSticker = useCallback(async (file: File) => {
    const isLottie = file.name.endsWith('.json');
    const type = isLottie ? 'lottie' : file.type.includes('gif') ? 'gif' : file.type.includes('svg') ? 'svg' : 'png';

    const url = URL.createObjectURL(file);
    const id = `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const sticker = {
      id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      type: type as 'png' | 'lottie' | 'gif' | 'svg',
      url,
      tags: [],
      createdAt: Date.now(),
      isAnimated: type === 'lottie' || type === 'gif',
      isFavorite: false,
    };

    addSticker(sticker);
    addToRecentlyAdded('sticker', id);
    return sticker;
  }, [addSticker, addToRecentlyAdded]);

  const handleUpload = useCallback(async () => {
    if (state.files.length === 0 || !state.type) return;

    setState((prev) => ({ ...prev, isProcessing: true, error: null }));

    try {
      switch (state.type) {
        case 'sticker': {
          for (const file of state.files) {
            await processSticker(file);
          }
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            success: `Successfully uploaded ${state.files.length} sticker(s)`,
            files: [],
          }));
          break;
        }

        case 'sticker-pack': {
          // For now, just show a message
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            success: 'Sticker pack import will be available soon',
            files: [],
          }));
          break;
        }

        case 'widget':
        case 'widget-pack': {
          // Redirect to Widget Uploader component
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            success: 'Please use the Widget Lab for widget uploads',
            files: [],
          }));
          break;
        }

        default:
          throw new Error('Unknown upload type');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }));
    }
  }, [state.files, state.type, processSticker]);

  const clearFiles = useCallback(() => {
    setState((prev) => ({ ...prev, files: [], error: null, success: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  }, []);

  return (
    <>
      <style>{`
        .uploader-tab {
          padding: 4px;
        }

        .uploader-section {
          margin-bottom: 20px;
        }

        .uploader-section-title {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }

        .uploader-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .uploader-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uploader-option:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .uploader-option.selected {
          background: rgba(102, 126, 234, 0.15);
          border-color: rgba(102, 126, 234, 0.4);
          color: #a5b4fc;
        }

        .uploader-option-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .uploader-option.selected .uploader-option-icon {
          background: rgba(102, 126, 234, 0.3);
        }

        .uploader-option-label {
          font-size: 12px;
          font-weight: 500;
        }

        .uploader-option-desc {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
        }

        .uploader-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 30px 20px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uploader-dropzone:hover,
        .uploader-dropzone.dragover {
          border-color: rgba(102, 126, 234, 0.5);
          background: rgba(102, 126, 234, 0.1);
        }

        .uploader-dropzone-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .uploader-dropzone-text {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
        }

        .uploader-dropzone-hint {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
        }

        .uploader-files {
          margin-top: 12px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .uploader-files-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .uploader-files-title {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .uploader-files-clear {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 11px;
          cursor: pointer;
        }

        .uploader-files-clear:hover {
          color: white;
        }

        .uploader-files-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 120px;
          overflow-y: auto;
        }

        .uploader-file {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .uploader-file-icon {
          color: rgba(255, 255, 255, 0.4);
        }

        .uploader-file-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .uploader-file-size {
          color: rgba(255, 255, 255, 0.4);
        }

        .uploader-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .uploader-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uploader-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
        }

        .uploader-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .uploader-btn.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .uploader-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .uploader-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          margin-top: 12px;
        }

        .uploader-message.error {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
        }

        .uploader-message.success {
          background: rgba(34, 197, 94, 0.15);
          color: #86efac;
        }

        input[type="file"] {
          display: none;
        }
      `}</style>

      <div className="uploader-tab">
        {/* Upload Type Selection */}
        <div className="uploader-section">
          <div className="uploader-section-title">What do you want to upload?</div>
          <div className="uploader-options">
            {UPLOAD_OPTIONS.map((option) => (
              <div
                key={option.type}
                className={`uploader-option ${state.type === option.type ? 'selected' : ''}`}
                onClick={() => handleSelectType(option.type)}
              >
                <div className="uploader-option-icon">{option.icon}</div>
                <span className="uploader-option-label">{option.label}</span>
                <span className="uploader-option-desc">{option.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dropzone */}
        {state.type && (
          <div className="uploader-section">
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_OPTIONS.find((o) => o.type === state.type)?.accept}
              multiple={state.type === 'sticker'}
              onChange={handleFileSelect}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              onChange={handleFileSelect}
            />

            <div
              className="uploader-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="uploader-dropzone-icon">
                <Upload size={24} />
              </div>
              <div className="uploader-dropzone-text">
                Drag and drop files here
                <br />
                or click to browse
              </div>
              <div className="uploader-dropzone-hint">
                {UPLOAD_OPTIONS.find((o) => o.type === state.type)?.description}
              </div>
            </div>

            {state.type === 'widget' && (
              <button
                className="uploader-btn"
                style={{ marginTop: 8 }}
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen size={16} />
                Select Widget Folder
              </button>
            )}
          </div>
        )}

        {/* Selected Files */}
        {state.files.length > 0 && (
          <div className="uploader-files">
            <div className="uploader-files-header">
              <span className="uploader-files-title">
                {state.files.length} file{state.files.length !== 1 ? 's' : ''} selected
              </span>
              <button className="uploader-files-clear" onClick={clearFiles}>
                Clear
              </button>
            </div>
            <div className="uploader-files-list">
              {state.files.slice(0, 10).map((file, i) => (
                <div key={i} className="uploader-file">
                  <Image size={14} className="uploader-file-icon" />
                  <span className="uploader-file-name">{file.name}</span>
                  <span className="uploader-file-size">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              ))}
              {state.files.length > 10 && (
                <div className="uploader-file">
                  <span>...and {state.files.length - 10} more</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {state.files.length > 0 && (
          <div className="uploader-actions">
            <button className="uploader-btn" onClick={clearFiles}>
              Cancel
            </button>
            <button
              className="uploader-btn primary"
              onClick={handleUpload}
              disabled={state.isProcessing}
            >
              {state.isProcessing ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload
                </>
              )}
            </button>
          </div>
        )}

        {/* Messages */}
        {state.error && (
          <div className="uploader-message error">
            <AlertCircle size={16} />
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="uploader-message success">
            <CheckCircle size={16} />
            {state.success}
          </div>
        )}
      </div>
    </>
  );
};

export default UploaderTab;
