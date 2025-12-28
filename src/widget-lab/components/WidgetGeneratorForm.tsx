/**
 * Widget Generator Form
 * Form for generating widgets with AI, including all configuration options
 */

import React from 'react';
import { theme } from '../theme';
import { EXAMPLE_PROMPTS } from '../constants';
import type { Pipeline } from '../../types/domain';
import type { IOPort, LibraryWidgetInfo } from '../WidgetLab.types';
import type { ComplexityLevel, StylePreset, FeatureRequirements } from '../../ai';
import type { TemplateCategory } from '../../ai/WidgetTemplates';
import { GeneratorOptionsSection } from './GeneratorOptionsSection';
import { IOPortsSection } from './IOPortsSection';

export interface WidgetGeneratorFormProps {
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: TemplateCategory | '';
  setSelectedCategory: React.Dispatch<React.SetStateAction<TemplateCategory | ''>>;
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  complexity: ComplexityLevel;
  setComplexity: React.Dispatch<React.SetStateAction<ComplexityLevel>>;
  stylePreset: StylePreset;
  setStylePreset: React.Dispatch<React.SetStateAction<StylePreset>>;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  selectedPipeline: string;
  setSelectedPipeline: React.Dispatch<React.SetStateAction<string>>;
  pipelines: Pipeline[];
  features: FeatureRequirements;
  setFeatures: React.Dispatch<React.SetStateAction<FeatureRequirements>>;
  inputPorts: IOPort[];
  setInputPorts: React.Dispatch<React.SetStateAction<IOPort[]>>;
  outputPorts: IOPort[];
  setOutputPorts: React.Dispatch<React.SetStateAction<IOPort[]>>;
  newInputName: string;
  setNewInputName: React.Dispatch<React.SetStateAction<string>>;
  newOutputName: string;
  setNewOutputName: React.Dispatch<React.SetStateAction<string>>;
  isGenerating: boolean;
  generationStep: string;
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLibraryWidgets: string[];
  libraryWidgets: LibraryWidgetInfo[];
  isSuggestingIO: boolean;
  error: string | null;
  redundancyWarning: string | null;
  setRedundancyWarning: React.Dispatch<React.SetStateAction<string | null>>;
  onQuickCreate: () => Promise<void>;
  onGenerate: () => Promise<void>;
  onSuggestIO: () => Promise<void>;
}

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

export const WidgetGeneratorForm: React.FC<WidgetGeneratorFormProps> = ({
  description,
  setDescription,
  selectedCategory,
  setSelectedCategory,
  selectedTemplate,
  setSelectedTemplate,
  complexity,
  setComplexity,
  stylePreset,
  setStylePreset,
  selectedModel,
  setSelectedModel,
  selectedPipeline,
  setSelectedPipeline,
  pipelines,
  features,
  setFeatures,
  inputPorts,
  setInputPorts,
  outputPorts,
  setOutputPorts,
  newInputName,
  setNewInputName,
  newOutputName,
  setNewOutputName,
  isGenerating,
  generationStep,
  showAdvancedOptions,
  setShowAdvancedOptions,
  selectedLibraryWidgets,
  libraryWidgets,
  isSuggestingIO,
  error,
  redundancyWarning,
  setRedundancyWarning,
  onQuickCreate,
  onGenerate,
  onSuggestIO,
}) => {
  return (
    <div style={{
      background: theme.bg.secondary,
      borderRadius: '8px',
      border: `1px solid ${theme.border}`,
      padding: '24px',
    }}>
      {/* Generator Options (Model, Pipeline, Template, Quality, Style, Features) */}
      <GeneratorOptionsSection
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedPipeline={selectedPipeline}
        setSelectedPipeline={setSelectedPipeline}
        pipelines={pipelines}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        complexity={complexity}
        setComplexity={setComplexity}
        stylePreset={stylePreset}
        setStylePreset={setStylePreset}
        features={features}
        setFeatures={setFeatures}
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
        selectedLibraryWidgets={selectedLibraryWidgets}
        libraryWidgets={libraryWidgets}
      />

      {/* Description with Quick Create */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>What widget do you want?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Just describe it - AI handles the rest!

Examples:
• A shadow control panel for vector shapes
• A color picker that connects to the canvas
• A countdown timer with start/pause"
          style={{
            ...inputStyle,
            minHeight: '100px',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter for quick create
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && description.trim()) {
              e.preventDefault();
              onQuickCreate();
            }
          }}
        />

        {/* Quick Create Button - Primary Action */}
        <div style={{
          marginTop: '12px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <button
            onClick={onQuickCreate}
            disabled={isGenerating || !description.trim()}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: isGenerating || !description.trim()
                ? theme.bg.tertiary
                : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              border: 'none',
              borderRadius: '8px',
              color: isGenerating || !description.trim() ? theme.text.tertiary : 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isGenerating || !description.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: isGenerating || !description.trim() ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            {isGenerating ? (
              <>
                <span style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                {generationStep || 'Creating...'}
              </>
            ) : (
              <>Quick Create (Ctrl+Enter)</>
            )}
          </button>
        </div>

        <p style={{
          fontSize: '11px',
          color: theme.text.tertiary,
          marginTop: '8px',
          textAlign: 'center',
        }}>
          Auto-detects connections and saves to library
        </p>

        {/* Example Prompts */}
        {!description && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: theme.text.tertiary, marginBottom: '8px' }}>
              Need ideas? Try one of these:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EXAMPLE_PROMPTS.slice(0, 4).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(prompt)}
                  style={{
                    padding: '6px 10px',
                    background: theme.bg.tertiary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '4px',
                    color: theme.text.secondary,
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    maxWidth: '200px',
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={prompt}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* I/O Ports Section */}
      <IOPortsSection
        inputPorts={inputPorts}
        setInputPorts={setInputPorts}
        outputPorts={outputPorts}
        setOutputPorts={setOutputPorts}
        newInputName={newInputName}
        setNewInputName={setNewInputName}
        newOutputName={newOutputName}
        setNewOutputName={setNewOutputName}
        isSuggestingIO={isSuggestingIO}
        description={description}
        libraryWidgets={libraryWidgets}
        onSuggestIO={onSuggestIO}
      />

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !description.trim()}
        style={{
          width: '100%',
          padding: '14px',
          background: isGenerating
            ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
            : !description.trim()
            ? theme.bg.tertiary
            : theme.accent,
          border: 'none',
          borderRadius: '6px',
          color: !description.trim() ? theme.text.tertiary : 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isGenerating || !description.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isGenerating ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            {generationStep || 'Generating...'}
          </span>
        ) : (
          'Generate Widget'
        )}
      </button>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Generation Info */}
      {!isGenerating && description.trim() && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: theme.bg.tertiary,
          borderRadius: '6px',
          border: `1px solid ${theme.border}`,
          fontSize: '11px',
          color: theme.text.tertiary,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>
            <strong style={{ color: theme.text.secondary }}>Quality:</strong> {complexity} •{' '}
            <strong style={{ color: theme.text.secondary }}>Style:</strong> {stylePreset}
          </span>
          <span>
            {Object.values(features).filter(Boolean).length} features enabled
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '6px',
          color: '#fca5a5',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Redundancy Warning */}
      {redundancyWarning && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.15)',
          borderRadius: '6px',
          color: '#fcd34d',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '16px' }}>&#9888;&#65039;</span>
          <span>{redundancyWarning}</span>
          <button
            onClick={() => setRedundancyWarning(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#fcd34d',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            &#10005;
          </button>
        </div>
      )}
    </div>
  );
};

export default WidgetGeneratorForm;
