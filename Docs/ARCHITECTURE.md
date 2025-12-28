# StickerNest v2 — Core Architecture Blueprint
Version: 0.1  
Status: Foundational Specification

StickerNest v2 is an AI-native, user-extensible runtime engine for hosting interactive 2D, 3D, audio, and video widgets inside customizable canvases (“dashboards”). It supports AI-generated widgets, user-uploaded multi-file bundles, pipelines, and broader ecosystems.

---

# 1. Mission

StickerNest v2 must be:

- A **runtime engine**, not just a dashboard UI.  
- A **widget host** supporting official widgets, AI-generated widgets, and user-uploaded multi-file bundles.  
- A **pipeline engine** connecting widgets via event flows.  
- A **multi-canvas system** enabling dashboards that can be shared or made public.  
- A foundation for **storefronts**, **3D environments**, and **ecosystems** across multiple canvases.  

StickerNest is **not**:  
- A static template generator  
- A single-purpose app  
- Hard-coded UI with business logic mixed in  

---

# 2. Tech Stack

**Frontend**
- React 18 (Vite + TypeScript)
- Zustand or Jotai for state
- TailwindCSS
- Framer Motion
- Three.js adapter (future)
- Iframe sandboxing layer
- HTML5 Canvas/SVG adapters

**Backend**
- Supabase Auth / DB / Storage
- Supabase Row-Level Security
- Supabase Functions (if needed)

**AI**
- Claude Opus 4.5: architecture, complex multi-file systems  
- Gemini 3.0: implementing runtime internals, UI, fast iteration  
- GPT-5.1: debugging & refinement  

---

# 3. Domain Types

## User
```
interface User {
  id: string;
  username: string;
  createdAt: string;
}
```

## Canvas
```
interface Canvas {
  id: string;
  userId: string;
  name: string;
  visibility: "private" | "unlisted" | "public";
  slug?: string;
  createdAt: string;
}
```

## WidgetDefinition (Manifest v2)
```
type WidgetKind = "2d" | "3d" | "audio" | "video" | "hybrid";

interface WidgetDefinition {
  id: string;
  name: string;
  version: string;
  kind: WidgetKind;
  entry: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  capabilities: {
    draggable: boolean;
    resizable: boolean;
    rotatable?: boolean;
    supports3d?: boolean;
    supportsAudio?: boolean;
  };
  assets?: string[];
  sandbox?: boolean;
}
```

## WidgetInstance
```
type WidgetSizePreset = "xs" | "sm" | "md" | "lg" | "xl" | "banner" | "full";

interface WidgetInstance {
  id: string;
  canvasId: string;
  widgetDefId: string;
  position: { x: number; y: number };
  sizePreset: WidgetSizePreset;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  state: Record<string, any>;
}
```

---

# 4. Runtime Layer

## RuntimeContext
```
interface RuntimeContext {
  userId: string;
  canvasId: string;
  widgetInstances: WidgetInstance[];
  eventBus: EventBus;
  stateStore: GlobalStateStore;
}
```

## Event Bus v2
```
interface Event {
  type: string;
  scope: "widget" | "canvas" | "user" | "global";
  payload: any;
  sourceWidgetId?: string;
  targetWidgetId?: string;
}
```

```
interface EventBus {
  emit(event: Event): void;
  on(type: string, handler: (event: Event) => void): () => void;
}
```

---

# 5. Widget Loader

Two loading modes:
1. **Official widgets** — normal ES modules  
2. **User/A.I. widgets** — sandboxed via iframe  

---

# 6. WidgetAPI (iframe → parent communication)

```
interface WidgetAPI {
  emitEvent(event: Event): void;
  onEvent(type: string, handler: (event: Event) => void): void;
  getState(): any;
  setState(patch: any): void;
  getAssetUrl(path: string): string;
  debugLog(msg: string, data?: any): void;
}
```

---

# 7. Canvas Runtime Responsibilities

- Load widget definitions and instances  
- Mount widget iframes  
- Handle drag / resize / rotation  
- Manage z-index  
- Connect to EventBus  
- Switch between view/edit mode  
- Provide wiring UI for pipelines  

---

# 8. Debugging Layer (Required Day 1)

- Debug Panel  
- Debug Widget  
- console forwarding from iframe  
- event inspection  
- Supabase logging  
- AI-assisted debugging  

---

# 9. Development Phases

**Phase 0** — File structure + docs  
**Phase 1** — Domain types + manifest types  
**Phase 2** — EventBus implementation  
**Phase 3** — RuntimeContext + CanvasRuntime skeleton  
**Phase 4** — Sandbox host + widget loader  
**Phase 5** — Canvas rendering  
**Phase 6** — Supabase integration  
**Phase 7** — Debug tools  
**Phase 8** — Basic official widgets  
**Phase 9** — Pipelines skeleton  
**Phase 10** — AI Widget Generator foundation  

---

This document is the authoritative source for StickerNest v2 architecture.
