/**
 * StickerNest v2 - Prompt Composer Component
 * Smart textarea with suggestions and templates for widget generation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { theme } from '../../theme';

// Example prompts by category
const EXAMPLE_PROMPTS = {
  interactive: [
    'A click counter with animated increment button',
    'A color picker with preview and copy to clipboard',
    'A slider that shows its value in real-time',
  ],
  data: [
    'A todo list with add, complete, and delete',
    'A progress bar that can be controlled externally',
    'A data display card that shows JSON prettified',
  ],
  utility: [
    'A timer with start, pause, and reset',
    'A stopwatch with lap times',
    'A clock showing current time with timezone selector',
  ],
  visual: [
    'An animated loading spinner',
    'A notification toast component',
    'A card carousel with navigation',
  ],
};

const PROMPT_TIPS = [
  'Be specific about what the widget does',
  'Mention interactions (click, hover, drag)',
  'Describe data inputs and outputs',
  'Specify visual style if important',
];

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = 'Describe the widget you want to create...',
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EXAMPLE_PROMPTS>('interactive');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);

  const selectExample = useCallback((prompt: string) => {
    onChange(prompt);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }, [onChange]);

  const charCount = value.length;
  const charWarning = charCount > 500;

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Main Input */}
      <div style={{
        position: 'relative',
        background: theme.bg.secondary,
        borderRadius: '12px',
        border: `2px solid ${value.trim() ? theme.accent : theme.border}`,
        transition: 'border-color 0.2s ease',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => !value && setShowSuggestions(true)}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          style={{
            width: '100%',
            padding: '16px',
            background: 'transparent',
            border: 'none',
            color: theme.text.primary,
            fontSize: '14px',
            lineHeight: 1.6,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Footer with char count and hint */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderTop: `1px solid ${theme.border}`,
          background: theme.bg.tertiary,
          borderRadius: '0 0 10px 10px',
        }}>
          <span style={{
            fontSize: '11px',
            color: theme.text.tertiary,
          }}>
            Press <kbd style={{
              padding: '2px 6px',
              background: theme.bg.secondary,
              borderRadius: '4px',
              fontSize: '10px',
            }}>Ctrl+Enter</kbd> to generate
          </span>

          <span style={{
            fontSize: '11px',
            color: charWarning ? theme.warning : theme.text.tertiary,
          }}>
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Suggestions Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '12px',
      }}>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          style={{
            padding: '6px 12px',
            background: showSuggestions ? theme.accentMuted : theme.bg.tertiary,
            border: `1px solid ${showSuggestions ? theme.accent : theme.border}`,
            borderRadius: '6px',
            color: showSuggestions ? theme.accent : theme.text.secondary,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>💡</span>
          {showSuggestions ? 'Hide Examples' : 'Show Examples'}
        </button>

        {/* Quick tips */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {PROMPT_TIPS.slice(0, 2).map((tip, i) => (
            <span
              key={i}
              style={{
                padding: '4px 8px',
                background: theme.bg.tertiary,
                borderRadius: '4px',
                fontSize: '10px',
                color: theme.text.tertiary,
              }}
            >
              {tip}
            </span>
          ))}
        </div>
      </div>

      {/* Suggestions Panel */}
      {showSuggestions && (
        <div style={{
          marginTop: '12px',
          background: theme.bg.secondary,
          borderRadius: '10px',
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
        }}>
          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${theme.border}`,
          }}>
            {(Object.keys(EXAMPLE_PROMPTS) as Array<keyof typeof EXAMPLE_PROMPTS>).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: selectedCategory === cat ? theme.bg.tertiary : 'transparent',
                  border: 'none',
                  borderBottom: selectedCategory === cat ? `2px solid ${theme.accent}` : '2px solid transparent',
                  color: selectedCategory === cat ? theme.text.primary : theme.text.secondary,
                  fontSize: '12px',
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Example List */}
          <div style={{ padding: '12px' }}>
            {EXAMPLE_PROMPTS[selectedCategory].map((prompt, i) => (
              <button
                key={i}
                onClick={() => selectExample(prompt)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: i < EXAMPLE_PROMPTS[selectedCategory].length - 1 ? '8px' : 0,
                  background: theme.bg.tertiary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  color: theme.text.primary,
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = theme.accentMuted;
                  e.currentTarget.style.borderColor = theme.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = theme.bg.tertiary;
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
