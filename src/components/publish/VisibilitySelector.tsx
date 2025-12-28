/**
 * VisibilitySelector Component
 * Select canvas visibility level in publish flow
 */

import React, { useState } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import type { CanvasVisibility } from '../../types/domain';

interface VisibilityOption {
  value: CanvasVisibility;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface VisibilitySelectorProps {
  value: CanvasVisibility;
  onChange: (visibility: CanvasVisibility) => void;
  onPasswordChange?: (password: string | undefined) => void;
  hasPassword?: boolean;
  disabled?: boolean;
}

const visibilityOptions: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone can view this canvas. It will appear in explore and search.',
    icon: 'globe',
    color: '#22c55e',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Anyone with the link can view. Hidden from explore and search.',
    icon: 'link',
    color: '#f59e0b',
  },
  {
    value: 'password',
    label: 'Password Protected',
    description: 'Requires a password to view. Share the password with specific people.',
    icon: 'lock',
    color: '#8b5cf6',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view this canvas. Not accessible to anyone else.',
    icon: 'eyeOff',
    color: '#ef4444',
  },
];

export const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  value,
  onChange,
  onPasswordChange,
  hasPassword = false,
  disabled = false,
}) => {
  const [showPasswordInput, setShowPasswordInput] = useState(value === 'password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleVisibilityChange = (newVisibility: CanvasVisibility) => {
    if (disabled) return;

    onChange(newVisibility);

    if (newVisibility === 'password') {
      setShowPasswordInput(true);
    } else {
      setShowPasswordInput(false);
      setPassword('');
      setConfirmPassword('');
      setPasswordError(null);
      onPasswordChange?.(undefined);
    }
  };

  const handlePasswordSubmit = () => {
    if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError(null);
    onPasswordChange?.(password);
  };

  const selectedOption = visibilityOptions.find(opt => opt.value === value);

  return (
    <div style={styles.container}>
      <label style={styles.label}>Visibility</label>

      <div style={styles.optionsGrid}>
        {visibilityOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            style={{
              ...styles.optionCard,
              ...(value === option.value ? styles.optionCardSelected : {}),
              ...(disabled ? styles.optionCardDisabled : {}),
              borderColor: value === option.value ? option.color : 'rgba(255, 255, 255, 0.1)',
            }}
            onClick={() => handleVisibilityChange(option.value)}
            disabled={disabled}
          >
            <div
              style={{
                ...styles.optionIcon,
                background: value === option.value
                  ? `${option.color}20`
                  : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <SNIcon
                name={option.icon as any}
                size={20}
                color={value === option.value ? option.color : '#64748b'}
              />
            </div>
            <div style={styles.optionContent}>
              <span
                style={{
                  ...styles.optionLabel,
                  color: value === option.value ? '#f1f5f9' : '#94a3b8',
                }}
              >
                {option.label}
              </span>
              <span style={styles.optionDescription}>{option.description}</span>
            </div>
            {value === option.value && (
              <div style={{ ...styles.checkmark, background: option.color }}>
                <SNIcon name="check" size={12} color="#fff" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Password Input Section */}
      {showPasswordInput && value === 'password' && (
        <div style={styles.passwordSection}>
          <div style={styles.passwordHeader}>
            <SNIcon name="lock" size={16} color="#8b5cf6" />
            <span style={styles.passwordTitle}>Set Password</span>
          </div>

          {hasPassword && (
            <div style={styles.existingPassword}>
              <SNIcon name="check" size={14} color="#22c55e" />
              <span>Password is set. Enter a new one to change it.</span>
            </div>
          )}

          <div style={styles.passwordInputGroup}>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                style={styles.passwordInput}
              />
              <button
                type="button"
                style={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <SNIcon
                  name={showPassword ? 'eyeOff' : 'eye'}
                  size={16}
                  color="#64748b"
                />
              </button>
            </div>

            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                style={styles.passwordInput}
              />
            </div>
          </div>

          {passwordError && (
            <div style={styles.passwordError}>
              <SNIcon name="alertCircle" size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <button
            type="button"
            style={styles.setPasswordButton}
            onClick={handlePasswordSubmit}
            disabled={!password || !confirmPassword}
          >
            <SNIcon name="lock" size={14} />
            {hasPassword ? 'Update Password' : 'Set Password'}
          </button>

          <p style={styles.passwordHint}>
            Share this password with people you want to give access to.
            They'll need to enter it to view the canvas.
          </p>
        </div>
      )}

      {/* Current Status */}
      {selectedOption && (
        <div style={styles.currentStatus}>
          <SNIcon name={selectedOption.icon as any} size={14} color={selectedOption.color} />
          <span style={{ color: selectedOption.color }}>{selectedOption.label}</span>
          {value === 'password' && hasPassword && (
            <span style={styles.statusBadge}>Password Set</span>
          )}
        </div>
      )}
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
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  optionCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    background: 'rgba(15, 15, 25, 0.6)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  optionCardSelected: {
    background: 'rgba(15, 15, 25, 0.8)',
  },
  optionCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionContent: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  optionDescription: {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Password Section
  passwordSection: {
    marginTop: 16,
    padding: 16,
    background: 'rgba(139, 92, 246, 0.05)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
  },
  passwordHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  passwordTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  existingPassword: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 12,
    color: '#22c55e',
  },
  passwordInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    padding: '10px 40px 10px 12px',
    background: 'rgba(15, 15, 25, 0.8)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
  },
  togglePassword: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  passwordError: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    fontSize: 12,
    color: '#ef4444',
  },
  setPasswordButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 12,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  passwordHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.5,
  },

  // Current Status
  currentStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    fontSize: 13,
  },
  statusBadge: {
    marginLeft: 'auto',
    padding: '2px 8px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#22c55e',
  },
};

export default VisibilitySelector;
