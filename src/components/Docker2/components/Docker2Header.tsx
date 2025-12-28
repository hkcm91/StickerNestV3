/**
 * Docker 2.0 Header
 * Title, mode toggles, theme toggle, and collapse controls
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Docker2HeaderProps, LayoutMode, Docker2ThemeMode } from '../Docker2.types';
import { getTheme, getHeaderStyle, getIconButtonStyle } from '../Docker2Theme';

// ==================
// Icon Components
// ==================

const SunIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ChevronDownIcon: React.FC<{ size?: number; rotated?: boolean }> = ({ size = 16, rotated }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 200ms ease',
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const EditIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const VerticalLayoutIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="6" rx="1" />
    <rect x="3" y="11" width="18" height="4" rx="1" />
    <rect x="3" y="17" width="18" height="4" rx="1" />
  </svg>
);

const HorizontalLayoutIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="6" height="18" rx="1" />
    <rect x="11" y="3" width="4" height="18" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

const GridLayoutIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const TabLayoutIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 3v6" />
  </svg>
);

const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const DockIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ==================
// Layout Switcher Dropdown
// ==================

interface LayoutOption {
  mode: LayoutMode;
  icon: React.ReactNode;
  label: string;
}

const layoutOptions: LayoutOption[] = [
  { mode: 'vertical', icon: <VerticalLayoutIcon size={14} />, label: 'Vertical Stack' },
  { mode: 'horizontal', icon: <HorizontalLayoutIcon size={14} />, label: 'Horizontal' },
  { mode: 'grid', icon: <GridLayoutIcon size={14} />, label: 'Grid' },
  { mode: 'tabbed', icon: <TabLayoutIcon size={14} />, label: 'Tabbed' },
];

const getCurrentLayoutIcon = (mode: LayoutMode): React.ReactNode => {
  const option = layoutOptions.find((o) => o.mode === mode);
  return option?.icon ?? <VerticalLayoutIcon size={14} />;
};

// ==================
// Icon Button Component
// ==================

interface IconButtonProps {
  onClick: () => void;
  active?: boolean;
  title?: string;
  themeMode: Docker2ThemeMode;
  children: React.ReactNode;
  disabled?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  active,
  title,
  themeMode,
  children,
  disabled,
}) => {
  const theme = getTheme(themeMode);
  const [isHovered, setIsHovered] = useState(false);

  const style: React.CSSProperties = {
    ...getIconButtonStyle(theme),
    background: active
      ? `linear-gradient(135deg, ${theme.colors.accentMuted}, transparent)`
      : isHovered
        ? theme.colors.bgGlassHover
        : 'transparent',
    color: active ? theme.colors.accent : theme.colors.textSecondary,
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
  };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// ==================
// Main Header Component
// ==================

export const Docker2Header: React.FC<Docker2HeaderProps> = ({
  docker,
  onToggleCollapse,
  onToggleTheme,
  onToggleEditMode,
  onLayoutChange,
  onClose,
  onRename,
  availableWidgets = [],
  onAddWidget,
  selectedCount = 0,
  onDockSelected,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState(docker.name);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);

  const theme = useMemo(() => getTheme(docker.themeMode), [docker.themeMode]);
  const headerStyle = useMemo(() => getHeaderStyle(theme), [theme]);

  // Handle rename
  const handleStartRename = useCallback(() => {
    setTempName(docker.name);
    setIsRenaming(true);
  }, [docker.name]);

  const handleFinishRename = useCallback(() => {
    if (tempName.trim() && tempName !== docker.name) {
      onRename?.(tempName.trim());
    }
    setIsRenaming(false);
  }, [tempName, docker.name, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setTempName(docker.name);
    }
  }, [handleFinishRename, docker.name]);

  // Layout menu
  const handleLayoutSelect = useCallback((mode: LayoutMode) => {
    onLayoutChange(mode);
    setShowLayoutMenu(false);
  }, [onLayoutChange]);

  // Add widget handler
  const handleAddWidget = useCallback((defId: string) => {
    onAddWidget?.(defId);
    setShowAddWidgetMenu(false);
  }, [onAddWidget]);

  return (
    <div style={headerStyle}>
      {/* Left: Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Collapse toggle */}
        <IconButton
          onClick={onToggleCollapse}
          themeMode={docker.themeMode}
          title={docker.collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronDownIcon size={14} rotated={docker.collapsed} />
        </IconButton>

        {/* Title */}
        {isRenaming ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              background: theme.colors.bgGlass,
              border: `1px solid ${theme.colors.borderAccent}`,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.textPrimary,
              fontSize: 13,
              fontWeight: 600,
              padding: '4px 8px',
              outline: 'none',
              flex: 1,
              minWidth: 80,
            }}
          />
        ) : (
          <span
            onDoubleClick={handleStartRename}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.colors.textPrimary,
              cursor: 'text',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title="Double-click to rename"
          >
            {docker.name}
          </span>
        )}

        {/* Widget count badge */}
        {docker.widgets.length > 0 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: theme.colors.textMuted,
              background: theme.colors.bgGlass,
              padding: '2px 6px',
              borderRadius: theme.borderRadius.sm,
            }}
          >
            {docker.widgets.length}
          </span>
        )}
      </div>

      {/* Right: Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {/* Layout switcher */}
        <div style={{ position: 'relative' }}>
          <IconButton
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            active={showLayoutMenu}
            themeMode={docker.themeMode}
            title="Change layout"
            disabled={docker.collapsed}
          >
            {getCurrentLayoutIcon(docker.layout.mode)}
          </IconButton>

          {/* Dropdown menu */}
          {showLayoutMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: theme.colors.bgSecondary,
                backdropFilter: `blur(${theme.colors.glassBlur})`,
                border: `1px solid ${theme.colors.borderPrimary}`,
                borderRadius: theme.borderRadius.md,
                padding: 4,
                zIndex: 100,
                minWidth: 140,
                boxShadow: `0 8px 24px ${theme.colors.shadowColor}`,
              }}
              onMouseLeave={() => setShowLayoutMenu(false)}
            >
              {layoutOptions.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => handleLayoutSelect(option.mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    background: docker.layout.mode === option.mode
                      ? theme.colors.accentMuted
                      : 'transparent',
                    border: 'none',
                    borderRadius: theme.borderRadius.sm,
                    color: docker.layout.mode === option.mode
                      ? theme.colors.accent
                      : theme.colors.textPrimary,
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `background ${theme.transitions.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    if (docker.layout.mode !== option.mode) {
                      e.currentTarget.style.background = theme.colors.bgGlassHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (docker.layout.mode !== option.mode) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dock Selected button - shows when widgets are selected on canvas */}
        {onDockSelected && selectedCount > 0 && (
          <IconButton
            onClick={onDockSelected}
            themeMode={docker.themeMode}
            title={`Dock ${selectedCount} selected widget${selectedCount > 1 ? 's' : ''}`}
            disabled={docker.collapsed}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DockIcon size={14} />
              <span
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
                  background: theme.colors.accent,
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: 6,
                  padding: '1px 4px',
                  minWidth: 14,
                  textAlign: 'center',
                }}
              >
                {selectedCount}
              </span>
            </div>
          </IconButton>
        )}

        {/* Add Widget button */}
        {onAddWidget && availableWidgets.length > 0 && (
          <div style={{ position: 'relative' }}>
            <IconButton
              onClick={() => setShowAddWidgetMenu(!showAddWidgetMenu)}
              active={showAddWidgetMenu}
              themeMode={docker.themeMode}
              title="Add widget"
              disabled={docker.collapsed}
            >
              <PlusIcon size={14} />
            </IconButton>

            {/* Add Widget Dropdown */}
            {showAddWidgetMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: theme.colors.bgSecondary,
                  backdropFilter: `blur(${theme.colors.glassBlur})`,
                  border: `1px solid ${theme.colors.borderPrimary}`,
                  borderRadius: theme.borderRadius.md,
                  padding: 4,
                  zIndex: 100,
                  minWidth: 180,
                  maxHeight: 300,
                  overflowY: 'auto',
                  boxShadow: `0 8px 24px ${theme.colors.shadowColor}`,
                }}
                onMouseLeave={() => setShowAddWidgetMenu(false)}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Add Widget
                </div>
                {availableWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    onClick={() => handleAddWidget(widget.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 2,
                      width: '100%',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.textPrimary,
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: `background ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.colors.bgGlassHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500, color: 'inherit' }}>
                      {widget.name || widget.id || 'Unnamed Widget'}
                    </span>
                    {widget.description && (
                      <span
                        style={{
                          fontSize: 11,
                          color: theme.colors.textMuted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {widget.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit mode toggle */}
        <IconButton
          onClick={onToggleEditMode}
          active={docker.editMode}
          themeMode={docker.themeMode}
          title={docker.editMode ? 'Exit edit mode' : 'Enter edit mode'}
          disabled={docker.collapsed}
        >
          <EditIcon size={14} />
        </IconButton>

        {/* Theme toggle */}
        <IconButton
          onClick={onToggleTheme}
          themeMode={docker.themeMode}
          title={docker.themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {docker.themeMode === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
        </IconButton>

        {/* Close button (if provided) */}
        {onClose && (
          <IconButton
            onClick={onClose}
            themeMode={docker.themeMode}
            title="Close docker"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>
        )}
      </div>
    </div>
  );
};

export default Docker2Header;
