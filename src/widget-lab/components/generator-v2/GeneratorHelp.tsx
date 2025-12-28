/**
 * StickerNest v2 - Generator Help Component
 * Onboarding tips and help tooltips for the AI Generator
 */

import React, { useState, useCallback } from 'react';
import { theme } from '../../theme';

// ============================================
// Types
// ============================================

interface TipItem {
  id: string;
  icon: string;
  title: string;
  content: string;
  example?: string;
}

// ============================================
// Help Content
// ============================================

const GETTING_STARTED_TIPS: TipItem[] = [
  {
    id: 'describe',
    icon: '💡',
    title: 'Describe What You Want',
    content: 'Write a clear description of your widget. Include its purpose, main features, and any specific behaviors.',
    example: 'A pomodoro timer with start/pause/reset, 25-min work & 5-min break modes',
  },
  {
    id: 'style',
    icon: '🎨',
    title: 'Choose a Style',
    content: 'Select a visual style that matches your project. Each style has unique characteristics like color schemes and animations.',
    example: 'Neon style for cyberpunk vibes, Minimal for clean interfaces',
  },
  {
    id: 'complexity',
    icon: '📊',
    title: 'Set Complexity',
    content: 'Choose how sophisticated the widget should be. Higher complexity means more features but longer generation time.',
    example: 'Basic for simple tools, Professional for production-ready widgets',
  },
  {
    id: 'refine',
    icon: '🔄',
    title: 'Iterate & Refine',
    content: 'After generation, use the Refiner to improve your widget. Describe what you want changed and the AI will update it.',
    example: 'Make the button bigger, add a progress ring, change colors',
  },
];

const PROMPT_TIPS: TipItem[] = [
  {
    id: 'specific',
    icon: '🎯',
    title: 'Be Specific',
    content: 'Include specific details about functionality, layout, and interactions.',
    example: 'Instead of "a clock", try "a digital clock with AM/PM toggle and alarm feature"',
  },
  {
    id: 'io',
    icon: '🔌',
    title: 'Mention I/O',
    content: 'Describe inputs (what the widget receives) and outputs (what it sends to other widgets).',
    example: 'Outputs the current count when clicked, accepts reset signal from buttons',
  },
  {
    id: 'data',
    icon: '💾',
    title: 'State Persistence',
    content: 'Mention if data should be saved between sessions (uses localStorage).',
    example: 'Remember the last used settings, persist todo items',
  },
];

const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  animations: {
    title: 'Animations',
    description: 'Smooth transitions, entrance effects, and micro-animations for visual polish.',
  },
  microInteractions: {
    title: 'Hover Effects',
    description: 'Interactive feedback when hovering over elements like buttons and cards.',
  },
  persistence: {
    title: 'Save State',
    description: 'Remember data between sessions using localStorage.',
  },
  responsive: {
    title: 'Responsive',
    description: 'Adapt layout based on widget container size.',
  },
  errorHandling: {
    title: 'Error States',
    description: 'Graceful handling of errors with user-friendly messages.',
  },
  keyboardShortcuts: {
    title: 'Keyboard Support',
    description: 'Navigate and interact using keyboard shortcuts.',
  },
};

// ============================================
// Components
// ============================================

interface GeneratorHelpProps {
  variant?: 'sidebar' | 'inline' | 'tooltip';
  onClose?: () => void;
}

export const GeneratorHelp: React.FC<GeneratorHelpProps> = ({
  variant = 'sidebar',
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'start' | 'prompts' | 'features'>('start');

  if (variant === 'tooltip') {
    return <QuickTip tips={PROMPT_TIPS} />;
  }

  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
      ...(variant === 'sidebar' ? { width: '280px' } : {}),
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>❓</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            Generator Help
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.text.tertiary,
              cursor: 'pointer',
              padding: '4px',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {[
          { id: 'start' as const, label: 'Start' },
          { id: 'prompts' as const, label: 'Tips' },
          { id: 'features' as const, label: 'Features' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeSection === tab.id
                ? theme.bg.tertiary
                : 'transparent',
              border: 'none',
              borderBottom: activeSection === tab.id
                ? `2px solid ${theme.accent}`
                : '2px solid transparent',
              color: activeSection === tab.id
                ? theme.text.primary
                : theme.text.tertiary,
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        padding: '12px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}>
        {activeSection === 'start' && (
          <TipsList tips={GETTING_STARTED_TIPS} />
        )}
        {activeSection === 'prompts' && (
          <TipsList tips={PROMPT_TIPS} />
        )}
        {activeSection === 'features' && (
          <FeaturesList features={FEATURE_DESCRIPTIONS} />
        )}
      </div>
    </div>
  );
};

// Tips list component
const TipsList: React.FC<{ tips: TipItem[] }> = ({ tips }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {tips.map(tip => (
      <div
        key={tip.id}
        style={{
          padding: '12px',
          background: theme.bg.tertiary,
          borderRadius: '8px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}>
          <span style={{ fontSize: '14px' }}>{tip.icon}</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            {tip.title}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: '11px',
          color: theme.text.secondary,
          lineHeight: 1.5,
        }}>
          {tip.content}
        </p>
        {tip.example && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '4px',
            borderLeft: `3px solid ${theme.accent}`,
          }}>
            <span style={{
              fontSize: '10px',
              color: theme.text.tertiary,
              display: 'block',
              marginBottom: '2px',
            }}>
              Example:
            </span>
            <span style={{
              fontSize: '11px',
              color: theme.text.secondary,
              fontStyle: 'italic',
            }}>
              {tip.example}
            </span>
          </div>
        )}
      </div>
    ))}
  </div>
);

// Features list component
const FeaturesList: React.FC<{
  features: Record<string, { title: string; description: string }>;
}> = ({ features }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {Object.entries(features).map(([key, feature]) => (
      <div
        key={key}
        style={{
          padding: '10px 12px',
          background: theme.bg.tertiary,
          borderRadius: '8px',
        }}
      >
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: theme.text.primary,
          marginBottom: '4px',
        }}>
          {feature.title}
        </div>
        <div style={{
          fontSize: '11px',
          color: theme.text.secondary,
          lineHeight: 1.4,
        }}>
          {feature.description}
        </div>
      </div>
    ))}
  </div>
);

// Quick tooltip tip
const QuickTip: React.FC<{ tips: TipItem[] }> = ({ tips }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const tip = tips[currentIndex];

  const nextTip = useCallback(() => {
    setCurrentIndex(i => (i + 1) % tips.length);
  }, [tips.length]);

  return (
    <div style={{
      padding: '12px',
      background: theme.bg.tertiary,
      borderRadius: '8px',
      maxWidth: '300px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '14px' }}>{tip.icon}</span>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            {tip.title}
          </span>
        </div>
        <span style={{
          fontSize: '10px',
          color: theme.text.tertiary,
        }}>
          {currentIndex + 1}/{tips.length}
        </span>
      </div>
      <p style={{
        margin: '0 0 8px',
        fontSize: '11px',
        color: theme.text.secondary,
        lineHeight: 1.4,
      }}>
        {tip.content}
      </p>
      <button
        onClick={nextTip}
        style={{
          padding: '4px 12px',
          background: theme.accent,
          border: 'none',
          borderRadius: '4px',
          fontSize: '10px',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        Next Tip →
      </button>
    </div>
  );
};

// Inline help badge (for tooltips)
export const HelpBadge: React.FC<{
  tooltip: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ tooltip, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span style={{
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: theme.bg.tertiary,
        border: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: theme.text.tertiary,
        cursor: 'help',
      }}>
        ?
      </span>
      {isVisible && (
        <div style={{
          position: 'absolute',
          [position === 'bottom' ? 'top' : 'bottom']: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: position === 'bottom' ? '8px' : undefined,
          marginBottom: position === 'top' ? '8px' : undefined,
          padding: '8px 12px',
          background: theme.bg.primary,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px',
          fontSize: '11px',
          color: theme.text.secondary,
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {tooltip}
        </div>
      )}
    </span>
  );
};

export default GeneratorHelp;
