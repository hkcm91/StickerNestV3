/**
 * StickerNest v2 - Iterative Refiner Component
 * Chat-based interface for refining generated widgets
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { theme } from '../../theme';
import type { ConversationMessage, QualityScore } from '../../../services/widget-generator-v2';

// Quick refinement suggestions
const QUICK_REFINEMENTS = [
  { label: 'Make it bigger', prompt: 'Increase the size and make elements more prominent' },
  { label: 'Add animation', prompt: 'Add smooth animations and transitions' },
  { label: 'Simplify', prompt: 'Simplify the design, remove unnecessary elements' },
  { label: 'More color', prompt: 'Add more vibrant colors and visual interest' },
  { label: 'Better hover', prompt: 'Improve hover effects and interactions' },
  { label: 'Add icons', prompt: 'Add appropriate icons to improve visual clarity' },
];

interface IterativeRefinerProps {
  conversation: ConversationMessage[];
  qualityScore?: QualityScore;
  onRefine: (feedback: string) => void;
  isRefining: boolean;
  disabled?: boolean;
}

export const IterativeRefiner: React.FC<IterativeRefinerProps> = ({
  conversation,
  qualityScore,
  onRefine,
  isRefining,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isRefining) return;
    onRefine(input.trim());
    setInput('');
  }, [input, isRefining, onRefine]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleQuickRefine = useCallback((prompt: string) => {
    onRefine(prompt);
  }, [onRefine]);

  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '400px',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>🔄</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            Refine Widget
          </span>
        </div>

        {/* Quality Score Badge */}
        {qualityScore && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{
              fontSize: '11px',
              color: theme.text.tertiary,
            }}>
              Quality:
            </span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              background: qualityScore.overall >= 80 ? 'rgba(34, 197, 94, 0.2)' :
                         qualityScore.overall >= 60 ? 'rgba(245, 158, 11, 0.2)' :
                         'rgba(239, 68, 68, 0.2)',
              color: qualityScore.overall >= 80 ? '#4ade80' :
                    qualityScore.overall >= 60 ? '#fbbf24' :
                    '#f87171',
            }}>
              {qualityScore.overall}/100
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
      }}>
        {conversation.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: theme.text.tertiary,
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
            <div style={{ fontSize: '13px', marginBottom: '8px' }}>
              No refinements yet
            </div>
            <div style={{ fontSize: '11px' }}>
              Use the quick actions below or describe changes you want
            </div>
          </div>
        ) : (
          conversation.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: '12px',
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px',
                background: msg.role === 'user' ? theme.accent : theme.bg.tertiary,
                color: msg.role === 'user' ? 'white' : theme.text.primary,
              }}>
                <div style={{
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : theme.text.tertiary,
                  marginTop: '4px',
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Refinements */}
      <div style={{
        padding: '8px 12px',
        borderTop: `1px solid ${theme.border}`,
        background: theme.bg.tertiary,
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {QUICK_REFINEMENTS.map((item) => (
            <button
              key={item.label}
              onClick={() => handleQuickRefine(item.prompt)}
              disabled={disabled || isRefining}
              style={{
                padding: '4px 10px',
                background: theme.bg.secondary,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                fontSize: '11px',
                color: theme.text.secondary,
                cursor: disabled || isRefining ? 'not-allowed' : 'pointer',
                opacity: disabled || isRefining ? 0.5 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isRefining) {
                  e.currentTarget.style.borderColor = theme.accent;
                  e.currentTarget.style.color = theme.accent;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.color = theme.text.secondary;
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{
        padding: '12px',
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        gap: '8px',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isRefining}
          placeholder="Describe how to improve the widget..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: theme.bg.tertiary,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            color: theme.text.primary,
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || isRefining || !input.trim()}
          style={{
            padding: '10px 18px',
            background: disabled || isRefining || !input.trim()
              ? theme.bg.tertiary
              : theme.accent,
            border: 'none',
            borderRadius: '8px',
            color: disabled || isRefining || !input.trim()
              ? theme.text.tertiary
              : 'white',
            fontSize: '13px',
            fontWeight: 600,
            cursor: disabled || isRefining || !input.trim()
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {isRefining ? 'Refining...' : 'Refine'}
        </button>
      </div>
    </div>
  );
};
