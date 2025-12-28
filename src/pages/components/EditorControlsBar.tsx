/**
 * EditorControlsBar
 * Top controls bar for canvas editor
 */

import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  ImagePlus,
  Maximize2,
  Boxes,
  BarChart3,
  Undo2,
  Redo2,
  Plus,
  Settings,
} from 'lucide-react';
import { ProfileButton } from '../../components/ProfileButton';
import type { CanvasMode } from '../../canvas/MainCanvas';
import { haptic } from '../../utils/haptics';
import { useCanvasEntityStore } from '../../state/useCanvasEntityStore';

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  color: '#94a3b8',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeButtonStyle: React.CSSProperties = {
  background: 'rgba(139, 92, 246, 0.2)',
  borderColor: 'rgba(139, 92, 246, 0.5)',
  color: '#a78bfa',
};

const enterGalleryStyle: React.CSSProperties = {
  ...iconButtonStyle,
  width: 'auto',
  padding: '0 12px',
  gap: 6,
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.15) 100%)',
  borderColor: 'rgba(139, 92, 246, 0.3)',
  color: '#a78bfa',
};

export interface EditorControlsBarProps {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  canvasRef: React.RefObject<{ setMode: (mode: CanvasMode) => void } | null>;
  accentColor: string;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  dockerVisible: boolean;
  onDockerToggle: () => void;
  isPanelOpen: boolean;
  onPanelToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCreateTab: () => void;
  onOpenSettings: () => void;
  showAdvancedUI: boolean;
  isMobile: boolean;
}

export const EditorControlsBar: React.FC<EditorControlsBarProps> = ({
  mode,
  setMode,
  canvasRef,
  accentColor,
  isFullscreen,
  onFullscreenToggle,
  dockerVisible,
  onDockerToggle,
  isPanelOpen,
  onPanelToggle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCreateTab,
  onOpenSettings,
  showAdvancedUI,
  isMobile,
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createImage = useCanvasEntityStore((state) => state.createImage);

  // Handle image upload to canvas
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.warn('Invalid file type:', file.type);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      // Load image to get natural dimensions
      const img = new Image();
      img.onload = () => {
        // Calculate size (max 400px, maintain aspect ratio)
        const maxSize = 400;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Add image to canvas at center-ish position
        createImage(dataUrl, {
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
          width,
          height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });

        haptic('light');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  }, [createImage]);

  const handleModeClick = (newMode: CanvasMode) => {
    haptic('light');
    canvasRef.current?.setMode(newMode);
    setMode(newMode);
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(15, 15, 25, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    }} className="sn-controls-bar">
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Fullscreen Button */}
        {showAdvancedUI && (
          <button
            onClick={onFullscreenToggle}
            style={{
              ...iconButtonStyle,
              background: isFullscreen ? `${accentColor}33` : 'transparent',
              border: `1px solid ${isFullscreen ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
              color: isFullscreen ? accentColor : '#94a3b8',
            }}
            aria-label="Enter fullscreen preview"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {/* Mode Toggle */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 8,
            padding: 2,
            gap: 2,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <button
            onClick={() => handleModeClick('view')}
            style={{
              padding: '6px 14px',
              minHeight: 32,
              fontSize: 13,
              fontWeight: 500,
              background: mode === 'view' ? accentColor : 'transparent',
              border: 'none',
              borderRadius: 6,
              color: mode === 'view' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            View
          </button>
          <button
            onClick={() => handleModeClick('edit')}
            style={{
              padding: '6px 14px',
              minHeight: 32,
              fontSize: 13,
              fontWeight: 500,
              background: mode === 'edit' ? accentColor : 'transparent',
              border: 'none',
              borderRadius: 6,
              color: mode === 'edit' ? '#fff' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Right side */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        ...(isMobile ? { width: '100%', justifyContent: 'space-between' } : {})
      }}>
        {/* Canvas Settings */}
        {showAdvancedUI && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={iconButtonStyle}
            title="Canvas settings"
          >
            <Settings size={16} />
          </button>
        )}

        {/* Docker button */}
        <button
          className="sn-docker-toggle"
          onClick={onDockerToggle}
          style={{
            ...iconButtonStyle,
            ...(dockerVisible ? activeButtonStyle : {}),
          }}
          aria-label="Docker"
          title="Docker"
        >
          <Boxes size={16} />
        </button>

        {/* Widget Library button */}
        <button
          className="sn-tray-toggle"
          onClick={onPanelToggle}
          style={{ ...iconButtonStyle, ...(isPanelOpen ? activeButtonStyle : {}) }}
          aria-label="Widget Library"
          title="Widget Library"
        >
          <BarChart3 size={16} />
        </button>

        {/* Upload Image button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={iconButtonStyle}
          aria-label="Upload image to canvas"
          title="Upload Image"
        >
          <ImagePlus size={16} />
        </button>

        {/* Undo button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            ...iconButtonStyle,
            opacity: canUndo ? 1 : 0.5,
            cursor: canUndo ? 'pointer' : 'not-allowed',
          }}
          aria-label="Undo"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo button */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            ...iconButtonStyle,
            opacity: canRedo ? 1 : 0.5,
            cursor: canRedo ? 'pointer' : 'not-allowed',
          }}
          aria-label="Redo"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>

        {/* Create new tab button */}
        <button
          onClick={onCreateTab}
          style={iconButtonStyle}
          aria-label="Create new tab"
          title="Create new tab"
        >
          <Plus size={16} />
        </button>

        {/* Profile Button */}
        <ProfileButton size="md" />

        {/* Profile button */}
        {showAdvancedUI && (
          <button
            onClick={() => navigate('/profile')}
            style={enterGalleryStyle}
            className="sn-enter-gallery"
            aria-label="My Profile"
            title="My Profile"
          >
            <ImageIcon size={16} />
          </button>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
    </header>
  );
};
