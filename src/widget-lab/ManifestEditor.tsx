/**
 * StickerNest v2 - ManifestEditor
 * JSON editor for widget manifests with validation
 * Displays AI suggestions and allows user editing before upload
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { WidgetManifest } from '../types/manifest';
import type { ManifestSuggestions } from '../ai/ManifestAI';
import { validateManifest } from '../ai/ManifestAI';

interface ManifestEditorProps {
  manifest: WidgetManifest | null;
  suggestions?: ManifestSuggestions;
  files: File[];
  onApprove: (manifest: WidgetManifest) => void;
  onReject: () => void;
  isLoading?: boolean;
  aiError?: string | null;
}

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export const ManifestEditor: React.FC<ManifestEditorProps> = ({
  manifest,
  suggestions,
  files,
  onApprove,
  onReject,
  isLoading = false,
  aiError = null
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({ errors: [], warnings: [] });
  const [editedManifest, setEditedManifest] = useState<WidgetManifest | null>(null);

  // Get file names for validation
  const fileNames = useMemo(() => {
    return files.map(f => {
      const relativePath = (f as any).webkitRelativePath;
      if (relativePath) {
        const parts = relativePath.split('/');
        return parts.length > 1 ? parts.slice(1).join('/') : f.name;
      }
      return f.name;
    });
  }, [files]);

  // Initialize JSON text when manifest changes
  useEffect(() => {
    if (manifest) {
      setJsonText(JSON.stringify(manifest, null, 2));
      setEditedManifest(manifest);
      setParseError(null);
    } else {
      setJsonText('');
      setEditedManifest(null);
    }
  }, [manifest]);

  // Validate whenever edited manifest changes
  useEffect(() => {
    if (editedManifest) {
      const errors = validateManifest(editedManifest, fileNames);
      const warnings: string[] = [];

      // Generate warnings
      if (!editedManifest.assets || editedManifest.assets.length === 0) {
        const cssFiles = fileNames.filter(f => f.endsWith('.css'));
        if (cssFiles.length > 0) {
          warnings.push(`Consider adding CSS files to assets: ${cssFiles.join(', ')}`);
        }
      }

      if (editedManifest.version === '1.0.0') {
        warnings.push('Version is set to default 1.0.0');
      }

      setValidation({ errors, warnings });
    } else {
      setValidation({ errors: [], warnings: [] });
    }
  }, [editedManifest, fileNames]);

  // Handle JSON text change
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);

    try {
      const parsed = JSON.parse(text);
      setEditedManifest(parsed);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
      setEditedManifest(null);
    }
  }, []);

  // Handle approve
  const handleApprove = useCallback(() => {
    if (editedManifest && validation.errors.length === 0) {
      onApprove(editedManifest);
    }
  }, [editedManifest, validation.errors, onApprove]);

  // Format JSON
  const handleFormat = useCallback(() => {
    if (editedManifest) {
      setJsonText(JSON.stringify(editedManifest, null, 2));
    }
  }, [editedManifest]);

  // Apply suggestion field
  const applySuggestion = useCallback((field: keyof WidgetManifest) => {
    if (!suggestions || !editedManifest) return;

    const updated = { ...editedManifest };
    if (field === 'capabilities' && suggestions.capabilities) {
      updated.capabilities = { ...suggestions.capabilities };
    } else if (field in suggestions) {
      (updated as any)[field] = (suggestions as any)[field];
    }

    setEditedManifest(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  }, [suggestions, editedManifest]);

  const isValid = editedManifest !== null && parseError === null && validation.errors.length === 0;

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: 8,
      border: '1px solid #333',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: '#2a2a2a',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: 14 }}>
          Manifest Editor
          {isLoading && <span style={{ color: '#6bcfff', marginLeft: 8, fontSize: 12 }}>Generating...</span>}
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleFormat}
            disabled={!editedManifest}
            style={{
              padding: '4px 12px',
              background: '#444',
              border: 'none',
              borderRadius: 4,
              color: editedManifest ? '#fff' : '#666',
              cursor: editedManifest ? 'pointer' : 'not-allowed',
              fontSize: 12
            }}
          >
            Format
          </button>
        </div>
      </div>

      {/* AI Error */}
      {aiError && (
        <div style={{
          padding: 12,
          background: '#3a1a1a',
          borderBottom: '1px solid #ff6b6b',
          color: '#ff6b6b',
          fontSize: 12
        }}>
          <strong>AI Error:</strong> {aiError}
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', minHeight: 300 }}>
        {/* JSON Editor */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
          <textarea
            value={jsonText}
            onChange={handleTextChange}
            placeholder={isLoading ? 'Generating manifest...' : 'Paste or edit manifest JSON here...'}
            disabled={isLoading}
            spellCheck={false}
            style={{
              flex: 1,
              padding: 12,
              background: '#111',
              border: 'none',
              color: parseError ? '#ff6b6b' : '#9acd32',
              fontFamily: 'monospace',
              fontSize: 12,
              resize: 'none',
              outline: 'none',
              minHeight: 250
            }}
          />

          {/* Parse error */}
          {parseError && (
            <div style={{
              padding: '8px 12px',
              background: '#3a1a1a',
              color: '#ff6b6b',
              fontSize: 11,
              fontFamily: 'monospace'
            }}>
              Parse Error: {parseError}
            </div>
          )}
        </div>

        {/* Suggestions & Validation Panel */}
        <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
          {/* AI Suggestions */}
          {suggestions && (
            <div style={{
              padding: 12,
              borderBottom: '1px solid #333',
              background: '#1a2a1a'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#9acd32', fontSize: 12 }}>
                AI Suggestions
              </div>

              <div style={{ fontSize: 11, marginBottom: 8 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #333'
                }}>
                  <span style={{ color: '#888' }}>ID:</span>
                  <span style={{ color: '#6bcfff' }}>{suggestions.id}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #333'
                }}>
                  <span style={{ color: '#888' }}>Name:</span>
                  <span>{suggestions.name}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #333'
                }}>
                  <span style={{ color: '#888' }}>Entry:</span>
                  <span style={{ color: '#dda0dd' }}>{suggestions.entry}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: '1px solid #333'
                }}>
                  <span style={{ color: '#888' }}>Kind:</span>
                  <span style={{
                    padding: '1px 6px',
                    background: '#333',
                    borderRadius: 3
                  }}>{suggestions.kind}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 0'
                }}>
                  <span style={{ color: '#888' }}>Capabilities:</span>
                  <span>
                    {suggestions.capabilities.draggable && 'D'}
                    {suggestions.capabilities.resizable && 'R'}
                    {suggestions.capabilities.rotatable && 'T'}
                  </span>
                </div>
              </div>

              {suggestions.reasoning && (
                <div style={{
                  padding: 8,
                  background: '#222',
                  borderRadius: 4,
                  fontSize: 10,
                  color: '#aaa',
                  fontStyle: 'italic'
                }}>
                  {suggestions.reasoning}
                </div>
              )}
            </div>
          )}

          {/* Validation Results */}
          <div style={{ flex: 1, padding: 12, overflow: 'auto' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#fff', fontSize: 12 }}>
              Validation
            </div>

            {validation.errors.length === 0 && validation.warnings.length === 0 && editedManifest && (
              <div style={{ color: '#9acd32', fontSize: 11 }}>
                Manifest is valid
              </div>
            )}

            {validation.errors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                  Errors ({validation.errors.length})
                </div>
                {validation.errors.map((error, i) => (
                  <div key={i} style={{
                    padding: '4px 8px',
                    background: '#3a1a1a',
                    borderRadius: 3,
                    marginBottom: 4,
                    fontSize: 10,
                    color: '#ffaaaa'
                  }}>
                    {error}
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <div style={{ color: '#ffd93d', fontSize: 11, fontWeight: 'bold', marginBottom: 4 }}>
                  Warnings ({validation.warnings.length})
                </div>
                {validation.warnings.map((warning, i) => (
                  <div key={i} style={{
                    padding: '4px 8px',
                    background: '#3a3a1a',
                    borderRadius: 3,
                    marginBottom: 4,
                    fontSize: 10,
                    color: '#ffee99'
                  }}>
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File List */}
          <div style={{
            padding: 12,
            borderTop: '1px solid #333',
            background: '#222'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#fff', fontSize: 11 }}>
              Bundle Files ({fileNames.length})
            </div>
            <div style={{ maxHeight: 100, overflow: 'auto', fontSize: 10 }}>
              {fileNames.slice(0, 10).map((name, i) => (
                <div key={i} style={{
                  padding: '2px 0',
                  color: name === editedManifest?.entry ? '#9acd32' :
                         editedManifest?.assets?.includes(name) ? '#6bcfff' : '#888'
                }}>
                  {name === editedManifest?.entry && '* '}
                  {name}
                </div>
              ))}
              {fileNames.length > 10 && (
                <div style={{ color: '#666', fontStyle: 'italic' }}>
                  ... and {fileNames.length - 10} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: '12px 16px',
        background: '#2a2a2a',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: 11, color: '#888' }}>
          {isValid ? (
            <span style={{ color: '#9acd32' }}>Ready to preview or upload</span>
          ) : (
            <span style={{ color: '#ff6b6b' }}>Fix errors before continuing</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onReject}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: '#444',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 12
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={!isValid || isLoading}
            style={{
              padding: '8px 16px',
              background: isValid ? '#4a9eff' : '#333',
              border: 'none',
              borderRadius: 4,
              color: isValid ? '#fff' : '#666',
              cursor: isValid && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: 12,
              fontWeight: 'bold'
            }}
          >
            Approve Manifest
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManifestEditor;
