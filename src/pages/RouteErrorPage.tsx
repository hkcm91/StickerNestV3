import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { isChunkLoadError } from '../utils/lazyWithRetry';

export const RouteErrorPage: React.FC = () => {
    const error = useRouteError();
    let errorMessage: string;
    let errorStack: string | undefined;

    if (isRouteErrorResponse(error)) {
        // error is type `ErrorResponse`
        errorMessage = error.statusText || error.data?.message || 'Unknown error';
    } else if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        console.error(error);
        errorMessage = 'Unknown error';
    }

    // Check if this is a chunk load error (common after deployments)
    const isChunkError = isChunkLoadError(error);

    // Handle chunk load errors with a user-friendly message
    if (isChunkError) {
        return (
            <div style={{
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
            }}>
                <span style={{ fontSize: 64, marginBottom: 24 }}>🔄</span>
                <h1 style={{ margin: '0 0 8px', fontSize: 32, color: '#8b5cf6' }}>
                    New Version Available
                </h1>
                <p style={{ margin: '0 0 8px', color: '#94a3b8', fontSize: 18 }}>
                    StickerNest has been updated since you last visited.
                </p>
                <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
                    Please refresh the page to load the latest version.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
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
                            transition: 'background 0.2s'
                        }}
                    >
                        Refresh Page
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            padding: '12px 32px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#8b5cf6',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: 8,
                            fontSize: 16,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
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
        }}>
            <span style={{ fontSize: 64, marginBottom: 24 }}>💥</span>
            <h1 style={{ margin: '0 0 8px', fontSize: 32, color: '#ef4444' }}>Oops!</h1>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 18 }}>
                Sorry, an unexpected error has occurred.
            </p>

            <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                maxWidth: 600,
                width: '100%',
                textAlign: 'left'
            }}>
                <code style={{ fontSize: 14, lineHeight: 1.5, color: '#fca5a5', display: 'block' }}>
                    {errorMessage}
                </code>
                {errorStack && (
                    <pre style={{
                        marginTop: 12,
                        fontSize: 11,
                        color: '#94a3b8',
                        overflow: 'auto',
                        maxHeight: 200
                    }}>
                        {errorStack}
                    </pre>
                )}
            </div>

            <button
                onClick={() => window.location.href = '/'}
                style={{
                    padding: '12px 32px',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                }}
            >
                Go Home
            </button>
        </div>
    );
};
