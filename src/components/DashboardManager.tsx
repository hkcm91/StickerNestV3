/**
 * StickerNest v2 - Dashboard Manager
 * Component for listing, creating, and managing dashboards
 * Supports both local storage and Supabase persistence
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  listDashboards,
  loadDashboard,
  deleteDashboard,
  exportDashboard,
  importDashboard,
  type DashboardSummary,
  type DashboardState,
} from '../services/dashboardClient';
import { useAuth } from '../contexts/AuthContext';

interface DashboardManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDashboard: (canvasId: string) => Promise<void>;
  currentCanvasId: string;
  onCreateCanvas?: () => void;
}

export const DashboardManager: React.FC<DashboardManagerProps> = ({
  isOpen,
  onClose,
  onLoadDashboard,
  currentCanvasId,
  onCreateCanvas,
}) => {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Load dashboard list
  const loadDashboardList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await listDashboards(user?.id);
      setDashboards(list);
    } catch (err) {
      setError('Failed to load dashboards');
      console.error('[DashboardManager] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isOpen) {
      loadDashboardList();
    }
  }, [isOpen, loadDashboardList]);

  // Handle load
  const handleLoad = async (canvasId: string) => {
    try {
      await onLoadDashboard(canvasId);
      onClose();
    } catch (err) {
      setError('Failed to load dashboard');
    }
  };

  // Handle delete
  const handleDelete = async (canvasId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;
    
    try {
      const result = await deleteDashboard(canvasId);
      if (result.success) {
        setDashboards(prev => prev.filter(d => d.id !== canvasId));
      } else {
        setError(result.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete dashboard');
    }
  };

  // Handle export
  const handleExport = async (canvasId: string) => {
    try {
      const result = await exportDashboard(canvasId);
      if (result.success && result.json) {
        // Download as JSON file
        const blob = new Blob([result.json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-${canvasId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export dashboard');
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importText.trim() || !user?.id) return;

    try {
      const result = await importDashboard(importText, user?.id || 'demo-user');
      if (result.success) {
        setShowImport(false);
        setImportText('');
        loadDashboardList();
      } else {
        setError(result.error || 'Failed to import');
      }
    } catch (err) {
      setError('Failed to import dashboard');
    }
  };

  // Handle file import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportText(event.target?.result as string);
      setShowImport(true);
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: 12,
        width: '90%',
        maxWidth: 600,
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem' }}>
              📊 Dashboard Manager
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
              Manage your saved dashboards
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1.2rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Actions */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: 10,
        }}>
          {onCreateCanvas && (
            <button
              onClick={() => {
                onCreateCanvas();
                onClose();
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + New Canvas
            </button>
          )}
          <label style={{
            padding: '8px 16px',
            background: 'rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 6,
            color: '#a78bfa',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}>
            📥 Import
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </label>
          <button
            onClick={() => loadDashboardList()}
            style={{
              padding: '8px 16px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 6,
              color: '#60a5fa',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {/* Import Dialog */}
        {showImport && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(0,0,0,0.2)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste dashboard JSON here..."
              style={{
                width: '100%',
                height: 100,
                padding: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                resize: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={handleImport}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Import Dashboard
              </button>
              <button
                onClick={() => { setShowImport(false); setImportText(''); }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Dashboard List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 20px',
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              Loading dashboards...
            </div>
          ) : dashboards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: 8 }}>
                No Saved Dashboards
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Save your current canvas to see it here
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dashboards.map(dashboard => (
                <div
                  key={dashboard.id}
                  style={{
                    padding: 16,
                    background: dashboard.id === currentCanvasId 
                      ? 'rgba(139, 92, 246, 0.15)'
                      : 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    border: dashboard.id === currentCanvasId
                      ? '1px solid rgba(139, 92, 246, 0.3)'
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}>
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: '#e2e8f0',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        {dashboard.name}
                        {dashboard.id === currentCanvasId && (
                          <span style={{
                            padding: '2px 8px',
                            background: 'rgba(139, 92, 246, 0.3)',
                            borderRadius: 4,
                            fontSize: '0.7rem',
                            color: '#a78bfa',
                          }}>
                            Current
                          </span>
                        )}
                        <span style={{
                          padding: '2px 8px',
                          background: dashboard.visibility === 'public'
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(100, 116, 139, 0.2)',
                          borderRadius: 4,
                          fontSize: '0.65rem',
                          color: dashboard.visibility === 'public' ? '#10b981' : '#64748b',
                        }}>
                          {dashboard.visibility}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginTop: 6,
                      }}>
                        {dashboard.widgetCount} widgets • {dashboard.pipelineCount} pipelines
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#475569',
                        marginTop: 4,
                      }}>
                        Updated: {new Date(dashboard.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleLoad(dashboard.id)}
                        disabled={dashboard.id === currentCanvasId}
                        style={{
                          padding: '6px 12px',
                          background: dashboard.id === currentCanvasId
                            ? 'rgba(100,100,100,0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 4,
                          color: dashboard.id === currentCanvasId ? '#64748b' : '#10b981',
                          fontSize: '0.75rem',
                          cursor: dashboard.id === currentCanvasId ? 'default' : 'pointer',
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleExport(dashboard.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: 4,
                          color: '#60a5fa',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Export
                      </button>
                      <button
                        onClick={() => handleDelete(dashboard.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: 4,
                          color: '#f87171',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardManager;

