/**
 * StickerNest v2 - Fullscreen Canvas Preview
 *
 * Minimal fullscreen overlay for previewing canvases.
 * Features:
 * - Clean, distraction-free view with only the canvas
 * - Hover arrow to cycle between mobile/web preview modes
 * - Optional black or theme background
 */

import React, { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '../../utils/haptics';
import { ChevronRight, Settings } from 'lucide-react';
import { DeviceFrame } from './DeviceFrame';
import { useDevicePreviewStore } from '../../state/useDevicePreviewStore';
import { getEffectiveDimensions } from '../../types/devicePreview';
import { useViewportModeStore } from '../../state/useViewportModeStore';
import { useFullscreenPreviewStore } from '../../state/useFullscreenPreviewStore';
import { useThemeStore } from '../../state/useThemeStore';
import { gradientToCss } from '../../types/customTheme';

// ============================================================================
// TYPES
// ============================================================================

interface FullscreenPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  accentColor?: string;
  showControls?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  zoom?: number;
  /** Canvas dimensions for device preview scaling */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Render function for device preview mode (receives scaled dimensions) */
  renderCanvas?: (width: number, height: number) => React.ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FullscreenPreview = memo(function FullscreenPreview({
  isOpen,
  onClose,
  children,
  accentColor = '#8b5cf6',
  canvasWidth = 1920,
  canvasHeight = 1080,
  renderCanvas,
}: FullscreenPreviewProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isArrowHovered, setIsArrowHovered] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Viewport mode state
  const { activeMode, toggleMode } = useViewportModeStore();

  // Fullscreen preview settings
  const { background, toggleBackground } = useFullscreenPreviewStore();

  // Theme for app background
  const appBackground = useThemeStore((state) => state.currentTheme.appBackground);

  // Device preview state
  const {
    enabled: devicePreviewEnabled,
    showFrame,
    orientation,
    preset,
    customDimensions,
  } = useDevicePreviewStore();

  // Calculate device dimensions
  const deviceDimensions = useMemo(() => {
    const baseWidth = preset?.width ?? customDimensions.width;
    const baseHeight = preset?.height ?? customDimensions.height;
    return getEffectiveDimensions(baseWidth, baseHeight, orientation);
  }, [preset, customDimensions, orientation]);

  // Calculate scale to fit device in container
  const deviceScale = useMemo(() => {
    if (!devicePreviewEnabled || containerSize.width === 0) return 1;

    const padding = 80;
    const frameOverhead = showFrame ? 24 : 0;

    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    const deviceWidth = deviceDimensions.width + frameOverhead;
    const deviceHeight = deviceDimensions.height + frameOverhead;

    const scaleX = availableWidth / deviceWidth;
    const scaleY = availableHeight / deviceHeight;

    return Math.min(scaleX, scaleY, 1);
  }, [devicePreviewEnabled, containerSize, deviceDimensions, showFrame]);

  // Get background style
  const backgroundStyle = useMemo((): React.CSSProperties => {
    if (background === 'black') {
      return { background: 'rgba(0, 0, 0, 0.98)' };
    }

    // Use theme's app background
    if (appBackground.type === 'solid' && appBackground.color) {
      return { background: appBackground.color };
    } else if (appBackground.type === 'gradient' && appBackground.gradient) {
      return { background: gradientToCss(appBackground.gradient) };
    } else if (appBackground.type === 'image' && appBackground.imageUrl) {
      return {
        backgroundImage: `url(${appBackground.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }

    // Fallback
    return { background: '#0a0a1a' };
  }, [background, appBackground]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        haptic('light');
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Enter animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close settings menu on click outside
  useEffect(() => {
    if (!showSettingsMenu) return;

    const handleClick = () => setShowSettingsMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showSettingsMenu]);

  // Measure container size
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const rect = node.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

  const handleArrowClick = useCallback(() => {
    haptic('light');
    toggleMode();
  }, [toggleMode]);

  const handleSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      haptic('light');
      setShowSettingsMenu(!showSettingsMenu);
    },
    [showSettingsMenu]
  );

  const handleBackgroundToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      haptic('light');
      toggleBackground();
      setShowSettingsMenu(false);
    },
    [toggleBackground]
  );

  if (!isOpen) return null;

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        ...backgroundStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'scale(0.98)' : 'scale(1)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Canvas Preview"
    >
      {/* Content Area */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {devicePreviewEnabled ? (
          // Device Preview Mode
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: 40,
            }}
          >
            <DeviceFrame
              width={deviceDimensions.width}
              height={deviceDimensions.height}
              showFrame={showFrame}
              orientation={orientation}
              preset={preset}
              accentColor={accentColor}
              scale={deviceScale}
            >
              <div
                style={{
                  width: deviceDimensions.width,
                  height: deviceDimensions.height,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {renderCanvas
                  ? renderCanvas(deviceDimensions.width, deviceDimensions.height)
                  : children}
              </div>
            </DeviceFrame>
          </div>
        ) : (
          // Normal Preview Mode
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        )}

        {/* Mode Arrow (right side) */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={() => setIsArrowHovered(true)}
          onMouseLeave={() => setIsArrowHovered(false)}
        >
          <button
            onClick={handleArrowClick}
            style={{
              width: 36,
              height: 72,
              background: isArrowHovered
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px 0 0 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isArrowHovered ? 1 : 0.3,
              transition: 'all 0.2s ease',
            }}
            title={`Switch to ${activeMode === 'mobile' ? 'Web' : 'Mobile'} preview`}
          >
            <ChevronRight
              size={24}
              style={{
                color: '#fff',
                opacity: isArrowHovered ? 1 : 0.6,
                transition: 'opacity 0.2s ease',
              }}
            />
          </button>
        </div>

        {/* Settings button (top-right corner) */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
          }}
          onMouseEnter={() => setIsSettingsHovered(true)}
          onMouseLeave={() => {
            if (!showSettingsMenu) setIsSettingsHovered(false);
          }}
        >
          <button
            onClick={handleSettingsClick}
            style={{
              width: 36,
              height: 36,
              background:
                isSettingsHovered || showSettingsMenu
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSettingsHovered || showSettingsMenu ? 1 : 0,
              transition: 'all 0.2s ease',
            }}
            title="Preview settings"
          >
            <Settings
              size={18}
              style={{
                color: '#fff',
                opacity: 0.8,
              }}
            />
          </button>

          {/* Settings Menu */}
          {showSettingsMenu && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                right: 0,
                background: 'rgba(30, 30, 40, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: 4,
                minWidth: 180,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleBackgroundToggle}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>Background</span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.5)',
                    textTransform: 'capitalize',
                  }}
                >
                  {background}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

export default FullscreenPreview;
