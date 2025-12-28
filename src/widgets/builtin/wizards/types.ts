/**
 * Wizard Widget Types
 *
 * Types for the UI wizard layer that provides skinnable
 * front-ends for automation pipelines.
 */

// =============================================================================
// Wizard Step Types
// =============================================================================

export type WizardStepType =
  | 'info-form'
  | 'image-upload'
  | 'style-config'
  | 'template-picker'
  | 'design-picker'
  | 'final-preview'
  | 'loading';

export interface WizardStepConfig {
  id: string;
  type: WizardStepType;
  title: string;
  subtitle?: string;
  required?: boolean;
  enabled?: boolean;
  skipCondition?: string; // JS expression for conditional skip
}

export interface WizardSchema {
  id: string;
  name: string;
  description?: string;
  projectType: string; // 'business-card', 'tarot', etc.
  steps: WizardStepConfig[];
  theme?: WizardTheme;
}

// =============================================================================
// Wizard State Types
// =============================================================================

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  stepId: string;
  canGoNext: boolean;
  canGoPrev: boolean;
  isComplete: boolean;
  isGenerating: boolean;
}

export interface WizardData {
  // User Info
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  businessName?: string;
  jobTitle?: string;
  address?: string;

  // Style Config
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  stylePrompt?: string;
  avoidPrompt?: string;

  // Template
  templateId?: string;

  // Uploads
  logo?: UploadedFile;
  photo?: UploadedFile;
  referenceImage?: UploadedFile;

  // Generation
  selectedDesignIndex?: number;
  generatedDesigns?: GeneratedDesign[];
  finalDesign?: GeneratedDesign;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  width?: number;
  height?: number;
}

export interface GeneratedDesign {
  id: string;
  imageUrl: string;
  imageData?: string;
  seed: number;
  timestamp: number;
}

// =============================================================================
// Form Field Types
// =============================================================================

export type FormFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'color'
  | 'file';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
  expandable?: boolean; // Show in "More Fields" section
  options?: { label: string; value: string }[]; // For select
}

export interface FormSection {
  id: string;
  title?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// =============================================================================
// Theme Types
// =============================================================================

export interface WizardTheme {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;

  // Typography
  fontFamily: string;
  headingFontFamily?: string;

  // Sizing
  borderRadius: string;
  buttonRadius: string;
  inputRadius: string;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const DEFAULT_WIZARD_THEME: WizardTheme = {
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#1e293b',
  textSecondaryColor: '#64748b',
  borderColor: '#e2e8f0',
  errorColor: '#ef4444',
  successColor: '#22c55e',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  borderRadius: '12px',
  buttonRadius: '9999px',
  inputRadius: '8px',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

// =============================================================================
// Event Types
// =============================================================================

export interface WizardEvents {
  'wizard:step.changed': WizardState;
  'wizard:data.updated': { field: string; value: any };
  'wizard:data.collected': WizardData;
  'wizard:complete': WizardData;
  'wizard:cancel': void;
  'wizard:generate.start': { templateId: string; data: WizardData };
  'wizard:generate.complete': { designs: GeneratedDesign[] };
  'wizard:export.request': { format: 'png' | 'pdf' };
}

// =============================================================================
// Preset Configurations
// =============================================================================

export const BUSINESS_CARD_FORM_FIELDS: FormField[] = [
  { id: 'fullName', label: 'Name', type: 'text', placeholder: 'John Doe', required: true },
  { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(123) 456-7890' },
  { id: 'email', label: 'Email Address', type: 'email', placeholder: 'email@example.com' },
  { id: 'businessName', label: 'Business', type: 'text', placeholder: 'Your Business Name' },
  { id: 'jobTitle', label: 'Job Title', type: 'text', placeholder: 'CEO / Designer / etc.', expandable: true },
  { id: 'website', label: 'Website', type: 'url', placeholder: 'www.example.com', expandable: true },
  { id: 'address', label: 'Address', type: 'textarea', placeholder: '123 Main St, City, State', expandable: true },
];

export const DEFAULT_COLOR_PALETTES = {
  primary: [
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#10b981', // Emerald
  ],
  secondary: [
    '#f8fafc', // Slate 50
    '#fef3c7', // Amber 100
    '#1e293b', // Slate 800
    '#ffffff', // White
  ],
};
