/**
 * Widget Generator 2.0 - Workspace Header
 *
 * Displays widget info, validation status, and action buttons.
 */

import type { SpecJSON, SpecValidationResult } from '../../types/specjson';

interface WorkspaceHeaderProps {
  spec: SpecJSON;
  validation: SpecValidationResult;
  onGenerate: () => void;
  onSave: () => void;
  expertMode: boolean;
  onExpertModeChange: (enabled: boolean) => void;
  mode: 'single' | 'batch';
}

export function WorkspaceHeader({
  spec,
  validation,
  onGenerate,
  onSave,
  expertMode,
  onExpertModeChange,
  mode
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="header-left">
        <h1 className="workspace-title">
          <span className="widget-icon">🧩</span>
          <span className="widget-name">{spec.displayName || 'New Widget'}</span>
          <span className="widget-version">v{spec.version}</span>
        </h1>
        <div className="widget-meta">
          <span className="meta-item">
            <span className="meta-label">ID:</span>
            <code className="meta-value">{spec.id}</code>
          </span>
          <span className="meta-divider">•</span>
          <span className="meta-item">
            <span className="meta-label">Category:</span>
            <span className="meta-value category-badge">{spec.category}</span>
          </span>
          {mode === 'batch' && (
            <>
              <span className="meta-divider">•</span>
              <span className="meta-item batch-indicator">
                <span className="batch-icon">📦</span>
                <span>Batch Mode</span>
              </span>
            </>
          )}
        </div>
      </div>

      <div className="header-center">
        <div className={`validation-status ${validation.valid ? 'valid' : 'invalid'}`}>
          <span className="status-icon">
            {validation.valid ? '✓' : '✗'}
          </span>
          <span className="status-text">
            {validation.valid
              ? validation.warnings.length > 0
                ? `Valid (${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''})`
                : 'Valid'
              : `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`
            }
          </span>
        </div>
      </div>

      <div className="header-right">
        <label className="expert-toggle">
          <input
            type="checkbox"
            checked={expertMode}
            onChange={(e) => onExpertModeChange(e.target.checked)}
          />
          <span className="toggle-label">Expert Mode</span>
        </label>

        <button
          className="header-btn secondary"
          onClick={onSave}
        >
          <span className="btn-icon">💾</span>
          Save
        </button>

        <button
          className="header-btn primary"
          onClick={onGenerate}
          disabled={!validation.valid}
        >
          <span className="btn-icon">⚡</span>
          Generate
        </button>
      </div>

      <style>{`
        .workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .workspace-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .widget-icon {
          font-size: 20px;
        }

        .widget-name {
          color: var(--text-primary, #fff);
        }

        .widget-version {
          font-size: 12px;
          color: var(--text-secondary, #888);
          font-weight: 400;
        }

        .widget-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .meta-label {
          color: var(--text-muted, #666);
        }

        .meta-value {
          color: var(--text-secondary, #888);
        }

        .meta-value.category-badge {
          padding: 2px 8px;
          background: var(--bg-tertiary, #252525);
          border-radius: 4px;
          text-transform: capitalize;
        }

        .meta-divider {
          color: var(--text-muted, #666);
        }

        .batch-indicator {
          color: var(--accent-color, #667eea);
        }

        .batch-icon {
          font-size: 14px;
        }

        .header-center {
          display: flex;
          align-items: center;
        }

        .validation-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }

        .validation-status.valid {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
        }

        .validation-status.invalid {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        .status-icon {
          font-size: 14px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .expert-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-secondary, #888);
        }

        .expert-toggle input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .header-btn.secondary {
          background: var(--bg-tertiary, #252525);
          color: var(--text-primary, #fff);
        }

        .header-btn.secondary:hover {
          background: var(--bg-hover, #333);
        }

        .header-btn.primary {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .header-btn.primary:hover:not(:disabled) {
          background: var(--accent-hover, #5a6fd6);
        }

        .header-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 14px;
        }
      `}</style>
    </header>
  );
}
