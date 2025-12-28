# StickerNest v2 - Complete Theming Audit & Implementation Plan

## Executive Summary

This document outlines a comprehensive 4-phase plan to transform StickerNest v2 into a fully theme-able application. The audit identified **200+ hardcoded color values** across 18 pages and 100+ components that need to be replaced with CSS variables from our existing theme token system.

**Current State:**
- Excellent theme token system defined in `theme-tokens.css` (1,248 lines)
- Poor adoption across pages/components
- Parallax theme system implemented but not integrated everywhere
- Glass effects available but inconsistently applied

**Target State:**
- All colors use CSS variables
- All components respond to theme changes
- Consistent glass morphism effects
- Full parallax background support app-wide

---

## Phase 1: Foundation (Core Pages)
**Priority: CRITICAL**
**Estimated Files: 5**

The core user-facing pages have the most hardcoded values and provide the first impression of theming consistency.

### 1.1 LandingPage.tsx (HIGHEST PRIORITY)
**File:** `src/pages/LandingPage.tsx`
**Hardcoded Values:** 150+
**Status:** Partially themed (has ThemedAppBackground)

#### Tasks:
- [ ] **1.1.1** Replace `styles` object colors with CSS variables
  - [ ] Convert orb gradients to use `--sn-orb-*` variables
  - [ ] Replace background gradients with `--sn-bg-gradient`
  - [ ] Update glass effects to use `--sn-glass-*` variables
  - [ ] Convert text colors to `--sn-text-*` variables
  - [ ] Update accent colors to `--sn-accent-*` variables

- [ ] **1.1.2** Theme the feature cards section
  - [ ] Replace hardcoded dot colors (`#a78bfa`, `#f472b6`, `#fb923c`)
  - [ ] Theme card backgrounds and borders
  - [ ] Theme hover states

- [ ] **1.1.3** Theme the waitlist/signup form
  - [ ] Input field backgrounds and borders
  - [ ] Button gradients and hover states
  - [ ] Success/error state colors

- [ ] **1.1.4** Theme the header/navigation
  - [ ] Logo colors and gradients
  - [ ] Nav link colors and hover states
  - [ ] Mobile menu theming

- [ ] **1.1.5** Theme the footer
  - [ ] Background colors
  - [ ] Link colors
  - [ ] Gradient accents

**Hardcoded Values to Replace:**
```typescript
// Current hardcoded values → CSS variables
'#0a0a12' → 'var(--sn-bg-primary)'
'rgba(139, 92, 246, 0.35)' → 'var(--sn-orb-purple)'
'rgba(244, 114, 182, 0.3)' → 'var(--sn-orb-pink)'
'rgba(251, 146, 60, 0.25)' → 'var(--sn-orb-amber)'
'#f4f4f5' → 'var(--sn-text-primary)'
'#a1a1aa' → 'var(--sn-text-secondary)'
'rgba(167, 139, 250, 0.15)' → 'var(--sn-glass-bg)'
```

---

### 1.2 HomePage.tsx
**File:** `src/pages/HomePage.tsx`
**Hardcoded Values:** 20+

#### Tasks:
- [ ] **1.2.1** Add ThemedAppBackground component
- [ ] **1.2.2** Replace header colors with CSS variables
  - [ ] Logo gradient colors
  - [ ] Navigation colors
- [ ] **1.2.3** Theme the demo canvas section
  - [ ] Container backgrounds
  - [ ] Border colors
- [ ] **1.2.4** Theme button styles
  - [ ] Primary buttons
  - [ ] Secondary buttons
- [ ] **1.2.5** Apply glass wrapper to main content area

---

### 1.3 LoginPage.tsx
**File:** `src/pages/LoginPage.tsx`
**Hardcoded Values:** 40+

#### Tasks:
- [ ] **1.3.1** Replace background gradient with theme variable
- [ ] **1.3.2** Theme the login card
  - [ ] Card background and border
  - [ ] Glass effect application
- [ ] **1.3.3** Theme form elements
  - [ ] Input backgrounds and borders
  - [ ] Focus states
  - [ ] Error states
- [ ] **1.3.4** Theme OAuth buttons
  - [ ] Keep brand colors for Google/GitHub logos
  - [ ] Theme button backgrounds
- [ ] **1.3.5** Theme text elements
  - [ ] Headings
  - [ ] Labels
  - [ ] Links

---

### 1.4 SignupPage.tsx
**File:** `src/pages/SignupPage.tsx`

#### Tasks:
- [ ] **1.4.1** Apply same theming patterns as LoginPage
- [ ] **1.4.2** Theme registration form
- [ ] **1.4.3** Theme progress indicators (if any)

---

### 1.5 ProfilePage.tsx
**File:** `src/pages/ProfilePage.tsx`

#### Tasks:
- [ ] **1.5.1** Theme profile header/avatar section
- [ ] **1.5.2** Theme settings/preferences cards
- [ ] **1.5.3** Theme form elements
- [ ] **1.5.4** Apply glass effects where appropriate

---

## Phase 2: Navigation & Layout
**Priority: HIGH**
**Estimated Files: 4**

The layout components affect every page and ensure consistent theming throughout the app.

### 2.1 DefaultLayout.tsx
**File:** `src/layouts/DefaultLayout.tsx`
**Hardcoded Values:** 10+

#### Tasks:
- [ ] **2.1.1** Replace hardcoded rgba values for nav states
  - [ ] `rgba(139, 92, 246, 0.3)` → `var(--sn-accent-primary-30)`
  - [ ] Active state backgrounds
  - [ ] Hover state backgrounds
- [ ] **2.1.2** Theme the sidebar
  - [ ] Background gradient
  - [ ] Border colors
  - [ ] Icon colors
- [ ] **2.1.3** Ensure ThemedAppBackground is visible through glass
- [ ] **2.1.4** Theme mobile navigation

---

### 2.2 AppShell.tsx
**File:** `src/layouts/AppShell.tsx`
**Hardcoded Values:** 8+

#### Tasks:
- [ ] **2.2.1** Replace CSS variable fallbacks with actual fallbacks from theme
- [ ] **2.2.2** Theme toolbar area
- [ ] **2.2.3** Theme bottom navigation
- [ ] **2.2.4** Ensure responsive theming works

---

### 2.3 MobileNav Components
**Files:** `src/components/MobileNav/*`

#### Tasks:
- [ ] **2.3.1** Theme MobileHeader
- [ ] **2.3.2** Theme MobileBottomSheet
- [ ] **2.3.3** Theme MobileActionButton

---

### 2.4 Sidebar Component
**File:** `src/components/Sidebar.tsx`

#### Tasks:
- [ ] **2.4.1** Theme sidebar background
- [ ] **2.4.2** Theme menu items and icons
- [ ] **2.4.3** Theme active/hover states
- [ ] **2.4.4** Apply glass effect

---

## Phase 3: Editor & Canvas
**Priority: HIGH**
**Estimated Files: 25+**

The editor is the core of the application and needs comprehensive theming.

### 3.1 EditorPage.tsx
**File:** `src/pages/EditorPage.tsx`
**Hardcoded Values:** 15+

#### Tasks:
- [ ] **3.1.1** Theme editor header
  - [ ] Background color (`#09090b`)
  - [ ] Button styles
  - [ ] Border colors
- [ ] **3.1.2** Theme slide-out panels
  - [ ] Library panel
  - [ ] Layers panel
- [ ] **3.1.3** Theme properties panel
- [ ] **3.1.4** Apply glass effects to panels

---

### 3.2 CanvasPage.tsx
**File:** `src/pages/CanvasPage.tsx`

#### Tasks:
- [ ] **3.2.1** Verify ThemedAppBackground integration
- [ ] **3.2.2** Theme canvas controls
- [ ] **3.2.3** Theme zoom controls
- [ ] **3.2.4** Apply CanvasGlassWrapper

---

### 3.3 Canvas Components

#### 3.3.1 CanvasRenderer
- [ ] Ensure canvas background respects theme
- [ ] Theme selection handles
- [ ] Theme grid overlay

#### 3.3.2 PropertiesPanel
- [ ] Theme panel background
- [ ] Theme input fields
- [ ] Theme section headers
- [ ] Theme color pickers

#### 3.3.3 LayersPanel
- [ ] Theme layer list items
- [ ] Theme drag handles
- [ ] Theme visibility toggles

#### 3.3.4 ContextToolbar
- [ ] Theme toolbar background
- [ ] Theme tool buttons
- [ ] Theme active states

#### 3.3.5 SelectionBoundsOverlay
- [ ] Theme selection border colors
- [ ] Theme resize handles

---

### 3.4 Widget Components

#### Tasks:
- [ ] **3.4.1** Theme WidgetLibrary
- [ ] **3.4.2** Theme WidgetLibraryPanel
- [ ] **3.4.3** Theme WidgetDetailsDrawer
- [ ] **3.4.4** Theme WidgetContextMenu
- [ ] **3.4.5** Theme WidgetSettingsPanel
- [ ] **3.4.6** Theme widget cards/thumbnails

---

### 3.5 Pipeline Components

#### Tasks:
- [ ] **3.5.1** Theme PipelinePanel
- [ ] **3.5.2** Theme PipelineInspector
- [ ] **3.5.3** Theme connection lines
- [ ] **3.5.4** Theme port indicators

---

### 3.6 DockPanel
**File:** `src/components/DockPanel.tsx`

#### Tasks:
- [ ] **3.6.1** Theme panel background
- [ ] **3.6.2** Theme docked widget cards
- [ ] **3.6.3** Theme resize handles

---

## Phase 4: Polish & Remaining Components
**Priority: MEDIUM**
**Estimated Files: 60+**

Complete the theming across all remaining components and ensure consistency.

### 4.1 Gallery & Marketplace Pages

#### Tasks:
- [ ] **4.1.1** Theme GalleryPage.tsx
- [ ] **4.1.2** Theme MarketplacePage.tsx
- [ ] **4.1.3** Theme canvas cards/thumbnails
- [ ] **4.1.4** Theme filters and search

---

### 4.2 Settings & Preferences

#### Tasks:
- [ ] **4.2.1** Theme SettingsPage.tsx
- [ ] **4.2.2** Theme ThemeCustomizer component
- [ ] **4.2.3** Theme PresetPicker
- [ ] **4.2.4** Theme SkinPicker

---

### 4.3 AI Sidebar Components
**Directory:** `src/components/ai-sidebar/`

#### Tasks:
- [ ] **4.3.1** Theme ChatInterface
- [ ] **4.3.2** Theme CodeEditor
- [ ] **4.3.3** Theme DraftPanel
- [ ] **4.3.4** Theme all sidebar tabs
- [ ] **4.3.5** Apply glass effects

---

### 4.4 Widget Generator
**Directory:** `src/components/widget-generator/`

#### Tasks:
- [ ] **4.4.1** Theme generation panels
- [ ] **4.4.2** Theme code output
- [ ] **4.4.3** Theme preview area
- [ ] **4.4.4** Theme publishing panel

---

### 4.5 Dialog Components

#### Tasks:
- [ ] **4.5.1** Theme AuthModal
- [ ] **4.5.2** Theme ShareDialog
- [ ] **4.5.3** Theme CanvasSizeDialog
- [ ] **4.5.4** Theme CanvasSettingsDialog
- [ ] **4.5.5** Theme PermissionDialog
- [ ] **4.5.6** Apply glass backdrop to all modals

---

### 4.6 Dev & Debug Tools
**Directory:** `src/components/dev/`

#### Tasks:
- [ ] **4.6.1** Theme DevToolbar
- [ ] **4.6.2** Theme StateInspector
- [ ] **4.6.3** Theme PerformanceMonitor
- [ ] **4.6.4** Theme MessageLogger
- [ ] **4.6.5** Theme FeatureFlagsPanel

---

### 4.7 Form Components

#### Tasks:
- [ ] **4.7.1** Create themed input styles
- [ ] **4.7.2** Create themed button styles
- [ ] **4.7.3** Create themed select styles
- [ ] **4.7.4** Create themed checkbox/radio styles
- [ ] **4.7.5** Document form theming patterns

---

### 4.8 Utility Pages

#### Tasks:
- [ ] **4.8.1** Theme RouteErrorPage
- [ ] **4.8.2** Theme SharedCanvasPage
- [ ] **4.8.3** Theme EmbedCanvasPage
- [ ] **4.8.4** Theme AuthCallbackPage

---

### 4.9 Final QA & Documentation

#### Tasks:
- [ ] **4.9.1** Test all 4 themes across all pages
- [ ] **4.9.2** Verify glass effects work with parallax
- [ ] **4.9.3** Test reduced motion preferences
- [ ] **4.9.4** Test dark mode consistency
- [ ] **4.9.5** Update component documentation
- [ ] **4.9.6** Create theme creation guide

---

## CSS Variable Reference

### Background Colors
```css
--sn-bg-primary       /* Main background */
--sn-bg-secondary     /* Secondary areas */
--sn-bg-tertiary      /* Tertiary areas */
--sn-bg-surface       /* Card surfaces */
--sn-bg-elevated      /* Elevated surfaces */
--sn-bg-overlay       /* Overlay backgrounds */
--sn-bg-gradient      /* Gradient backgrounds */
```

### Text Colors
```css
--sn-text-primary     /* Primary text */
--sn-text-secondary   /* Secondary text */
--sn-text-tertiary    /* Tertiary text */
--sn-text-muted       /* Muted/disabled text */
--sn-text-link        /* Link text */
```

### Accent Colors
```css
--sn-accent-primary   /* Primary accent (purple) */
--sn-accent-secondary /* Secondary accent */
--sn-accent-hover     /* Hover states */
--sn-accent-active    /* Active states */
--sn-accent-primary-10 through -50  /* Opacity variants */
```

### Glass Effects
```css
--sn-glass-bg         /* Glass background */
--sn-glass-blur       /* Backdrop blur amount */
--sn-glass-border     /* Glass border color */
--sn-glass-shadow     /* Glass shadow */
```

### Orb/Parallax
```css
--sn-orb-purple       /* Purple orb gradient */
--sn-orb-coral        /* Coral orb gradient */
--sn-orb-pink         /* Pink orb gradient */
--sn-orb-amber        /* Amber orb gradient */
```

---

## Implementation Guidelines

### Pattern: Replacing Hardcoded Colors

**Before:**
```typescript
const styles = {
  container: {
    background: 'linear-gradient(135deg, #0a0a12 0%, #0f0a18 50%)',
    color: '#f4f4f5',
  }
};
```

**After:**
```typescript
const styles = {
  container: {
    background: 'var(--sn-bg-gradient)',
    color: 'var(--sn-text-primary)',
  }
};
```

### Pattern: Glass Effects

```typescript
import { CanvasGlassWrapper } from '../components/CanvasGlassWrapper';

<CanvasGlassWrapper>
  {/* Content */}
</CanvasGlassWrapper>
```

### Pattern: Themed Background

```typescript
import { ThemedAppBackground } from '../components/ThemedAppBackground';

return (
  <div>
    <ThemedAppBackground />
    {/* Page content */}
  </div>
);
```

---

## File Inventory by Phase

### Phase 1 (5 files)
1. `src/pages/LandingPage.tsx`
2. `src/pages/HomePage.tsx`
3. `src/pages/LoginPage.tsx`
4. `src/pages/SignupPage.tsx`
5. `src/pages/ProfilePage.tsx`

### Phase 2 (4 files)
1. `src/layouts/DefaultLayout.tsx`
2. `src/layouts/AppShell.tsx`
3. `src/components/MobileNav/*`
4. `src/components/Sidebar.tsx`

### Phase 3 (25+ files)
1. `src/pages/EditorPage.tsx`
2. `src/pages/CanvasPage.tsx`
3. `src/components/Canvas*.tsx`
4. `src/components/PropertiesPanel.tsx`
5. `src/components/LayersPanel.tsx`
6. `src/components/ContextToolbar.tsx`
7. `src/components/Widget*.tsx`
8. `src/components/Pipeline*.tsx`
9. `src/components/DockPanel.tsx`

### Phase 4 (60+ files)
- All remaining pages
- All AI sidebar components
- All widget generator components
- All dialog components
- All dev tools
- All utility pages

---

## Success Criteria

### Phase 1 Complete When:
- [ ] LandingPage has 0 hardcoded color values
- [ ] HomePage has 0 hardcoded color values
- [ ] LoginPage has 0 hardcoded color values
- [ ] All 4 themes work correctly on these pages
- [ ] Glass effects render properly

### Phase 2 Complete When:
- [ ] Navigation responds to theme changes
- [ ] Sidebar uses CSS variables
- [ ] Mobile navigation is themed
- [ ] Layout backgrounds are transparent for parallax

### Phase 3 Complete When:
- [ ] Editor panels use CSS variables
- [ ] Canvas controls are themed
- [ ] Widget library is themed
- [ ] Pipeline connections are themed

### Phase 4 Complete When:
- [ ] All remaining components use CSS variables
- [ ] All dialogs have glass effects
- [ ] Dev tools are themed
- [ ] Full QA completed across all themes

---

## Notes

- **Brand Colors Exception:** OAuth buttons (Google, GitHub) should keep their brand colors for recognition
- **Accessibility:** Ensure contrast ratios meet WCAG AA standards
- **Performance:** Use CSS variables directly, avoid JavaScript color calculations at runtime
- **Reduced Motion:** Respect `prefers-reduced-motion` for animations
