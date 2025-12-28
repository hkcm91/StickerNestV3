/**
 * StickerNest v2 - Mobile Navigation
 * Redesigned bottom navigation with icon-only tabs
 */

import React, { useState } from 'react';
import { SNIcon, IconName } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';

// ============================================
// Types
// ============================================

export type MobileTab = 'canvas' | 'library' | 'lab' | 'ai' | 'settings' | 'debug';

interface MobileNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenWidgetLibrary?: () => void;
  debugEnabled?: boolean;
}

interface NavItem {
  id: MobileTab;
  icon: IconName;
  label: string;
  requiresDesktop?: boolean;
}

// ============================================
// Navigation Items
// ============================================

const NAV_ITEMS: NavItem[] = [
  { id: 'canvas', icon: 'canvas', label: 'Canvas' },
  { id: 'library', icon: 'widget', label: 'Widgets' },
  { id: 'lab', icon: 'flask', label: 'Lab' },
  { id: 'ai', icon: 'ai', label: 'AI' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
  { id: 'debug', icon: 'bug', label: 'Debug', requiresDesktop: false },
];

// ============================================
// Styles
// ============================================

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '100%',
    width: '100%',
    padding: '0 8px',
  },
  tab: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 80,
    height: 56,
    padding: '4px 8px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--sn-radius-lg, 12px)',
    cursor: 'pointer',
    transition: 'all var(--sn-transition-fast, 100ms ease-out)',
  },
  tabActive: {
    background: 'rgba(139, 92, 246, 0.15)',
  },
  tabHover: {
    background: 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.08))',
  },
  indicator: {
    position: 'absolute' as const,
    top: 2,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 24,
    height: 3,
    background: 'var(--sn-accent-primary, #8b5cf6)',
    borderRadius: '0 0 3px 3px',
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
};

// ============================================
// Tab Button Component
// ============================================

interface TabButtonProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ item, active, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const tabStyle: React.CSSProperties = {
    ...styles.tab,
    ...(active ? styles.tabActive : {}),
    ...(isHovered && !active ? styles.tabHover : {}),
    color: active
      ? 'var(--sn-accent-primary, #8b5cf6)'
      : 'var(--sn-text-secondary, #a0aec0)',
  };

  return (
    <button
      style={tabStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
    >
      {active && <span style={styles.indicator} />}
      <span style={styles.iconWrapper}>
        <SNIcon name={item.icon} size="lg" />
      </span>
    </button>
  );
};

// ============================================
// Main Mobile Nav Component
// ============================================

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  onOpenWidgetLibrary,
  debugEnabled = true,
}) => {
  // Filter items based on settings
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.id === 'debug' && !debugEnabled) return false;
    return true;
  });

  const handleTabPress = (tab: MobileTab) => {
    if (tab === 'library' && onOpenWidgetLibrary) {
      onOpenWidgetLibrary();
    } else {
      onTabChange(tab);
    }
  };

  return (
    <nav className="sn-mobile-nav" style={styles.nav}>
      {visibleItems.map(item => (
        <TabButton
          key={item.id}
          item={item}
          active={activeTab === item.id}
          onClick={() => handleTabPress(item.id)}
        />
      ))}
    </nav>
  );
};

// ==========================================
// Mobile Action Button (FAB)
// ==========================================

interface MobileActionButtonProps {
  icon: IconName;
  label: string;
  onClick: () => void;
  position?: 'left' | 'right' | 'center';
  variant?: 'primary' | 'secondary' | 'gradient' | 'rainbow';
}

export const MobileActionButton: React.FC<MobileActionButtonProps> = ({
  icon,
  label,
  onClick,
  position = 'right',
  variant = 'primary',
}) => {
  const positionStyles: Record<string, React.CSSProperties> = {
    left: { left: 16 },
    right: { right: 16 },
    center: { left: '50%', transform: 'translateX(-50%)' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--sn-accent-primary, #8b5cf6)',
    },
    secondary: {
      background: 'var(--sn-bg-tertiary, #1a1a3a)',
      border: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
    },
    gradient: {
      background: 'var(--sn-accent-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%))',
    },
    rainbow: {
      background: 'var(--sn-bg-tertiary, #1a1a3a)',
      position: 'relative' as const,
    },
  };

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        ...positionStyles[position],
        width: 56,
        height: 56,
        borderRadius: 'var(--sn-radius-full, 9999px)',
        ...variantStyles[variant],
        color: '#ffffff',
        border: variantStyles[variant].border || 'none',
        boxShadow: 'var(--sn-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.3))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--sn-z-overlay, 100)' as unknown as number,
        transition: 'all var(--sn-transition-fast, 100ms ease-out)',
      }}
      aria-label={label}
    >
      {variant === 'rainbow' && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: 2,
            background: 'var(--sn-rainbow-gradient)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      )}
      <SNIcon name={icon} size="lg" />
    </button>
  );
};

// ==========================================
// Mobile Header
// ==========================================

interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  onAction?: () => void;
  actionIcon?: IconName;
  actionLabel?: string;
  transparent?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onBack,
  onAction,
  actionIcon,
  actionLabel,
  transparent = false,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: 'calc(56px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: transparent
          ? 'transparent'
          : 'var(--sn-glass-bg, rgba(15, 15, 36, 0.9))',
        borderBottom: transparent
          ? 'none'
          : '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
        backdropFilter: transparent ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: transparent ? 'none' : 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        zIndex: 'var(--sn-z-overlay, 100)' as unknown as number,
      }}
    >
      {onBack ? (
        <SNIconButton
          icon="back"
          variant="ghost"
          size="md"
          onClick={onBack}
          tooltip="Go back"
        />
      ) : (
        <div style={{ width: 40 }} />
      )}

      <h1
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 'var(--sn-text-lg, 16px)',
          fontWeight: 600,
          color: 'var(--sn-text-primary, #f0f4f8)',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </h1>

      {onAction && actionIcon ? (
        <SNIconButton
          icon={actionIcon}
          variant="ghost"
          size="md"
          onClick={onAction}
          tooltip={actionLabel || 'Action'}
        />
      ) : (
        <div style={{ width: 40 }} />
      )}
    </header>
  );
};

// ==========================================
// Mobile Bottom Sheet
// ==========================================

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);

  const heightStyles: Record<string, React.CSSProperties> = {
    auto: { maxHeight: '80vh' },
    half: { height: '50vh' },
    full: { height: '100vh' },
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--sn-bg-overlay, rgba(0, 0, 0, 0.5))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 'var(--sn-z-modal, 300)' as unknown as number,
          animation: 'sn-fade-in 0.2s ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--sn-bg-secondary, #12122a)',
          borderRadius: 'var(--sn-radius-2xl, 20px) var(--sn-radius-2xl, 20px) 0 0',
          zIndex: 'var(--sn-z-modal, 300)' as unknown as number,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'sn-slide-up 0.3s ease',
          transform: isDragging ? `translateY(${Math.max(0, dragY)}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          ...heightStyles[height],
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 0 8px',
            cursor: 'grab',
            touchAction: 'none',
          }}
          onTouchStart={(e) => {
            setIsDragging(true);
            setStartY(e.touches[0].clientY);
            setDragY(0);
          }}
          onTouchMove={(e) => {
            if (isDragging) {
              const touch = e.touches[0];
              const deltaY = touch.clientY - startY;
              setDragY(Math.max(0, deltaY));
            }
          }}
          onTouchEnd={() => {
            setIsDragging(false);
            if (dragY > 100) {
              onClose();
            }
            setDragY(0);
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: 'var(--sn-text-tertiary, #718096)',
              borderRadius: 'var(--sn-radius-full, 9999px)',
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px 12px',
              borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
            }}
          >
            <h2
              style={{
                fontSize: 'var(--sn-text-xl, 18px)',
                fontWeight: 600,
                color: 'var(--sn-text-primary, #f0f4f8)',
                margin: 0,
              }}
            >
              {title}
            </h2>
            <SNIconButton
              icon="close"
              variant="ghost"
              size="sm"
              onClick={onClose}
              tooltip="Close"
            />
          </div>
        )}

        {/* Content */}
        <div
          style={{
            overflowY: 'auto',
            maxHeight: height === 'auto' ? 'calc(80vh - 80px)' : 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes sn-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sn-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default MobileNav;
