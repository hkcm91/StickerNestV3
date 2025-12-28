/**
 * Widget Generator 2.0 - Tab 2: Visual Assets
 *
 * Manages visual assets, skins, and theming:
 * - PNG / Lottie preview
 * - Upload functionality
 * - Skin builder
 * - Asset folder inspector
 */

import { useState, useCallback, useRef } from 'react';
import type { SpecJSON, SkinSpec, CSSVariableSpec } from '../../../types/specjson';

interface VisualAssetsProps {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}

export function VisualAssets({ spec, onChange }: VisualAssetsProps) {
  const [activePanel, setActivePanel] = useState<'preview' | 'skins' | 'variables' | 'assets'>('preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle skin management
  const addSkin = useCallback(() => {
    const newSkin: SkinSpec = {
      id: `skin-${Date.now()}`,
      name: 'New Skin',
      cssVariables: {}
    };
    onChange({
      ...spec,
      visual: {
        ...spec.visual,
        skins: [...spec.visual.skins, newSkin]
      }
    });
  }, [spec, onChange]);

  const updateSkin = useCallback((index: number, updates: Partial<SkinSpec>) => {
    const newSkins = [...spec.visual.skins];
    newSkins[index] = { ...newSkins[index], ...updates };
    onChange({
      ...spec,
      visual: { ...spec.visual, skins: newSkins }
    });
  }, [spec, onChange]);

  const removeSkin = useCallback((index: number) => {
    const newSkins = spec.visual.skins.filter((_, i) => i !== index);
    onChange({
      ...spec,
      visual: { ...spec.visual, skins: newSkins }
    });
  }, [spec, onChange]);

  // Handle CSS variable management
  const addCSSVariable = useCallback(() => {
    const newVar: CSSVariableSpec = {
      name: '--new-variable',
      defaultValue: '#ffffff',
      type: 'color'
    };
    onChange({
      ...spec,
      visual: {
        ...spec.visual,
        cssVariables: [...(spec.visual.cssVariables || []), newVar]
      }
    });
  }, [spec, onChange]);

  const updateCSSVariable = useCallback((index: number, updates: Partial<CSSVariableSpec>) => {
    const newVars = [...(spec.visual.cssVariables || [])];
    newVars[index] = { ...newVars[index], ...updates };
    onChange({
      ...spec,
      visual: { ...spec.visual, cssVariables: newVars }
    });
  }, [spec, onChange]);

  const removeCSSVariable = useCallback((index: number) => {
    const newVars = (spec.visual.cssVariables || []).filter((_, i) => i !== index);
    onChange({
      ...spec,
      visual: { ...spec.visual, cssVariables: newVars }
    });
  }, [spec, onChange]);

  return (
    <div className="visual-assets">
      {/* Panel Navigation */}
      <div className="panel-nav">
        <button
          className={`panel-btn ${activePanel === 'preview' ? 'active' : ''}`}
          onClick={() => setActivePanel('preview')}
        >
          <span className="btn-icon">👁️</span>
          Preview
        </button>
        <button
          className={`panel-btn ${activePanel === 'skins' ? 'active' : ''}`}
          onClick={() => setActivePanel('skins')}
        >
          <span className="btn-icon">🎨</span>
          Skins ({spec.visual.skins.length})
        </button>
        <button
          className={`panel-btn ${activePanel === 'variables' ? 'active' : ''}`}
          onClick={() => setActivePanel('variables')}
        >
          <span className="btn-icon">🎛️</span>
          CSS Variables ({spec.visual.cssVariables?.length || 0})
        </button>
        <button
          className={`panel-btn ${activePanel === 'assets' ? 'active' : ''}`}
          onClick={() => setActivePanel('assets')}
        >
          <span className="btn-icon">📁</span>
          Assets
        </button>
      </div>

      {/* Panel Content */}
      <div className="panel-content">
        {/* Preview Panel */}
        {activePanel === 'preview' && (
          <div className="preview-panel">
            <div className="preview-frame">
              <div className="preview-header">
                <span className="preview-title">{spec.displayName}</span>
                <span className="preview-type">{spec.visual.type.toUpperCase()}</span>
              </div>
              <div className="preview-container">
                {spec.visual.type === 'html' ? (
                  <div className="preview-html">
                    <div className="widget-preview-box">
                      <h3>{spec.displayName}</h3>
                      <p>{spec.description}</p>
                    </div>
                  </div>
                ) : spec.visual.defaultAsset ? (
                  <img
                    src={spec.visual.defaultAsset}
                    alt={spec.displayName}
                    className="preview-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <span className="placeholder-icon">🖼️</span>
                    <span>No asset configured</span>
                  </div>
                )}
              </div>
            </div>

            <div className="preview-info">
              <h4>Visual Configuration</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Type:</span>
                  <span className="info-value">{spec.visual.type}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Default Asset:</span>
                  <span className="info-value">{spec.visual.defaultAsset || 'None'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Skins:</span>
                  <span className="info-value">{spec.visual.skins.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">CSS Variables:</span>
                  <span className="info-value">{spec.visual.cssVariables?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skins Panel */}
        {activePanel === 'skins' && (
          <div className="skins-panel">
            <div className="panel-header">
              <h3>Skin Builder</h3>
              <button className="add-btn" onClick={addSkin}>
                <span>+</span> Add Skin
              </button>
            </div>

            {spec.visual.skins.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎨</span>
                <p>No skins configured</p>
                <p className="empty-hint">Add skins to allow users to customize the widget appearance</p>
              </div>
            ) : (
              <div className="skins-list">
                {spec.visual.skins.map((skin, index) => (
                  <div key={skin.id} className="skin-card">
                    <div className="skin-preview">
                      {skin.previewAsset ? (
                        <img src={skin.previewAsset} alt={skin.name} />
                      ) : (
                        <div className="skin-preview-placeholder">
                          <span>🎨</span>
                        </div>
                      )}
                    </div>
                    <div className="skin-details">
                      <input
                        type="text"
                        value={skin.id}
                        onChange={(e) => updateSkin(index, { id: e.target.value })}
                        className="skin-id"
                        placeholder="skin-id"
                      />
                      <input
                        type="text"
                        value={skin.name}
                        onChange={(e) => updateSkin(index, { name: e.target.value })}
                        className="skin-name"
                        placeholder="Skin Name"
                      />
                      <input
                        type="text"
                        value={skin.previewAsset || ''}
                        onChange={(e) => updateSkin(index, { previewAsset: e.target.value })}
                        className="skin-preview-path"
                        placeholder="Preview asset path"
                      />
                    </div>
                    <button
                      className="skin-remove"
                      onClick={() => removeSkin(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CSS Variables Panel */}
        {activePanel === 'variables' && (
          <div className="variables-panel">
            <div className="panel-header">
              <h3>CSS Variables</h3>
              <button className="add-btn" onClick={addCSSVariable}>
                <span>+</span> Add Variable
              </button>
            </div>

            {(spec.visual.cssVariables?.length || 0) === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🎛️</span>
                <p>No CSS variables defined</p>
                <p className="empty-hint">Add CSS variables to enable theming support</p>
              </div>
            ) : (
              <div className="variables-list">
                {(spec.visual.cssVariables || []).map((variable, index) => (
                  <div key={index} className="variable-row">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateCSSVariable(index, { name: e.target.value })}
                      className="var-name"
                      placeholder="--variable-name"
                    />
                    <input
                      type="text"
                      value={variable.defaultValue}
                      onChange={(e) => updateCSSVariable(index, { defaultValue: e.target.value })}
                      className="var-value"
                      placeholder="default value"
                    />
                    {variable.type === 'color' && (
                      <input
                        type="color"
                        value={variable.defaultValue}
                        onChange={(e) => updateCSSVariable(index, { defaultValue: e.target.value })}
                        className="var-color-picker"
                      />
                    )}
                    <select
                      value={variable.type || 'string'}
                      onChange={(e) => updateCSSVariable(index, { type: e.target.value as CSSVariableSpec['type'] })}
                      className="var-type"
                    >
                      <option value="color">Color</option>
                      <option value="size">Size</option>
                      <option value="font">Font</option>
                      <option value="number">Number</option>
                      <option value="string">String</option>
                    </select>
                    <button
                      className="var-remove"
                      onClick={() => removeCSSVariable(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assets Panel */}
        {activePanel === 'assets' && (
          <div className="assets-panel">
            <div className="panel-header">
              <h3>Asset Manager</h3>
              <button className="add-btn" onClick={() => fileInputRef.current?.click()}>
                <span>📤</span> Upload Asset
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.json,.lottie"
                style={{ display: 'none' }}
                onChange={(e) => {
                  // Handle file upload
                  const file = e.target.files?.[0];
                  if (file) {
                    console.log('Upload file:', file.name);
                    // TODO: Implement actual upload
                  }
                }}
              />
            </div>

            <div className="asset-folder">
              <div className="folder-header">
                <span className="folder-icon">📁</span>
                <span className="folder-name">assets/</span>
              </div>
              <div className="folder-contents">
                {spec.visual.defaultAsset ? (
                  <div className="asset-item">
                    <span className="asset-icon">🖼️</span>
                    <span className="asset-name">{spec.visual.defaultAsset}</span>
                    <span className="asset-badge">default</span>
                  </div>
                ) : (
                  <div className="empty-folder">
                    <span>No assets uploaded</span>
                  </div>
                )}
                {spec.visual.skins
                  .filter(s => s.previewAsset)
                  .map((skin, i) => (
                    <div key={i} className="asset-item">
                      <span className="asset-icon">🎨</span>
                      <span className="asset-name">{skin.previewAsset}</span>
                      <span className="asset-badge">skin</span>
                    </div>
                  ))
                }
              </div>
            </div>

            <div className="asset-info">
              <h4>Asset Guidelines</h4>
              <ul>
                <li>PNG, SVG, or Lottie JSON files supported</li>
                <li>Recommended size: 512x512 for icons</li>
                <li>Use relative paths from the widget root</li>
                <li>Keep total bundle size under 2MB</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .visual-assets {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }

        .panel-nav {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .panel-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          transition: all 0.2s;
        }

        .panel-btn:hover {
          background: var(--bg-hover, #252525);
          color: var(--text-primary, #fff);
        }

        .panel-btn.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .btn-icon {
          font-size: 16px;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 13px;
        }

        .add-btn:hover {
          background: var(--accent-hover, #5a6fd6);
        }

        /* Preview Panel */
        .preview-panel {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
        }

        .preview-frame {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-quaternary, #1a1a1a);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .preview-title {
          font-weight: 500;
        }

        .preview-type {
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .preview-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          padding: 24px;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-muted, #666);
        }

        .placeholder-icon {
          font-size: 48px;
        }

        .widget-preview-box {
          padding: 24px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 12px;
          text-align: center;
        }

        .preview-info {
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .preview-info h4 {
          margin: 0 0 12px;
          font-size: 14px;
        }

        .info-grid {
          display: grid;
          gap: 8px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .info-label {
          color: var(--text-secondary, #888);
        }

        .info-value {
          color: var(--text-primary, #fff);
        }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          text-align: center;
          color: var(--text-secondary, #888);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-hint {
          font-size: 12px;
          color: var(--text-muted, #666);
          margin-top: 4px;
        }

        /* Skins Panel */
        .skins-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .skin-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          position: relative;
        }

        .skin-preview {
          width: 64px;
          height: 64px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .skin-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .skin-preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-quaternary, #1a1a1a);
          font-size: 24px;
        }

        .skin-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skin-details input {
          padding: 6px 10px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-size: 12px;
        }

        .skin-id {
          font-family: monospace;
          font-size: 11px !important;
        }

        .skin-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          padding: 0;
          background: var(--error-color, #e74c3c);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }

        /* Variables Panel */
        .variables-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .variable-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .var-name {
          width: 180px;
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-family: monospace;
          font-size: 12px;
        }

        .var-value {
          flex: 1;
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-size: 12px;
        }

        .var-color-picker {
          width: 36px;
          height: 36px;
          padding: 0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .var-type {
          width: 100px;
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          font-size: 12px;
        }

        .var-remove {
          width: 32px;
          height: 32px;
          padding: 0;
          background: var(--error-color, #e74c3c);
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-size: 16px;
        }

        /* Assets Panel */
        .asset-folder {
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .folder-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--bg-quaternary, #1a1a1a);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .folder-icon {
          font-size: 16px;
        }

        .folder-name {
          font-family: monospace;
          font-size: 13px;
        }

        .folder-contents {
          padding: 8px;
        }

        .asset-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
        }

        .asset-item:hover {
          background: var(--bg-hover, #333);
        }

        .asset-icon {
          font-size: 14px;
        }

        .asset-name {
          flex: 1;
          font-size: 13px;
          font-family: monospace;
        }

        .asset-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: var(--accent-color, #667eea);
          border-radius: 4px;
          color: white;
        }

        .empty-folder {
          padding: 16px;
          text-align: center;
          color: var(--text-muted, #666);
          font-size: 13px;
        }

        .asset-info {
          padding: 16px;
          background: var(--bg-tertiary, #252525);
          border-radius: 8px;
        }

        .asset-info h4 {
          margin: 0 0 12px;
          font-size: 13px;
        }

        .asset-info ul {
          margin: 0;
          padding-left: 20px;
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .asset-info li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

export default VisualAssets;
