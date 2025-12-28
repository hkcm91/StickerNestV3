/**
 * StickerNest v2 - Username Invite Form
 * Component for inviting users by username with autocomplete search.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CanvasPermissionService,
  type CanvasInvitation,
  type CollabRole,
} from '../../services/CanvasPermissionService';
import { ProfileService, type ProfileRow } from '../../services/social/ProfileService';
import { RoleSelector } from './RoleSelector';

interface UsernameInviteFormProps {
  canvasId: string;
  onCreated: (invitation: CanvasInvitation) => void;
}

export const UsernameInviteForm: React.FC<UsernameInviteFormProps> = ({
  canvasId,
  onCreated,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [role, setRole] = useState<CollabRole>('viewer');
  const [message, setMessage] = useState('');
  const [canInviteOthers, setCanInviteOthers] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || selectedUser) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await ProfileService.searchProfiles(query, 8);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, selectedUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = useCallback((user: ProfileRow) => {
    setSelectedUser(user);
    setQuery('');
    setShowDropdown(false);
    setError(null);
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setQuery('');
  }, []);

  const handleCreate = async () => {
    if (!selectedUser) {
      setError('Please select a user to invite');
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await CanvasPermissionService.createInvitation(canvasId, {
      targetUserId: selectedUser.id,
      role,
      canInvite: canInviteOthers,
      message: message || undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    if (result.success && result.data) {
      onCreated(result.data);
      setSuccess(true);
      setSelectedUser(null);
      setMessage('');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to send invitation');
    }

    setIsCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* User Search */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Username
        </label>

        {selectedUser ? (
          /* Selected user display */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              background: 'var(--sn-bg-tertiary, #252538)',
              border: '1px solid var(--sn-accent-primary, #8b5cf6)',
              borderRadius: 6,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {selectedUser.avatar_url ? (
                <img
                  src={selectedUser.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--sn-accent-primary, #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {(selectedUser.display_name || selectedUser.username || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, color: 'var(--sn-text-primary, #e2e8f0)' }}>
                {selectedUser.display_name || selectedUser.username}
              </div>
              {selectedUser.username && (
                <div style={{ fontSize: 12, color: 'var(--sn-text-secondary, #94a3b8)' }}>
                  @{selectedUser.username}
                </div>
              )}
            </div>
            <button
              onClick={handleClearUser}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--sn-text-secondary, #94a3b8)',
                cursor: 'pointer',
                padding: 4,
                fontSize: 16,
              }}
            >
              x
            </button>
          </div>
        ) : (
          /* Search input */
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && searchResults.length > 0 && setShowDropdown(true)}
              placeholder="Search by username..."
              disabled={isCreating}
              style={{
                width: '100%',
                padding: '10px 12px',
                paddingRight: 36,
                background: 'var(--sn-bg-tertiary, #252538)',
                border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
                borderRadius: 6,
                color: 'var(--sn-text-primary, #e2e8f0)',
                fontSize: 14,
              }}
            />
            {isSearching && (
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  border: '2px solid var(--sn-border-primary)',
                  borderTopColor: 'var(--sn-accent-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
          </div>
        )}

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: 'var(--sn-bg-elevated, #2a2a42)',
              borderRadius: 8,
              boxShadow: 'var(--sn-elevation-panel, 0 4px 16px rgba(0,0,0,0.5))',
              maxHeight: 280,
              overflowY: 'auto',
              zIndex: 100,
            }}
          >
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'var(--sn-accent-primary, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {(user.display_name || user.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      color: 'var(--sn-text-primary, #e2e8f0)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.display_name || user.username}
                  </div>
                  {user.username && (
                    <div style={{ fontSize: 12, color: 'var(--sn-text-secondary, #94a3b8)' }}>
                      @{user.username}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Role */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Role
        </label>
        <RoleSelector value={role} onChange={setRole} disabled={isCreating} />
      </div>

      {/* Message */}
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--sn-text-primary, #e2e8f0)',
          }}
        >
          Personal message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey! I'd like to share this canvas with you..."
          disabled={isCreating}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--sn-bg-tertiary, #252538)',
            border: '1px solid var(--sn-border-primary, rgba(139,92,246,0.2))',
            borderRadius: 6,
            color: 'var(--sn-text-primary, #e2e8f0)',
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Can invite others */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: isCreating ? 'not-allowed' : 'pointer',
          opacity: isCreating ? 0.5 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={canInviteOthers}
          onChange={(e) => setCanInviteOthers(e.target.checked)}
          disabled={isCreating}
          style={{ width: 16, height: 16, cursor: 'inherit' }}
        />
        <span style={{ fontSize: 13, color: 'var(--sn-text-secondary, #94a3b8)' }}>
          Allow them to invite others
        </span>
      </label>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: 'var(--sn-error, #ef4444)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          style={{
            padding: 12,
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 6,
            color: 'var(--sn-success, #22c55e)',
            fontSize: 13,
          }}
        >
          Invitation sent successfully!
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={handleCreate}
        disabled={isCreating || !selectedUser}
        style={{
          padding: '12px 20px',
          background: 'var(--sn-accent-primary, #8b5cf6)',
          border: 'none',
          borderRadius: 6,
          color: 'white',
          cursor: isCreating || !selectedUser ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          opacity: isCreating || !selectedUser ? 0.5 : 1,
        }}
      >
        {isCreating ? 'Sending...' : 'Send Invitation'}
      </button>
    </div>
  );
};

export default UsernameInviteForm;
