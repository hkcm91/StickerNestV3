/**
 * Generate Tab Component
 * Main content for the Widget Lab generate tab
 */

import React from 'react';
import { RuntimeContext } from '../../runtime/RuntimeContext';
import { theme } from '../theme';
import { SECTIONS } from '../help';
import type { DraftWidget } from '../../ai/DraftManager';
import type { Pipeline } from '../../types/domain';
import type { LibraryWidgetInfo, AISuggestedConnection, LibraryStats } from '../WidgetLab.types';
import { LabIntro } from './LabIntro';
import { QuickTestWidgets } from './QuickTestWidgets';
import { AIGeneratorPanel } from './generator-v2';
import { AIWorkflowBuilder } from './AIWorkflowBuilder';
import { WidgetLibraryPanel } from './WidgetLibraryPanel';
import { PipelineBuilderSection } from './PipelineBuilderSection';

export interface GenerateTabProps {
  runtime: RuntimeContext;
  // Intro state
  introCollapsed: boolean;
  onToggleIntro: () => void;
  // Drafts
  refreshDrafts: () => void;
  setPreviewDraft: React.Dispatch<React.SetStateAction<DraftWidget | null>>;
  // Description
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  // Test widget handler
  onAddTestWidget: (widgetId: string) => Promise<void>;
  // Library
  libraryStats: LibraryStats;
  refreshLibraryStats: () => void;
  getLibrary: () => any;
  libraryWidgets: LibraryWidgetInfo[];
  // Pipeline Builder props
  selectedLibraryWidgets: string[];
  setSelectedLibraryWidgets: React.Dispatch<React.SetStateAction<string[]>>;
  pipelinePrompt: string;
  setPipelinePrompt: React.Dispatch<React.SetStateAction<string>>;
  newPipelineName: string;
  setNewPipelineName: React.Dispatch<React.SetStateAction<string>>;
  aiSuggestedConnections: AISuggestedConnection[];
  setAiSuggestedConnections: React.Dispatch<React.SetStateAction<AISuggestedConnection[]>>;
  expandedCategories: Set<string>;
  setExpandedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  isAiAnalyzing: boolean;
  isCreatingPipeline: boolean;
  selectedModel: string;
  onAiAnalyzePipeline: () => Promise<void>;
  onCreatePipeline: () => Promise<void>;
  // AI workflow builder
  getWidgetPipelineAI: () => any;
  getDraftManager: () => any;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({
  runtime,
  introCollapsed,
  onToggleIntro,
  refreshDrafts,
  setPreviewDraft,
  description,
  setDescription,
  onAddTestWidget,
  libraryStats,
  refreshLibraryStats,
  getLibrary,
  libraryWidgets,
  selectedLibraryWidgets,
  setSelectedLibraryWidgets,
  pipelinePrompt,
  setPipelinePrompt,
  newPipelineName,
  setNewPipelineName,
  aiSuggestedConnections,
  setAiSuggestedConnections,
  expandedCategories,
  setExpandedCategories,
  isAiAnalyzing,
  isCreatingPipeline,
  selectedModel,
  onAiAnalyzePipeline,
  onCreatePipeline,
  getWidgetPipelineAI,
  getDraftManager,
}) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* GETTING STARTED GUIDE */}
      <LabIntro
        isCollapsed={introCollapsed}
        onToggleCollapse={onToggleIntro}
        onScrollToSection={(sectionId) => {
          const sectionMap: Record<string, string> = {
            test: 'section-quick-test',
            generate: 'section-ai-generator',
            describe: 'section-workflow-builder',
            connect: 'section-pipeline-builder',
          };
          const element = document.getElementById(sectionMap[sectionId]);
          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* SECTION 1: ONE-CLICK TEST WIDGETS */}
      <div id="section-quick-test" style={{ scrollMarginTop: '20px' }}>
        <SectionHeader number={1} subtitle={SECTIONS.quickTest.subtitle} />
      </div>
      <QuickTestWidgets onAddTestWidget={onAddTestWidget} />

      {/* SECTION 2: AI WIDGET GENERATOR V2.0 */}
      <div id="section-ai-generator" style={{ scrollMarginTop: '20px', marginTop: '24px' }}>
        <SectionHeader number={2} subtitle="AI Single Widget Generator" gradient badge="V2.0" />
      </div>
      <AIGeneratorPanel
        onWidgetGenerated={(draft) => {
          refreshDrafts();
          setPreviewDraft(draft);
        }}
        onPreviewWidget={(draft) => {
          setPreviewDraft(draft);
        }}
      />

      {/* SECTION 3: AI WORKFLOW BUILDER */}
      <div id="section-workflow-builder" style={{ scrollMarginTop: '20px', marginTop: '24px' }}>
        <SectionHeader number={3} subtitle={SECTIONS.workflowBuilder.subtitle} />
      </div>
      <AIWorkflowBuilder
        runtime={runtime}
        onWidgetGenerated={(draft) => {
          refreshDrafts();
          setPreviewDraft(draft);
        }}
        onWorkflowBuilt={() => {
          refreshLibraryStats();
        }}
        getLibraryWidgets={() => {
          const lib = getLibrary();
          if (!lib) return [];
          return lib.getAll().map((w: any) => ({
            id: w.id,
            name: w.manifest.name,
            description: w.manifest.description,
            inputEvents: w.capabilities.inputEvents,
            outputEvents: w.capabilities.outputEvents,
          }));
        }}
        getLibraryAIPrompt={() => getLibrary()?.generateAIPrompt() || 'No widgets in library yet.'}
        addToLibrary={(data) => {
          getLibrary()?.add(data);
          refreshLibraryStats();
        }}
        getAI={() => getWidgetPipelineAI()}
        getDraftManager={() => getDraftManager()}
      />

      {/* WIDGET LIBRARY STATS */}
      <WidgetLibraryPanel
        stats={libraryStats}
        onSuggestionClick={(suggestion) => setDescription(suggestion)}
        getWidgets={() => {
          return (getLibrary()?.getAll() || []).map((w: any) => ({
            id: w.id,
            name: w.manifest.name,
            quality: w.quality,
            category: w.category,
            inputCount: w.capabilities.inputEvents.length,
            outputCount: w.capabilities.outputEvents.length,
          }));
        }}
        getCoverageGaps={() => getLibrary()?.findCoverageGaps() || []}
      />

      {/* SECTION 4: CREATE PIPELINE FROM EXISTING WIDGETS */}
      <div id="section-pipeline-builder" style={{ scrollMarginTop: '20px', marginTop: '24px' }}>
        <SectionHeader number={4} subtitle={SECTIONS.pipelineBuilder.subtitle} />
      </div>
      <PipelineBuilderSection
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
        onAiAnalyzePipeline={onAiAnalyzePipeline}
        onCreatePipeline={onCreatePipeline}
      />
    </div>
  );
};

// Section header component
interface SectionHeaderProps {
  number: number;
  subtitle: string;
  gradient?: boolean;
  badge?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ number, subtitle, gradient, badge }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  }}>
    <span style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: gradient ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : theme.accent,
      color: 'white',
      fontSize: '11px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>{number}</span>
    <span style={{
      fontSize: '11px',
      color: theme.text.tertiary,
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      {subtitle}
    </span>
    {badge && (
      <span style={{
        padding: '2px 6px',
        background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 700,
        color: 'white',
      }}>
        {badge}
      </span>
    )}
  </div>
);
