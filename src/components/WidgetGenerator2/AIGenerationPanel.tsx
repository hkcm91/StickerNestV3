/**
 * Widget Generator 2.0 - AI Generation Panel
 *
 * Unified panel for AI-assisted widget generation with:
 * - Natural language description
 * - Image reference uploads
 * - Style gallery integration
 * - Skeleton-first workflow
 * - Multi-turn refinement with clarifying questions
 */

import { useState, useCallback, useMemo } from 'react';
import type { SpecJSON } from '../../types/specjson';
import type {
  ImageReference,
  StyleSnippet,
  StyleGallery,
  WidgetSkeleton,
  ClarifyingQuestion,
  RefinementSession,
  GenerationPhase,
  CapabilityRecommendation
} from '../../services/enhancedAIGenerator';
import {
  generateEnhanced,
  generateSkeleton,
  skeletonToSpec,
  createStyleGallery,
  analyzeCapabilityNeeds
} from '../../services/enhancedAIGenerator';
import { ImageReferencePanel } from './ImageReferencePanel';
import { StyleGalleryPanel } from './StyleGalleryPanel';

// ============================================================================
// TYPES
// ============================================================================

interface AIGenerationPanelProps {
  onSpecGenerated: (spec: SpecJSON) => void;
  initialDescription?: string;
}

type WorkflowStep = 'input' | 'skeleton' | 'questions' | 'refinement' | 'complete';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIGenerationPanel({
  onSpecGenerated,
  initialDescription = ''
}: AIGenerationPanelProps) {
  // State
  const [description, setDescription] = useState(initialDescription);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Workflow state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('input');
  const [session, setSession] = useState<RefinementSession | null>(null);
  const [skeleton, setSkeleton] = useState<WidgetSkeleton | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean>>({});

  // Reference state
  const [imageReferences, setImageReferences] = useState<ImageReference[]>([]);
  const [styleGallery, setStyleGallery] = useState<StyleGallery>(() => createStyleGallery('My Styles'));
  const [selectedStyles, setSelectedStyles] = useState<StyleSnippet[]>([]);

  // UI state
  const [expandedPanel, setExpandedPanel] = useState<'images' | 'styles' | null>(null);
  const [useSkeletonWorkflow, setUseSkeletonWorkflow] = useState(true);

  // Capability recommendations
  const capabilityRecommendations = useMemo(() => {
    if (!description.trim()) return { inputs: [], outputs: [] };
    return analyzeCapabilityNeeds(description);
  }, [description]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Start generation
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateEnhanced({
        description: description.trim(),
        imageReferences,
        styleReferences: selectedStyles,
        useSkeletonWorkflow
      });

      if (!result.success) {
        setError(result.error || 'Generation failed');
        return;
      }

      setSession(result.session);

      if (result.phase === 'skeleton' || result.phase === 'review') {
        setSkeleton(result.skeleton || null);
        if (result.pendingQuestions && result.pendingQuestions.length > 0) {
          setPendingQuestions(result.pendingQuestions);
          setWorkflowStep('questions');
        } else {
          setWorkflowStep('skeleton');
        }
      } else if (result.finalSpec) {
        onSpecGenerated(result.finalSpec);
        setWorkflowStep('complete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  }, [description, imageReferences, selectedStyles, useSkeletonWorkflow, onSpecGenerated]);

  // Answer clarifying question
  const handleAnswer = useCallback((questionId: string, answer: string | string[] | boolean) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  // Submit answers and continue
  const handleSubmitAnswers = useCallback(async () => {
    if (!session) return;

    setIsGenerating(true);

    try {
      // Submit each answer
      for (const [questionId, answer] of Object.entries(answers)) {
        await generateEnhanced({
          description,
          sessionId: session.id,
          clarificationAnswer: { questionId, answer }
        });
      }

      // Continue to refinement
      const result = await generateEnhanced({
        description,
        sessionId: session.id
      });

      if (result.finalSpec) {
        onSpecGenerated(result.finalSpec);
        setWorkflowStep('complete');
      } else if (result.currentSpec) {
        onSpecGenerated(result.currentSpec);
        setWorkflowStep('refinement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  }, [session, answers, description, onSpecGenerated]);

  // Approve skeleton and generate full spec
  const handleApproveSkeleton = useCallback(async () => {
    if (!skeleton) return;

    setIsGenerating(true);

    try {
      const spec = skeletonToSpec(skeleton, answers, selectedStyles);
      onSpecGenerated(spec);
      setWorkflowStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  }, [skeleton, answers, selectedStyles, onSpecGenerated]);

  // Reset workflow
  const handleReset = useCallback(() => {
    setWorkflowStep('input');
    setSession(null);
    setSkeleton(null);
    setPendingQuestions([]);
    setAnswers({});
    setError(null);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="ai-generation-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <span className="header-icon">🤖</span>
          <h3>AI Widget Generation</h3>
        </div>
        <div className="header-right">
          <WorkflowProgress step={workflowStep} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Step: Input */}
      {workflowStep === 'input' && (
        <div className="step-content">
          {/* Description Input */}
          <div className="description-section">
            <label>Describe Your Widget</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: A pomodoro timer with 25-minute work sessions and 5-minute breaks. It should have start/pause/reset buttons and show the remaining time prominently. Use a minimal dark theme with accent colors."
              rows={4}
            />
            <div className="description-hints">
              <span className="hint">💡 Be specific about functionality, visual style, and interactions</span>
            </div>
          </div>

          {/* Capability Preview */}
          {description.trim() && (
            <CapabilityPreview recommendations={capabilityRecommendations} />
          )}

          {/* Reference Panels */}
          <div className="reference-panels">
            {/* Image References */}
            <div className={`collapsible-panel ${expandedPanel === 'images' ? 'expanded' : ''}`}>
              <button
                className="panel-toggle"
                onClick={() => setExpandedPanel(expandedPanel === 'images' ? null : 'images')}
              >
                <span>🖼️ Image References ({imageReferences.length})</span>
                <span className="toggle-icon">{expandedPanel === 'images' ? '▼' : '▶'}</span>
              </button>
              {expandedPanel === 'images' && (
                <ImageReferencePanel
                  images={imageReferences}
                  onImagesChange={setImageReferences}
                  maxImages={5}
                />
              )}
            </div>

            {/* Style Gallery */}
            <div className={`collapsible-panel ${expandedPanel === 'styles' ? 'expanded' : ''}`}>
              <button
                className="panel-toggle"
                onClick={() => setExpandedPanel(expandedPanel === 'styles' ? null : 'styles')}
              >
                <span>🎨 Style Gallery ({selectedStyles.length} selected)</span>
                <span className="toggle-icon">{expandedPanel === 'styles' ? '▼' : '▶'}</span>
              </button>
              {expandedPanel === 'styles' && (
                <StyleGalleryPanel
                  gallery={styleGallery}
                  onGalleryChange={setStyleGallery}
                  selectedSnippets={selectedStyles}
                  onSelectionChange={setSelectedStyles}
                />
              )}
            </div>
          </div>

          {/* Workflow Options */}
          <div className="workflow-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useSkeletonWorkflow}
                onChange={(e) => setUseSkeletonWorkflow(e.target.checked)}
              />
              <span className="checkbox-text">
                <strong>Skeleton-First Workflow</strong>
                <span className="checkbox-hint">Generate a skeleton to review before full code generation</span>
              </span>
            </label>
          </div>

          {/* Generate Button */}
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner">🔄</span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Generate Widget</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step: Skeleton Preview */}
      {workflowStep === 'skeleton' && skeleton && (
        <SkeletonPreview
          skeleton={skeleton}
          onApprove={handleApproveSkeleton}
          onBack={handleReset}
          isGenerating={isGenerating}
        />
      )}

      {/* Step: Clarifying Questions */}
      {workflowStep === 'questions' && (
        <ClarifyingQuestionsPanel
          questions={pendingQuestions}
          answers={answers}
          onAnswer={handleAnswer}
          onSubmit={handleSubmitAnswers}
          onSkip={handleApproveSkeleton}
          isGenerating={isGenerating}
        />
      )}

      {/* Step: Complete */}
      {workflowStep === 'complete' && (
        <div className="step-content completion-step">
          <div className="completion-icon">✅</div>
          <h4>Widget Generated!</h4>
          <p>Your SpecJSON has been created. Review it in the editor and make any adjustments.</p>
          <button className="secondary-button" onClick={handleReset}>
            Generate Another Widget
          </button>
        </div>
      )}

      <style>{`
        .ai-generation-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          background: var(--bg-primary, #0f0f0f);
          border-radius: 12px;
          border: 1px solid var(--border-color, #333);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-left h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .header-icon {
          font-size: 24px;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.3);
          border-radius: 8px;
          color: var(--error-color, #e74c3c);
        }

        .error-banner button {
          margin-left: auto;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: 16px;
        }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .description-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .description-section textarea {
          width: 100%;
          padding: 14px;
          background: var(--bg-secondary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
        }

        .description-section textarea:focus {
          outline: none;
          border-color: var(--accent-color, #667eea);
        }

        .description-hints {
          margin-top: 8px;
        }

        .hint {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .reference-panels {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .collapsible-panel {
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          overflow: hidden;
        }

        .panel-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 14px;
        }

        .panel-toggle:hover {
          background: var(--bg-hover, #252525);
        }

        .toggle-icon {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .workflow-options {
          padding: 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
        }

        .checkbox-label input {
          margin-top: 3px;
        }

        .checkbox-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .checkbox-hint {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .generate-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 32px;
          background: linear-gradient(135deg, var(--accent-color, #667eea), #764ba2);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .completion-step {
          text-align: center;
          padding: 40px 20px;
        }

        .completion-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .completion-step h4 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .completion-step p {
          margin: 0 0 24px;
          color: var(--text-secondary, #888);
        }

        .secondary-button {
          padding: 12px 24px;
          background: var(--bg-secondary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 14px;
        }

        .secondary-button:hover {
          background: var(--bg-hover, #252525);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function WorkflowProgress({ step }: { step: WorkflowStep }) {
  const steps: { id: WorkflowStep; label: string }[] = [
    { id: 'input', label: 'Describe' },
    { id: 'skeleton', label: 'Skeleton' },
    { id: 'questions', label: 'Refine' },
    { id: 'complete', label: 'Complete' }
  ];

  const currentIndex = steps.findIndex(s => s.id === step || (step === 'refinement' && s.id === 'questions'));

  return (
    <div className="workflow-progress">
      {steps.map((s, i) => (
        <div
          key={s.id}
          className={`progress-step ${i <= currentIndex ? 'active' : ''} ${s.id === step ? 'current' : ''}`}
        >
          <span className="step-dot" />
          <span className="step-label">{s.label}</span>
        </div>
      ))}
      <style>{`
        .workflow-progress {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted, #666);
          font-size: 12px;
        }

        .progress-step.active {
          color: var(--text-secondary, #888);
        }

        .progress-step.current {
          color: var(--accent-color, #667eea);
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .progress-step.current .step-dot {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }
      `}</style>
    </div>
  );
}

function CapabilityPreview({
  recommendations
}: {
  recommendations: { inputs: CapabilityRecommendation[]; outputs: CapabilityRecommendation[] };
}) {
  const hasRecommendations = recommendations.inputs.length > 0 || recommendations.outputs.length > 0;

  if (!hasRecommendations) return null;

  return (
    <div className="capability-preview">
      <h4>
        <span>🔌</span> Detected Capabilities
      </h4>
      <div className="capability-grid">
        {recommendations.inputs.length > 0 && (
          <div className="capability-column">
            <span className="column-label">Inputs</span>
            {recommendations.inputs.slice(0, 4).map((rec, i) => (
              <div key={i} className={`capability-chip ${rec.priority}`}>
                {rec.capability.name}
              </div>
            ))}
          </div>
        )}
        {recommendations.outputs.length > 0 && (
          <div className="capability-column">
            <span className="column-label">Outputs</span>
            {recommendations.outputs.slice(0, 4).map((rec, i) => (
              <div key={i} className={`capability-chip ${rec.priority}`}>
                {rec.capability.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .capability-preview {
          padding: 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .capability-preview h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          font-size: 13px;
          font-weight: 500;
        }

        .capability-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .capability-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .column-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted, #666);
          letter-spacing: 0.05em;
        }

        .capability-chip {
          padding: 6px 10px;
          background: var(--bg-tertiary, #252525);
          border-radius: 6px;
          font-size: 12px;
          border-left: 3px solid transparent;
        }

        .capability-chip.high {
          border-left-color: var(--accent-color, #667eea);
        }

        .capability-chip.medium {
          border-left-color: var(--warning-color, #f39c12);
        }

        .capability-chip.low {
          border-left-color: var(--text-muted, #666);
        }
      `}</style>
    </div>
  );
}

function SkeletonPreview({
  skeleton,
  onApprove,
  onBack,
  isGenerating
}: {
  skeleton: WidgetSkeleton;
  onApprove: () => void;
  onBack: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="skeleton-preview">
      <div className="skeleton-header">
        <h4>{skeleton.displayName}</h4>
        <span className={`confidence-badge ${skeleton.confidence > 0.7 ? 'high' : skeleton.confidence > 0.4 ? 'medium' : 'low'}`}>
          {Math.round(skeleton.confidence * 100)}% confidence
        </span>
      </div>

      <p className="skeleton-description">{skeleton.description}</p>

      <div className="skeleton-section">
        <h5>Layout</h5>
        <span className="layout-badge">{skeleton.structure.layout}</span>
      </div>

      <div className="skeleton-section">
        <h5>Elements ({skeleton.structure.mainElements.length})</h5>
        <div className="element-list">
          {skeleton.structure.mainElements.map((el, i) => (
            <div key={i} className="element-item">
              <span className="element-type">{el.type}</span>
              <span className="element-name">{el.name}</span>
              <span className="element-position">{el.position}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-section">
        <h5>Interactions ({skeleton.structure.interactions.length})</h5>
        <div className="interaction-list">
          {skeleton.structure.interactions.map((int, i) => (
            <div key={i} className="interaction-item">
              <span className="trigger">{int.trigger}</span>
              <span className="arrow">→</span>
              <span className="action">{int.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-section">
        <h5>Suggested State</h5>
        <div className="state-list">
          {skeleton.suggestedState.map((s, i) => (
            <div key={i} className="state-item">
              <code>{s.name}</code>
              <span className="state-type">{s.type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-reasoning">
        <h5>AI Reasoning</h5>
        <p>{skeleton.reasoning}</p>
      </div>

      <div className="skeleton-actions">
        <button className="back-button" onClick={onBack} disabled={isGenerating}>
          ← Back
        </button>
        <button className="approve-button" onClick={onApprove} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <span className="spinner">🔄</span>
              Generating...
            </>
          ) : (
            <>
              Approve & Generate Code →
            </>
          )}
        </button>
      </div>

      <style>{`
        .skeleton-preview {
          padding: 20px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 12px;
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .skeleton-header h4 {
          margin: 0;
          font-size: 18px;
        }

        .confidence-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .confidence-badge.high { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .confidence-badge.medium { background: rgba(243, 156, 18, 0.2); color: #f39c12; }
        .confidence-badge.low { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }

        .skeleton-description {
          color: var(--text-secondary, #888);
          font-size: 14px;
          margin: 0 0 20px;
        }

        .skeleton-section {
          margin-bottom: 20px;
        }

        .skeleton-section h5 {
          margin: 0 0 10px;
          font-size: 13px;
          color: var(--text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .layout-badge {
          padding: 6px 12px;
          background: var(--accent-color, #667eea);
          border-radius: 6px;
          font-size: 13px;
          color: white;
          text-transform: capitalize;
        }

        .element-list, .interaction-list, .state-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .element-item, .interaction-item, .state-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--bg-tertiary, #252525);
          border-radius: 6px;
          font-size: 13px;
        }

        .element-type, .state-type {
          padding: 2px 8px;
          background: var(--bg-quaternary, #1a1a1a);
          border-radius: 4px;
          font-size: 11px;
          text-transform: uppercase;
        }

        .element-name {
          flex: 1;
        }

        .element-position {
          color: var(--text-muted, #666);
          font-size: 12px;
        }

        .trigger {
          color: var(--text-secondary, #888);
        }

        .arrow {
          color: var(--accent-color, #667eea);
        }

        .action {
          color: var(--text-primary, #fff);
        }

        .skeleton-reasoning {
          padding: 16px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .skeleton-reasoning h5 {
          margin: 0 0 8px;
          font-size: 12px;
          color: var(--accent-color, #667eea);
        }

        .skeleton-reasoning p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary, #888);
          line-height: 1.5;
        }

        .skeleton-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .back-button {
          padding: 12px 24px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          cursor: pointer;
        }

        .approve-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: 500;
        }

        .approve-button:disabled, .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function ClarifyingQuestionsPanel({
  questions,
  answers,
  onAnswer,
  onSubmit,
  onSkip,
  isGenerating
}: {
  questions: ClarifyingQuestion[];
  answers: Record<string, string | string[] | boolean>;
  onAnswer: (questionId: string, answer: string | string[] | boolean) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isGenerating: boolean;
}) {
  const answeredCount = Object.keys(answers).length;
  const requiredQuestions = questions.filter(q => q.priority === 'required');
  const requiredAnswered = requiredQuestions.every(q => answers[q.id] !== undefined);

  return (
    <div className="questions-panel">
      <div className="questions-header">
        <h4>Clarifying Questions</h4>
        <span className="progress">{answeredCount}/{questions.length} answered</span>
      </div>

      <p className="questions-intro">
        Help the AI generate a better widget by answering these questions.
      </p>

      <div className="questions-list">
        {questions.map(q => (
          <div key={q.id} className={`question-card ${q.priority}`}>
            <div className="question-header">
              <span className="question-text">{q.question}</span>
              {q.priority === 'required' && <span className="required-badge">Required</span>}
            </div>

            <p className="question-context">{q.context}</p>

            <div className="question-input">
              {q.type === 'choice' && q.options && (
                <div className="choice-options">
                  {q.options.map(option => (
                    <button
                      key={option}
                      className={`choice-option ${answers[q.id] === option ? 'selected' : ''}`}
                      onClick={() => onAnswer(q.id, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'text' && (
                <input
                  type="text"
                  placeholder="Your answer..."
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                />
              )}

              {q.type === 'boolean' && (
                <div className="boolean-options">
                  <button
                    className={`bool-option ${answers[q.id] === true ? 'selected' : ''}`}
                    onClick={() => onAnswer(q.id, true)}
                  >
                    Yes
                  </button>
                  <button
                    className={`bool-option ${answers[q.id] === false ? 'selected' : ''}`}
                    onClick={() => onAnswer(q.id, false)}
                  >
                    No
                  </button>
                </div>
              )}
            </div>

            <p className="question-impact">
              <strong>Impact:</strong> {q.impact}
            </p>
          </div>
        ))}
      </div>

      <div className="questions-actions">
        <button className="skip-button" onClick={onSkip} disabled={isGenerating}>
          Skip Questions
        </button>
        <button
          className="submit-button"
          onClick={onSubmit}
          disabled={!requiredAnswered || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner">🔄</span>
              Generating...
            </>
          ) : (
            'Continue with Answers →'
          )}
        </button>
      </div>

      <style>{`
        .questions-panel {
          padding: 20px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 12px;
        }

        .questions-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .questions-header h4 {
          margin: 0;
          font-size: 18px;
        }

        .progress {
          font-size: 13px;
          color: var(--text-muted, #666);
        }

        .questions-intro {
          color: var(--text-secondary, #888);
          font-size: 14px;
          margin: 0 0 20px;
        }

        .questions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .question-card {
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          border-left: 3px solid var(--border-color, #333);
        }

        .question-card.required {
          border-left-color: var(--accent-color, #667eea);
        }

        .question-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .question-text {
          font-weight: 500;
          font-size: 14px;
        }

        .required-badge {
          padding: 2px 8px;
          background: var(--accent-color, #667eea);
          border-radius: 4px;
          font-size: 10px;
          color: white;
          text-transform: uppercase;
        }

        .question-context {
          color: var(--text-muted, #666);
          font-size: 12px;
          margin: 0 0 12px;
        }

        .question-input {
          margin-bottom: 12px;
        }

        .choice-options, .boolean-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .choice-option, .bool-option {
          padding: 8px 16px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .choice-option:hover, .bool-option:hover {
          border-color: var(--accent-color, #667eea);
        }

        .choice-option.selected, .bool-option.selected {
          background: var(--accent-color, #667eea);
          border-color: var(--accent-color, #667eea);
          color: white;
        }

        .question-input input {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .question-input input:focus {
          outline: none;
          border-color: var(--accent-color, #667eea);
        }

        .question-impact {
          color: var(--text-muted, #666);
          font-size: 12px;
          margin: 0;
        }

        .question-impact strong {
          color: var(--text-secondary, #888);
        }

        .questions-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .skip-button {
          padding: 12px 24px;
          background: transparent;
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-secondary, #888);
          cursor: pointer;
        }

        .submit-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-weight: 500;
        }

        .submit-button:disabled, .skip-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default AIGenerationPanel;
