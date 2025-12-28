/**
 * StickerNest v2 - Landing Canvas Demo
 *
 * Milanote-style canvas demo for the landing page with:
 * - Smooth pan and zoom navigation
 * - Fullscreen preview mode
 * - Canvas size selection
 * - Visual cursor states for navigation
 * - Mobile-optimized touch interactions
 */

import React, {
  memo,
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { MainCanvas, MainCanvasRef, CanvasMode } from '../../canvas/MainCanvas';
import { CanvasSizeSelector, CANVAS_SIZE_PRESETS } from './CanvasSizeSelector';
import { FullscreenPreview } from './FullscreenPreview';
import { NavigationHint } from './NavigationHint';
import { useViewport, useSafeArea } from '../../hooks/useResponsive';
import { haptic } from '../../utils/haptics';
import { useCanvasStyle } from '../../state/useCanvasAppearanceStore';
import { EventBus } from '../../runtime/EventBus';
import type { WidgetInstance } from '../../types/domain';

// ============================================================================
// TYPES
// ============================================================================

export interface LandingCanvasDemoProps {
  canvasId: string;
  renderWidget: (widget: WidgetInstance) => React.ReactNode;
  accentColor?: string;
  onModeChange?: (mode: CanvasMode) => void;
  initialMode?: CanvasMode;
  showControls?: boolean;
  showSizeSelector?: boolean;
  showFullscreenButton?: boolean;
}

export interface LandingCanvasDemoRef {
  getCanvasRef: () => MainCanvasRef | null;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  setMode: (mode: CanvasMode) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const LandingCanvasDemo = memo(
  forwardRef<LandingCanvasDemoRef, LandingCanvasDemoProps>(function LandingCanvasDemo(
    {
      canvasId,
      renderWidget,
      accentColor = '#8b5cf6',
      onModeChange,
      initialMode = 'view',
      showControls = true,
      showSizeSelector = true,
      showFullscreenButton = true,
    },
    ref
  ) {
    const canvasRef = useRef<MainCanvasRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const eventBusRef = useRef<EventBus>(new EventBus());
    const { isMobile } = useViewport();
    const safeArea = useSafeArea();
    const canvasStyle = useCanvasStyle();

    // State
    const [mode, setMode] = useState<CanvasMode>(initialMode);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
    const [zoom, setZoom] = useState(1);
    const [showNavHint, setShowNavHint] = useState(true);
    const [isPanning, setIsPanning] = useState(false);

    // Initialize with fit-to-view
    useEffect(() => {
      const timer = setTimeout(() => {
        canvasRef.current?.fitToView();
      }, 200);
      return () => clearTimeout(timer);
    }, [canvasSize]);

    // Hide nav hint after interaction
    useEffect(() => {
      const hideHint = () => setShowNavHint(false);
      const timer = setTimeout(hideHint, 8000);
      return () => clearTimeout(timer);
    }, []);

    // Imperative handle
    useImperativeHandle(ref, () => ({
      getCanvasRef: () => canvasRef.current,
      enterFullscreen: () => setIsFullscreen(true),
      exitFullscreen: () => setIsFullscreen(false),
      setMode: (newMode: CanvasMode) => {
        setMode(newMode);
        canvasRef.current?.setMode(newMode);
      },
    }), []);

    // Handlers
    const handleModeChange = useCallback((newMode: CanvasMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
    }, [onModeChange]);

    const handleSizeChange = useCallback((width: number, height: number) => {
      haptic('medium');
      setCanvasSize({ width, height });
    }, []);

    const handleFullscreenToggle = useCallback(() => {
      haptic('light');
      setIsFullscreen(prev => !prev);
    }, []);

    const handleZoomIn = useCallback(() => {
      canvasRef.current?.zoomTo(Math.min(zoom * 1.25, 5));
    }, [zoom]);

    const handleZoomOut = useCallback(() => {
      canvasRef.current?.zoomTo(Math.max(zoom / 1.25, 0.1));
    }, [zoom]);

    const handleResetView = useCallback(() => {
      canvasRef.current?.fitToView();
    }, []);

    // Track zoom level changes
    const handleCanvasUpdate = useCallback(() => {
      // This would be connected to canvas viewport changes
    }, []);

    // Cursor state for pan mode
    const getCursor = () => {
      if (isPanning) return 'grabbing';
      if (mode === 'view') return 'grab';
      return 'default';
    };

    return (
      <>
        {/* Main Demo Container */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10, 10, 18, 0.95)',
            borderRadius: isMobile ? 0 : 16,
            overflow: 'hidden',
            cursor: getCursor(),
          }}
          onMouseDown={() => mode === 'view' && setIsPanning(true)}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
        >
          {/* Controls Bar */}
          {showControls && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '8px 12px' : '12px 16px',
                background: 'rgba(15, 15, 25, 0.9)',
                borderBottom: `1px solid ${accentColor}22`,
                flexShrink: 0,
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {/* Left: Mode Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    padding: 3,
                    background: 'rgba(15, 15, 25, 0.8)',
                    borderRadius: 8,
                    border: `1px solid ${accentColor}22`,
                  }}
                >
                  {(['view', 'edit'] as CanvasMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        haptic('light');
                        setMode(m);
                        canvasRef.current?.setMode(m);
                        handleModeChange(m);
                      }}
                      style={{
                        padding: isMobile ? '8px 14px' : '8px 16px',
                        minHeight: 40,
                        background: mode === m ? accentColor : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        color: mode === m ? '#fff' : '#94a3b8',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        touchAction: 'manipulation',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Canvas Label - Desktop only */}
                {!isMobile && (
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    Demo Canvas
                  </span>
                )}
              </div>

              {/* Right: Size Selector & Fullscreen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Size Selector - Desktop only */}
                {showSizeSelector && !isMobile && (
                  <CanvasSizeSelector
                    currentSize={canvasSize}
                    onSizeChange={handleSizeChange}
                    accentColor={accentColor}
                    compact
                  />
                )}

                {/* Fullscreen Button */}
                {showFullscreenButton && (
                  <button
                    onClick={handleFullscreenToggle}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      minHeight: 40,
                      background: `${accentColor}22`,
                      border: `1px solid ${accentColor}33`,
                      borderRadius: 8,
                      color: '#e2e8f0',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                    }}
                    aria-label="Enter fullscreen preview"
                  >
                    <span style={{ fontSize: 14 }}>⛶</span>
                    {!isMobile && <span>Fullscreen</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              minHeight: isMobile ? 300 : 400,
            }}
          >
            <MainCanvas
              ref={canvasRef}
              canvasId={canvasId}
              mode={mode}
              width={canvasSize.width}
              height={canvasSize.height}
              renderWidget={renderWidget}
              onModeChange={handleModeChange}
              showModeToggle={false}
              showZoomControls={!isMobile}
              autoSaveInterval={30000}
              accentColor={accentColor}
              backgroundStyle={canvasStyle}
              eventBus={eventBusRef.current}
            />

            {/* Navigation Hint Overlay */}
            {showNavHint && !isMobile && (
              <NavigationHint
                mode={mode}
                accentColor={accentColor}
                onDismiss={() => setShowNavHint(false)}
              />
            )}
          </div>

          {/* Mobile Bottom Controls */}
          {isMobile && showControls && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: `8px 12px ${safeArea.bottom + 8}px`,
                background: 'rgba(15, 15, 25, 0.9)',
                borderTop: `1px solid ${accentColor}22`,
              }}
            >
              <button
                onClick={handleZoomOut}
                style={{
                  width: 44,
                  height: 44,
                  background: `${accentColor}33`,
                  border: 'none',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                −
              </button>
              <button
                onClick={handleResetView}
                style={{
                  padding: '8px 16px',
                  minHeight: 44,
                  background: 'transparent',
                  border: `1px solid ${accentColor}33`,
                  borderRadius: 8,
                  color: '#94a3b8',
                  fontSize: 12,
                }}
              >
                Fit View
              </button>
              <button
                onClick={handleZoomIn}
                style={{
                  width: 44,
                  height: 44,
                  background: `${accentColor}33`,
                  border: 'none',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
          )}
        </div>

        {/* Fullscreen Preview */}
        <FullscreenPreview
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          title="Canvas Preview"
          accentColor={accentColor}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
        >
          <MainCanvas
            canvasId={canvasId}
            mode="view"
            width={canvasSize.width}
            height={canvasSize.height}
            renderWidget={renderWidget}
            showModeToggle={false}
            showZoomControls={false}
            accentColor={accentColor}
            backgroundStyle={canvasStyle}
            eventBus={eventBusRef.current}
          />
        </FullscreenPreview>
      </>
    );
  })
);

export default LandingCanvasDemo;
