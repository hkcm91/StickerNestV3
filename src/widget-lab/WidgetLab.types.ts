/**
 * Types for Widget Lab components
 */

import type { WidgetManifest } from '../types/manifest';
import type { Pipeline } from '../types/domain';
import type { RuntimeContext } from '../runtime/RuntimeContext';
import type { DraftWidget } from '../ai/DraftManager';

// Tab types
export type LabTab = 'upload' | 'generate' | 'drafts';

// I/O Port types
export interface IOPort {
  name: string;
  description: string;
}

// Library widget info for AI context
export interface LibraryWidgetInfo {
  id: string;
  name: string;
  description?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

// Widget category definition
export interface WidgetCategory {
  id: string;
  icon: string;
  match: (id: string) => boolean;
}

// AI suggested connection
export interface AISuggestedConnection {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
  reason: string;
}

// Library stats type
export interface LibraryStats {
  total: number;
  averageQuality: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
}

// Widget Lab props
export interface WidgetLabProps {
  runtime: RuntimeContext;
  onSwitchToCanvas?: () => void;
}

// Pipeline Builder Section props
export interface PipelineBuilderSectionProps {
  libraryWidgets: LibraryWidgetInfo[];
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
  error: string | null;
}

// Widget Generator Form props
export interface WidgetGeneratorFormProps {
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
  selectedTemplate: string;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  complexity: string;
  setComplexity: React.Dispatch<React.SetStateAction<string>>;
  stylePreset: string;
  setStylePreset: React.Dispatch<React.SetStateAction<string>>;
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  selectedPipeline: string;
  setSelectedPipeline: React.Dispatch<React.SetStateAction<string>>;
  pipelines: Pipeline[];
  features: Record<string, boolean>;
  setFeatures: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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

// Drafts Tab props
export interface DraftsTabProps {
  drafts: DraftWidget[];
  previewDraft: DraftWidget | null;
  setPreviewDraft: React.Dispatch<React.SetStateAction<DraftWidget | null>>;
  showCodeView: boolean;
  setShowCodeView: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingToLibrary: boolean;
  onSaveToLibrary: (draft: DraftWidget) => Promise<void>;
  onDeleteDraft: (draftId: string) => void;
}

// Upload Tab props
export interface UploadTabProps {
  labManifest: WidgetManifest | null;
  setLabManifest: React.Dispatch<React.SetStateAction<WidgetManifest | null>>;
  labFiles: File[];
  setLabFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

// Widget categories constant
export const WIDGET_CATEGORIES: WidgetCategory[] = [
  { id: 'Pipeline', icon: '🔗', match: (id: string) => id.includes('pipeline') || id.includes('button') || id.includes('timer') || id.includes('progress') || id.includes('text') },
  { id: 'Vector', icon: '🎨', match: (id: string) => id.includes('vector') || id.includes('shape') || id.includes('canvas') || id.includes('layer') || id.includes('transform') || id.includes('export') },
  { id: 'Farm', icon: '🌱', match: (id: string) => id.includes('farm') || id.includes('crop') || id.includes('seed') || id.includes('sprinkler') || id.includes('weather') },
  { id: 'Communication', icon: '📡', match: (id: string) => id.includes('ping') || id.includes('echo') || id.includes('sender') || id.includes('receiver') || id.includes('color-') },
  { id: 'Productivity', icon: '📋', match: (id: string) => id.includes('note') || id.includes('kanban') || id.includes('task') || id.includes('deck') },
  { id: 'Other', icon: '📦', match: () => true },
];
