/**
 * StickerNest v2 - AI Widget Generator V2.0 Prompt Builder
 * Constructs optimized prompts for widget generation
 */

import type {
  GenerationRequest,
  ComplexityLevel,
  StylePreset,
  FeatureRequirements,
} from './types';
import {
  IMPROVED_SYSTEM_PROMPT,
  getComplexityGuidelines,
  getStyleGuidelines,
} from '../../ai/prompts/ImprovedWidgetPrompt';
import { enhancePrompt, getWidgetFamiliesSummary } from '../../ai/PromptEnhancer';

// ============================================
// System Prompt Components
// ============================================

const OUTPUT_FORMAT = `
## Output Format
Return ONLY valid JSON with these fields:
\`\`\`json
{
  "manifest": {
    "id": "unique-kebab-case-id",
    "name": "Widget Display Name",
    "version": "1.0.0",
    "kind": "2d",
    "entry": "index.html",
    "description": "Brief description",
    "capabilities": { "draggable": true, "resizable": true, "rotatable": false },
    "events": {
      "emits": ["namespace:event-name"],
      "listens": ["namespace:event-name"]
    },
    "inputs": { "input-name": { "type": "event", "description": "..." } },
    "outputs": { "output-name": { "type": "event", "description": "..." } }
  },
  "html": "<!DOCTYPE html>...",
  "explanation": "Brief explanation of the widget"
}
\`\`\`

CRITICAL - MUST INCLUDE:
1. Return ONLY the JSON object - no markdown, no extra text
2. HTML must be complete with DOCTYPE, head, body, styles, script
3. Use StickerNest theme colors (dark background, light text)
4. **READY SIGNAL** - At the end of your script, ALWAYS include:
   \`window.parent.postMessage({ type: 'READY' }, '*');\`
   This is REQUIRED for the widget to work. Without it, the widget will never load.
5. WidgetAPI initialization pattern - wait for window.WidgetAPI before using it
6. Events must use namespace:action format (e.g., "counter:changed")
`;

// ============================================
// Prompt Builder Class
// ============================================

export class PromptBuilder {
  /**
   * Build complete generation prompt
   */
  buildGenerationPrompt(request: GenerationRequest): string {
    const {
      description,
      mode,
      complexity = 'standard',
      stylePreset = 'polished',
      features = {},
      widgetFamily,
      inputEvents = [],
      outputEvents = [],
      additionalInstructions,
      imageReference,
    } = request;

    // Enhance the description with widget family context
    const enhanced = enhancePrompt(description, widgetFamily);

    // Build sections
    const sections: string[] = [
      this.buildUserRequest(enhanced.enhancedDescription, mode),
      this.buildComplexitySection(complexity),
      this.buildStyleSection(stylePreset),
      this.buildFeatureSection(features),
      this.buildIOSection(
        inputEvents.length > 0 ? inputEvents : enhanced.suggestedEvents.listens,
        outputEvents.length > 0 ? outputEvents : enhanced.suggestedEvents.emits
      ),
    ];

    // Add widget family context
    if (enhanced.detectedFamily) {
      sections.push(this.buildFamilyContext(enhanced.detectedFamily, enhanced.technicalNotes));
    }

    // Add image reference section
    if (imageReference) {
      sections.push(this.buildImageReferenceSection(imageReference));
    }

    // Add additional instructions
    if (additionalInstructions) {
      sections.push(`## Additional Requirements\n${additionalInstructions}`);
    }

    // Add example based on complexity
    sections.push(this.buildExampleSection(complexity));

    // Add output format
    sections.push(OUTPUT_FORMAT);

    return sections.join('\n\n');
  }

  /**
   * Build system prompt for conversation
   */
  buildSystemPrompt(): string {
    return IMPROVED_SYSTEM_PROMPT + '\n\n' + getWidgetFamiliesSummary();
  }

  /**
   * Build iteration prompt for refining existing widget
   */
  buildIterationPrompt(
    currentHtml: string,
    currentManifest: any,
    feedback: string
  ): string {
    return `# Widget Refinement Request

## Current Widget
Name: ${currentManifest.name || 'Unknown'}
ID: ${currentManifest.id || 'unknown'}

### Current Manifest
\`\`\`json
${JSON.stringify(currentManifest, null, 2)}
\`\`\`

### Current HTML (excerpt - first 2000 chars)
\`\`\`html
${currentHtml.substring(0, 2000)}${currentHtml.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

## Requested Changes
${feedback}

## Instructions
1. Apply the requested changes while preserving working functionality
2. Keep the same widget ID unless explicitly asked to change it
3. Update version to indicate modification (e.g., 1.0.0 -> 1.1.0)
4. Update manifest events if new events are added/removed
5. Maintain all existing features not mentioned in the changes

${OUTPUT_FORMAT}`;
  }

  /**
   * Build variation prompt
   */
  buildVariationPrompt(
    sourceHtml: string,
    sourceManifest: any,
    variationDescription: string
  ): string {
    return `# Widget Variation Request

Create a variation of the following widget based on the description.

## Source Widget
Name: ${sourceManifest.name || 'Unknown'}

### Source Manifest
\`\`\`json
${JSON.stringify(sourceManifest, null, 2)}
\`\`\`

### Source HTML (excerpt)
\`\`\`html
${sourceHtml.substring(0, 1500)}${sourceHtml.length > 1500 ? '\n... (truncated)' : ''}
\`\`\`

## Variation Description
${variationDescription}

## Instructions
1. Create a new widget inspired by the source
2. Give it a NEW unique ID (not the same as source)
3. Apply the requested variations
4. Maintain core functionality unless asked to change it
5. Feel free to enhance visual styling

${OUTPUT_FORMAT}`;
  }

  // ============================================
  // Private Section Builders
  // ============================================

  private buildUserRequest(description: string, mode: string): string {
    const modeContext = {
      new: 'Create a brand new widget',
      variation: 'Create a variation of an existing widget',
      iterate: 'Refine and improve the widget',
      template: 'Generate from template',
    };

    return `# Widget Generation Request

## Mode
${modeContext[mode as keyof typeof modeContext] || 'Create a widget'}

## Description
${description}`;
  }

  private buildComplexitySection(complexity: ComplexityLevel): string {
    const guidelines = getComplexityGuidelines(complexity);
    return `## Complexity Level: ${complexity.toUpperCase()}
${guidelines}`;
  }

  private buildStyleSection(style: StylePreset): string {
    const guidelines = getStyleGuidelines(style);
    return `## Visual Style: ${style.toUpperCase()}
${guidelines}`;
  }

  private buildFeatureSection(features: FeatureRequirements): string {
    const requirements: string[] = [];

    // Always include basics
    requirements.push('- Clear visual feedback for all actions');
    requirements.push('- Proper WidgetAPI initialization with retry pattern');
    requirements.push('- Event emission for meaningful state changes');

    if (features.animations !== false) {
      requirements.push('- Smooth CSS transitions on interactive elements');
    }
    if (features.microInteractions !== false) {
      requirements.push('- Hover effects, click feedback, focus states');
    }
    if (features.loadingStates) {
      requirements.push('- Loading spinners or skeleton screens');
    }
    if (features.errorHandling) {
      requirements.push('- Error state UI with clear messaging');
    }
    if (features.keyboardShortcuts) {
      requirements.push('- Keyboard shortcuts for main actions');
    }
    if (features.responsive) {
      requirements.push('- Flexible layout adapting to container size');
    }
    if (features.accessibility) {
      requirements.push('- ARIA labels, semantic HTML, keyboard nav');
    }
    if (features.persistence) {
      requirements.push('- State persistence via WidgetAPI.setState/getState');
    }
    if (features.soundEffects) {
      requirements.push('- Optional audio feedback (mutable)');
    }

    return `## Required Features
${requirements.join('\n')}`;
  }

  private buildIOSection(inputs: string[], outputs: string[]): string {
    let section = '## Widget I/O\n';

    if (inputs.length > 0) {
      section += '\n### Input Events (Must Listen For)\n';
      inputs.forEach(input => {
        section += `- \`${input}\`: Handle via window.WidgetAPI.onEvent('${input}', handler)\n`;
      });
    }

    if (outputs.length > 0) {
      section += '\n### Output Events (Must Emit)\n';
      outputs.forEach(output => {
        section += `- \`${output}\`: Emit via window.WidgetAPI.emitEvent({ type: '${output}', scope: 'canvas', payload: {...} })\n`;
      });
    }

    if (inputs.length === 0 && outputs.length === 0) {
      section += '\nDefine appropriate inputs and outputs based on the widget functionality.\n';
      section += 'Use namespace:action format for event names.\n';
    }

    return section;
  }

  private buildFamilyContext(family: string, notes: string[]): string {
    return `## Widget Family Context
This widget belongs to the "${family}" family.

### Technical Notes
${notes.map(n => `- ${n}`).join('\n')}`;
  }

  private buildImageReferenceSection(imageRef: {
    url: string;
    extractColors?: boolean;
    extractLayout?: boolean;
  }): string {
    let section = `## Design Reference
An image reference has been provided for design inspiration.`;

    if (imageRef.extractColors) {
      section += '\n- Extract and use color palette from the reference';
    }
    if (imageRef.extractLayout) {
      section += '\n- Follow similar layout structure to the reference';
    }

    return section;
  }

  private buildExampleSection(complexity: ComplexityLevel): string {
    // Provide a concise example based on complexity
    if (complexity === 'basic') {
      return `## Example Structure
A basic widget should have:
- ~50-100 lines of code
- Simple, single-purpose UI
- Basic WidgetAPI integration
- Clean, minimal styling`;
    }

    return `## Example Structure
A ${complexity} widget should have:
- Complete feature implementation
- Polished UI with proper spacing and colors
- Full WidgetAPI integration with state persistence
- Event emission for meaningful interactions
- Error handling for edge cases`;
  }
}

// ============================================
// Singleton Export
// ============================================

let promptBuilderInstance: PromptBuilder | null = null;

export function getPromptBuilder(): PromptBuilder {
  if (!promptBuilderInstance) {
    promptBuilderInstance = new PromptBuilder();
  }
  return promptBuilderInstance;
}
