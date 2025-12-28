/**
 * AI Workflow Builder Component
 * Lets users describe a workflow in natural language and automatically
 * assembles widgets, connects them, and adds to canvas
 */

import React, { useState, useCallback } from 'react';
import { theme } from '../theme';
import { RuntimeContext } from '../../runtime/RuntimeContext';
import type { WidgetManifest } from '../../types/manifest';

// Type for draft widget (defined locally to avoid circular import)
interface DraftWidget {
  id: string;
  manifest: WidgetManifest;
  html: string;
  createdAt: number;
}

interface AIWorkflowBuilderProps {
  runtime: RuntimeContext;
  onWidgetGenerated?: (draft: DraftWidget) => void;
  onWorkflowBuilt?: (widgets: DraftWidget[], connections: WorkflowConnection[]) => void;
  // Callbacks to avoid direct imports
  getLibraryWidgets: () => LibraryWidgetInfo[];
  getLibraryAIPrompt: () => string;
  addToLibrary: (data: { manifest: any; html: string; source: string }) => void;
  getAI: () => any;
  getDraftManager: () => any;
}

interface LibraryWidgetInfo {
  id: string;
  name: string;
  description?: string;
  inputEvents: string[];
  outputEvents: string[];
}

interface WorkflowConnection {
  fromWidgetId: string;
  fromPort: string;
  toWidgetId: string;
  toPort: string;
}

interface WorkflowPlan {
  widgets: {
    id: string;
    name: string;
    description: string;
    exists: boolean;
    libraryWidget?: LibraryWidgetInfo;
    needsGeneration: boolean;
  }[];
  connections: WorkflowConnection[];
  missingCapabilities: string[];
}

// Example workflow prompts with descriptions
const WORKFLOW_EXAMPLES = [
  { text: 'Color picker that changes shapes on canvas', category: 'Visual' },
  { text: 'Timer that triggers animations when complete', category: 'Time' },
  { text: 'Button that shows a counter', category: 'Simple' },
  { text: 'Slider that controls text size', category: 'Control' },
  { text: 'Form that validates and displays data', category: 'Data' },
];

// Help content for the workflow builder
const HELP_CONTENT = {
  whatIsThis: 'Describe what you want your widgets to do together, and AI will figure out which widgets you need and how to connect them.',
  howItWorks: [
    'Describe your goal in plain language',
    'AI plans which widgets are needed',
    'Widgets are generated and added to canvas',
    'Connections are made automatically',
  ],
  tips: [
    'Be specific about what should happen (e.g., "when I click..." or "shows the value...")',
    'Mention the type of data (colors, numbers, text)',
    'Describe the flow from input to output',
  ],
};

export const AIWorkflowBuilder: React.FC<AIWorkflowBuilderProps> = ({
  runtime,
  onWidgetGenerated,
  onWorkflowBuilt,
  getLibraryWidgets,
  getLibraryAIPrompt,
  addToLibrary,
  getAI,
  getDraftManager,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [workflowPlan, setWorkflowPlan] = useState<WorkflowPlan | null>(null);
  const [buildProgress, setBuildProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Analyze the prompt and create a workflow plan
  const analyzeWorkflow = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe your workflow');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setWorkflowPlan(null);

    try {
      // Get all library widgets for AI context
      const libraryWidgets = getLibraryWidgets();
      const libraryContext = getLibraryAIPrompt();

      // Use AI to analyze the workflow and map to widgets
      const ai = getAI();

      const analysisPrompt = `You are a widget workflow planner. Given a user's description and available widgets, create a workflow plan.

## Available Widgets in Library:
${libraryContext}

## User's Workflow Request:
"${prompt}"

## Your Task:
Analyze this workflow and determine:
1. Which existing widgets can fulfill parts of this workflow
2. What new widgets need to be generated
3. How widgets should be connected (which outputs connect to which inputs)

## Response Format (JSON):
{
  "widgets": [
    {
      "id": "unique-id",
      "name": "Widget Name",
      "description": "What this widget does in the workflow",
      "existingWidgetId": "library-widget-id or null if needs generation",
      "suggestedInputs": ["event-names"],
      "suggestedOutputs": ["event-names"]
    }
  ],
  "connections": [
    {
      "fromWidgetId": "widget-id",
      "fromPort": "output-port-name",
      "toWidgetId": "widget-id",
      "toPort": "input-port-name"
    }
  ],
  "missingCapabilities": ["things we cannot fulfill"]
}

Important:
- Prefer existing widgets when they match
- For vector operations, use widgets with vector:* events
- For timing operations, use widgets with timer:* events
- Keep the workflow minimal but complete`;

      const result = await ai.chat(analysisPrompt);

      // Parse the AI response
      let plan: WorkflowPlan;
      try {
        // Extract JSON from response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');

        const parsed = JSON.parse(jsonMatch[0]);

        // Map to our plan format
        plan = {
          widgets: (parsed.widgets || []).map((w: any) => {
            const existingWidget = w.existingWidgetId
              ? libraryWidgets.find(lw => lw.id === w.existingWidgetId)
              : null;

            return {
              id: w.id || crypto.randomUUID(),
              name: w.name,
              description: w.description,
              exists: !!existingWidget,
              libraryWidget: existingWidget || undefined,
              needsGeneration: !existingWidget,
            };
          }),
          connections: parsed.connections || [],
          missingCapabilities: parsed.missingCapabilities || [],
        };
      } catch (parseErr) {
        // Fallback: create a simple plan based on keywords
        plan = createFallbackPlan(prompt, libraryWidgets);
      }

      setWorkflowPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze workflow');
    } finally {
      setIsAnalyzing(false);
    }
  }, [prompt, getLibraryWidgets, getLibraryAIPrompt, getAI]);

  // Build the workflow - generate missing widgets and add all to canvas
  const buildWorkflow = useCallback(async () => {
    if (!workflowPlan) return;

    setIsBuilding(true);
    setError(null);
    setBuildProgress('Starting workflow build...');

    try {
      const builtWidgets: DraftWidget[] = [];
      const ai = getAI();
      const draftManager = getDraftManager();

      // Process each widget in the plan
      for (let i = 0; i < workflowPlan.widgets.length; i++) {
        const widgetPlan = workflowPlan.widgets[i];
        setBuildProgress(`Building widget ${i + 1}/${workflowPlan.widgets.length}: ${widgetPlan.name}`);

        let draft: DraftWidget;

        if (widgetPlan.exists && widgetPlan.libraryWidget) {
          // Use existing widget - need to fetch its full data
          // For now, generate anyway since we don't have full widget data
          setBuildProgress(`Generating: ${widgetPlan.name}...`);

          const result = await ai.generateWidget({
            description: `${widgetPlan.name}: ${widgetPlan.description}`,
            mode: 'new',
            complexity: 'standard',
            stylePreset: 'polished',
            features: {
              animations: true,
              microInteractions: true,
              responsive: true,
            },
          });

          if (!result.success || !result.widget) {
            throw new Error(`Failed to generate ${widgetPlan.name}`);
          }

          draft = result.widget;
        } else {
          // Generate new widget
          setBuildProgress(`Generating: ${widgetPlan.name}...`);

          const result = await ai.generateWidget({
            description: `${widgetPlan.name}: ${widgetPlan.description}`,
            mode: 'new',
            complexity: 'standard',
            stylePreset: 'polished',
            features: {
              animations: true,
              microInteractions: true,
              responsive: true,
            },
          });

          if (!result.success || !result.widget) {
            throw new Error(`Failed to generate ${widgetPlan.name}`);
          }

          draft = result.widget;
        }

        // Save to drafts and library
        draftManager.saveDraft(draft);
        addToLibrary({
          manifest: draft.manifest,
          html: draft.html,
          source: 'generated',
        });

        if (onWidgetGenerated) {
          onWidgetGenerated(draft);
        }

        builtWidgets.push(draft);

        // Widget saved to drafts - user can add to canvas from drafts tab
        // Small delay between widgets
        await new Promise(r => setTimeout(r, 300));
      }

      // Connections are saved with the workflow plan - will be created when added to canvas
      setBuildProgress('Widgets created! Check Drafts tab to add to canvas.');

      if (onWorkflowBuilt) {
        onWorkflowBuilt(builtWidgets, workflowPlan.connections);
      }

      // Clear after success
      setTimeout(() => {
        setWorkflowPlan(null);
        setPrompt('');
        setBuildProgress('');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build workflow');
    } finally {
      setIsBuilding(false);
    }
  }, [workflowPlan, runtime, addToLibrary, onWidgetGenerated, onWorkflowBuilt, getAI, getDraftManager]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
      borderRadius: '12px',
      border: '2px solid rgba(59, 130, 246, 0.4)',
      padding: '20px',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '28px' }}>🤖</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: theme.text.primary,
            }}>
              AI Workflow Builder
            </h2>
            <button
              onClick={() => setShowHelp(!showHelp)}
              style={{
                padding: '2px 8px',
                background: showHelp ? theme.accent : 'transparent',
                border: `1px solid ${showHelp ? theme.accent : theme.border}`,
                borderRadius: '4px',
                color: showHelp ? 'white' : theme.text.tertiary,
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {showHelp ? 'Hide Help' : '? Help'}
            </button>
          </div>
          <p style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: theme.text.secondary,
          }}>
            {HELP_CONTENT.whatIsThis}
          </p>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div style={{
          marginBottom: '16px',
          padding: '14px',
          background: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: theme.accent, marginBottom: '6px' }}>
              How it works:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {HELP_CONTENT.howItWorks.map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: theme.bg.tertiary,
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: theme.text.secondary,
                }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: theme.accent,
                    color: 'white',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>{i + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: theme.success, marginBottom: '6px' }}>
              Tips for better results:
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '18px',
              fontSize: '11px',
              color: theme.text.secondary,
              lineHeight: 1.6,
            }}>
              {HELP_CONTENT.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <input
          type="text"
          placeholder="e.g., Color picker that changes shapes on canvas..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && analyzeWorkflow()}
          disabled={isAnalyzing || isBuilding}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: theme.bg.secondary,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            color: theme.text.primary,
            fontSize: '14px',
          }}
        />
        <button
          onClick={analyzeWorkflow}
          disabled={isAnalyzing || isBuilding || !prompt.trim()}
          style={{
            padding: '12px 20px',
            background: isAnalyzing || !prompt.trim() ? theme.bg.tertiary : theme.accent,
            border: 'none',
            borderRadius: '8px',
            color: isAnalyzing || !prompt.trim() ? theme.text.tertiary : 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isAnalyzing || !prompt.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Plan Workflow'}
        </button>
      </div>

      {/* Example prompts with categories */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px',
          color: theme.text.tertiary,
          marginBottom: '6px',
        }}>
          Try an example:
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {WORKFLOW_EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => setPrompt(example.text)}
              disabled={isAnalyzing || isBuilding}
              style={{
                padding: '5px 10px',
                background: theme.bg.tertiary,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                fontSize: '11px',
                color: theme.text.secondary,
                cursor: isAnalyzing || isBuilding ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isAnalyzing || isBuilding ? 0.5 : 1,
              }}
            >
              <span style={{
                fontSize: '9px',
                padding: '1px 4px',
                background: theme.accentMuted,
                color: theme.accent,
                borderRadius: '3px',
                fontWeight: 600,
              }}>
                {example.category}
              </span>
              {example.text}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Plan */}
      {workflowPlan && (
        <div style={{
          background: theme.bg.secondary,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
        }}>
          <h3 style={{
            margin: '0 0 12px',
            fontSize: '14px',
            fontWeight: 600,
            color: theme.text.primary,
          }}>
            Workflow Plan
          </h3>

          {/* Widgets */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: theme.text.tertiary, marginBottom: '8px' }}>
              Widgets ({workflowPlan.widgets.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {workflowPlan.widgets.map((w, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: w.exists ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    borderRadius: '6px',
                    border: `1px solid ${w.exists ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: theme.text.primary }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: '11px', color: w.exists ? '#4ade80' : '#fbbf24' }}>
                    {w.exists ? '✓ In library' : '⚡ Will generate'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connections */}
          {workflowPlan.connections.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: theme.text.tertiary, marginBottom: '8px' }}>
                Connections ({workflowPlan.connections.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {workflowPlan.connections.map((conn, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 10px',
                      background: theme.bg.tertiary,
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: theme.text.secondary,
                      fontFamily: 'monospace',
                    }}
                  >
                    {conn.fromWidgetId}.{conn.fromPort} → {conn.toWidgetId}.{conn.toPort}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing capabilities warning */}
          {workflowPlan.missingCapabilities.length > 0 && (
            <div style={{
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderRadius: '6px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '12px', color: '#f87171' }}>
                ⚠️ Some capabilities may not be fully supported:
              </div>
              <div style={{ fontSize: '11px', color: theme.text.secondary, marginTop: '4px' }}>
                {workflowPlan.missingCapabilities.join(', ')}
              </div>
            </div>
          )}

          {/* Build button */}
          <button
            onClick={buildWorkflow}
            disabled={isBuilding}
            style={{
              width: '100%',
              padding: '12px',
              background: isBuilding ? theme.bg.tertiary : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              color: isBuilding ? theme.text.tertiary : 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isBuilding ? 'not-allowed' : 'pointer',
            }}
          >
            {isBuilding ? buildProgress : 'Build Workflow'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '6px',
          color: '#fca5a5',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

// Fallback plan generator when AI parsing fails
function createFallbackPlan(prompt: string, libraryWidgets: LibraryWidgetInfo[]): WorkflowPlan {
  const lower = prompt.toLowerCase();
  const widgets: WorkflowPlan['widgets'] = [];
  const connections: WorkflowConnection[] = [];

  // Detect widget types from prompt
  if (lower.includes('color') || lower.includes('picker')) {
    const existing = libraryWidgets.find(w =>
      w.name.toLowerCase().includes('color') ||
      w.outputEvents.some(e => e.includes('color'))
    );
    widgets.push({
      id: 'color-picker',
      name: 'Color Picker',
      description: 'Pick colors to apply',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  if (lower.includes('timer') || lower.includes('countdown')) {
    const existing = libraryWidgets.find(w =>
      w.name.toLowerCase().includes('timer') ||
      w.outputEvents.some(e => e.includes('timer'))
    );
    widgets.push({
      id: 'timer',
      name: 'Timer',
      description: 'Countdown timer',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  if (lower.includes('canvas') || lower.includes('shape') || lower.includes('vector')) {
    const existing = libraryWidgets.find(w =>
      w.inputEvents.some(e => e.includes('vector'))
    );
    widgets.push({
      id: 'vector-canvas',
      name: 'Vector Canvas',
      description: 'Display and manipulate shapes',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  if (lower.includes('slider') || lower.includes('control')) {
    const existing = libraryWidgets.find(w =>
      w.name.toLowerCase().includes('slider') ||
      w.name.toLowerCase().includes('control')
    );
    widgets.push({
      id: 'slider-control',
      name: 'Slider Control',
      description: 'Adjust values with slider',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  if (lower.includes('button') || lower.includes('trigger')) {
    const existing = libraryWidgets.find(w =>
      w.name.toLowerCase().includes('button') ||
      w.outputEvents.some(e => e.includes('click') || e.includes('trigger'))
    );
    widgets.push({
      id: 'trigger-button',
      name: 'Trigger Button',
      description: 'Button to trigger actions',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  if (lower.includes('display') || lower.includes('output') || lower.includes('show')) {
    const existing = libraryWidgets.find(w =>
      w.name.toLowerCase().includes('display') ||
      w.inputEvents.length > 0
    );
    widgets.push({
      id: 'display',
      name: 'Display',
      description: 'Show values and data',
      exists: !!existing,
      libraryWidget: existing,
      needsGeneration: !existing,
    });
  }

  // Add at least 2 widgets for a minimal workflow
  if (widgets.length < 2) {
    widgets.push({
      id: 'input-widget',
      name: 'Input Widget',
      description: 'Provide input to the workflow',
      exists: false,
      needsGeneration: true,
    });
    widgets.push({
      id: 'output-widget',
      name: 'Output Widget',
      description: 'Display workflow results',
      exists: false,
      needsGeneration: true,
    });
  }

  // Create simple linear connections
  for (let i = 0; i < widgets.length - 1; i++) {
    connections.push({
      fromWidgetId: widgets[i].id,
      fromPort: 'output',
      toWidgetId: widgets[i + 1].id,
      toPort: 'input',
    });
  }

  return {
    widgets,
    connections,
    missingCapabilities: [],
  };
}
