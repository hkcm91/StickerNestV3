/**
 * LandingControlsBar
 * Top controls bar for landing page canvas
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  ImagePlus,
  Eye,
  PenLine,
  Maximize2,
  Boxes,
  Library,
  Undo2,
  Redo2,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  Heart,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { CanvasMode } from '../../canvas/MainCanvas';
import { landingStyles as styles } from '../LandingPage.styles';
import { CanvasSettingsDropdown } from '../../components/CanvasSettingsDropdown';
import { useCanvasEntityStore } from '../../state/useCanvasEntityStore';
import { haptic } from '../../utils/haptics';
import { ViewportModeToggle } from '../../components/ViewportModeToggle';
import { SpatialModeToggle } from '../../components/SpatialModeToggle';

export interface LandingControlsBarProps {
  activeAccentColor: string;
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
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
  onInvite?: () => void;
  currentTheme: { id: string; colors: { accent: { primary: string } }; description?: string } | null;
  onThemeChange: (themeId: string) => void;
  showAdvancedUI: boolean;
  isMobile: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  canvasName?: string;
  onSizeChange?: (width: number, height: number) => void;
}

export const LandingControlsBar: React.FC<LandingControlsBarProps> = ({
  activeAccentColor,
  mode,
  onModeChange,
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
  onInvite,
  currentTheme,
  onThemeChange,
  showAdvancedUI,
  isMobile,
  isCollapsed = false,
  onToggleCollapse,
  canvasName,
  onSizeChange,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, profile, signInWithOAuth, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createImage = useCanvasEntityStore((state) => state.createImage);
  const [isHoveringNavBar, setIsHoveringNavBar] = useState(false);
  const [toggleButtonPosition, setToggleButtonPosition] = useState(50); // Percentage from left
  const [isDraggingToggle, setIsDraggingToggle] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartPositionRef = useRef(50);
  const hasDraggedRef = useRef(false);

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

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    await signOut();
  };

  // Handle drag start for toggle button
  const handleToggleDragStart = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingToggle(true);
    hasDraggedRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartXRef.current = clientX;
    dragStartPositionRef.current = toggleButtonPosition;
  }, [toggleButtonPosition]);

  // Handle drag move
  useEffect(() => {
    if (!isDraggingToggle) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!headerRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragStartXRef.current;
      // Mark as dragged if moved more than 5px
      if (Math.abs(deltaX) > 5) {
        hasDraggedRef.current = true;
      }
      const rect = headerRef.current.getBoundingClientRect();
      const deltaPercentage = (deltaX / rect.width) * 100;
      const newPosition = dragStartPositionRef.current + deltaPercentage;
      // Constrain to 10% - 90% to keep button visible
      setToggleButtonPosition(Math.max(10, Math.min(90, newPosition)));
    };

    const handleEnd = () => {
      setIsDraggingToggle(false);
      // Reset after a short delay to allow click handler to check
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 100);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingToggle]);

  return (
    <>
      <header 
        ref={headerRef}
        onMouseEnter={() => setIsHoveringNavBar(true)}
        onMouseLeave={() => setIsHoveringNavBar(false)}
        style={{
          ...styles.controlsBar,
          transform: isCollapsed ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 0.3s ease-in-out',
        }} 
        className="sn-controls-bar"
      >
        {/* Toggle collapse button - shown when NOT collapsed and hovering */}
        {onToggleCollapse && !isCollapsed && isHoveringNavBar && (
          <button
            onMouseDown={handleToggleDragStart}
            onTouchStart={handleToggleDragStart}
            onClick={(e) => {
              // Only trigger collapse if we didn't drag
              if (!hasDraggedRef.current) {
                e.stopPropagation();
                onToggleCollapse();
                haptic('light');
              }
            }}
            style={{
              position: 'absolute',
              bottom: -24,
              left: `${toggleButtonPosition}%`,
              transform: 'translateX(-50%)',
              width: 40,
              height: 24,
              borderRadius: '0 0 8px 8px',
              background: isDraggingToggle ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderTop: 'none',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDraggingToggle ? 'grabbing' : 'grab',
              color: 'rgba(148, 163, 184, 0.7)',
              zIndex: 11,
              transition: isDraggingToggle ? 'none' : 'left 0.1s ease-out, opacity 0.2s ease, background 0.2s ease',
              opacity: 0.8,
              userSelect: 'none',
              touchAction: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isDraggingToggle) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'rgba(241, 245, 249, 0.9)';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDraggingToggle) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(148, 163, 184, 0.7)';
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            aria-label="Hide controls (drag to move)"
            title="Hide controls (drag to move)"
          >
            <ChevronUp size={16} />
          </button>
        )}

        {/* Left side - Canvas Name */}
        <div style={styles.controlsLeft}>
          {canvasName && (
            <h2 style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              fontWeight: 600,
              color: 'var(--sn-text-primary, #e2e8f0)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? '120px' : '200px',
            }}>
              {canvasName}
            </h2>
          )}
        </div>

      {/* Right side controls */}
      <div style={{ ...styles.controlsRight, ...(isMobile ? { width: '100%', justifyContent: 'space-between' } : {}) }}>
        {/* Canvas Settings Dropdown */}
        {showAdvancedUI && (
          <CanvasSettingsDropdown enabled={true} onCanvasSizeChange={onSizeChange} />
        )}

        {/* Viewport Mode Toggle (Mobile vs Web) */}
        {showAdvancedUI && (
          <ViewportModeToggle
            accentColor={activeAccentColor}
            compact={isMobile}
          />
        )}

        {/* Spatial Mode Toggle (2D/VR/AR) */}
        {showAdvancedUI && (
          <SpatialModeToggle
            accentColor={activeAccentColor}
            compact={isMobile}
          />
        )}

        {/* Fullscreen Button - Desktop only */}
        {showAdvancedUI && (
          <button
            onClick={onFullscreenToggle}
            style={{
              ...styles.iconButton,
              background: `${activeAccentColor}22`,
              border: `1px solid ${activeAccentColor}33`,
              color: 'var(--sn-cozy-lavender)',
            }}
            aria-label="Enter fullscreen preview"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {/* Docker button */}
        <button
          className="sn-docker-toggle"
          onClick={onDockerToggle}
          style={{
            ...styles.iconButton,
            ...(dockerVisible ? styles.pipelinesButtonActive : {}),
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
          style={{ ...styles.iconButton, ...(isPanelOpen ? styles.pipelinesButtonActive : {}) }}
          aria-label="Sticker Library"
          title="Sticker Library"
        >
          <Library size={16} />
        </button>

        {/* Upload Image button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.iconButton}
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
            ...styles.iconButton,
            opacity: canUndo ? 1 : 0.5,
            cursor: canUndo ? 'pointer' : 'not-allowed',
          }}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo button */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            ...styles.iconButton,
            opacity: canRedo ? 1 : 0.5,
            cursor: canRedo ? 'pointer' : 'not-allowed',
          }}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>

        {/* Create new tab button */}
        <button
          onClick={onCreateTab}
          style={styles.iconButton}
          aria-label="Create new tab"
          title="Create new tab"
        >
          <Plus size={16} />
        </button>

        {/* Invite button */}
        {onInvite && (
          <button
            onClick={onInvite}
            style={styles.iconButton}
            aria-label="Invite collaborators"
            title="Invite"
          >
            <UserPlus size={16} />
          </button>
        )}

        {/* Mode toggle */}
        <div style={styles.modeToggle} className="sn-mode-toggle">
          <button
            onClick={() => onModeChange('view')}
            style={{ ...styles.modeButton, ...(mode === 'view' ? styles.modeButtonActive : {}) }}
            aria-label="Preview mode"
            title="Preview"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => onModeChange('edit')}
            style={{ ...styles.modeButton, ...(mode === 'edit' ? styles.modeButtonActive : {}) }}
            aria-label="Edit mode"
            title="Edit"
          >
            <PenLine size={16} />
          </button>
        </div>

        {/* Profile / Sign In */}
        {!isAuthenticated ? (
          <button
            onClick={() => signInWithOAuth('google')}
            style={{
              ...styles.iconButton,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            className="sn-sign-in"
            aria-label="Sign in with Google"
            title="Sign in with Google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </button>
        ) : (
          <div ref={profileMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '2px solid var(--sn-accent-primary, #8b5cf6)',
                background: profile?.avatarUrl
                  ? `url(${profile.avatarUrl}) center/cover`
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.2s ease',
              }}
              aria-label="Profile menu"
              title={profile?.username || 'Profile'}
            >
              {!profile?.avatarUrl && (
                <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </button>

            {/* Profile Dropdown - Glass Morphism */}
            {isProfileMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'linear-gradient(180deg, rgba(15, 15, 36, 0.92) 0%, rgba(15, 15, 36, 0.98) 100%)',
                  backdropFilter: 'blur(24px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                  borderRadius: 14,
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                {/* User Info */}
                <div style={{
                  padding: '14px 16px',
                  background: 'rgba(139, 92, 246, 0.06)',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                    {profile?.username || 'User'}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 2,
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 8px #22c55e',
                    }} />
                    {profile?.email || 'Online'}
                  </div>
                </div>

                {/* Menu Items */}
                <div style={{ padding: 8 }}>
                  {/* Group Label */}
                  <div style={{
                    padding: '6px 12px 4px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{
                      width: 12,
                      height: 1,
                      background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.5) 0%, transparent 100%)',
                    }} />
                    Browse
                  </div>
                  <Link
                    to={`/u/${profile?.username || 'me'}`}
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 450,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}>
                      <User size={14} />
                    </span>
                    My Profile
                  </Link>
                  <Link
                    to="/gallery"
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 450,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}>
                      <ImageIcon size={14} />
                    </span>
                    My Canvases
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 450,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}>
                      <Heart size={14} />
                    </span>
                    Saved
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 10,
                      color: '#94a3b8',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: 450,
                      border: '1px solid transparent',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.color = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}>
                      <Settings size={14} />
                    </span>
                    Settings
                  </Link>
                </div>

                {/* Sign Out - Divider */}
                <div style={{
                  margin: '4px 12px 8px',
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(239, 68, 68, 0.2) 50%, transparent 100%)',
                }} />
                <div style={{ padding: '0 8px 8px' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                    }}
                  >
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: 'rgba(239, 68, 68, 0.1)',
                    }}>
                      <LogOut size={14} />
                    </span>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
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

    {/* Floating toggle button when collapsed - only visible on hover */}
    {isCollapsed && onToggleCollapse && (
      <div
        onMouseEnter={() => setIsHoveringNavBar(true)}
        onMouseLeave={() => setIsHoveringNavBar(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          zIndex: 11,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          pointerEvents: isHoveringNavBar ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => {
            onToggleCollapse();
            haptic('light');
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 40,
            height: 24,
            borderRadius: '0 0 8px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: 'none',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(148, 163, 184, 0.7)',
            opacity: isHoveringNavBar ? 0.8 : 0,
            transition: 'opacity 0.2s ease, background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(241, 245, 249, 0.9)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(148, 163, 184, 0.7)';
            e.currentTarget.style.opacity = '0.8';
          }}
          aria-label="Show controls"
          title="Show controls"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    )}
    </>
  );
};
