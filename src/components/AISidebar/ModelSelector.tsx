/**
 * StickerNest v2 - Model Selector
 * Clean dropdown for selecting AI model presets
 */

import React, { useState, useEffect, useRef } from 'react';
import { getModelRegistry, MODEL_PRESETS, type ModelPreset } from '../../ai/providers';

// Design tokens
const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
  },
  accent: '#3b82f6',
  accentMuted: 'rgba(59, 130, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#22c55e',
};

export interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

// Group models by category
const MODEL_CATEGORIES = {
  'recommended': {
    label: 'Recommended',
    models: ['gpt-4o', 'claude-sonnet-4', 'gemini-2.0-flash', 'llama-3.1-70b'],
  },
  'openai': {
    label: 'OpenAI GPT',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
    requiresKey: 'OPENAI_API_KEY',
  },
  'anthropic': {
    label: 'Anthropic Claude',
    models: ['claude-sonnet-4', 'claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3-opus'],
    requiresKey: 'ANTHROPIC_API_KEY',
  },
  'google-gemini': {
    label: 'Google Gemini',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-thinking', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    requiresKey: 'GOOGLE_API_KEY',
  },
  'llama-3.1': {
    label: 'Llama 3.1',
    models: ['llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b'],
  },
  'llama-3': {
    label: 'Llama 3',
    models: ['llama-3-70b', 'llama-3-8b'],
  },
  'code': {
    label: 'Code Models',
    models: ['codellama-70b', 'codellama-34b', 'codellama-13b', 'qwen-2.5-coder-32b', 'wizardcoder-34b', 'phind-codellama-34b', 'starcoder2-15b'],
  },
  'qwen': {
    label: 'Qwen',
    models: ['qwen-2.5-72b', 'qwen-2.5-coder-32b', 'qwen-2-72b'],
  },
  'deepseek': {
    label: 'DeepSeek',
    models: ['deepseek-v3', 'deepseek-r1'],
  },
  'mistral': {
    label: 'Mistral',
    models: ['mixtral-8x7b', 'mistral-7b', 'nous-hermes-2-mixtral', 'dolphin-2.6-mixtral'],
  },
  'google-gemma': {
    label: 'Google Gemma',
    models: ['gemma-2-27b', 'gemma-2-9b'],
  },
  'other': {
    label: 'Other',
    models: ['yi-34b', 'snowflake-arctic', 'llama-2-70b', 'llama-2-13b'],
  },
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('recommended');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const registry = getModelRegistry();
  const allModels = registry.getAllModels();

  const currentPreset = MODEL_PRESETS[value];
  const currentDisplay = currentPreset?.displayName || value;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderModelButton = (preset: ModelPreset | undefined, id: string) => {
    if (!preset) return null;
    const isSelected = value === id;

    return (
      <button
        key={id}
        onClick={() => {
          onChange(id);
          setIsExpanded(false);
        }}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: isSelected ? theme.accentMuted : 'transparent',
          border: isSelected ? `1px solid ${theme.accent}` : '1px solid transparent',
          borderRadius: '6px',
          color: isSelected ? theme.accent : theme.text.primary,
          fontSize: '12px',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'block',
          marginBottom: '4px',
          transition: 'all 0.15s ease',
        }}
        onMouseOver={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }
        }}
        onMouseOut={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>
          {preset.displayName}
        </div>
        <div style={{ fontSize: '10px', color: theme.text.tertiary, marginBottom: '6px' }}>
          {preset.description}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {preset.capabilities.codeOptimized && (
            <span
              style={{
                padding: '2px 6px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: theme.success,
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 500,
              }}
            >
              Code
            </span>
          )}
          <span
            style={{
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px',
              fontSize: '9px',
              color: theme.text.tertiary,
            }}
          >
            {(preset.capabilities.maxContextLength / 1000).toFixed(0)}K
          </span>
          <span
            style={{
              padding: '2px 6px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '4px',
              fontSize: '9px',
              color: theme.text.tertiary,
            }}
          >
            {preset.defaultOptions.maxTokens} tokens
          </span>
        </div>
      </button>
    );
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: theme.bg.tertiary,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px',
          color: theme.text.primary,
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'border-color 0.15s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = theme.border;
        }}
      >
        <span>
          <span style={{ color: theme.text.tertiary, marginRight: '8px' }}>Model:</span>
          <span style={{ fontWeight: 500 }}>{currentDisplay}</span>
        </span>
        <span
          style={{
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            fontSize: '10px',
            color: theme.text.tertiary,
          }}
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: theme.bg.secondary,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            overflow: 'hidden',
            maxHeight: '400px',
            display: 'flex',
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              width: '120px',
              background: theme.bg.primary,
              borderRight: `1px solid ${theme.border}`,
              padding: '8px',
              overflowY: 'auto',
            }}
          >
            {Object.entries(MODEL_CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: activeCategory === key ? theme.accentMuted : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: activeCategory === key ? theme.accent : theme.text.tertiary,
                  fontSize: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '2px',
                  fontWeight: activeCategory === key ? 500 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {cat.label}
              </button>
            ))}

            {/* Custom Models Section */}
            {allModels.filter(m => m.isCustom).length > 0 && (
              <button
                onClick={() => setActiveCategory('custom')}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: activeCategory === 'custom' ? theme.accentMuted : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: activeCategory === 'custom' ? theme.accent : theme.text.tertiary,
                  fontSize: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: '8px',
                  borderTop: `1px solid ${theme.border}`,
                  paddingTop: '10px',
                }}
              >
                Custom
              </button>
            )}
          </div>

          {/* Model List */}
          <div
            style={{
              flex: 1,
              padding: '12px',
              overflowY: 'auto',
              maxHeight: '350px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                color: theme.text.tertiary,
                textTransform: 'uppercase',
                marginBottom: '10px',
                letterSpacing: '0.5px',
                fontWeight: 500,
              }}
            >
              {MODEL_CATEGORIES[activeCategory as keyof typeof MODEL_CATEGORIES]?.label || 'Custom Models'}
            </div>

            {activeCategory !== 'custom' ? (
              MODEL_CATEGORIES[activeCategory as keyof typeof MODEL_CATEGORIES]?.models.map((modelId) =>
                renderModelButton(MODEL_PRESETS[modelId], modelId)
              )
            ) : (
              allModels
                .filter(m => m.isCustom)
                .map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsExpanded(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: value === model.id ? theme.accentMuted : 'transparent',
                      border: '1px solid transparent',
                      borderRadius: '6px',
                      color: value === model.id ? theme.accent : theme.text.primary,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: '4px',
                    }}
                  >
                    {model.displayName}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Current Model Info */}
      {currentPreset && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: theme.bg.tertiary,
            borderRadius: '4px',
            fontSize: '10px',
            color: theme.text.tertiary,
            display: 'flex',
            gap: '12px',
          }}
        >
          <span>{(currentPreset.capabilities.maxContextLength / 1000).toFixed(0)}K context</span>
          <span>{currentPreset.defaultOptions.maxTokens} max output</span>
          {currentPreset.capabilities.codeOptimized && (
            <span style={{ color: theme.success }}>Code optimized</span>
          )}
        </div>
      )}
    </div>
  );
};
