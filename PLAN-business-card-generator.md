# Business Card Generator - Widget Architecture Plan

## Overview

This plan implements a **two-tier widget system** for AI-powered design generation:

1. **UI Widgets** - User-facing wizard steps (skinnable, reusable front-ends)
2. **Automation Widgets** - Backend pipeline components (AI generation, composition)

The architecture enables **pipeline reusability** - the same automation widgets can power business cards, tarot cards, birthday cards, flyers, and more. UI widgets serve as "skins" that connect to automation pipelines.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI WIDGETS (Skin Layer)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Info    │→ │  Image   │→ │  Style   │→ │ Template │→ │  Design  │      │
│  │  Form    │  │  Upload  │  │  Config  │  │  Picker  │  │  Picker  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │             │             │             │             │
│       └─────────────┴─────────────┴─────────────┴─────────────┘             │
│                                   │                                         │
│                      [Wizard Controller Widget]                             │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │ Pipeline Events
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATION WIDGETS (Engine Layer)                    │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ Template Engine │ →  │  AI Image Gen   │ →  │   Compositor    │         │
│  │                 │    │   (Replicate)   │    │                 │         │
│  │ • Prompt build  │    │                 │    │ • Overlay text  │         │
│  │ • Mask JSON     │    │ • SDXL/Flux     │    │ • Generate PDF  │         │
│  │ • Layout zones  │    │ • Img2Img       │    │ • Export assets │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mask JSON Schema Design

The template system uses **black/white mask images** encoded as JSON:

```typescript
interface TemplateMask {
  id: string;
  name: string;
  category: 'business-card' | 'tarot' | 'birthday-card' | 'flyer' | 'custom';
  dimensions: {
    width: number;      // px
    height: number;     // px
    dpi: number;        // for print (300 default)
  };

  // Zones define content areas (rendered as black in mask)
  zones: ContentZone[];

  // AI prompt template with {{variable}} placeholders
  promptTemplate: string;

  // Negative prompt for things to avoid
  negativePromptBase: string;

  // Style presets
  styleHints: string[];

  // Preview thumbnail
  thumbnail?: string;
}

interface ContentZone {
  id: string;
  type: 'text' | 'image' | 'logo' | 'qr';
  bounds: {
    x: number;          // percentage or px
    y: number;
    width: number;
    height: number;
  };

  // For text zones
  textConfig?: {
    fieldMapping: string;   // maps to form field (e.g., 'fullName', 'email')
    fontSize: number;
    fontWeight: 'normal' | 'bold' | 'light';
    alignment: 'left' | 'center' | 'right';
    color: string;          // CSS color or 'primary' | 'secondary'
  };

  // For image/logo zones
  imageConfig?: {
    fit: 'contain' | 'cover' | 'fill';
    fieldMapping: string;   // maps to uploaded image field
  };

  // Mask rendering
  maskValue: 0 | 255;       // 0 = black (content), 255 = white (AI fills)
}
```

### Mask Generation Logic

```
White areas (255) = AI generates design/background
Black areas (0)   = Reserved for text/logo overlay (AI avoids)
```

This tells the AI: "Generate beautiful design in white areas, leave black areas clean for text placement"

---

## Part 1: Automation Widgets (Engine Layer)

### 1.1 Create Automation Widget Category

**Location:** `src/widgets/builtin/automation/`

**Files to create:**
- `index.ts` - Automation widget registry and exports
- `types.ts` - Shared types for automation widgets

### 1.2 Template Engine Widget

**File:** `src/widgets/builtin/automation/TemplateEngineWidget.ts`

**Purpose:** Converts user selections + template into AI-ready prompt and mask

**Inputs:**
| Port | Type | Description |
|------|------|-------------|
| `template.select` | string | Template ID to use |
| `user.data` | object | Form data (name, email, etc.) |
| `style.config` | object | Colors, style prompt, avoid list |
| `image.upload` | object | User-uploaded logo/photo |

**Outputs:**
| Port | Type | Description |
|------|------|-------------|
| `prompt.ready` | object | `{ prompt, negativePrompt, seed }` |
| `mask.ready` | object | Mask JSON with zones |
| `layout.ready` | object | Full layout config for compositor |

**State:**
- Current template
- Computed prompt
- Generated mask

### 1.3 AI Image Generator Widget

**File:** `src/widgets/builtin/automation/AIImageGeneratorWidget.ts`

**Purpose:** Calls AI image generation API (Replicate initially, designed for multi-provider)

**Inputs:**
| Port | Type | Description |
|------|------|-------------|
| `prompt.generate` | object | Prompt + settings from Template Engine |
| `mask.input` | object | Mask for inpainting/composition |
| `config.provider` | string | 'replicate' | 'openai' | 'gemini' | 'banana' |
| `trigger.generate` | trigger | Start generation |
| `trigger.regenerate` | trigger | Generate new variations |

**Outputs:**
| Port | Type | Description |
|------|------|-------------|
| `image.generated` | object | `{ imageUrl, imageData, metadata }` |
| `image.batch` | array | Multiple generated options |
| `status.progress` | object | `{ stage, percent, message }` |
| `error.occurred` | object | Error details |

**Provider Abstraction:**
```typescript
interface AIProvider {
  id: string;
  name: string;
  generate(config: GenerationConfig): Promise<GenerationResult>;
  getModels(): ModelInfo[];
}

// Initial implementation: Replicate with SDXL/Flux
// Future: OpenAI DALL-E, Gemini, Banana, GPT-Flash
```

### 1.4 Compositor Widget

**File:** `src/widgets/builtin/automation/CompositorWidget.ts`

**Purpose:** Combines AI-generated image with user text/logos for final output

**Inputs:**
| Port | Type | Description |
|------|------|-------------|
| `image.base` | object | AI-generated background |
| `layout.zones` | object | Zone definitions with text config |
| `user.data` | object | Actual text values to overlay |
| `trigger.compose` | trigger | Start composition |

**Outputs:**
| Port | Type | Description |
|------|------|-------------|
| `image.composed` | object | Final composed image |
| `pdf.ready` | object | Editable PDF with text layers |
| `export.package` | object | All assets (PNG, PDF, SVG) |
| `status.progress` | object | Composition progress |

**PDF Generation:**
- Uses canvas for initial composition
- Exports as PDF with editable text layers (using jsPDF or similar)
- Text remains vector for user editing

---

## Part 2: Template System & Initial Templates

### 2.1 Template Registry

**File:** `src/pipelines/templates/index.ts`

**Structure:**
```typescript
interface TemplateRegistry {
  categories: TemplateCategory[];
  templates: Record<string, TemplateMask>;
  getByCategory(category: string): TemplateMask[];
  getById(id: string): TemplateMask | undefined;
}
```

### 2.2 Business Card Templates (4 minimum)

**Location:** `src/pipelines/templates/businessCard/`

#### Template 1: "Minimal Modern"
- Clean white background zone
- Left-aligned text zones
- Logo in top-right corner
- Prompt: "minimalist professional business card design, clean geometric patterns, subtle gradient, {{primaryColor}} accent"

#### Template 2: "Bold Creative"
- Dramatic diagonal split design
- Bold typography zone
- Creative image zone
- Prompt: "creative artistic business card, bold colors, abstract shapes, {{stylePrompt}}, professional"

#### Template 3: "Corporate Classic"
- Traditional centered layout
- Company logo prominent
- Formal text arrangement
- Prompt: "corporate professional business card, elegant subtle pattern, {{primaryColor}} and {{secondaryColor}} color scheme"

#### Template 4: "Photo Feature"
- Large photo/image zone
- Overlay text with semi-transparent backing
- Modern asymmetric layout
- Prompt: "modern photo business card design, stylish photo frame, {{stylePrompt}}"

### 2.3 Template Mask JSON Files

Each template includes:
- `{template-id}.json` - Full template config
- `{template-id}.mask.png` - Pre-rendered mask image (for AI)
- `{template-id}.thumb.png` - Preview thumbnail

---

## Part 3: UI Widgets (Skin Layer)

### 3.1 Create UI Widget Category for Wizards

**Location:** `src/widgets/builtin/wizards/`

### 3.2 Wizard Controller Widget

**File:** `src/widgets/builtin/wizards/WizardControllerWidget.ts`

**Purpose:** Orchestrates multi-step wizard flow, manages state between steps

**Inputs:**
| Port | Type | Description |
|------|------|-------------|
| `config.schema` | object | Wizard step definitions |
| `step.goto` | number | Jump to specific step |
| `step.next` | trigger | Advance to next step |
| `step.prev` | trigger | Go to previous step |
| `data.update` | object | Partial data update |

**Outputs:**
| Port | Type | Description |
|------|------|-------------|
| `step.changed` | object | `{ currentStep, totalSteps, stepId }` |
| `data.collected` | object | All collected wizard data |
| `wizard.complete` | object | Final submission data |
| `preview.update` | object | Live preview data |

### 3.3 Info Form Step Widget

**File:** `src/widgets/builtin/wizards/InfoFormStepWidget.ts`

**UI Features:**
- Dynamic form fields based on template requirements
- Real-time validation
- "More Fields" expandable section
- Live preview sync

**Fields:**
- Name (required)
- Phone Number (with formatting)
- Email Address (validated)
- Business/Company Name
- Job Title (expandable)
- Website (expandable)
- Address (expandable)

### 3.4 Image Upload Step Widget

**File:** `src/widgets/builtin/wizards/ImageUploadStepWidget.ts`

**UI Features:**
- Drag & drop zone
- File browser button
- Image preview with crop controls
- Background removal option (future AI feature)
- Multiple image slots (logo, photo, background)

### 3.5 Style Config Step Widget

**File:** `src/widgets/builtin/wizards/StyleConfigStepWidget.ts`

**UI Features:**
- Primary color palette (clickable swatches)
- Secondary color palette
- Style prompt text area
- "What to Avoid" text area
- Reference image upload
- AI style suggestions (future)

### 3.6 Template Picker Step Widget

**File:** `src/widgets/builtin/wizards/TemplatePickerStepWidget.ts`

**UI Features:**
- Template grid with thumbnails
- Category filters
- Template preview on hover
- Selected state indicator

### 3.7 Design Picker Step Widget

**File:** `src/widgets/builtin/wizards/DesignPickerStepWidget.ts`

**UI Features:**
- 2x2 grid of generated designs
- "Generate New Designs" button
- Selection highlight
- Zoom/preview on click
- Loading state with progress

### 3.8 Final Preview Widget

**File:** `src/widgets/builtin/wizards/FinalPreviewWidget.ts`

**UI Features:**
- Full-size design preview
- "Edit Design" button (opens inline editor)
- Download button (PNG, PDF options)
- Share/export options
- Print specifications display

### 3.9 Loading/Progress Widget

**File:** `src/widgets/builtin/wizards/LoadingProgressWidget.ts`

**UI Features:**
- Animated loading indicator
- Stage-aware messages ("Generating...", "Finalizing...", "Enhancing...")
- Progress bar
- Cancel option

---

## Part 4: Integration & Pipeline Configuration

### 4.1 Business Card Pipeline Template

**File:** `src/pipelines/presets/business-card-pipeline.json`

```json
{
  "id": "business-card-generator",
  "name": "Business Card Generator Pipeline",
  "description": "Complete business card generation flow",
  "nodes": [
    { "id": "wizard", "widgetId": "stickernest.wizard-controller" },
    { "id": "template-engine", "widgetId": "stickernest.template-engine" },
    { "id": "image-gen", "widgetId": "stickernest.ai-image-generator" },
    { "id": "compositor", "widgetId": "stickernest.compositor" }
  ],
  "connections": [
    // Wizard -> Template Engine
    { "source": "wizard:data.collected", "target": "template-engine:user.data" },
    { "source": "wizard:template.selected", "target": "template-engine:template.select" },
    { "source": "wizard:style.config", "target": "template-engine:style.config" },

    // Template Engine -> Image Generator
    { "source": "template-engine:prompt.ready", "target": "image-gen:prompt.generate" },
    { "source": "template-engine:mask.ready", "target": "image-gen:mask.input" },

    // Image Generator -> Compositor
    { "source": "image-gen:image.generated", "target": "compositor:image.base" },
    { "source": "template-engine:layout.ready", "target": "compositor:layout.zones" },
    { "source": "wizard:data.collected", "target": "compositor:user.data" }
  ]
}
```

### 4.2 Widget Registry Updates

**Update:** `src/widgets/builtin/index.ts`

Add new widget categories:
- Automation widgets (4)
- Wizard UI widgets (8)

### 4.3 Replicate API Integration

**File:** `src/services/ai/replicate.ts`

```typescript
interface ReplicateConfig {
  apiKey: string;
  model: string;  // 'sdxl' | 'flux' | 'kandinsky'
}

class ReplicateService implements AIProvider {
  async generate(config: GenerationConfig): Promise<GenerationResult>;
  async inpaint(config: InpaintConfig): Promise<GenerationResult>;
  async upscale(imageUrl: string): Promise<string>;
}
```

### 4.4 Environment Configuration

**Update:** `.env.example`

```
REPLICATE_API_TOKEN=your_token_here
AI_PROVIDER=replicate
```

---

## File Structure Summary

```
src/
├── widgets/
│   └── builtin/
│       ├── automation/                    # NEW: Automation widgets
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── TemplateEngineWidget.ts
│       │   ├── AIImageGeneratorWidget.ts
│       │   └── CompositorWidget.ts
│       │
│       ├── wizards/                       # NEW: UI wizard widgets
│       │   ├── index.ts
│       │   ├── WizardControllerWidget.ts
│       │   ├── InfoFormStepWidget.ts
│       │   ├── ImageUploadStepWidget.ts
│       │   ├── StyleConfigStepWidget.ts
│       │   ├── TemplatePickerStepWidget.ts
│       │   ├── DesignPickerStepWidget.ts
│       │   ├── FinalPreviewWidget.ts
│       │   └── LoadingProgressWidget.ts
│       │
│       └── index.ts                       # UPDATE: Register new widgets
│
├── pipelines/
│   ├── templates/
│   │   ├── index.ts                       # Template registry
│   │   ├── types.ts                       # Template types
│   │   └── businessCard/
│   │       ├── minimal-modern.json
│   │       ├── bold-creative.json
│   │       ├── corporate-classic.json
│   │       └── photo-feature.json
│   │
│   └── presets/
│       └── business-card-pipeline.json
│
└── services/
    └── ai/
        ├── index.ts                       # AI provider factory
        ├── types.ts                       # Provider interfaces
        └── replicate.ts                   # Replicate implementation
```

---

## Implementation Order

### Phase 1: Foundation (Automation Layer)
1. Create `automation/` directory structure and types
2. Implement Template Engine Widget
3. Implement AI Image Generator Widget (with Replicate)
4. Implement Compositor Widget
5. Create 4 business card templates

### Phase 2: UI Layer
1. Create `wizards/` directory structure
2. Implement Wizard Controller Widget
3. Implement Info Form Step Widget
4. Implement Image Upload Step Widget
5. Implement Style Config Step Widget

### Phase 3: UI Completion
1. Implement Template Picker Step Widget
2. Implement Design Picker Step Widget
3. Implement Final Preview Widget
4. Implement Loading Progress Widget

### Phase 4: Integration
1. Register all widgets in index.ts
2. Create business card pipeline preset
3. Wire up complete flow
4. Add environment configuration
5. Test end-to-end pipeline

---

## Success Criteria

- [ ] Automation widgets work independently and can be reused
- [ ] UI widgets are skinnable and template-driven
- [ ] Pipeline connects UI -> Automation seamlessly
- [ ] 4 business card templates available
- [ ] Replicate integration generates real images
- [ ] PDF export with editable text layers
- [ ] Architecture supports future project types (tarot, flyers, etc.)

---

## Future Extensibility

This architecture enables:

1. **New Project Types**: Add templates for tarot cards, birthday cards, flyers
2. **New AI Providers**: Plug in Gemini, Banana, GPT-Flash via provider interface
3. **Custom Skins**: Creators can build custom UI widgets that connect to same automation
4. **Template Marketplace**: Users can share/sell template packs
5. **Batch Processing**: Run automation widgets without UI for bulk generation
