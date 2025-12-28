/**
 * StickerNest v2 - Auth Modal
 * Login and signup modal component with invite code support
 *
 * Updated with new design system: SNIcon, SNIconButton, glass effects
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { validateInviteCode } from '../services/inviteCodeService';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNIconButton } from '../shared-ui/SNIconButton';
import { SNButton } from '../shared-ui/SNButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithOAuth, isLocalDevMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
        }
      } else {
        // Validate invite code first
        if (!inviteCode.trim()) {
          setError('Invite code is required to create an account');
          setLoading(false);
          return;
        }

        setValidatingCode(true);
        const codeResult = await validateInviteCode(inviteCode);
        setValidatingCode(false);

        if (!codeResult.valid) {
          setError(codeResult.errorMessage || 'Invalid invite code');
          setLoading(false);
          return;
        }

        // Proceed with signup
        const { error } = await signUp(email, password, username, inviteCode);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Check your email to confirm your account!');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <SNIconButton
          icon="close"
          variant="ghost"
          size="sm"
          tooltip="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}
        />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoIcon}>
            <SNIcon name="sticker" size="xl" />
          </div>
          <h2 style={styles.title}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to access your dashboards'
              : 'Sign up to save and share your widgets'}
          </p>
        </div>

        {/* Local dev mode notice */}
        {isLocalDevMode && (
          <div style={styles.devNotice}>
            <SNIcon name="info" size="sm" />
            <div>
              <strong>Local Dev Mode</strong>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                Authentication is simulated. You're automatically signed in as a demo user.
              </p>
            </div>
          </div>
        )}

        {/* OAuth buttons */}
        {!isLocalDevMode && (
          <div style={styles.oauthButtons}>
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              style={styles.oauthButton}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              style={{ ...styles.oauthButton, ...styles.githubButton }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>
        )}

        {/* Divider */}
        {!isLocalDevMode && (
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span>or</span>
            <div style={styles.dividerLine} />
          </div>
        )}

        {/* Email/Password form */}
        {!isLocalDevMode && (
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                {/* Invite Code Field - Required for signup */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <SNIcon name="code" size="xs" />
                    Invite Code <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    required
                    style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <p style={styles.hint}>
                    Need a code? Contact us at hello@stickernest.ai
                  </p>
                </div>

                {/* Username Field */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <SNIcon name="user" size="xs" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    style={styles.input}
                  />
                </div>
              </>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <SNIcon name="mail" size="xs" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <SNIcon name="lock" size="xs" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                style={styles.input}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={styles.errorMessage}>
                <SNIcon name="error" size="sm" />
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div style={styles.successMessage}>
                <SNIcon name="success" size="sm" />
                {success}
              </div>
            )}

            <SNButton
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              disabled={loading}
              leftIcon={loading ? 'loading' : mode === 'signin' ? 'user' : 'add'}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </SNButton>
          </form>
        )}

        {/* Toggle mode */}
        {!isLocalDevMode && (
          <div style={styles.toggleMode}>
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                  style={styles.toggleButton}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                  style={styles.toggleButton}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}

        {/* Continue as demo button for local dev */}
        {isLocalDevMode && (
          <SNButton
            variant="gradient"
            size="lg"
            fullWidth
            leftIcon="ai"
            onClick={onClose}
          >
            Continue as Demo User
          </SNButton>
        )}
      </div>
    </div>
  );
};

// ============================================
// Styles
// ============================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--sn-bg-overlay, rgba(0, 0, 0, 0.7))',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: 20,
  },
  modal: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
    borderRadius: 'var(--sn-radius-xl, 16px)',
    padding: 32,
    width: '100%',
    maxWidth: 420,
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    position: 'relative',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 16px',
    background: 'var(--sn-accent-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%))',
    borderRadius: 'var(--sn-radius-lg, 12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
  },
  title: {
    margin: 0,
    color: 'var(--sn-text-primary, #f0f4f8)',
    fontSize: 'var(--sn-text-2xl, 24px)',
    fontWeight: 700,
  },
  subtitle: {
    margin: '8px 0 0',
    color: 'var(--sn-text-secondary, #a0aec0)',
    fontSize: 'var(--sn-text-sm, 14px)',
  },
  devNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: 'var(--sn-radius-md, 8px)',
    padding: 14,
    marginBottom: 24,
    fontSize: 'var(--sn-text-sm, 13px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
  },
  oauthButtons: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  oauthButton: {
    flex: 1,
    padding: '12px 16px',
    background: '#fff',
    color: '#333',
    border: 'none',
    borderRadius: 'var(--sn-radius-md, 8px)',
    cursor: 'pointer',
    fontSize: 'var(--sn-text-sm, 14px)',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform var(--sn-transition-fast, 100ms ease-out), opacity var(--sn-transition-fast, 100ms ease-out)',
  },
  githubButton: {
    background: '#24292e',
    color: '#fff',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    color: 'var(--sn-text-tertiary, #718096)',
    fontSize: 'var(--sn-text-sm, 13px)',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    fontSize: 'var(--sn-text-sm, 13px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--sn-bg-primary, rgba(0, 0, 0, 0.3))',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2))',
    borderRadius: 'var(--sn-radius-md, 8px)',
    color: 'var(--sn-text-primary, #f0f4f8)',
    fontSize: 'var(--sn-text-sm, 14px)',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color var(--sn-transition-fast, 100ms ease-out)',
  },
  hint: {
    margin: '6px 0 0',
    fontSize: 'var(--sn-text-xs, 11px)',
    color: 'var(--sn-text-tertiary, #718096)',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 'var(--sn-radius-md, 8px)',
    marginBottom: 18,
    color: '#ef4444',
    fontSize: 'var(--sn-text-sm, 13px)',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 'var(--sn-radius-md, 8px)',
    marginBottom: 18,
    color: '#22c55e',
    fontSize: 'var(--sn-text-sm, 13px)',
  },
  toggleMode: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 'var(--sn-text-sm, 14px)',
    color: 'var(--sn-text-secondary, #a0aec0)',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: 'var(--sn-accent-primary, #8b5cf6)',
    cursor: 'pointer',
    fontSize: 'var(--sn-text-sm, 14px)',
    fontWeight: 500,
    textDecoration: 'underline',
    padding: 0,
  },
};

export default AuthModal;
