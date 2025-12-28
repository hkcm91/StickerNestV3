# AI Widget Generator V2.0 - Development Notes

## Overview
This document captures the analysis and design decisions for the AI Widget Generator V2.0 system in Widget Lab, targeted for ALPHA release.

---

## Existing Infrastructure Audit (Task 1.1)

### Current AI Services (3 Services to Consolidate)

| Service | Location | Lines | Purpose | Reuse? |
|---------|----------|-------|---------|--------|
| `widgetGenerator.ts` | `src/services/` | ~586 | Basic widget generation via Replicate | Partial - protocol docs |
| `aiGeneration.ts` | `src/services/` | ~680 | Multi-provider image/video generation | Reference only |
| `WidgetPipelineAI.ts` | `src/ai/` | ~1030 | Main orchestrator with conversations | Core logic |

### Supporting Infrastructure (Reuse Directly)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `ProtocolEnforcer.ts` | `src/ai/` | **Keep** | Validation + quality scoring (0-100) |
| `DraftManager.ts` | `src/ai/` | **Keep** | Draft storage and versioning |
| `ImprovedWidgetPrompt.ts` | `src/ai/prompts/` | **Keep** | Prompt templates |
| `PromptEnhancer.ts` | `src/ai/` | **Keep** | Widget family detection |
| `AI Providers` | `src/ai/providers/` | **Keep** | Multi-model support |

### Key Findings

1. **Duplicate Protocol Documentation**: Both `widgetGenerator.ts` and `ImprovedWidgetPrompt.ts` have protocol docs
2. **WidgetPipelineAI is too large**: 1030 lines, needs splitting
3. **Missing V2 Features**:
   - Real-time generation progress
   - Image reference support
   - Iterative refinement chat
   - Quality feedback loop

---

## V2.0 Architecture Design

### Module Structure (Keep under 500-600 lines each)

```
src/services/widget-generator-v2/
├── index.ts                    # Main exports
├── types.ts                    # All TypeScript types (~100 lines)
├── AIWidgetGeneratorV2.ts      # Core service class (~400 lines)
├── PromptBuilder.ts            # Prompt construction (~300 lines)
├── ResponseParser.ts           # Parse AI responses (~200 lines)
├── QualityAnalyzer.ts          # Quality scoring (~250 lines)
└── GenerationSession.ts        # Progress tracking (~200 lines)
```

### Integration Points

```
AIWidgetGeneratorV2
    ├── Uses: AI Providers (src/ai/providers/)
    ├── Uses: ProtocolEnforcer (src/ai/ProtocolEnforcer.ts)
    ├── Uses: DraftManager (src/ai/DraftManager.ts)
    └── Uses: ImprovedWidgetPrompt templates
```

### Key V2.0 Features

1. **Multi-Model Support**
   - Claude (Anthropic) - Primary for widget generation
   - GPT-4 (OpenAI) - Alternative
   - Llama (Replicate) - Fallback

2. **Generation Modes**
   - `new` - Fresh widget from description
   - `variation` - Modify existing widget style
   - `iterate` - Chat-based refinement
   - `template` - Start from template

3. **Progress Tracking**
   - Real-time status updates
   - Step-by-step visibility
   - Cancellation support

4. **Quality Feedback**
   - Score (0-100) from ProtocolEnforcer
   - Actionable suggestions
   - Auto-fix common issues

---

## Implementation Notes

### Task 1.2: AIWidgetGeneratorV2 Service

**Core Class Interface:**
```typescript
class AIWidgetGeneratorV2 {
  // Generation
  generate(request: GenerationRequest): Promise<GenerationResult>
  iterate(sessionId: string, feedback: string): Promise<GenerationResult>

  // Progress
  getSession(sessionId: string): GenerationSession
  cancelSession(sessionId: string): void

  // Quality
  analyze(widget: WidgetCode): QualityReport
}
```

**Generation Flow:**
1. Build prompt using PromptBuilder
2. Call AI provider
3. Parse response with ResponseParser
4. Validate with ProtocolEnforcer
5. Score quality with QualityAnalyzer
6. Create draft via DraftManager
7. Return result with suggestions

### Task 1.3: Enhanced Prompt Engineering

**Prompt Structure:**
1. System prompt (protocol, design system)
2. Context (widget family, existing widgets)
3. User request (description, options)
4. Examples (based on complexity)
5. Output format specification

**Context Injection:**
- Widget library summary
- Recent successful generations
- User preferences

### Task 1.4: Protocol Validation

**Existing ProtocolEnforcer checks:**
- Manifest required fields
- ID/version format
- Dangerous code patterns
- WidgetAPI usage
- Event naming conventions

**V2 Enhancements:**
- Auto-fix common issues
- Detailed feedback messages
- Severity levels (error/warning/info)

### Task 1.5: Quality Scoring

**Scoring Categories:**
1. **Protocol Compliance** (40 points)
   - Manifest completeness
   - WidgetAPI initialization
   - Event patterns

2. **Code Quality** (30 points)
   - No dangerous patterns
   - Proper error handling
   - Clean structure

3. **Visual Quality** (20 points)
   - Uses design system
   - Has animations/transitions
   - Responsive layout

4. **Functionality** (10 points)
   - Emits declared outputs
   - Handles declared inputs

---

## UI Component Notes (Part 2)

### AIGeneratorPanel (Task 2.1)
- Tab container for generation flow
- Steps: Prompt → Options → Generate → Review

### PromptComposer (Task 2.2)
- Smart textarea with suggestions
- Template quick-picks
- Character count

### StyleGallery (Task 2.3)
- Visual style cards
- 6 presets: minimal, polished, elaborate, glassmorphism, neon, retro
- Preview thumbnails

### ImageReferencePanel (Task 2.4)
- Drag-drop image upload
- Extract colors/layout hints
- Pass to AI for design reference

### GenerationProgress (Task 2.5)
- Step indicator
- Live logs
- Cancel button
- Time elapsed

### IterativeRefiner (Task 2.6)
- Chat-style interface
- "Make it more..." quick actions
- Side-by-side preview

---

## Integration Notes (Part 3)

### Widget Lab Tab Structure
```
Widget Lab
├── Upload Tab (existing)
├── Generate Tab → AIGeneratorPanel (V2)
├── Drafts Tab (existing)
└── Library Tab (existing)
```

### Draft Integration
- Auto-save on generation
- Version history
- Compare versions

### Pipeline Auto-Wiring
- Analyze I/O ports
- Suggest compatible connections
- One-click connect

---

## File Size Tracking

Target: Keep all files under 500-600 lines

| File | Target Lines | Purpose |
|------|--------------|---------|
| `types.ts` | ~100 | Type definitions |
| `AIWidgetGeneratorV2.ts` | ~400 | Core service |
| `PromptBuilder.ts` | ~300 | Build AI prompts |
| `ResponseParser.ts` | ~200 | Parse AI output |
| `QualityAnalyzer.ts` | ~250 | Quality scoring |
| `GenerationSession.ts` | ~200 | Progress tracking |

---

## Dependencies

```json
{
  "existing": [
    "src/ai/providers/*",
    "src/ai/ProtocolEnforcer.ts",
    "src/ai/DraftManager.ts",
    "src/ai/prompts/ImprovedWidgetPrompt.ts",
    "src/ai/PromptEnhancer.ts"
  ],
  "new": [
    "src/services/widget-generator-v2/*"
  ]
}
```

---

## Testing Strategy

1. **Unit Tests**: Each module independently
2. **Integration Tests**: Full generation flow
3. **E2E Tests**: Widget Lab UI interaction
4. **Manual QA**: Generated widget quality

---

## Open Questions

1. Should we keep backward compatibility with V1 API?
2. Rate limiting strategy for AI calls?
3. Caching strategy for similar prompts?

---

## Implementation Status

### Part 1: Foundation & Core Infrastructure ✅ COMPLETE

| File | Lines | Status |
|------|-------|--------|
| `types.ts` | ~150 | ✅ Complete |
| `AIWidgetGeneratorV2.ts` | ~350 | ✅ Complete |
| `PromptBuilder.ts` | ~280 | ✅ Complete |
| `ResponseParser.ts` | ~200 | ✅ Complete |
| `QualityAnalyzer.ts` | ~250 | ✅ Complete |
| `GenerationSession.ts` | ~200 | ✅ Complete |
| `index.ts` | ~50 | ✅ Complete |

### Part 2: Widget Lab UI Components ✅ COMPLETE

| File | Lines | Status |
|------|-------|--------|
| `AIGeneratorPanel.tsx` | ~400 | ✅ Complete |
| `PromptComposer.tsx` | ~250 | ✅ Complete |
| `StyleGallery.tsx` | ~220 | ✅ Complete |
| `GenerationProgress.tsx` | ~230 | ✅ Complete |
| `IterativeRefiner.tsx` | ~250 | ✅ Complete |
| `index.ts` | ~15 | ✅ Complete |

### Part 3: Integration & ALPHA Polish ✅ COMPLETE

| Task | Status |
|------|--------|
| 3.1 Integrate into Widget Lab | ✅ Complete |
| 3.2 Connect DraftManager | ✅ Complete |
| 3.3 Pipeline auto-wiring | ✅ Complete |
| 3.4 Export options | ✅ Complete |
| 3.5 Onboarding/tooltips | ✅ Complete |
| 3.6 Test widget | ✅ Complete |

---

## Final File Structure

```
src/services/widget-generator-v2/
├── index.ts                    # Main exports
├── types.ts                    # TypeScript types
├── AIWidgetGeneratorV2.ts      # Core service class
├── PromptBuilder.ts            # Prompt construction
├── ResponseParser.ts           # Parse AI responses
├── QualityAnalyzer.ts          # Quality scoring
├── GenerationSession.ts        # Progress tracking
├── PipelineIntegration.ts      # Auto-wiring connections
└── widget-generator-v2.test.ts # Unit tests

src/widget-lab/components/generator-v2/
├── index.ts                    # Component exports
├── AIGeneratorPanel.tsx        # Main container
├── PromptComposer.tsx          # Smart input
├── StyleGallery.tsx            # Style selection
├── GenerationProgress.tsx      # Progress UI
├── IterativeRefiner.tsx        # Chat refinement
├── ConnectionSuggestions.tsx   # Pipeline suggestions UI
├── ExportOptions.tsx           # Download/library/canvas
└── GeneratorHelp.tsx           # Onboarding & tooltips
```

---

## Usage Example

```typescript
import { getWidgetGeneratorV2 } from '@/services/widget-generator-v2';

const generator = getWidgetGeneratorV2();

// Generate a widget
const result = await generator.generate({
  description: 'A click counter with animated buttons',
  mode: 'new',
  complexity: 'standard',
  stylePreset: 'polished',
  features: {
    animations: true,
    persistence: true,
  },
});

if (result.success) {
  console.log('Generated:', result.widget);
  console.log('Quality:', result.quality?.overall);
}

// Iterate on the widget
const refined = await generator.iterate(
  result.sessionId,
  'Make the buttons bigger and add a glow effect'
);
```

---

## Changelog

- **2024-12-11**: Completed Part 1 - Core infrastructure
- **2024-12-11**: Completed Part 2 - UI components
- **2024-12-11**: Completed Part 3 - Integration & ALPHA Polish
  - Integrated V2 generator into Widget Lab (Section 2)
  - Connected to DraftManager for versioning
  - Added PipelineIntegration for auto-wiring
  - Created ConnectionSuggestions UI component
  - Created ExportOptions component (download, library, canvas)
  - Created GeneratorHelp component (onboarding & tooltips)
  - Created comprehensive unit tests
