/**
 * StickerNest v2 - Theme Section
 * Theme picker for canvas settings dropdown
 */

import React from 'react';
import { useThemeStore } from '../../../state/useThemeStore';
import { SNIcon } from '../../../shared-ui/SNIcon';

export const ThemeSection: React.FC = () => {
  const currentThemeId = useThemeStore((s) => s.currentThemeId);
  // Select stable references, then combine (don't call getAllThemes() in selector - creates new array)
  const presets = useThemeStore((s) => s.presets);
  const customThemes = useThemeStore((s) => s.customThemes);
  const allThemes = [...presets, ...customThemes];
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        {allThemes.map((theme) => {
          const isSelected = theme.id === currentThemeId;
          const primaryColor = theme.colors.accent.primary;
          const bgColor = theme.colors.background.primary;

          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              style={{
                ...styles.themeButton,
                borderColor: isSelected ? primaryColor : 'var(--sn-border-secondary)',
                boxShadow: isSelected ? `0 0 0 2px ${primaryColor}40` : 'none',
              }}
              title={theme.name}
            >
              {/* Theme Preview */}
              <div
                style={{
                  ...styles.themePreview,
                  background: bgColor,
                }}
              >
                <div
                  style={{
                    ...styles.themeAccent,
                    background: `linear-gradient(135deg, ${theme.colors.accent.secondary}, ${primaryColor})`,
                  }}
                />
              </div>

              {/* Theme Info */}
              <div style={styles.themeInfo}>
                <span style={styles.themeName}>{theme.name}</span>
                <span style={styles.themeMode}>
                  <SNIcon name={theme.mode === 'dark' ? 'moon' : 'sun'} size="xs" />
                  {theme.mode}
                </span>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div style={styles.selectedBadge}>
                  <SNIcon name="check" size="xs" color="white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  themeButton: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 8,
    background: 'var(--sn-bg-tertiary)',
    border: '2px solid',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
  },
  themePreview: {
    position: 'relative',
    width: '100%',
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
  },
  themeAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  themeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  themeName: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  themeMode: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    color: 'var(--sn-text-muted)',
    textTransform: 'capitalize',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'var(--sn-accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default ThemeSection;
