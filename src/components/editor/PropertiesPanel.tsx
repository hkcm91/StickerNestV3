/**
 * StickerNest v2 - Properties Panel
 *
 * A panel for editing widget-specific properties and settings.
 * Dynamically renders input controls based on widget manifest inputs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { WidgetManifest, WidgetInputSchema } from '../../types/manifest';
import type { WidgetInstance } from '../../types/domain';
import { useEditorStore } from '../../editor/EditorContext';

// ============================================================================
// TYPES
// ============================================================================

interface PropertiesPanelProps {
  widget: WidgetInstance | null;
  manifest: WidgetManifest | null;
  onPropertyChange: (property: string, value: unknown) => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onClose?: () => void;
}

interface PropertyInputProps {
  name: string;
  schema: WidgetInputSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

// ============================================================================
// PROPERTY INPUT COMPONENT
// ============================================================================

const PropertyInput: React.FC<PropertyInputProps> = ({ name, schema, value, onChange }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      let newValue: unknown = e.target.value;

      switch (schema.type) {
        case 'number':
          newValue = parseFloat(e.target.value) || 0;
          break;
        case 'boolean':
          newValue = (e.target as HTMLInputElement).checked;
          break;
        case 'array':
        case 'object':
          try {
            newValue = JSON.parse(e.target.value);
          } catch {
            newValue = e.target.value;
          }
          break;
      }

      onChange(newValue);
    },
    [schema.type, onChange]
  );

  const inputId = `prop-${name}`;
  const currentValue = value ?? schema.default ?? '';

  // Render different input types based on schema
  switch (schema.type) {
    case 'boolean':
      return (
        <label className="property-row checkbox">
          <input
            type="checkbox"
            id={inputId}
            checked={Boolean(currentValue)}
            onChange={handleChange}
          />
          <span className="property-label">{formatLabel(name)}</span>
        </label>
      );

    case 'number':
      return (
        <div className="property-row">
          <label className="property-label" htmlFor={inputId}>
            {formatLabel(name)}
          </label>
          <input
            type="number"
            id={inputId}
            className="property-input"
            value={currentValue as number}
            onChange={handleChange}
          />
        </div>
      );

    case 'string':
      // Check for color input
      if (name.toLowerCase().includes('color')) {
        return (
          <div className="property-row">
            <label className="property-label" htmlFor={inputId}>
              {formatLabel(name)}
            </label>
            <div className="color-input-wrapper">
              <input
                type="color"
                id={inputId}
                className="property-color"
                value={String(currentValue).startsWith('#') ? currentValue as string : '#ffffff'}
                onChange={handleChange}
              />
              <input
                type="text"
                className="property-input color-text"
                value={currentValue as string}
                onChange={handleChange}
                placeholder="#ffffff"
              />
            </div>
          </div>
        );
      }

      // Check for select options in description
      if (schema.description?.includes(':')) {
        const options = schema.description.split(':')[1]?.trim().split(',').map(s => s.trim());
        if (options && options.length > 0) {
          return (
            <div className="property-row">
              <label className="property-label" htmlFor={inputId}>
                {formatLabel(name)}
              </label>
              <select
                id={inputId}
                className="property-select"
                value={currentValue as string}
                onChange={handleChange}
              >
                {options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          );
        }
      }

      // Multi-line for long strings
      if (String(currentValue).length > 50) {
        return (
          <div className="property-row vertical">
            <label className="property-label" htmlFor={inputId}>
              {formatLabel(name)}
            </label>
            <textarea
              id={inputId}
              className="property-textarea"
              value={currentValue as string}
              onChange={handleChange}
              rows={3}
            />
          </div>
        );
      }

      return (
        <div className="property-row">
          <label className="property-label" htmlFor={inputId}>
            {formatLabel(name)}
          </label>
          <input
            type="text"
            id={inputId}
            className="property-input"
            value={currentValue as string}
            onChange={handleChange}
          />
        </div>
      );

    case 'array':
    case 'object':
      return (
        <div className="property-row vertical">
          <label className="property-label" htmlFor={inputId}>
            {formatLabel(name)}
          </label>
          <textarea
            id={inputId}
            className="property-textarea"
            value={typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue)}
            onChange={handleChange}
            rows={4}
          />
        </div>
      );

    default:
      return (
        <div className="property-row">
          <label className="property-label" htmlFor={inputId}>
            {formatLabel(name)}
          </label>
          <input
            type="text"
            id={inputId}
            className="property-input"
            value={String(currentValue)}
            onChange={handleChange}
          />
        </div>
      );
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  widget,
  manifest,
  onPropertyChange,
  onPositionChange,
  onSizeChange,
  onClose,
}) => {
  const { propertiesPanelOpen, togglePropertiesPanel } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'properties' | 'position' | 'style'>('properties');

  // Local state for position/size inputs
  const [localX, setLocalX] = useState(widget?.position.x ?? 0);
  const [localY, setLocalY] = useState(widget?.position.y ?? 0);
  const [localWidth, setLocalWidth] = useState(widget?.width ?? 200);
  const [localHeight, setLocalHeight] = useState(widget?.height ?? 200);

  // Sync local state with widget
  useEffect(() => {
    if (widget) {
      setLocalX(widget.position.x);
      setLocalY(widget.position.y);
      setLocalWidth(widget.width);
      setLocalHeight(widget.height);
    }
  }, [widget]);

  const handlePositionBlur = useCallback(() => {
    onPositionChange(localX, localY);
  }, [localX, localY, onPositionChange]);

  const handleSizeBlur = useCallback(() => {
    onSizeChange(localWidth, localHeight);
  }, [localWidth, localHeight, onSizeChange]);

  if (!propertiesPanelOpen || !widget) {
    return null;
  }

  return (
    <div className="properties-panel">
      <style>{`
        .properties-panel {
          position: absolute;
          right: 16px;
          top: 60px;
          width: 280px;
          max-height: calc(100vh - 100px);
          background: rgba(30, 30, 46, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: white;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .panel-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .panel-title {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
        }

        .close-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .panel-tabs {
          display: flex;
          padding: 8px;
          gap: 4px;
          background: rgba(0, 0, 0, 0.1);
        }

        .tab-btn {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 6px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .tab-btn.active {
          background: rgba(79, 209, 197, 0.2);
          color: #4fd1c5;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .section {
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
        }

        .property-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .property-row.vertical {
          flex-direction: column;
          align-items: stretch;
        }

        .property-row.checkbox {
          cursor: pointer;
        }

        .property-row.checkbox input {
          margin-right: 8px;
        }

        .property-label {
          flex: 0 0 80px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .property-row.vertical .property-label {
          flex: none;
          margin-bottom: 4px;
        }

        .property-input,
        .property-select,
        .property-textarea {
          flex: 1;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .property-input:focus,
        .property-select:focus,
        .property-textarea:focus {
          border-color: #4fd1c5;
        }

        .property-textarea {
          resize: vertical;
          min-height: 60px;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .property-select {
          cursor: pointer;
        }

        .property-select option {
          background: #1e1e2e;
        }

        .color-input-wrapper {
          flex: 1;
          display: flex;
          gap: 8px;
        }

        .property-color {
          width: 36px;
          height: 36px;
          padding: 2px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          cursor: pointer;
          background: transparent;
        }

        .property-color::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .property-color::-webkit-color-swatch {
          border-radius: 4px;
          border: none;
        }

        .color-text {
          flex: 1;
        }

        .input-group {
          display: flex;
          gap: 8px;
        }

        .input-group .input-field {
          flex: 1;
        }

        .input-field label {
          display: block;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }

        .input-field input {
          width: 100%;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: white;
          font-size: 12px;
          outline: none;
        }

        .input-field input:focus {
          border-color: #4fd1c5;
        }

        .widget-info {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .widget-name {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }

        .widget-id {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
        }

        .no-properties {
          color: rgba(255, 255, 255, 0.4);
          text-align: center;
          padding: 24px;
        }
      `}</style>

      <div className="panel-header">
        <span className="panel-title">Properties</span>
        <button className="close-btn" onClick={onClose || togglePropertiesPanel}>
          ×
        </button>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          Properties
        </button>
        <button
          className={`tab-btn ${activeTab === 'position' ? 'active' : ''}`}
          onClick={() => setActiveTab('position')}
        >
          Position
        </button>
        <button
          className={`tab-btn ${activeTab === 'style' ? 'active' : ''}`}
          onClick={() => setActiveTab('style')}
        >
          Style
        </button>
      </div>

      <div className="panel-content">
        {/* Widget Info */}
        <div className="widget-info">
          <div className="widget-name">{manifest?.name || 'Widget'}</div>
          <div className="widget-id">{widget.id}</div>
        </div>

        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div className="section">
            {manifest?.inputs && Object.keys(manifest.inputs).length > 0 ? (
              Object.entries(manifest.inputs).map(([name, schema]) => (
                <PropertyInput
                  key={name}
                  name={name}
                  schema={schema}
                  value={widget.state?.[name]}
                  onChange={(value) => onPropertyChange(name, value)}
                />
              ))
            ) : (
              <div className="no-properties">No configurable properties</div>
            )}
          </div>
        )}

        {/* Position Tab */}
        {activeTab === 'position' && (
          <>
            <div className="section">
              <div className="section-title">Position</div>
              <div className="input-group">
                <div className="input-field">
                  <label>X</label>
                  <input
                    type="number"
                    value={localX}
                    onChange={(e) => setLocalX(parseFloat(e.target.value) || 0)}
                    onBlur={handlePositionBlur}
                  />
                </div>
                <div className="input-field">
                  <label>Y</label>
                  <input
                    type="number"
                    value={localY}
                    onChange={(e) => setLocalY(parseFloat(e.target.value) || 0)}
                    onBlur={handlePositionBlur}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Size</div>
              <div className="input-group">
                <div className="input-field">
                  <label>Width</label>
                  <input
                    type="number"
                    value={localWidth}
                    onChange={(e) => setLocalWidth(parseFloat(e.target.value) || 100)}
                    onBlur={handleSizeBlur}
                  />
                </div>
                <div className="input-field">
                  <label>Height</label>
                  <input
                    type="number"
                    value={localHeight}
                    onChange={(e) => setLocalHeight(parseFloat(e.target.value) || 100)}
                    onBlur={handleSizeBlur}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Transform</div>
              <div className="input-group">
                <div className="input-field">
                  <label>Rotation</label>
                  <input
                    type="number"
                    value={widget.rotation || 0}
                    onChange={(e) => onPropertyChange('rotation', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="input-field">
                  <label>Z-Index</label>
                  <input
                    type="number"
                    value={widget.zIndex || 0}
                    onChange={(e) => onPropertyChange('zIndex', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Style Tab */}
        {activeTab === 'style' && (
          <div className="section">
            <div className="section-title">Appearance</div>
            <PropertyInput
              name="opacity"
              schema={{ type: 'number', description: 'Opacity (0-1)', default: 1 }}
              value={widget.state?.opacity ?? 1}
              onChange={(value) => onPropertyChange('opacity', value)}
            />
            <PropertyInput
              name="borderRadius"
              schema={{ type: 'number', description: 'Border radius', default: 0 }}
              value={widget.state?.borderRadius ?? 0}
              onChange={(value) => onPropertyChange('borderRadius', value)}
            />
            <PropertyInput
              name="shadow"
              schema={{ type: 'boolean', description: 'Show shadow', default: false }}
              value={widget.state?.shadow ?? false}
              onChange={(value) => onPropertyChange('shadow', value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
