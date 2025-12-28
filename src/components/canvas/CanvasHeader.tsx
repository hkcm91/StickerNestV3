/**
 * StickerNest v2 - Canvas Header
 *
 * Extracted from App.tsx - handles the top toolbar with mode selector,
 * canvas management, and user actions
 */

import React from 'react';
import { CanvasMode } from '../../types/runtime';
import { CanvasSelectorDropdown } from '../CanvasSelectorDropdown';
import { Canvas as CanvasData } from '../../types/domain';
import styles from './CanvasHeader.module.css';

// =============================================================================
// Constants
// =============================================================================

const BUTTON_SIZES = {
  mobile: { padding: '10px 16px', fontSize: 14, minHeight: 44 },
  desktop: { padding: '6px 12px', fontSize: 12, minHeight: 'auto' as const },
} as const;

// =============================================================================
// Types
// =============================================================================

interface CanvasHeaderProps {
  // Mode
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;

  // Canvas management
  canvases: CanvasData[];
  currentCanvasId: string;
  onSelectCanvas: (canvasId: string) => void;
  onRenameCanvas: (canvasId: string, newName: string) => void;
  onDeleteCanvas: (canvasId: string) => void;
  onCreateCanvas: () => void;
  canvasLoading: boolean;

  // Actions
  onSave: () => void;
  onLoad: () => void;
  onShare: () => void;
  onResize: () => void;
  onSettings: () => void;
  onToggleStickers: () => void;
  onToggleDock: () => void;
  onToggleProperties: () => void;

  // State
  isSaving: boolean;
  isLoading: boolean;
  saveStatus: string | null;
  isPropertiesPanelOpen: boolean;
  showStickerLibrary: boolean;
  isDockVisible: boolean;

  // User
  user: { username?: string; email?: string };
  isAuthenticated: boolean;
  isLocalDevMode: boolean;
  onSignOut: () => void;
  onSignIn: () => void;

  // Responsive
  isMobile: boolean;
}

// =============================================================================
// Component
// =============================================================================

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  mode,
  onModeChange,
  canvases,
  currentCanvasId,
  onSelectCanvas,
  onRenameCanvas,
  onDeleteCanvas,
  onCreateCanvas,
  canvasLoading,
  onSave,
  onLoad,
  onShare,
  onResize,
  onSettings,
  onToggleStickers,
  onToggleDock,
  onToggleProperties,
  isSaving,
  isLoading,
  saveStatus,
  isPropertiesPanelOpen,
  showStickerLibrary,
  isDockVisible,
  user,
  isAuthenticated,
  isLocalDevMode,
  onSignOut,
  onSignIn,
  isMobile,
}) => {
  const buttonSize = isMobile ? BUTTON_SIZES.mobile : BUTTON_SIZES.desktop;

  return (
    <header className={`${styles.header} ${isMobile ? styles.headerMobile : ''}`}>
      {/* Mode selector */}
      <div className={styles.modeSelector}>
        {!isMobile && <strong className={styles.modeLabel}>Mode:</strong>}
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as CanvasMode)}
          className={`sn-touch-target ${styles.modeSelect} ${isMobile ? styles.modeSelectMobile : ''}`}
        >
          <option value="view">View</option>
          <option value="edit">Edit</option>
          <option value="connect">Connect</option>
        </select>
      </div>

      {/* Canvas Selector Dropdown - Desktop only */}
      {!isMobile && (
        <>
          <div className={styles.divider} />
          <CanvasSelectorDropdown
            canvases={canvases}
            currentCanvasId={currentCanvasId}
            onSelect={onSelectCanvas}
            onRename={onRenameCanvas}
            onDelete={onDeleteCanvas}
            onCreate={onCreateCanvas}
            isLoading={canvasLoading}
          />
          <div className={styles.divider} />
        </>
      )}

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`sn-touch-target ${styles.saveButton}`}
          style={{ ...buttonSize, opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? 'Saving...' : (isMobile ? '💾' : '💾 Save')}
        </button>
        <button
          onClick={onLoad}
          disabled={isLoading}
          className={`sn-touch-target ${styles.loadButton}`}
          style={{ ...buttonSize, opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? 'Loading...' : (isMobile ? '📂' : '📂 Load')}
        </button>
        <button
          onClick={onShare}
          className={`sn-touch-target ${styles.shareButton}`}
          style={buttonSize}
        >
          {isMobile ? '🔗' : '🔗 Share'}
        </button>

        {/* Desktop-only buttons */}
        {!isMobile && (
          <>
            <button
              onClick={onResize}
              className={`sn-touch-target ${styles.secondaryButton}`}
              title="Change canvas size"
            >
              📐 Size
            </button>
            <button
              onClick={onSettings}
              className={`sn-touch-target ${styles.secondaryButton}`}
              title="Canvas settings"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={onToggleStickers}
              className={`sn-touch-target ${styles.secondaryButton} ${showStickerLibrary ? styles.active : ''}`}
              title="Add stickers"
            >
              🎨 Stickers
            </button>
            <button
              onClick={onToggleDock}
              className={`sn-touch-target ${styles.secondaryButton} ${isDockVisible ? styles.active : ''}`}
              title="Widget dock panel"
            >
              📌 Dock
            </button>
          </>
        )}
      </div>

      {/* Save status message - Desktop only */}
      {saveStatus && !isMobile && (
        <span className={`${styles.statusMessage} ${saveStatus.includes('Saved') || saveStatus.includes('Loaded') ? styles.success : styles.error}`}>
          {saveStatus}
        </span>
      )}

      {/* Properties Panel Toggle - Desktop only */}
      {!isMobile && (
        <>
          <div className={styles.divider} />
          <button
            onClick={onToggleProperties}
            className={`sn-touch-target ${styles.propertiesToggle} ${isPropertiesPanelOpen ? styles.active : ''}`}
          >
            {isPropertiesPanelOpen ? 'Hide Properties' : 'Show Properties'}
          </button>
        </>
      )}

      {/* User Menu */}
      <div className={styles.userMenu}>
        {!isMobile && (
          <span className={styles.username}>
            {user.username || user.email || 'User'}
          </span>
        )}
        {isLocalDevMode ? (
          <span className={styles.devBadge}>DEV</span>
        ) : (
          <button
            onClick={isAuthenticated ? onSignOut : onSignIn}
            className={`${styles.authButton} ${isAuthenticated ? styles.signOut : styles.signIn}`}
            style={{ padding: isMobile ? '8px 12px' : '6px 12px' }}
          >
            {isAuthenticated ? 'Sign Out' : 'Sign In'}
          </button>
        )}
      </div>
    </header>
  );
};

export default CanvasHeader;
