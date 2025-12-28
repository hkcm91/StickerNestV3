/**
 * StickerNest v2 - Development Error Boundary
 * Catches React errors and displays helpful debugging information
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

const isDev = import.meta.env.DEV;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Log to console with styling
    console.group('%c🚨 React Error Caught', 'color: #ef4444; font-size: 14px; font-weight: bold;');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Check for infinite loop (error #185)
    if (error.message.includes('Maximum update depth exceeded') || error.message.includes('#185')) {
      console.warn(
        '%c⚠️ Infinite Render Loop Detected!',
        'color: #eab308; font-size: 12px; font-weight: bold;'
      );
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message || 'Unknown error'}

Stack Trace:
${error?.stack || 'No stack trace'}

Component Stack:
${errorInfo?.componentStack || 'No component stack'}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error copied to clipboard!');
    });
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Development error display
      if (isDev) {
        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color: '#e2e8f0',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              overflow: 'auto',
              zIndex: 99999,
            }}
          >
            <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <span style={{ fontSize: 48 }}>💥</span>
                <div>
                  <h1 style={{ margin: 0, color: '#ef4444', fontSize: 24 }}>
                    Something went wrong
                  </h1>
                  <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
                    Error count this session: {errorCount}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#ef4444' }}>
                  Error Message
                </h2>
                <code style={{ fontSize: 14, lineHeight: 1.5, color: '#fca5a5' }}>
                  {error?.message || 'Unknown error'}
                </code>
              </div>

              {/* Quick Diagnosis for Common Errors */}
              {error?.message?.includes('185') || error?.message?.includes('Maximum update depth') ? (
                <div
                  style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h2 style={{ margin: '0 0 8px', fontSize: 14, color: '#eab308' }}>
                    🔍 Diagnosis: Infinite Render Loop
                  </h2>
                  <p style={{ margin: '0 0 12px', color: '#fde047', fontSize: 13 }}>
                    A component is updating state in a way that triggers infinite re-renders.
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8', fontSize: 13 }}>
                    <li>Check useEffect dependencies - are objects/arrays being recreated?</li>
                    <li>Look for setState calls inside render functions</li>
                    <li>Check if a state update triggers another state update</li>
                    <li>Use useCallback/useMemo for stable references</li>
                  </ul>
                </div>
              ) : null}

              {/* Stack Trace */}
              <div
                style={{
                  background: 'rgba(30, 30, 50, 0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#8b5cf6' }}>
                  Stack Trace
                </h2>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: '#94a3b8',
                    overflow: 'auto',
                    maxHeight: 200,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error?.stack || 'No stack trace available'}
                </pre>
              </div>

              {/* Component Stack */}
              {errorInfo?.componentStack && (
                <div
                  style={{
                    background: 'rgba(30, 30, 50, 0.5)',
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h2 style={{ margin: '0 0 12px', fontSize: 14, color: '#06b6d4' }}>
                    Component Stack
                  </h2>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: '#94a3b8',
                      overflow: 'auto',
                      maxHeight: 200,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={this.handleReset}
                  style={{
                    padding: '12px 24px',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={this.handleCopyError}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(139, 92, 246, 0.2)',
                    color: '#8b5cf6',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Error
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  🔃 Reload Page
                </button>
              </div>

              {/* Helpful Links */}
              <div
                style={{
                  marginTop: 32,
                  padding: 16,
                  background: 'rgba(30, 30, 50, 0.3)',
                  borderRadius: 8,
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>
                  Debugging Tips
                </h3>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 12 }}>
                  <li>Open DevTools Console for more details</li>
                  <li>Check the React DevTools Components tab</li>
                  <li>Use the Debug tab in StickerNest for event tracking</li>
                  <li>Add useRenderCount() hook to suspect components</li>
                </ul>
              </div>
            </div>
          </div>
        );
      }

      // Production error display
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#1a1a2e',
            color: '#e2e8f0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 64, marginBottom: 24 }}>😵</span>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 24px', color: '#94a3b8' }}>
            We're sorry, but something unexpected happened.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
