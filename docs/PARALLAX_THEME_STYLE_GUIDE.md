# StickerNest Parallax Theme Style Guide

This guide documents the themed parallax UI system and provides patterns for restyling the rest of the site consistently.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Theme Structure](#theme-structure)
3. [Color System](#color-system)
4. [Glass Effects](#glass-effects)
5. [Parallax Backgrounds](#parallax-backgrounds)
6. [Component Patterns](#component-patterns)
7. [Animation Guidelines](#animation-guidelines)
8. [Implementation Examples](#implementation-examples)

---

## Design Philosophy

The themed parallax UI follows these principles:

1. **Layered Depth** - Multiple visual layers create depth (background → particles → glass panels → content)
2. **Theme-Aware** - All colors, effects, and animations adapt to the active theme
3. **Subtle Motion** - Animations enhance without distracting (parallax, floating particles, soft pulses)
4. **Glass Morphism** - Frosted glass panels let backgrounds show through
5. **Accessibility** - Reduced motion support, sufficient contrast ratios

---

## Theme Structure

### Theme Object Shape

```typescript
interface CustomTheme {
  id: string;
  name: string;
  mode: 'dark' | 'light';

  appBackground: {
    type: 'solid' | 'gradient' | 'image' | 'parallax';
    // For parallax type:
    parallax?: ParallaxConfig;
  };

  colors: {
    background: { primary, secondary, tertiary, surface, elevated, overlay };
    text: { primary, secondary, tertiary, muted, inverse, link };
    accent: { primary, secondary, tertiary, hover, active };
    border: { primary, secondary, accent, focus };
    semantic: { success, warning, error, info + Bg variants };
  };

  effects: {
    glassBlur: number;        // 0-20px
    glassOpacity: number;     // 0-1
    shadowIntensity: number;  // 0-2
    radiusScale: number;      // 0.5-2
    glowEnabled: boolean;
    glowColor?: string;
    canvasGlass?: CanvasGlassConfig;
    navbarGlass?: NavbarGlassConfig;
  };
}
```

### Available Theme Presets

| Theme ID | Name | Type | Accent Color |
|----------|------|------|--------------|
| `dark-blue` | Midnight Aurora | Gradient | Purple `#8b5cf6` |
| `light-clean` | Light Clean | Solid | Blue `#3b82f6` |
| `bubbles-sky` | Bubbles & Sky | Parallax | Cyan `#4ecdc4` |
| `autumn-fireflies` | Autumn Fireflies | Parallax | Orange `#ff9800` |

---

## Color System

### CSS Variables

Always use CSS variables instead of hardcoded colors:

```css
/* Backgrounds */
var(--sn-bg-primary)      /* Main background */
var(--sn-bg-secondary)    /* Slightly lighter */
var(--sn-bg-tertiary)     /* Cards, panels */
var(--sn-bg-surface)      /* Interactive surfaces */
var(--sn-bg-elevated)     /* Floating elements */
var(--sn-bg-overlay)      /* Modal overlays */

/* Text */
var(--sn-text-primary)    /* Main text - high contrast */
var(--sn-text-secondary)  /* Supporting text */
var(--sn-text-tertiary)   /* Less important text */
var(--sn-text-muted)      /* Disabled/placeholder */
var(--sn-text-link)       /* Links */

/* Accents */
var(--sn-accent-primary)  /* Primary actions */
var(--sn-accent-hover)    /* Hover state */
var(--sn-accent-active)   /* Active/pressed state */
var(--sn-accent-gradient) /* Gradient for special elements */

/* Borders */
var(--sn-border-primary)  /* Default borders */
var(--sn-border-accent)   /* Accent borders */
var(--sn-border-focus)    /* Focus rings */

/* Semantic */
var(--sn-success)         /* Success states */
var(--sn-warning)         /* Warning states */
var(--sn-error)           /* Error states */
var(--sn-info)            /* Info states */
```

### Color Usage by Theme

#### Bubbles & Sky Theme
```css
--sn-accent-primary: #4ecdc4;  /* Cyan */
--sn-accent-secondary: #45b7d1; /* Teal */
--sn-bg-primary: #0f1628;       /* Deep blue-gray */
```

#### Autumn Fireflies Theme
```css
--sn-accent-primary: #ff9800;  /* Orange */
--sn-accent-secondary: #ffa726; /* Amber */
--sn-bg-primary: #1a0f0a;       /* Deep brown */
```

---

## Glass Effects

### CSS Variables for Glass

```css
/* Canvas glass */
var(--sn-canvas-glass-blur)         /* Backdrop blur amount */
var(--sn-canvas-glass-tint)         /* Background tint color */
var(--sn-canvas-glass-border)       /* Border color */
var(--sn-canvas-glass-border-width) /* Border width */
var(--sn-canvas-glass-inner-shadow) /* Inner shadow for depth */

/* Navbar glass */
var(--sn-navbar-glass-blur)
var(--sn-navbar-glass-tint)
var(--sn-navbar-glass-border)

/* General glass */
var(--sn-glass-blur)    /* Default blur: 12px */
var(--sn-glass-bg)      /* Glass background */
var(--sn-glass-border)  /* Glass border */
```

### Glass Panel Pattern

```tsx
// Using the utility class
<div className="sn-canvas-glass">
  {/* Content shows through frosted background */}
</div>

// Or with inline styles
const glassStyles: React.CSSProperties = {
  background: 'var(--sn-canvas-glass-tint)',
  backdropFilter: 'blur(var(--sn-canvas-glass-blur))',
  WebkitBackdropFilter: 'blur(var(--sn-canvas-glass-blur))',
  border: '1px solid var(--sn-canvas-glass-border)',
  borderRadius: 'var(--sn-radius-xl)',
  boxShadow: 'var(--sn-canvas-glass-inner-shadow)',
};
```

### Glass Effect Hierarchy

| Element | Blur | Tint Opacity | Use Case |
|---------|------|--------------|----------|
| Navbar | 12px | 70-80% | Navigation, always visible |
| Sidebar | 16-24px | 80-90% | Main panels |
| Canvas | 18-20px | 5-10% | Let parallax show through |
| Modal | 20px | 85-95% | Focus attention |
| Tooltip | 8px | 90% | Quick info |

---

## Parallax Backgrounds

### ParallaxConfig Structure

```typescript
interface ParallaxConfig {
  enabled: boolean;
  intensity: number;        // 0-1, mouse movement multiplier
  mouseParallax?: boolean;  // Respond to mouse
  animationSpeed?: number;  // Animation speed multiplier
  baseGradient?: GradientConfig;
  layers: ParallaxLayer[];
}
```

### Layer Types

#### 1. Particle Layers
```typescript
{
  id: 'bubbles',
  type: 'particles',
  depth: 0.5,           // 0 = back, 1 = front
  opacity: 0.8,
  particles: {
    type: 'bubbles',    // bubbles | fireflies | bokeh | dust | stars
    count: 25,
    sizeMin: 30,
    sizeMax: 80,
    colors: ['rgba(78, 205, 196, 0.4)', ...],
    opacityMin: 0.4,
    opacityMax: 0.7,
    speed: 0.5,
    glow: true,
    glowIntensity: 0.5,
    direction: 'float', // float | up | down | random
  },
}
```

#### 2. Shape Layers
```typescript
{
  id: 'leaves',
  type: 'shapes',
  depth: 0.3,
  opacity: 0.3,
  shapes: {
    type: 'leaf',       // circle | blob | leaf | custom
    count: 8,
    sizeMin: 40,
    sizeMax: 100,
    colors: ['rgba(180, 90, 40, 0.5)', ...],
    rotate: true,
    blur: 2,
  },
}
```

#### 3. Gradient Layers
```typescript
{
  id: 'glow',
  type: 'gradient',
  depth: 0.1,
  opacity: 0.5,
  blendMode: 'screen',
  gradient: {
    type: 'radial',
    stops: [
      { color: 'rgba(255, 170, 100, 0.3)', position: 0 },
      { color: 'transparent', position: 70 },
    ],
  },
}
```

### Recommended Layer Stack

```
Back → Front (depth 0 → 1)

1. Base gradient (depth: 0)
2. Background bokeh/glow (depth: 0.1-0.2)
3. Shape silhouettes (depth: 0.2-0.3)
4. Mid-layer particles (depth: 0.4-0.6)
5. Foreground particles (depth: 0.7-0.9)
6. Glass panels (on top)
7. Content (highest z-index)
```

---

## Component Patterns

### 1. Themed Container

```tsx
import { useThemeStore } from '../state/useThemeStore';

const ThemedContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentTheme = useThemeStore(s => s.currentTheme);
  const hasParallax = currentTheme?.appBackground?.type === 'parallax';

  return (
    <div style={{
      background: hasParallax ? 'transparent' : 'var(--sn-bg-primary)',
      minHeight: '100vh',
    }}>
      {hasParallax && <ThemedAppBackground />}
      <div style={{
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </div>
    </div>
  );
};
```

### 2. Glass Card

```tsx
const GlassCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentTheme = useThemeStore(s => s.currentTheme);
  const glassEnabled = currentTheme?.effects?.canvasGlass?.enabled;

  return (
    <div style={{
      background: glassEnabled
        ? 'var(--sn-canvas-glass-tint)'
        : 'var(--sn-bg-surface)',
      backdropFilter: glassEnabled ? 'blur(16px)' : undefined,
      WebkitBackdropFilter: glassEnabled ? 'blur(16px)' : undefined,
      border: `1px solid ${glassEnabled
        ? 'var(--sn-canvas-glass-border)'
        : 'var(--sn-border-primary)'}`,
      borderRadius: 'var(--sn-radius-lg)',
      padding: 'var(--sn-space-4)',
    }}>
      {children}
    </div>
  );
};
```

### 3. Accent Button

```tsx
const AccentButton: React.FC<ButtonProps> = ({ children, ...props }) => (
  <button
    style={{
      background: 'var(--sn-accent-primary)',
      color: 'var(--sn-text-inverse)',
      border: 'none',
      borderRadius: 'var(--sn-radius-md)',
      padding: 'var(--sn-space-3) var(--sn-space-4)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--sn-accent-hover)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'var(--sn-accent-primary)';
    }}
    {...props}
  >
    {children}
  </button>
);
```

### 4. Theme-Aware Text Gradient

```tsx
const GradientHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 style={{
    background: 'var(--sn-accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}>
    {children}
  </h1>
);
```

---

## Animation Guidelines

### CSS Animation Variables

```css
/* Durations */
var(--sn-duration-instant)  /* 75ms - micro interactions */
var(--sn-duration-fast)     /* 150ms - quick feedback */
var(--sn-duration-normal)   /* 250ms - standard transitions */
var(--sn-duration-slow)     /* 400ms - emphasis */
var(--sn-duration-slower)   /* 600ms - dramatic */

/* Easings */
var(--sn-ease-spring-snappy)  /* Bouncy, energetic */
var(--sn-ease-spring-smooth)  /* Smooth with slight overshoot */
var(--sn-ease-out-expo)       /* Quick start, slow end */
```

### Parallax Animation Classes

```css
.sn-bubble-animate    /* Floating bubble motion */
.sn-firefly-animate   /* Firefly wander + pulse */
.sn-bokeh-animate     /* Soft bokeh drift */
.sn-leaf-animate      /* Falling leaf with sway */
.sn-dust-animate      /* Gentle dust float */
.sn-star-animate      /* Star twinkle */
```

### Animation Best Practices

1. **Use CSS variables for consistency**
   ```css
   transition: transform var(--sn-duration-fast) var(--sn-ease-out-expo);
   ```

2. **Respect reduced motion**
   ```css
   @media (prefers-reduced-motion: reduce) {
     animation: none !important;
     transition: none !important;
   }
   ```

3. **Layer animations by importance**
   - Background: Slow, subtle (15-30s cycles)
   - UI elements: Medium (200-400ms)
   - Micro-interactions: Fast (75-150ms)

4. **Use `will-change` sparingly**
   ```css
   .animated-element {
     will-change: transform, opacity;
   }
   ```

---

## Implementation Examples

### Restyling a Page with Parallax Support

```tsx
// Before: Static background
const MyPage: React.FC = () => (
  <div style={{ background: '#0a0a1a', minHeight: '100vh' }}>
    <h1>My Page</h1>
  </div>
);

// After: Theme-aware with parallax support
import { useThemeStore } from '../state/useThemeStore';
import { ThemedAppBackground } from '../components/ThemedAppBackground';

const MyPage: React.FC = () => {
  const currentTheme = useThemeStore(s => s.currentTheme);
  const hasParallax = currentTheme?.appBackground?.type === 'parallax';

  return (
    <div style={{
      background: hasParallax ? 'transparent' : 'var(--sn-bg-primary)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      {hasParallax && <ThemedAppBackground />}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 style={{ color: 'var(--sn-text-primary)' }}>My Page</h1>
      </div>
    </div>
  );
};
```

### Adding Glass Effect to Existing Panel

```tsx
// Before: Solid background
<div style={{
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: 20,
}}>

// After: Theme-aware glass
import { useThemeStore } from '../state/useThemeStore';

const MyPanel: React.FC = () => {
  const glassEnabled = useThemeStore(s => s.currentTheme?.effects?.canvasGlass?.enabled);

  return (
    <div style={{
      background: glassEnabled
        ? 'var(--sn-canvas-glass-tint)'
        : 'var(--sn-bg-tertiary)',
      backdropFilter: glassEnabled ? 'blur(var(--sn-canvas-glass-blur))' : undefined,
      WebkitBackdropFilter: glassEnabled ? 'blur(var(--sn-canvas-glass-blur))' : undefined,
      border: `1px solid ${glassEnabled
        ? 'var(--sn-canvas-glass-border)'
        : 'var(--sn-border-primary)'}`,
      borderRadius: 'var(--sn-radius-lg)',
      padding: 'var(--sn-space-5)',
      boxShadow: glassEnabled ? 'var(--sn-canvas-glass-inner-shadow)' : undefined,
    }}>
      {/* Content */}
    </div>
  );
};
```

### Theme Selector Component

```tsx
import { useThemeStore } from '../state/useThemeStore';
import { themePresets } from '../themes/presets';

const ThemeSelector: React.FC = () => {
  const currentTheme = useThemeStore(s => s.currentTheme);
  const setTheme = useThemeStore(s => s.setTheme);

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {themePresets.map(theme => (
        <button
          key={theme.id}
          onClick={() => setTheme(theme.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: currentTheme?.id === theme.id
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(255,255,255,0.03)',
            border: `2px solid ${currentTheme?.id === theme.id
              ? theme.colors.accent.primary
              : 'transparent'}`,
            borderRadius: 8,
            color: 'var(--sn-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: theme.colors.accent.primary,
          }} />
          {theme.name}
        </button>
      ))}
    </div>
  );
};
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/types/customTheme.ts` | Theme type definitions |
| `src/state/useThemeStore.ts` | Theme state management |
| `src/themes/presets/*.ts` | Theme preset definitions |
| `src/styles/theme-tokens.css` | CSS variables & animations |
| `src/components/ParallaxBackground.tsx` | Parallax renderer |
| `src/components/ThemedAppBackground.tsx` | App-level background |
| `src/components/CanvasGlassWrapper.tsx` | Glass effect wrapper |

---

## Checklist for Restyling a Component

- [ ] Replace hardcoded colors with CSS variables
- [ ] Add theme store subscription if needed
- [ ] Check if component should show parallax background
- [ ] Add glass effect support for panels/cards
- [ ] Use theme accent color for interactive elements
- [ ] Test with all 4 theme presets
- [ ] Verify reduced motion support
- [ ] Check contrast ratios for accessibility
