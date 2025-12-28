/**
 * StickerNest v2 - Default Layout
 * Responsive layout that adapts to mobile and desktop
 * Uses SNIcon components for consistent iconography
 */

import React, { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useViewport, useTouchDevice } from '../hooks/useResponsive';
import { MobileNav, MobileHeader, MobileBottomSheet, type MobileTab } from '../components/MobileNav';
import { SNIcon, type IconName } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { useThemeStore } from '../state/useThemeStore';
import { ThemedAppBackground } from '../components/ThemedAppBackground';
import { useCanvasManager } from '../services/canvasManager';
import { useAuth } from '../contexts/AuthContext';
import { useCanvasStore } from '../state/useCanvasStore';
import { ProfileButton } from '../components/ProfileButton';

export type AppTab = 'canvas' | 'lab' | 'debug' | 'library' | 'gallery' | 'explore' | 'settings';

interface DefaultLayoutProps {
    children: React.ReactNode;
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
}

// Map app tabs to mobile tabs
const appTabToMobileTab = (tab: AppTab): MobileTab => {
    switch (tab) {
        case 'canvas': return 'canvas';
        case 'library': return 'library';
        case 'debug': return 'debug';
        case 'lab': return 'lab';
        case 'settings': return 'settings';
        default: return 'canvas';
    }
};

const mobileTabToAppTab = (tab: MobileTab): AppTab => {
    switch (tab) {
        case 'canvas': return 'canvas';
        case 'library': return 'library';
        case 'debug': return 'debug';
        case 'settings': return 'settings';
        case 'ai': return 'canvas'; // AI opens sidebar, stays on canvas
        case 'lab': return 'lab';
        default: return 'canvas';
    }
};

// Navigation item groups for organized sidebar
interface NavItem {
    id: AppTab | 'create';
    label: string;
    icon: IconName;
    description?: string;
    route?: string;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Create',
        items: [
            { id: 'canvas', label: 'Canvas Editor', icon: 'edit', description: 'Design your canvas' },
            { id: 'library', label: 'Widget Library', icon: 'grid', description: 'Browse widgets' },
        ],
    },
    {
        label: 'Develop',
        items: [
            { id: 'lab', label: 'Widget Lab', icon: 'flask', description: 'Test widgets' },
            { id: 'debug', label: 'Console', icon: 'terminal', description: 'View logs' },
        ],
    },
    {
        label: 'Browse',
        items: [
            { id: 'gallery', label: 'My Canvases', icon: 'layout', description: 'Your canvas gallery', route: '/gallery' },
            { id: 'explore', label: 'Discover', icon: 'globe', description: 'Discover canvases', route: '/explore' },
            { id: 'favorites' as AppTab, label: 'Saved', icon: 'bookmark', description: 'Saved canvases', route: '/favorites' },
        ],
    },
];

// ==========================================
// Sidebar Navigation Item Component
// ==========================================

interface SidebarNavItemProps {
    item: NavItem;
    isActive: boolean;
    onClick: () => void;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ item, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const baseStyle: React.CSSProperties = {
        padding: '10px 12px',
        textAlign: 'left',
        background: 'transparent',
        color: 'var(--sn-text-secondary, #94a3b8)',
        border: '1px solid transparent',
        borderRadius: 10,
        cursor: 'pointer',
        fontWeight: 450,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'scale(1)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
    };

    const activeStyle: React.CSSProperties = isActive ? {
        background: 'rgba(139, 92, 246, 0.12)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'var(--sn-accent-primary, #8b5cf6)',
        fontWeight: 600,
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    } : {};

    const hoverStyle: React.CSSProperties = isHovered && !isActive ? {
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        color: 'var(--sn-text-primary, #e2e8f0)',
        transform: 'translateX(3px)',
    } : {};

    const pressedStyle: React.CSSProperties = isPressed ? {
        transform: 'scale(0.98)',
        transition: 'transform 0.05s ease',
    } : {};

    return (
        <button
            className="sn-touch-target sn-sidebar-nav-item"
            style={{
                ...baseStyle,
                ...activeStyle,
                ...hoverStyle,
                ...pressedStyle,
            }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-current={isActive ? 'page' : undefined}
            title={item.description}
        >
            {/* Glass shine effect on active */}
            {isActive && (
                <span
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 100%)',
                        borderRadius: '10px 10px 0 0',
                        pointerEvents: 'none',
                    }}
                />
            )}
            {/* Icon with subtle background */}
            <span
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: isActive
                        ? 'rgba(139, 92, 246, 0.2)'
                        : isHovered
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(255, 255, 255, 0.03)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                }}
            >
                <SNIcon
                    name={item.icon}
                    size="sm"
                    style={{
                        color: isActive ? 'var(--sn-accent-primary, #8b5cf6)' : 'currentColor',
                        transition: 'color 0.15s ease, transform 0.15s ease',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    }}
                />
            </span>
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {/* Active indicator dot */}
            {isActive && (
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--sn-accent-primary, #8b5cf6)',
                        boxShadow: '0 0 8px var(--sn-accent-primary, #8b5cf6)',
                        flexShrink: 0,
                    }}
                />
            )}
        </button>
    );
};

// ==========================================
// Sidebar Group Header Component
// ==========================================

interface SidebarGroupProps {
    label: string;
    children: React.ReactNode;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ label, children }) => (
    <div style={{ marginBottom: 16 }}>
        <div
            style={{
                padding: '8px 12px 6px',
                fontWeight: 600,
                color: 'var(--sn-text-tertiary, #64748b)',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}
        >
            <span
                style={{
                    width: 16,
                    height: 1,
                    background: 'linear-gradient(90deg, var(--sn-accent-primary, #8b5cf6) 0%, transparent 100%)',
                    opacity: 0.5,
                }}
            />
            {label}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {children}
        </nav>
    </div>
);

// ==========================================
// Desktop Tab Button Component
// ==========================================

interface DesktopTabButtonProps {
    tab: AppTab;
    isActive: boolean;
    onClick: () => void;
}

const DesktopTabButton: React.FC<DesktopTabButtonProps> = ({ tab, isActive, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const baseStyle: React.CSSProperties = {
        padding: '8px 16px',
        background: 'transparent',
        color: 'var(--sn-text-secondary)',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 400,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
    };

    const activeStyle: React.CSSProperties = isActive ? {
        background: 'var(--sn-accent-primary)',
        color: 'white',
        fontWeight: 600,
        boxShadow: 'var(--sn-shadow-glow)',
    } : {};

    const hoverStyle: React.CSSProperties = isHovered && !isActive ? {
        background: 'var(--sn-glass-bg-light)',
        color: 'var(--sn-text-primary)',
    } : {};

    const pressedStyle: React.CSSProperties = isPressed ? {
        transform: 'scale(0.96)',
        transition: 'transform 0.05s ease',
    } : {};

    return (
        <button
            className="sn-touch-target sn-desktop-tab"
            style={{
                ...baseStyle,
                ...activeStyle,
                ...hoverStyle,
                ...pressedStyle,
            }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-current={isActive ? 'page' : undefined}
        >
            <SNIcon
                name={getTabIcon(tab)}
                size="sm"
                style={{
                    transition: 'transform 0.15s ease',
                    transform: isHovered || isActive ? 'scale(1.1)' : 'scale(1)',
                }}
            />
            {getTabTitle(tab)}
        </button>
    );
};

// ==========================================
// Main DefaultLayout Component
// ==========================================

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children, activeTab, onTabChange }) => {
    const { isMobile, isTablet } = useViewport();
    const { hasTouch } = useTouchDevice();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Get canvas data for navbar display
    const { canvasId: urlCanvasId } = useParams<{ canvasId?: string }>();
    const { profile } = useAuth();
    const userId = profile?.id || 'demo-user-123';
    const { canvases, currentCanvasId, isLoading: canvasLoading } = useCanvasManager(userId);
    const storeCanvasId = useCanvasStore(state => state.canvasId);
    const activeCanvasId = urlCanvasId || currentCanvasId || storeCanvasId || 'canvas-1';
    const currentCanvas = canvases.find(c => c.id === activeCanvasId);

    // Theme state for parallax background
    const currentTheme = useThemeStore((s) => s.currentTheme);
    const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

    const showMobileLayout = isMobile;
    const showCompactSidebar = isTablet;

    // Handle navigation item click - either change tab or navigate to route
    const handleNavItemClick = useCallback((item: NavItem) => {
        if (item.route) {
            navigate(item.route);
        } else if (item.id !== 'create') {
            onTabChange(item.id as AppTab);
        }
        if (showCompactSidebar) setIsSidebarOpen(false);
    }, [navigate, onTabChange, showCompactSidebar]);

    // Check if a nav item is active
    const isNavItemActive = useCallback((item: NavItem): boolean => {
        if (item.route) {
            return location.pathname === item.route || location.pathname.startsWith(item.route + '/');
        }
        return activeTab === item.id;
    }, [activeTab, location.pathname]);

    const handleMobileTabChange = (tab: MobileTab) => {
        if (tab === 'ai') {
            // AI tab should trigger AI sidebar in App.tsx
            // For now, we'll emit a custom event or handle via props
            window.dispatchEvent(new CustomEvent('sn:toggle-ai-sidebar'));
            return;
        }
        onTabChange(mobileTabToAppTab(tab));
    };

    // Mobile Layout
    if (showMobileLayout) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100dvh',
                    fontFamily: 'system-ui, sans-serif',
                    background: hasParallaxBackground ? 'transparent' : 'var(--sn-bg-primary)',
                    color: 'var(--sn-text-primary)',
                    position: 'relative',
                }}
            >
                {hasParallaxBackground && <ThemedAppBackground />}
                {/* Mobile Header */}
                <MobileHeader
                    title={getTabTitle(activeTab)}
                    onAction={() => setIsMenuOpen(true)}
                    actionIcon="menu"
                    actionLabel="Menu"
                />

                {/* Main Content - with bottom padding for nav */}
                <main
                    style={{
                        flex: 1,
                        overflow: 'hidden',
                        paddingBottom: 'calc(60px + var(--safe-area-bottom, 0px))',
                    }}
                >
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <MobileNav
                    activeTab={appTabToMobileTab(activeTab)}
                    onTabChange={handleMobileTabChange}
                    debugEnabled={true}
                />

                {/* Mobile Menu Bottom Sheet */}
                <MobileBottomSheet
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    title="Menu"
                >
                    <div style={{ padding: 16 }}>
                        <MobileMenuItems
                            activeTab={activeTab}
                            onTabChange={(tab) => {
                                onTabChange(tab);
                                setIsMenuOpen(false);
                            }}
                            onNavigate={(route) => {
                                navigate(route);
                                setIsMenuOpen(false);
                            }}
                        />
                    </div>
                </MobileBottomSheet>
            </div>
        );
    }

    // Desktop/Tablet Layout
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                fontFamily: 'system-ui, sans-serif',
                background: hasParallaxBackground ? 'transparent' : 'var(--sn-bg-primary)',
                position: 'relative',
            }}
        >
            {hasParallaxBackground && <ThemedAppBackground />}
            {/* Desktop Header */}
            <header
                style={{
                    padding: '0 20px',
                    height: 50,
                    background: hasParallaxBackground ? 'var(--sn-glass-bg)' : 'var(--sn-bg-secondary)',
                    backdropFilter: hasParallaxBackground ? 'blur(var(--sn-glass-blur-lg, 20px))' : undefined,
                    WebkitBackdropFilter: hasParallaxBackground ? 'blur(var(--sn-glass-blur-lg, 20px))' : undefined,
                    color: 'var(--sn-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--sn-border-primary)',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 10,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Hamburger for tablet */}
                    {showCompactSidebar && (
                        <SNIconButton
                            icon="menu"
                            variant="ghost"
                            size="md"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            tooltip="Toggle sidebar"
                            aria-label="Toggle sidebar"
                        />
                    )}
                    <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                        StickerNest v2
                    </h1>
                    <span
                        style={{
                            fontSize: '0.75rem',
                            color: 'var(--sn-accent-tertiary)',
                            background: 'var(--sn-accent-primary-10)',
                            padding: '2px 8px',
                            borderRadius: 4,
                        }}
                    >
                        Alpha
                    </span>
                    
                    {/* Canvas Title and Size - shown when on canvas tab */}
                    {activeTab === 'canvas' && (
                        <>
                            <div
                                style={{
                                    width: '1px',
                                    height: '20px',
                                    background: 'var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
                                    margin: '0 8px',
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {currentCanvas ? (
                                    <>
                                        <h2 style={{ 
                                            margin: 0, 
                                            fontSize: '1rem', 
                                            fontWeight: 600,
                                            color: 'var(--sn-text-primary, #e2e8f0)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '300px',
                                        }}>
                                            {currentCanvas.name}
                                        </h2>
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--sn-text-secondary, #94a3b8)',
                                                fontFamily: 'monospace',
                                                padding: '4px 8px',
                                                background: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                borderRadius: 4,
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {currentCanvas.width || 1920} × {currentCanvas.height || 1080}
                                        </span>
                                    </>
                                ) : (
                                    <span style={{ 
                                        fontSize: '0.875rem',
                                        color: 'var(--sn-text-secondary, #94a3b8)',
                                    }}>
                                        {canvasLoading ? 'Loading...' : 'No canvas'}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Header actions - quick access buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Quick nav icons for key pages */}
                    <SNIconButton
                        icon="user"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/profile')}
                        tooltip="My Profile"
                        aria-label="My Profile"
                    />
                    <SNIconButton
                        icon="compass"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/explore')}
                        tooltip="Explore"
                        aria-label="Explore"
                    />
                    <SNIconButton
                        icon="heart"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/favorites')}
                        tooltip="Favorites"
                        aria-label="Favorites"
                    />
                    <div style={{ width: 1, height: 20, background: 'var(--sn-border-primary)', margin: '0 4px' }} />
                    <ProfileButton size="sm" />
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar - collapsible on tablet */}
                {(!showCompactSidebar || isSidebarOpen) && (
                    <>
                        {/* Backdrop for tablet sidebar */}
                        {showCompactSidebar && isSidebarOpen && (
                            <div
                                className="sn-layout-backdrop"
                                onClick={() => setIsSidebarOpen(false)}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0, 0, 0, 0.5)',
                                    backdropFilter: 'blur(4px)',
                                    WebkitBackdropFilter: 'blur(4px)',
                                    zIndex: 99,
                                }}
                                aria-hidden="true"
                            />
                        )}

                        <aside
                            className="sn-layout-sidebar"
                            style={{
                                width: showCompactSidebar ? 280 : 220,
                                background: 'linear-gradient(180deg, rgba(15, 15, 36, 0.85) 0%, rgba(15, 15, 36, 0.95) 100%)',
                                borderRight: '1px solid rgba(139, 92, 246, 0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                position: showCompactSidebar ? 'fixed' : 'relative',
                                top: showCompactSidebar ? 50 : 0,
                                left: 0,
                                bottom: 0,
                                zIndex: showCompactSidebar ? 100 : 1,
                                backdropFilter: 'blur(24px) saturate(1.2)',
                                WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
                                boxShadow: '4px 0 32px rgba(0, 0, 0, 0.3), inset 1px 0 0 rgba(255, 255, 255, 0.03)',
                            }}
                        >
                            {/* Create Canvas Button - Primary CTA */}
                            <div style={{ padding: '16px 12px 12px' }}>
                                <button
                                    onClick={() => navigate('/create')}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(139, 92, 246, 0.9) 50%, rgba(168, 85, 247, 0.9) 100%)',
                                        backdropFilter: 'blur(8px)',
                                        WebkitBackdropFilter: 'blur(8px)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: 12,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 28px rgba(139, 92, 246, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                                    }}
                                >
                                    <SNIcon name="sparkles" size="sm" />
                                    New Canvas
                                </button>
                            </div>

                            {/* Quick Actions - Extensible section for future buttons */}
                            <div style={{ padding: '0 12px 8px' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 6,
                                    }}
                                >
                                    <button
                                        onClick={() => navigate('/settings')}
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            backdropFilter: 'blur(4px)',
                                            WebkitBackdropFilter: 'blur(4px)',
                                            color: 'var(--sn-text-secondary, #94a3b8)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 5,
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.color = 'var(--sn-text-primary, #e2e8f0)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                            e.currentTarget.style.color = 'var(--sn-text-secondary, #94a3b8)';
                                        }}
                                        title="Settings"
                                    >
                                        <SNIcon name="sliders" size="xs" />
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => window.dispatchEvent(new CustomEvent('sn:toggle-ai-sidebar'))}
                                        style={{
                                            flex: 1,
                                            padding: '8px 10px',
                                            background: 'rgba(139, 92, 246, 0.08)',
                                            backdropFilter: 'blur(4px)',
                                            WebkitBackdropFilter: 'blur(4px)',
                                            color: 'var(--sn-accent-primary, #8b5cf6)',
                                            border: '1px solid rgba(139, 92, 246, 0.15)',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: 11,
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 5,
                                            transition: 'all 0.15s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                                        }}
                                        title="AI Assistant"
                                    >
                                        <SNIcon name="ai" size="xs" />
                                        AI
                                    </button>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                margin: '4px 16px 8px',
                                height: 1,
                                background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)'
                            }} />

                            {/* Grouped Navigation */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 0' }}>
                                {NAV_GROUPS.map((group) => (
                                    <SidebarGroup key={group.label} label={group.label}>
                                        {group.items.map((item) => (
                                            <SidebarNavItem
                                                key={item.id}
                                                item={item}
                                                isActive={isNavItemActive(item)}
                                                onClick={() => handleNavItemClick(item)}
                                            />
                                        ))}
                                    </SidebarGroup>
                                ))}
                            </div>

                            {/* User Profile Section */}
                            <div
                                style={{
                                    padding: '12px',
                                    margin: '8px',
                                    marginTop: 'auto',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <ProfileButton size="sm" showDropdown={true} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--sn-text-primary, #e2e8f0)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {profile?.username || 'Guest'}
                                    </div>
                                    <div style={{
                                        fontSize: 10,
                                        color: 'var(--sn-text-tertiary, #64748b)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}>
                                        <span style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            boxShadow: '0 0 6px #22c55e',
                                        }} />
                                        Online
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </>
                )}

                {/* Main Content */}
                <main
                    style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
};

// ==========================================
// Helper Components
// ==========================================

interface MobileMenuItemsProps {
    activeTab: AppTab;
    onTabChange: (tab: AppTab) => void;
    onNavigate: (route: string) => void;
}

const MobileMenuItems: React.FC<MobileMenuItemsProps> = ({ activeTab, onTabChange, onNavigate }) => {
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [pressedItem, setPressedItem] = useState<string | null>(null);
    const location = useLocation();

    const isItemActive = (item: NavItem): boolean => {
        if (item.route) {
            return location.pathname === item.route || location.pathname.startsWith(item.route + '/');
        }
        return activeTab === item.id;
    };

    const handleItemClick = (item: NavItem) => {
        if (item.route) {
            onNavigate(item.route);
        } else if (item.id !== 'create') {
            onTabChange(item.id as AppTab);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--sn-text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: 8,
                            paddingLeft: 4,
                        }}
                    >
                        {group.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.items.map((item) => {
                            const isActive = isItemActive(item);
                            const isHovered = hoveredItem === item.id;
                            const isPressed = pressedItem === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    onMouseEnter={() => setHoveredItem(item.id)}
                                    onMouseLeave={() => { setHoveredItem(null); setPressedItem(null); }}
                                    onMouseDown={() => setPressedItem(item.id)}
                                    onMouseUp={() => setPressedItem(null)}
                                    onTouchStart={() => setPressedItem(item.id)}
                                    onTouchEnd={() => setPressedItem(null)}
                                    className="sn-touch-target"
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        textAlign: 'left',
                                        background: isActive
                                            ? 'var(--sn-bg-tertiary, #252538)'
                                            : isHovered
                                                ? 'var(--sn-glass-bg-light, rgba(255, 255, 255, 0.03))'
                                                : 'transparent',
                                        color: isActive
                                            ? 'var(--sn-accent-primary, #8b5cf6)'
                                            : 'var(--sn-text-primary, #e2e8f0)',
                                        border: isActive
                                            ? '1px solid rgba(139, 92, 246, 0.3)'
                                            : '1px solid transparent',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: isActive ? 600 : 400,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                                    }}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 36,
                                            height: 36,
                                            borderRadius: 8,
                                            background: isActive
                                                ? 'rgba(139, 92, 246, 0.15)'
                                                : 'var(--sn-bg-secondary, #1a1a2e)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <SNIcon
                                            name={item.icon}
                                            size="md"
                                            style={{
                                                color: isActive
                                                    ? 'var(--sn-accent-primary, #8b5cf6)'
                                                    : 'var(--sn-text-secondary, #94a3b8)',
                                                transition: 'color 0.15s ease, transform 0.15s ease',
                                                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: isActive ? 600 : 500,
                                        }}>
                                            {item.label}
                                        </div>
                                        {item.description && (
                                            <div style={{
                                                fontSize: 11,
                                                color: 'var(--sn-text-tertiary, #64748b)',
                                                marginTop: 1,
                                            }}>
                                                {item.description}
                                            </div>
                                        )}
                                    </div>
                                    {isActive && (
                                        <SNIcon
                                            name="check"
                                            size="sm"
                                            style={{
                                                color: 'var(--sn-accent-primary, #8b5cf6)',
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==========================================
// Helper Functions
// ==========================================

function getTabTitle(tab: AppTab): string {
    switch (tab) {
        case 'canvas': return 'Canvas';
        case 'library': return 'Widget Library';
        case 'lab': return 'Widget Lab';
        case 'debug': return 'Debug Panel';
        case 'gallery': return 'My Canvases';
        case 'explore': return 'Explore';
        case 'settings': return 'Settings';
        default: return tab;
    }
}

function getTabIcon(tab: AppTab): IconName {
    switch (tab) {
        case 'canvas': return 'palette';
        case 'library': return 'library';
        case 'lab': return 'flask';
        case 'debug': return 'bug';
        case 'gallery': return 'images';
        case 'explore': return 'compass';
        case 'settings': return 'settings';
        default: return 'file';
    }
}

function getTabDescription(tab: AppTab): string {
    switch (tab) {
        case 'canvas': return 'Design your widget canvas';
        case 'library': return 'Browse and add widgets';
        case 'lab': return 'Test and develop widgets';
        case 'debug': return 'View logs and events';
        case 'gallery': return 'View your canvas gallery';
        case 'explore': return 'Discover public canvases';
        case 'settings': return 'Account and app settings';
        default: return '';
    }
}

// ==========================================
// Global Focus Styles Injection
// ==========================================

if (typeof document !== 'undefined') {
    const styleId = 'sn-layout-focus-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Focus visible styles for keyboard navigation */
            .sn-touch-target:focus-visible,
            .sn-sidebar-nav-item:focus-visible,
            .sn-desktop-tab:focus-visible {
                outline: 2px solid var(--sn-accent-primary);
                outline-offset: 2px;
                box-shadow: 0 0 0 4px var(--sn-accent-primary-20);
            }

            /* Remove default focus outline when using mouse */
            .sn-touch-target:focus:not(:focus-visible),
            .sn-sidebar-nav-item:focus:not(:focus-visible),
            .sn-desktop-tab:focus:not(:focus-visible) {
                outline: none;
            }

            /* Smooth transitions for layout elements */
            .sn-layout-sidebar {
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                            width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                            opacity 0.3s ease;
            }

            /* Backdrop fade animation */
            .sn-layout-backdrop {
                animation: sn-backdrop-fade-in 0.2s ease;
            }

            @keyframes sn-backdrop-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* Slide in animation for mobile sidebar */
            .sn-layout-mobile-sidebar {
                animation: sn-slide-in-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes sn-slide-in-left {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }

            /* Reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                .sn-touch-target,
                .sn-sidebar-nav-item,
                .sn-desktop-tab,
                .sn-layout-sidebar,
                .sn-layout-backdrop,
                .sn-layout-mobile-sidebar {
                    animation: none !important;
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

export default DefaultLayout;
