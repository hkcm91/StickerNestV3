/**
 * StickerNest v2 - Creative Toolbar
 * Minimal Adobe/Canva-style vertical toolbar for canvas creation tools
 * No header, no border - very minimal design
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import {
  MousePointer2,
  Square,
  Circle,
  Triangle,
  Hexagon,
  Star,
  Minus,
  Type,
  Image,
  Box,
  MoreHorizontal,
  ChevronRight,
  RectangleHorizontal,
  Pentagon,
  Octagon,
  Disc,
  Pyramid,
  LifeBuoy,
  Layers,
  ArrowRight,
  Pencil,
  Eye,
  GripVertical,
  Glasses,
} from 'lucide-react';
import { useToolStore, useActiveTool, useShapeSubmenuOpen, useObject3DSubmenuOpen } from '../state/useToolStore';
import { useCanvasStore } from '../state/useCanvasStore';
import { useSpatialModeStore, useActiveSpatialMode, useIsVRMode, useXRCapabilities } from '../state/useSpatialModeStore';
import { xrStore } from './spatial/xrStore';
import type { VectorShapeType, Object3DPrimitiveType } from '../types/entities';
import type { LucideIcon } from 'lucide-react';

// ============================================
// Types
// ============================================

interface ToolButtonProps {
  icon: LucideIcon;
  tooltip: string;
  active?: boolean;
  hasSubmenu?: boolean;
  submenuOpen?: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

interface SubmenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

// ============================================
// Shape Icons Mapping
// ============================================

const shapeIcons: Record<VectorShapeType, LucideIcon> = {
  rectangle: Square,
  circle: Circle,
  triangle: Triangle,
  polygon: Hexagon,
  star: Star,
  ellipse: RectangleHorizontal,
  line: Minus,
  arrow: ArrowRight,
};

const shapeLabels: Record<VectorShapeType, string> = {
  rectangle: 'Rectangle',
  circle: 'Circle',
  triangle: 'Triangle',
  polygon: 'Polygon',
  star: 'Star',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
};

// ============================================
// 3D Object Icons Mapping
// ============================================

const object3dIcons: Record<Object3DPrimitiveType, LucideIcon> = {
  cube: Box,
  sphere: Circle,
  cylinder: Disc,
  cone: Pyramid,
  torus: LifeBuoy,
  plane: Layers,
  custom: Box,
};

const object3dLabels: Record<Object3DPrimitiveType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  plane: 'Plane',
  custom: 'Custom Model',
};

// ============================================
// Tool Button Component
// ============================================

const ToolButton: React.FC<ToolButtonProps> = ({
  icon: Icon,
  tooltip,
  active = false,
  hasSubmenu = false,
  submenuOpen = false,
  onClick,
  onContextMenu,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          padding: 0,
          border: 'none',
          borderRadius: 6,
          background: active
            ? 'var(--sn-accent-primary)'
            : isHovered
            ? 'var(--sn-glass-bg-light)'
            : 'transparent',
          color: active ? '#ffffff' : 'var(--sn-text-secondary)',
          cursor: 'pointer',
          transition: 'all 100ms ease-out',
          position: 'relative',
        }}
        title={tooltip}
      >
        <Icon size={18} strokeWidth={1.5} />
        {hasSubmenu && (
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 0,
              height: 0,
              borderLeft: '3px solid transparent',
              borderRight: '3px solid transparent',
              borderTop: submenuOpen
                ? 'none'
                : `4px solid ${active ? '#ffffff' : 'var(--sn-text-muted)'}`,
              borderBottom: submenuOpen
                ? `4px solid ${active ? '#ffffff' : 'var(--sn-text-muted)'}`
                : 'none',
            }}
          />
        )}
      </button>
    </div>
  );
};

// ============================================
// Submenu Item Component
// ============================================

const SubmenuItem: React.FC<SubmenuItemProps> = ({ icon: Icon, label, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        borderRadius: 4,
        background: isHovered ? 'var(--sn-glass-bg-light)' : 'transparent',
        color: 'var(--sn-text-primary)',
        cursor: 'pointer',
        fontSize: 12,
        textAlign: 'left',
        transition: 'background 100ms ease-out',
      }}
    >
      <Icon size={16} strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );
};

// ============================================
// Submenu Component
// ============================================

interface SubmenuProps {
  items: Array<{ icon: LucideIcon; label: string; value: string }>;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const Submenu: React.FC<SubmenuProps> = ({ items, onSelect, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click using shared hook
  useClickOutside(menuRef, onClose);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: 44,
        top: 0,
        minWidth: 140,
        padding: 4,
        background: 'var(--sn-bg-elevated)',
        borderRadius: 8,
        border: '1px solid var(--sn-glass-border)',
        boxShadow: 'var(--sn-shadow-lg)',
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <SubmenuItem
          key={item.value}
          icon={item.icon}
          label={item.label}
          onClick={() => onSelect(item.value)}
        />
      ))}
    </div>
  );
};

// ============================================
// Divider Component
// ============================================

const Divider: React.FC = () => (
  <div
    style={{
      width: 20,
      height: 1,
      margin: '4px auto',
      background: 'var(--sn-border-primary)',
    }}
  />
);

// ============================================
// Main Toolbar Component
// ============================================

export const CreativeToolbar: React.FC = () => {
  const activeTool = useActiveTool();
  const shapeSubmenuOpen = useShapeSubmenuOpen();
  const object3dSubmenuOpen = useObject3DSubmenuOpen();

  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const selectShapeTool = useToolStore((s) => s.selectShapeTool);
  const selectObject3DTool = useToolStore((s) => s.selectObject3DTool);
  const toggleShapeSubmenu = useToolStore((s) => s.toggleShapeSubmenu);
  const toggleObject3DSubmenu = useToolStore((s) => s.toggleObject3DSubmenu);
  const closeAllSubmenus = useToolStore((s) => s.closeAllSubmenus);

  const mode = useCanvasStore((s) => s.mode);
  const setMode = useCanvasStore((s) => s.setMode);

  // Spatial mode (VR/AR/Desktop)
  const spatialMode = useActiveSpatialMode();
  const isVRMode = useIsVRMode();
  const capabilities = useXRCapabilities();
  const setSessionState = useSpatialModeStore((s) => s.setSessionState);
  const setActiveMode = useSpatialModeStore((s) => s.setActiveMode);

  // Handle VR toggle - actually enters/exits the XR session
  const handleVRToggle = useCallback(async () => {
    console.log('[CreativeToolbar] handleVRToggle called', {
      isVRMode,
      vrSupported: capabilities.vrSupported,
      webXRAvailable: capabilities.webXRAvailable,
    });

    if (isVRMode) {
      // Exit VR
      console.log('[CreativeToolbar] Exiting VR mode...');
      const session = xrStore.getState().session;
      if (session) {
        session.end();
      }
      setSessionState('none');
      setActiveMode('desktop');
    } else {
      // Enter VR - ALWAYS try real VR first if WebXR is available
      // Don't let touch detection block VR - many VR-capable PCs have touch screens
      const userAgentMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Only use preview mode for iOS devices (no WebXR support)
      // Android devices might be Quest browser which DOES support WebXR
      if (userAgentMobile) {
        console.log('[CreativeToolbar] iOS device detected, using VR preview mode');
        useSpatialModeStore.getState().enterPreviewMode('vr');
        return;
      }

      // Check if WebXR is available at all
      if (!navigator.xr) {
        console.warn('[CreativeToolbar] WebXR API not available, using preview mode');
        useSpatialModeStore.getState().enterPreviewMode('vr');
        return;
      }

      // Try to enter real VR - let it fail naturally if not supported
      console.log('[CreativeToolbar] Attempting to enter VR via xrStore.enterVR()...');
      try {
        setSessionState('requesting');
        await xrStore.enterVR();
        console.log('[CreativeToolbar] xrStore.enterVR() completed successfully!');
      } catch (err) {
        console.error('[CreativeToolbar] Failed to enter VR:', err);
        console.log('[CreativeToolbar] Falling back to preview mode');
        // Fall back to preview mode instead of returning to desktop
        useSpatialModeStore.getState().enterPreviewMode('vr');
      }
    }
  }, [isVRMode, capabilities.vrSupported, capabilities.webXRAvailable, setSessionState, setActiveMode]);

  // Shape submenu items
  const shapeItems: Array<{ icon: LucideIcon; label: string; value: VectorShapeType }> = [
    { icon: Square, label: 'Rectangle', value: 'rectangle' },
    { icon: Circle, label: 'Circle', value: 'circle' },
    { icon: Triangle, label: 'Triangle', value: 'triangle' },
    { icon: Hexagon, label: 'Polygon', value: 'polygon' },
    { icon: Star, label: 'Star', value: 'star' },
    { icon: RectangleHorizontal, label: 'Ellipse', value: 'ellipse' },
  ];

  // Line tools (separate from shapes for clarity)
  const lineItems: Array<{ icon: LucideIcon; label: string; value: VectorShapeType }> = [
    { icon: Minus, label: 'Line', value: 'line' },
    { icon: ArrowRight, label: 'Arrow', value: 'arrow' },
  ];

  // 3D object submenu items
  const object3dItems: Array<{ icon: LucideIcon; label: string; value: Object3DPrimitiveType }> = [
    { icon: Box, label: 'Cube', value: 'cube' },
    { icon: Circle, label: 'Sphere', value: 'sphere' },
    { icon: Disc, label: 'Cylinder', value: 'cylinder' },
    { icon: Pyramid, label: 'Cone', value: 'cone' },
    { icon: LifeBuoy, label: 'Torus', value: 'torus' },
    { icon: Layers, label: 'Plane', value: 'plane' },
  ];

  const handleSelectTool = useCallback(() => {
    setActiveTool({ category: 'select' });
  }, [setActiveTool]);

  const handleTextTool = useCallback(() => {
    setActiveTool({ category: 'text' });
  }, [setActiveTool]);

  const handleImageTool = useCallback(() => {
    setActiveTool({ category: 'image' });
  }, [setActiveTool]);

  const handleMoreTool = useCallback(() => {
    setActiveTool({ category: 'more' });
  }, [setActiveTool]);

  const handleShapeSelect = useCallback(
    (value: string) => {
      selectShapeTool(value as VectorShapeType);
    },
    [selectShapeTool]
  );

  const handleLineTool = useCallback(() => {
    selectShapeTool('line');
  }, [selectShapeTool]);

  const handleObject3DSelect = useCallback(
    (value: string) => {
      selectObject3DTool(value as Object3DPrimitiveType);
    },
    [selectObject3DTool]
  );

  // Get current shape icon based on last selected shape
  const currentShapeType = activeTool.shapeType || 'rectangle';
  const CurrentShapeIcon = shapeIcons[currentShapeType] || Square;

  // Get current 3D object icon
  const currentObject3DType = activeTool.object3dType || 'cube';
  const CurrentObject3DIcon = object3dIcons[currentObject3DType] || Box;

  const isEditMode = mode === 'edit';

  const handleToggleMode = useCallback(() => {
    setMode(isEditMode ? 'view' : 'edit');
  }, [setMode, isEditMode]);

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = { x: clientX, y: clientY };
    positionStartRef.current = { ...position };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      setPosition({
        x: positionStartRef.current.x + deltaX,
        y: positionStartRef.current.y + deltaY,
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
        background: 'var(--sn-glass-bg)',
        backdropFilter: 'blur(var(--sn-glass-blur-md))',
        WebkitBackdropFilter: 'blur(var(--sn-glass-blur-md))',
        border: '1px solid var(--sn-glass-border)',
        borderRadius: 12,
        gap: 2,
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 20,
          cursor: isDragging ? 'grabbing' : 'grab',
          color: 'var(--sn-text-muted)',
          marginBottom: 2,
        }}
        title="Drag to move toolbar"
      >
        <GripVertical size={14} />
      </div>
      {/* Mode Toggle - Always clickable */}
      <ToolButton
        icon={isEditMode ? Pencil : Eye}
        tooltip={isEditMode ? 'Edit Mode (E) - Click for View' : 'View Mode - Click for Edit'}
        active={isEditMode}
        onClick={handleToggleMode}
      />

      {/* VR Mode Toggle */}
      <ToolButton
        icon={Glasses}
        tooltip={isVRMode ? 'Exit VR Mode' : (capabilities.vrSupported ? 'Enter VR Mode' : 'VR not supported')}
        active={isVRMode}
        onClick={handleVRToggle}
      />

      <Divider />

      {/* Select Tool - works in all modes */}
      <ToolButton
        icon={MousePointer2}
        tooltip="Select (V)"
        active={activeTool.category === 'select'}
        onClick={handleSelectTool}
      />

      <Divider />

      {/* Shape Tools */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          icon={CurrentShapeIcon}
          tooltip={`Shape: ${shapeLabels[currentShapeType]} (U)`}
          active={activeTool.category === 'shape' && activeTool.shapeType !== 'line' && activeTool.shapeType !== 'arrow'}
          hasSubmenu
          submenuOpen={shapeSubmenuOpen}
          onClick={() => {
            if (activeTool.category === 'shape') {
              toggleShapeSubmenu();
            } else {
              selectShapeTool(currentShapeType);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleShapeSubmenu();
          }}
        />
        {shapeSubmenuOpen && (
          <Submenu
            items={shapeItems}
            onSelect={handleShapeSelect}
            onClose={closeAllSubmenus}
          />
        )}
      </div>

      {/* Line Tool */}
      <ToolButton
        icon={activeTool.shapeType === 'arrow' ? ArrowRight : Minus}
        tooltip="Line (L)"
        active={activeTool.category === 'shape' && (activeTool.shapeType === 'line' || activeTool.shapeType === 'arrow')}
        onClick={handleLineTool}
        onContextMenu={(e) => {
          e.preventDefault();
          selectShapeTool(activeTool.shapeType === 'arrow' ? 'line' : 'arrow');
        }}
      />

      <Divider />

      {/* Text Tool */}
      <ToolButton
        icon={Type}
        tooltip="Text (T)"
        active={activeTool.category === 'text'}
        onClick={handleTextTool}
      />

      {/* Image Tool */}
      <ToolButton
        icon={Image}
        tooltip="Image (I)"
        active={activeTool.category === 'image'}
        onClick={handleImageTool}
      />

      <Divider />

      {/* 3D Object Tools */}
      <div style={{ position: 'relative' }}>
        <ToolButton
          icon={CurrentObject3DIcon}
          tooltip={`3D: ${object3dLabels[currentObject3DType]}`}
          active={activeTool.category === 'object3d'}
          hasSubmenu
          submenuOpen={object3dSubmenuOpen}
          onClick={() => {
            if (activeTool.category === 'object3d') {
              toggleObject3DSubmenu();
            } else {
              selectObject3DTool(currentObject3DType);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            toggleObject3DSubmenu();
          }}
        />
        {object3dSubmenuOpen && (
          <Submenu
            items={object3dItems}
            onSelect={handleObject3DSelect}
            onClose={closeAllSubmenus}
          />
        )}
      </div>

      <Divider />

      {/* More Tools (TBD) */}
      <ToolButton
        icon={MoreHorizontal}
        tooltip="More Tools"
        active={activeTool.category === 'more'}
        onClick={handleMoreTool}
      />
    </div>
  );
};

export default CreativeToolbar;
