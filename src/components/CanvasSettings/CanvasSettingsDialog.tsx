/**
 * Canvas Settings Dialog
 * Consolidated settings for canvas appearance (background, border radius)
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, CornerDownRight, Image as ImageIcon, Link as LinkIcon, Palette, Maximize2 } from 'lucide-react';
import { CanvasBackgroundUploadDialog } from '../CanvasBackgroundUpload';
import { CanvasRadiusDialog } from '../CanvasRadiusSettings';
import { themePresets } from '../../themes/presets/index';
import { CANVAS_SIZE_PRESETS } from '../LandingCanvas/CanvasSizeSelector';

interface CanvasSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSetBackground: (url: string) => void;
  onRemoveBackground?: () => void;
  onSetRadius: (radius: number) => void;
  currentRadius: number;
  onSetTheme?: (themeId: string) => void;
  currentThemeId?: string;
  onSetCanvasSize?: (width: number, height: number) => void;
  currentCanvasSize?: { width: number; height: number };
  accentColor?: string;
}

export const CanvasSettingsDialog: React.FC<CanvasSettingsDialogProps> = ({
  isOpen,
  onClose,
  onSetBackground,
  onRemoveBackground,
  onSetRadius,
  currentRadius,
  onSetTheme,
  currentThemeId,
  onSetCanvasSize,
  currentCanvasSize,
  accentColor = '#8b5cf6',
}) => {
  const [activeSection, setActiveSection] = useState<'background' | 'radius' | 'theme' | null>(null);
  
  // Find current canvas size preset
  const currentSizePreset = currentCanvasSize
    ? CANVAS_SIZE_PRESETS.find(p => p.width === currentCanvasSize.width && p.height === currentCanvasSize.height)
    : null;

  useEffect(() => {
    if (!isOpen) {
      setActiveSection(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'rgba(15, 15, 25, 0.98)',
            backdropFilter: 'blur(40px) saturate(200%)',
            borderRadius: 20,
            border: `1px solid rgba(255, 255, 255, 0.15)`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            width: '100%',
            maxWidth: 480,
            padding: 24,
            position: 'relative',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>

          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#e2e8f0',
                margin: 0,
                marginBottom: 8,
              }}
            >
              Canvas Settings
            </h2>
            <p
              style={{
                fontSize: 13,
                color: '#94a3b8',
                margin: 0,
              }}
            >
              Customize your canvas appearance
            </p>
          </div>

          {/* Settings Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Background Setting */}
            <button
              onClick={() => setActiveSection('background')}
              style={{
                width: '100%',
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = accentColor + '33';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${accentColor}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                }}
              >
                <ImageIcon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>
                  Background Image
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Upload an image or paste a URL
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>→</div>
            </button>

            {/* Border Radius Setting */}
            <button
              onClick={() => setActiveSection('radius')}
              style={{
                width: '100%',
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = accentColor + '33';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${accentColor}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor,
                }}
              >
                <CornerDownRight size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0', marginBottom: 4 }}>
                  Border Radius
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Current: {currentRadius}px
                </div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>→</div>
            </button>

            {/* Theme Setting */}
            {onSetTheme && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Theme
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {themePresets.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        onSetTheme(theme.id);
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        background: currentThemeId === theme.id ? `${theme.colors.accent.primary}22` : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${currentThemeId === theme.id ? theme.colors.accent.primary : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        if (currentThemeId !== theme.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = theme.colors.accent.primary + '33';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentThemeId !== theme.id) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: theme.colors.accent.primary,
                          boxShadow: `0 0 8px ${theme.colors.accent.primary}44`,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: currentThemeId === theme.id ? theme.colors.accent.primary : '#e2e8f0' }}>
                          {theme.name}
                        </div>
                        {theme.description && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {theme.description}
                          </div>
                        )}
                      </div>
                      {currentThemeId === theme.id && (
                        <div style={{ color: theme.colors.accent.primary, fontSize: 14 }}>✓</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas Size Setting */}
            {onSetCanvasSize && currentCanvasSize && (
              <div>
                <div style={{ marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
                  Canvas Size
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                  {CANVAS_SIZE_PRESETS.map((preset) => {
                    const isSelected = currentSizePreset?.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSetCanvasSize(preset.width, preset.height);
                        }}
                        style={{
                          width: '100%',
                          padding: 10,
                          background: isSelected ? `${accentColor}22` : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isSelected ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'all 0.2s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = accentColor + '33';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                      >
                        {preset.icon && (
                          <div style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                            {preset.icon}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? accentColor : '#e2e8f0' }}>
                            {preset.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            {preset.width} × {preset.height}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ color: accentColor, fontSize: 14 }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background Upload Dialog */}
      <CanvasBackgroundUploadDialog
        isOpen={activeSection === 'background'}
        onClose={() => setActiveSection(null)}
        onSetBackground={(url) => {
          onSetBackground(url);
          setActiveSection(null);
        }}
        onRemoveBackground={
          onRemoveBackground
            ? () => {
                onRemoveBackground();
                setActiveSection(null);
              }
            : undefined
        }
        accentColor={accentColor}
      />

      {/* Radius Dialog */}
      <CanvasRadiusDialog
        isOpen={activeSection === 'radius'}
        onClose={() => setActiveSection(null)}
        currentRadius={currentRadius}
        onSetRadius={(radius) => {
          onSetRadius(radius);
          setActiveSection(null);
        }}
        accentColor={accentColor}
      />
    </>
  );
};

