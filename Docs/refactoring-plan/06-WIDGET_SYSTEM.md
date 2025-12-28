# Widget System Refactoring Plan

> Clean up widget architecture, remove duplicates, standardize patterns

---

## CURRENT STATE

### Widget Inventory
| Category | Count | Notes |
|----------|-------|-------|
| Built-in widgets | 50+ | In src/widgets/builtin/ |
| V1/V2 duplicates | 5 pairs | Need consolidation |
| Official widgets | 2 | In src/widgets-official/ |
| Custom widgets | 4 | Various locations |
| Social widgets | 8 | In builtin/social/ |

### Large Widget Files (Over 800 lines)
| File | Lines | Complexity |
|------|-------|------------|
| LiveChatWidget.ts | 1,450 | HIGH |
| RetroTVWidget.ts | 967 | MEDIUM |
| BubbleHunterWidget.ts | 943 | MEDIUM |
| TextToolWidgetV2.ts | 919 | MEDIUM |
| TikTokPlaylistWidget.ts | 885 | MEDIUM |
| ShapeToolWidgetV2.ts | 859 | MEDIUM |
| WebcamWidget.ts | 837 | MEDIUM |
| AIBrainWidget.ts | 789 | MEDIUM |

---

## PRIORITY 1: REMOVE V1 WIDGETS

### 1.1 V1/V2 Widget Pairs
**Goal**: Keep only V2 versions

| V1 (Remove) | V2 (Keep) |
|-------------|-----------|
| ColorPickerWidget.ts | ColorPickerWidgetV2.ts |
| TextToolWidget.ts | TextToolWidgetV2.ts |
| ImageToolWidget.ts | ImageToolWidgetV2.ts |
| ShapeToolWidget.ts | ShapeToolWidgetV2.ts |
| CanvasControlWidget.ts | CanvasControlWidgetV2.ts |

**Subtasks:**
- [ ] 1.1.1: Search for all V1 widget imports
  ```bash
  grep -r "from.*ColorPickerWidget" src/
  grep -r "from.*TextToolWidget[^V]" src/
  # etc.
  ```
- [ ] 1.1.2: Update imports to V2 versions
- [ ] 1.1.3: Update widget registry
- [ ] 1.1.4: Delete V1 widget files
- [ ] 1.1.5: Rename V2 files (remove "V2" suffix)
  - ColorPickerWidgetV2.ts → ColorPickerWidget.ts
  - etc.
- [ ] 1.1.6: Update all imports after rename
- [ ] 1.1.7: Test all widget functionality

---

## PRIORITY 2: REFACTOR LARGE WIDGETS

### 2.1 LiveChatWidget.ts (1,450 lines)
**Location**: `src/widgets/builtin/social/LiveChatWidget.ts`

**Current Structure**:
- Chat message handling
- Connection management
- UI rendering
- Message parsing
- User presence

**Target Structure**:
```
src/widgets/builtin/social/live-chat/
  ├── index.ts (exports widget definition)
  ├── LiveChatWidget.ts (main widget, ~300 lines)
  ├── components/
  │   ├── ChatMessage.ts (~150 lines)
  │   ├── ChatInput.ts (~150 lines)
  │   ├── UserList.ts (~100 lines)
  │   └── ChatHeader.ts (~80 lines)
  ├── hooks/
  │   ├── useChatConnection.ts (~200 lines)
  │   └── useChatMessages.ts (~150 lines)
  └── utils/
      ├── messageParser.ts (~100 lines)
      └── chatFormatters.ts (~100 lines)
```

**Subtasks:**
- [ ] 2.1.1: Create `live-chat/` directory structure
- [ ] 2.1.2: Extract ChatMessage component
- [ ] 2.1.3: Extract ChatInput component
- [ ] 2.1.4: Extract useChatConnection hook
- [ ] 2.1.5: Extract message parsing utilities
- [ ] 2.1.6: Update main widget to compose components
- [ ] 2.1.7: Update widget registry import
- [ ] 2.1.8: Test chat functionality

---

### 2.2 RetroTVWidget.ts (967 lines)
**Location**: `src/widgets/builtin/RetroTVWidget.ts`

**Subtasks:**
- [ ] 2.2.1: Extract TV frame/screen component
- [ ] 2.2.2: Extract channel control logic
- [ ] 2.2.3: Extract visual effects (scan lines, etc.)
- [ ] 2.2.4: Create directory structure if needed

---

### 2.3 BubbleHunterWidget.ts (943 lines)
**Location**: `src/widgets/builtin/BubbleHunterWidget.ts`

**Subtasks:**
- [ ] 2.3.1: Extract game loop logic
- [ ] 2.3.2: Extract bubble rendering
- [ ] 2.3.3: Extract scoring system
- [ ] 2.3.4: Extract collision detection

---

### 2.4 Other Large Widgets
Apply similar pattern to:
- [ ] TextToolWidgetV2.ts (919 lines)
- [ ] TikTokPlaylistWidget.ts (885 lines)
- [ ] ShapeToolWidgetV2.ts (859 lines)
- [ ] WebcamWidget.ts (837 lines)
- [ ] AIBrainWidget.ts (789 lines)

---

## PRIORITY 3: STANDARDIZE WIDGET PATTERNS

### 3.1 Create Widget Template
**Goal**: Standard structure for all widgets

**Template**:
```typescript
// src/widgets/builtin/template/WidgetTemplate.ts

import { WidgetDefinition } from '@/types/widget';

export const WidgetTemplate: WidgetDefinition = {
  // Metadata
  id: 'widget-template',
  name: 'Widget Template',
  description: 'Template for creating new widgets',
  version: '1.0.0',
  author: 'StickerNest',

  // Sizing
  defaultSize: { width: 200, height: 200 },
  minSize: { width: 100, height: 100 },
  maxSize: { width: 800, height: 800 },

  // Capabilities
  capabilities: {
    storage: true,
    theme: true,
    events: true,
  },

  // Ports (for pipelines)
  inputs: [],
  outputs: [],

  // Implementation
  render: (api) => {
    // Widget HTML/rendering logic
  },

  // Lifecycle
  onMount: (api) => {
    // Setup logic
  },

  onUnmount: (api) => {
    // Cleanup logic
  },

  // Event handlers
  onResize: (api, size) => {
    // Handle resize
  },
};
```

**Subtasks:**
- [ ] 3.1.1: Create widget template file
- [ ] 3.1.2: Document template usage
- [ ] 3.1.3: Create widget generator script
- [ ] 3.1.4: Update existing widgets to match pattern

---

### 3.2 Standardize Widget Lifecycle
**Goal**: Consistent lifecycle across all widgets

**Lifecycle Methods**:
1. `onMount(api)` - Widget added to canvas
2. `onActivate(api)` - Widget becomes visible
3. `onDeactivate(api)` - Widget becomes hidden
4. `onUnmount(api)` - Widget removed from canvas
5. `onResize(api, size)` - Widget resized
6. `onThemeChange(api, theme)` - Theme changed

**Subtasks:**
- [ ] 3.2.1: Document lifecycle in widget SDK
- [ ] 3.2.2: Audit existing widgets for lifecycle compliance
- [ ] 3.2.3: Add missing lifecycle methods
- [ ] 3.2.4: Test lifecycle events

---

### 3.3 Standardize Port Definitions
**Goal**: Consistent I/O ports for pipelines

**Port Types**:
```typescript
type PortType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'color'
  | 'image'
  | 'audio'
  | 'video'
  | 'json'
  | 'trigger';
```

**Subtasks:**
- [ ] 3.3.1: Document port types
- [ ] 3.3.2: Create port type validators
- [ ] 3.3.3: Audit widgets for port compliance
- [ ] 3.3.4: Update non-compliant widgets

---

## PRIORITY 4: WIDGET TESTING

### 4.1 Create Widget Test Framework
**Goal**: Standardized testing for widgets

**Subtasks:**
- [ ] 4.1.1: Create widget test utilities
  ```typescript
  // src/widgets/__tests__/widgetTestUtils.ts
  export const createMockWidgetAPI = () => ({
    getState: jest.fn(),
    setState: jest.fn(),
    emit: jest.fn(),
    subscribe: jest.fn(),
    // ... other API methods
  });

  export const renderWidget = (widget: WidgetDefinition, api?: MockAPI) => {
    const mockApi = api || createMockWidgetAPI();
    const container = document.createElement('div');
    widget.render(mockApi);
    return { container, api: mockApi };
  };
  ```
- [ ] 4.1.2: Create test template
- [ ] 4.1.3: Add tests for core widgets
- [ ] 4.1.4: Add tests for social widgets
- [ ] 4.1.5: Set up CI widget testing

---

### 4.2 Add Widget Integration Tests
**Goal**: Test widgets in canvas context

**Subtasks:**
- [ ] 4.2.1: Create Playwright widget test fixtures
- [ ] 4.2.2: Test widget add/remove
- [ ] 4.2.3: Test widget resize
- [ ] 4.2.4: Test widget state persistence
- [ ] 4.2.5: Test widget pipeline connections

---

## PRIORITY 5: WIDGET DOCUMENTATION

### 5.1 Widget API Documentation
**Goal**: Complete API reference

**Subtasks:**
- [ ] 5.1.1: Document WidgetAPI methods
- [ ] 5.1.2: Document capability system
- [ ] 5.1.3: Document port system
- [ ] 5.1.4: Document theme integration
- [ ] 5.1.5: Document state management

---

### 5.2 Widget Development Guide
**Goal**: Guide for creating new widgets

**Subtasks:**
- [ ] 5.2.1: Write "Getting Started" guide
- [ ] 5.2.2: Write "Widget Anatomy" guide
- [ ] 5.2.3: Write "Advanced Features" guide
- [ ] 5.2.4: Create example widgets repository
- [ ] 5.2.5: Add inline code examples

---

## PRIORITY 6: WIDGET ORGANIZATION

### 6.1 Reorganize Widget Directory
**Goal**: Clear, navigable structure

**Current Structure**:
```
src/widgets/
  ├── builtin/ (50+ files mixed)
  │   └── social/ (8 files)
  ├── ImageGenPipeline/
  ├── BusinessCardLayout/
  ├── PreviewExport/
  └── FormFlow/
```

**Target Structure**:
```
src/widgets/
  ├── builtin/
  │   ├── core/           # Essential widgets
  │   │   ├── text/
  │   │   ├── image/
  │   │   ├── shape/
  │   │   └── container/
  │   ├── design/         # Design tools
  │   │   ├── color-picker/
  │   │   ├── transform/
  │   │   └── effects/
  │   ├── media/          # Media widgets
  │   │   ├── webcam/
  │   │   ├── video/
  │   │   └── audio/
  │   ├── social/         # Social widgets
  │   │   ├── live-chat/
  │   │   ├── presence/
  │   │   └── notifications/
  │   ├── interactive/    # Interactive widgets
  │   │   ├── counter/
  │   │   ├── timer/
  │   │   └── games/
  │   └── integration/    # External integrations
  │       ├── tiktok/
  │       ├── obs/
  │       └── ai/
  ├── official/           # Official widget library
  └── templates/          # Widget templates
```

**Subtasks:**
- [ ] 6.1.1: Create new directory structure
- [ ] 6.1.2: Move core widgets
- [ ] 6.1.3: Move design widgets
- [ ] 6.1.4: Move media widgets
- [ ] 6.1.5: Move social widgets
- [ ] 6.1.6: Move interactive widgets
- [ ] 6.1.7: Move integration widgets
- [ ] 6.1.8: Update all imports
- [ ] 6.1.9: Update widget registry
- [ ] 6.1.10: Test widget loading

---

## WIDGET REGISTRY

### 7.1 Clean Up Widget Registry
**Goal**: Single source of widget definitions

**Subtasks:**
- [ ] 7.1.1: Audit widget registry for duplicates
- [ ] 7.1.2: Remove V1 widget entries
- [ ] 7.1.3: Add missing V2 widgets
- [ ] 7.1.4: Organize by category
- [ ] 7.1.5: Add lazy loading for large widgets

---

## COMPLETION CHECKLIST

After widget refactoring:
- [ ] No V1 widgets remaining
- [ ] All large widgets split into modules
- [ ] All widgets follow standard template
- [ ] All widgets have lifecycle methods
- [ ] All ports properly typed
- [ ] Widget tests exist
- [ ] Documentation complete
- [ ] Directory organized by category
- [ ] Widget registry cleaned up
- [ ] All widgets load correctly
