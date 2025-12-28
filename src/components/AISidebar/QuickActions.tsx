/**
 * StickerNest v2 - Quick Actions
 * Clean form-based widget generation
 */

import React, { useState } from 'react';
import {
  getWidgetPipelineAI,
  type AIGenerationResult,
  type WidgetGenerationRequest,
  type ComplexityLevel,
  type StylePreset,
  type FeatureRequirements,
} from '../../ai';
import { getTemplateCategories, getTemplatesByCategory, type TemplateCategory } from '../../ai/WidgetTemplates';
import { getWidgetFamilyOptions } from '../../ai/PromptEnhancer';

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
  accentHover: '#2563eb',
  accentMuted: 'rgba(59, 130, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  success: '#22c55e',
  error: '#ef4444',
};

export interface QuickActionsProps {
  modelPreset: string;
  onGenerate: (result: AIGenerationResult) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
}

type ActionMode = 'new' | 'variation' | 'modify';

const COMPLEXITY_OPTIONS: { id: ComplexityLevel; label: string; description: string }[] = [
  { id: 'basic', label: 'Basic', description: 'Simple, single-purpose' },
  { id: 'standard', label: 'Standard', description: 'Full-featured, polished' },
  { id: 'advanced', label: 'Advanced', description: 'Sophisticated, detailed' },
  { id: 'professional', label: 'Professional', description: 'Production-ready' },
];

const STYLE_OPTIONS: { id: StylePreset; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'polished', label: 'Polished' },
  { id: 'elaborate', label: 'Elaborate' },
  { id: 'glassmorphism', label: 'Glass' },
  { id: 'neon', label: 'Neon' },
  { id: 'retro', label: 'Retro' },
];

const FEATURE_OPTIONS: { id: keyof FeatureRequirements; label: string }[] = [
  { id: 'animations', label: 'Animations' },
  { id: 'microInteractions', label: 'Micro-interactions' },
  { id: 'loadingStates', label: 'Loading States' },
  { id: 'errorHandling', label: 'Error Handling' },
  { id: 'keyboardShortcuts', label: 'Keyboard' },
  { id: 'responsive', label: 'Responsive' },
  { id: 'accessibility', label: 'A11y' },
  { id: 'persistence', label: 'Persistence' },
  { id: 'soundEffects', label: 'Sound' },
];

export const QuickActions: React.FC<QuickActionsProps> = ({
  modelPreset,
  onGenerate,
  isGenerating,
  setIsGenerating,
}) => {
  const [mode, setMode] = useState<ActionMode>('new');
  const [description, setDescription] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sourceWidgetId, setSourceWidgetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIGenerationResult | null>(null);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [complexity, setComplexity] = useState<ComplexityLevel>('standard');
  const [stylePreset, setStylePreset] = useState<StylePreset>('polished');
  const [features, setFeatures] = useState<FeatureRequirements>({
    animations: true,
    microInteractions: true,
    loadingStates: false,
    errorHandling: false,
    keyboardShortcuts: false,
    responsive: true,
    accessibility: false,
    persistence: false,
    soundEffects: false,
  });
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const categories = getTemplateCategories();
  const templates = selectedCategory ? getTemplatesByCategory(selectedCategory) : [];
  const familyOptions = getWidgetFamilyOptions();

  const toggleFeature = (feature: keyof FeatureRequirements) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setLastResult(null);

    try {
      const ai = getWidgetPipelineAI();
      ai.setModel(modelPreset);

      const request: WidgetGenerationRequest = {
        description: description.trim(),
        mode: mode === 'modify' ? 'variation' : mode,
        templateId: selectedTemplate || undefined,
        sourceWidgetId: mode === 'variation' || mode === 'modify' ? sourceWidgetId : undefined,
        widgetFamily: selectedFamily || undefined,
        modelPreset,
        complexity,
        stylePreset,
        features,
        additionalInstructions: additionalInstructions.trim() || undefined,
      };

      const result = await ai.generateWidget(request);

      setLastResult(result);
      onGenerate(result);

      if (result.success) {
        setDescription('');
      } else if (result.errors?.length) {
        setError(result.errors[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      {/* Mode Selector */}
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            background: theme.bg.primary,
            borderRadius: '6px',
            padding: '3px',
            border: `1px solid ${theme.border}`,
          }}
        >
          {[
            { id: 'new' as const, label: 'New' },
            { id: 'variation' as const, label: 'Variation' },
            { id: 'modify' as const, label: 'Modify' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setMode(option.id)}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: mode === option.id ? theme.accent : 'transparent',
                color: mode === option.id ? 'white' : theme.text.tertiary,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Family Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Widget Family</label>
        <select
          value={selectedFamily}
          onChange={(e) => setSelectedFamily(e.target.value)}
          style={inputStyle}
        >
          <option value="">Auto-detect from description</option>
          {familyOptions.map((family) => (
            <option key={family.id} value={family.id}>
              {family.label} — {family.description}
            </option>
          ))}
        </select>
        {selectedFamily && (
          <div style={{
            marginTop: '6px',
            padding: '8px 10px',
            background: theme.bg.tertiary,
            borderRadius: '4px',
            fontSize: '11px',
            color: theme.text.secondary,
          }}>
            Will auto-listen to <code style={{ color: theme.accent }}>{selectedFamily}:*</code> events
          </div>
        )}
      </div>

      {/* Source Widget (for variation/modify) */}
      {(mode === 'variation' || mode === 'modify') && (
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Source Widget ID</label>
          <input
            type="text"
            value={sourceWidgetId}
            onChange={(e) => setSourceWidgetId(e.target.value)}
            placeholder="e.g., ping-sender"
            style={inputStyle}
          />
        </div>
      )}

      {/* Template Category (for new widgets) */}
      {mode === 'new' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Template (Optional)</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as TemplateCategory);
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
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Complexity Level */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Quality</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {COMPLEXITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setComplexity(option.id)}
              style={{
                padding: '10px 8px',
                background: complexity === option.id ? theme.accentMuted : theme.bg.tertiary,
                border: complexity === option.id
                  ? `1px solid ${theme.accent}`
                  : `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{
                color: complexity === option.id ? theme.text.primary : theme.text.secondary,
                fontSize: '11px',
                fontWeight: 500,
              }}>
                {option.label}
              </div>
              <div style={{
                color: theme.text.tertiary,
                fontSize: '9px',
                marginTop: '2px',
              }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Visual Style */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Style</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setStylePreset(option.id)}
              style={{
                padding: '6px 10px',
                background: stylePreset === option.id ? theme.accentMuted : theme.bg.tertiary,
                border: stylePreset === option.id
                  ? `1px solid ${theme.accent}`
                  : `1px solid ${theme.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                color: stylePreset === option.id ? theme.accent : theme.text.tertiary,
                fontSize: '10px',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>
          {mode === 'modify' ? 'Modification Instructions' : 'Description'}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            mode === 'new'
              ? 'Describe the widget you want to create...\n\nExample: "A todo list with add/remove functionality, checkboxes, and a progress bar"'
              : mode === 'variation'
                ? 'What should be different in this variation?'
                : 'What changes should be made?'
          }
          style={{
            ...inputStyle,
            minHeight: '100px',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          width: '100%',
          padding: '10px',
          background: theme.bg.tertiary,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px',
          color: theme.text.tertiary,
          cursor: 'pointer',
          fontSize: '11px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Advanced Options</span>
        <span style={{
          transform: showAdvanced ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          fontSize: '10px',
        }}>
          ▼
        </span>
      </button>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: theme.bg.tertiary,
          borderRadius: '6px',
          border: `1px solid ${theme.border}`,
        }}>
          {/* Feature Toggles */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...labelStyle, marginBottom: '8px' }}>Features</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {FEATURE_OPTIONS.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => toggleFeature(feature.id)}
                  style={{
                    padding: '4px 8px',
                    background: features[feature.id]
                      ? 'rgba(34, 197, 94, 0.15)'
                      : 'transparent',
                    border: features[feature.id]
                      ? `1px solid ${theme.success}`
                      : `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: features[feature.id] ? theme.success : theme.text.tertiary,
                    fontSize: '9px',
                  }}
                >
                  {feature.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Instructions */}
          <div>
            <label style={labelStyle}>Additional Instructions</label>
            <textarea
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Any specific requirements..."
              style={{
                ...inputStyle,
                minHeight: '60px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !description.trim()}
        style={{
          width: '100%',
          padding: '12px',
          background: isGenerating || !description.trim() ? theme.bg.tertiary : theme.accent,
          border: 'none',
          borderRadius: '6px',
          color: isGenerating || !description.trim() ? theme.text.tertiary : 'white',
          fontSize: '12px',
          fontWeight: 500,
          cursor: isGenerating || !description.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {isGenerating ? 'Generating...' : 'Generate Widget'}
      </button>

      {/* Quick presets */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginTop: '10px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: theme.text.tertiary }}>Quick:</span>
        {[
          { label: 'Fast', complexity: 'basic' as ComplexityLevel, style: 'minimal' as StylePreset },
          { label: 'Balanced', complexity: 'standard' as ComplexityLevel, style: 'polished' as StylePreset },
          { label: 'Premium', complexity: 'professional' as ComplexityLevel, style: 'elaborate' as StylePreset },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              setComplexity(preset.complexity);
              setStylePreset(preset.style);
            }}
            style={{
              padding: '4px 8px',
              background: theme.bg.tertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text.tertiary,
              cursor: 'pointer',
              fontSize: '9px',
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            borderRadius: '6px',
            color: '#fca5a5',
            fontSize: '11px',
          }}
        >
          {error}
        </div>
      )}

      {/* Success Display */}
      {lastResult?.success && lastResult.widget && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.15)',
            borderRadius: '6px',
            border: `1px solid rgba(34, 197, 94, 0.3)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.success,
            }} />
            <span style={{ color: theme.success, fontWeight: 500, fontSize: '12px' }}>
              Widget Generated
            </span>
          </div>
          <div style={{ fontSize: '11px', color: theme.text.secondary }}>
            <div><strong>Name:</strong> {lastResult.widget.manifest.name}</div>
            <div><strong>ID:</strong> {lastResult.widget.manifest.id}</div>
          </div>
          {lastResult.validation && (
            <div
              style={{
                marginTop: '8px',
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '4px',
                fontSize: '10px',
              }}
            >
              <span style={{ color: lastResult.validation.valid ? theme.success : theme.error }}>
                Score: {lastResult.validation.score}/100
              </span>
              {lastResult.validation.warnings.length > 0 && (
                <span style={{ color: '#fbbf24', marginLeft: '8px' }}>
                  {lastResult.validation.warnings.length} warning(s)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Shared styles
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: '#94a3b8',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#252542',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '12px',
};
