/**
 * Generator Options Section
 * Quality, style, and advanced features configuration
 */

import React from 'react';
import { theme } from '../theme';
import { COMPLEXITY_OPTIONS, STYLE_OPTIONS, FEATURE_OPTIONS } from '../constants';
import { MODEL_PRESETS } from '../../ai/providers';
import { getTemplateCategories, getTemplatesByCategory, type TemplateCategory } from '../../ai/WidgetTemplates';
import type { Pipeline } from '../../types/domain';
import type { LibraryWidgetInfo } from '../WidgetLab.types';
import type { ComplexityLevel, StylePreset, FeatureRequirements } from '../../ai';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: '#252542',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '13px',
};

// Group models by provider
const getModelsByProvider = () => {
  const grouped: Record<string, typeof MODEL_PRESETS[string][]> = {
    replicate: [],
    openai: [],
    anthropic: [],
    google: [],
  };
  Object.values(MODEL_PRESETS).forEach((preset) => {
    if (grouped[preset.provider]) {
      grouped[preset.provider].push(preset);
    }
  });
  return grouped;
};

export interface GeneratorOptionsSectionProps {
  // Model & Pipeline
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  selectedPipeline: string;
  setSelectedPipeline: React.Dispatch<React.SetStateAction<string>>;
  pipelines: Pipeline[];

  // Template
  selectedCategory: TemplateCategory | '';
  setSelectedCategory: React.Dispatch<React.SetStateAction<TemplateCategory | ''>>;
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;

  // Quality & Style
  complexity: ComplexityLevel;
  setComplexity: React.Dispatch<React.SetStateAction<ComplexityLevel>>;
  stylePreset: StylePreset;
  setStylePreset: React.Dispatch<React.SetStateAction<StylePreset>>;

  // Features
  features: FeatureRequirements;
  setFeatures: React.Dispatch<React.SetStateAction<FeatureRequirements>>;
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;

  // Integration context
  selectedLibraryWidgets: string[];
  libraryWidgets: LibraryWidgetInfo[];
}

export const GeneratorOptionsSection: React.FC<GeneratorOptionsSectionProps> = ({
  selectedModel,
  setSelectedModel,
  selectedPipeline,
  setSelectedPipeline,
  pipelines,
  selectedCategory,
  setSelectedCategory,
  selectedTemplate,
  setSelectedTemplate,
  complexity,
  setComplexity,
  stylePreset,
  setStylePreset,
  features,
  setFeatures,
  showAdvancedOptions,
  setShowAdvancedOptions,
  selectedLibraryWidgets,
  libraryWidgets,
}) => {
  const categories = getTemplateCategories();
  const templates = selectedCategory ? getTemplatesByCategory(selectedCategory) : [];
  const modelsByProvider = getModelsByProvider();

  return (
    <>
      {/* Model Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>AI Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={inputStyle}
        >
          {modelsByProvider.replicate.length > 0 && (
            <optgroup label="Replicate (Llama)">
              {modelsByProvider.replicate.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.displayName}</option>
              ))}
            </optgroup>
          )}
          {modelsByProvider.openai.length > 0 && (
            <optgroup label="OpenAI (GPT)">
              {modelsByProvider.openai.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.displayName}</option>
              ))}
            </optgroup>
          )}
          {modelsByProvider.anthropic.length > 0 && (
            <optgroup label="Anthropic (Claude)">
              {modelsByProvider.anthropic.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.displayName}</option>
              ))}
            </optgroup>
          )}
          {modelsByProvider.google.length > 0 && (
            <optgroup label="Google (Gemini)">
              {modelsByProvider.google.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.displayName}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Pipeline Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Target Pipeline (Optional)</label>
        <select
          value={selectedPipeline}
          onChange={(e) => setSelectedPipeline(e.target.value)}
          style={inputStyle}
        >
          <option value="">No pipeline - standalone widget</option>
          {pipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name} ({pipeline.nodes?.length || 0} widgets)
            </option>
          ))}
        </select>
        {selectedPipeline && (
          <p style={{ fontSize: '11px', color: theme.text.tertiary, marginTop: '4px' }}>
            AI will consider existing widgets in this pipeline when suggesting I/O ports.
          </p>
        )}
      </div>

      {/* Selected widgets info */}
      {selectedLibraryWidgets.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: theme.accentMuted,
          borderRadius: '6px',
          border: `1px solid ${theme.accent}`,
        }}>
          <div style={{ fontSize: '11px', color: theme.accent, fontWeight: 500, marginBottom: '6px' }}>
            INTEGRATING WITH {selectedLibraryWidgets.length} WIDGET(S)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedLibraryWidgets.map(id => {
              const widget = libraryWidgets.find(w => w.id === id);
              return (
                <span key={id} style={{
                  padding: '4px 8px',
                  background: theme.bg.secondary,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: theme.text.primary,
                }}>
                  {widget?.name || id}
                </span>
              );
            })}
          </div>
          <p style={{ fontSize: '11px', color: theme.text.tertiary, marginTop: '8px', marginBottom: 0 }}>
            The AI will generate compatible I/O ports for the new widget.
          </p>
        </div>
      )}

      {/* Template */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Template (Optional)</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as TemplateCategory | '');
            setSelectedTemplate('');
          }}
          style={{ ...inputStyle, marginBottom: '8px' }}
        >
          <option value="">No template - describe freely</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </select>
        {selectedCategory && templates.length > 0 && (
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Quality */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Quality</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setComplexity(option.id)}
              style={{
                padding: '12px',
                background: complexity === option.id ? theme.accentMuted : theme.bg.tertiary,
                border: complexity === option.id
                  ? `1px solid ${theme.accent}`
                  : `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{
                color: complexity === option.id ? theme.text.primary : theme.text.secondary,
                fontSize: '12px',
                fontWeight: 500,
              }}>
                {option.label}
              </div>
              <div style={{ color: theme.text.tertiary, fontSize: '10px', marginTop: '2px' }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Style</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setStylePreset(option.id)}
              style={{
                padding: '8px 16px',
                background: stylePreset === option.id ? theme.accentMuted : theme.bg.tertiary,
                border: stylePreset === option.id
                  ? `1px solid ${theme.accent}`
                  : `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                color: stylePreset === option.id ? theme.accent : theme.text.tertiary,
                fontSize: '12px',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.accent,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
          }}
        >
          <span style={{
            transform: showAdvancedOptions ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>&#9654;</span>
          Advanced Features
        </button>

        {showAdvancedOptions && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: theme.bg.tertiary,
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
          }}>
            <div style={{ fontSize: '11px', color: theme.text.secondary, marginBottom: '10px' }}>
              Select features to include in your widget:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {FEATURE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: features[option.id] ? theme.text.primary : theme.text.tertiary,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={features[option.id] || false}
                    onChange={(e) => setFeatures({ ...features, [option.id]: e.target.checked })}
                    style={{
                      width: '14px',
                      height: '14px',
                      accentColor: theme.accent,
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GeneratorOptionsSection;
