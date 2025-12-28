/**
 * StickerNest v2 - ChannelSelector
 *
 * Minimal dropdown component for switching widget connection channels.
 * Supports local, cross-canvas, and multi-user channels.
 *
 * Design: Clean, compact, with clear visual hierarchy
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { Channel, ChannelGroup, ChannelScope } from '../../types/channels';
import { CHANNEL_SCOPE_INFO, TRUST_LEVEL_INFO } from '../../types/channels';

interface ChannelSelectorProps {
  activeChannel: Channel | null;
  channelGroups: ChannelGroup[];
  isDiscovering?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onSelect: (channelId: string | null) => void;
  onRefresh?: () => void;
}

/**
 * Compact channel selector dropdown
 */
export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  activeChannel,
  channelGroups,
  isDiscovering = false,
  disabled = false,
  compact = false,
  onSelect,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click using shared hook
  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(containerRef, handleClose, { enabled: isOpen });

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = useCallback((channelId: string | null) => {
    onSelect(channelId);
    setIsOpen(false);
  }, [onSelect]);

  const totalChannels = channelGroups.reduce((sum, g) => sum + g.channels.length, 0);
  const scopeInfo = activeChannel ? CHANNEL_SCOPE_INFO[activeChannel.scope] : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 4 : 8,
          padding: compact ? '4px 8px' : '6px 12px',
          background: isOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isOpen ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
          borderRadius: 6,
          color: disabled ? '#64748b' : '#e2e8f0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: compact ? 11 : 12,
          minWidth: compact ? 100 : 140,
          transition: 'all 0.15s',
        }}
      >
        {/* Channel Icon */}
        <span style={{ fontSize: compact ? 12 : 14 }}>
          {activeChannel ? scopeInfo?.icon : '🔌'}
        </span>

        {/* Channel Name */}
        <span style={{
          flex: 1,
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {activeChannel?.name ?? 'Select Channel'}
        </span>

        {/* Status Dot */}
        {activeChannel && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: activeChannel.status === 'connected' ? '#22c55e' :
                       activeChannel.status === 'connecting' ? '#f59e0b' :
                       activeChannel.status === 'error' ? '#ef4444' : '#64748b',
          }} />
        )}

        {/* Dropdown Arrow */}
        <span style={{
          fontSize: 10,
          color: '#64748b',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          minWidth: 220,
          maxHeight: 320,
          overflowY: 'auto',
          background: '#1a1a2e',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              {totalChannels} channel{totalChannels !== 1 ? 's' : ''} available
            </span>
            {onRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                title="Refresh channels"
              >
                {isDiscovering ? '⏳' : '🔄'}
              </button>
            )}
          </div>

          {/* Disconnect Option */}
          {activeChannel && (
            <button
              onClick={() => handleSelect(null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>✕</span>
              <span>Disconnect</span>
            </button>
          )}

          {/* Channel Groups */}
          {channelGroups.map(group => (
            <div key={group.scope}>
              {/* Group Header */}
              <div style={{
                padding: '8px 12px 4px',
                fontSize: 10,
                fontWeight: 600,
                color: CHANNEL_SCOPE_INFO[group.scope].color,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span>{group.icon}</span>
                <span>{group.label}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  color: '#64748b',
                  fontWeight: 400,
                }}>
                  {group.channels.length}
                </span>
              </div>

              {/* Channels */}
              {group.channels.length === 0 ? (
                <div style={{
                  padding: '6px 12px 10px',
                  fontSize: 11,
                  color: '#64748b',
                  fontStyle: 'italic',
                }}>
                  No {group.label.toLowerCase()} channels
                </div>
              ) : (
                group.channels.map(channel => (
                  <ChannelOption
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannel?.id === channel.id}
                    onSelect={() => handleSelect(channel.id)}
                  />
                ))
              )}
            </div>
          ))}

          {/* Empty State */}
          {totalChannels === 0 && (
            <div style={{
              padding: 20,
              textAlign: 'center',
              color: '#64748b',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 12 }}>No channels found</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                Add widgets to discover connections
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Individual channel option in the dropdown
 */
const ChannelOption: React.FC<{
  channel: Channel;
  isActive: boolean;
  onSelect: () => void;
}> = ({ channel, isActive, onSelect }) => {
  const scopeInfo = CHANNEL_SCOPE_INFO[channel.scope];
  const trustInfo = channel.trustLevel ? TRUST_LEVEL_INFO[channel.trustLevel] : null;

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        padding: '8px 12px',
        background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? `3px solid ${scopeInfo.color}` : '3px solid transparent',
        color: '#e2e8f0',
        cursor: 'pointer',
        fontSize: 12,
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Avatar or Icon */}
      {channel.userAvatar ? (
        <img
          src={channel.userAvatar}
          alt=""
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `${scopeInfo.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
        }}>
          {channel.scope === 'local' ? '🧩' :
           channel.scope === 'cross-canvas' ? '📋' : '👤'}
        </div>
      )}

      {/* Channel Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {channel.name}
          </span>

          {/* Trust Badge for Multi-User */}
          {trustInfo && (
            <span style={{
              fontSize: 9,
              padding: '1px 4px',
              borderRadius: 3,
              background: `${trustInfo.color}20`,
              color: trustInfo.color,
            }}>
              {trustInfo.icon}
            </span>
          )}
        </div>

        {/* Description or Canvas Name */}
        {(channel.description || channel.canvasName) && (
          <div style={{
            fontSize: 10,
            color: '#64748b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {channel.canvasName ?? channel.description}
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: channel.status === 'connected' ? '#22c55e' :
                     channel.status === 'connecting' ? '#f59e0b' :
                     channel.status === 'error' ? '#ef4444' : '#64748b',
        }} />
        {channel.latency !== undefined && channel.status === 'connected' && (
          <span style={{ fontSize: 9, color: '#64748b' }}>
            {channel.latency}ms
          </span>
        )}
      </div>
    </button>
  );
};

export default ChannelSelector;
