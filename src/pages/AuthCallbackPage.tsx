/**
 * StickerNest v2 - Auth Callback Page
 * Handles OAuth redirect callbacks from Supabase Auth
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseClient } from '../services/supabaseClient';
import { SNIcon } from '../shared-ui/SNIcon';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check if we're in a popup window (opened by OAuth flow)
      const isPopup = window.opener !== null;

      if (!supabaseClient) {
        if (isPopup) {
          window.close();
        } else {
          navigate('/gallery', { replace: true });
        }
        return;
      }

      try {
        // Check for authorization code in URL (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle OAuth errors
        if (errorParam) {
          console.error('[AuthCallback] OAuth error:', errorParam, errorDescription);
          setStatus('error');
          setErrorMessage(errorDescription || errorParam);
          setTimeout(() => {
            if (isPopup) {
              window.close();
            } else {
              navigate('/login', { replace: true });
            }
          }, 2000);
          return;
        }

        // Exchange auth code for session (PKCE flow)
        if (code) {
          console.log('[AuthCallback] Exchanging auth code for session...');
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('[AuthCallback] Code exchange error:', error);
            setStatus('error');
            setErrorMessage(error.message);
            setTimeout(() => {
              if (isPopup) {
                window.close();
              } else {
                navigate('/login', { replace: true });
              }
            }, 2000);
            return;
          }

          if (data.session) {
            console.log('[AuthCallback] Session established successfully');
            if (isPopup) {
              // Close popup - parent window will detect and check session
              window.close();
            } else {
              navigate('/gallery', { replace: true });
            }
            return;
          }
        }

        // Fallback: check for existing session (implicit flow or already authenticated)
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) {
          console.error('[AuthCallback] Session error:', error);
          setStatus('error');
          setErrorMessage(error.message);
          setTimeout(() => {
            if (isPopup) {
              window.close();
            } else {
              navigate('/login', { replace: true });
            }
          }, 2000);
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session found');
          if (isPopup) {
            window.close();
          } else {
            navigate('/gallery', { replace: true });
          }
        } else {
          // No session and no code - something went wrong
          console.warn('[AuthCallback] No session or code found');
          setTimeout(() => {
            if (isPopup) {
              window.close();
            } else {
              navigate('/login', { replace: true });
            }
          }, 1000);
        }
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
        setTimeout(() => {
          if (isPopup) {
            window.close();
          } else {
            navigate('/login', { replace: true });
          }
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.card}>
        {status === 'processing' ? (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.title}>Completing sign in...</h2>
            <p style={styles.subtitle}>Please wait while we authenticate your account</p>
          </>
        ) : (
          <>
            <div style={styles.errorIcon}>
              <SNIcon name="warning" size="xl" />
            </div>
            <h2 style={styles.title}>Authentication Failed</h2>
            <p style={styles.errorMessage}>{errorMessage}</p>
            <p style={styles.subtitle}>Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f19 0%, #1a1a2e 50%, #16213e 100%)',
    padding: 20,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: 40,
    background: 'rgba(30, 30, 46, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(139, 92, 246, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    textAlign: 'center',
    maxWidth: 400,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    margin: 0,
  },
  errorIcon: {
    width: 64,
    height: 64,
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f87171',
  },
  errorMessage: {
    fontSize: 14,
    color: '#f87171',
    margin: 0,
    padding: '8px 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
};

export default AuthCallbackPage;
