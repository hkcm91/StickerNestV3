/**
 * StickerNest v2 - Error Boundary Component
 * Catches and displays errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SNButton } from './SNButton';
import { SNIcon } from './SNIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SNErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <div style={styles.iconWrapper}>
              <SNIcon name="warning" size="xl" />
            </div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              We're sorry, but something unexpected happened. Please try again or refresh the page.
            </p>

            {this.props.showDetails && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.errorText}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={styles.actions}>
              <SNButton variant="primary" onClick={this.handleRetry}>
                Try Again
              </SNButton>
              <SNButton variant="secondary" onClick={this.handleReload}>
                Refresh Page
              </SNButton>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export const withErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> => {
  return (props: P) => (
    <SNErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </SNErrorBoundary>
  );
};

// Simple page-level error fallback
export const PageErrorFallback: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Page Error',
  message = 'This page encountered an error. Please try again.',
  onRetry,
}) => (
  <div style={styles.pageFallback}>
    <div style={styles.pageFallbackContent}>
      <div style={styles.iconWrapper}>
        <SNIcon name="warning" size="xl" />
      </div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.message}>{message}</p>
      {onRetry && (
        <SNButton variant="primary" onClick={onRetry}>
          Try Again
        </SNButton>
      )}
    </div>
  </div>
);

// Inline error display for smaller components
export const InlineError: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div style={styles.inlineError}>
    <SNIcon name="warning" size="sm" />
    <span style={styles.inlineMessage}>{message}</span>
    {onRetry && (
      <button onClick={onRetry} style={styles.retryLink}>
        Retry
      </button>
    )}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    padding: 32,
  },
  content: {
    textAlign: 'center',
    maxWidth: 400,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    margin: '0 auto 16px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f87171',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#f1f5f9',
    margin: '0 0 8px',
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    margin: '0 0 24px',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  details: {
    marginBottom: 24,
    textAlign: 'left',
  },
  summary: {
    fontSize: 13,
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.05)',
    padding: 12,
    borderRadius: 8,
    overflow: 'auto',
    maxHeight: 200,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  pageFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    padding: 32,
  },
  pageFallbackContent: {
    textAlign: 'center',
    maxWidth: 400,
  },
  inlineError: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    color: '#f87171',
    fontSize: 13,
  },
  inlineMessage: {
    flex: 1,
  },
  retryLink: {
    background: 'transparent',
    border: 'none',
    color: '#a78bfa',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default SNErrorBoundary;
