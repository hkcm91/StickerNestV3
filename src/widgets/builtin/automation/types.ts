/**
 * Automation Widget Types
 *
 * Core types for the automation widget layer that powers AI-driven
 * design generation pipelines (business cards, tarot, flyers, etc.)
 */

// =============================================================================
// Template & Mask Types
// =============================================================================

export type ProjectCategory =
  | 'business-card'
  | 'tarot'
  | 'birthday-card'
  | 'flyer'
  | 'poster'
  | 'social-media'
  | 'custom';

export type ZoneType = 'text' | 'image' | 'logo' | 'qr' | 'shape';

export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';

export type TextAlignment = 'left' | 'center' | 'right';

export type ImageFit = 'contain' | 'cover' | 'fill' | 'none';

export interface TemplateDimensions {
  width: number;      // pixels
  height: number;     // pixels
  dpi: number;        // for print quality (300 default)
  bleed?: number;     // bleed area in pixels
}

export interface ZoneBounds {
  x: number;          // percentage (0-100) or pixels
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'px';
  rotation?: number;  // degrees
}

export interface TextZoneConfig {
  fieldMapping: string;     // maps to form field (e.g., 'fullName', 'email')
  fontSize: number;
  fontFamily?: string;
  fontWeight: FontWeight;
  alignment: TextAlignment;
  lineHeight?: number;
  letterSpacing?: number;
  color: string;            // CSS color or token ('primary', 'secondary', 'accent')
  maxLines?: number;
  overflow?: 'clip' | 'ellipsis' | 'scale';
}

export interface ImageZoneConfig {
  fieldMapping: string;     // maps to uploaded image field
  fit: ImageFit;
  opacity?: number;
  borderRadius?: number;
  filter?: string;          // CSS filter
}

export interface ContentZone {
  id: string;
  type: ZoneType;
  bounds: ZoneBounds;
  zIndex: number;

  // Type-specific configs
  textConfig?: TextZoneConfig;
  imageConfig?: ImageZoneConfig;

  // Mask rendering control
  maskValue: 0 | 255;       // 0 = black (content area), 255 = white (AI fills)
  maskPadding?: number;     // extra padding around zone in mask
}

export interface TemplateMask {
  id: string;
  name: string;
  category: ProjectCategory;
  description?: string;

  dimensions: TemplateDimensions;

  // Content zones define where text/images go
  zones: ContentZone[];

  // AI prompt configuration
  promptTemplate: string;           // with {{variable}} placeholders
  negativePromptBase: string;       // things AI should avoid
  styleHints: string[];             // style keywords

  // Color scheme
  defaultColors: {
    primary: string;
    secondary: string;
    accent?: string;
    background?: string;
    text?: string;
  };

  // Visual assets
  thumbnail?: string;               // base64 or URL
  previewImage?: string;
  maskImage?: string;               // pre-rendered mask as base64

  // Metadata
  author?: string;
  version: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// AI Provider Types
// =============================================================================

export type AIProviderType = 'replicate' | 'openai' | 'gemini' | 'banana' | 'gpt-flash';

export interface GenerationConfig {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
  model?: string;

  // For inpainting/composition
  maskImage?: string;         // base64 or URL
  initImage?: string;         // base64 or URL for img2img
  strength?: number;          // denoising strength for img2img

  // Provider-specific options
  providerOptions?: Record<string, unknown>;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageData?: string;         // base64
  seed?: number;
  metadata?: {
    model: string;
    provider: AIProviderType;
    generationTime: number;
    prompt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface AIProvider {
  id: AIProviderType;
  name: string;
  isConfigured(): boolean;
  generate(config: GenerationConfig): Promise<GenerationResult>;
  generateBatch(config: GenerationConfig, count: number): Promise<GenerationResult[]>;
  getModels(): ModelInfo[];
  estimateCost?(config: GenerationConfig): number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  maxWidth: number;
  maxHeight: number;
  supportsInpainting: boolean;
  supportsImg2Img: boolean;
  defaultSteps: number;
  costPerImage?: number;
}

// =============================================================================
// Pipeline Data Types
// =============================================================================

export interface UserFormData {
  // Common fields
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;

  // Business fields
  businessName?: string;
  jobTitle?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;

  // Social
  linkedin?: string;
  twitter?: string;
  instagram?: string;

  // Custom fields
  [key: string]: string | undefined;
}

export interface StyleConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;

  stylePrompt?: string;       // user's style description
  avoidPrompt?: string;       // what to avoid
  referenceImage?: string;    // base64 or URL

  // Advanced
  mood?: string;
  era?: string;
  industry?: string;
}

export interface UploadedImage {
  id: string;
  fieldName: string;          // 'logo', 'photo', 'background'
  dataUrl: string;            // base64 data URL
  originalName: string;
  mimeType: string;
  width: number;
  height: number;

  // Optional processing
  cropped?: boolean;
  cropBounds?: ZoneBounds;
  backgroundRemoved?: boolean;
}

// =============================================================================
// Template Engine Types
// =============================================================================

export interface TemplateEngineInput {
  templateId: string;
  userData: UserFormData;
  styleConfig: StyleConfig;
  uploadedImages: UploadedImage[];
}

export interface TemplateEngineOutput {
  // For AI Image Generator
  prompt: string;
  negativePrompt: string;
  seed?: number;

  // Mask for composition guidance
  maskData: string;           // base64 PNG
  maskZones: ContentZone[];

  // For Compositor
  layoutConfig: {
    templateId: string;
    dimensions: TemplateDimensions;
    zones: ContentZone[];
    colors: StyleConfig;
    userData: UserFormData;
    images: UploadedImage[];
  };
}

// =============================================================================
// Compositor Types
// =============================================================================

export interface CompositorInput {
  baseImage: string;          // AI-generated background (base64 or URL)
  layoutConfig: TemplateEngineOutput['layoutConfig'];
}

export interface CompositorOutput {
  composedImage: string;      // base64 PNG
  pdfData?: string;           // base64 PDF with editable text

  exportPackage: {
    png: string;
    pngHighRes?: string;
    pdf?: string;
    svg?: string;
  };

  metadata: {
    width: number;
    height: number;
    dpi: number;
    templateId: string;
    generatedAt: string;
  };
}

// =============================================================================
// Progress & Status Types
// =============================================================================

export type GenerationStage =
  | 'idle'
  | 'preparing'
  | 'generating'
  | 'processing'
  | 'compositing'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface ProgressStatus {
  stage: GenerationStage;
  percent: number;            // 0-100
  message: string;
  details?: string;
  estimatedTimeRemaining?: number;  // seconds
}

// =============================================================================
// Widget Event Types
// =============================================================================

export interface TemplateEngineEvents {
  'template:prompt.ready': TemplateEngineOutput;
  'template:mask.ready': { maskData: string; zones: ContentZone[] };
  'template:layout.ready': TemplateEngineOutput['layoutConfig'];
  'template:error': { code: string; message: string };
}

export interface AIGeneratorEvents {
  'aigen:image.generated': GenerationResult;
  'aigen:batch.ready': { images: GenerationResult[]; selected?: number };
  'aigen:progress': ProgressStatus;
  'aigen:error': { code: string; message: string };
}

export interface CompositorEvents {
  'compositor:composed': CompositorOutput;
  'compositor:pdf.ready': { pdfData: string };
  'compositor:progress': ProgressStatus;
  'compositor:error': { code: string; message: string };
}
