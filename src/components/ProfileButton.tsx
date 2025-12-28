/**
 * ProfileButton Component
 * Shows user avatar when authenticated, login icon when not
 * Provides dropdown menu for profile actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SNIcon } from '../shared-ui/SNIcon';

interface ProfileButtonProps {
  size?: 'sm' | 'md' | 'lg';
  showDropdown?: boolean;
}

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  size = 'md',
  showDropdown = true,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, profile, signOut, isLocalDevMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sizeMap = {
    sm: 28,
    md: 36,
    lg: 44,
  };

  const buttonSize = sizeMap[size];
  const iconSize = size === 'sm' ? 14 : size === 'md' ? 18 : 22;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (showDropdown) {
      setIsOpen(!isOpen);
    } else {
      navigate('/settings/profile');
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '50%',
          border: isAuthenticated
            ? '2px solid var(--sn-accent-primary)'
            : '1px solid rgba(255, 255, 255, 0.15)',
          background: isAuthenticated
            ? profile?.avatarUrl
              ? `url(${profile.avatarUrl}) center/cover`
              : 'var(--sn-accent-gradient)'
            : 'rgba(255, 255, 255, 0.05)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          padding: 0,
        }}
        aria-label={isAuthenticated ? 'Profile menu' : 'Sign in'}
        title={isAuthenticated ? profile?.username || 'Profile' : 'Sign in'}
      >
        {!isAuthenticated && (
          <SNIcon name="user" size={size} color="#94a3b8" />
        )}
        {isAuthenticated && !profile?.avatarUrl && (
          <span
            style={{
              color: '#fff',
              fontSize: iconSize,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {profile?.username?.[0] || profile?.email?.[0] || 'U'}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && isAuthenticated && showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: buttonSize + 8,
            right: 0,
            minWidth: 200,
            background: 'rgba(20, 20, 30, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* User Info */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#f1f5f9',
                marginBottom: 2,
              }}
            >
              {profile?.username || 'User'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
              }}
            >
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
          <div style={{ padding: '8px' }}>
            <Link
              to={`/u/${profile?.username || 'me'}`}
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                color: '#e2e8f0',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SNIcon name="user" size="sm" />
              <span>My Profile</span>
            </Link>

            <Link
              to="/create"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                color: '#a78bfa',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SNIcon name="add" size="sm" />
              <span>Create Canvas</span>
            </Link>

            <Link
              to="/favorites"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                color: '#e2e8f0',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SNIcon name="heart" size="sm" />
              <span>Favorites</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                color: '#e2e8f0',
                textDecoration: 'none',
                fontSize: 14,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SNIcon name="settings" size="sm" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div
            style={{
              padding: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
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
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SNIcon name="logout" size="sm" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileButton;
