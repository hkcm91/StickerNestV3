/**
 * StickerNest v2 - Device Frame Component
 *
 * Renders a realistic device frame (bezel) around content.
 * Supports phone-style frames with notch/dynamic island and home indicator.
 */

import React, { memo, useMemo } from 'react';
import type { DeviceOrientation, DevicePreset } from '../../types/devicePreview';

// ============================================================================
// TYPES
// ============================================================================

interface DeviceFrameProps {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Show device frame bezel */
  showFrame: boolean;
  /** Device orientation */
  orientation: DeviceOrientation;
  /** Optional preset for specific device features */
  preset?: DevicePreset | null;
  /** Accent color for frame details */
  accentColor?: string;
  /** Content to render inside the device */
  children: React.ReactNode;
  /** Scale factor for the entire frame */
  scale?: number;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  frameContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceFrame: {
    position: 'relative' as const,
    background: '#1a1a1a',
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.1),
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
    overflow: 'hidden',
  },
  simpleFrame: {
    position: 'relative' as const,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
  },
  viewport: {
    position: 'relative' as const,
    overflow: 'hidden',
    background: '#000',
  },
  notch: {
    position: 'absolute' as const,
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#000',
    zIndex: 10,
  },
  dynamicIsland: {
    position: 'absolute' as const,
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#000',
    borderRadius: 20,
    zIndex: 10,
  },
  homeIndicator: {
    position: 'absolute' as const,
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 134,
    height: 5,
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    zIndex: 10,
  },
  statusBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    zIndex: 5,
    pointerEvents: 'none' as const,
  },
  statusBarTime: {
    fontWeight: 600,
  },
  statusBarIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const Notch = memo(function Notch({ width }: { width: number }) {
  const notchWidth = Math.min(width * 0.4, 160);
  return (
    <div
      style={{
        ...styles.notch,
        width: notchWidth,
        height: 30,
        borderRadius: '0 0 20px 20px',
      }}
    />
  );
});

const DynamicIsland = memo(function DynamicIsland() {
  return (
    <div
      style={{
        ...styles.dynamicIsland,
        width: 126,
        height: 37,
      }}
    />
  );
});

const HomeIndicator = memo(function HomeIndicator() {
  return <div style={styles.homeIndicator} />;
});

const StatusBar = memo(function StatusBar({ hasNotch }: { hasNotch?: boolean }) {
  const time = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, []);

  return (
    <div style={{ ...styles.statusBar, paddingTop: hasNotch ? 0 : 0 }}>
      <span style={styles.statusBarTime}>{time}</span>
      <div style={styles.statusBarIcons}>
        <span>📶</span>
        <span>📡</span>
        <span>🔋</span>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DeviceFrame = memo(function DeviceFrame({
  width,
  height,
  showFrame,
  orientation,
  preset,
  accentColor = '#8b5cf6',
  children,
  scale = 1,
}: DeviceFrameProps) {
  // Calculate effective dimensions based on orientation
  const effectiveWidth = orientation === 'landscape' ? Math.max(width, height) : Math.min(width, height);
  const effectiveHeight = orientation === 'landscape' ? Math.min(width, height) : Math.max(width, height);

  // Bezel thickness based on whether frame is shown
  const bezelThickness = showFrame ? 12 : 0;
  const bezelRadius = preset?.bezelRadius ?? (showFrame ? 44 : 0);

  // Determine device features
  const hasNotch = preset?.hasNotch ?? false;
  const hasDynamicIsland = preset?.hasDynamicIsland ?? false;
  const hasHomeIndicator = preset?.hasHomeIndicator ?? true;
  const isPhone = (preset?.category === 'phone') || (effectiveHeight > effectiveWidth && effectiveWidth < 500);

  // Total frame dimensions
  const frameWidth = effectiveWidth + (bezelThickness * 2);
  const frameHeight = effectiveHeight + (bezelThickness * 2);

  if (!showFrame) {
    // Simple frame - just a border
    return (
      <div
        style={{
          ...styles.frameContainer,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            ...styles.simpleFrame,
            width: effectiveWidth,
            height: effectiveHeight,
            borderRadius: 8,
            border: `2px solid ${accentColor}44`,
          }}
        >
          <div
            style={{
              ...styles.viewport,
              width: effectiveWidth,
              height: effectiveHeight,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Full device frame with bezel
  return (
    <div
      style={{
        ...styles.frameContainer,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        style={{
          ...styles.deviceFrame,
          width: frameWidth,
          height: frameHeight,
          borderRadius: bezelRadius + bezelThickness,
          padding: bezelThickness,
        }}
      >
        {/* Viewport/Screen area */}
        <div
          style={{
            ...styles.viewport,
            width: effectiveWidth,
            height: effectiveHeight,
            borderRadius: bezelRadius,
          }}
        >
          {/* Status bar (only for phones in portrait) */}
          {isPhone && orientation === 'portrait' && (
            <StatusBar hasNotch={hasNotch || hasDynamicIsland} />
          )}

          {/* Notch or Dynamic Island */}
          {hasDynamicIsland && orientation === 'portrait' && <DynamicIsland />}
          {hasNotch && !hasDynamicIsland && orientation === 'portrait' && (
            <Notch width={effectiveWidth} />
          )}

          {/* Content */}
          {children}

          {/* Home indicator */}
          {hasHomeIndicator && orientation === 'portrait' && <HomeIndicator />}
        </div>

        {/* Side buttons (subtle) */}
        {isPhone && showFrame && (
          <>
            {/* Power button */}
            <div
              style={{
                position: 'absolute',
                right: -2,
                top: 100,
                width: 3,
                height: 60,
                background: '#333',
                borderRadius: '0 2px 2px 0',
              }}
            />
            {/* Volume buttons */}
            <div
              style={{
                position: 'absolute',
                left: -2,
                top: 80,
                width: 3,
                height: 35,
                background: '#333',
                borderRadius: '2px 0 0 2px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: -2,
                top: 125,
                width: 3,
                height: 35,
                background: '#333',
                borderRadius: '2px 0 0 2px',
              }}
            />
          </>
        )}
      </div>

      {/* Dimension label */}
      <div
        style={{
          position: 'absolute',
          bottom: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.5)',
          whiteSpace: 'nowrap',
        }}
      >
        {effectiveWidth} × {effectiveHeight}
      </div>
    </div>
  );
});

export default DeviceFrame;
