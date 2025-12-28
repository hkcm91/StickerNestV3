/**
 * Wizard Widgets
 *
 * UI widgets for multi-step wizard flows. These provide skinnable
 * front-ends that connect to automation pipelines.
 */

import type { BuiltinWidget } from '../types';

// Widget imports
import { BusinessCardGeneratorWidget } from './BusinessCardGeneratorWidget';

// Type exports
export * from './types';

// Widget exports
export { BusinessCardGeneratorWidget };

/**
 * Wizard widgets registry
 */
export const WIZARD_WIDGETS: Record<string, BuiltinWidget> = {
  'stickernest.business-card-generator': BusinessCardGeneratorWidget,
};

/**
 * Get all wizard widget manifests
 */
export function getWizardManifests() {
  return Object.values(WIZARD_WIDGETS).map(w => w.manifest);
}

/**
 * Check if a widget ID is a wizard widget
 */
export function isWizardWidget(id: string): boolean {
  return id in WIZARD_WIDGETS;
}
