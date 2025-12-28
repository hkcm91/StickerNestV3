/**
 * StickerNest v2 - WidgetPreview
 * Preview panel for widgets using the same sandbox as CanvasRuntime
 * Supports local files (blob URLs) and remote widgets
 * Shows debug logs, errors, and allows entry file switching
 * Supports testing AI-generated manifests before upload
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { WidgetManifest } from '../types/manifest';
import type { DebugMessage, Event } from '../types/runtime';
import { WidgetLoader } from '../runtime/WidgetLoader';
import { WidgetSandboxHost } from '../runtime/WidgetSandboxHost';
import { EventBus } from '../runtime/EventBus';

interface WidgetPreviewProps {
  manifest: WidgetManifest;
  files: File[];
  /** If provided, load from remote instead of local files */
  remoteUserId?: string;
  /** Indicates manifest was AI-generated (shows badge) */
  isAIGenerated?: boolean;
  /** Callback when preview errors should be surfaced to parent */
  onError?: (error: string) => void;
}

interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: number;
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  manifest,
  files,
  remoteUserId: _remoteUserId,
  isAIGenerated = false,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState(manifest.entry);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxHost, setSandboxHost] = useState<WidgetSandboxHost | null>(null);
  const [eventBus] = useState(() => new EventBus());

  // Get available entry files from the file list
  const entryOptions = useMemo(() => {
    const jsFiles = files.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.tsx') || name.endsWith('.ts');
    });
    // Always include the manifest entry
    const entries = new Set([manifest.entry, ...jsFiles.map(f => {
      // Handle folder uploads
      if ((f as any).webkitRelativePath) {
        const parts = (f as any).webkitRelativePath.split('/');
        return parts.length > 1 ? parts.slice(1).join('/') : f.name;
      }
      return f.name;
    })]);
    return Array.from(entries);
  }, [files, manifest.entry]);

  // Subscribe to debug messages from eventBus
  useEffect(() => {
    const unsubDebug = eventBus.on('debug:message', (event: Event) => {
      const msg = event.payload as DebugMessage;
      setLogs(prev => [...prev, {
        level: msg.level,
        message: msg.message,
        data: msg.data,
        timestamp: msg.timestamp
      }].slice(-100)); // Keep last 100 logs
    });

    const unsubError = eventBus.on('widget:error', (event: Event) => {
      const { error: errMsg, stack } = event.payload;
      const newLog: LogEntry = {
        level: 'error' as const,
        message: errMsg,
        data: { stack },
        timestamp: Date.now()
      };
      setLogs(prev => [...prev, newLog].slice(-100));
    });

    const unsubMounted = eventBus.on('widget:mounted', () => {
      setIsLoading(false);
    });

    return () => {
      unsubDebug();
      unsubError();
      unsubMounted();
    };
  }, [eventBus]);

  // Load/reload preview when manifest, files, or entry changes
  const loadPreview = useCallback(async () => {
    if (!containerRef.current) return;

    // Cleanup previous sandbox
    if (sandboxHost) {
      try {
        await sandboxHost.unmount();
      } catch (e) {
        // Ignore unmount errors
      }
    }

    setIsLoading(true);
    setError(null);
    setLogs([]);

    try {
      // Create a modified manifest with the current entry
      const previewManifest: WidgetManifest = {
        ...manifest,
        entry: currentEntry
      };

      // Create widget loader (URL doesn't matter for local preview)
      const loader = new WidgetLoader('');

      // Create sandbox using local files
      const host = loader.createLocalSandbox(
        previewManifest,
        files,
        eventBus,
        true // debug enabled
      );

      // Clear container
      containerRef.current.innerHTML = '';

      // Mount the sandbox
      await host.mount(containerRef.current);

      setSandboxHost(host);

    } catch (err) {
      console.error('Preview failed:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMsg);
      setIsLoading(false);

      // Surface error to parent if callback provided
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [manifest, files, currentEntry, sandboxHost, eventBus, onError]);

  // Load preview on mount and when dependencies change
  useEffect(() => {
    loadPreview();

    return () => {
      // Cleanup on unmount
      if (sandboxHost) {
        sandboxHost.unmount().catch(() => { });
      }
    };
  }, [currentEntry]); // Only reload when entry changes

  // Initial load
  useEffect(() => {
    loadPreview();
  }, [manifest.id, manifest.version]); // Reload when widget changes

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const formatTimestamp = (ts: number): string => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const getLogColor = (level: string): string => {
    switch (level) {
      case 'error': return '#ff6b6b';
      case 'warn': return '#ffd93d';
      case 'info': return '#6bcfff';
      default: return '#aaa';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#1a1a1a',
      color: '#eee',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#2a2a2a'
      }}>
        <div>
          <strong style={{ color: '#fff' }}>{manifest.name}</strong>
          <span style={{ color: '#888', marginLeft: 8, fontSize: 12 }}>v{manifest.version}</span>
          <span style={{
            marginLeft: 10,
            padding: '2px 6px',
            background: '#444',
            borderRadius: 3,
            fontSize: 11,
            color: '#aaa'
          }}>
            {manifest.kind}
          </span>
          {isAIGenerated && (
            <span style={{
              marginLeft: 8,
              padding: '2px 6px',
              background: 'linear-gradient(135deg, #4a9eff 0%, #9acd32 100%)',
              borderRadius: 3,
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold'
            }}>
              AI Generated
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Entry:</span>
          <select
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            style={{
              padding: '4px 8px',
              background: '#333',
              border: '1px solid #444',
              borderRadius: 3,
              color: '#fff',
              fontSize: 12
            }}
          >
            {entryOptions.map(entry => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <button
            onClick={loadPreview}
            style={{
              padding: '4px 12px',
              background: '#4a9eff',
              border: 'none',
              borderRadius: 3,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Reload
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Preview area */}
        <div style={{
          flex: 2,
          position: 'relative',
          background: '#fff',
          borderRight: '1px solid #333'
        }}>
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              zIndex: 10
            }}>
              Loading widget...
            </div>
          )}

          {error && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,0,0,0.1)',
              color: '#ff6b6b',
              padding: 20,
              textAlign: 'center',
              zIndex: 10
            }}>
              <div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>Error</div>
                <div style={{ fontSize: 13 }}>{error}</div>
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden'
            }}
          />
        </div>

        {/* Console panel */}
        <div style={{
          flex: 1,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          background: '#1a1a1a'
        }}>
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#2a2a2a'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: 12 }}>Console Output</span>
            <button
              onClick={clearLogs}
              style={{
                padding: '2px 8px',
                background: '#444',
                border: 'none',
                borderRadius: 3,
                color: '#888',
                cursor: 'pointer',
                fontSize: 10
              }}
            >
              Clear
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
            fontFamily: 'monospace',
            fontSize: 11
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic', padding: 8 }}>
                No logs yet...
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '4px 0',
                    borderBottom: '1px solid #2a2a2a',
                    wordBreak: 'break-word'
                  }}
                >
                  <span style={{ color: '#666', fontSize: 10, marginRight: 6 }}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span style={{
                    color: getLogColor(log.level),
                    textTransform: 'uppercase',
                    fontSize: 10,
                    marginRight: 6
                  }}>
                    [{log.level}]
                  </span>
                  <span>{log.message}</span>
                  {log.data && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ color: '#666', cursor: 'pointer', fontSize: 10 }}>
                        data
                      </summary>
                      <pre style={{
                        margin: '4px 0 0 0',
                        padding: 6,
                        background: '#222',
                        borderRadius: 3,
                        overflow: 'auto',
                        maxHeight: 100,
                        fontSize: 10
                      }}>
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Widget info */}
          <div style={{
            padding: 8,
            borderTop: '1px solid #333',
            background: '#222',
            fontSize: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>ID:</span>
              <span>{manifest.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Entry:</span>
              <span>{currentEntry}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Files:</span>
              <span>{files.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#888' }}>Capabilities:</span>
              <span>
                {manifest.capabilities.draggable ? 'D' : '-'}
                {manifest.capabilities.resizable ? 'R' : '-'}
                {manifest.capabilities.rotatable ? 'T' : '-'}
              </span>
            </div>
            {isAIGenerated && (
              <div style={{
                marginTop: 8,
                padding: 6,
                background: '#1a2a3a',
                borderRadius: 3,
                color: '#6bcfff'
              }}>
                Manifest generated by Gemini
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPreview;
