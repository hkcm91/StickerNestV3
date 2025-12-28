# StickerNest v2 — Widget System, Sandbox, Pipeline Engine & AI Generation

This document defines the widget architecture, sandbox model, preview system, pipeline engine, and AI widget creation system.

---

# 1. Goals

Widgets must:

- Support official, AI-generated, and user-uploaded bundles.  
- Support single-file (JS/HTML) and multi-file (React/TSX) widgets.  
- Run in a universal iframe sandbox.  
- Have a preview environment inside “Widget Lab”.  
- Never break each other (isolated sandboxes).  
- Communicate via EventBus v2.  
- Participate in pipelines.  
- Use size presets for predictable layout and AI generation.  

---

# 2. Widget Bundle Format

```
my-widget.zip
  manifest.json
  index.js | index.tsx | index.html
  styles.css
  utils.js
  assets/*
```

Stored in:
```
/widgets/{userId}/{widgetId}/{version}/
```

---

# 3. Manifest v2

*(same as ARCHITECTURE.md)*

---

# 4. Sandbox Architecture

Each widget runs in an iframe.

### WidgetIframeHost (parent)
- Creates iframe  
- Loads bundle from Supabase  
- Injects WidgetAPI  
- Forwards errors/logs back to DebugPanel  

### WidgetSandbox (inside iframe)
- Receives manifest + entry  
- Bootstraps widget  
- Exposes `window.WidgetAPI`  
- Forwards logs + events  

This prevents the multi-file widget preview problems from v1.

---

# 5. WidgetAPI

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

# 6. Widget Preview System (“Widget Lab”)

- List user widgets  
- Preview panel  
- Uses same sandbox as runtime  
- Includes debug overlay  
- Never affects the main canvas  

---

# 7. Pipelines

Connect widgets via event rules.

Structure:

```
Pipeline
  nodes[]
  connections[]
```

Compiler subscribes to source → emits to target.

---

# 8. Ecosystems (Future)

Groups of canvases + pipelines.  
Not built in Phase 1.

---

# 9. Size Presets

```
"xs" | "sm" | "md" | "lg" | "xl" | "banner" | "full"
```

Required for consistent layout and AI widget generation.

---

# 10. AI Widget Generator

Must:

- Understand manifest  
- Understand WidgetAPI  
- Generate multi-file bundles  
- Generate pipelines  
- Save widgets to Supabase  
- Appear in Widget Lab  
- Support React, vanilla JS, HTML  

---

# 11. Debugging Tools

- Iframe error boundaries  
- Debug panel  
- Console forwarding  
- AI debugging via Opus/GPT  

---

# 12. Summary

The widget system is:

- flexible  
- isolated  
- pipeline-capable  
- AI-powered  
- stable for user uploads  
- consistent across 2D, 3D, audio, and video widgets  

