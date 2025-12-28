/**
 * StickerNest v2 - Tab Type Selector
 * Step 1 of the Create Tab Dialog - Select tab type
 */

import React from 'react';
import { Layers, Globe, Layout, Zap } from 'lucide-react';
import type { TabType } from '../tabs/types';

interface TabTypeOption {
  type: TabType;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

const TAB_TYPE_OPTIONS: TabTypeOption[] = [
  {
    type: 'widget-docker-v2',
    label: 'Widget Stack 2.0',
    description: 'Enhanced widget dock with stacking, drag-drop, and themes',
    icon: <Zap size={24} />,
    badge: 'NEW',
  },
  {
    type: 'widget-docker',
    label: 'Widget Docker (Legacy)',
    description: 'Classic tabbed panel for widgets with presets',
    icon: <Layers size={24} />,
  },
  {
    type: 'url-preview',
    label: 'URL / Website',
    description: 'Preview any website or web app in a side panel',
    icon: <Globe size={24} />,
  },
  {
    type: 'canvas',
    label: 'Canvas View',
    description: 'View your own or shared canvases in a tab',
    icon: <Layout size={24} />,
  },
];

interface TabTypeSelectorProps {
  selectedType: TabType | null;
  onSelect: (type: TabType) => void;
  accentColor?: string;
}

export const TabTypeSelector: React.FC<TabTypeSelectorProps> = ({
  selectedType,
  onSelect,
  accentColor = '#8b5cf6',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#94a3b8',
          marginBottom: 4,
        }}
      >
        Select Tab Type
      </div>

      {TAB_TYPE_OPTIONS.map((option) => {
        const isSelected = selectedType === option.type;

        return (
          <button
            key={option.type}
            onClick={() => onSelect(option.type)}
            style={{
              width: '100%',
              padding: 16,
              background: isSelected ? `${accentColor}22` : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = accentColor + '33';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: isSelected ? `${accentColor}33` : 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSelected ? accentColor : '#94a3b8',
                transition: 'all 0.2s ease',
              }}
            >
              {option.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: isSelected ? accentColor : '#e2e8f0',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {option.label}
                {option.badge && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      color: 'white',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {option.badge}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#94a3b8',
                  lineHeight: 1.4,
                }}
              >
                {option.description}
              </div>
            </div>

            {isSelected && (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ✓
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabTypeSelector;
