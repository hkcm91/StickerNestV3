/**
 * StickerNest v2 - Canvas Toolbar
 *
 * Horizontal toolbar integrated into the navigation bar.
 * Provides tool selection and entity actions connected to the canvas/entity protocol.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
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
  Trash2,
  Copy,
  Clipboard,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  RectangleHorizontal,
  Maximize2,
} from 'lucide-react';
import { useToolStore, useActiveTool, useShapeSubmenuOpen } from '../../state/useToolStore';
import { useCanvasEntityStore, useHasSelection, useSelectionCount, useSelectedEntities } from '../../state/useCanvasEntityStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import type { VectorShapeType } from '../../types/entities';
import type { LucideIcon } from 'lucide-react';
import styles from './CanvasToolbar.module.css';

// =============================================================================
// Shape configurations
// =============================================================================

const shapeConfigs: Array<{
  type: VectorShapeType;
  icon: LucideIcon;
  label: string;
}> = [
  { type: 'rectangle', icon: Square, label: 'Rectangle' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'polygon', icon: Hexagon, label: 'Polygon' },
  { type: 'star', icon: Star, label: 'Star' },
  { type: 'ellipse', icon: RectangleHorizontal, label: 'Ellipse' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

// =============================================================================
// ToolButton Component
// =============================================================================

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  hasDropdown?: boolean;
  dropdownOpen?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon: Icon,
  label,
  active = false,
  disabled = false,
  onClick,
  hasDropdown = false,
  dropdownOpen = false,
}) => (
  <button
    className={`${styles.toolButton} ${active ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
  >
    <Icon size={16} strokeWidth={1.5} />
    {hasDropdown && (
      <ChevronDown
        size={10}
        className={`${styles.dropdownIndicator} ${dropdownOpen ? styles.open : ''}`}
      />
    )}
  </button>
);

// =============================================================================
// ActionButton Component
// =============================================================================

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}) => (
  <button
    className={`${styles.actionButton} ${danger ? styles.danger : ''} ${disabled ? styles.disabled : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
  >
    <Icon size={14} strokeWidth={1.5} />
  </button>
);

// =============================================================================
// Divider Component
// =============================================================================

const ToolbarDivider: React.FC = () => <div className={styles.toolbarDivider} />;

// =============================================================================
// ShapeDropdown Component
// =============================================================================

interface ShapeDropdownProps {
  isOpen: boolean;
  currentShape: VectorShapeType;
  onSelect: (shape: VectorShapeType) => void;
  onClose: () => void;
}

const ShapeDropdown: React.FC<ShapeDropdownProps> = ({
  isOpen,
  currentShape,
  onSelect,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className={styles.shapeDropdown}>
      {shapeConfigs.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          className={`${styles.shapeOption} ${currentShape === type ? styles.active : ''}`}
          onClick={() => {
            onSelect(type);
            onClose();
          }}
        >
          <Icon size={16} strokeWidth={1.5} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// =============================================================================
// Main CanvasToolbar Component
// =============================================================================

export const CanvasToolbar: React.FC = () => {
  // Tool store state
  const activeTool = useActiveTool();
  const shapeSubmenuOpen = useShapeSubmenuOpen();
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const selectShapeTool = useToolStore((s) => s.selectShapeTool);
  const toggleShapeSubmenu = useToolStore((s) => s.toggleShapeSubmenu);
  const closeAllSubmenus = useToolStore((s) => s.closeAllSubmenus);

  // Entity store state and actions
  const hasSelection = useHasSelection();
  const selectionCount = useSelectionCount();
  const selectedEntities = useSelectedEntities();
  const {
    deleteSelected,
    copySelected,
    paste,
    duplicateSelected,
    bringToFront,
    sendToBack,
    lockSelected,
    unlockSelected,
    hideSelected,
    showSelected,
    deselectAll,
  } = useCanvasEntityStore();

  // Canvas mode
  const mode = useCanvasStore((s) => s.mode);
  const isEditMode = mode === 'edit';

  // Local state for shape dropdown
  const [showShapeDropdown, setShowShapeDropdown] = useState(false);

  // Get current shape type
  const currentShapeType = activeTool.shapeType || 'rectangle';
  const CurrentShapeIcon = shapeConfigs.find((s) => s.type === currentShapeType)?.icon || Square;

  // Check if all selected entities are locked/hidden
  const allLocked = selectedEntities.length > 0 && selectedEntities.every((e) => e.locked);
  const allHidden = selectedEntities.length > 0 && selectedEntities.every((e) => !e.visible);

  // Tool handlers
  const handleSelectTool = useCallback(() => {
    setActiveTool({ category: 'select' });
    closeAllSubmenus();
  }, [setActiveTool, closeAllSubmenus]);

  const handleShapeToolClick = useCallback(() => {
    if (activeTool.category === 'shape') {
      // Toggle dropdown if already on shape tool
      setShowShapeDropdown((prev) => !prev);
    } else {
      // Select shape tool with current shape
      selectShapeTool(currentShapeType);
      setShowShapeDropdown(false);
    }
  }, [activeTool.category, currentShapeType, selectShapeTool]);

  const handleShapeSelect = useCallback(
    (shape: VectorShapeType) => {
      selectShapeTool(shape);
      setShowShapeDropdown(false);
    },
    [selectShapeTool]
  );

  const handleTextTool = useCallback(() => {
    setActiveTool({ category: 'text' });
    closeAllSubmenus();
    setShowShapeDropdown(false);
  }, [setActiveTool, closeAllSubmenus]);

  const handleImageTool = useCallback(() => {
    setActiveTool({ category: 'image' });
    closeAllSubmenus();
    setShowShapeDropdown(false);
  }, [setActiveTool, closeAllSubmenus]);

  // Entity action handlers
  const handleDelete = useCallback(() => {
    if (hasSelection) {
      deleteSelected();
    }
  }, [hasSelection, deleteSelected]);

  const handleCopy = useCallback(() => {
    if (hasSelection) {
      copySelected();
    }
  }, [hasSelection, copySelected]);

  const handlePaste = useCallback(() => {
    paste({ x: 20, y: 20 });
  }, [paste]);

  const handleDuplicate = useCallback(() => {
    if (hasSelection) {
      duplicateSelected();
    }
  }, [hasSelection, duplicateSelected]);

  const handleBringToFront = useCallback(() => {
    if (selectedEntities.length === 1) {
      bringToFront(selectedEntities[0].id);
    }
  }, [selectedEntities, bringToFront]);

  const handleSendToBack = useCallback(() => {
    if (selectedEntities.length === 1) {
      sendToBack(selectedEntities[0].id);
    }
  }, [selectedEntities, sendToBack]);

  const handleToggleLock = useCallback(() => {
    if (allLocked) {
      unlockSelected();
    } else {
      lockSelected();
    }
  }, [allLocked, lockSelected, unlockSelected]);

  const handleToggleVisibility = useCallback(() => {
    if (allHidden) {
      showSelected();
    } else {
      hideSelected();
    }
  }, [allHidden, hideSelected, showSelected]);

  // Close dropdown when clicking elsewhere
  const handleCloseDropdown = useCallback(() => {
    setShowShapeDropdown(false);
  }, []);

  return (
    <div className={styles.toolbar}>
      {/* Tool Selection Section */}
      <div className={styles.toolSection}>
        <ToolButton
          icon={MousePointer2}
          label="Select (V)"
          active={activeTool.category === 'select'}
          onClick={handleSelectTool}
        />

        <div className={styles.dropdownContainer}>
          <ToolButton
            icon={CurrentShapeIcon}
            label={`Shape: ${shapeConfigs.find((s) => s.type === currentShapeType)?.label || 'Rectangle'}`}
            active={activeTool.category === 'shape'}
            onClick={handleShapeToolClick}
            hasDropdown
            dropdownOpen={showShapeDropdown}
            disabled={!isEditMode}
          />
          <ShapeDropdown
            isOpen={showShapeDropdown}
            currentShape={currentShapeType}
            onSelect={handleShapeSelect}
            onClose={handleCloseDropdown}
          />
        </div>

        <ToolButton
          icon={Type}
          label="Text (T)"
          active={activeTool.category === 'text'}
          onClick={handleTextTool}
          disabled={!isEditMode}
        />

        <ToolButton
          icon={Image}
          label="Image (I)"
          active={activeTool.category === 'image'}
          onClick={handleImageTool}
          disabled={!isEditMode}
        />
      </div>

      {/* Entity Actions Section - Only visible in edit mode with selection */}
      {isEditMode && (
        <>
          <ToolbarDivider />

          <div className={styles.actionSection}>
            {/* Selection indicator */}
            {hasSelection && (
              <span className={styles.selectionIndicator}>
                <Layers size={12} />
                {selectionCount}
              </span>
            )}

            {/* Copy/Paste */}
            <ActionButton
              icon={Copy}
              label="Copy (Ctrl+C)"
              onClick={handleCopy}
              disabled={!hasSelection}
            />
            <ActionButton
              icon={Clipboard}
              label="Paste (Ctrl+V)"
              onClick={handlePaste}
            />

            {/* Z-Order */}
            <ActionButton
              icon={ArrowUpToLine}
              label="Bring to Front"
              onClick={handleBringToFront}
              disabled={selectionCount !== 1}
            />
            <ActionButton
              icon={ArrowDownToLine}
              label="Send to Back"
              onClick={handleSendToBack}
              disabled={selectionCount !== 1}
            />

            {/* Lock/Visibility */}
            <ActionButton
              icon={allLocked ? Unlock : Lock}
              label={allLocked ? 'Unlock' : 'Lock'}
              onClick={handleToggleLock}
              disabled={!hasSelection}
            />
            <ActionButton
              icon={allHidden ? Eye : EyeOff}
              label={allHidden ? 'Show' : 'Hide'}
              onClick={handleToggleVisibility}
              disabled={!hasSelection}
            />

            {/* Delete */}
            <ActionButton
              icon={Trash2}
              label="Delete (Del)"
              onClick={handleDelete}
              disabled={!hasSelection}
              danger
            />
          </div>
        </>
      )}

      {/* Fullscreen Section - Always visible */}
      <ToolbarDivider />
      <div className={styles.toolSection}>
        <ToolButton
          icon={Maximize2}
          label="Fullscreen (F)"
          onClick={() => useCanvasStore.getState().toggleFullscreen()}
        />
      </div>
    </div>
  );
};

export default CanvasToolbar;
