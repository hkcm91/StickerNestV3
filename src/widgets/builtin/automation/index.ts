/**
 * Automation Widgets
 *
 * Backend pipeline components for AI-powered design generation.
 * These widgets handle the processing logic and can be reused
 * across different project types (business cards, tarot, flyers, etc.)
 *
 * Widget Types:
 * - Automation Widgets: Processing pipeline (TemplateEngine, AIGenerator, Compositor)
 * - System Widgets: Pipeline owner control panels (TemplateManager, AIConfigurator, PipelineController)
 */

import type { BuiltinWidget } from '../types';

// Automation Widget imports
import { TemplateEngineWidget } from './TemplateEngineWidget';
import { AIImageGeneratorWidget } from './AIImageGeneratorWidget';
import { CompositorWidget } from './CompositorWidget';
import { TemplateLoaderWidget } from './TemplateLoaderWidget';

// System Widget imports (Pipeline Owner Control Panels)
import { TemplateManagerWidget } from './TemplateManagerWidget';
import { AIConfiguratorWidget } from './AIConfiguratorWidget';
import { PipelineControllerWidget } from './PipelineControllerWidget';

// Type exports
export * from './types';

// Reactive template engine exports
export * from './ReactiveTemplateEngine';

// Widget exports
export {
  // Automation Widgets
  TemplateEngineWidget,
  AIImageGeneratorWidget,
  CompositorWidget,
  TemplateLoaderWidget,
  // System Widgets
  TemplateManagerWidget,
  AIConfiguratorWidget,
  PipelineControllerWidget,
};

/**
 * Automation widgets registry (processing pipeline)
 */
export const AUTOMATION_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.template-engine': TemplateEngineWidget,
  'stickernest.ai-image-generator': AIImageGeneratorWidget,
  'stickernest.compositor': CompositorWidget,
  'stickernest.template-loader': TemplateLoaderWidget,
};

/**
 * System widgets registry (pipeline owner control panels)
 */
export const SYSTEM_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.template-manager': TemplateManagerWidget,
  'stickernest.ai-configurator': AIConfiguratorWidget,
  'stickernest.pipeline-controller': PipelineControllerWidget,
};

/**
 * All backend widgets (automation + system)
 */
export const ALL_BACKEND_WIDGETS: Record<string, BuiltinWidget> = {
  ...AUTOMATION_WIDGETS,
  ...SYSTEM_WIDGETS,
};

/**
 * Get all automation widget manifests
 */
export function getAutomationManifests() {
  return Object.values(AUTOMATION_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is an automation widget
 */
export function isAutomationWidget(id: string): boolean {
  return id in AUTOMATION_WIDGETS;
}
