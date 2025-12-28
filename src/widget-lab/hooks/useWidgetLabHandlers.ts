/**
 * Widget Lab Handlers Hook
 * Extracts all handler logic from WidgetLab component
 */

import { useCallback } from 'react';
import {
  getWidgetPipelineAI,
  type WidgetGenerationRequest,
  type ComplexityLevel,
  type StylePreset,
  type FeatureRequirements,
} from '../../ai';
import { getDraftManager, type DraftWidget } from '../../ai/DraftManager';
import { listAllPipelines, savePipeline, createWidgetNode, createConnection } from '../../services/pipelinesClient';
import { uploadWidgetBundle } from '../../services/supabaseClient';
import { generateTestWidget, validateWidget } from '../../runtime/WidgetValidation';
import type { WidgetManifest } from '../../types/manifest';
import type { Pipeline } from '../../types/domain';
import type { IOPort, LibraryWidgetInfo, AISuggestedConnection } from '../WidgetLab.types';

interface UseWidgetLabHandlersProps {
  // State setters
  setError: (error: string | null) => void;
  setIsAiAnalyzing: (value: boolean) => void;
  setAiSuggestedConnections: (connections: AISuggestedConnection[]) => void;
  setSelectedLibraryWidgets: (widgets: string[]) => void;
  setNewPipelineName: (name: string) => void;
  setIsCreatingPipeline: (value: boolean) => void;
  setPipelines: (pipelines: Pipeline[]) => void;
  setPipelinePrompt: (prompt: string) => void;
  setIsSuggestingIO: (value: boolean) => void;
  setInputPorts: (ports: IOPort[]) => void;
  setOutputPorts: (ports: IOPort[]) => void;
  setIsSavingToLibrary: (value: boolean) => void;
  setLibraryWidgets: React.Dispatch<React.SetStateAction<LibraryWidgetInfo[]>>;
  setIsGenerating: (value: boolean) => void;
  setGenerationStep: (step: string) => void;
  setRedundancyWarning: (warning: string | null) => void;
  setDescription: (desc: string) => void;
  setActiveTab: (tab: 'upload' | 'generate' | 'drafts') => void;
  setPreviewDraft: (draft: DraftWidget | null) => void;

  // Current values
  pipelinePrompt: string;
  selectedModel: string;
  libraryWidgets: LibraryWidgetInfo[];
  selectedLibraryWidgets: string[];
  newPipelineName: string;
  aiSuggestedConnections: AISuggestedConnection[];
  description: string;
  selectedPipeline: string;
  pipelines: Pipeline[];
  inputPorts: IOPort[];
  outputPorts: IOPort[];
  selectedTemplate: string;
  complexity: ComplexityLevel;
  stylePreset: StylePreset;
  features: FeatureRequirements;
  previewDraft: DraftWidget | null;
  userId?: string;

  // Utilities
  getLibrary: () => any;
  refreshDrafts: () => void;
  refreshLibraryStats: () => void;
}

export function useWidgetLabHandlers({
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
  selectedTemplate,
  complexity,
  stylePreset,
  features,
  previewDraft,
  userId,
  getLibrary,
  refreshDrafts,
  refreshLibraryStats,
}: UseWidgetLabHandlersProps) {
  // AI-powered pipeline analysis
  const handleAiAnalyzePipeline = useCallback(async () => {
    if (!pipelinePrompt.trim()) {
      setError('Please describe what you want the pipeline to do');
      return;
    }

    setIsAiAnalyzing(true);
    setError(null);
    setAiSuggestedConnections([]);

    try {
      const ai = getWidgetPipelineAI();
      ai.setModel(selectedModel);

      const widgetCatalog = libraryWidgets.map(w => {
        let info = `- ${w.name} (${w.id})`;
        if (w.description) info += `: ${w.description}`;
        if (w.inputs && Object.keys(w.inputs).length > 0) {
          info += `\n  INPUTS: ${Object.entries(w.inputs).map(([k, v]: [string, any]) => `${k}(${v?.type || 'any'})`).join(', ')}`;
        }
        if (w.outputs && Object.keys(w.outputs).length > 0) {
          info += `\n  OUTPUTS: ${Object.entries(w.outputs).map(([k, v]: [string, any]) => `${k}(${v?.type || 'any'})`).join(', ')}`;
        }
        return info;
      }).join('\n');

      const prompt = `You are a widget pipeline architect. Based on the user's goal, select the best widgets and define how to connect them.

USER'S GOAL: ${pipelinePrompt}

AVAILABLE WIDGETS:
${widgetCatalog}

Analyze the goal and respond with ONLY valid JSON (no markdown, no explanation):
{
  "pipelineName": "descriptive name for the pipeline",
  "selectedWidgets": ["widget-id-1", "widget-id-2", ...],
  "connections": [
    {"from": "widget-id", "fromPort": "output-name", "to": "widget-id", "toPort": "input-name", "reason": "brief explanation"}
  ],
  "explanation": "Brief explanation of how this pipeline achieves the goal"
}

RULES:
- Only select widgets that exist in the catalog above
- Only create connections between compatible ports (matching types or 'any')
- Each input port can only receive one connection
- Order widgets logically: data sources -> processors -> outputs`;

      const provider = (ai as any).provider;
      const result = await provider.generate(prompt, { maxTokens: 1500, temperature: 0.3 });
      const response = result.content;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        if (analysis.selectedWidgets && Array.isArray(analysis.selectedWidgets)) {
          const validWidgets = analysis.selectedWidgets.filter((id: string) =>
            libraryWidgets.some(w => w.id === id)
          );
          setSelectedLibraryWidgets(validWidgets);
        }

        if (analysis.connections && Array.isArray(analysis.connections)) {
          setAiSuggestedConnections(analysis.connections);
        }

        if (analysis.pipelineName) {
          setNewPipelineName(analysis.pipelineName);
        }
      } else {
        setError('Could not parse AI response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAiAnalyzing(false);
    }
  }, [pipelinePrompt, selectedModel, libraryWidgets, setError, setIsAiAnalyzing, setAiSuggestedConnections, setSelectedLibraryWidgets, setNewPipelineName]);

  // Create pipeline with AI-suggested connections
  const handleCreatePipeline = useCallback(async () => {
    if (selectedLibraryWidgets.length < 2) {
      setError('Select at least 2 widgets to create a pipeline');
      return;
    }

    const pipelineName = newPipelineName.trim() || `Pipeline ${Date.now().toString(36)}`;
    setIsCreatingPipeline(true);
    setError(null);

    try {
      const selectedWidgetInfos = libraryWidgets.filter(w =>
        selectedLibraryWidgets.includes(w.id)
      );

      const WIDGET_WIDTH = 200;
      const WIDGET_HEIGHT = 150;
      const GAP_X = 100;
      const GAP_Y = 60;
      const START_X = 100;
      const START_Y = 100;

      const connectionSources = new Set(aiSuggestedConnections.map(c => c.from));
      const connectionTargets = new Set(aiSuggestedConnections.map(c => c.to));

      const widgetOrder = selectedWidgetInfos.map(w => {
        let score = 0;
        if (connectionSources.has(w.id)) score -= 1;
        if (connectionTargets.has(w.id)) score += 1;
        return { widget: w, score };
      }).sort((a, b) => a.score - b.score);

      const nodes: any[] = [];
      const nodeIdMap = new Map<string, string>();

      widgetOrder.forEach((item, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;

        const node = createWidgetNode(
          item.widget.id,
          {
            x: START_X + col * (WIDGET_WIDTH + GAP_X),
            y: START_Y + row * (WIDGET_HEIGHT + GAP_Y),
          },
          item.widget.name
        );
        nodes.push(node);
        nodeIdMap.set(item.widget.id, node.id);
      });

      const connections: any[] = [];

      if (aiSuggestedConnections.length > 0) {
        for (const conn of aiSuggestedConnections) {
          const fromNodeId = nodeIdMap.get(conn.from);
          const toNodeId = nodeIdMap.get(conn.to);
          if (fromNodeId && toNodeId) {
            connections.push(createConnection(fromNodeId, conn.fromPort, toNodeId, conn.toPort));
          }
        }
      }

      const pipeline: Pipeline = {
        id: crypto.randomUUID(),
        canvasId: 'default',
        name: pipelineName,
        description: pipelinePrompt || `Pipeline with ${selectedWidgetInfos.length} widgets`,
        nodes,
        connections,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePipeline(pipeline);
      const updatedPipelines = await listAllPipelines();
      setPipelines(updatedPipelines);

      setSelectedLibraryWidgets([]);
      setNewPipelineName('');
      setPipelinePrompt('');
      setAiSuggestedConnections([]);

      alert(`Pipeline "${pipelineName}" created with ${nodes.length} widgets and ${connections.length} connections!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pipeline');
    } finally {
      setIsCreatingPipeline(false);
    }
  }, [selectedLibraryWidgets, newPipelineName, pipelinePrompt, libraryWidgets, aiSuggestedConnections, setError, setIsCreatingPipeline, setPipelines, setSelectedLibraryWidgets, setNewPipelineName, setPipelinePrompt, setAiSuggestedConnections]);

  // AI-assisted I/O suggestion
  const handleSuggestIO = useCallback(async () => {
    if (!description.trim()) {
      setError('Please provide a description first');
      return;
    }

    setIsSuggestingIO(true);
    setError(null);

    try {
      const ai = getWidgetPipelineAI();
      ai.setModel(selectedModel);

      let libraryContext = '';
      if (selectedLibraryWidgets.length > 0) {
        const selectedWidgetInfos = libraryWidgets.filter(w => selectedLibraryWidgets.includes(w.id));
        libraryContext = '\n\nSelected widgets to integrate with:\n' + selectedWidgetInfos.map(w => {
          let info = `- ${w.name} (${w.id})`;
          if (w.description) info += `: ${w.description}`;
          if (w.inputs && Object.keys(w.inputs).length > 0) {
            info += `\n  Inputs: ${Object.keys(w.inputs).join(', ')}`;
          }
          if (w.outputs && Object.keys(w.outputs).length > 0) {
            info += `\n  Outputs: ${Object.keys(w.outputs).join(', ')}`;
          }
          return info;
        }).join('\n');
      } else if (libraryWidgets.length > 0) {
        libraryContext = `\n\nAvailable widgets in library: ${libraryWidgets.slice(0, 15).map(w => w.name).join(', ')}`;
      }

      const pipelineContext = selectedPipeline
        ? `\n\nTarget pipeline: ${pipelines.find(p => p.id === selectedPipeline)?.name || selectedPipeline}`
        : '';

      const prompt = `Based on this widget description, suggest appropriate input and output ports for connecting to other widgets in a pipeline ecosystem.

Widget Description: ${description}${libraryContext}${pipelineContext}

Respond with ONLY valid JSON in this exact format (no markdown, no explanation):
{"inputs":[{"name":"port-name","description":"what it receives"}],"outputs":[{"name":"port-name","description":"what it sends"}]}

Port names should be lowercase with hyphens (e.g., "color-value", "trigger", "data-in").
Suggest 1-3 inputs and 1-3 outputs based on the widget's purpose.`;

      const provider = (ai as any).provider;
      const result = await provider.generate(prompt, { maxTokens: 500, temperature: 0.3 });
      const response = result.content;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (suggestions.inputs && Array.isArray(suggestions.inputs)) {
          setInputPorts(suggestions.inputs.map((p: any) => ({
            name: String(p.name || '').toLowerCase().replace(/\s+/g, '-'),
            description: String(p.description || ''),
          })));
        }
        if (suggestions.outputs && Array.isArray(suggestions.outputs)) {
          setOutputPorts(suggestions.outputs.map((p: any) => ({
            name: String(p.name || '').toLowerCase().replace(/\s+/g, '-'),
            description: String(p.description || ''),
          })));
        }
      } else {
        setError('Could not parse AI suggestions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions');
    } finally {
      setIsSuggestingIO(false);
    }
  }, [description, selectedModel, selectedLibraryWidgets, libraryWidgets, selectedPipeline, pipelines, setError, setIsSuggestingIO, setInputPorts, setOutputPorts]);

  // Save draft to library
  const handleSaveToLibrary = useCallback(async (draft: DraftWidget) => {
    if (!userId) {
      setError('Please sign in to save to library');
      return;
    }

    setIsSavingToLibrary(true);
    setError(null);

    try {
      const htmlFile = new File([draft.html], 'index.html', { type: 'text/html' });
      const manifestFile = new File(
        [JSON.stringify(draft.manifest, null, 2)],
        'manifest.json',
        { type: 'application/json' }
      );

      const result = await uploadWidgetBundle(userId, draft.manifest, [htmlFile, manifestFile]);

      if (result.success) {
        const newWidgetInfo: LibraryWidgetInfo = {
          id: draft.manifest.id,
          name: draft.manifest.name,
          description: draft.manifest.description,
          inputs: draft.manifest.inputs,
          outputs: draft.manifest.outputs,
        };
        setLibraryWidgets(prev => {
          if (prev.find(w => w.id === newWidgetInfo.id)) return prev;
          return [newWidgetInfo, ...prev];
        });
        alert(`Widget "${draft.manifest.name}" saved to your library!`);
      } else {
        setError(result.error?.message || 'Failed to save to library');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSavingToLibrary(false);
    }
  }, [userId, setError, setIsSavingToLibrary, setLibraryWidgets]);

  // One-click test widget generator
  const handleAddTestWidget = useCallback((type: 'vector-control' | 'timer' | 'button' | 'display') => {
    const typeNames = {
      'vector-control': 'Vector Control',
      'timer': 'Timer',
      'button': 'Button',
      'display': 'Display',
    };

    const bundle = generateTestWidget({ name: `Test ${typeNames[type]}`, type });

    const validation = validateWidget(bundle);
    if (!validation.valid) {
      setError('Test widget generation failed: ' + validation.errors.join(', '));
      return;
    }

    const draft = getDraftManager().createDraft(
      bundle.manifest as WidgetManifest,
      bundle.html,
      { conversationId: `test-${type}-${Date.now()}` }
    );

    refreshDrafts();
    setPreviewDraft(draft);

    const libraryResult = getLibrary()?.add({
      manifest: bundle.manifest,
      html: bundle.html,
      source: 'test',
    });

    if (libraryResult?.added) {
      refreshLibraryStats();
    }
  }, [setError, refreshDrafts, setPreviewDraft, getLibrary, refreshLibraryStats]);

  // Quick Create
  const handleQuickCreate = useCallback(async () => {
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    const recommendation = getLibrary()?.recommendForDescription(description.trim());
    if (recommendation?.existingWidgets?.length > 0 && !recommendation.shouldCreate) {
      const existing = recommendation.existingWidgets[0];
      setRedundancyWarning(
        `A similar widget already exists: "${existing.manifest.name}" (${existing.quality}% quality). ` +
        `Use it instead? Or modify your description to be more specific.`
      );
    }

    setError(null);
    setRedundancyWarning(null);
    setIsGenerating(true);
    setGenerationStep('Quick creating widget...');

    try {
      const ai = getWidgetPipelineAI();
      const desc = description.toLowerCase();
      const isVectorWidget = desc.includes('vector') || desc.includes('shape') || desc.includes('canvas');
      const isTimerWidget = desc.includes('timer') || desc.includes('countdown') || desc.includes('clock');

      let autoStyle: StylePreset = 'polished';
      if (desc.includes('minimal') || desc.includes('simple')) autoStyle = 'minimal';
      if (desc.includes('neon') || desc.includes('cyber')) autoStyle = 'neon';
      if (desc.includes('glass') || desc.includes('blur')) autoStyle = 'glassmorphism';
      if (desc.includes('retro') || desc.includes('pixel')) autoStyle = 'retro';

      const autoInputEvents: string[] = [];
      const autoOutputEvents: string[] = [];

      if (isVectorWidget) {
        autoInputEvents.push('vector:selection-changed');
        autoOutputEvents.push('vector:set-fill', 'vector:set-stroke', 'vector:set-shadow');
      }

      if (isTimerWidget) {
        autoInputEvents.push('trigger');
        autoOutputEvents.push('timer:tick', 'timer:complete');
      }

      if (desc.includes('button') || desc.includes('click')) autoOutputEvents.push('clicked');
      if (desc.includes('color')) autoOutputEvents.push('colorChanged');

      const request: WidgetGenerationRequest = {
        description: description.trim(),
        mode: 'new',
        modelPreset: selectedModel,
        complexity: 'standard',
        stylePreset: autoStyle,
        inputEvents: autoInputEvents.length > 0 ? autoInputEvents : undefined,
        outputEvents: autoOutputEvents.length > 0 ? autoOutputEvents : undefined,
        features: { animations: true, microInteractions: true, responsive: true },
      };

      setGenerationStep('Generating widget...');
      const result = await ai.generateWidget(request);

      if (result.success && result.widget) {
        setGenerationStep('Widget created successfully!');
        setDescription('');
        refreshDrafts();
        setPreviewDraft(result.widget);
        setActiveTab('drafts');

        const libraryResult = getLibrary()?.add({
          manifest: result.widget.manifest,
          html: result.widget.html,
          source: 'generated',
        });

        if (libraryResult?.added) {
          refreshLibraryStats();
        }
      } else if (result.errors?.length) {
        setError(result.errors[0]);
      } else {
        setError('Generation failed - please try again');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick create failed');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [description, selectedModel, setError, setRedundancyWarning, setIsGenerating, setGenerationStep, setDescription, refreshDrafts, setPreviewDraft, setActiveTab, getLibrary, refreshLibraryStats]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationStep('Initializing AI...');

    try {
      const ai = getWidgetPipelineAI();
      ai.setModel(selectedModel);

      setGenerationStep('Preparing generation request...');

      const inputEvents = inputPorts.map(p => p.name);
      const outputEvents = outputPorts.map(p => p.name);

      let ioInstructions = '';
      if (inputPorts.length > 0 || outputPorts.length > 0) {
        ioInstructions = '\n\nIMPORTANT - Widget I/O Requirements:\n';
        if (inputPorts.length > 0) {
          ioInstructions += 'INPUT PORTS (use WidgetAPI.onInput):\n';
          inputPorts.forEach(p => {
            ioInstructions += `- "${p.name}": ${p.description || 'Receives data from connected widgets'}\n`;
          });
        }
        if (outputPorts.length > 0) {
          ioInstructions += 'OUTPUT PORTS (use WidgetAPI.emitOutput):\n';
          outputPorts.forEach(p => {
            ioInstructions += `- "${p.name}": ${p.description || 'Sends data to connected widgets'}\n`;
          });
        }
        ioInstructions += '\nThe widget MUST implement these I/O ports for pipeline connections.';
      }

      const selectedPipelineName = selectedPipeline
        ? pipelines.find(p => p.id === selectedPipeline)?.name
        : undefined;

      let libraryInstructions = '';
      if (selectedLibraryWidgets.length > 0) {
        const selectedWidgetInfos = libraryWidgets.filter(w => selectedLibraryWidgets.includes(w.id));
        libraryInstructions = '\n\nINTEGRATION REQUIREMENTS - This widget should work with these existing widgets:\n';
        selectedWidgetInfos.forEach(w => {
          libraryInstructions += `\n${w.name} (${w.id})`;
          if (w.description) libraryInstructions += `: ${w.description}`;
          if (w.inputs && Object.keys(w.inputs).length > 0) {
            libraryInstructions += `\n  - Accepts inputs: ${Object.entries(w.inputs).map(([k, v]: [string, any]) => `${k} (${v?.type || 'any'})`).join(', ')}`;
          }
          if (w.outputs && Object.keys(w.outputs).length > 0) {
            libraryInstructions += `\n  - Emits outputs: ${Object.entries(w.outputs).map(([k, v]: [string, any]) => `${k} (${v?.type || 'any'})`).join(', ')}`;
          }
        });
        libraryInstructions += '\n\nEnsure the new widget has compatible I/O ports to connect with these widgets.';
      }

      const request: WidgetGenerationRequest = {
        description: description.trim() + ioInstructions,
        mode: 'new',
        templateId: selectedTemplate || undefined,
        modelPreset: selectedModel,
        pipelineId: selectedPipeline || undefined,
        complexity,
        stylePreset,
        inputEvents: inputEvents.length > 0 ? inputEvents : undefined,
        outputEvents: outputEvents.length > 0 ? outputEvents : undefined,
        features,
        additionalInstructions: [
          selectedPipelineName ? `This widget will be added to the "${selectedPipelineName}" pipeline.` : '',
          libraryInstructions,
        ].filter(Boolean).join('\n') || undefined,
      };

      setGenerationStep('Generating widget code...');

      const result = await ai.generateWidget(request);

      if (result.success && result.widget) {
        setGenerationStep('Widget created successfully!');
        setDescription('');
        setInputPorts([]);
        setOutputPorts([]);
        refreshDrafts();
        setPreviewDraft(result.widget);
        setActiveTab('drafts');

        const libraryResult = getLibrary()?.add({
          manifest: result.widget.manifest,
          html: result.widget.html,
          source: 'generated',
        });

        if (libraryResult?.added) {
          refreshLibraryStats();
        }
      } else if (result.errors?.length) {
        setError(result.errors[0]);
      } else {
        setError('Generation failed - please try again with a different description');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [description, selectedModel, inputPorts, outputPorts, selectedPipeline, pipelines, selectedLibraryWidgets, libraryWidgets, selectedTemplate, complexity, stylePreset, features, setError, setIsGenerating, setGenerationStep, setDescription, setInputPorts, setOutputPorts, refreshDrafts, setPreviewDraft, setActiveTab, getLibrary, refreshLibraryStats]);

  // Delete draft
  const handleDeleteDraft = useCallback((draftId: string) => {
    getDraftManager().discardDraft(draftId);
    refreshDrafts();
    if (previewDraft?.id === draftId) {
      setPreviewDraft(null);
    }
  }, [previewDraft, refreshDrafts, setPreviewDraft]);

  return {
    handleAiAnalyzePipeline,
    handleCreatePipeline,
    handleSuggestIO,
    handleSaveToLibrary,
    handleAddTestWidget,
    handleQuickCreate,
    handleGenerate,
    handleDeleteDraft,
  };
}
