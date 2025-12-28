/**
 * Widget Generator 2.0 - Tab 5: Publishing Panel
 *
 * Handles the publishing workflow:
 * - Validate manifest
 * - Ensure all assets exist
 * - Generate royalty metadata
 * - Push to library
 * - Push to marketplace
 * - Generate changelog
 */

import { useState, useMemo, useCallback } from 'react';
import type { SpecJSON, GeneratedWidgetPackage, SpecValidationResult } from '../../../types/specjson';

interface PublishingPanelProps {
  spec: SpecJSON;
  package: GeneratedWidgetPackage | null;
  validation: SpecValidationResult;
  onPublish: () => void;
}

type PublishStep = 'validation' | 'assets' | 'metadata' | 'review' | 'publish';

interface ChecklistItem {
  id: string;
  label: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  message?: string;
}

export function PublishingPanel({
  spec,
  package: pkg,
  validation,
  onPublish
}: PublishingPanelProps) {
  const [currentStep, setCurrentStep] = useState<PublishStep>('validation');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Generate checklist items
  const checklist = useMemo((): ChecklistItem[] => {
    const items: ChecklistItem[] = [];

    // Validation checks
    items.push({
      id: 'spec-valid',
      label: 'SpecJSON Validation',
      status: validation.valid ? 'passed' : 'failed',
      message: validation.valid
        ? 'All required fields are valid'
        : `${validation.errors.length} validation errors`
    });

    items.push({
      id: 'warnings',
      label: 'Validation Warnings',
      status: validation.warnings.length === 0 ? 'passed' : 'warning',
      message: validation.warnings.length === 0
        ? 'No warnings'
        : `${validation.warnings.length} warnings found`
    });

    // Code generation check
    items.push({
      id: 'code-generated',
      label: 'Code Generated',
      status: pkg ? 'passed' : 'failed',
      message: pkg
        ? `${pkg.files.length} files generated`
        : 'Code not generated yet'
    });

    // Required fields
    items.push({
      id: 'has-description',
      label: 'Description provided',
      status: spec.description && spec.description.length >= 10 ? 'passed' : 'warning',
      message: spec.description ? `${spec.description.length} characters` : 'Missing description'
    });

    items.push({
      id: 'has-version',
      label: 'Version number',
      status: /^\d+\.\d+\.\d+/.test(spec.version) ? 'passed' : 'failed',
      message: spec.version
    });

    // Permissions check
    items.push({
      id: 'permissions-set',
      label: 'Permissions configured',
      status: 'passed',
      message: `Pipeline: ${spec.permissions.allowPipelineUse ? '✓' : '✗'}, Forking: ${spec.permissions.allowForking ? '✓' : '✗'}`
    });

    // Marketplace checks
    if (spec.permissions.allowMarketplace) {
      items.push({
        id: 'revenue-share',
        label: 'Revenue share configured',
        status: spec.permissions.revenueShare ? 'passed' : 'warning',
        message: spec.permissions.revenueShare
          ? `Creator: ${(spec.permissions.revenueShare.creator * 100).toFixed(0)}%, Platform: ${(spec.permissions.revenueShare.platform * 100).toFixed(0)}%`
          : 'Default split will be applied'
      });
    }

    // I/O ports check
    items.push({
      id: 'has-io',
      label: 'Pipeline I/O defined',
      status: spec.api.inputs.length > 0 || spec.api.outputs.length > 0 ? 'passed' : 'warning',
      message: `${spec.api.inputs.length} inputs, ${spec.api.outputs.length} outputs`
    });

    return items;
  }, [spec, pkg, validation]);

  // Calculate overall readiness
  const readiness = useMemo(() => {
    const failed = checklist.filter(c => c.status === 'failed').length;
    const warnings = checklist.filter(c => c.status === 'warning').length;
    const passed = checklist.filter(c => c.status === 'passed').length;

    if (failed > 0) return { status: 'blocked', message: `${failed} blocking issues` };
    if (warnings > 0) return { status: 'ready-with-warnings', message: `${warnings} warnings` };
    return { status: 'ready', message: 'Ready to publish' };
  }, [checklist]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    if (readiness.status === 'blocked') return;

    setIsPublishing(true);
    setPublishResult(null);

    try {
      // Simulate publishing process
      await new Promise(resolve => setTimeout(resolve, 1500));

      onPublish();

      setPublishResult({
        success: true,
        message: `Widget "${spec.displayName}" v${spec.version} published successfully!`
      });
    } catch (error) {
      setPublishResult({
        success: false,
        message: error instanceof Error ? error.message : 'Publishing failed'
      });
    } finally {
      setIsPublishing(false);
    }
  }, [readiness, spec, onPublish]);

  // Steps
  const steps: { id: PublishStep; label: string; icon: string }[] = [
    { id: 'validation', label: 'Validation', icon: '✓' },
    { id: 'assets', label: 'Assets', icon: '📦' },
    { id: 'metadata', label: 'Metadata', icon: '📋' },
    { id: 'review', label: 'Review', icon: '👁️' },
    { id: 'publish', label: 'Publish', icon: '🚀' }
  ];

  return (
    <div className="publishing-panel">
      {/* Step Navigation */}
      <div className="step-nav">
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`step-btn ${currentStep === step.id ? 'active' : ''}`}
            onClick={() => setCurrentStep(step.id)}
          >
            <span className="step-icon">{step.icon}</span>
            <span className="step-label">{step.label}</span>
            {index < steps.length - 1 && <span className="step-arrow">→</span>}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="panel-content">
        {/* Validation Step */}
        {currentStep === 'validation' && (
          <div className="step-content">
            <h3>Pre-Publish Validation</h3>
            <p className="step-description">
              Review and resolve any issues before publishing your widget.
            </p>

            <div className="checklist">
              {checklist.map(item => (
                <div key={item.id} className={`checklist-item ${item.status}`}>
                  <span className="check-icon">
                    {item.status === 'passed' && '✓'}
                    {item.status === 'failed' && '✗'}
                    {item.status === 'warning' && '⚠'}
                    {item.status === 'pending' && '○'}
                  </span>
                  <span className="check-label">{item.label}</span>
                  {item.message && (
                    <span className="check-message">{item.message}</span>
                  )}
                </div>
              ))}
            </div>

            <div className={`readiness-status ${readiness.status}`}>
              <span className="readiness-icon">
                {readiness.status === 'ready' && '✓'}
                {readiness.status === 'ready-with-warnings' && '⚠'}
                {readiness.status === 'blocked' && '✗'}
              </span>
              <span className="readiness-message">{readiness.message}</span>
            </div>
          </div>
        )}

        {/* Assets Step */}
        {currentStep === 'assets' && (
          <div className="step-content">
            <h3>Asset Verification</h3>
            <p className="step-description">
              Ensure all referenced assets are included in the bundle.
            </p>

            <div className="asset-check">
              <div className="asset-item">
                <span className="asset-icon">🖼️</span>
                <span className="asset-name">Default Asset</span>
                <span className={`asset-status ${spec.visual.defaultAsset ? 'found' : 'missing'}`}>
                  {spec.visual.defaultAsset || 'Not configured'}
                </span>
              </div>

              {spec.visual.skins.map((skin, i) => (
                <div key={i} className="asset-item">
                  <span className="asset-icon">🎨</span>
                  <span className="asset-name">Skin: {skin.name}</span>
                  <span className={`asset-status ${skin.previewAsset ? 'found' : 'optional'}`}>
                    {skin.previewAsset || 'No preview'}
                  </span>
                </div>
              ))}
            </div>

            <div className="bundle-size">
              <h4>Estimated Bundle Size</h4>
              <div className="size-bar">
                <div
                  className="size-fill"
                  style={{ width: `${Math.min((pkg?.files.reduce((a, f) => a + f.content.length, 0) || 0) / 20000 * 100, 100)}%` }}
                />
              </div>
              <span className="size-label">
                {((pkg?.files.reduce((a, f) => a + f.content.length, 0) || 0) / 1024).toFixed(1)} KB / 2 MB limit
              </span>
            </div>
          </div>
        )}

        {/* Metadata Step */}
        {currentStep === 'metadata' && (
          <div className="step-content">
            <h3>Publishing Metadata</h3>
            <p className="step-description">
              Review the metadata that will be published with your widget.
            </p>

            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="meta-label">ID</span>
                <span className="meta-value code">{spec.id}</span>
              </div>
              <div className="metadata-item">
                <span className="meta-label">Version</span>
                <span className="meta-value">{spec.version}</span>
              </div>
              <div className="metadata-item">
                <span className="meta-label">Display Name</span>
                <span className="meta-value">{spec.displayName}</span>
              </div>
              <div className="metadata-item">
                <span className="meta-label">Category</span>
                <span className="meta-value">{spec.category}</span>
              </div>
              <div className="metadata-item">
                <span className="meta-label">Author</span>
                <span className="meta-value">{spec.author || 'Not specified'}</span>
              </div>
              <div className="metadata-item">
                <span className="meta-label">License</span>
                <span className="meta-value">{spec.permissions.license || 'MIT'}</span>
              </div>
              <div className="metadata-item full-width">
                <span className="meta-label">Description</span>
                <span className="meta-value">{spec.description}</span>
              </div>
              <div className="metadata-item full-width">
                <span className="meta-label">Tags</span>
                <span className="meta-value">
                  {(spec.tags || []).join(', ') || 'No tags'}
                </span>
              </div>
            </div>

            {spec.permissions.allowMarketplace && (
              <div className="marketplace-meta">
                <h4>Marketplace Settings</h4>
                <div className="revenue-display">
                  <div className="revenue-item">
                    <span className="revenue-label">Creator Share</span>
                    <span className="revenue-value">
                      {((spec.permissions.revenueShare?.creator || 0.8) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="revenue-item">
                    <span className="revenue-label">Platform Fee</span>
                    <span className="revenue-value">
                      {((spec.permissions.revenueShare?.platform || 0.2) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div className="step-content">
            <h3>Final Review</h3>
            <p className="step-description">
              Review your widget package before publishing.
            </p>

            <div className="review-summary">
              <div className="summary-card">
                <h4>{spec.displayName}</h4>
                <p>{spec.description}</p>
                <div className="summary-meta">
                  <span>v{spec.version}</span>
                  <span>•</span>
                  <span>{spec.category}</span>
                  <span>•</span>
                  <span>{pkg?.files.length || 0} files</span>
                </div>
              </div>

              <div className="feature-summary">
                <h5>Features</h5>
                <ul>
                  <li>{Object.keys(spec.state).length} state fields</li>
                  <li>{Object.keys(spec.actions).length} actions</li>
                  <li>{spec.api.inputs.length} inputs, {spec.api.outputs.length} outputs</li>
                  <li>{spec.visual.skins.length} skins</li>
                  {spec.permissions.allowPipelineUse && <li>Pipeline compatible</li>}
                  {spec.permissions.allowMarketplace && <li>Marketplace listing enabled</li>}
                </ul>
              </div>
            </div>

            <div className="changelog-section">
              <h4>Changelog Entry</h4>
              <textarea
                className="changelog-input"
                placeholder="Describe what's new in this version..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Publish Step */}
        {currentStep === 'publish' && (
          <div className="step-content">
            <h3>Publish Widget</h3>

            {publishResult ? (
              <div className={`publish-result ${publishResult.success ? 'success' : 'error'}`}>
                <span className="result-icon">
                  {publishResult.success ? '🎉' : '❌'}
                </span>
                <h4>{publishResult.success ? 'Published!' : 'Publishing Failed'}</h4>
                <p>{publishResult.message}</p>
                {publishResult.success && (
                  <div className="post-publish-actions">
                    <button className="action-btn">
                      View in Library
                    </button>
                    <button className="action-btn secondary">
                      Create Another Widget
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="step-description">
                  You're about to publish <strong>{spec.displayName}</strong> v{spec.version} to the StickerNest library.
                </p>

                <div className="publish-targets">
                  <label className="target-option">
                    <input type="checkbox" checked readOnly />
                    <span className="target-icon">📚</span>
                    <span className="target-label">Widget Library</span>
                    <span className="target-status">Ready</span>
                  </label>

                  {spec.permissions.allowMarketplace && (
                    <label className="target-option">
                      <input type="checkbox" />
                      <span className="target-icon">🏪</span>
                      <span className="target-label">Marketplace</span>
                      <span className="target-status">Optional</span>
                    </label>
                  )}
                </div>

                <button
                  className={`publish-btn ${readiness.status === 'blocked' ? 'disabled' : ''}`}
                  onClick={handlePublish}
                  disabled={readiness.status === 'blocked' || isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <span className="spinner">⏳</span>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      Publish Widget
                    </>
                  )}
                </button>

                {readiness.status === 'blocked' && (
                  <p className="publish-warning">
                    Please resolve validation errors before publishing.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .publishing-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }

        .step-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .step-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .step-btn:hover {
          background: var(--bg-hover, #252525);
          color: var(--text-primary, #fff);
        }

        .step-btn.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .step-icon {
          font-size: 16px;
        }

        .step-arrow {
          margin-left: 8px;
          color: var(--text-muted, #666);
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .step-content h3 {
          margin: 0 0 8px;
          font-size: 20px;
        }

        .step-description {
          margin: 0 0 24px;
          color: var(--text-secondary, #888);
          font-size: 14px;
        }

        /* Checklist */
        .checklist {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          border-left: 3px solid transparent;
        }

        .checklist-item.passed { border-left-color: #2ecc71; }
        .checklist-item.failed { border-left-color: #e74c3c; }
        .checklist-item.warning { border-left-color: #f39c12; }

        .check-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 14px;
        }

        .checklist-item.passed .check-icon { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .checklist-item.failed .check-icon { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .checklist-item.warning .check-icon { background: rgba(243, 156, 18, 0.2); color: #f39c12; }

        .check-label {
          flex: 1;
          font-size: 14px;
        }

        .check-message {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .readiness-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          font-weight: 600;
        }

        .readiness-status.ready {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }

        .readiness-status.ready-with-warnings {
          background: rgba(243, 156, 18, 0.1);
          color: #f39c12;
        }

        .readiness-status.blocked {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        .readiness-icon {
          font-size: 20px;
        }

        /* Assets */
        .asset-check {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .asset-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .asset-icon {
          font-size: 20px;
        }

        .asset-name {
          flex: 1;
          font-size: 14px;
        }

        .asset-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .asset-status.found { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
        .asset-status.missing { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
        .asset-status.optional { background: rgba(149, 165, 166, 0.2); color: #95a5a6; }

        .bundle-size h4 {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .size-bar {
          height: 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 4px;
          overflow: hidden;
        }

        .size-fill {
          height: 100%;
          background: var(--accent-color, #667eea);
          transition: width 0.3s;
        }

        .size-label {
          display: block;
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        /* Metadata */
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metadata-item.full-width {
          grid-column: span 2;
        }

        .meta-label {
          font-size: 11px;
          color: var(--text-muted, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 14px;
          color: var(--text-primary, #fff);
        }

        .meta-value.code {
          font-family: monospace;
          background: var(--bg-tertiary, #252525);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .marketplace-meta {
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .marketplace-meta h4 {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .revenue-display {
          display: flex;
          gap: 24px;
        }

        .revenue-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .revenue-label {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .revenue-value {
          font-size: 20px;
          font-weight: 600;
          color: var(--accent-color, #667eea);
        }

        /* Review */
        .review-summary {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .summary-card {
          padding: 20px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .summary-card h4 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .summary-card p {
          margin: 0 0 16px;
          color: var(--text-secondary, #888);
          font-size: 14px;
        }

        .summary-meta {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .feature-summary {
          padding: 20px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .feature-summary h5 {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .feature-summary ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: var(--text-secondary, #888);
        }

        .feature-summary li {
          margin-bottom: 4px;
        }

        .changelog-section h4 {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .changelog-input {
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          color: var(--text-primary, #fff);
          font-size: 14px;
          resize: vertical;
        }

        /* Publish */
        .publish-targets {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .target-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          cursor: pointer;
        }

        .target-option input {
          width: 18px;
          height: 18px;
        }

        .target-icon {
          font-size: 20px;
        }

        .target-label {
          flex: 1;
          font-size: 14px;
        }

        .target-status {
          font-size: 12px;
          color: var(--text-muted, #666);
        }

        .publish-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 24px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .publish-btn:hover:not(:disabled) {
          background: var(--accent-hover, #5a6fd6);
        }

        .publish-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .publish-btn.disabled {
          background: var(--bg-tertiary, #252525);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .publish-warning {
          margin-top: 12px;
          text-align: center;
          color: var(--error-color, #e74c3c);
          font-size: 14px;
        }

        .publish-result {
          text-align: center;
          padding: 48px;
        }

        .publish-result.success { color: #2ecc71; }
        .publish-result.error { color: #e74c3c; }

        .result-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }

        .publish-result h4 {
          margin: 0 0 8px;
          font-size: 24px;
        }

        .publish-result p {
          margin: 0 0 24px;
          color: var(--text-secondary, #888);
        }

        .post-publish-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .action-btn {
          padding: 10px 20px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }

        .action-btn.secondary {
          background: var(--bg-tertiary, #252525);
          color: var(--text-primary, #fff);
        }
      `}</style>
    </div>
  );
}

export default PublishingPanel;
