/**
 * Template Registry
 *
 * Central registry for all design templates used by automation widgets.
 * Templates define AI prompts, composition masks, and text zone layouts.
 */

import type { TemplateMask, ProjectCategory } from './types';

// Business Card Templates
import minimalModernTemplate from './businessCard/minimal-modern.json';
import boldCreativeTemplate from './businessCard/bold-creative.json';
import corporateClassicTemplate from './businessCard/corporate-classic.json';
import photoFeatureTemplate from './businessCard/photo-feature.json';

/**
 * All available templates indexed by ID
 */
export const TEMPLATES: Record<string, TemplateMask> = {
  // Business Cards
  'minimal-modern': minimalModernTemplate as TemplateMask,
  'bold-creative': boldCreativeTemplate as TemplateMask,
  'corporate-classic': corporateClassicTemplate as TemplateMask,
  'photo-feature': photoFeatureTemplate as TemplateMask,
};

/**
 * Templates grouped by category
 */
export const TEMPLATES_BY_CATEGORY: Record<ProjectCategory, TemplateMask[]> = {
  'business-card': [
    minimalModernTemplate as TemplateMask,
    boldCreativeTemplate as TemplateMask,
    corporateClassicTemplate as TemplateMask,
    photoFeatureTemplate as TemplateMask,
  ],
  'tarot': [],
  'birthday-card': [],
  'flyer': [],
  'poster': [],
  'social-media': [],
  'custom': [],
};

/**
 * Get a template by ID
 */
export function getTemplate(id: string): TemplateMask | undefined {
  return TEMPLATES[id];
}

/**
 * Get all templates for a category
 */
export function getTemplatesByCategory(category: ProjectCategory): TemplateMask[] {
  return TEMPLATES_BY_CATEGORY[category] || [];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateMask[] {
  return Object.values(TEMPLATES);
}

/**
 * Get template IDs for a category
 */
export function getTemplateIds(category?: ProjectCategory): string[] {
  if (category) {
    return TEMPLATES_BY_CATEGORY[category]?.map(t => t.id) || [];
  }
  return Object.keys(TEMPLATES);
}

/**
 * Search templates by tags
 */
export function searchTemplates(tags: string[]): TemplateMask[] {
  const lowerTags = tags.map(t => t.toLowerCase());
  return Object.values(TEMPLATES).filter(template => {
    const templateTags = template.tags?.map(t => t.toLowerCase()) || [];
    return lowerTags.some(tag => templateTags.includes(tag));
  });
}

/**
 * Get template metadata for UI display
 */
export function getTemplateMetadata(id: string): {
  id: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  thumbnail?: string;
  tags?: string[];
} | undefined {
  const template = TEMPLATES[id];
  if (!template) return undefined;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    thumbnail: template.thumbnail,
    tags: template.tags,
  };
}

/**
 * Get all template metadata for category
 */
export function getCategoryTemplateMetadata(category: ProjectCategory) {
  return TEMPLATES_BY_CATEGORY[category]?.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    thumbnail: t.thumbnail,
    tags: t.tags,
  })) || [];
}

// Re-export types
export * from './types';
