/**
 * Lab Introduction Component
 * Shows a clear overview of the Widget Lab with step-by-step guidance
 */

import React, { useState } from 'react';
import { theme } from '../theme';
import { INTRO, WORKFLOWS, CONCEPTS } from '../help';

interface LabIntroProps {
  onScrollToSection?: (sectionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LabIntro: React.FC<LabIntroProps> = ({
  onScrollToSection,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [showConcepts, setShowConcepts] = useState(false);

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        style={{
          width: '100%',
          padding: '12px 16px',
          marginBottom: '20px',
          background: theme.bg.secondary,
          border: `1px solid ${theme.border}`,
          borderRadius: '8px',
          color: theme.text.secondary,
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Show Getting Started Guide</span>
        <span style={{ fontSize: '10px' }}>Click to expand</span>
      </button>
    );
  }

  return (
    <div style={{
      marginBottom: '24px',
      background: `linear-gradient(135deg, ${theme.bg.secondary} 0%, rgba(59, 130, 246, 0.05) 100%)`,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: theme.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            Getting Started
          </h2>
          <p style={{
            margin: '6px 0 0',
            fontSize: '13px',
            color: theme.text.secondary,
            maxWidth: '500px',
            lineHeight: 1.5,
          }}>
            {INTRO.description}
          </p>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text.tertiary,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Hide Guide
          </button>
        )}
      </div>

      {/* Three Workflow Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1px',
        background: theme.border,
      }}>
        {WORKFLOWS.map((workflow, index) => (
          <button
            key={workflow.id}
            onClick={() => onScrollToSection?.(workflow.id)}
            style={{
              padding: '16px 20px',
              background: theme.bg.secondary,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = theme.bg.tertiary;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = theme.bg.secondary;
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: theme.accent,
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {index + 1}
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: theme.text.primary,
              }}>
                {workflow.title}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: theme.text.secondary,
              lineHeight: 1.4,
            }}>
              {workflow.description}
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: '8px',
              fontSize: '10px',
              color: theme.accent,
              fontWeight: 500,
            }}>
              {workflow.forWho}
            </span>
          </button>
        ))}
      </div>

      {/* Key Concepts Toggle */}
      <div style={{
        padding: '12px 24px',
        borderTop: `1px solid ${theme.border}`,
        background: theme.bg.primary,
      }}>
        <button
          onClick={() => setShowConcepts(!showConcepts)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: theme.accent,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{
            transform: showConcepts ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
            fontSize: '10px',
          }}>
            &#9654;
          </span>
          {showConcepts ? 'Hide' : 'Show'} Key Concepts (What are widgets, pipelines, etc?)
        </button>

        {showConcepts && (
          <div style={{
            marginTop: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            {Object.values(CONCEPTS).map((concept) => (
              <div
                key={concept.term}
                style={{
                  padding: '12px',
                  background: theme.bg.secondary,
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: theme.text.primary,
                  marginBottom: '4px',
                }}>
                  {concept.term}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: theme.text.secondary,
                  lineHeight: 1.4,
                }}>
                  {concept.simple}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
