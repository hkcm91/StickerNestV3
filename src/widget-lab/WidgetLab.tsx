/**
 * StickerNest v2 - Widget Lab
 * Integrated page for widget upload, AI generation, and preview
 *
 * REFACTORED (Dec 2024):
 * - Handlers extracted to ./hooks/useWidgetLabHandlers.ts
 * - Types extracted to ./WidgetLab.types.ts
 * - Tab components extracted to ./components/
 */

import React, { useState, useCallback, useEffect } from 'react';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { WidgetUploader } from './WidgetUploader';
import { WidgetPreview } from './WidgetPreview';
import { WidgetManifest } from '../types/manifest';
import { getWidgetPipelineAI } from '../ai';
import { getDraftManager, type DraftWidget } from '../ai/DraftManager';
import { listAllPipelines, getPipeline, savePipeline, createWidgetNode, createConnection } from '../services/pipelinesClient';
import { listUserWidgets, listOfficialWidgets } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { detectCompatiblePorts, extractPorts } from '../runtime/PortCompatibility';
import type { Pipeline } from '../types/domain';
import { theme } from './theme';
import { GenerateTab, DraftsTab } from './components';
import type { IOPort, LibraryWidgetInfo, AISuggestedConnection, LibraryStats } from './WidgetLab.types';
import { useWidgetLabHandlers } from './hooks/useWidgetLabHandlers';

export interface WidgetLabProps {
  runtime: RuntimeContext;
  onSwitchToCanvas?: () => void;
}

type LabTab = 'upload' | 'generate' | 'drafts';

export const WidgetLab: React.FC<WidgetLabProps> = ({ runtime, onSwitchToCanvas }) => {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<LabTab>('generate');

  // Upload state
  const [labManifest, setLabManifest] = useState<WidgetManifest | null>(null);
  const [labFiles, setLabFiles] = useState<File[]>([]);

  // Generate state
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-70b');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // I/O Port state
  const [inputPorts, setInputPorts] = useState<IOPort[]>([]);
  const [outputPorts, setOutputPorts] = useState<IOPort[]>([]);

  // Pipeline state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');

  // Library state
  const [libraryWidgets, setLibraryWidgets] = useState<LibraryWidgetInfo[]>([]);
  const [selectedLibraryWidgets, setSelectedLibraryWidgets] = useState<string[]>([]);
  const [isSuggestingIO, setIsSuggestingIO] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  // AI Pipeline Creation state
  const [pipelinePrompt, setPipelinePrompt] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiSuggestedConnections, setAiSuggestedConnections] = useState<AISuggestedConnection[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Pipeline', 'Communication']));

  // Drafts state
  const [drafts, setDrafts] = useState<DraftWidget[]>(() => getDraftManager().getAllDrafts());
  const [previewDraft, setPreviewDraft] = useState<DraftWidget | null>(null);
  const [showCodeView, setShowCodeView] = useState(false);

  // UI state
  const [introCollapsed, setIntroCollapsed] = useState(() => {
    try {
      return localStorage.getItem('widget-lab-intro-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleIntro = useCallback(() => {
    setIntroCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('widget-lab-intro-collapsed', String(next));
      } catch { /* Ignore */ }
      return next;
    });
  }, []);

  // Library ref and stats
  const libraryRef = React.useRef<any>(null);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryStats, setLibraryStats] = useState<LibraryStats>({
    total: 0,
    averageQuality: 0,
    byCategory: {},
    bySource: {}
  });
  const [redundancyWarning, setRedundancyWarning] = useState<string | null>(null);

  // Load library dynamically
  useEffect(() => {
    import('../runtime/WidgetLibrary').then(mod => {
      libraryRef.current = mod.getWidgetLibrary();
      setLibraryLoaded(true);
    }).catch(err => {
      console.error('[WidgetLab] Failed to load library:', err);
    });
  }, []);

  const getLibrary = useCallback(() => libraryRef.current, []);

  // Initialize library stats
  useEffect(() => {
    if (libraryLoaded && libraryRef.current) {
      setLibraryStats(libraryRef.current.getStats());
    }
  }, [libraryLoaded]);

  const refreshLibraryStats = useCallback(() => {
    if (libraryRef.current) {
      setLibraryStats(libraryRef.current.getStats());
    }
  }, []);

  // Load pipelines and library widgets
  useEffect(() => {
    const loadData = async () => {
      try {
        const pipelineList = await listAllPipelines();
        setPipelines(pipelineList);

        const [userWidgetIds, officialWidgetIds] = await Promise.all([
          user?.id ? listUserWidgets(user.id) : Promise.resolve([]),
          listOfficialWidgets(),
        ]);

        // Load test-widgets manifests
        const testWidgetIds = [
          'color-sender', 'color-receiver', 'ping-sender', 'ping-receiver',
          'pipeline-button', 'pipeline-timer', 'pipeline-progressbar', 'pipeline-text',
          'vector-canvas', 'vector-color-picker', 'vector-layers', 'vector-style-panel',
          'vector-transform', 'vector-export', 'shape-spawner',
          'button-deck', 'echo-widget', 'notes-widget', 'kanban-board',
          'farm-crop-plot', 'farm-seed-bag', 'farm-sprinkler', 'farm-stats', 'farm-weather',
        ];

        const widgetInfos: LibraryWidgetInfo[] = [];
        for (const widgetId of testWidgetIds) {
          try {
            const response = await fetch(`/test-widgets/${widgetId}/manifest.json`);
            if (response.ok) {
              const manifest = await response.json();
              widgetInfos.push({
                id: manifest.id || widgetId,
                name: manifest.name || widgetId,
                description: manifest.description,
                inputs: manifest.inputs,
                outputs: manifest.outputs,
              });
            }
          } catch { /* Skip */ }
        }

        [...userWidgetIds, ...officialWidgetIds].forEach(id => {
          if (!widgetInfos.find(w => w.id === id)) {
            widgetInfos.push({ id, name: id });
          }
        });

        setLibraryWidgets(widgetInfos);
      } catch (err) {
        console.error('Failed to load pipelines/library:', err);
      }
    };
    loadData();
  }, [user?.id]);

  const refreshDrafts = useCallback(() => {
    setDrafts(getDraftManager().getAllDrafts());
  }, []);

  // Use extracted handlers
  const {
    handleAiAnalyzePipeline,
    handleCreatePipeline,
    handleSuggestIO,
    handleSaveToLibrary,
    handleAddTestWidget,
    handleQuickCreate,
    handleGenerate,
    handleDeleteDraft,
  } = useWidgetLabHandlers({
    setError,
    setIsAiAnalyzing,
    setAiSuggestedConnections,
    setSelectedLibraryWidgets,
    setNewPipelineName,
    setIsCreatingPipeline,
    setPipelines,
    setPipelinePrompt,
    setIsSuggestingIO,
    setInputPorts,
    setOutputPorts,
    setIsSavingToLibrary,
    setLibraryWidgets,
    setIsGenerating,
    setGenerationStep,
    setRedundancyWarning,
    setDescription,
    setActiveTab,
    setPreviewDraft,
    pipelinePrompt,
    selectedModel,
    libraryWidgets,
    selectedLibraryWidgets,
    newPipelineName,
    aiSuggestedConnections,
    description,
    selectedPipeline,
    pipelines,
    inputPorts,
    outputPorts,
    selectedTemplate: '',
    complexity: 'standard',
    stylePreset: 'polished',
    features: {},
    previewDraft,
    userId: user?.id,
    getLibrary,
    refreshDrafts,
    refreshLibraryStats,
  });

  // Add draft to canvas with auto-connect
  const handleAddToCanvas = useCallback(async (draft: DraftWidget, autoConnect: boolean = true) => {
    const newInstanceId = crypto.randomUUID();

    runtime.eventBus.emit({
      type: 'widget:add-request',
      scope: 'canvas',
      payload: {
        widgetDefId: draft.manifest.id,
        version: draft.manifest.version,
        source: 'generated',
        instanceId: newInstanceId,
        generatedContent: {
          html: draft.html,
          manifest: draft.manifest,
        },
      },
    });

    if (autoConnect) {
      try {
        const canvasWidgets = runtime.widgetInstances || [];
        if (canvasWidgets.length === 0) return;

        const draftPorts = extractPorts(draft.manifest);
        const connectionsFound: Array<{
          existingWidgetId: string;
          existingWidgetName: string;
          fromPort: string;
          toPort: string;
          direction: 'new-to-existing' | 'existing-to-new';
        }> = [];

        for (const existingWidget of canvasWidgets) {
          const existingManifest = (existingWidget as any).metadata?.generatedContent?.manifest;
          if (!existingManifest) continue;

          const compatibilities = detectCompatiblePorts(draft.manifest, existingManifest);
          for (const compat of compatibilities) {
            if (compat.score >= 0.4) {
              const outputIsFromDraft = new Set(draftPorts.outputs.map(p => p.name)).has(compat.output.name);
              connectionsFound.push({
                existingWidgetId: existingWidget.id,
                existingWidgetName: existingManifest.name || existingWidget.widgetDefId,
                fromPort: compat.output.name,
                toPort: compat.input.name,
                direction: outputIsFromDraft ? 'new-to-existing' : 'existing-to-new',
              });
              break;
            }
          }
        }

        if (connectionsFound.length > 0 && selectedPipeline) {
          const pipeline = await getPipeline(selectedPipeline);
          if (pipeline) {
            const newNode = createWidgetNode(newInstanceId, { x: 100, y: 100 }, draft.manifest.name);
            pipeline.nodes.push(newNode);

            for (const conn of connectionsFound) {
              let existingNode = pipeline.nodes.find(n => n.widgetInstanceId === conn.existingWidgetId);
              if (!existingNode) {
                existingNode = createWidgetNode(conn.existingWidgetId, { x: 200, y: 100 }, conn.existingWidgetName);
                pipeline.nodes.push(existingNode);
              }

              if (conn.direction === 'new-to-existing') {
                pipeline.connections.push(createConnection(newNode.id, conn.fromPort, existingNode.id, conn.toPort));
              } else {
                pipeline.connections.push(createConnection(existingNode.id, conn.fromPort, newNode.id, conn.toPort));
              }
            }

            await savePipeline(pipeline);
          }
        }
      } catch (err) {
        console.error('[WidgetLab] Auto-connect failed:', err);
      }
    }

    if (onSwitchToCanvas) {
      onSwitchToCanvas();
    }
  }, [runtime, selectedPipeline, onSwitchToCanvas]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: theme.bg.primary }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg.secondary,
      }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: theme.text.primary }}>
          Widget Lab
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.text.tertiary }}>
          Create, upload, and preview widgets
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        padding: '12px 24px',
        background: theme.bg.secondary,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {[
          { id: 'generate' as const, label: 'Generate' },
          { id: 'upload' as const, label: 'Upload' },
          { id: 'drafts' as const, label: `Drafts (${drafts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab.id ? theme.accent : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === tab.id ? 'white' : theme.text.tertiary,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <GenerateTab
            runtime={runtime}
            introCollapsed={introCollapsed}
            onToggleIntro={handleToggleIntro}
            refreshDrafts={refreshDrafts}
            setPreviewDraft={setPreviewDraft}
            description={description}
            setDescription={setDescription}
            onAddTestWidget={handleAddTestWidget}
            libraryStats={libraryStats}
            refreshLibraryStats={refreshLibraryStats}
            getLibrary={getLibrary}
            libraryWidgets={libraryWidgets}
            selectedLibraryWidgets={selectedLibraryWidgets}
            setSelectedLibraryWidgets={setSelectedLibraryWidgets}
            pipelinePrompt={pipelinePrompt}
            setPipelinePrompt={setPipelinePrompt}
            newPipelineName={newPipelineName}
            setNewPipelineName={setNewPipelineName}
            aiSuggestedConnections={aiSuggestedConnections}
            setAiSuggestedConnections={setAiSuggestedConnections}
            expandedCategories={expandedCategories}
            setExpandedCategories={setExpandedCategories}
            isAiAnalyzing={isAiAnalyzing}
            isCreatingPipeline={isCreatingPipeline}
            selectedModel={selectedModel}
            onAiAnalyzePipeline={handleAiAnalyzePipeline}
            onCreatePipeline={handleCreatePipeline}
            getWidgetPipelineAI={getWidgetPipelineAI}
            getDraftManager={getDraftManager}
          />
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {!labManifest ? (
              <div style={{
                background: theme.bg.secondary,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                padding: '24px',
              }}>
                <p style={{ color: theme.text.secondary, marginBottom: '20px', fontSize: '14px' }}>
                  Upload a widget bundle (manifest.json + assets) to preview and test it.
                </p>
                <WidgetUploader
                  onUpload={(manifest, files) => {
                    setLabManifest(manifest);
                    setLabFiles(files);
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <button
                    onClick={() => { setLabManifest(null); setLabFiles([]); }}
                    style={{
                      padding: '10px 16px',
                      background: theme.bg.secondary,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: theme.text.primary,
                      fontSize: '13px',
                    }}
                  >
                    ← Back
                  </button>
                  <div style={{ fontWeight: 500, color: theme.text.primary, fontSize: '14px' }}>
                    {labManifest.name}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  minHeight: '400px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: theme.bg.secondary,
                }}>
                  <WidgetPreview manifest={labManifest} files={labFiles} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <DraftsTab
            drafts={drafts}
            previewDraft={previewDraft}
            setPreviewDraft={setPreviewDraft}
            showCodeView={showCodeView}
            setShowCodeView={setShowCodeView}
            isSavingToLibrary={isSavingToLibrary}
            onSaveToLibrary={handleSaveToLibrary}
            onDeleteDraft={handleDeleteDraft}
          />
        )}
      </div>
    </div>
  );
};

export default WidgetLab;
