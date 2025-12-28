/**
 * StickerNest v2 - Login Page
 * Standalone login page with email/password and OAuth options
 * Full theme support via CSS variables
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeStore } from '../state/useThemeStore';
import { SNIcon } from '../shared-ui/SNIcon';
import { SNButton } from '../shared-ui/SNButton';
import { ThemedAppBackground } from '../components/ThemedAppBackground';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithOAuth, isAuthenticated, isLocalDevMode, isLoading } = useAuth();
  const currentTheme = useThemeStore((s) => s.currentTheme);
  const hasParallaxBackground = currentTheme?.appBackground?.type === 'parallax';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get('returnTo') || '/gallery';

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) { setError(error.message); } else { navigate(returnTo, { replace: true }); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) { setError(error.message); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally { setLoading(false); }
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        {hasParallaxBackground && <ThemedAppBackground />}
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, background: hasParallaxBackground ? 'transparent' : styles.container.background }}>
      {hasParallaxBackground && <ThemedAppBackground />}

      <div style={styles.card}>
        {/* Logo and Header */}
        <div style={styles.header}>
          <Link to="/" style={styles.logoLink}>
            <div style={styles.logoIcon}><SNIcon name="sticker" size="xl" /></div>
            <span style={styles.logoText}>StickerNest</span>
          </Link>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {/* Local dev mode notice */}
        {isLocalDevMode && (
          <div style={styles.devNotice}>
            <SNIcon name="info" size="sm" />
            <span>Local Dev Mode - Authentication simulated</span>
          </div>
        )}

        {/* OAuth Buttons - Keep brand colors for Google/GitHub */}
        {!isLocalDevMode && (
          <>
            <div style={styles.oauthButtons}>
              <button onClick={() => handleOAuthSignIn('google')} disabled={loading} style={styles.oauthButton}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <button onClick={() => handleOAuthSignIn('github')} disabled={loading} style={styles.oauthButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>
            <div style={styles.divider}><span>or</span></div>
          </>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              <SNIcon name="warning" size="sm" />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={loading} style={styles.input} />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={loading} style={styles.input} />
          </div>

          <SNButton type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </SNButton>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}<Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ============================================================================
// STYLES - Using CSS Variables
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-gradient)',
    padding: 20,
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'var(--sn-glass-card-bg)',
    backdropFilter: 'blur(var(--sn-glass-blur-lg, 20px))',
    WebkitBackdropFilter: 'blur(var(--sn-glass-blur-lg, 20px))',
    borderRadius: 'var(--sn-radius-xl)',
    border: '1px solid var(--sn-accent-primary-20)',
    padding: 32,
    boxShadow: 'var(--sn-glass-card-shadow)',
    position: 'relative',
    zIndex: 10,
  },
  header: { textAlign: 'center', marginBottom: 24 },
  logoLink: { display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' },
  logoIcon: {
    width: 40, height: 40,
    background: 'var(--sn-accent-gradient)',
    borderRadius: 'var(--sn-radius-lg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 20, fontWeight: 700, color: 'var(--sn-text-primary)' },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--sn-text-primary)', margin: '0 0 8px', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'var(--sn-text-secondary)', margin: '0 0 24px', textAlign: 'center' },
  devNotice: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    background: 'var(--sn-info-bg)',
    borderRadius: 'var(--sn-radius-md)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    marginBottom: 20, fontSize: 13, color: 'var(--sn-info)',
  },
  oauthButtons: { display: 'flex', flexDirection: 'column', gap: 12 },
  oauthButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', padding: '12px 16px',
    background: 'var(--sn-glass-bg-light)',
    border: '1px solid var(--sn-glass-border)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    transition: 'var(--sn-transition-fast, all 0.15s ease)',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 16,
    margin: '24px 0', color: 'var(--sn-text-muted)', fontSize: 13,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--sn-text-secondary)' },
  forgotLink: { fontSize: 13, color: 'var(--sn-accent-primary)', textDecoration: 'none' },
  input: {
    width: '100%', padding: '12px 14px',
    background: 'var(--sn-glass-bg)',
    border: '1px solid var(--sn-accent-primary-20)',
    borderRadius: 'var(--sn-radius-md)',
    color: 'var(--sn-text-primary)',
    fontSize: 14, outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    background: 'var(--sn-error-bg)',
    borderRadius: 'var(--sn-radius-md)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    fontSize: 13, color: 'var(--sn-error)',
  },
  footer: { marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--sn-text-secondary)' },
  link: { color: 'var(--sn-accent-primary)', textDecoration: 'none', fontWeight: 500 },
  loadingSpinner: {
    width: 40, height: 40,
    border: '3px solid var(--sn-accent-primary-20)',
    borderTopColor: 'var(--sn-accent-primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    position: 'relative',
    zIndex: 10,
  },
};

export default LoginPage;
