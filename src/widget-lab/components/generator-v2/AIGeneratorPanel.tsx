/**
 * StickerNest v2 - AI Generator Panel V2
 * Main container component for the AI Widget Generator V2.0
 * Integrated with self-improving AI for feedback collection
 */

import React, { useState, useCallback, useEffect } from 'react';
import { theme } from '../../theme';
import { PromptComposer } from './PromptComposer';
import { StyleGallery } from './StyleGallery';
import { GenerationProgress } from './GenerationProgress';
import { IterativeRefiner } from './IterativeRefiner';
import { FeedbackButton } from '../../../components/ai-reflection';
import {
  getWidgetGeneratorV2,
  type GenerationRequest,
  type GenerationResult,
  type GenerationSession,
  type StylePreset,
  type ComplexityLevel,
  type ProgressUpdate,
  type FeatureRequirements,
} from '../../../services/widget-generator-v2';
import type { DraftWidget } from '../../../ai/DraftManager';

// Feature toggles
const FEATURE_OPTIONS: Array<{
  key: keyof FeatureRequirements;
  label: string;
  icon: string;
  default: boolean;
}> = [
  { key: 'animations', label: 'Animations', icon: '✨', default: true },
  { key: 'microInteractions', label: 'Hover Effects', icon: '👆', default: true },
  { key: 'persistence', label: 'Save State', icon: '💾', default: true },
  { key: 'responsive', label: 'Responsive', icon: '📱', default: true },
  { key: 'errorHandling', label: 'Error States', icon: '⚠️', default: false },
  { key: 'keyboardShortcuts', label: 'Keyboard', icon: '⌨️', default: false },
];

interface AIGeneratorPanelProps {
  onWidgetGenerated?: (widget: DraftWidget) => void;
  onPreviewWidget?: (widget: DraftWidget) => void;
}

export const AIGeneratorPanel: React.FC<AIGeneratorPanelProps> = ({
  onWidgetGenerated,
  onPreviewWidget,
}) => {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState<StylePreset>('polished');
  const [complexity, setComplexity] = useState<ComplexityLevel>('standard');
  const [features, setFeatures] = useState<FeatureRequirements>(() => {
    const defaults: FeatureRequirements = {};
    FEATURE_OPTIONS.forEach(opt => {
      defaults[opt.key] = opt.default;
    });
    return defaults;
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('preparing');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [startTime, setStartTime] = useState<number | undefined>();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [generatedWidget, setGeneratedWidget] = useState<DraftWidget | null>(null);
  const [metricsId, setMetricsId] = useState<string | null>(null);

  // Refiner state
  const [showRefiner, setShowRefiner] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [conversation, setConversation] = useState<any[]>([]);

  // Toggle feature
  const toggleFeature = useCallback((key: keyof FeatureRequirements) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Subscribe to progress updates
  useEffect(() => {
    if (!sessionId) return;

    const generator = getWidgetGeneratorV2();
    const unsubscribe = generator.onProgress(sessionId, (update: ProgressUpdate) => {
      setCurrentStep(update.step);
      setProgress(update.progress);
      setProgressMessage(update.message);
    });

    return unsubscribe;
  }, [sessionId]);

  // Generate widget
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setStartTime(Date.now());
    setResult(null);
    setGeneratedWidget(null);
    setMetricsId(null);
    setShowRefiner(false);

    const generator = getWidgetGeneratorV2();

    const request: GenerationRequest = {
      description: prompt,
      mode: 'new',
      complexity,
      stylePreset,
      features,
    };

    try {
      const genResult = await generator.generate(request);
      setResult(genResult);
      setSessionId(genResult.sessionId || null);
      setMetricsId(genResult.metricsId || null);

      if (genResult.success && genResult.widget) {
        setGeneratedWidget(genResult.widget);
        onWidgetGenerated?.(genResult.widget);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Generation failed'],
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, complexity, stylePreset, features, isGenerating, onWidgetGenerated]);

  // Refine widget
  const handleRefine = useCallback(async (feedback: string) => {
    if (!sessionId || isRefining) return;

    setIsRefining(true);
    setConversation(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: feedback,
      timestamp: Date.now(),
    }]);

    const generator = getWidgetGeneratorV2();

    try {
      const refineResult = await generator.iterate(sessionId, feedback);

      setConversation(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: refineResult.explanation || 'Widget refined successfully',
        timestamp: Date.now(),
        widgetId: refineResult.widget?.id,
      }]);

      if (refineResult.success && refineResult.widget) {
        setResult(refineResult);
        setGeneratedWidget(refineResult.widget);
        onWidgetGenerated?.(refineResult.widget);
      }
    } catch (error) {
      setConversation(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsRefining(false);
    }
  }, [sessionId, isRefining, onWidgetGenerated]);

  // Cancel generation
  const handleCancel = useCallback(() => {
    if (sessionId) {
      getWidgetGeneratorV2().cancelSession(sessionId);
    }
    setIsGenerating(false);
  }, [sessionId]);

  // Preview widget
  const handlePreview = useCallback(() => {
    if (generatedWidget) {
      onPreviewWidget?.(generatedWidget);
    }
  }, [generatedWidget, onPreviewWidget]);

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <span style={{ fontSize: '32px' }}>🤖</span>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            AI Widget Generator
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'white',
            }}>
              V2.0
            </span>
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: theme.text.secondary,
          }}>
            Describe your widget and let AI build it for you
          </p>
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <GenerationProgress
          currentStep={currentStep as any}
          progress={progress}
          message={progressMessage}
          startTime={startTime}
          onCancel={handleCancel}
        />
      )}

      {/* Result Success */}
      {result?.success && generatedWidget && !isGenerating && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.15)',
          border: '2px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '20px' }}>🎉</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#4ade80',
                }}>
                  Widget Generated Successfully!
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                color: theme.text.secondary,
              }}>
                {generatedWidget.manifest.name} • Quality: {result.quality?.overall || '--'}/100
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
            }}>
              <button
                onClick={handlePreview}
                style={{
                  padding: '8px 16px',
                  background: theme.bg.tertiary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  color: theme.text.primary,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Preview
              </button>
              <button
                onClick={() => setShowRefiner(!showRefiner)}
                style={{
                  padding: '8px 16px',
                  background: showRefiner ? theme.accent : theme.bg.tertiary,
                  border: `1px solid ${showRefiner ? theme.accent : theme.border}`,
                  borderRadius: '8px',
                  color: showRefiner ? 'white' : theme.text.primary,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {showRefiner ? 'Hide Refiner' : 'Refine'}
              </button>
            </div>
          </div>

          {/* Suggestions */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: theme.text.tertiary,
                marginBottom: '6px',
              }}>
                Suggestions for improvement:
              </div>
              <ul style={{
                margin: 0,
                paddingLeft: '16px',
                fontSize: '12px',
                color: theme.text.secondary,
              }}>
                {result.suggestions.slice(0, 3).map((s, i) => (
                  <li key={i} style={{ marginBottom: '2px' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback for self-improving AI */}
          {metricsId && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.08)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                fontSize: '12px',
                color: theme.text.secondary,
              }}>
                Was this generation helpful?
              </span>
              <FeedbackButton
                generationId={metricsId}
                size="sm"
                showLabels
              />
            </div>
          )}
        </div>
      )}

      {/* Result Error */}
      {result && !result.success && !isGenerating && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#f87171',
            }}>
              Generation Failed
            </span>
          </div>
          <div style={{ fontSize: '13px', color: theme.text.secondary }}>
            {result.errors?.join(', ') || 'Unknown error occurred'}
          </div>
        </div>
      )}

      {/* Iterative Refiner */}
      {showRefiner && generatedWidget && sessionId && (
        <div style={{ marginBottom: '20px' }}>
          <IterativeRefiner
            conversation={conversation}
            qualityScore={result?.quality}
            onRefine={handleRefine}
            isRefining={isRefining}
            disabled={isGenerating}
          />
        </div>
      )}

      {/* Prompt Composer */}
      {!isGenerating && (
        <>
          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleGenerate}
            disabled={isGenerating}
          />

          {/* Style Gallery */}
          <StyleGallery
            selectedStyle={stylePreset}
            selectedComplexity={complexity}
            onStyleChange={setStylePreset}
            onComplexityChange={setComplexity}
          />

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              color: theme.text.secondary,
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: showAdvanced ? '12px' : '20px',
            }}
          >
            <span style={{
              transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}>
              ▶
            </span>
            Advanced Options
          </button>

          {/* Feature Toggles */}
          {showAdvanced && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '20px',
            }}>
              {FEATURE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleFeature(opt.key)}
                  style={{
                    padding: '10px 12px',
                    background: features[opt.key] ? theme.accentMuted : theme.bg.secondary,
                    border: `1px solid ${features[opt.key] ? theme.accent : theme.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{opt.icon}</span>
                  <span style={{
                    fontSize: '12px',
                    color: features[opt.key] ? theme.text.primary : theme.text.secondary,
                  }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            style={{
              width: '100%',
              padding: '16px',
              background: !prompt.trim() || isGenerating
                ? theme.bg.tertiary
                : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              border: 'none',
              borderRadius: '12px',
              color: !prompt.trim() || isGenerating
                ? theme.text.tertiary
                : 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: !prompt.trim() || isGenerating
                ? 'not-allowed'
                : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Widget'}
          </button>
        </>
      )}
    </div>
  );
};
