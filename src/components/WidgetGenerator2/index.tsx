/**
 * Widget Generator 2.0 - Main Component
 *
 * A SpecJSON-driven mini IDE with 5 tabs:
 * 1. Overview (SpecJSON editor + AI Generation)
 * 2. Visual Assets
 * 3. Code Output
 * 4. Behavior Simulator
 * 5. Publishing Panel
 *
 * Features:
 * - AI-powered SpecJSON generation with skeleton-first workflow
 * - Image reference uploads for visual guidance
 * - Style gallery for CSS/Tailwind inspiration
 * - Multi-turn refinement with clarifying questions
 */

import { useState, useCallback, useMemo } from 'react';
import { SpecEditor } from './tabs/SpecEditor';
import { VisualAssets } from './tabs/VisualAssets';
import { CodeOutput } from './tabs/CodeOutput';
import { BehaviorSimulator } from './tabs/BehaviorSimulator';
import { PublishingPanel } from './tabs/PublishingPanel';
import { WorkspaceHeader } from './WorkspaceHeader';
import { AIGenerationPanel } from './AIGenerationPanel';
import { useWorkspace } from './hooks/useWorkspace';
import type { SpecJSON, WorkspaceManifest, GeneratedWidgetPackage } from '../../types/specjson';
import { createDefaultSpecJSON } from '../../types/specjson';
import { generateWidgetPackage } from '../../services/widgetTemplateEngine';
import { validateSpecJSON } from '../../utils/specJsonValidator';

// ============================================================================
// TYPES
// ============================================================================

export type GeneratorTab = 'overview' | 'assets' | 'code' | 'simulator' | 'publish';

export interface WidgetGenerator2Props {
  initialSpec?: SpecJSON;
  onSave?: (spec: SpecJSON) => void;
  onPublish?: (pkg: GeneratedWidgetPackage) => void;
  mode?: 'single' | 'batch';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WidgetGenerator2({
  initialSpec,
  onSave,
  onPublish,
  mode = 'single'
}: WidgetGenerator2Props) {
  // Active tab state
  const [activeTab, setActiveTab] = useState<GeneratorTab>('overview');

  // Overview sub-mode: 'ai' for AI generation, 'manual' for SpecEditor
  const [overviewMode, setOverviewMode] = useState<'ai' | 'manual'>('ai');

  // Current spec being edited
  const [spec, setSpec] = useState<SpecJSON>(
    initialSpec || createDefaultSpecJSON()
  );

  // Generated package (cached)
  const [generatedPackage, setGeneratedPackage] = useState<GeneratedWidgetPackage | null>(null);

  // Validation state
  const validation = useMemo(() => validateSpecJSON(spec), [spec]);

  // Expert mode (allows code editing)
  const [expertMode, setExpertMode] = useState(false);

  // Workspace for batch mode
  const workspace = useWorkspace();

  // Handle spec changes
  const handleSpecChange = useCallback((newSpec: SpecJSON) => {
    setSpec(newSpec);
    setGeneratedPackage(null); // Invalidate cache
  }, []);

  // Handle AI-generated spec
  const handleAISpecGenerated = useCallback((newSpec: SpecJSON) => {
    setSpec(newSpec);
    setGeneratedPackage(null);
    setOverviewMode('manual'); // Switch to manual mode to review/edit
  }, []);

  // Generate code from spec
  const handleGenerate = useCallback(() => {
    if (!validation.valid) {
      return;
    }

    try {
      const pkg = generateWidgetPackage(spec, {
        includeTests: true,
        includeComments: true
      });
      setGeneratedPackage(pkg);
      setActiveTab('code');
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [spec, validation]);

  // Save spec
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(spec);
    }
  }, [spec, onSave]);

  // Publish widget
  const handlePublish = useCallback(() => {
    if (generatedPackage && onPublish) {
      onPublish(generatedPackage);
    }
  }, [generatedPackage, onPublish]);

  // Tab definitions
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📋' },
    { id: 'assets' as const, label: 'Visual Assets', icon: '🎨' },
    { id: 'code' as const, label: 'Code Output', icon: '💻' },
    { id: 'simulator' as const, label: 'Simulator', icon: '▶️' },
    { id: 'publish' as const, label: 'Publish', icon: '🚀' }
  ];

  return (
    <div className="widget-generator-2">
      {/* Header */}
      <WorkspaceHeader
        spec={spec}
        validation={validation}
        onGenerate={handleGenerate}
        onSave={handleSave}
        expertMode={expertMode}
        onExpertModeChange={setExpertMode}
        mode={mode}
      />

      {/* Tab Navigation */}
      <div className="generator-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`generator-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.id === 'publish' && !validation.valid}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'overview' && !validation.valid && (
              <span className="tab-badge error">{validation.errors.length}</span>
            )}
            {tab.id === 'overview' && validation.warnings.length > 0 && validation.valid && (
              <span className="tab-badge warning">{validation.warnings.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="generator-content">
        {activeTab === 'overview' && (
          <div className="overview-container">
            {/* Mode Toggle */}
            <div className="overview-mode-toggle">
              <button
                className={`mode-btn ${overviewMode === 'ai' ? 'active' : ''}`}
                onClick={() => setOverviewMode('ai')}
              >
                <span className="mode-icon">🤖</span>
                <span>AI Generate</span>
              </button>
              <button
                className={`mode-btn ${overviewMode === 'manual' ? 'active' : ''}`}
                onClick={() => setOverviewMode('manual')}
              >
                <span className="mode-icon">📝</span>
                <span>Manual Edit</span>
              </button>
            </div>

            {/* AI Generation Panel */}
            {overviewMode === 'ai' && (
              <AIGenerationPanel
                onSpecGenerated={handleAISpecGenerated}
              />
            )}

            {/* Manual Spec Editor */}
            {overviewMode === 'manual' && (
              <SpecEditor
                spec={spec}
                onChange={handleSpecChange}
                validation={validation}
              />
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <VisualAssets
            spec={spec}
            onChange={handleSpecChange}
          />
        )}

        {activeTab === 'code' && (
          <CodeOutput
            spec={spec}
            package={generatedPackage}
            expertMode={expertMode}
            onRegenerate={handleGenerate}
          />
        )}

        {activeTab === 'simulator' && (
          <BehaviorSimulator
            spec={spec}
            package={generatedPackage}
          />
        )}

        {activeTab === 'publish' && (
          <PublishingPanel
            spec={spec}
            package={generatedPackage}
            validation={validation}
            onPublish={handlePublish}
          />
        )}
      </div>

      <style>{`
        .widget-generator-2 {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0f0f0f);
          color: var(--text-primary, #ffffff);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .generator-tabs {
          display: flex;
          gap: 2px;
          padding: 0 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .generator-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #888);
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .generator-tab:hover:not(:disabled) {
          color: var(--text-primary, #fff);
          background: var(--bg-hover, #252525);
        }

        .generator-tab.active {
          color: var(--accent-color, #667eea);
          border-bottom-color: var(--accent-color, #667eea);
        }

        .generator-tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tab-icon {
          font-size: 16px;
        }

        .tab-label {
          font-size: 14px;
          font-weight: 500;
        }

        .tab-badge {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .tab-badge.error {
          background: var(--error-color, #e74c3c);
          color: white;
        }

        .tab-badge.warning {
          background: var(--warning-color, #f39c12);
          color: white;
        }

        .generator-content {
          flex: 1;
          overflow: hidden;
          padding: 16px;
        }

        .overview-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }

        .overview-mode-toggle {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 10px;
          width: fit-content;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .mode-btn:hover:not(.active) {
          background: var(--bg-hover, #252525);
          color: var(--text-primary, #fff);
        }

        .mode-btn.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .mode-icon {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

export default WidgetGenerator2;
