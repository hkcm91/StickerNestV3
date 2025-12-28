/**
 * Widget Docker Sub-Components
 * Reusable UI components for the docker system
 */

import React, { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { WidgetInstance } from '../../../types/domain';
import type { DockerInstance, DockerPreset } from '../WidgetDocker.types';
import { HEADER_HEIGHT } from '../constants';

// ============================================
// GlassButton Component
// ============================================

interface GlassButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  onClick,
  title,
  active,
  danger,
  size = 'md',
  children,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    title={title}
    style={{
      width: size === 'sm' ? 22 : 28,
      height: size === 'sm' ? 22 : 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: active
        ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(168,85,247,0.4))'
        : danger
        ? 'rgba(239,68,68,0.15)'
        : 'rgba(255,255,255,0.06)',
      border: active
        ? '1px solid rgba(139,92,246,0.5)'
        : danger
        ? '1px solid rgba(239,68,68,0.3)'
        : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
      color: danger ? '#fca5a5' : active ? '#e9d5ff' : 'rgba(255,255,255,0.7)',
      cursor: 'pointer',
      fontSize: size === 'sm' ? 12 : 14,
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

// ============================================
// TabItem Component
// ============================================

interface TabItemProps {
  widget: WidgetInstance;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const TabItem: React.FC<TabItemProps> = ({
  widget,
  isActive,
  onClick,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
}) => (
  <div
    draggable
    onClick={onClick}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onAuxClick={(e) => {
      if (e.button === 1) onClose();
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      background: isActive
        ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(168,85,247,0.2))'
        : 'rgba(255,255,255,0.04)',
      border: isActive ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      cursor: 'grab',
      fontSize: 12,
      color: isActive ? '#f5f3ff' : 'rgba(255,255,255,0.6)',
      maxWidth: 130,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      transition: 'all 0.15s ease',
      boxShadow: isActive ? '0 2px 8px rgba(139,92,246,0.2)' : 'none',
    }}
  >
    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {widget.name || 'Widget'}
    </span>
    <span
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        width: 16,
        height: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        fontSize: 12,
        opacity: 0.6,
        cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
    >
      ×
    </span>
  </div>
);

// ============================================
// PresetsPanel Component
// ============================================

interface PresetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: DockerPreset) => void;
  onDeletePreset: (id: string) => void;
  presets: DockerPreset[];
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
  isOpen,
  onClose,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  presets,
}) => {
  const [presetName, setPresetName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click using shared hook
  useClickOutside(panelRef, onClose, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: HEADER_HEIGHT,
        right: 10,
        width: 220,
        background: 'rgba(16,16,22,0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>
          Save Current Layout
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            style={{
              flex: 1,
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 6,
              color: 'white',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (presetName.trim()) {
                onSavePreset(presetName.trim());
                setPresetName('');
              }
            }}
            disabled={!presetName.trim()}
            style={{
              padding: '8px 12px',
              background: presetName.trim()
                ? 'linear-gradient(135deg, rgba(139,92,246,0.6), rgba(168,85,247,0.6))'
                : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: 6,
              color: presetName.trim() ? 'white' : 'rgba(255,255,255,0.3)',
              fontSize: 12,
              cursor: presetName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {presets.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            No saved presets
          </div>
        ) : (
          presets.map((preset) => (
            <div
              key={preset.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => onLoadPreset(preset)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
                  {preset.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                  {preset.dockers.reduce((acc, d) => acc + d.dockedIds.length, 0)} widgets •{' '}
                  {new Date(preset.savedAt).toLocaleDateString()}
                </div>
              </div>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePreset(preset.id);
                }}
                style={{
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  opacity: 0.4,
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
                title="Delete preset"
              >
                🗑️
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================
// DockerDropdown Component
// ============================================

interface DockerDropdownProps {
  dockers: DockerInstance[];
  activeDocker: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export const DockerDropdown: React.FC<DockerDropdownProps> = ({
  dockers,
  activeDocker,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click using shared hook
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setEditingId(null);
  }, []);
  useClickOutside(dropdownRef, handleClose);

  const currentDocker = dockers.find((d) => d.id === activeDocker);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentDocker?.name || 'Docker'}
        </span>
        <span style={{ fontSize: 8, opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 180,
            background: 'rgba(20,20,28,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 0' }}>
            {dockers.map((docker) => (
              <div
                key={docker.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: docker.id === activeDocker ? 'rgba(139,92,246,0.15)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => {
                  if (editingId !== docker.id) {
                    onSelect(docker.id);
                    setIsOpen(false);
                  }
                }}
                onMouseEnter={(e) => {
                  if (docker.id !== activeDocker) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    docker.id === activeDocker ? 'rgba(139,92,246,0.15)' : 'transparent';
                }}
              >
                {editingId === docker.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onRename(docker.id, editName);
                        setEditingId(null);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    onBlur={() => {
                      onRename(docker.id, editName);
                      setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      flex: 1,
                      padding: '2px 6px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: 4,
                      color: 'white',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: docker.id === activeDocker ? '#e9d5ff' : 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {docker.name}
                    </span>
                    <span
                      style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginRight: 8 }}
                    >
                      {docker.dockedIds.length}
                    </span>
                  </>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditName(docker.name);
                      setEditingId(docker.id);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      opacity: 0.5,
                      cursor: 'pointer',
                      borderRadius: 4,
                    }}
                    title="Rename"
                  >
                    ✏️
                  </span>
                  {dockers.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(docker.id);
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        opacity: 0.5,
                        cursor: 'pointer',
                        borderRadius: 4,
                      }}
                      title="Delete"
                    >
                      🗑️
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '6px 8px',
            }}
          >
            <button
              onClick={() => {
                onCreate();
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.15))',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 6,
                color: '#e9d5ff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>+</span> New Docker
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
