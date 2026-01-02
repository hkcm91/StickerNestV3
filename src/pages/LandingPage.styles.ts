/**
 * StickerNest v2 - Landing Page Styles
 * Extracted and themed with CSS variables for full theme support.
 *
 * Based on KDE Plasma-inspired glass morphism aesthetic with:
 * - Floating orbs and particles
 * - Frosted glass panels
 * - Warm color accents
 */

import React from 'react';

export const landingStyles: Record<string, React.CSSProperties> = {
  // ==========================================================================
  // Page Container
  // ==========================================================================
  page: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    background: 'var(--sn-bg-gradient)',
    color: 'var(--sn-text-primary)',
    fontFamily: 'var(--sn-font-sans)',
    position: 'relative',
  },

  // ==========================================================================
  // Ambient Orbs (fallback when no parallax theme)
  // ==========================================================================
  orbContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orbPurple: {
    width: 450,
    height: 450,
    background: 'var(--sn-orb-purple)',
    top: '-5%',
    left: '-5%',
    filter: 'blur(80px)',
  },
  orbPink: {
    width: 350,
    height: 350,
    background: 'var(--sn-orb-pink)',
    top: '40%',
    right: '5%',
    filter: 'blur(70px)',
  },
  orbCoral: {
    width: 300,
    height: 300,
    background: 'var(--sn-orb-coral)',
    bottom: '5%',
    left: '25%',
    filter: 'blur(60px)',
  },
  orbCyan: {
    width: 250,
    height: 250,
    background: 'radial-gradient(circle, var(--sn-rainbow-cyan, rgba(34, 211, 238, 0.2)) 0%, transparent 70%)',
    bottom: '30%',
    right: '30%',
    filter: 'blur(50px)',
  },

  // ==========================================================================
  // Left Panel - Enhanced Glass Morphism Sidebar
  // ==========================================================================
  leftPanel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    // Deep glass morphism with purple tint
    background: 'linear-gradient(180deg, rgba(15, 15, 36, 0.88) 0%, rgba(15, 15, 36, 0.95) 100%)',
    backdropFilter: 'blur(32px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(32px) saturate(1.3)',
    position: 'relative',
    zIndex: 10,
    transition: 'opacity 0.5s ease, transform 0.5s ease',
    overflow: 'hidden',
    // Glass edge highlights
    borderRight: '1px solid rgba(139, 92, 246, 0.15)',
    boxShadow: '4px 0 32px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.03)',
  },

  // ==========================================================================
  // Logo Section
  // ==========================================================================
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 44,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  nestIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    // Light sticker shadow
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #fff 0%, var(--sn-cozy-lavender) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  alphaTag: {
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--sn-accent-tertiary, #a78bfa)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '5px 10px',
    background: 'rgba(139, 92, 246, 0.12)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    borderRadius: 12,
    border: '1px solid rgba(139, 92, 246, 0.25)',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.15)',
  },

  // ==========================================================================
  // Hero Section
  // ==========================================================================
  heroSection: { marginBottom: 36 },
  headline: {
    fontSize: 42,
    fontWeight: 700,
    lineHeight: 1.08,
    margin: 0,
    marginBottom: 18,
    letterSpacing: '-1.5px',
    color: 'var(--sn-text-primary)',
  },
  headlineAccent: {
    // Solid color accent instead of gradient
    color: 'var(--sn-cozy-lavender, #a78bfa)',
  },
  subheadline: {
    fontSize: 15,
    color: 'var(--sn-text-secondary)',
    lineHeight: 1.7,
    margin: 0,
  },

  // ==========================================================================
  // Features Section - Glass Card
  // ==========================================================================
  featuresSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 36,
    padding: '20px',
    background: 'rgba(139, 92, 246, 0.06)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.15)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 14,
    color: 'var(--sn-text-secondary)',
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  // Feature dot colors - use inline style overrides
  featureDotPurple: { background: 'var(--sn-accent-tertiary)' },
  featureDotPink: { background: 'var(--sn-cozy-pink)' },
  featureDotOrange: { background: 'var(--sn-cozy-coral-soft)' },

  // ==========================================================================
  // Theme Selector
  // ==========================================================================
  themeSection: {
    marginBottom: 24,
  },
  themeSectionLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--sn-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 10,
  },
  themeButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    minHeight: 44,
    fontSize: 13,
    color: 'var(--sn-text-secondary)',
    background: 'var(--sn-glass-bg-light)',
    border: '1px solid var(--sn-glass-border)',
    borderRadius: 'var(--sn-radius-md)',
    cursor: 'pointer',
    transition: 'var(--sn-transition-fast, all 0.15s ease)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  themeButtonActive: {
    color: 'var(--sn-text-primary)',
    background: 'var(--sn-accent-primary-10)',
    borderWidth: 2,
  },

  // ==========================================================================
  // Waitlist Section - Glass Morphism
  // ==========================================================================
  waitlistSection: { flex: 1, display: 'flex', flexDirection: 'column' },
  foundingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--sn-cozy-amber, #fbbf24)',
    marginBottom: 18,
    paddingBottom: 18,
    borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
    textShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
  },
  badgeStar: {
    fontSize: 14,
    filter: 'drop-shadow(0 0 4px var(--sn-cozy-amber))',
  },
  waitlistForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  inputGroup: { display: 'flex', gap: 10 },
  emailInput: {
    flex: 1,
    padding: '14px 16px',
    minHeight: 48,
    fontSize: 16, // Prevents iOS zoom on focus
    // Liquid glass input
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    color: 'var(--sn-text-primary)',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  submitButton: {
    padding: '14px 24px',
    minHeight: 48,
    minWidth: 80,
    fontSize: 15,
    fontWeight: 600,
    // Liquid glass button
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(168, 85, 247, 0.85) 50%, rgba(139, 92, 246, 0.95) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    // Liquid depth shadows
    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4), 0 2px 8px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.15)',
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  errorText: { fontSize: 13, color: 'var(--sn-error)' },
  spotsText: { fontSize: 12, color: 'var(--sn-text-muted)' },
  successBox: {
    padding: '16px 20px',
    background: 'var(--sn-success-bg)',
    borderRadius: 'var(--sn-radius-lg)',
    color: 'var(--sn-cozy-mint)',
    fontSize: 14,
    fontWeight: 500,
    border: '1px solid rgba(52, 211, 153, 0.2)',
  },

  // ==========================================================================
  // Mobile Action Bar (Gallery + Widgets buttons)
  // ==========================================================================
  mobileActions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  mobileGalleryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '12px 16px',
    minHeight: 44,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-cozy-lavender)',
    textDecoration: 'none',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  mobileWidgetsBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '12px 16px',
    minHeight: 44,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--sn-cozy-peach)',
    background: 'rgba(251, 146, 60, 0.15)',
    border: '1px solid rgba(251, 146, 60, 0.3)',
    borderRadius: 12,
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },

  // ==========================================================================
  // Navigation Section - Glass Morphism
  // ==========================================================================
  navSection: { marginTop: 'auto', paddingTop: 20 },
  galleryLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 24px',
    minHeight: 48,
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--sn-text-secondary, #94a3b8)',
    textDecoration: 'none',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  linkArrow: {
    fontSize: 16,
    transition: 'transform 0.2s ease',
  },

  // ==========================================================================
  // Main Canvas Area
  // ==========================================================================
  mainArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minWidth: 0,
    position: 'relative',
    zIndex: 5,
    transition: 'opacity 0.6s ease',
  },

  // ==========================================================================
  // Controls Bar
  // ==========================================================================
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    // Sleeker glass controls bar with refined styling
    background: 'linear-gradient(180deg, rgba(20, 15, 35, 0.75) 0%, rgba(15, 12, 28, 0.85) 100%)',
    backdropFilter: 'blur(40px) saturate(200%)',
    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 4px 24px rgba(0, 0, 0, 0.12)',
    flexShrink: 0,
    minHeight: 56,
    position: 'relative',
    zIndex: 10,
  },
  controlsLeft: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 16, 
    flex: 1, 
    minWidth: 0 
  },
  demoLabel: { 
    fontSize: 12, 
    fontWeight: 500, 
    color: 'var(--sn-text-muted)',
    letterSpacing: '0.01em',
  },
  controlsRight: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 8,
  },
  
  // Icon button - glass morphism style for all icon buttons
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    background: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    color: 'var(--sn-text-secondary, #94a3b8)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
  },

  enterGalleryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    background: 'rgba(139, 92, 246, 0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    borderRadius: 10,
    color: 'var(--sn-cozy-lavender)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: '0 0 16px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },

  modeToggle: {
    display: 'flex',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: 'var(--sn-text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  modeButtonActive: {
    background: 'rgba(139, 92, 246, 0.2)',
    color: 'var(--sn-cozy-lavender)',
    boxShadow: '0 0 16px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },

  pipelinesButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    padding: 0,
    background: 'rgba(251, 146, 60, 0.08)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(251, 146, 60, 0.2)',
    borderRadius: 10,
    color: 'var(--sn-cozy-peach)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  pipelinesButtonActive: {
    background: 'rgba(251, 146, 60, 0.18)',
    borderColor: 'rgba(251, 146, 60, 0.35)',
    color: 'var(--sn-cozy-peach)',
    boxShadow: '0 0 16px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },

  // ==========================================================================
  // Canvas Container
  // ==========================================================================
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--sn-bg-primary)',
  },

  canvasHint: {
    padding: '12px 24px',
    background: 'var(--sn-glass-bg)',
    borderTop: '1px solid var(--sn-border-secondary)',
    fontSize: 12,
    color: 'var(--sn-text-muted)',
    textAlign: 'center',
    flexShrink: 0,
  },

  carouselNav: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    zIndex: 60,
  },
  carouselButtonLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'linear-gradient(135deg, rgba(20, 15, 35, 0.4) 0%, rgba(15, 12, 28, 0.5) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    color: 'rgba(226, 232, 240, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 60,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  carouselButtonRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'linear-gradient(135deg, rgba(20, 15, 35, 0.4) 0%, rgba(15, 12, 28, 0.5) 100%)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    color: 'rgba(226, 232, 240, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 60,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  carouselButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(15, 15, 25, 0.85)',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  canvasTitleContainer: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    zIndex: 60,
    pointerEvents: 'none',
  },
  canvasTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    textAlign: 'center',
  },
  canvasDimensions: {
    fontSize: 11,
    color: 'var(--sn-text-muted)',
    letterSpacing: '0.02em',
    marginTop: 2,
  },
  carouselIndicator: {
    padding: '10px 16px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(8,12,24,0.9)',
    color: '#e2e8f0',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 180,
    boxShadow: '0 15px 35px rgba(0,0,0,0.45)',
  },
  broadcastContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 55,
    pointerEvents: 'none',
  },
  broadcastBadge: {
    padding: '10px 14px',
    borderRadius: 14,
    background: 'rgba(3, 7, 18, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontSize: 12,
    pointerEvents: 'auto',
  },
  broadcastBadgeLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  broadcastBadgeMessage: {
    color: '#cbd5f5',
    fontSize: 12,
  },

  // ==========================================================================
  // Widget Placeholders
  // ==========================================================================
  widgetNotFound: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-secondary)',
    color: 'var(--sn-text-muted)',
    fontSize: 12,
  },
  widgetLoading: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-secondary)',
    color: 'var(--sn-text-secondary)',
    fontSize: 12,
  },
};

// =============================================================================
// Inline CSS Animations (for <style> tag)
// =============================================================================
export const landingAnimationsCSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(15px, -20px) scale(1.02); }
    66% { transform: translate(-10px, -30px) scale(0.98); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; height: 100%; overflow: hidden; }
  input::placeholder { color: var(--sn-text-muted); }
  select option { background: var(--sn-bg-secondary); color: var(--sn-text-primary); }

  .sn-orb { position: absolute; border-radius: 50%; pointer-events: none; }
  .sn-orb-float { animation: float 25s ease-in-out infinite; }
  .sn-orb-float-delayed { animation: float 30s ease-in-out infinite; animation-delay: -10s; }
  .sn-orb-pulse { animation: pulse 8s ease-in-out infinite; }

  /* Hover - Glass morphism effects for control bar buttons */
  .sn-controls-bar button:hover:not(:disabled) {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  }
  .sn-controls-bar button:active:not(:disabled) {
    transform: translateY(0) scale(0.96);
  }
  .sn-controls-bar .sn-enter-gallery:hover {
    background: rgba(139, 92, 246, 0.2) !important;
    border-color: rgba(139, 92, 246, 0.4) !important;
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  }
  .sn-controls-bar .sn-mode-toggle button:hover:not([style*="background: rgba(139, 92, 246"]) {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  .sn-controls-bar .sn-mode-toggle button[style*="background: rgba(139, 92, 246"]:hover {
    background: rgba(139, 92, 246, 0.3) !important;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.25) !important;
  }
  button:hover:not(:disabled):not(.sn-controls-bar button) { transform: translateY(-1px); }
  button:active:not(:disabled) { transform: scale(0.98); }
  input:focus { border-color: var(--sn-accent-primary-50) !important; outline: none; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15) !important; }

  /* Gallery link hover in left panel */
  .sn-nav-section a:hover {
    background: rgba(139, 92, 246, 0.12) !important;
    border-color: rgba(139, 92, 246, 0.25) !important;
    color: var(--sn-accent-primary, #8b5cf6) !important;
    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    transform: translateY(-2px);
  }
  .sn-nav-section a:hover span {
    transform: translateX(4px);
  }
  
  /* Carousel navigation button hover effects */
  .sn-carousel-button-left:hover,
  .sn-carousel-button-right:hover {
    background: linear-gradient(135deg, rgba(20, 15, 35, 0.6) 0%, rgba(15, 12, 28, 0.7) 100%) !important;
    border-color: rgba(255, 255, 255, 0.18) !important;
    color: rgba(226, 232, 240, 0.95) !important;
    transform: translateY(-50%) scale(1.05) !important;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
  }
  .sn-carousel-button-left:active,
  .sn-carousel-button-right:active {
    transform: translateY(-50%) scale(0.95) !important;
  }

  /* === MOBILE-FIRST RESPONSIVE (App Store Quality) === */

  /* Tablet: 768-1100px */
  @media (max-width: 1100px) {
    .sn-left-panel { width: 340px !important; min-width: 340px !important; padding: 28px 24px !important; }
    .sn-headline { font-size: 36px !important; }
  }

  /* Small Tablet / Large Phone: 600-767px */
  @media (max-width: 767px) {
    .sn-landing-page { flex-direction: column !important; overflow-y: auto !important; height: auto !important; min-height: 100vh !important; }
    .sn-left-panel {
      width: 100% !important; min-width: unset !important; max-height: none !important;
      padding: 24px 20px !important; border-right: none !important;
      border-bottom: 1px solid var(--sn-glass-border) !important;
    }
    .sn-headline { font-size: 32px !important; line-height: 1.15 !important; margin-bottom: 14px !important; }
    .sn-features { padding: 16px !important; margin-bottom: 24px !important; }
    .sn-nav-section { display: none !important; }
    .sn-main-area { flex: none; min-height: 50vh; }
    .canvas-surface { touch-action: pan-y !important; }
  }

  /* Phone: < 600px (Canvas-First with Liquid Glass UI) */
  @media (max-width: 599px) {
    .sn-landing-page {
      flex-direction: column !important;
      overflow: hidden !important;
      position: relative !important;
      height: 100vh !important;
      height: 100dvh !important;
    }

    /* ========================================
       TOP HEADER: Logo + Waitlist (ultra-compact)
       ======================================== */
    .sn-left-panel {
      position: relative !important;
      order: -1 !important; /* Force to top */
      width: 100% !important;
      min-width: unset !important;
      height: auto !important;
      max-height: none !important;
      flex-shrink: 0 !important;
      padding: calc(env(safe-area-inset-top, 4px) + 6px) 10px 10px !important;
      border-right: none !important;
      border-radius: 0 !important;
      z-index: 50 !important;
      overflow: visible !important;

      /* Liquid glass header */
      background: linear-gradient(
        180deg,
        rgba(25, 15, 45, 0.95) 0%,
        rgba(20, 12, 38, 0.9) 100%
      ) !important;
      backdrop-filter: blur(40px) saturate(200%) !important;
      -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.3),
        inset 0 -1px 0 rgba(255, 255, 255, 0.05) !important;
    }

    /* Remove the drag handle */
    .sn-left-panel::before {
      display: none !important;
    }

    /* ========================================
       LOGO: Tiny, inline row
       ======================================== */
    .sn-logo-section {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 0 !important;
    }
    .sn-logo-section .sn-nest-icon {
      width: 24px !important;
      height: 24px !important;
    }
    .sn-logo-section .sn-nest-icon svg {
      width: 16px !important;
      height: 16px !important;
    }
    .sn-logo-section .sn-logo-text {
      font-size: 14px !important;
    }
    .sn-logo-section .sn-alpha-tag {
      font-size: 7px !important;
      padding: 2px 5px !important;
    }

    /* ========================================
       HERO: Hidden on mobile - only show waitlist
       ======================================== */
    .sn-hero-section {
      display: none !important; /* Hide headline section entirely on mobile */
    }

    /* Hide non-essential */
    .sn-features { display: none !important; }
    .sn-theme-section { display: none !important; }
    .sn-nav-section { display: none !important; }

    /* ========================================
       WAITLIST: Horizontal compact form
       ======================================== */
    .sn-waitlist-section {
      margin-top: 6px !important;
      flex: 0 !important;
    }
    .sn-waitlist-section form {
      gap: 6px !important;
    }
    .sn-waitlist-section .sn-input-group {
      gap: 6px !important;
    }
    .sn-waitlist-section input {
      flex: 1 !important;
      min-height: 40px !important;
      padding: 8px 12px !important;
      font-size: 15px !important;
      background: rgba(255, 255, 255, 0.08) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      border-radius: 10px !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2) !important;
    }
    .sn-waitlist-section input:focus {
      border-color: rgba(139, 92, 246, 0.6) !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 16px rgba(139, 92, 246, 0.25) !important;
    }
    .sn-waitlist-section button[type="submit"] {
      min-height: 40px !important;
      min-width: 60px !important;
      padding: 8px 14px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      border-radius: 10px !important;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(168, 85, 247, 0.85)) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow:
        0 6px 20px rgba(139, 92, 246, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
    }

    /* ========================================
       MOBILE ACTIONS: Gallery & Widgets buttons
       ======================================== */
    .sn-mobile-actions {
      margin-top: 8px !important;
      gap: 6px !important;
    }
    .sn-mobile-gallery-btn,
    .sn-mobile-widgets-btn {
      min-height: 38px !important;
      padding: 8px 12px !important;
      font-size: 13px !important;
      border-radius: 10px !important;
    }

    /* ========================================
       CANVAS AREA: Fills remaining space
       ======================================== */
    .sn-main-area {
      flex: 1 !important;
      min-height: 0 !important;
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    /* Hide controls bar on mobile - use header instead */
    .sn-controls-bar {
      display: none !important;
    }

    /* Canvas container fills the space */
    .canvas-container {
      flex: 1 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      position: relative !important;
      min-height: 300px !important;
      height: 100% !important;
    }

    /* Ensure canvas2 (MainCanvas) fills its container */
    .canvas2 {
      width: 100% !important;
      height: 100% !important;
      min-height: 300px !important;
    }

    /* Hide canvas controls on mobile landing page - header has controls */
    .canvas2 > div[style*="position: absolute"][style*="bottom"] {
      display: none !important;
    }

    /* Keep orbs for ambient lighting */
    .sn-orb {
      display: block !important;
      opacity: 0.3 !important;
      filter: blur(80px) !important;
    }

    /* Ensure library panel toggle is visible and positioned correctly */
    .library-panel-toggle {
      bottom: calc(env(safe-area-inset-bottom, 8px) + 8px) !important;
    }
  }

  /* Extra Small Phones: < 380px */
  @media (max-width: 379px) {
    .sn-headline { font-size: 20px !important; }
    .sn-left-panel {
      padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0)) !important;
      max-height: 40vh !important;
    }
    .sn-hero-section p { font-size: 12px !important; }
  }

  /* Touch device enhancements */
  @media (pointer: coarse) {
    button, a, input[type="submit"] {
      min-height: 44px;
      min-width: 44px;
    }
    input[type="email"], input[type="text"] {
      font-size: 16px !important; /* Prevents iOS zoom */
      min-height: 48px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .sn-orb { animation: none !important; opacity: 0.3; }
    * { transition: none !important; animation: none !important; }
  }

  /* Landscape phone optimization */
  @media (max-height: 500px) and (orientation: landscape) {
    .sn-left-panel { max-height: 100vh !important; overflow-y: auto !important; }
    .sn-headline { font-size: 24px !important; margin-bottom: 10px !important; }
  }
`;

export default landingStyles;
