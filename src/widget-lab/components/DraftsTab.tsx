/**
 * Drafts Tab Component
 * Shows generated widget drafts with preview and code view
 */

import React from 'react';
import { theme } from '../theme';
import type { DraftWidget } from '../../ai/DraftManager';

export interface DraftsTabProps {
  drafts: DraftWidget[];
  previewDraft: DraftWidget | null;
  setPreviewDraft: React.Dispatch<React.SetStateAction<DraftWidget | null>>;
  showCodeView: boolean;
  setShowCodeView: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingToLibrary: boolean;
  onSaveToLibrary: (draft: DraftWidget) => Promise<void>;
  onDeleteDraft: (draftId: string) => void;
}

export const DraftsTab: React.FC<DraftsTabProps> = ({
  drafts,
  previewDraft,
  setPreviewDraft,
  showCodeView,
  setShowCodeView,
  isSavingToLibrary,
  onSaveToLibrary,
  onDeleteDraft,
}) => {
  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
      {/* Drafts List */}
      <div style={{ width: '300px', flexShrink: 0 }}>
        <div style={{
          background: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.border}`,
            fontSize: '12px',
            fontWeight: 500,
            color: theme.text.secondary,
            textTransform: 'uppercase',
          }}>
            Generated Widgets
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {drafts.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: theme.text.tertiary,
                fontSize: '13px',
              }}>
                No widgets generated yet.
                <br />
                <span style={{ fontSize: '12px' }}>Use the Generate tab to create widgets.</span>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => setPreviewDraft(draft)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${theme.border}`,
                    cursor: 'pointer',
                    background: previewDraft?.id === draft.id ? theme.accentMuted : 'transparent',
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: theme.text.primary,
                    marginBottom: '4px',
                  }}>
                    {draft.manifest.name}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.text.tertiary }}>
                    {draft.manifest.id}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '8px',
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveToLibrary(draft);
                      }}
                      disabled={isSavingToLibrary}
                      style={{
                        padding: '4px 8px',
                        background: theme.accent,
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '10px',
                        cursor: isSavingToLibrary ? 'not-allowed' : 'pointer',
                        opacity: isSavingToLibrary ? 0.6 : 1,
                      }}
                    >
                      {isSavingToLibrary ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDraft(draft.id);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: 'none',
                        borderRadius: '4px',
                        color: theme.error,
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div style={{ flex: 1 }}>
        {previewDraft ? (
          <div style={{
            background: theme.bg.secondary,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: theme.text.primary }}>
                {previewDraft.manifest.name}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* View Toggle */}
                <div style={{
                  display: 'flex',
                  background: theme.bg.tertiary,
                  borderRadius: '4px',
                  padding: '2px',
                }}>
                  <button
                    onClick={() => setShowCodeView(false)}
                    style={{
                      padding: '4px 10px',
                      background: !showCodeView ? theme.accent : 'transparent',
                      border: 'none',
                      borderRadius: '3px',
                      color: !showCodeView ? 'white' : theme.text.tertiary,
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setShowCodeView(true)}
                    style={{
                      padding: '4px 10px',
                      background: showCodeView ? theme.accent : 'transparent',
                      border: 'none',
                      borderRadius: '3px',
                      color: showCodeView ? 'white' : theme.text.tertiary,
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    Code
                  </button>
                </div>
                <button
                  onClick={() => onSaveToLibrary(previewDraft)}
                  disabled={isSavingToLibrary}
                  style={{
                    padding: '6px 12px',
                    background: theme.success,
                    border: 'none',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '11px',
                    cursor: isSavingToLibrary ? 'not-allowed' : 'pointer',
                    opacity: isSavingToLibrary ? 0.6 : 1,
                  }}
                >
                  {isSavingToLibrary ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </div>

            {/* I/O Ports Display */}
            {(Object.keys(previewDraft.manifest.inputs || {}).length > 0 ||
              Object.keys(previewDraft.manifest.outputs || {}).length > 0) && (
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${theme.border}`,
                background: theme.bg.tertiary,
              }}>
                <div style={{ fontSize: '11px', color: theme.text.secondary, marginBottom: '8px', fontWeight: 500 }}>
                  ECOSYSTEM CONNECTIONS
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {Object.keys(previewDraft.manifest.inputs || {}).length > 0 && (
                    <div>
                      <span style={{ fontSize: '10px', color: theme.text.tertiary }}>Inputs: </span>
                      {Object.keys(previewDraft.manifest.inputs || {}).map((name, i) => (
                        <span key={name} style={{
                          fontSize: '11px',
                          color: theme.accent,
                          fontFamily: 'monospace',
                          marginLeft: i > 0 ? '6px' : '4px',
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {Object.keys(previewDraft.manifest.outputs || {}).length > 0 && (
                    <div>
                      <span style={{ fontSize: '10px', color: theme.text.tertiary }}>Outputs: </span>
                      {Object.keys(previewDraft.manifest.outputs || {}).map((name, i) => (
                        <span key={name} style={{
                          fontSize: '11px',
                          color: theme.success,
                          fontFamily: 'monospace',
                          marginLeft: i > 0 ? '6px' : '4px',
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '10px', color: theme.text.tertiary, marginTop: '8px', marginBottom: 0 }}>
                  Connect this widget to others using the Pipeline Builder.
                </p>
              </div>
            )}

            <div style={{ flex: 1, overflow: 'hidden' }}>
              {showCodeView ? (
                <div style={{
                  height: '100%',
                  overflow: 'auto',
                  background: '#0d0d14',
                }}>
                  {/* Manifest */}
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${theme.border}`,
                  }}>
                    <div style={{
                      fontSize: '11px',
                      color: theme.text.secondary,
                      marginBottom: '8px',
                      fontWeight: 500,
                    }}>
                      MANIFEST.JSON
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      background: theme.bg.tertiary,
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: theme.text.primary,
                      fontFamily: 'Consolas, Monaco, monospace',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}>
                      {JSON.stringify(previewDraft.manifest, null, 2)}
                    </pre>
                  </div>
                  {/* HTML */}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{
                      fontSize: '11px',
                      color: theme.text.secondary,
                      marginBottom: '8px',
                      fontWeight: 500,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span>INDEX.HTML</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(previewDraft.html);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: theme.bg.secondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          color: theme.text.secondary,
                          fontSize: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        Copy HTML
                      </button>
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      background: theme.bg.tertiary,
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: theme.text.primary,
                      fontFamily: 'Consolas, Monaco, monospace',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}>
                      {previewDraft.html}
                    </pre>
                  </div>
                </div>
              ) : (
                <iframe
                  srcDoc={previewDraft.html}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#fff',
                  }}
                  sandbox="allow-scripts"
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: theme.bg.secondary,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.text.tertiary,
            fontSize: '14px',
          }}>
            Select a widget to preview
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsTab;
