/**
 * StickerNest v2 - WidgetUploader
 * Upload widget bundles with full manifest validation
 * Supports AI-powered manifest generation using Gemini via Replicate
 * Shows preview of bundle contents
 * Supports .zip file extraction
 */

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import type { WidgetManifest } from '../types/manifest';
import { uploadWidgetBundle } from '../services/supabaseClient';
import { getCurrentUser } from '../services/auth';
import { WidgetLoader } from '../runtime/WidgetLoader';
import { generateManifestFromBundle, ManifestSuggestions } from '../ai/ManifestAI';
import { ManifestEditor } from './ManifestEditor';

/**
 * Extract files from a zip archive
 */
async function extractZipFile(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const extractedFiles: File[] = [];

  const entries = Object.entries(zip.files);
  for (const [path, zipEntry] of entries) {
    // Skip directories and macOS metadata
    if (zipEntry.dir || path.startsWith('__MACOSX/') || path.includes('.DS_Store')) {
      continue;
    }

    const blob = await zipEntry.async('blob');
    const fileName = path.includes('/') ? path : path;
    const file = new File([blob], fileName, {
      type: getMimeType(path)
    });
    // Store the relative path for folder structure preservation
    (file as any).webkitRelativePath = path;
    extractedFiles.push(file);
  }

  return extractedFiles;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'md': 'text/markdown',
    'txt': 'text/plain',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

interface WidgetUploaderProps {
  onUpload: (manifest: WidgetManifest, files: File[]) => void;
}

interface ValidationError {
  field: string;
  message: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

type UploaderMode = 'manual' | 'ai-generating' | 'ai-editing';

const VALID_KINDS = ['2d', '3d', 'audio', 'video', 'hybrid'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_BUNDLE_SIZE = 20 * 1024 * 1024; // 20MB total

export const WidgetUploader: React.FC<WidgetUploaderProps> = ({ onUpload }) => {
  const [manifest, setManifest] = useState<WidgetManifest | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // AI manifest generation state
  const [mode, setMode] = useState<UploaderMode>('manual');
  const [aiManifest, setAiManifest] = useState<WidgetManifest | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<ManifestSuggestions | undefined>(undefined);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasManifestFile, setHasManifestFile] = useState(false);

  /**
   * Validate manifest against schema
   */
  const validateManifest = useCallback((parsed: any, files: File[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required string fields
    if (!parsed.id || typeof parsed.id !== 'string' || parsed.id.trim() === '') {
      errors.push({ field: 'id', message: 'Required: Widget ID must be a non-empty string' });
    } else if (!/^[a-z0-9-]+$/.test(parsed.id)) {
      errors.push({ field: 'id', message: 'Widget ID must contain only lowercase letters, numbers, and hyphens' });
    } else if (parsed.id === 'manifest') {
      errors.push({ field: 'id', message: 'Widget ID cannot be "manifest". Please choose a unique name (e.g., "my-widget").' });
    }

    if (!parsed.name || typeof parsed.name !== 'string' || parsed.name.trim() === '') {
      errors.push({ field: 'name', message: 'Required: Widget name must be a non-empty string' });
    }

    if (!parsed.version || typeof parsed.version !== 'string') {
      errors.push({ field: 'version', message: 'Required: Version must be a string (e.g., "1.0.0")' });
    } else if (!/^\d+\.\d+\.\d+$/.test(parsed.version)) {
      errors.push({ field: 'version', message: 'Version must follow semver format (e.g., "1.0.0")' });
    }

    if (!parsed.entry || typeof parsed.entry !== 'string') {
      errors.push({ field: 'entry', message: 'Required: Entry file path must be a string' });
    } else {
      // Check if entry file exists in uploaded files
      const entryExists = files.some(f => {
        let filename = f.name;
        if ((f as any).webkitRelativePath) {
          const parts = (f as any).webkitRelativePath.split('/');
          filename = parts.length > 1 ? parts.slice(1).join('/') : f.name;
        }
        return filename === parsed.entry;
      });
      if (!entryExists) {
        errors.push({ field: 'entry', message: `Entry file "${parsed.entry}" not found in uploaded files` });
      }
    }

    // Kind validation
    if (!parsed.kind) {
      errors.push({ field: 'kind', message: 'Required: Widget kind must be specified' });
    } else if (!VALID_KINDS.includes(parsed.kind)) {
      errors.push({ field: 'kind', message: `Invalid kind "${parsed.kind}". Must be one of: ${VALID_KINDS.join(', ')}` });
    }

    // Capabilities validation
    if (!parsed.capabilities || typeof parsed.capabilities !== 'object') {
      errors.push({ field: 'capabilities', message: 'Required: capabilities object must be defined' });
    } else {
      if (typeof parsed.capabilities.draggable !== 'boolean') {
        errors.push({ field: 'capabilities.draggable', message: 'capabilities.draggable must be a boolean' });
      }
      if (typeof parsed.capabilities.resizable !== 'boolean') {
        errors.push({ field: 'capabilities.resizable', message: 'capabilities.resizable must be a boolean' });
      }
      // rotatable is optional but must be boolean if present
      if (parsed.capabilities.rotatable !== undefined && typeof parsed.capabilities.rotatable !== 'boolean') {
        errors.push({ field: 'capabilities.rotatable', message: 'capabilities.rotatable must be a boolean if provided' });
      }
    }

    // Optional fields validation
    if (parsed.inputs !== undefined && typeof parsed.inputs !== 'object') {
      errors.push({ field: 'inputs', message: 'inputs must be an object if provided' });
    }

    if (parsed.outputs !== undefined && typeof parsed.outputs !== 'object') {
      errors.push({ field: 'outputs', message: 'outputs must be an object if provided' });
    }

    if (parsed.assets !== undefined) {
      if (!Array.isArray(parsed.assets)) {
        errors.push({ field: 'assets', message: 'assets must be an array if provided' });
      } else {
        // Check if all listed assets exist
        parsed.assets.forEach((assetPath: string, index: number) => {
          const assetExists = files.some(f => {
            let filename = f.name;
            if ((f as any).webkitRelativePath) {
              const parts = (f as any).webkitRelativePath.split('/');
              filename = parts.length > 1 ? parts.slice(1).join('/') : f.name;
            }
            return filename === assetPath;
          });
          if (!assetExists) {
            errors.push({ field: `assets[${index}]`, message: `Asset file "${assetPath}" not found in uploaded files` });
          }
        });
      }
    }

    return errors;
  }, []);

  /**
   * Generate warnings (non-blocking issues)
   */
  const generateWarnings = useCallback((parsed: any, files: File[]): string[] => {
    const warnings: string[] = [];

    // Check total bundle size
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_BUNDLE_SIZE) {
      warnings.push(`Bundle size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended ${MAX_BUNDLE_SIZE / 1024 / 1024}MB`);
    }

    // Check individual file sizes
    files.forEach(f => {
      if (f.size > MAX_FILE_SIZE) {
        warnings.push(`File "${f.name}" (${(f.size / 1024 / 1024).toFixed(2)}MB) exceeds recommended ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }
    });

    // Check for common missing files
    const hasReadme = files.some(f => f.name.toLowerCase() === 'readme.md');
    if (!hasReadme) {
      warnings.push('Consider adding a README.md for documentation');
    }

    // Check for minified entry
    if (parsed.entry && !parsed.entry.includes('.min.')) {
      warnings.push('Consider minifying your entry file for production');
    }

    return warnings;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files || []);

    // If no files selected, don't clear existing state
    if (files.length === 0) {
      return;
    }

    setErrors([]);
    setWarnings([]);
    setSuccessMsg(null);
    setIsValidating(true);
    setMode('manual');
    setAiManifest(null);
    setAiSuggestions(undefined);
    setAiError(null);

    // Check if a single zip file was uploaded - extract it
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
      try {
        const extractedFiles = await extractZipFile(files[0]);
        if (extractedFiles.length === 0) {
          setErrors([{ field: 'zip', message: 'Zip file appears to be empty' }]);
          setIsValidating(false);
          return;
        }
        files = extractedFiles;
        setWarnings(prev => [...prev, `Extracted ${extractedFiles.length} files from zip archive`]);
      } catch (err) {
        setErrors([{ field: 'zip', message: `Failed to extract zip: ${(err as Error).message}` }]);
        setIsValidating(false);
        return;
      }
    }

    setUploadedFiles(files);

    // Build file info list
    const infos: FileInfo[] = files.map(f => ({
      name: (f as any).webkitRelativePath || f.name,
      size: f.size,
      type: f.type || 'unknown'
    }));
    setFileInfos(infos);

    // Find manifest.json
    const manifestFile = files.find(f =>
      f.name === 'manifest.json' ||
      f.name.endsWith('/manifest.json') ||
      ((f as any).webkitRelativePath && (f as any).webkitRelativePath.endsWith('/manifest.json'))
    );

    setHasManifestFile(!!manifestFile);

    if (!manifestFile) {
      // No manifest file - show AI generation option
      setErrors([{ field: 'manifest', message: 'No manifest.json found. Use AI to generate one.' }]);
      setManifest(null);
      setIsValidating(false);
      return;
    }

    try {
      const text = await manifestFile.text();
      let parsed: any;

      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        setErrors([{ field: 'manifest', message: 'Invalid JSON in manifest.json' }]);
        setManifest(null);
        setIsValidating(false);
        return;
      }

      // Validate manifest
      const validationErrors = validateManifest(parsed, files);
      setErrors(validationErrors);

      // Generate warnings
      const validationWarnings = generateWarnings(parsed, files);
      setWarnings(validationWarnings);

      if (validationErrors.length === 0) {
        // Also run through WidgetLoader validator for consistency
        try {
          const loader: WidgetLoader = new WidgetLoader('');
          loader.validateManifest(parsed);
        } catch (loaderError) {
          setErrors([{ field: 'manifest', message: (loaderError as Error).message }]);
          setManifest(null);
          setIsValidating(false);
          return;
        }

        setManifest(parsed as WidgetManifest);
      } else {
        setManifest(null);
      }
    } catch (err) {
      setErrors([{ field: 'manifest', message: `Failed to read manifest: ${(err as Error).message}` }]);
      setManifest(null);
    }

    setIsValidating(false);
  };

  /**
   * Generate manifest using AI (Gemini via Replicate)
   */
  const handleAIGenerate = async () => {
    if (uploadedFiles.length === 0) return;

    setMode('ai-generating');
    setAiError(null);
    setAiManifest(null);
    setAiSuggestions(undefined);

    try {
      const result = await generateManifestFromBundle(uploadedFiles);

      if (result.success && result.manifest) {
        setAiManifest(result.manifest);
        setAiSuggestions(result.suggestions);
        setMode('ai-editing');
      } else {
        setAiError(result.errors?.join('; ') || 'Failed to generate manifest');
        setMode('manual');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI generation failed');
      setMode('manual');
    }
  };

  /**
   * Handle manifest approval from editor
   */
  const handleManifestApprove = (approvedManifest: WidgetManifest) => {
    setManifest(approvedManifest);
    setMode('manual');
    setErrors([]);

    // Re-validate the approved manifest
    const validationErrors = validateManifest(approvedManifest, uploadedFiles);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    }

    // Generate warnings
    const validationWarnings = generateWarnings(approvedManifest, uploadedFiles);
    setWarnings(validationWarnings);
  };

  /**
   * Handle manifest rejection from editor
   */
  const handleManifestReject = () => {
    setMode('manual');
    setAiManifest(null);
    setAiSuggestions(undefined);
  };

  const handleLocalPreview = () => {
    if (manifest && uploadedFiles.length > 0 && errors.length === 0) {
      onUpload(manifest, uploadedFiles);
    }
  };

  const handleCloudUpload = async () => {
    if (!manifest || uploadedFiles.length === 0 || errors.length > 0) return;

    setIsUploading(true);
    setSuccessMsg(null);

    try {
      const user = getCurrentUser();
      const result = await uploadWidgetBundle(user.userId, manifest, uploadedFiles);

      if (result.success) {
        setSuccessMsg(`Successfully uploaded widget "${manifest.name}" (v${manifest.version})`);
      } else {
        throw result.error || new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      setErrors([{ field: 'upload', message: `Upload failed: ${(err as Error).message}` }]);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const isValid = manifest !== null && errors.length === 0;

  // Show AI Editor when in ai-editing mode
  if (mode === 'ai-editing' || mode === 'ai-generating') {
    return (
      <div style={{
        padding: 20,
        border: '1px solid #333',
        borderRadius: 8,
        background: '#1a1a1a',
        color: '#eee'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h3 style={{ margin: 0, color: '#fff' }}>
            AI Manifest Generator
            <span style={{
              marginLeft: 8,
              padding: '2px 8px',
              background: '#4285f4',
              borderRadius: 4,
              fontSize: 10,
              color: '#fff',
              fontWeight: 'bold'
            }}>
              Gemini
            </span>
          </h3>
          <button
            onClick={() => setMode('manual')}
            style={{
              padding: '4px 12px',
              background: '#444',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Back to Manual
          </button>
        </div>

        <ManifestEditor
          manifest={aiManifest}
          suggestions={aiSuggestions}
          files={uploadedFiles}
          onApprove={handleManifestApprove}
          onReject={handleManifestReject}
          isLoading={mode === 'ai-generating'}
          aiError={aiError}
        />
      </div>
    );
  }

  return (
    <div style={{
      padding: 20,
      border: '1px solid #333',
      borderRadius: 8,
      background: '#1a1a1a',
      color: '#eee'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#fff' }}>Widget Uploader</h3>

      {/* File input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 8, color: '#aaa' }}>
          Select Widget Files (folder or multiple files):
        </label>
        <input
          type="file"
          multiple
          {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={handleFileChange}
          accept=".json,.js,.css,.html,.png,.jpg,.svg,.ts,.tsx,.md,.zip"
          style={{
            padding: 8,
            background: '#333',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            width: '100%'
          }}
        />
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          Select a folder, .zip file, or multiple files. Include <code style={{ background: '#333', padding: '1px 4px', borderRadius: 2 }}>manifest.json</code> or use AI to generate
        </div>
      </div>

      {/* AI Generate Button - show when files are uploaded but no manifest */}
      {uploadedFiles.length > 0 && !hasManifestFile && (
        <div style={{
          marginBottom: 20,
          padding: 16,
          background: 'linear-gradient(135deg, #1a2a3a 0%, #1a3a2a 100%)',
          borderRadius: 8,
          border: '1px solid #4a9eff'
        }}>
          <div style={{ marginBottom: 12, color: '#fff', fontSize: 14 }}>
            No manifest.json found in your bundle
          </div>
          <button
            onClick={handleAIGenerate}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #4a9eff 0%, #9acd32 100%)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span style={{ fontSize: 18 }}>✨</span>
            Generate Manifest with AI (Gemini)
          </button>
          <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
            Gemini will analyze your files and create a manifest
          </div>
        </div>
      )}

      {/* AI Generate Button - show when manifest exists but user wants to regenerate */}
      {uploadedFiles.length > 0 && hasManifestFile && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#222',
          borderRadius: 4,
          border: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            Want AI to analyze and improve your manifest?
          </div>
          <button
            onClick={handleAIGenerate}
            style={{
              padding: '6px 12px',
              background: '#4a9eff',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>✨</span>
            Regenerate with AI
          </button>
        </div>
      )}

      {/* Validation in progress */}
      {isValidating && (
        <div style={{ color: '#6bcfff', marginBottom: 16, padding: 10, background: '#1a3a4a', borderRadius: 4 }}>
          Validating bundle...
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && !(!hasManifestFile && uploadedFiles.length > 0) && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#3a1a1a',
          borderRadius: 4,
          border: '1px solid #ff6b6b'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#ff6b6b' }}>
            Validation Errors ({errors.length})
          </div>
          {errors.map((err, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{err.field}:</span>{' '}
              <span style={{ color: '#ffaaaa' }}>{err.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#3a3a1a',
          borderRadius: 4,
          border: '1px solid #ffd93d'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#ffd93d' }}>
            Warnings ({warnings.length})
          </div>
          {warnings.map((warn, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12, color: '#ffee99' }}>
              {warn}
            </div>
          ))}
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#1a3a1a',
          borderRadius: 4,
          border: '1px solid #9acd32',
          color: '#9acd32'
        }}>
          {successMsg}
        </div>
      )}

      {/* Manifest preview */}
      {manifest && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#222',
          borderRadius: 4,
          border: '1px solid #444'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>Manifest Preview</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '6px 12px',
            fontSize: 12
          }}>
            <span style={{ color: '#888' }}>ID:</span>
            <span style={{ color: '#9acd32' }}>{manifest.id}</span>

            <span style={{ color: '#888' }}>Name:</span>
            <span>{manifest.name}</span>

            <span style={{ color: '#888' }}>Version:</span>
            <span>{manifest.version}</span>

            <span style={{ color: '#888' }}>Kind:</span>
            <span style={{
              padding: '1px 6px',
              background: '#333',
              borderRadius: 3,
              display: 'inline-block'
            }}>{manifest.kind}</span>

            <span style={{ color: '#888' }}>Entry:</span>
            <span style={{ color: '#6bcfff' }}>{manifest.entry}</span>

            <span style={{ color: '#888' }}>Capabilities:</span>
            <span>
              {manifest.capabilities.draggable && <span style={{ marginRight: 8 }}>Draggable</span>}
              {manifest.capabilities.resizable && <span style={{ marginRight: 8 }}>Resizable</span>}
              {manifest.capabilities.rotatable && <span>Rotatable</span>}
            </span>
          </div>
        </div>
      )}

      {/* File list */}
      {fileInfos.length > 0 && (
        <div style={{
          marginBottom: 20,
          padding: 12,
          background: '#222',
          borderRadius: 4,
          border: '1px solid #444'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>
            Files ({fileInfos.length}) - {formatFileSize(uploadedFiles.reduce((s, f) => s + f.size, 0))} total
          </h4>
          <div style={{ maxHeight: 150, overflow: 'auto', fontSize: 11 }}>
            {fileInfos.map((info, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '3px 0',
                borderBottom: '1px solid #333'
              }}>
                <span style={{
                  color: info.name.endsWith('manifest.json') ? '#9acd32' :
                    info.name.endsWith('.js') || info.name.endsWith('.ts') ? '#6bcfff' :
                      info.name.endsWith('.css') ? '#dda0dd' : '#888'
                }}>
                  {info.name}
                </span>
                <span style={{ color: '#666' }}>{formatFileSize(info.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleLocalPreview}
          disabled={!isValid || isUploading}
          style={{
            padding: '10px 20px',
            background: isValid ? '#6c757d' : '#444',
            color: isValid ? '#fff' : '#888',
            border: 'none',
            borderRadius: 4,
            cursor: isValid && !isUploading ? 'pointer' : 'not-allowed',
            fontSize: 13
          }}
        >
          Preview Locally
        </button>

        <button
          onClick={handleCloudUpload}
          disabled={!isValid || isUploading}
          style={{
            padding: '10px 20px',
            background: isValid ? '#4a9eff' : '#444',
            color: isValid ? '#fff' : '#888',
            border: 'none',
            borderRadius: 4,
            cursor: isValid && !isUploading ? 'pointer' : 'not-allowed',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload to Cloud'}
        </button>
      </div>
    </div>
  );
};

export default WidgetUploader;
