/**
 * StickerNest v2 - URL Preview Configuration
 * Configuration step for URL/website preview tabs
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Globe, ExternalLink, AlertCircle, Check, Link2 } from 'lucide-react';
import type { UrlPreviewTabConfig, UrlValidationResult } from '../tabs/types';

interface UrlPreviewConfigProps {
  config: Partial<UrlPreviewTabConfig>;
  onConfigChange: (config: Partial<UrlPreviewTabConfig>) => void;
  onTitleChange: (title: string) => void;
  title: string;
  accentColor?: string;
}

/** Validate and normalize URL */
function validateUrl(input: string): UrlValidationResult {
  if (!input.trim()) {
    return { isValid: false, error: 'URL is required', isSecure: false };
  }

  let url = input.trim();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    const isSecure = parsed.protocol === 'https:';

    return {
      isValid: true,
      normalizedUrl: parsed.href,
      isSecure,
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
      isSecure: false,
    };
  }
}

/** Extract domain name for title suggestion */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/** Common URL presets */
const URL_PRESETS = [
  { label: 'Google', url: 'https://google.com', icon: '🔍' },
  { label: 'YouTube', url: 'https://youtube.com', icon: '📺' },
  { label: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { label: 'Notion', url: 'https://notion.so', icon: '📝' },
  { label: 'Figma', url: 'https://figma.com', icon: '🎨' },
  { label: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
];

export const UrlPreviewConfig: React.FC<UrlPreviewConfigProps> = ({
  config,
  onConfigChange,
  onTitleChange,
  title,
  accentColor = '#8b5cf6',
}) => {
  const [urlInput, setUrlInput] = useState(config.url || '');
  const [validation, setValidation] = useState<UrlValidationResult | null>(null);
  const [hasAutoTitle, setHasAutoTitle] = useState(!title);

  // Validate URL on input change
  useEffect(() => {
    if (urlInput) {
      const result = validateUrl(urlInput);
      setValidation(result);

      if (result.isValid && result.normalizedUrl) {
        onConfigChange({ ...config, url: result.normalizedUrl });

        // Auto-generate title from domain if user hasn't set one
        if (hasAutoTitle) {
          const domain = extractDomain(result.normalizedUrl);
          if (domain) {
            onTitleChange(domain);
          }
        }
      }
    } else {
      setValidation(null);
    }
  }, [urlInput]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTitleChange(e.target.value);
    setHasAutoTitle(false);
  }, [onTitleChange]);

  const handlePresetClick = useCallback((preset: typeof URL_PRESETS[0]) => {
    setUrlInput(preset.url);
    if (hasAutoTitle) {
      onTitleChange(preset.label);
    }
  }, [hasAutoTitle, onTitleChange]);

  const toggleOption = useCallback((key: 'showControls' | 'allowFullscreen') => {
    onConfigChange({ ...config, [key]: !config[key] });
  }, [config, onConfigChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* URL Input */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: '#94a3b8',
            marginBottom: 8,
          }}
        >
          Website URL
        </label>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
            }}
          >
            <Link2 size={16} />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={handleUrlChange}
            placeholder="https://example.com"
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${
                validation
                  ? validation.isValid
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(239, 68, 68, 0.5)'
                  : 'rgba(255, 255, 255, 0.1)'
              }`,
              borderRadius: 10,
              color: '#e2e8f0',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              if (!validation) {
                e.currentTarget.style.borderColor = accentColor + '66';
              }
            }}
            onBlur={(e) => {
              if (!validation) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
          />
          {validation && (
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: validation.isValid ? '#22c55e' : '#ef4444',
              }}
            >
              {validation.isValid ? <Check size={18} /> : <AlertCircle size={18} />}
            </div>
          )}
        </div>
        {validation && !validation.isValid && (
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>
            {validation.error}
          </div>
        )}
        {validation?.isValid && !validation.isSecure && (
          <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} />
            This URL uses HTTP (insecure). Some features may be limited.
          </div>
        )}
      </div>

      {/* Quick Presets */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: '#94a3b8',
            marginBottom: 8,
          }}
        >
          Quick Presets
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {URL_PRESETS.map((preset) => (
            <button
              key={preset.url}
              onClick={() => handlePresetClick(preset)}
              style={{
                padding: '6px 12px',
                background: urlInput === preset.url ? `${accentColor}22` : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${urlInput === preset.url ? accentColor : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: 8,
                color: urlInput === preset.url ? accentColor : '#e2e8f0',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (urlInput !== preset.url) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (urlInput !== preset.url) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <span>{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Title */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: '#94a3b8',
            marginBottom: 8,
          }}
        >
          Tab Title
        </label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="My Website"
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 10,
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = accentColor + '66';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
        />
      </div>

      {/* Options */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            color: '#94a3b8',
            marginBottom: 12,
          }}
        >
          Options
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Show Controls */}
          <button
            onClick={() => toggleOption('showControls')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: config.showControls !== false ? accentColor : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${config.showControls !== false ? accentColor : 'rgba(255, 255, 255, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                transition: 'all 0.2s ease',
              }}
            >
              {config.showControls !== false && '✓'}
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                Show Navigation Controls
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Display refresh button and URL bar
              </div>
            </div>
          </button>

          {/* Allow Fullscreen */}
          <button
            onClick={() => toggleOption('allowFullscreen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: config.allowFullscreen !== false ? accentColor : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${config.allowFullscreen !== false ? accentColor : 'rgba(255, 255, 255, 0.2)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                transition: 'all 0.2s ease',
              }}
            >
              {config.allowFullscreen !== false && '✓'}
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                Allow Fullscreen
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Enable fullscreen mode for the embedded content
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrlPreviewConfig;
