/**
 * I/O Ports Section
 * Ecosystem connections configuration for widget generation
 */

import React from 'react';
import { theme } from '../theme';
import type { IOPort, LibraryWidgetInfo } from '../WidgetLab.types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: '#252542',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '13px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontWeight: 500,
};

export interface IOPortsSectionProps {
  inputPorts: IOPort[];
  setInputPorts: React.Dispatch<React.SetStateAction<IOPort[]>>;
  outputPorts: IOPort[];
  setOutputPorts: React.Dispatch<React.SetStateAction<IOPort[]>>;
  newInputName: string;
  setNewInputName: React.Dispatch<React.SetStateAction<string>>;
  newOutputName: string;
  setNewOutputName: React.Dispatch<React.SetStateAction<string>>;
  isSuggestingIO: boolean;
  description: string;
  libraryWidgets: LibraryWidgetInfo[];
  onSuggestIO: () => Promise<void>;
}

export const IOPortsSection: React.FC<IOPortsSectionProps> = ({
  inputPorts,
  setInputPorts,
  outputPorts,
  setOutputPorts,
  newInputName,
  setNewInputName,
  newOutputName,
  setNewOutputName,
  isSuggestingIO,
  description,
  libraryWidgets,
  onSuggestIO,
}) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Ecosystem Connections (Optional)</label>
        <button
          onClick={onSuggestIO}
          disabled={isSuggestingIO || !description.trim()}
          style={{
            padding: '6px 12px',
            background: isSuggestingIO || !description.trim() ? theme.bg.tertiary : theme.accent,
            border: 'none',
            borderRadius: '4px',
            color: isSuggestingIO || !description.trim() ? theme.text.tertiary : 'white',
            fontSize: '11px',
            fontWeight: 500,
            cursor: isSuggestingIO || !description.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {isSuggestingIO ? 'Analyzing...' : 'AI Suggest Ports'}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: theme.text.tertiary, marginBottom: '12px' }}>
        Define input/output ports to connect this widget with other widgets in pipelines.
        {libraryWidgets.length > 0 && ` (${libraryWidgets.length} widgets in library)`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Input Ports */}
        <div style={{
          background: theme.bg.tertiary,
          borderRadius: '6px',
          padding: '12px',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ fontSize: '11px', color: theme.text.secondary, marginBottom: '8px', fontWeight: 500 }}>
            INPUT PORTS (receives data)
          </div>
          {inputPorts.map((port, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
              padding: '6px 8px',
              background: theme.bg.secondary,
              borderRadius: '4px',
            }}>
              <span style={{ fontSize: '12px', color: theme.accent, fontFamily: 'monospace' }}>{port.name}</span>
              <span style={{ fontSize: '10px', color: theme.text.tertiary, flex: 1 }}>{port.description}</span>
              <button
                onClick={() => setInputPorts(inputPorts.filter((_, i) => i !== idx))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.error,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px',
                }}
              >×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <input
              type="text"
              value={newInputName}
              onChange={(e) => setNewInputName(e.target.value.replace(/\s/g, '-').toLowerCase())}
              placeholder="port-name"
              style={{
                ...inputStyle,
                padding: '6px 8px',
                fontSize: '11px',
                flex: 1,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newInputName.trim()) {
                  setInputPorts([...inputPorts, { name: newInputName.trim(), description: '' }]);
                  setNewInputName('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newInputName.trim()) {
                  setInputPorts([...inputPorts, { name: newInputName.trim(), description: '' }]);
                  setNewInputName('');
                }
              }}
              disabled={!newInputName.trim()}
              style={{
                padding: '6px 10px',
                background: newInputName.trim() ? theme.accent : theme.bg.secondary,
                border: 'none',
                borderRadius: '4px',
                color: newInputName.trim() ? 'white' : theme.text.tertiary,
                fontSize: '11px',
                cursor: newInputName.trim() ? 'pointer' : 'not-allowed',
              }}
            >+ Add</button>
          </div>
        </div>

        {/* Output Ports */}
        <div style={{
          background: theme.bg.tertiary,
          borderRadius: '6px',
          padding: '12px',
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ fontSize: '11px', color: theme.text.secondary, marginBottom: '8px', fontWeight: 500 }}>
            OUTPUT PORTS (sends data)
          </div>
          {outputPorts.map((port, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
              padding: '6px 8px',
              background: theme.bg.secondary,
              borderRadius: '4px',
            }}>
              <span style={{ fontSize: '12px', color: theme.success, fontFamily: 'monospace' }}>{port.name}</span>
              <span style={{ fontSize: '10px', color: theme.text.tertiary, flex: 1 }}>{port.description}</span>
              <button
                onClick={() => setOutputPorts(outputPorts.filter((_, i) => i !== idx))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.error,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0 4px',
                }}
              >×</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <input
              type="text"
              value={newOutputName}
              onChange={(e) => setNewOutputName(e.target.value.replace(/\s/g, '-').toLowerCase())}
              placeholder="port-name"
              style={{
                ...inputStyle,
                padding: '6px 8px',
                fontSize: '11px',
                flex: 1,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newOutputName.trim()) {
                  setOutputPorts([...outputPorts, { name: newOutputName.trim(), description: '' }]);
                  setNewOutputName('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newOutputName.trim()) {
                  setOutputPorts([...outputPorts, { name: newOutputName.trim(), description: '' }]);
                  setNewOutputName('');
                }
              }}
              disabled={!newOutputName.trim()}
              style={{
                padding: '6px 10px',
                background: newOutputName.trim() ? theme.accent : theme.bg.secondary,
                border: 'none',
                borderRadius: '4px',
                color: newOutputName.trim() ? 'white' : theme.text.tertiary,
                fontSize: '11px',
                cursor: newOutputName.trim() ? 'pointer' : 'not-allowed',
              }}
            >+ Add</button>
          </div>
        </div>
      </div>

      {/* Quick presets */}
      {(inputPorts.length === 0 && outputPorts.length === 0) && (
        <div style={{ marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: theme.text.tertiary, marginRight: '8px' }}>Quick presets:</span>
          <button
            onClick={() => {
              setInputPorts([{ name: 'trigger', description: 'Trigger action' }]);
              setOutputPorts([{ name: 'result', description: 'Action result' }]);
            }}
            style={{
              padding: '4px 8px',
              background: theme.bg.tertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text.secondary,
              fontSize: '10px',
              cursor: 'pointer',
              marginRight: '6px',
            }}
          >Trigger/Result</button>
          <button
            onClick={() => {
              setInputPorts([{ name: 'data', description: 'Receive data' }]);
              setOutputPorts([{ name: 'data', description: 'Send data' }]);
            }}
            style={{
              padding: '4px 8px',
              background: theme.bg.tertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text.secondary,
              fontSize: '10px',
              cursor: 'pointer',
              marginRight: '6px',
            }}
          >Data In/Out</button>
          <button
            onClick={() => {
              setOutputPorts([{ name: 'value', description: 'Emit value changes' }]);
            }}
            style={{
              padding: '4px 8px',
              background: theme.bg.tertiary,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              color: theme.text.secondary,
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >Value Emitter</button>
        </div>
      )}
    </div>
  );
};

export default IOPortsSection;
