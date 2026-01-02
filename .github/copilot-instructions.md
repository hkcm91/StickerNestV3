# StickerNest V3 — AI Agent Instructions

**Last Updated:** December 31, 2025  
**Status:** Authoritative Reference

This document guides AI agents to understand StickerNest's architecture, workflows, and coding patterns for maximum productivity.

---

## 1. Project Overview

**StickerNest** is an **AI-native runtime engine** hosting interactive widgets (2D, 3D, audio, video) inside customizable multi-canvas dashboards. Key features:

- **Widget System**: Official, AI-generated, and user-uploaded widgets in isolated iframe sandboxes
- **Visual Pipelines**: Connect widgets via event flows and state mutations
- **Multi-Canvas**: Create, share, and embed dashboards with granular permissions
- **Real-time Collaboration**: Cursor tracking, selections, presence (via Supabase)
- **AI Generation**: Llama/GPT/Claude-powered widget creation from natural language

**Not** a static template generator—a full runtime with event buses, state persistence, and extensible widget protocol.

---

## 2. Critical Architecture Layers

### 2.1 Frontend Stack

| Layer | Technology | Key Files |
|-------|-----------|-----------|
| **UI Framework** | React 18 + TypeScript 5.2 | `src/` |
| **State Management** | Zustand 5.x with persist/devtools | `src/state/*.ts` |
| **Build/Dev Server** | Vite 5.4 | `vite.config.ts` |
| **Routing** | React Router 6.30 | `src/router/` |
| **Styling** | CSS tokens (no Tailwind) | `src/styles/tokens.css` |
| **Widget Runtime** | iframe-based sandboxing + postMessage | `src/runtime/` |

### 2.2 Backend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Database & Auth** | Supabase | Users, canvases, widgets |
| **Security** | Row-Level Security (RLS) | Multi-tenant data isolation |
| **Storage** | Supabase Storage (Buckets) | Widget bundles, assets |
| **Serverless** | Node.js Express server | AI calls, pipeline execution, webhooks |

### 2.3 Runtime Layers (In-Memory)

```
Canvas (user creates)
  ↓
WidgetInstances (placed on canvas)
  ↓
RuntimeContext (tracks state + event bus)
  ↓
WidgetSandbox (iframe for each widget)
  ↓
postMessage (bidirectional communication)
```

**Key Insight**: Widgets never share memory. All communication flows through EventBus (type-safe messages).

---

## 3. Widget System Architecture

### 3.1 Widget Bundle Format

```
my-widget.zip
  manifest.json          (v3.0 protocol)
  index.js | index.tsx   (entry point)
  styles.css             (scoped)
  utils.js               (helpers)
  assets/                (images, data)
```

**Storage Path**: `/widgets/{userId}/{widgetId}/{version}/`

### 3.2 Widget Manifest (v3.0)

Essential fields in `manifest.json`:

```typescript
{
  id: "my-widget",              // lowercase, alphanumeric, hyphens
  name: "My Widget",
  version: "1.0.0",             // semantic versioning
  entry: "index.js",            // relative path to entry point
  kind: "2d" | "3d" | "audio" | "video" | "hybrid",
  size: "md" | "lg",            // preset for AI generation
  
  // Communication contract
  io: {
    inputs: [
      { id: "title", type: "string", required: true }
    ],
    outputs: [
      { id: "selected", type: "string" }
    ]
  },
  
  // Capabilities  
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
    supportsThemes: true
  },
  
  // Permissions (future)
  permissions: ["storage", "clipboard"]
}
```

**Protocol Note**: v3.0 uses `postMessage({ type: 'READY' }, '*')` inside widget—no `window.WidgetAPI` dependencies.

### 3.3 Widget Lifecycle

1. **Load**: Manifest + bundle fetched from Supabase
2. **Sandbox**: iframe created with widget code
3. **Init**: Config + theme tokens injected
4. **Ready**: Widget posts `READY` message to parent
5. **Communicate**: Events via postMessage (EventBus v2)
6. **Persist**: State auto-saved to `widget_instances` table

**Files to understand**:
- `src/runtime/WidgetSandboxHost.ts` — iframe parent handler
- `src/runtime/RuntimeContext.ts` — event bus + state store
- `src/runtime/CanvasRuntime.ts` — canvas-level orchestration

---

## 4. State Management Patterns

### 4.1 Zustand Store Structure

**All stores in `src/state/*.ts`** follow this template:

```typescript
// State interface
interface MyState {
  items: Item[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Actions interface  
interface MyActions {
  addItem: (item: Item) => void;
  selectItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

// Store with persist + devtools
export const useMyStore = create<MyState & MyActions>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        items: [],
        selectedId: null,
        isLoading: false,
        error: null,

        // Actions
        addItem: (item) => set(state => ({
          items: [...state.items, item]
        })),
        
        reset: () => set({ items: [], selectedId: null, isLoading: false, error: null })
      }),
      { name: 'my-store-key' }
    ),
    { name: 'MyStore', enabled: import.meta.env.DEV }
  )
);

// Selector hooks (prevents unnecessary re-renders)
export const useMyItems = () => useMyStore(s => s.items);
export const useSelectedItem = () => useMyStore(s => 
  s.items.find(i => i.id === s.selectedId) ?? null
);
```

**Best Practices**:
1. **Selector hooks**: Always use `(state) => state.field` to select specific data
2. **Never select entire store**: Avoid `const store = useMyStore()` — triggers re-renders on any change
3. **Shallow compare**: Use `useShallow()` for objects/arrays: `useMyStore(useShallow(s => ({ a: s.a, b: s.b })))`
4. **Persist sparingly**: Only localStorage data that survives page reload
5. **Include reset()**: Essential for testing and cleanup

### 4.2 Critical Stores

| Store | Purpose | Key State |
|-------|---------|-----------|
| `useCanvasStore` | Active canvas + widgets | `canvasId`, `widgets`, `mode` |
| `useStickerStore` | Widget instances (legacy "stickers") | `stickers`, `dockZones` |
| `usePanelsStore` | Floating panels state | `panels`, `dockedWidgets` |
| `useWidgetStateStore` | Per-widget runtime state | `states: Map<widgetId, state>` |
| `useThemeStore` | Active theme + tokens | `currentThemeId`, `customTokens` |
| `usePresenceStore` | Realtime cursors/selections | `cursors`, `selections` |
| `useCanvasAppearanceStore` | Canvas styling | `background`, `grid`, `glass` |

---

## 5. Key Development Workflows

### 5.1 Build & Development

```bash
# Development server (Vite + HMR)
npm run dev                    # Starts http://localhost:5173

# Type checking during build
npm run build:typecheck        # Recommended before commits

# Production build
npm run build                  # Outputs dist/

# Preview production build locally
npm run preview                # Test dist/ locally
```

**Special flags**:
```bash
# XR/VR development
npm run dev:xr                 # Enables XR tools
```

### 5.2 Testing

```bash
# Unit tests (Vitest)
npm run test:unit              # Run all unit tests
npm run test:unit:watch        # Watch mode
npm run test:unit:coverage     # Coverage report

# E2E tests (Playwright)
npm run test                   # All E2E tests
npm run test:headed            # Visual run
npm run test:debug             # Interactive debugger
npm run test:ui                # Playwright Inspector UI

# All tests combined
npm run test:all               # Unit + E2E
```

**Test configuration**:
- Unit: `vitest.config.ts` (Node environment)
- E2E: `playwright.config.ts` (multiple devices: desktop, mobile-chrome, mobile-safari, tablet)

### 5.3 Linting

```bash
npm run lint                   # ESLint check (strict, zero warnings)
```

---

## 6. Component & Hook Patterns

### 6.1 React Component Template

```typescript
import { FC, useCallback } from 'react';
import { useMyStore } from '@/state/useMyStore';
import styles from './MyComponent.module.css';

interface MyComponentProps {
  id: string;
  onSelect?: (id: string) => void;
}

/**
 * Brief description
 * @example
 * <MyComponent id="widget-1" />
 */
export const MyComponent: FC<MyComponentProps> = ({ id, onSelect }) => {
  // Zustand selectors (only what you need)
  const item = useMyStore(s => s.items.find(i => i.id === id));
  
  // Local state for UI-only data
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Actions
  const handleClick = useCallback(() => {
    onSelect?.(id);
    setIsExpanded(!isExpanded);
  }, [id, onSelect]);

  return (
    <div className={styles.root}>
      <button onClick={handleClick}>{item?.name}</button>
      {isExpanded && <Details />}
    </div>
  );
};

export default MyComponent;
```

**Conventions**:
- Named exports for testing
- Memoize callbacks with `useCallback` when passing to children
- Prefer custom hooks for complex logic
- CSS Modules (not Tailwind): `import styles from './MyComponent.module.css'`

### 6.2 Custom Hooks

For async operations, store integration, or reusable logic:

```typescript
interface UseMyFeatureOptions {
  autoSave?: boolean;
}

interface UseMyFeatureReturn {
  data: DataType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyFeature(options: UseMyFeatureOptions = {}): UseMyFeatureReturn {
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasId = useCanvasStore(s => s.canvasId);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchData(canvasId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [canvasId]);

  useEffect(() => {
    refetch();
  }, [refetch, options.autoSave]);

  return { data, isLoading, error, refetch };
}
```

---

## 7. Service Layer & API Integration

### 7.1 Service Organization

Services in `src/services/` are **singletons** for API/data operations:

```typescript
// src/services/myService.ts
export const MyService = {
  // Synchronous operations
  validate: (data: any) => { ... },
  
  // Async operations
  fetch: async (id: string) => { ... },
  save: async (data: DataType) => { ... },
  
  // Subscriptions (Supabase realtime)
  subscribe: (callback: (payload) => void) => {
    const unsubscribe = supabase
      .on('postgres_changes', { ... }, callback)
      .subscribe();
    return unsubscribe;
  }
};

export default MyService;
```

### 7.2 Key Services

| Service | Purpose | File |
|---------|---------|------|
| Dashboard client | Canvas CRUD | `src/services/dashboardClient.ts` |
| Widget generator | AI widget creation | `src/services/widget-generator-v2/AIWidgetGeneratorV2.ts` |
| Widget instance | Widget state persistence | `src/services/widgetInstanceService.ts` |
| OBS service | Stream/screen capture | `src/services/stream/OBSService.ts` |
| Profile service | User profiles + social | `src/services/social/ProfileService.ts` |

---

## 8. Event Bus & Pipeline Execution

### 8.1 EventBus v2 Protocol

**Type-safe event system for widget communication**:

```typescript
interface Event {
  type: string;
  scope: "widget" | "canvas" | "user" | "global";
  payload: any;
  sourceWidgetId?: string;
  targetWidgetId?: string;
  metadata?: {
    timestamp: number;
    userId: string;
  };
}

// Usage
eventBus.emit({
  type: 'input-changed',
  scope: 'widget',
  sourceWidgetId: 'widget-123',
  targetWidgetId: 'widget-456',
  payload: { value: 'hello' }
});

eventBus.on('input-changed', (event) => {
  console.log('Received:', event.payload);
});
```

**File**: `src/runtime/EventBus.ts`

### 8.2 Pipeline Connections

Pipelines defined in canvas state, executed via events:

```typescript
interface Pipeline {
  id: string;
  canvasId: string;
  connections: Array<{
    sourceWidgetId: string;
    sourceOutputId: string;
    targetWidgetId: string;
    targetInputId: string;
  }>;
}
```

**When source widget emits output, PipelineRuntime routes to target widget input.**

---

## 9. Typing & Validation

### 9.1 Domain Types

Core types in `src/types/domain.ts`:

```typescript
interface User {
  id: string;
  username: string;
  createdAt: string;
}

interface Canvas {
  id: string;
  userId: string;
  name: string;
  visibility: "private" | "unlisted" | "public";
  width?: number;
  height?: number;
}

interface WidgetInstance {
  id: string;
  canvasId: string;
  widgetDefId: string;
  position: { x: number; y: number };
  sizePreset: "xs" | "sm" | "md" | "lg" | "xl" | "banner" | "full";
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  state: Record<string, any>;
}
```

### 9.2 Runtime Types

Communication types in `src/types/runtime.ts`:

```typescript
interface WidgetAPI {
  emitEvent: (event: Event) => void;
  onEvent: (type: string, handler: (event: Event) => void) => void;
  getState: () => any;
  setState: (patch: any) => void;
  getAssetUrl: (path: string) => string;
  debugLog: (msg: string, data?: any) => void;
}
```

### 9.3 Validation with Zod

Prefer Zod schemas for runtime validation:

```typescript
import { z } from 'zod';

const WidgetInputSchema = z.object({
  title: z.string().min(1),
  count: z.number().int().positive(),
  enabled: z.boolean().default(true)
});

type WidgetInput = z.infer<typeof WidgetInputSchema>;

// Parse/validate
const input = WidgetInputSchema.parse(userInput);
```

---

## 10. Theming & Styling

### 10.1 CSS Token System

**No Tailwind**. All styles use **CSS custom properties** defined in `src/styles/tokens.css`:

```css
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --font-family-base: system-ui, sans-serif;
  --font-size-body: 14px;
  --border-radius-sm: 4px;
}

/* Dark theme */
[data-theme="dark"] {
  --color-primary: #66b3ff;
  --color-background: #1a1a1a;
}
```

**Usage in components**:

```typescript
// styles/MyComponent.module.css
.root {
  padding: var(--spacing-md);
  color: var(--color-primary);
  border-radius: var(--border-radius-sm);
}
```

**Theme management**: `useThemeStore` provides `currentThemeId` and token overrides.

---

## 11. Multi-Canvas & Routing

### 11.1 Approved Pages (Authoritative)

**Only these routes exist** (see `Docs/APP_STRUCTURE.md`):

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `LandingPage` | Marketing |
| `/login` | `LoginPage` | Auth |
| `/signup` | `SignupPage` | Registration |
| `/gallery` | `GalleryPage` | User's canvases |
| `/editor/:canvasId` | `EditorPage` | Canvas edit mode |
| `/c/:slug` | `SharedCanvasPage` | Public/shared view |
| `/embed/:slug` | `EmbedCanvasPage` | Iframe embeddable |
| `/@:username` | `ProfilePage` | User profile |
| `/settings` | `SettingsPage` | Account settings |
| `/marketplace` | `MarketplacePage` | Widget store |
| `/marketplace/:id` | `WidgetDetailPage` | Single widget |
| `/app` | `MainApp` | Widget Lab (dev/test) |

**Do NOT create new pages without explicit permission.**

### 11.2 Canvas Navigation

Inter-canvas communication via `useCanvasRouter` hook:

```typescript
const { navigateToCanvas, getCrossCanvasEvents } = useCanvasRouter();

// Jump to another canvas
navigateToCanvas('canvas-id-123');

// Listen for events from other canvases
const events = getCrossCanvasEvents('event-type');
```

---

## 12. Common Gotchas & Warnings

### ⚠️ **Widget State Not Persisting**
- Widget state saved to `widget_instances` table, but **only on explicit save**
- Use `widgetInstanceService.saveWidgetState()` to persist changes

### ⚠️ **Re-render Loops with Zustand**
- Selecting entire store (`useStore()`) triggers re-render on ANY state change
- Always use selector functions: `useStore(s => s.field)`

### ⚠️ **Canvas Runtime Hardcoded Values**
- Canvas mode passed as hardcoded `'view'` to widget context (TODO in `WidgetSandboxHost.ts:481`)
- Canvas size hardcoded to `1920x1080` (TODO in `WidgetSandboxHost.ts:484-485`)

### ⚠️ **Pipeline Execution Not Server-Side**
- Server endpoint returns `"TODO: Implement pipeline execution"`
- Pipeline runs **client-side only** via EventBus; multi-user execution requires server implementation

### ⚠️ **Permission System Incomplete**
- Manifest supports `permissions` field, but implementation is stubbed (TODO in `WidgetSandboxHost.ts:890`)

---

## 13. File Structure Reference

```
src/
  ai/                    # AI widget generation
  canvas/                # Canvas editor UI
  components/            # Reusable React components
  contexts/              # React context providers
  hooks/                 # Custom React hooks
  layouts/               # Page layouts
  pages/                 # Page components (routes)
  pipelines/             # Visual pipeline editor
  runtime/               # Widget sandbox + event bus
  services/              # API clients & singletons
  state/                 # Zustand stores
  types/                 # TypeScript interfaces
  utils/                 # Utility functions
  widget-lab/            # Widget development tools

server/
  controllers/           # Express route handlers
  services/              # Server-side business logic
  routes/                # API endpoint definitions
  db/                    # Database queries
  middleware/            # Express middleware
  websocket/             # WebSocket handlers (realtime)

Docs/
  APP_STRUCTURE.md       # Approved pages & routes
  ARCHITECTURE.md        # Core architecture blueprint
  WIDGET-SYSTEM.md       # Widget runtime & sandbox
  WIDGET-PROTOCOL-SPEC.md # v3.0 communication protocol
  IMPLEMENTATION_PLAN.md # Phase-by-phase roadmap
```

---

## 14. Running Tests & Debugging

### 14.1 Debug Shortcuts

Keyboard shortcuts in dev mode:

```
Ctrl+Shift+D    Toggle debug panel
Ctrl+Shift+M    Toggle dev mode
Ctrl+Shift+C    Clear console
Ctrl+Shift+S    Dump state to console
```

**Debug utilities**: `src/utils/debug.ts`

### 14.2 Performance Debugging

```typescript
// useRenderCount hook (debug.ts)
const renderCount = useRenderCount('MyComponent');

// useWhyDidYouRender hook (debug.ts)
useWhyDidYouRender('MyComponent', { prop1, prop2 });

// Zustand devtools (browser extension)
// Inspect store state in real-time
```

### 14.3 Widget Sandbox Debugging

Each widget renders with debug overlay showing:
- Emitted/received events
- State mutations
- Logs/console messages
- Manifest info

**File**: `src/widget-lab/` for widget preview environment.

---

## 15. Git & Code Review Expectations

### 15.1 Commit Conventions

```
feat(canvas): add rotate transform for widgets
fix(runtime): resolve event bus memory leak
docs(widget-protocol): clarify v3.0 I/O format
refactor(state): split useCanvasStore into slices
test(widget-sandbox): add isolation tests
```

### 15.2 Branch Naming

```
feat/widget-rotation
fix/state-persistence
docs/architecture-update
```

### 15.3 Code Quality Checks

```bash
npm run lint                  # Must pass (zero warnings)
npm run build:typecheck       # Must pass (no type errors)
npm run test:unit             # Recommended before PR
```

---

## 16. Asking for Help (Cheat Sheet)

**For architecture questions:**
- Read `Docs/ARCHITECTURE.md` (core domains)
- Read `Docs/WIDGET-PROTOCOL-SPEC.md` (widget communication)
- Check `src/types/domain.ts` (entity shapes)

**For UI/component patterns:**
- Check `src/components/` for examples
- Reference `.claude/skills/creating-components/SKILL.md`
- Use `src/state/` stores for state examples

**For state management:**
- Read `.claude/skills/creating-zustand-stores/SKILL.md`
- Check existing stores in `src/state/`
- Always use selector hooks to prevent re-renders

**For widget development:**
- Read `Docs/WIDGET-SYSTEM.md` for lifecycle
- Reference `Docs/WIDGET-PROTOCOL-SPEC.md` for manifest format
- Check `/public/test-widgets/` for examples

**For API integration:**
- Check `src/services/` for service patterns
- Supabase docs for auth/database/storage

---

## 17. Known Incompleteness & TODOs

**HIGH PRIORITY** (blocks features):
- [ ] Phase 1.2: Canvas position/size persistence (CanvasRuntime.ts:303, 345, 386, 424)
- [ ] Phase 2.1: Server-side pipeline execution engine (ai.controller.ts:90)
- [ ] Phase 1.4.1: Pass actual canvas mode to widget (WidgetSandboxHost.ts:481)

**MEDIUM PRIORITY** (improves UX):
- [ ] Phase 1.3: Wire Undo/Redo system (MainCanvas.tsx:802-803)
- [ ] Phase 1.4: Widget permission system (WidgetSandboxHost.ts:890)
- [ ] Widget state database persistence (1.1.1-1.1.4)

See `IMPLEMENTATION_PLAN.md` for full breakdown.

---

## 18. Quick Reference: Key Imports

```typescript
// State management
import { useCanvasStore } from '@/state/useCanvasStore';
import { useStickerStore } from '@/state/useStickerStore';
import { useThemeStore } from '@/state/useThemeStore';

// Runtime
import { RuntimeContext } from '@/runtime/RuntimeContext';
import { EventBus } from '@/runtime/EventBus';

// Types
import type { Widget, WidgetInstance, Canvas } from '@/types/domain';
import type { Event } from '@/types/runtime';

// Services
import { DashboardClient } from '@/services/dashboardClient';
import { WidgetGeneratorV2 } from '@/services/widget-generator-v2/AIWidgetGeneratorV2';

// Validation
import { z } from 'zod';
```

---

**Need help navigating?** Check the table of contents above, or reference `Docs/APP_STRUCTURE.md` for routes and `Docs/ARCHITECTURE.md` for deep dives.
