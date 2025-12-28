/**
 * StickerNest v2 - Mobile Toolbar Component
 * Bottom toolbar for mobile devices with essential canvas controls
 */

import React, { useCallback } from 'react';
import { useViewport, useSafeArea } from '../hooks/useResponsive';
import { haptic } from '../utils/haptics';
import styles from './MobileToolbar.module.css';

export type MobileToolbarAction =
  | 'undo'
  | 'redo'
  | 'add'
  | 'delete'
  | 'layers'
  | 'settings'
  | 'fit-view'
  | 'mode';

export interface MobileToolbarProps {
  /** Current canvas mode */
  mode?: 'view' | 'edit' | 'preview';
  /** Show/hide mode toggle */
  showModeToggle?: boolean;
  /** Can undo */
  canUndo?: boolean;
  /** Can redo */
  canRedo?: boolean;
  /** Has selection */
  hasSelection?: boolean;
  /** Action handlers */
  onUndo?: () => void;
  onRedo?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onLayers?: () => void;
  onSettings?: () => void;
  onFitView?: () => void;
  onModeChange?: (mode: 'view' | 'edit') => void;
  /** Custom actions */
  customActions?: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
}

export function MobileToolbar({
  mode = 'view',
  showModeToggle = true,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onUndo,
  onRedo,
  onAdd,
  onDelete,
  onLayers,
  onSettings,
  onFitView,
  onModeChange,
  customActions = [],
}: MobileToolbarProps) {
  const { isMobile } = useViewport();
  const safeArea = useSafeArea();

  const handleAction = useCallback((action: () => void | undefined, haptType: 'light' | 'medium' = 'light') => {
    if (action) {
      haptic[haptType]();
      action();
    }
  }, []);

  const handleModeToggle = useCallback(() => {
    if (!onModeChange) return;
    haptic.medium();
    const newMode = mode === 'edit' ? 'view' : 'edit';
    onModeChange(newMode);
  }, [mode, onModeChange]);

  // Don't show on desktop
  if (!isMobile) return null;

  return (
    <div
      className={styles.toolbar}
      style={{
        paddingBottom: `calc(${safeArea.bottom}px + 8px)`,
      }}
    >
      <div className={styles.toolbarInner}>
        {/* Left Section - History */}
        <div className={styles.section}>
          <button
            className={styles.button}
            onClick={() => handleAction(onUndo, 'light')}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 10H15M5 10L8 7M5 10L8 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className={styles.button}
            onClick={() => handleAction(onRedo, 'light')}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 10H5M15 10L12 7M15 10L12 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Center Section - Main Actions */}
        <div className={styles.sectionCenter}>
          {mode === 'edit' && (
            <>
              <button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => handleAction(onAdd, 'medium')}
                aria-label="Add Widget"
                title="Add Widget"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 5V15M5 10H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {hasSelection && (
                <button
                  className={`${styles.button} ${styles.buttonDanger}`}
                  onClick={() => handleAction(onDelete, 'medium')}
                  aria-label="Delete"
                  title="Delete Selection"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M7 7L13 13M7 13L13 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </>
          )}

          <button
            className={styles.button}
            onClick={() => handleAction(onFitView, 'light')}
            aria-label="Fit to View"
            title="Fit to View"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="4"
                y="4"
                width="12"
                height="12"
                stroke="currentColor"
                strokeWidth="1.5"
                rx="2"
              />
              <path
                d="M7 7L9 9M13 7L11 9M7 13L9 11M13 13L11 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Custom Actions */}
          {customActions.map((action, index) => (
            <button
              key={index}
              className={styles.button}
              onClick={() => handleAction(() => action.onClick(), 'light')}
              disabled={action.disabled}
              aria-label={action.label}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>

        {/* Right Section - Panels & Settings */}
        <div className={styles.section}>
          {showModeToggle && (
            <button
              className={`${styles.button} ${mode === 'edit' ? styles.buttonActive : ''}`}
              onClick={handleModeToggle}
              aria-label={mode === 'edit' ? 'View Mode' : 'Edit Mode'}
              title={mode === 'edit' ? 'Switch to View' : 'Switch to Edit'}
            >
              {mode === 'edit' ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M13.5 6.5L7 13L4.5 10.5M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M11.5 5.5L14.5 8.5M3.5 16.5L5.79062 15.9906C6.06423 15.9306 6.20104 15.9006 6.32933 15.8476C6.44363 15.8005 6.55284 15.7405 6.65511 15.6685C6.77043 15.5876 6.87187 15.486 7.07473 15.2832L16 6.35786C16.8284 5.52944 16.8284 4.18198 16 3.35355C15.1716 2.52513 13.8241 2.52513 12.9957 3.35355L4.07039 12.279C3.86753 12.4818 3.76609 12.5833 3.68518 12.6986C3.61321 12.8009 3.55315 12.9101 3.50609 13.0244C3.45311 13.1527 3.42306 13.2895 3.36295 13.5631L2.5 16.5L3.5 16.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}

          <button
            className={styles.button}
            onClick={() => handleAction(onLayers, 'light')}
            aria-label="Layers"
            title="Layers"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 10L10 6L17 10L10 14L3 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M3 14L10 10L17 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            className={styles.button}
            onClick={() => handleAction(onSettings, 'light')}
            aria-label="Settings"
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 12C11.1046 12 12 11.1046 12 10C12 8.89543 11.1046 8 10 8C8.89543 8 8 8.89543 8 10C8 11.1046 8.89543 12 10 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M16 10C16 10.5304 15.9616 11.0521 15.8887 11.5618L17.4149 12.75C17.5946 12.8904 17.6515 13.1336 17.5516 13.3377L16.1516 15.9123C16.0517 16.1164 15.8186 16.2022 15.6063 16.1235L13.7937 15.4374C13.3407 15.7808 12.8351 16.061 12.2917 16.2644L12 18.1667C11.9666 18.3852 11.7827 18.5556 11.5625 18.5556H8.4375C8.21734 18.5556 8.03338 18.3852 8 18.1667L7.70833 16.2644C7.16491 16.061 6.65931 15.7808 6.20631 15.4374L4.39371 16.1235C4.18139 16.2022 3.94829 16.1164 3.84838 15.9123L2.44838 13.3377C2.34847 13.1336 2.40537 12.8904 2.58511 12.75L4.11134 11.5618C4.03836 11.0521 4 10.5304 4 10C4 9.46957 4.03836 8.94787 4.11134 8.4382L2.58511 7.25C2.40537 7.10957 2.34847 6.86636 2.44838 6.66232L3.84838 4.08768C3.94829 3.88364 4.18139 3.79778 4.39371 3.87654L6.20631 4.56262C6.65931 4.21924 7.16491 3.93895 7.70833 3.73563L8 1.83333C8.03338 1.61478 8.21734 1.44444 8.4375 1.44444H11.5625C11.7827 1.44444 11.9666 1.61478 12 1.83333L12.2917 3.73563C12.8351 3.93895 13.3407 4.21924 13.7937 4.56262L15.6063 3.87654C15.8186 3.79778 16.0517 3.88364 16.1516 4.08768L17.5516 6.66232C17.6515 6.86636 17.5946 7.10957 17.4149 7.25L15.8887 8.4382C15.9616 8.94787 16 9.46957 16 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileToolbar;
