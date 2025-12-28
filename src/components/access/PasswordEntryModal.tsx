/**
 * PasswordEntryModal Component
 * Modal for entering password to access protected canvases
 */

import React, { useState, useRef, useEffect } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';

interface PasswordEntryModalProps {
  isOpen: boolean;
  canvasName: string;
  ownerName?: string;
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
  error?: string | null;
}

export const PasswordEntryModal: React.FC<PasswordEntryModalProps> = ({
  isOpen,
  canvasName,
  ownerName,
  onSubmit,
  onCancel,
  error: externalError,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit(password);
      if (!success) {
        setAttempts(prev => prev + 1);
        setError('Incorrect password. Please try again.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel} onKeyDown={handleKeyDown}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.lockIcon}>
            <SNIcon name="lock" size={32} color="#8b5cf6" />
          </div>
          <h2 style={styles.title}>Password Protected</h2>
          <p style={styles.subtitle}>
            This canvas requires a password to view
          </p>
        </div>

        {/* Canvas Info */}
        <div style={styles.canvasInfo}>
          <div style={styles.canvasIcon}>
            <SNIcon name="layout" size={20} color="#64748b" />
          </div>
          <div style={styles.canvasDetails}>
            <span style={styles.canvasName}>{canvasName}</span>
            {ownerName && (
              <span style={styles.ownerName}>by {ownerName}</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Enter Password</label>
            <div style={styles.inputWrapper}>
              <SNIcon name="lock" size={16} color="#64748b" />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password"
                style={styles.input}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <button
                type="button"
                style={styles.toggleButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <SNIcon
                  name={showPassword ? 'eyeOff' : 'eye'}
                  size={16}
                  color="#64748b"
                />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.error}>
              <SNIcon name="alertCircle" size={14} />
              <span>{error}</span>
              {attempts >= 3 && (
                <span style={styles.hint}>
                  Contact the owner if you've forgotten the password.
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <SNButton
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </SNButton>
            <SNButton
              variant="primary"
              type="submit"
              disabled={isSubmitting || !password.trim()}
            >
              {isSubmitting ? (
                <>
                  <div style={styles.spinner} />
                  Verifying...
                </>
              ) : (
                <>
                  <SNIcon name="unlock" size={14} />
                  Access Canvas
                </>
              )}
            </SNButton>
          </div>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <SNIcon name="shieldCheck" size={14} color="#64748b" />
          <span>Passwords are securely encrypted</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(20, 20, 30, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },

  // Header
  header: {
    padding: '32px 24px 24px',
    textAlign: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  lockIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 16px',
    borderRadius: 16,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },

  // Canvas Info
  canvasInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '16px 24px',
    padding: 12,
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
  },
  canvasIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: 'rgba(139, 92, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasDetails: {
    flex: 1,
    minWidth: 0,
  },
  canvasName: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  ownerName: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Form
  form: {
    padding: '0 24px 24px',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 10,
    transition: 'border-color 0.15s',
  },
  input: {
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f1f5f9',
    fontSize: 15,
  },
  toggleButton: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 6,
  },

  // Error
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: 12,
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#ef4444',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Actions
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: 8,
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    fontSize: 11,
    color: '#64748b',
  },
};

export default PasswordEntryModal;
