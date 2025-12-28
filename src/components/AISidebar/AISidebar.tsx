/**
 * StickerNest v2 - AI Sidebar
 * Main sidebar panel for Widget Generator
 * Clean, professional design following StickerNest theme
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RuntimeContext } from '../../runtime/RuntimeContext';
import { ChatInterface } from './ChatInterface';
import { QuickActions } from './QuickActions';
import { DraftPanel } from './DraftPanel';
import { ModelSelector } from './ModelSelector';
import { FloatingPreview } from './FloatingPreview';
import { WidgetConnector } from './WidgetConnector';
import { SharedWidgetBrowser } from './SharedWidgetBrowser';
import { TemplateLibrary } from './TemplateLibrary';
import { BatchQueue } from './BatchQueue';
import { DraftEditor } from './DraftEditor';
import { VersionHistory } from './VersionHistory';
import { ExportWidget } from './ExportWidget';
import { getWidgetPipelineAI, type AIConversation, type AIGenerationResult } from '../../ai';
import { getDraftManager, type DraftWidget, type DraftChangeEvent } from '../../ai/DraftManager';
import { getDraftVersioning, type DraftVersion } from '../../ai/DraftVersioning';
import type { WidgetTemplate } from '../../ai/WidgetTemplates';
import type { ConnectionSuggestion } from '../../ai/ConnectionAnalyzer';
import type { SharedWidget } from '../../services/sharedWidgetsClient';
import { CapabilityScanner } from './CapabilityScanner';
import { PipelinePanel } from './PipelinePanel';
import { EventDebugger } from './EventDebugger';
import { SNIcon, type IconName } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';

// Design tokens
const theme = {
  bg: {
    primary: '#0f0f19',
    secondary: '#1a1a2e',
    tertiary: '#252542',
    elevated: '#1e1e38',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    tertiary: '#64748b',
    muted: '#475569',
  },
  accent: '#3b82f6',
  accentHover: '#2563eb',
  accentMuted: 'rgba(59, 130, 246, 0.15)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.15)',
  success: '#22c55e',
  error: '#ef4444',
};

export interface AISidebarProps {
  runtime: RuntimeContext;
  isOpen: boolean;
  onToggle: () => void;
  onWidgetGenerated?: (draft: DraftWidget) => void;
}

type SidebarTab = 'quick' | 'chat' | 'drafts' | 'templates' | 'browse' | 'batch' | 'scanner' | 'pipelines' | 'events';
type OverlayPanel = 'none' | 'editor' | 'history' | 'export' | 'connect';

export const AISidebar: React.FC<AISidebarProps> = ({
  runtime,
  isOpen,
  onToggle,
  onWidgetGenerated,
}) => {
  // Core state
  const [activeTab, setActiveTab] = useState<SidebarTab>('quick');
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [drafts, setDrafts] = useState<DraftWidget[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('default');

  // Preview state
  const [previewDraft, setPreviewDraft] = useState<DraftWidget | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewPinned, setIsPreviewPinned] = useState(false);

  // Selected draft for editing
  const [selectedDraft, setSelectedDraft] = useState<DraftWidget | null>(null);

  // Overlay panels
  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>('none');

  // Initialize conversation and load drafts
  useEffect(() => {
    const ai = getWidgetPipelineAI();
    const conv = ai.startConversation();
    setConversation(conv);

    // Load existing drafts
    const draftManager = getDraftManager();
    setDrafts(draftManager.getAllDrafts());

    // Subscribe to draft changes
    const unsubscribe = draftManager.onChange((event: DraftChangeEvent) => {
      setDrafts(draftManager.getAllDrafts());

      // Notify parent of new widgets
      if (event.type === 'created' && event.draft && onWidgetGenerated) {
        onWidgetGenerated(event.draft);

        // Auto-preview new drafts
        setPreviewDraft(event.draft);
        setIsPreviewOpen(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onWidgetGenerated]);

  // Handlers
  const handleGenerate = async (result: AIGenerationResult) => {
    if (result.widget) {
      runtime.eventBus.emit({
        type: 'ai:widget-generated',
        scope: 'canvas',
        payload: {
          draftId: result.widget.id,
          widgetId: result.widget.manifest.id,
          success: result.success,
        },
      });

      // Save version
      const versioning = getDraftVersioning();
      versioning.saveVersion(
        result.widget.id,
        result.widget.html,
        result.widget.manifest,
        'create'
      );
    }
  };

  const handleAddToCanvas = useCallback((draft: DraftWidget) => {
    runtime.eventBus.emit({
      type: 'widget:add-request',
      scope: 'canvas',
      payload: {
        widgetDefId: draft.manifest.id,
        version: draft.manifest.version,
        source: 'generated',
        generatedContent: {
          html: draft.html,
          manifest: draft.manifest,
        },
      },
    });
  }, [runtime]);

  const handlePreviewDraft = useCallback((draft: DraftWidget) => {
    setPreviewDraft(draft);
    setIsPreviewOpen(true);
  }, []);

  const handleEditDraft = useCallback((draft: DraftWidget) => {
    setSelectedDraft(draft);
    setOverlayPanel('editor');
  }, []);

  const handleDraftUpdate = useCallback((updatedDraft: DraftWidget) => {
    // Save version on edit
    const versioning = getDraftVersioning();
    versioning.saveVersion(
      updatedDraft.id,
      updatedDraft.html,
      updatedDraft.manifest,
      'edit'
    );

    // Update preview
    setPreviewDraft(updatedDraft);
  }, []);

  const handleTemplateSelect = useCallback((_template: WidgetTemplate) => {
    // Generate widget from template
    setActiveTab('quick');
  }, []);

  const handleSharedWidgetImport = useCallback((widget: SharedWidget) => {
    const draftManager = getDraftManager();
    draftManager.createDraft(widget.manifest, widget.html, {
      metadata: { mode: 'new' },
    });
  }, []);

  const handleConnectionSelect = useCallback((suggestion: ConnectionSuggestion) => {
    // Connection selected
  }, []);

  const handleApplyConnections = useCallback((suggestions: ConnectionSuggestion[]) => {
    // Applying connections
  }, []);

  const handleRollback = useCallback((version: DraftVersion) => {
    const versioning = getDraftVersioning();
    const newVersion = versioning.rollbackTo(version.draftId, version.id);

    if (newVersion && selectedDraft) {
      const draftManager = getDraftManager();
      draftManager.updateDraft(version.draftId, {
        html: version.html,
        manifest: version.manifest,
      });

      const updated = draftManager.getDraft(version.draftId);
      if (updated) {
        setSelectedDraft(updated);
        setPreviewDraft(updated);
      }
    }
  }, [selectedDraft]);

  const handleCompareVersions = useCallback((versionA: DraftVersion, versionB: DraftVersion) => {
    // Comparing versions
  }, []);

  // Tab configuration with icons
  const tabs: { id: SidebarTab; label: string; icon: IconName }[] = [
    { id: 'quick', label: 'Create', icon: 'wand' },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'drafts', label: `Drafts${drafts.length > 0 ? ` (${drafts.length})` : ''}`, icon: 'file' },
    { id: 'pipelines', label: 'Pipelines', icon: 'workflow' },
    { id: 'events', label: 'Events', icon: 'zap' },
    { id: 'templates', label: 'Templates', icon: 'library' },
    { id: 'browse', label: 'Browse', icon: 'globe' },
    { id: 'batch', label: 'Batch', icon: 'queue' },
    { id: 'scanner', label: 'Scanner', icon: 'scan' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'linear-gradient(135deg, var(--sn-accent-primary, #8b5cf6) 0%, var(--sn-accent-secondary, #6366f1) 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px 0 0 6px',
          padding: '12px 8px',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontWeight: 500,
          fontSize: '12px',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <SNIcon name="wand" size="sm" />
        Lab
      </button>
    );
  }

  return (
    <>
      {/* Floating Preview Window */}
      <FloatingPreview
        draft={previewDraft}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isPinned={isPreviewPinned}
        onPinToggle={() => setIsPreviewPinned(!isPreviewPinned)}
        initialPosition={{ x: window.innerWidth - 780, y: 100 }}
      />

      {/* Main Sidebar */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: 380,
          background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
          borderLeft: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--sn-bg-primary, rgba(15, 15, 36, 0.9))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--sn-accent-primary, #8b5cf6)' }}>
              <SNIcon name="ai" size="lg" />
            </span>
            <div>
              <h2 style={{ margin: 0, color: 'var(--sn-text-primary, #e2e8f0)', fontSize: '14px', fontWeight: 600 }}>
                Widget Lab
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--sn-text-tertiary, #64748b)' }}>
                AI Generator
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <SNIconButton
              icon={isPreviewOpen ? 'eyeOff' : 'eye'}
              variant={isPreviewOpen ? 'primary' : 'glass'}
              size="sm"
              tooltip={isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              active={isPreviewOpen}
            />
            <SNIconButton
              icon="close"
              variant="ghost"
              size="sm"
              tooltip="Close Panel"
              onClick={onToggle}
            />
          </div>
        </div>

        {/* Model Selector */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${theme.border}` }}>
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
            background: 'var(--sn-bg-primary, rgba(15, 15, 36, 0.9))',
            overflowX: 'auto',
            padding: '0 8px',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              style={{
                flex: '0 0 auto',
                padding: '10px 12px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? 'var(--sn-text-primary, #e2e8f0)' : 'var(--sn-text-tertiary, #64748b)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeTab === tab.id ? 500 : 400,
                borderBottom: activeTab === tab.id
                  ? '2px solid var(--sn-accent-primary, #8b5cf6)'
                  : '2px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <SNIcon name={tab.icon} size="xs" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Overlay Panels */}
          {overlayPanel !== 'none' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: theme.bg.secondary,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
            }}>
              {overlayPanel === 'editor' && selectedDraft && (
                <DraftEditor
                  draft={selectedDraft}
                  onUpdate={handleDraftUpdate}
                  onClose={() => setOverlayPanel('none')}
                  height="100%"
                />
              )}
              {overlayPanel === 'history' && selectedDraft && (
                <VersionHistory
                  draft={selectedDraft}
                  onRollback={handleRollback}
                  onCompare={handleCompareVersions}
                  onClose={() => setOverlayPanel('none')}
                />
              )}
              {overlayPanel === 'export' && selectedDraft && (
                <ExportWidget
                  draft={selectedDraft}
                  onClose={() => setOverlayPanel('none')}
                />
              )}
              {overlayPanel === 'connect' && selectedDraft && (
                <WidgetConnector
                  runtime={runtime}
                  currentDraft={selectedDraft}
                  onConnectionSelect={handleConnectionSelect}
                  onApplyConnections={handleApplyConnections}
                />
              )}
            </div>
          )}

          {/* Regular Tab Content */}
          {overlayPanel === 'none' && (
            <>
              {activeTab === 'quick' && (
                <QuickActions
                  modelPreset={selectedModel}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                />
              )}

              {activeTab === 'chat' && conversation && (
                <ChatInterface
                  conversation={conversation}
                  modelPreset={selectedModel}
                  onGenerate={handleGenerate}
                />
              )}

              {activeTab === 'drafts' && (
                <DraftPanel
                  drafts={drafts}
                  onAddToCanvas={handleAddToCanvas}
                  onPreview={handlePreviewDraft}
                  onEdit={handleEditDraft}
                  onHistory={(draft) => {
                    setSelectedDraft(draft);
                    setOverlayPanel('history');
                  }}
                  onExport={(draft) => {
                    setSelectedDraft(draft);
                    setOverlayPanel('export');
                  }}
                  onConnect={(draft) => {
                    setSelectedDraft(draft);
                    setOverlayPanel('connect');
                  }}
                />
              )}

              {activeTab === 'templates' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  <TemplateLibrary
                    onSelectTemplate={handleTemplateSelect}
                    onPreviewTemplate={(template) => {
                      // Preview template
                    }}
                  />
                </div>
              )}

              {activeTab === 'browse' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  <SharedWidgetBrowser
                    runtime={runtime}
                    onWidgetSelect={(widget) => {
                      // Selected shared widget
                    }}
                    onWidgetImport={handleSharedWidgetImport}
                  />
                </div>
              )}

              {activeTab === 'batch' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                  <BatchQueue
                    onWidgetGenerated={(draft) => {
                      setPreviewDraft(draft);
                      setIsPreviewOpen(true);
                    }}
                    onClose={() => setActiveTab('drafts')}
                  />
                </div>
              )}

              {activeTab === 'scanner' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <CapabilityScanner runtime={runtime} />
                </div>
              )}

              {activeTab === 'pipelines' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <PipelinePanel runtime={runtime} />
                </div>
              )}

              {activeTab === 'events' && (
                <div style={{ flex: 1, overflow: 'auto' }}>
                  <EventDebugger runtime={runtime} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--sn-border-primary, rgba(255, 255, 255, 0.08))',
            background: 'var(--sn-bg-primary, rgba(15, 15, 36, 0.9))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--sn-text-tertiary, #64748b)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isGenerating ? (
              <SNIcon name="loading" size="xs" spin />
            ) : (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--sn-success, #22c55e)',
                }}
              />
            )}
            {isGenerating ? 'Generating...' : 'Ready'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SNIcon name="file" size="xs" />
            {drafts.length} drafts
          </span>
        </div>
      </div>
    </>
  );
};
