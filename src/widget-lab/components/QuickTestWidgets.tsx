/**
 * Quick Test Widgets Component
 * One-click buttons to generate pre-validated test widgets
 * With connection hints to show how widgets work together
 */

import React, { useState } from 'react';
import { theme } from '../theme';
import { TEST_WIDGET_TYPES, type TestWidgetType } from '../constants';

// Extended widget info with connection details
const WIDGET_DETAILS: Record<TestWidgetType, {
  description: string;
  sends: string;
  receives: string;
  connectsWith: TestWidgetType[];
  example: string;
}> = {
  'vector-control': {
    description: 'A control panel for changing colors and visual styles',
    sends: 'Color values, shadow settings',
    receives: 'Nothing (it\'s an input widget)',
    connectsWith: ['display'],
    example: 'Change the color → Display shows it',
  },
  'timer': {
    description: 'A countdown timer that ticks and fires when complete',
    sends: 'Tick events, completion signal',
    receives: 'Start/stop/reset commands',
    connectsWith: ['button', 'display'],
    example: 'Button starts timer → Timer ticks → Display shows countdown',
  },
  'button': {
    description: 'A clickable button that triggers actions',
    sends: 'Click events',
    receives: 'Nothing (it\'s an input widget)',
    connectsWith: ['timer', 'display'],
    example: 'Click button → Timer starts or Display updates',
  },
  'display': {
    description: 'Shows values and messages from other widgets',
    sends: 'Nothing (it\'s an output widget)',
    receives: 'Any data to display',
    connectsWith: ['vector-control', 'timer', 'button'],
    example: 'Receives data from any widget → Shows it',
  },
};

interface QuickTestWidgetsProps {
  onAddTestWidget: (type: TestWidgetType) => void;
}

export const QuickTestWidgets: React.FC<QuickTestWidgetsProps> = ({ onAddTestWidget }) => {
  const [hoveredWidget, setHoveredWidget] = useState<TestWidgetType | null>(null);
  const [showTip, setShowTip] = useState(true);

  const hoveredDetails = hoveredWidget ? WIDGET_DETAILS[hoveredWidget] : null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(59, 130, 246, 0.12))',
      borderRadius: '12px',
      border: '2px solid rgba(34, 197, 94, 0.3)',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: hoveredDetails ? '12px' : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>🧪</span>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: theme.text.primary }}>
              Quick Test Widgets
            </span>
            <span style={{ fontSize: '12px', color: theme.text.secondary, marginLeft: '8px' }}>
              Click to add, hover for details
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TEST_WIDGET_TYPES.map(item => {
            const isHovered = hoveredWidget === item.type;
            const connectsWithHovered = hoveredWidget && WIDGET_DETAILS[hoveredWidget]?.connectsWith.includes(item.type);

            return (
              <button
                key={item.type}
                onClick={() => onAddTestWidget(item.type)}
                onMouseEnter={() => setHoveredWidget(item.type)}
                onMouseLeave={() => setHoveredWidget(null)}
                title={WIDGET_DETAILS[item.type].description}
                style={{
                  padding: '8px 14px',
                  background: isHovered
                    ? theme.accent
                    : connectsWithHovered
                      ? 'rgba(34, 197, 94, 0.2)'
                      : theme.bg.secondary,
                  border: `1px solid ${
                    isHovered
                      ? theme.accent
                      : connectsWithHovered
                        ? 'rgba(34, 197, 94, 0.5)'
                        : theme.border
                  }`,
                  borderRadius: '6px',
                  color: isHovered ? 'white' : theme.text.primary,
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {item.icon} {item.label}
                {connectsWithHovered && !isHovered && (
                  <span style={{
                    fontSize: '10px',
                    color: theme.success,
                    marginLeft: '2px',
                  }}>
                    ←
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover details panel */}
      {hoveredDetails && (
        <div style={{
          padding: '12px 14px',
          background: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{
            fontSize: '12px',
            color: theme.text.secondary,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: theme.text.primary }}>{hoveredDetails.description}</strong>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '4px 12px',
              marginTop: '8px',
              fontSize: '11px',
            }}>
              <span style={{ color: theme.accent }}>Sends:</span>
              <span>{hoveredDetails.sends}</span>
              <span style={{ color: theme.success }}>Receives:</span>
              <span>{hoveredDetails.receives}</span>
              <span style={{ color: theme.text.tertiary }}>Example:</span>
              <span style={{ fontStyle: 'italic' }}>{hoveredDetails.example}</span>
            </div>
          </div>
        </div>
      )}

      {/* First-time tip */}
      {showTip && !hoveredDetails && (
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px dashed ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '11px', color: theme.text.secondary }}>
            💡 <strong>Try this:</strong> Add a <strong>Button</strong> and a <strong>Display</strong>, then click the button to see them communicate!
          </span>
          <button
            onClick={() => setShowTip(false)}
            style={{
              padding: '2px 8px',
              background: 'transparent',
              border: 'none',
              color: theme.text.tertiary,
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
