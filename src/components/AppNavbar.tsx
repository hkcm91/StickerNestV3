/**
 * StickerNest v2 - AppNavbar
 * Shared navigation bar component for all pages
 * Provides consistent navigation across the app
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SNIcon, type IconName } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';

interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  route: string;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: 'user', route: '/profile', description: 'Your profile and canvases' },
  { id: 'favorites', label: 'Favorites', icon: 'heart', route: '/favorites', description: 'Saved canvases' },
  { id: 'explore', label: 'Explore', icon: 'compass', route: '/explore', description: 'Discover canvases' },
  { id: 'app', label: 'Editor', icon: 'palette', route: '/app', description: 'Canvas editor' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings', description: 'Account settings' },
];

interface AppNavbarProps {
  /** Current page title to show in header */
  pageTitle?: string;
  /** Show the create canvas button */
  showCreateButton?: boolean;
  /** Additional actions for the right side */
  actions?: React.ReactNode;
  /** Use transparent/glass style */
  transparent?: boolean;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  pageTitle,
  showCreateButton = true,
  actions,
  transparent = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile, signOut, isLocalDevMode } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (route: string) => {
    if (route === '/app') {
      return location.pathname === '/app' || location.pathname.startsWith('/canvas/');
    }
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 56,
          background: transparent
            ? 'rgba(15, 15, 25, 0.8)'
            : 'var(--sn-bg-secondary, #1a1a2e)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
        }}
      >
        {/* Left: Logo + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: 'var(--sn-text-primary)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--sn-accent-gradient, linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SNIcon name="sticker" size="md" color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>StickerNest</span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--sn-accent-secondary)',
                background: 'rgba(139, 92, 246, 0.15)',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              ALPHA
            </span>
          </Link>

          {/* Page Title */}
          {pageTitle && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--sn-border-primary)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--sn-text-primary)' }}>
                {pageTitle}
              </span>
            </>
          )}

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 8,
            }}
            className="sn-nav-desktop"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.route}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive(item.route) ? 600 : 400,
                  color: isActive(item.route)
                    ? 'var(--sn-accent-primary)'
                    : 'var(--sn-text-secondary)',
                  background: isActive(item.route)
                    ? 'rgba(139, 92, 246, 0.1)'
                    : 'transparent',
                  transition: 'all 0.15s ease',
                }}
                title={item.description}
              >
                <SNIcon name={item.icon} size="sm" />
                <span className="sn-nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Create Canvas Button */}
          {showCreateButton && (
            <button
              onClick={() => navigate('/create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: 'var(--sn-accent-gradient, linear-gradient(135deg, #6366f1, #8b5cf6))',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
              }}
              className="sn-create-btn"
            >
              <SNIcon name="add" size="sm" />
              <span className="sn-create-label">Create</span>
            </button>
          )}

          {/* Additional Actions */}
          {actions}

          {/* Mobile Menu Toggle */}
          <SNIconButton
            icon="menu"
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            tooltip="Menu"
            className="sn-mobile-menu-toggle"
            style={{ display: 'none' }}
          />

          {/* User Menu */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => isAuthenticated ? setShowUserMenu(!showUserMenu) : navigate('/login')}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: isAuthenticated
                  ? '2px solid var(--sn-accent-primary)'
                  : '1px solid var(--sn-border-secondary)',
                background: isAuthenticated
                  ? profile?.avatarUrl
                    ? `url(${profile.avatarUrl}) center/cover`
                    : 'var(--sn-accent-gradient)'
                  : 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                transition: 'all 0.2s ease',
              }}
              aria-label={isAuthenticated ? 'User menu' : 'Sign in'}
            >
              {!isAuthenticated && <SNIcon name="user" size="sm" color="#94a3b8" />}
              {isAuthenticated && !profile?.avatarUrl && (
                <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            {showUserMenu && isAuthenticated && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'rgba(20, 20, 30, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 12,
                  border: '1px solid var(--sn-border-primary)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  overflow: 'hidden',
                  zIndex: 200,
                }}
              >
                {/* User Info */}
                <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>
                    {profile?.username || 'User'}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {profile?.email || ''}
                  </div>
                  {isLocalDevMode && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '4px 8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 4,
                        fontSize: 11,
                        color: '#3b82f6',
                      }}
                    >
                      Local Dev Mode
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div style={{ padding: 8 }}>
                  <MenuLink to={`/u/${profile?.username || 'me'}`} icon="user" label="My Profile" onClick={() => setShowUserMenu(false)} />
                  <MenuLink to="/create" icon="add" label="Create Canvas" onClick={() => setShowUserMenu(false)} accent />
                  <MenuLink to="/settings" icon="settings" label="Settings" onClick={() => setShowUserMenu(false)} />
                </div>

                {/* Sign Out */}
                <div style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <SNIcon name="logout" size="sm" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            top: 56,
            background: 'rgba(15, 15, 25, 0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 99,
            padding: 16,
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                to={item.route}
                onClick={() => setShowMobileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: isActive(item.route) ? 600 : 400,
                  color: isActive(item.route) ? 'var(--sn-accent-primary)' : 'var(--sn-text-primary)',
                  background: isActive(item.route) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                }}
              >
                <SNIcon name={item.icon} size="md" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .sn-nav-desktop { display: none !important; }
          .sn-mobile-menu-toggle { display: flex !important; }
          .sn-create-label { display: none; }
          .sn-create-btn { padding: 8px 10px !important; }
        }
        @media (max-width: 1024px) {
          .sn-nav-label { display: none; }
        }
      `}</style>
    </>
  );
};

// Helper component for menu links
const MenuLink: React.FC<{
  to: string;
  icon: IconName;
  label: string;
  onClick?: () => void;
  accent?: boolean;
}> = ({ to, icon, label, onClick, accent }) => (
  <Link
    to={to}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 8,
      color: accent ? '#a78bfa' : '#e2e8f0',
      textDecoration: 'none',
      fontSize: 14,
      transition: 'background 0.15s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = accent ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
  >
    <SNIcon name={icon} size="sm" />
    {label}
  </Link>
);

export default AppNavbar;
