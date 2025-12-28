/**
 * Widget Generator 2.0 - Tab 1: SpecEditor (Overview)
 *
 * YAML/JSON tree editor for SpecJSON with:
 * - Validation warnings
 * - AI rewrite button
 * - Version history
 */

import { useState, useCallback, useMemo } from 'react';
import type { SpecJSON, SpecValidationResult, EventTrigger } from '../../../types/specjson';

interface SpecEditorProps {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
  validation: SpecValidationResult;
}

type EditorSection =
  | 'basic'
  | 'visual'
  | 'state'
  | 'events'
  | 'actions'
  | 'api'
  | 'permissions'
  | 'raw';

export function SpecEditor({ spec, onChange, validation }: SpecEditorProps) {
  const [activeSection, setActiveSection] = useState<EditorSection>('basic');
  const [rawJson, setRawJson] = useState(JSON.stringify(spec, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Section definitions
  const sections: { id: EditorSection; label: string; icon: string }[] = [
    { id: 'basic', label: 'Basic Info', icon: '📝' },
    { id: 'visual', label: 'Visual', icon: '🎨' },
    { id: 'state', label: 'State', icon: '📦' },
    { id: 'events', label: 'Events', icon: '⚡' },
    { id: 'actions', label: 'Actions', icon: '🎬' },
    { id: 'api', label: 'API / I/O', icon: '🔌' },
    { id: 'permissions', label: 'Permissions', icon: '🔒' },
    { id: 'raw', label: 'Raw JSON', icon: '{ }' }
  ];

  // Update a single field
  const updateField = useCallback(<K extends keyof SpecJSON>(
    key: K,
    value: SpecJSON[K]
  ) => {
    onChange({ ...spec, [key]: value });
  }, [spec, onChange]);

  // Handle raw JSON edit
  const handleRawJsonChange = useCallback((json: string) => {
    setRawJson(json);
    try {
      const parsed = JSON.parse(json);
      setJsonError(null);
      onChange(parsed);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [onChange]);

  // Get errors for a section
  const getSectionErrors = useCallback((section: EditorSection) => {
    const pathMap: Record<EditorSection, string[]> = {
      basic: ['id', 'version', 'displayName', 'category', 'description'],
      visual: ['visual'],
      state: ['state'],
      events: ['events'],
      actions: ['actions'],
      api: ['api'],
      permissions: ['permissions'],
      raw: []
    };

    const paths = pathMap[section];
    return validation.errors.filter(e =>
      paths.some(p => e.path.startsWith(p))
    );
  }, [validation]);

  return (
    <div className="spec-editor">
      {/* Section Navigation */}
      <nav className="editor-nav">
        {sections.map(section => {
          const errors = getSectionErrors(section.id);
          return (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''} ${errors.length > 0 ? 'has-errors' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.label}</span>
              {errors.length > 0 && (
                <span className="error-count">{errors.length}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Editor Content */}
      <div className="editor-content">
        {/* Validation Messages */}
        {validation.errors.length > 0 && (
          <div className="validation-messages errors">
            <h4>Errors</h4>
            {validation.errors.map((error, i) => (
              <div key={i} className="message error">
                <span className="path">{error.path}</span>
                <span className="text">{error.message}</span>
              </div>
            ))}
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="validation-messages warnings">
            <h4>Warnings</h4>
            {validation.warnings.slice(0, 3).map((warning, i) => (
              <div key={i} className="message warning">
                <span className="path">{warning.path}</span>
                <span className="text">{warning.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Section: Basic Info */}
        {activeSection === 'basic' && (
          <BasicInfoSection spec={spec} onChange={updateField} />
        )}

        {/* Section: Visual */}
        {activeSection === 'visual' && (
          <VisualSection spec={spec} onChange={onChange} />
        )}

        {/* Section: State */}
        {activeSection === 'state' && (
          <StateSection spec={spec} onChange={onChange} />
        )}

        {/* Section: Events */}
        {activeSection === 'events' && (
          <EventsSection spec={spec} onChange={onChange} />
        )}

        {/* Section: Actions */}
        {activeSection === 'actions' && (
          <ActionsSection spec={spec} onChange={onChange} />
        )}

        {/* Section: API */}
        {activeSection === 'api' && (
          <APISection spec={spec} onChange={onChange} />
        )}

        {/* Section: Permissions */}
        {activeSection === 'permissions' && (
          <PermissionsSection spec={spec} onChange={onChange} />
        )}

        {/* Section: Raw JSON */}
        {activeSection === 'raw' && (
          <div className="raw-json-editor">
            <div className="editor-toolbar">
              <button
                className="btn-format"
                onClick={() => setRawJson(JSON.stringify(spec, null, 2))}
              >
                Format
              </button>
              {jsonError && (
                <span className="json-error">{jsonError}</span>
              )}
            </div>
            <textarea
              className="json-textarea"
              value={rawJson}
              onChange={(e) => handleRawJsonChange(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      <style>{`
        .spec-editor {
          display: flex;
          height: 100%;
          gap: 16px;
        }

        .editor-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
          padding: 8px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background: var(--bg-hover, #252525);
          color: var(--text-primary, #fff);
        }

        .nav-item.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .nav-item.has-errors {
          color: var(--error-color, #e74c3c);
        }

        .nav-item.has-errors.active {
          background: var(--error-color, #e74c3c);
          color: white;
        }

        .nav-icon {
          font-size: 16px;
        }

        .nav-label {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
        }

        .error-count {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--error-color, #e74c3c);
          color: white;
          border-radius: 10px;
        }

        .editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .validation-messages {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 6px;
        }

        .validation-messages.errors {
          background: rgba(231, 76, 60, 0.1);
          border: 1px solid rgba(231, 76, 60, 0.3);
        }

        .validation-messages.warnings {
          background: rgba(243, 156, 18, 0.1);
          border: 1px solid rgba(243, 156, 18, 0.3);
        }

        .validation-messages h4 {
          margin: 0 0 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .message {
          display: flex;
          gap: 8px;
          font-size: 12px;
          padding: 4px 0;
        }

        .message .path {
          font-family: monospace;
          color: var(--text-muted, #666);
        }

        .message.error .text {
          color: var(--error-color, #e74c3c);
        }

        .message.warning .text {
          color: var(--warning-color, #f39c12);
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h3 {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #888);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 8px 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--accent-color, #667eea);
        }

        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .raw-json-editor {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .btn-format {
          padding: 6px 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-primary, #fff);
          cursor: pointer;
          font-size: 12px;
        }

        .json-error {
          color: var(--error-color, #e74c3c);
          font-size: 12px;
        }

        .json-textarea {
          flex: 1;
          padding: 12px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.5;
          resize: none;
        }

        .tags-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          background: var(--bg-tertiary, #252525);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          min-height: 42px;
        }

        .tag {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--accent-color, #667eea);
          border-radius: 4px;
          font-size: 12px;
          color: white;
        }

        .tag-remove {
          cursor: pointer;
          opacity: 0.7;
        }

        .tag-remove:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function BasicInfoSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: <K extends keyof SpecJSON>(key: K, value: SpecJSON[K]) => void;
}) {
  const categories = [
    'productivity', 'creativity', 'social', 'games', 'media', 'data',
    'utility', 'education', 'business', 'lifestyle', 'developer', 'ai',
    'integration', 'custom'
  ];

  const [tagInput, setTagInput] = useState('');

  const addTag = () => {
    if (tagInput.trim() && !spec.tags?.includes(tagInput.trim())) {
      onChange('tags', [...(spec.tags || []), tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChange('tags', (spec.tags || []).filter(t => t !== tag));
  };

  return (
    <div className="form-section">
      <h3>Basic Information</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Widget ID</label>
          <input
            type="text"
            value={spec.id}
            onChange={(e) => onChange('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="my-widget"
          />
        </div>

        <div className="form-group">
          <label>Version</label>
          <input
            type="text"
            value={spec.version}
            onChange={(e) => onChange('version', e.target.value)}
            placeholder="1.0.0"
          />
        </div>

        <div className="form-group">
          <label>Display Name</label>
          <input
            type="text"
            value={spec.displayName}
            onChange={(e) => onChange('displayName', e.target.value)}
            placeholder="My Widget"
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            value={spec.category}
            onChange={(e) => onChange('category', e.target.value as SpecJSON['category'])}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group full-width">
          <label>Description</label>
          <textarea
            value={spec.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="A short description of what this widget does..."
          />
        </div>

        <div className="form-group">
          <label>Author</label>
          <input
            type="text"
            value={spec.author || ''}
            onChange={(e) => onChange('author', e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tags-input">
            {(spec.tags || []).map(tag => (
              <span key={tag} className="tag">
                {tag}
                <span className="tag-remove" onClick={() => removeTag(tag)}>×</span>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag..."
              style={{ border: 'none', background: 'transparent', flex: 1, minWidth: 80 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const visualTypes = ['html', 'svg', 'png', 'lottie', 'canvas', 'css'];

  return (
    <div className="form-section">
      <h3>Visual Configuration</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>Visual Type</label>
          <select
            value={spec.visual.type}
            onChange={(e) => onChange({
              ...spec,
              visual: { ...spec.visual, type: e.target.value as SpecJSON['visual']['type'] }
            })}
          >
            {visualTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Default Asset</label>
          <input
            type="text"
            value={spec.visual.defaultAsset || ''}
            onChange={(e) => onChange({
              ...spec,
              visual: { ...spec.visual, defaultAsset: e.target.value }
            })}
            placeholder="assets/image.png"
          />
        </div>

        <div className="form-group full-width">
          <label>Skins ({spec.visual.skins.length})</label>
          <div style={{ fontSize: 12, color: '#888' }}>
            Manage skins in the Visual Assets tab
          </div>
        </div>
      </div>
    </div>
  );
}

function StateSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const stateTypes = ['string', 'number', 'boolean', 'object', 'array', 'any'];
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState('string');

  const addStateField = () => {
    if (newKey && !spec.state[newKey]) {
      onChange({
        ...spec,
        state: {
          ...spec.state,
          [newKey]: { type: newType as any, default: getDefault(newType) }
        }
      });
      setNewKey('');
    }
  };

  const removeStateField = (key: string) => {
    const newState = { ...spec.state };
    delete newState[key];
    onChange({ ...spec, state: newState });
  };

  const getDefault = (type: string) => {
    switch (type) {
      case 'number': return 0;
      case 'boolean': return false;
      case 'object': return {};
      case 'array': return [];
      default: return '';
    }
  };

  return (
    <div className="form-section">
      <h3>State Schema</h3>

      {Object.entries(spec.state).map(([key, field]) => (
        <div key={key} className="form-grid" style={{ marginBottom: 12 }}>
          <div className="form-group">
            <label>Key</label>
            <input type="text" value={key} disabled />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={field.type} disabled>
              {stateTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Default</label>
            <input
              type="text"
              value={JSON.stringify(field.default)}
              onChange={(e) => {
                try {
                  const value = JSON.parse(e.target.value);
                  onChange({
                    ...spec,
                    state: { ...spec.state, [key]: { ...field, default: value } }
                  });
                } catch {}
              }}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button
              onClick={() => removeStateField(key)}
              style={{ padding: '8px 12px', background: '#e74c3c', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="form-group">
          <label>New Field Key</label>
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="fieldName"
          />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            {stateTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={addStateField}
            style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}
          >
            Add Field
          </button>
        </div>
      </div>
    </div>
  );
}

function EventsSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const eventTriggers: EventTrigger[] = [
    'onClick', 'onDoubleClick', 'onHover', 'onHoverEnd', 'onMount', 'onUnmount',
    'onResize', 'onKeyDown', 'onKeyUp', 'onInterval', 'onStateChange'
  ];

  const actionKeys = Object.keys(spec.actions);

  const toggleTrigger = (trigger: EventTrigger, actionId: string) => {
    const current = spec.events.triggers[trigger] || [];
    const newTriggers = { ...spec.events.triggers };

    if (current.includes(actionId)) {
      newTriggers[trigger] = current.filter(a => a !== actionId);
    } else {
      newTriggers[trigger] = [...current, actionId];
    }

    onChange({
      ...spec,
      events: { ...spec.events, triggers: newTriggers }
    });
  };

  return (
    <div className="form-section">
      <h3>Event Triggers</h3>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        Map event triggers to actions. Actions must be defined in the Actions tab first.
      </p>

      {actionKeys.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>
          No actions defined yet. Add actions in the Actions tab first.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #333' }}>Trigger</th>
              {actionKeys.map(action => (
                <th key={action} style={{ padding: 8, borderBottom: '1px solid #333' }}>{action}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventTriggers.map(trigger => (
              <tr key={trigger}>
                <td style={{ padding: 8, color: '#888' }}>{trigger}</td>
                {actionKeys.map(action => (
                  <td key={action} style={{ padding: 8, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={(spec.events.triggers[trigger] || []).includes(action)}
                      onChange={() => toggleTrigger(trigger, action)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ActionsSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const actionTypes = [
    'setState', 'toggleState', 'incrementState', 'decrementState', 'resetState',
    'emit', 'broadcast', 'animate', 'sequence', 'custom'
  ];

  const [newActionId, setNewActionId] = useState('');
  const [newActionType, setNewActionType] = useState('setState');

  const addAction = () => {
    if (newActionId && !spec.actions[newActionId]) {
      onChange({
        ...spec,
        actions: {
          ...spec.actions,
          [newActionId]: { type: newActionType as any, description: '' }
        }
      });
      setNewActionId('');
    }
  };

  const removeAction = (id: string) => {
    const newActions = { ...spec.actions };
    delete newActions[id];
    onChange({ ...spec, actions: newActions });
  };

  return (
    <div className="form-section">
      <h3>Actions</h3>

      {Object.entries(spec.actions).map(([id, action]) => (
        <div key={id} className="form-grid" style={{ marginBottom: 12, alignItems: 'start' }}>
          <div className="form-group">
            <label>Action ID</label>
            <input type="text" value={id} disabled />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={action.type} disabled>
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={action.description || ''}
              onChange={(e) => onChange({
                ...spec,
                actions: { ...spec.actions, [id]: { ...action, description: e.target.value } }
              })}
              placeholder="What this action does"
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button
              onClick={() => removeAction(id)}
              style={{ padding: '8px 12px', background: '#e74c3c', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="form-grid" style={{ marginTop: 16 }}>
        <div className="form-group">
          <label>New Action ID</label>
          <input
            type="text"
            value={newActionId}
            onChange={(e) => setNewActionId(e.target.value)}
            placeholder="actionName"
          />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={newActionType} onChange={(e) => setNewActionType(e.target.value)}>
            {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={addAction}
            style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}
          >
            Add Action
          </button>
        </div>
      </div>
    </div>
  );
}

function APISection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const portTypes = ['string', 'number', 'boolean', 'object', 'array', 'any'];

  const [newInputId, setNewInputId] = useState('');
  const [newOutputId, setNewOutputId] = useState('');

  const addInput = () => {
    if (newInputId && !spec.api.inputs.find(p => p.id === newInputId)) {
      onChange({
        ...spec,
        api: {
          ...spec.api,
          inputs: [...spec.api.inputs, { id: newInputId, name: newInputId, type: 'any' }]
        }
      });
      setNewInputId('');
    }
  };

  const addOutput = () => {
    if (newOutputId && !spec.api.outputs.find(p => p.id === newOutputId)) {
      onChange({
        ...spec,
        api: {
          ...spec.api,
          outputs: [...spec.api.outputs, { id: newOutputId, name: newOutputId, type: 'any' }]
        }
      });
      setNewOutputId('');
    }
  };

  return (
    <div className="form-section">
      <h3>Pipeline I/O Ports</h3>

      <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: 13 }}>Inputs</h4>
      {spec.api.inputs.map((port, i) => (
        <div key={port.id} className="form-grid" style={{ marginBottom: 8 }}>
          <div className="form-group">
            <input type="text" value={port.id} disabled placeholder="Port ID" />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={port.name}
              onChange={(e) => {
                const inputs = [...spec.api.inputs];
                inputs[i] = { ...port, name: e.target.value };
                onChange({ ...spec, api: { ...spec.api, inputs } });
              }}
              placeholder="Display Name"
            />
          </div>
          <div className="form-group">
            <select
              value={port.type}
              onChange={(e) => {
                const inputs = [...spec.api.inputs];
                inputs[i] = { ...port, type: e.target.value as any };
                onChange({ ...spec, api: { ...spec.api, inputs } });
              }}
            >
              {portTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      ))}
      <div className="form-grid" style={{ marginTop: 8 }}>
        <div className="form-group">
          <input
            type="text"
            value={newInputId}
            onChange={(e) => setNewInputId(e.target.value)}
            placeholder="inputId"
          />
        </div>
        <div className="form-group">
          <button onClick={addInput} style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}>
            Add Input
          </button>
        </div>
      </div>

      <h4 style={{ marginTop: 24, marginBottom: 8, fontSize: 13 }}>Outputs</h4>
      {spec.api.outputs.map((port, i) => (
        <div key={port.id} className="form-grid" style={{ marginBottom: 8 }}>
          <div className="form-group">
            <input type="text" value={port.id} disabled placeholder="Port ID" />
          </div>
          <div className="form-group">
            <input
              type="text"
              value={port.name}
              onChange={(e) => {
                const outputs = [...spec.api.outputs];
                outputs[i] = { ...port, name: e.target.value };
                onChange({ ...spec, api: { ...spec.api, outputs } });
              }}
              placeholder="Display Name"
            />
          </div>
          <div className="form-group">
            <select
              value={port.type}
              onChange={(e) => {
                const outputs = [...spec.api.outputs];
                outputs[i] = { ...port, type: e.target.value as any };
                onChange({ ...spec, api: { ...spec.api, outputs } });
              }}
            >
              {portTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      ))}
      <div className="form-grid" style={{ marginTop: 8 }}>
        <div className="form-group">
          <input
            type="text"
            value={newOutputId}
            onChange={(e) => setNewOutputId(e.target.value)}
            placeholder="outputId"
          />
        </div>
        <div className="form-group">
          <button onClick={addOutput} style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}>
            Add Output
          </button>
        </div>
      </div>
    </div>
  );
}

function PermissionsSection({
  spec,
  onChange
}: {
  spec: SpecJSON;
  onChange: (spec: SpecJSON) => void;
}) {
  const licenses = ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'proprietary', 'custom'];

  return (
    <div className="form-section">
      <h3>Permissions & Licensing</h3>
      <div className="form-grid">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={spec.permissions.allowPipelineUse}
              onChange={(e) => onChange({
                ...spec,
                permissions: { ...spec.permissions, allowPipelineUse: e.target.checked }
              })}
            />
            {' '}Allow Pipeline Use
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={spec.permissions.allowForking}
              onChange={(e) => onChange({
                ...spec,
                permissions: { ...spec.permissions, allowForking: e.target.checked }
              })}
            />
            {' '}Allow Forking
          </label>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={spec.permissions.allowMarketplace}
              onChange={(e) => onChange({
                ...spec,
                permissions: { ...spec.permissions, allowMarketplace: e.target.checked }
              })}
            />
            {' '}Allow Marketplace Listing
          </label>
        </div>

        <div className="form-group">
          <label>License</label>
          <select
            value={spec.permissions.license || 'MIT'}
            onChange={(e) => onChange({
              ...spec,
              permissions: { ...spec.permissions, license: e.target.value as any }
            })}
          >
            {licenses.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {spec.permissions.allowMarketplace && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12, fontSize: 13 }}>Revenue Share</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Creator Share (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={(spec.permissions.revenueShare?.creator || 0.8) * 100}
                onChange={(e) => onChange({
                  ...spec,
                  permissions: {
                    ...spec.permissions,
                    revenueShare: {
                      ...spec.permissions.revenueShare,
                      creator: Number(e.target.value) / 100,
                      platform: 1 - Number(e.target.value) / 100
                    }
                  }
                })}
              />
            </div>
            <div className="form-group">
              <label>Platform Share (%)</label>
              <input
                type="number"
                value={(spec.permissions.revenueShare?.platform || 0.2) * 100}
                disabled
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpecEditor;
