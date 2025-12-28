/**
 * SlugEditor Component
 * Allows users to customize their canvas URL slug
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';

interface SlugEditorProps {
  value: string;
  onChange: (slug: string) => void;
  baseUrl?: string;
  isAvailable?: boolean;
  isChecking?: boolean;
  onCheckAvailability?: (slug: string) => Promise<boolean>;
  disabled?: boolean;
}

// Slug validation rules
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 50;
const RESERVED_SLUGS = ['app', 'login', 'signup', 'settings', 'profile', 'explore', 'marketplace', 'embed', 'api', 'admin'];

function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug) {
    return { isValid: false, error: 'Slug is required' };
  }

  if (slug.length < MIN_LENGTH) {
    return { isValid: false, error: `Slug must be at least ${MIN_LENGTH} characters` };
  }

  if (slug.length > MAX_LENGTH) {
    return { isValid: false, error: `Slug must be at most ${MAX_LENGTH} characters` };
  }

  if (!SLUG_REGEX.test(slug)) {
    return { isValid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }

  if (slug.includes('--')) {
    return { isValid: false, error: 'Slug cannot contain consecutive hyphens' };
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return { isValid: false, error: 'This slug is reserved' };
  }

  return { isValid: true };
}

function generateRandomSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const SlugEditor: React.FC<SlugEditorProps> = ({
  value,
  onChange,
  baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://stickernest.vercel.app',
  isAvailable,
  isChecking = false,
  onCheckAvailability,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced validation and availability check
  useEffect(() => {
    if (!hasEdited) return;

    const timer = setTimeout(() => {
      const result = validateSlug(inputValue);
      setValidation(result);

      if (result.isValid && onCheckAvailability) {
        onCheckAvailability(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, hasEdited, onCheckAvailability]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInputValue(newValue);
    setHasEdited(true);
    onChange(newValue);
  };

  const handleGenerateRandom = useCallback(() => {
    const newSlug = generateRandomSlug();
    setInputValue(newSlug);
    setHasEdited(true);
    onChange(newSlug);
  }, [onChange]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <div style={styles.spinner} />;
    }

    if (!hasEdited || !inputValue) {
      return <SNIcon name="link" size={14} color="#64748b" />;
    }

    if (!validation.isValid) {
      return <SNIcon name="alertCircle" size={14} color="#ef4444" />;
    }

    if (isAvailable === true) {
      return <SNIcon name="check" size={14} color="#22c55e" />;
    }

    if (isAvailable === false) {
      return <SNIcon name="x" size={14} color="#ef4444" />;
    }

    return <SNIcon name="link" size={14} color="#64748b" />;
  };

  const getStatusText = () => {
    if (isChecking) {
      return 'Checking availability...';
    }

    if (!hasEdited || !inputValue) {
      return '';
    }

    if (!validation.isValid) {
      return validation.error;
    }

    if (isAvailable === true) {
      return 'This URL is available';
    }

    if (isAvailable === false) {
      return 'This URL is already taken';
    }

    return '';
  };

  const fullUrl = `${baseUrl}/c/${inputValue || 'your-slug'}`;

  return (
    <div style={styles.container}>
      <label style={styles.label}>Canvas URL</label>

      {/* URL Preview */}
      <div style={styles.urlPreview}>
        <SNIcon name="globe" size={14} color="#64748b" />
        <span style={styles.urlBase}>{baseUrl}/c/</span>
        <span style={styles.urlSlug}>{inputValue || 'your-slug'}</span>
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <div style={{
          ...styles.inputWrapper,
          borderColor: !validation.isValid && hasEdited
            ? '#ef4444'
            : isAvailable === true
              ? '#22c55e'
              : 'rgba(139, 92, 246, 0.3)',
        }}>
          <span style={styles.inputPrefix}>/c/</span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="my-awesome-canvas"
            style={styles.input}
            disabled={disabled}
            maxLength={MAX_LENGTH}
          />
          <div style={styles.statusIcon}>
            {getStatusIcon()}
          </div>
        </div>

        <button
          type="button"
          style={styles.generateButton}
          onClick={handleGenerateRandom}
          disabled={disabled}
          title="Generate random slug"
        >
          <SNIcon name="shuffle" size={16} />
        </button>
      </div>

      {/* Status */}
      {getStatusText() && (
        <div style={{
          ...styles.status,
          color: !validation.isValid || isAvailable === false ? '#ef4444' : '#22c55e',
        }}>
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      )}

      {/* Character Count */}
      <div style={styles.charCount}>
        {inputValue.length}/{MAX_LENGTH} characters
      </div>

      {/* Copy Button */}
      {inputValue && validation.isValid && (
        <button
          type="button"
          style={styles.copyButton}
          onClick={() => navigator.clipboard.writeText(fullUrl)}
        >
          <SNIcon name="copy" size={14} />
          Copy URL
        </button>
      )}

      {/* Tips */}
      <div style={styles.tips}>
        <div style={styles.tipItem}>
          <SNIcon name="info" size={12} color="#64748b" />
          <span>Use lowercase letters, numbers, and hyphens</span>
        </div>
        <div style={styles.tipItem}>
          <SNIcon name="info" size={12} color="#64748b" />
          <span>Must be {MIN_LENGTH}-{MAX_LENGTH} characters</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 24,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  // URL Preview
  urlPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(15, 15, 25, 0.6)',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    overflow: 'hidden',
  },
  urlBase: {
    color: '#64748b',
  },
  urlSlug: {
    color: '#8b5cf6',
    fontWeight: 600,
  },

  // Input
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 10,
    transition: 'border-color 0.2s',
  },
  inputPrefix: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  input: {
    flex: 1,
    padding: '12px 8px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 15,
    fontFamily: 'monospace',
  },
  statusIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  generateButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 10,
    color: '#8b5cf6',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Status
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    fontSize: 12,
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Character Count
  charCount: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
  },

  // Copy Button
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    padding: '10px 16px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 8,
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Tips
  tips: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  tipItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#64748b',
  },
};

export default SlugEditor;
