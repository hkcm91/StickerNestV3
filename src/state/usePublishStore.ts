/**
 * StickerNest v2 - Publish Store (Zustand)
 * Manages canvas publishing state, SEO settings, and publish workflow
 *
 * ALPHA NOTES:
 * - Integrates with canvas service for persistence
 * - Handles validation before publish
 * - Tracks publish history per canvas
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  CanvasPublishSettings,
  CanvasSEOMetadata,
  PublishStatus,
  PublishValidationResult,
  PublishValidationError,
  PublishValidationWarning,
} from '../types/publish';
import {
  DEFAULT_PUBLISH_SETTINGS,
  DEFAULT_SEO_METADATA,
  validateSlugFormat,
  generateRandomSlug,
  PUBLISH_ERROR_CODES,
  PUBLISH_WARNING_CODES,
} from '../types/publish';
import type { CanvasVisibility, WidgetInstance, Pipeline } from '../types/domain';
import { getCanvasManager } from '../services/canvasManager';

// ==================
// Store State Types
// ==================

export interface PublishState {
  /** Current canvas ID being published */
  currentCanvasId: string | null;
  /** Publish settings being edited (draft state) */
  draftSettings: CanvasPublishSettings;
  /** Original settings (before editing) */
  originalSettings: CanvasPublishSettings | null;
  /** Whether the publish dialog is open */
  isDialogOpen: boolean;
  /** Current step in publish flow */
  currentStep: 'settings' | 'seo' | 'preview' | 'confirm';
  /** Validation result from last check */
  validationResult: PublishValidationResult | null;
  /** Whether currently saving/publishing */
  isPublishing: boolean;
  /** Whether currently validating */
  isValidating: boolean;
  /** Whether checking slug availability */
  isCheckingSlug: boolean;
  /** Slug availability result */
  slugAvailable: boolean | null;
  /** Error message if any */
  error: string | null;
  /** Success message after publish */
  successMessage: string | null;
  /** Generated URL after publish */
  publishedUrl: string | null;
}

// ==================
// Store Actions Types
// ==================

export interface PublishActions {
  // Dialog Management
  /** Open publish dialog for a canvas */
  openDialog: (canvasId: string, existingSettings?: CanvasPublishSettings) => void;
  /** Close publish dialog */
  closeDialog: () => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Go to specific step */
  goToStep: (step: PublishState['currentStep']) => void;

  // Settings Management
  /** Update draft visibility */
  setVisibility: (visibility: CanvasVisibility) => void;
  /** Update draft slug */
  setSlug: (slug: string) => void;
  /** Generate a random slug */
  generateSlug: () => void;
  /** Update password */
  setPassword: (password: string | undefined) => void;
  /** Update allow embed */
  setAllowEmbed: (allow: boolean) => void;

  // SEO Management
  /** Update SEO metadata */
  updateSEO: (updates: Partial<CanvasSEOMetadata>) => void;
  /** Reset SEO to defaults */
  resetSEO: () => void;

  // Validation
  /** Validate current settings */
  validate: (widgets: WidgetInstance[], pipelines: Pipeline[], canvasName: string) => void;
  /** Check slug availability */
  checkSlugAvailability: (slug: string) => Promise<boolean>;

  // Publishing
  /** Publish the canvas with current settings */
  publish: () => Promise<boolean>;
  /** Unpublish the canvas */
  unpublish: () => Promise<boolean>;

  // Utilities
  /** Check if settings have changed */
  hasChanges: () => boolean;
  /** Reset to original settings */
  resetChanges: () => void;
  /** Clear error/success messages */
  clearMessages: () => void;
  /** Full reset */
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialState: PublishState = {
  currentCanvasId: null,
  draftSettings: { ...DEFAULT_PUBLISH_SETTINGS },
  originalSettings: null,
  isDialogOpen: false,
  currentStep: 'settings',
  validationResult: null,
  isPublishing: false,
  isValidating: false,
  isCheckingSlug: false,
  slugAvailable: null,
  error: null,
  successMessage: null,
  publishedUrl: null,
};

// ==================
// Store Creation
// ==================

export const usePublishStore = create<PublishState & PublishActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ==================
      // Dialog Management
      // ==================

      openDialog: (canvasId, existingSettings) => {
        const settings = existingSettings || { ...DEFAULT_PUBLISH_SETTINGS };
        // Generate a slug if none exists and visibility is not private
        if (!settings.slug && settings.visibility !== 'private') {
          settings.slug = generateRandomSlug();
        }
        set({
          currentCanvasId: canvasId,
          draftSettings: { ...settings },
          originalSettings: existingSettings ? { ...existingSettings } : null,
          isDialogOpen: true,
          currentStep: 'settings',
          validationResult: null,
          error: null,
          successMessage: null,
          publishedUrl: null,
          slugAvailable: null,
        }, false, 'openDialog');
      },

      closeDialog: () => {
        set({
          isDialogOpen: false,
          currentCanvasId: null,
          error: null,
          successMessage: null,
        }, false, 'closeDialog');
      },

      nextStep: () => {
        const { currentStep } = get();
        const steps: PublishState['currentStep'][] = ['settings', 'seo', 'preview', 'confirm'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex < steps.length - 1) {
          set({ currentStep: steps[currentIndex + 1] }, false, 'nextStep');
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        const steps: PublishState['currentStep'][] = ['settings', 'seo', 'preview', 'confirm'];
        const currentIndex = steps.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: steps[currentIndex - 1] }, false, 'prevStep');
        }
      },

      goToStep: (step) => {
        set({ currentStep: step }, false, 'goToStep');
      },

      // ==================
      // Settings Management
      // ==================

      setVisibility: (visibility) => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            visibility,
            // Generate slug if changing from private to public/unlisted
            slug: visibility !== 'private' && !state.draftSettings.slug
              ? generateRandomSlug()
              : state.draftSettings.slug,
          },
          slugAvailable: null, // Reset slug check
        }), false, 'setVisibility');
      },

      setSlug: (slug) => {
        // Normalize slug: lowercase, only valid chars
        const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            slug: normalizedSlug,
          },
          slugAvailable: null, // Reset slug check when slug changes
        }), false, 'setSlug');
      },

      generateSlug: () => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            slug: generateRandomSlug(),
          },
          slugAvailable: null,
        }), false, 'generateSlug');
      },

      setPassword: (password) => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            password,
          },
        }), false, 'setPassword');
      },

      setAllowEmbed: (allowEmbed) => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            allowEmbed,
          },
        }), false, 'setAllowEmbed');
      },

      // ==================
      // SEO Management
      // ==================

      updateSEO: (updates) => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            seo: {
              ...state.draftSettings.seo,
              ...updates,
            },
          },
        }), false, 'updateSEO');
      },

      resetSEO: () => {
        set((state) => ({
          draftSettings: {
            ...state.draftSettings,
            seo: { ...DEFAULT_SEO_METADATA },
          },
        }), false, 'resetSEO');
      },

      // ==================
      // Validation
      // ==================

      validate: (widgets, pipelines, canvasName) => {
        set({ isValidating: true }, false, 'validate:start');

        const { draftSettings } = get();
        const errors: PublishValidationError[] = [];
        const warnings: PublishValidationWarning[] = [];

        // Check slug for non-private canvases
        if (draftSettings.visibility !== 'private') {
          if (!draftSettings.slug) {
            errors.push({
              code: PUBLISH_ERROR_CODES.SLUG_REQUIRED,
              message: 'A URL slug is required for public or unlisted canvases',
              field: 'slug',
            });
          } else {
            const slugValidation = validateSlugFormat(draftSettings.slug);
            if (!slugValidation.valid) {
              errors.push({
                code: PUBLISH_ERROR_CODES.SLUG_INVALID,
                message: slugValidation.error || 'Invalid slug format',
                field: 'slug',
              });
            }
          }
        }

        // Check canvas has content
        if (widgets.length === 0) {
          errors.push({
            code: PUBLISH_ERROR_CODES.CANVAS_EMPTY,
            message: 'Canvas must have at least one widget to publish',
          });
        }

        // Check canvas name
        if (!canvasName || canvasName.trim().length === 0) {
          errors.push({
            code: PUBLISH_ERROR_CODES.NAME_REQUIRED,
            message: 'Canvas must have a name to publish',
            field: 'name',
          });
        }

        // Warnings
        if (!draftSettings.seo?.description) {
          warnings.push({
            code: PUBLISH_WARNING_CODES.NO_DESCRIPTION,
            message: 'No description set',
            suggestion: 'Add a description to improve SEO and social sharing',
          });
        }

        if (!draftSettings.seo?.title) {
          warnings.push({
            code: PUBLISH_WARNING_CODES.NO_SEO_TITLE,
            message: 'No custom SEO title set',
            suggestion: 'Canvas name will be used as the page title',
          });
        }

        if (widgets.length > 50) {
          warnings.push({
            code: PUBLISH_WARNING_CODES.MANY_WIDGETS,
            message: `Canvas has ${widgets.length} widgets`,
            suggestion: 'Large canvases may load slowly for viewers',
          });
        }

        // Check for broken pipelines
        const widgetIds = new Set(widgets.map(w => w.id));
        pipelines.forEach(pipeline => {
          if (!pipeline.enabled) return;
          pipeline.connections.forEach(conn => {
            const sourceNode = pipeline.nodes.find(n => n.id === conn.from.nodeId);
            const targetNode = pipeline.nodes.find(n => n.id === conn.to.nodeId);
            if (sourceNode?.widgetInstanceId && !widgetIds.has(sourceNode.widgetInstanceId)) {
              warnings.push({
                code: PUBLISH_WARNING_CODES.BROKEN_PIPELINE,
                message: `Pipeline "${pipeline.name}" has a broken connection`,
                suggestion: 'Some pipeline connections reference missing widgets',
              });
            }
            if (targetNode?.widgetInstanceId && !widgetIds.has(targetNode.widgetInstanceId)) {
              warnings.push({
                code: PUBLISH_WARNING_CODES.BROKEN_PIPELINE,
                message: `Pipeline "${pipeline.name}" has a broken connection`,
                suggestion: 'Some pipeline connections reference missing widgets',
              });
            }
          });
        });

        const result: PublishValidationResult = {
          isValid: errors.length === 0,
          errors,
          warnings,
        };

        set({
          validationResult: result,
          isValidating: false,
        }, false, 'validate:complete');
      },

      checkSlugAvailability: async (slug) => {
        set({ isCheckingSlug: true, slugAvailable: null }, false, 'checkSlug:start');

        try {
          // In ALPHA, we'll do a simple API check
          // For now, simulate the check
          const response = await fetch(`/api/canvas/check-slug?slug=${encodeURIComponent(slug)}`);
          const data = await response.json();
          const available = data.available !== false; // Default to available if API doesn't exist yet

          set({ slugAvailable: available, isCheckingSlug: false }, false, 'checkSlug:complete');
          return available;
        } catch {
          // If API doesn't exist yet, assume available
          set({ slugAvailable: true, isCheckingSlug: false }, false, 'checkSlug:error');
          return true;
        }
      },

      // ==================
      // Publishing
      // ==================

      publish: async () => {
        const { currentCanvasId, draftSettings, validationResult } = get();

        if (!currentCanvasId) {
          set({ error: 'No canvas selected' }, false, 'publish:error');
          return false;
        }

        if (!validationResult?.isValid) {
          set({ error: 'Please fix validation errors before publishing' }, false, 'publish:error');
          return false;
        }

        set({ isPublishing: true, error: null }, false, 'publish:start');

        try {
          // Use canvasManager which works with Supabase (no backend auth required)
          const manager = getCanvasManager('current');
          const result = await manager.updateShareSettings(currentCanvasId, {
            visibility: draftSettings.visibility,
            slug: draftSettings.slug,
            password: draftSettings.password,
            allowEmbed: draftSettings.allowEmbed,
          });

          if (!result.success) {
            throw new Error(result.error || 'Failed to publish canvas');
          }

          const publishedUrl = result.data?.url || `/c/${draftSettings.slug}`;

          set({
            isPublishing: false,
            draftSettings: {
              ...draftSettings,
              status: 'published',
              publishedAt: draftSettings.publishedAt || new Date().toISOString(),
              lastPublishedAt: new Date().toISOString(),
            },
            originalSettings: { ...draftSettings, status: 'published' },
            successMessage: 'Canvas published successfully!',
            publishedUrl,
          }, false, 'publish:success');

          return true;
        } catch (err) {
          set({
            isPublishing: false,
            error: err instanceof Error ? err.message : 'Failed to publish canvas',
          }, false, 'publish:error');
          return false;
        }
      },

      unpublish: async () => {
        const { currentCanvasId } = get();

        if (!currentCanvasId) {
          set({ error: 'No canvas selected' }, false, 'unpublish:error');
          return false;
        }

        set({ isPublishing: true, error: null }, false, 'unpublish:start');

        try {
          // Use canvasManager which works with Supabase (no backend auth required)
          const manager = getCanvasManager('current');
          const result = await manager.updateShareSettings(currentCanvasId, {
            visibility: 'private',
          });

          if (!result.success) {
            throw new Error(result.error || 'Failed to unpublish canvas');
          }

          set((state) => ({
            isPublishing: false,
            draftSettings: {
              ...state.draftSettings,
              status: 'unpublished',
              visibility: 'private',
            },
            successMessage: 'Canvas unpublished',
            publishedUrl: null,
          }), false, 'unpublish:success');

          return true;
        } catch (err) {
          set({
            isPublishing: false,
            error: err instanceof Error ? err.message : 'Failed to unpublish canvas',
          }, false, 'unpublish:error');
          return false;
        }
      },

      // ==================
      // Utilities
      // ==================

      hasChanges: () => {
        const { draftSettings, originalSettings } = get();
        if (!originalSettings) return true;
        return JSON.stringify(draftSettings) !== JSON.stringify(originalSettings);
      },

      resetChanges: () => {
        const { originalSettings } = get();
        if (originalSettings) {
          set({
            draftSettings: { ...originalSettings },
            validationResult: null,
            slugAvailable: null,
          }, false, 'resetChanges');
        }
      },

      clearMessages: () => {
        set({ error: null, successMessage: null }, false, 'clearMessages');
      },

      reset: () => {
        set(initialState, false, 'reset');
      },
    }),
    {
      name: 'PublishStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

export const usePublishDialogOpen = () => usePublishStore((s) => s.isDialogOpen);
export const usePublishStep = () => usePublishStore((s) => s.currentStep);
export const usePublishSettings = () => usePublishStore((s) => s.draftSettings);
export const usePublishSEO = () => usePublishStore((s) => s.draftSettings.seo);
export const usePublishValidation = () => usePublishStore((s) => s.validationResult);
export const useIsPublishing = () => usePublishStore((s) => s.isPublishing);
export const usePublishError = () => usePublishStore((s) => s.error);
export const usePublishedUrl = () => usePublishStore((s) => s.publishedUrl);
