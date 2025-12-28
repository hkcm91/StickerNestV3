/**
 * StickerNest v2 - Widget Publishing UI
 *
 * Complete UI for validating, previewing, and publishing widgets to the marketplace.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { WidgetManifest } from '../../types/manifest';
import type { ValidationResult, ValidationIssue } from '../../types/widget';
import { WidgetValidator } from '../../marketplace/WidgetValidator';
import { WidgetBundler, type BundleResult } from '../../marketplace/WidgetBundler';
import { BundleUploader, type UploadResult, type UploadProgress } from '../../marketplace/BundleUploader';

// ============================================================================
// TYPES
// ============================================================================

interface PublishingUIProps {
  /** Initial manifest data */
  initialManifest?: Partial<WidgetManifest>;
  /** Initial widget code (HTML or JS) */
  initialCode?: string;
  /** Callback when publishing succeeds */
  onPublish?: (result: PublishResult) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

interface PublishResult {
  manifest: WidgetManifest;
  bundlePath: string;
  bundleSize: number;
  publishedAt: number;
}

type PublishingStep = 'edit' | 'validate' | 'preview' | 'publish' | 'success';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ValidationIssueItem: React.FC<{ issue: ValidationIssue }> = ({ issue }) => {
  const severityIcon = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }[issue.severity];

  const severityClass = `issue-${issue.severity}`;

  return (
    <div className={`validation-issue ${severityClass}`}>
      <span className="issue-icon">{severityIcon}</span>
      <div className="issue-content">
        <div className="issue-message">{issue.message}</div>
        {issue.path && <div className="issue-path">at {issue.path}</div>}
        {issue.suggestion && <div className="issue-suggestion">{issue.suggestion}</div>}
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{ currentStep: PublishingStep }> = ({ currentStep }) => {
  const steps: PublishingStep[] = ['edit', 'validate', 'preview', 'publish', 'success'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`step ${index <= currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}`}>
            <div className="step-dot">
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <div className="step-label">{step.charAt(0).toUpperCase() + step.slice(1)}</div>
          </div>
          {index < steps.length - 1 && <div className={`step-line ${index < currentIndex ? 'active' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PublishingUI: React.FC<PublishingUIProps> = ({
  initialManifest,
  initialCode = '',
  onPublish,
  onCancel,
}) => {
  // State
  const [step, setStep] = useState<PublishingStep>('edit');
  const [manifest, setManifest] = useState<Partial<WidgetManifest>>(initialManifest || {
    id: '',
    name: '',
    version: '1.0.0',
    kind: 'display',
    entry: 'index.html',
    description: '',
    inputs: {},
    outputs: {},
    capabilities: { draggable: true, resizable: true },
  });
  const [code, setCode] = useState(initialCode);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [bundleResult, setBundleResult] = useState<BundleResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handlers
  const handleValidate = useCallback(async () => {
    setIsProcessing(true);
    const validator = new WidgetValidator();
    const result = validator.validateManifest(manifest);

    if (result.valid) {
      const codeResult = validator.validateWidgetCode(code);
      result.issues.push(...codeResult.issues);
      result.valid = result.valid && codeResult.valid;
    }

    setValidation(result);
    setIsProcessing(false);

    if (result.valid) {
      setStep('preview');
    }
  }, [manifest, code]);

  const handleBundle = useCallback(async () => {
    setIsProcessing(true);
    const bundler = new WidgetBundler();
    const result = await bundler.bundle({
      manifest: manifest as WidgetManifest,
      entryCode: code,
    });
    setBundleResult(result);
    setIsProcessing(false);

    if (result.success) {
      setStep('publish');
    }
  }, [manifest, code]);

  const handlePublish = useCallback(async () => {
    if (!bundleResult?.bundle) return;

    setIsProcessing(true);
    const uploader = new BundleUploader();

    const result = await uploader.upload(bundleResult.bundle, (progress) => {
      setUploadProgress(progress);
    });

    setUploadResult(result);
    setIsProcessing(false);

    if (result.success) {
      setStep('success');
      onPublish?.({
        manifest: manifest as WidgetManifest,
        bundlePath: result.bundlePath,
        bundleSize: result.bundleSize,
        publishedAt: Date.now(),
      });
    }
  }, [bundleResult, manifest, onPublish]);

  // Render
  return (
    <div className="publishing-ui">
      <style>{`
        .publishing-ui {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .publish-modal {
          width: 800px;
          max-width: 90vw;
          max-height: 90vh;
          background: #1e1e2e;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
          flex: 1;
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 8px;
          font-size: 20px;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 8px;
          background: rgba(0, 0, 0, 0.1);
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.3s;
        }

        .step.active .step-dot {
          background: #4fd1c5;
          color: #1e1e2e;
        }

        .step.completed .step-dot {
          background: #4fd1c5;
          color: #1e1e2e;
        }

        .step-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .step.active .step-label {
          color: #4fd1c5;
        }

        .step-line {
          width: 40px;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
        }

        .step-line.active {
          background: #4fd1c5;
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          color: white;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .form-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .form-field {
          flex: 1;
        }

        .form-field label {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 6px;
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          width: 100%;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: #4fd1c5;
        }

        .form-field select {
          cursor: pointer;
        }

        .form-field select option {
          background: #1e1e2e;
        }

        .form-field textarea {
          resize: vertical;
          min-height: 100px;
          font-family: inherit;
        }

        .code-editor {
          width: 100%;
          min-height: 300px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #f8f8f2;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
        }

        .validation-results {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 16px;
        }

        .validation-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .validation-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .validation-status.valid {
          color: #4fd1c5;
        }

        .validation-status.invalid {
          color: #fc8181;
        }

        .validation-issue {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .validation-issue.issue-error {
          border-left: 3px solid #fc8181;
        }

        .validation-issue.issue-warning {
          border-left: 3px solid #f6ad55;
        }

        .validation-issue.issue-info {
          border-left: 3px solid #63b3ed;
        }

        .issue-icon {
          font-size: 18px;
        }

        .issue-content {
          flex: 1;
        }

        .issue-message {
          font-size: 14px;
          color: white;
        }

        .issue-path {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
          margin-top: 4px;
        }

        .issue-suggestion {
          font-size: 12px;
          color: #4fd1c5;
          margin-top: 4px;
        }

        .preview-frame {
          width: 100%;
          height: 400px;
          border: none;
          border-radius: 8px;
          background: white;
        }

        .bundle-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .bundle-stat {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #4fd1c5;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        .progress-container {
          margin: 24px 0;
        }

        .progress-bar {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4fd1c5, #38b2ac);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .success-content {
          text-align: center;
          padding: 40px 20px;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .success-message {
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-primary {
          background: #4fd1c5;
          color: #1e1e2e;
        }

        .btn-primary:hover {
          background: #38b2ac;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="publish-modal">
        <div className="modal-header">
          <span className="modal-title">Publish Widget</span>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <StepIndicator currentStep={step} />

        <div className="modal-content">
          {/* Edit Step */}
          {step === 'edit' && (
            <>
              <div className="form-section">
                <div className="section-title">Widget Information</div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Package ID</label>
                    <input
                      type="text"
                      value={manifest.id || ''}
                      onChange={(e) => setManifest({ ...manifest, id: e.target.value })}
                      placeholder="mycompany.my-widget"
                    />
                  </div>
                  <div className="form-field">
                    <label>Version</label>
                    <input
                      type="text"
                      value={manifest.version || ''}
                      onChange={(e) => setManifest({ ...manifest, version: e.target.value })}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={manifest.name || ''}
                      onChange={(e) => setManifest({ ...manifest, name: e.target.value })}
                      placeholder="My Widget"
                    />
                  </div>
                  <div className="form-field">
                    <label>Kind</label>
                    <select
                      value={manifest.kind || 'display'}
                      onChange={(e) => setManifest({ ...manifest, kind: e.target.value as any })}
                    >
                      <option value="display">Display</option>
                      <option value="interactive">Interactive</option>
                      <option value="container">Container</option>
                      <option value="data">Data</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>Description</label>
                  <textarea
                    value={manifest.description || ''}
                    onChange={(e) => setManifest({ ...manifest, description: e.target.value })}
                    placeholder="Describe what your widget does..."
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="section-title">Widget Code (HTML)</div>
                <textarea
                  className="code-editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="<!DOCTYPE html>
<html>
<head>
  <style>/* Your styles */</style>
</head>
<body>
  <!-- Your content -->
  <script>
    // Use window.WidgetAPI for widget functionality
  </script>
</body>
</html>"
                />
              </div>
            </>
          )}

          {/* Validate Step */}
          {step === 'validate' && validation && (
            <div className="validation-results">
              <div className="validation-header">
                <div className={`validation-status ${validation.valid ? 'valid' : 'invalid'}`}>
                  {validation.valid ? '✓' : '✗'}
                  <span>{validation.valid ? 'Validation Passed' : 'Validation Failed'}</span>
                </div>
              </div>
              {validation.issues.map((issue, index) => (
                <ValidationIssueItem key={index} issue={issue} />
              ))}
              {validation.issues.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px' }}>
                  No issues found!
                </div>
              )}
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <>
              <div className="section-title">Widget Preview</div>
              <iframe
                className="preview-frame"
                srcDoc={code}
                title="Widget Preview"
                sandbox="allow-scripts"
              />
            </>
          )}

          {/* Publish Step */}
          {step === 'publish' && (
            <>
              {bundleResult && (
                <div className="bundle-info">
                  <div className="bundle-stat">
                    <div className="stat-value">{bundleResult.bundle?.files.length || 0}</div>
                    <div className="stat-label">Files</div>
                  </div>
                  <div className="bundle-stat">
                    <div className="stat-value">
                      {((bundleResult.bundle?.totalSize || 0) / 1024).toFixed(1)}KB
                    </div>
                    <div className="stat-label">Bundle Size</div>
                  </div>
                  <div className="bundle-stat">
                    <div className="stat-value">{manifest.version}</div>
                    <div className="stat-label">Version</div>
                  </div>
                </div>
              )}

              {uploadProgress && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  <div className="progress-label">
                    <span>{uploadProgress.phase}</span>
                    <span>
                      {uploadProgress.uploadedFiles} / {uploadProgress.totalFiles} files
                    </span>
                  </div>
                </div>
              )}

              {uploadResult?.error && (
                <div className="validation-issue issue-error">
                  <span className="issue-icon">❌</span>
                  <div className="issue-content">
                    <div className="issue-message">Upload failed: {uploadResult.error}</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="success-content">
              <div className="success-icon">🎉</div>
              <div className="success-title">Widget Published!</div>
              <div className="success-message">
                Your widget "{manifest.name}" v{manifest.version} has been successfully published.
              </div>
              {uploadResult && (
                <div className="bundle-info">
                  <div className="bundle-stat">
                    <div className="stat-value">{(uploadResult.bundleSize / 1024).toFixed(1)}KB</div>
                    <div className="stat-label">Bundle Size</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={() => {
              if (step === 'edit') {
                onCancel?.();
              } else {
                const steps: PublishingStep[] = ['edit', 'validate', 'preview', 'publish', 'success'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }
            }}
          >
            {step === 'edit' ? 'Cancel' : 'Back'}
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              switch (step) {
                case 'edit':
                  handleValidate();
                  setStep('validate');
                  break;
                case 'validate':
                  if (validation?.valid) {
                    handleBundle();
                  }
                  break;
                case 'preview':
                  handleBundle();
                  break;
                case 'publish':
                  handlePublish();
                  break;
                case 'success':
                  onCancel?.();
                  break;
              }
            }}
            disabled={isProcessing || (step === 'validate' && !validation?.valid)}
          >
            {step === 'edit' && 'Validate'}
            {step === 'validate' && (validation?.valid ? 'Continue to Preview' : 'Fix Issues')}
            {step === 'preview' && 'Prepare Bundle'}
            {step === 'publish' && (isProcessing ? 'Publishing...' : 'Publish')}
            {step === 'success' && 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishingUI;
