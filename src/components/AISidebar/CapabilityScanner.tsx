/**
 * StickerNest v2 - Capability Scanner
 * UI for scanning widget capabilities and proposing upgrades
 * Integrates with WidgetEvolution AI
 */

import React, { useState, useCallback } from 'react';
import { getWidgetEvolution, type UpgradeProposal } from '../../ai/WidgetEvolution';
import { getCapabilityRegistry } from '../../ai/CapabilityRegistry';
import type { CapabilityScanResult, CapabilityId, WidgetUpgrade } from '../../types/capabilities';
import type { RuntimeContext } from '../../runtime/RuntimeContext';

interface CapabilityScannerProps {
  runtime: RuntimeContext;
}

export const CapabilityScanner: React.FC<CapabilityScannerProps> = ({ runtime }) => {
  const [scanResults, setScanResults] = useState<CapabilityScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [connectionSource, setConnectionSource] = useState<string>('');
  const [connectionTarget, setConnectionTarget] = useState<string>('');
  const [upgradeProposal, setUpgradeProposal] = useState<string | null>(null);
  const [proposedUpgrades, setProposedUpgrades] = useState<UpgradeProposal | null>(null);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<string | null>(null);

  // Register widgets from runtime
  const registerWidgets = useCallback(() => {
    const registry = getCapabilityRegistry();
    const widgets = runtime.widgetInstances;
    
    widgets.forEach(widget => {
      // Try to get manifest from widget
      const manifest = widget.metadata?.generatedContent?.manifest;
      if (manifest) {
        registry.registerWidget(manifest);
      }
    });
  }, [runtime]);

  // Scan all widgets
  const handleScanAll = useCallback(async () => {
    setIsScanning(true);
    try {
      registerWidgets();
      const evolution = getWidgetEvolution();
      const results = evolution.scanAllCapabilities();
      setScanResults(results);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [registerWidgets]);

  // Scan single widget (available for future use)
  const _handleScanWidget = useCallback((widgetId: string) => {
    registerWidgets();
    const evolution = getWidgetEvolution();
    const result = evolution.scanCapabilities(widgetId);
    if (result) {
      setScanResults([result]);
      setSelectedWidget(widgetId);
    }
  }, [registerWidgets]);

  // Find compatible connections
  const handleFindConnections = useCallback(() => {
    if (!connectionSource || !connectionTarget) return;
    
    registerWidgets();
    const registry = getCapabilityRegistry();
    const matches = registry.findCompatibleConnections(connectionSource, connectionTarget);
    
    if (matches.length > 0) {
      const summary = matches.map(m => 
        `${m.source} → ${m.target} (${Math.round(m.confidence * 100)}% confidence)`
      ).join('\n');
      setUpgradeProposal(`Found ${matches.length} compatible connection(s):\n${summary}`);
      setProposedUpgrades(null);
    } else {
      // Check for upgrades needed
      const evolution = getWidgetEvolution();
      const proposal = evolution.proposeMultiWidgetUpgrades([{
        sourceWidgetId: connectionSource,
        sourceOutput: 'state.changed' as CapabilityId,
        targetWidgetId: connectionTarget,
        targetInput: 'data.set' as CapabilityId,
      }]);
      setUpgradeProposal(proposal.summary);
      setProposedUpgrades(proposal);
    }
    setCodePreview(null);
    setUpgradeStatus(null);
  }, [connectionSource, connectionTarget, registerWidgets]);

  // Generate code preview for an upgrade
  const handlePreviewUpgrade = useCallback((upgrade: WidgetUpgrade) => {
    const evolution = getWidgetEvolution();
    const preview = evolution.generateCodePreview(upgrade);
    setCodePreview(preview);
  }, []);

  // Apply upgrade using AI
  const handleApplyUpgrade = useCallback(async (upgrade: WidgetUpgrade) => {
    setIsGenerating(true);
    setUpgradeStatus('Generating upgrade code...');
    
    try {
      const evolution = getWidgetEvolution();
      const widget = runtime.widgetInstances.find(w => w.widgetDefId === upgrade.widgetId);
      
      if (!widget) {
        setUpgradeStatus('Widget not found');
        return;
      }
      
      const manifest = widget.metadata?.generatedContent?.manifest;
      const html = widget.metadata?.generatedContent?.html;
      
      if (!manifest || !html) {
        setUpgradeStatus('Widget code not available');
        return;
      }
      
      const result = await evolution.generateUpgradeCode(
        upgrade.widgetId,
        html,
        manifest,
        upgrade
      );
      
      if (result.success && result.manifest && result.html) {
        // Apply the upgraded code to the widget instance
        const widgetIndex = runtime.widgetInstances.findIndex(w => w.widgetDefId === upgrade.widgetId);

        if (widgetIndex !== -1) {
          // Update the widget instance metadata with new manifest and html
          const updatedWidget = {
            ...runtime.widgetInstances[widgetIndex],
            metadata: {
              ...runtime.widgetInstances[widgetIndex].metadata,
              source: 'generated' as const,
              generatedContent: {
                html: result.html,
                manifest: result.manifest,
              },
              upgradedAt: new Date().toISOString(),
              upgradeChanges: result.changes,
            },
          };

          // Update the runtime's widget instances array
          runtime.widgetInstances[widgetIndex] = updatedWidget;

          // Emit event to notify that widget has been upgraded
          runtime.eventBus.emit({
            type: 'widget:upgraded',
            scope: 'canvas',
            payload: {
              widgetInstanceId: updatedWidget.id,
              widgetDefId: updatedWidget.widgetDefId,
              changes: result.changes,
            },
          });

          // Re-register the upgraded manifest in capability registry
          const registry = getCapabilityRegistry();
          registry.registerWidget(result.manifest);

          setUpgradeStatus(`✓ Upgrade applied successfully!\nChanges: ${result.changes?.join(', ')}\n\n💡 Refresh the widget to see changes.`);
          console.log('[CapabilityScanner] Upgrade applied:', { widgetId: upgrade.widgetId, changes: result.changes });
        } else {
          setUpgradeStatus(`✓ Upgrade generated but widget not found in runtime.\nChanges: ${result.changes?.join(', ')}`);
        }
      } else if (result.success) {
        setUpgradeStatus(`✓ Upgrade complete but missing manifest/html.\nChanges: ${result.changes?.join(', ')}`);
      } else {
        setUpgradeStatus(`✗ Upgrade failed: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      setUpgradeStatus(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [runtime.widgetInstances]);

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '16px',
    height: '100%',
    overflowY: 'auto',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
    padding: '12px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: '6px',
    textTransform: 'uppercase',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.85rem',
    marginBottom: '8px',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem' }}>
          🔍 Capability Scanner
        </h3>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.75rem' }}>
          Analyze widget capabilities and find connection opportunities
        </p>
      </div>

      {/* Scan All Button */}
      <div style={sectionStyle}>
        <button
          onClick={handleScanAll}
          disabled={isScanning}
          style={{
            ...buttonStyle,
            opacity: isScanning ? 0.6 : 1,
            cursor: isScanning ? 'wait' : 'pointer',
          }}
        >
          {isScanning ? '⟳ Scanning...' : '🔬 Scan All Widgets'}
        </button>
      </div>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Scan Results ({scanResults.length})</span>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {scanResults.map(result => (
              <div
                key={result.widgetId}
                style={{
                  padding: '8px',
                  marginBottom: '6px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedWidget(result.widgetId)}
              >
                <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.85rem' }}>
                  {result.widgetName}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                  📥 {result.inputs.length} inputs • 📤 {result.outputs.length} outputs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Widget Details */}
      {selectedWidget && scanResults.find(r => r.widgetId === selectedWidget) && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Widget Details</span>
          {(() => {
            const result = scanResults.find(r => r.widgetId === selectedWidget)!;
            return (
              <>
                <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                  {result.widgetName}
                </div>
                
                {result.inputs.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', marginBottom: '4px' }}>
                      📥 Inputs:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.inputs.map(input => (
                        <span
                          key={input}
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: '#10b981',
                          }}
                        >
                          {input}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.outputs.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginBottom: '4px' }}>
                      📤 Outputs:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.outputs.map(output => (
                        <span
                          key={output}
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(245, 158, 11, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: '#f59e0b',
                          }}
                        >
                          {output}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.suggestedInputs && result.suggestedInputs.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginBottom: '4px' }}>
                      💡 Suggested additions:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {result.suggestedInputs.map(sug => (
                        <span
                          key={sug}
                          style={{
                            padding: '2px 6px',
                            background: 'rgba(139, 92, 246, 0.2)',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: '#8b5cf6',
                          }}
                        >
                          +{sug}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Connection Finder */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Find Connections</span>
        <select
          value={connectionSource}
          onChange={(e) => setConnectionSource(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select source widget...</option>
          {runtime.widgetInstances.map(w => (
            <option key={w.id} value={w.widgetDefId}>
              {w.widgetDefId}
            </option>
          ))}
        </select>
        <select
          value={connectionTarget}
          onChange={(e) => setConnectionTarget(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select target widget...</option>
          {runtime.widgetInstances.map(w => (
            <option key={w.id} value={w.widgetDefId}>
              {w.widgetDefId}
            </option>
          ))}
        </select>
        <button
          onClick={handleFindConnections}
          disabled={!connectionSource || !connectionTarget}
          style={{
            ...buttonStyle,
            background: connectionSource && connectionTarget
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(255,255,255,0.1)',
            color: connectionSource && connectionTarget ? 'white' : '#64748b',
            cursor: connectionSource && connectionTarget ? 'pointer' : 'not-allowed',
          }}
        >
          🔗 Find Compatible Connections
        </button>
      </div>

      {/* Upgrade Proposal */}
      {upgradeProposal && (
        <div style={{
          ...sectionStyle,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}>
          <span style={{ ...labelStyle, color: '#3b82f6' }}>Analysis Result</span>
          <pre style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#94a3b8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: proposedUpgrades?.upgradesNeeded ? '12px' : 0,
          }}>
            {upgradeProposal}
          </pre>

          {/* Upgrade Actions */}
          {proposedUpgrades?.upgradesNeeded && proposedUpgrades.upgrades.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#a78bfa', marginBottom: '8px' }}>
                Proposed Upgrades ({proposedUpgrades.upgrades.length}):
              </div>
              {proposedUpgrades.upgrades.map((upgrade, idx) => (
                <div
                  key={upgrade.widgetId + idx}
                  style={{
                    padding: '10px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {upgrade.widgetId}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                    Complexity: {upgrade.complexity}
                    {upgrade.addInputs?.length ? ` • +${upgrade.addInputs.length} inputs` : ''}
                    {upgrade.addOutputs?.length ? ` • +${upgrade.addOutputs.length} outputs` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button
                      onClick={() => handlePreviewUpgrade(upgrade)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(139, 92, 246, 0.2)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '4px',
                        color: '#a78bfa',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                      }}
                    >
                      👁️ Preview Code
                    </button>
                    <button
                      onClick={() => handleApplyUpgrade(upgrade)}
                      disabled={isGenerating}
                      style={{
                        padding: '4px 10px',
                        background: isGenerating 
                          ? 'rgba(100,100,100,0.2)' 
                          : 'rgba(16, 185, 129, 0.2)',
                        border: `1px solid ${isGenerating 
                          ? 'rgba(100,100,100,0.3)' 
                          : 'rgba(16, 185, 129, 0.3)'}`,
                        borderRadius: '4px',
                        color: isGenerating ? '#64748b' : '#10b981',
                        fontSize: '0.7rem',
                        cursor: isGenerating ? 'wait' : 'pointer',
                      }}
                    >
                      {isGenerating ? '⟳ Generating...' : '🚀 Apply Upgrade'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code Preview */}
      {codePreview && (
        <div style={{
          ...sectionStyle,
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ ...labelStyle, color: '#a78bfa', margin: 0 }}>Code Preview</span>
            <button
              onClick={() => setCodePreview(null)}
              style={{
                padding: '2px 8px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>
          <pre style={{
            margin: 0,
            padding: '10px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: '#94a3b8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: 'monospace',
          }}>
            {codePreview}
          </pre>
        </div>
      )}

      {/* Upgrade Status */}
      {upgradeStatus && (
        <div style={{
          ...sectionStyle,
          background: upgradeStatus.startsWith('✓') 
            ? 'rgba(16, 185, 129, 0.1)' 
            : upgradeStatus.startsWith('✗')
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${upgradeStatus.startsWith('✓') 
            ? 'rgba(16, 185, 129, 0.3)' 
            : upgradeStatus.startsWith('✗')
              ? 'rgba(239, 68, 68, 0.3)'
              : 'rgba(59, 130, 246, 0.3)'}`,
        }}>
          <span style={{ 
            ...labelStyle, 
            color: upgradeStatus.startsWith('✓') 
              ? '#10b981' 
              : upgradeStatus.startsWith('✗')
                ? '#f87171'
                : '#3b82f6' 
          }}>
            Upgrade Status
          </span>
          <pre style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#94a3b8',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {upgradeStatus}
          </pre>
        </div>
      )}
    </div>
  );
};

export default CapabilityScanner;

