/**
 * StickerNest v2 - Canvas Settings Dropdown
 * Unified dropdown for all canvas settings in the navbar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SNIcon, type IconName } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { ThemeSection } from './sections/ThemeSection';
import { GlassSection } from './sections/GlassSection';
import { RadiusSection } from './sections/RadiusSection';
import { BorderSection } from './sections/BorderSection';
import { ColorSection } from './sections/ColorSection';
import { CanvasSizeSection } from './sections/CanvasSizeSection';
import { GridSection } from './sections/GridSection';
import { BackgroundSection } from './sections/BackgroundSection';
import { MaskSection } from './sections/MaskSection';

export interface CanvasSettingsDropdownProps {
  /** Whether settings are available (e.g., on canvas page) */
  enabled?: boolean;
  /** Optional callback for canvas size changes */
  onCanvasSizeChange?: (width: number, height: number) => void;
}

type SectionId = 'themes' | 'glass' | 'radius' | 'border' | 'color' | 'size' | 'grid' | 'background' | 'mask';

interface Section {
  id: SectionId;
  label: string;
  icon: IconName;
}

const SECTIONS: Section[] = [
  { id: 'themes', label: 'Themes', icon: 'palette' },
  { id: 'glass', label: 'Glassmorphism', icon: 'sparkles' },
  { id: 'radius', label: 'Radius', icon: 'crop' },
  { id: 'border', label: 'Border', icon: 'square' },
  { id: 'color', label: 'Colors', icon: 'pipette' },
  { id: 'size', label: 'Canvas Size', icon: 'maximize' },
  { id: 'grid', label: 'Grid & Snap', icon: 'grid' },
  { id: 'background', label: 'Background', icon: 'image' },
  { id: 'mask', label: 'Canvas Mask', icon: 'eyeOff' },
];

export const CanvasSettingsDropdown: React.FC<CanvasSettingsDropdownProps> = ({
  enabled = true,
  onCanvasSizeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionId | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  const renderSectionContent = (sectionId: SectionId) => {
    switch (sectionId) {
      case 'themes':
        return <ThemeSection />;
      case 'glass':
        return <GlassSection />;
      case 'radius':
        return <RadiusSection />;
      case 'border':
        return <BorderSection />;
      case 'color':
        return <ColorSection />;
      case 'size':
        return <CanvasSizeSection onSizeChange={onCanvasSizeChange} />;
      case 'grid':
        return <GridSection />;
      case 'background':
        return <BackgroundSection />;
      case 'mask':
        return <MaskSection />;
      default:
        return null;
    }
  };

  if (!enabled) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <SNIconButton
        icon="sliders"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        tooltip="Canvas Settings"
        aria-label="Canvas Settings"
        aria-expanded={isOpen}
        style={{
          background: isOpen ? 'rgba(139, 92, 246, 0.15)' : undefined,
          borderColor: isOpen ? 'var(--sn-accent-primary)' : undefined,
        }}
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={styles.dropdown}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTitle}>
              <SNIcon name="settings" size="sm" />
              <span>Canvas Settings</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
              aria-label="Close"
            >
              <SNIcon name="x" size="sm" />
            </button>
          </div>

          {/* Sections */}
          <div style={styles.content}>
            {SECTIONS.map((section) => (
              <div key={section.id} style={styles.section}>
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    ...styles.sectionHeader,
                    background: expandedSection === section.id
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'transparent',
                  }}
                >
                  <div style={styles.sectionHeaderLeft}>
                    <SNIcon name={section.icon as any} size="sm" />
                    <span>{section.label}</span>
                  </div>
                  <SNIcon
                    name={expandedSection === section.id ? 'chevronUp' : 'chevronDown'}
                    size="sm"
                  />
                </button>

                {/* Section Content */}
                {expandedSection === section.id && (
                  <div style={styles.sectionContent}>
                    {renderSectionContent(section.id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 320,
    maxHeight: 'calc(100vh - 100px)',
    background: 'rgba(20, 20, 30, 0.98)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 12,
    border: '1px solid var(--sn-border-primary)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    background: 'rgba(139, 92, 246, 0.05)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    color: 'var(--sn-text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  section: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--sn-text-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  sectionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  sectionContent: {
    padding: '8px 16px 16px',
    background: 'rgba(0, 0, 0, 0.15)',
  },
};

export default CanvasSettingsDropdown;
