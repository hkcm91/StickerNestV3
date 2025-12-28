/**
 * StickerNest v2 - Creator License Settings
 *
 * UI panel for creators to configure their default licensing preferences.
 * Includes AI access, royalties, derivative rules, and resale settings.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import type {
  CreatorLicenseDefaults,
  AIAccessLevel,
  VisibilityLevel,
  PipelineUsageLevel,
  ForkRestriction,
} from '../../types/licensing';
import { DEFAULT_CREATOR_LICENSE_DEFAULTS } from '../../types/licensing';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNButton } from '../../shared-ui/SNButton';

interface CreatorLicenseSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CreatorLicenseDefaults;
  onSave: (settings: CreatorLicenseDefaults) => void;
}

type SettingsTab = 'visibility' | 'ai' | 'derivatives' | 'royalties' | 'resale';

export const CreatorLicenseSettings: React.FC<CreatorLicenseSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<CreatorLicenseDefaults>(settings);
  const [activeTab, setActiveTab] = useState<SettingsTab>('visibility');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const updateSettings = <K extends keyof CreatorLicenseDefaults>(
    key: K,
    value: CreatorLicenseDefaults[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_CREATOR_LICENSE_DEFAULTS);
  };

  // ==========================================================================
  // Styles
  // ==========================================================================

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'var(--sn-bg-overlay, rgba(0, 0, 0, 0.7))',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  };

  const dialogStyle: React.CSSProperties = {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
    borderRadius: 'var(--sn-radius-xl, 16px)',
    width: '90%',
    maxWidth: 700,
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3))',
    backdropFilter: 'blur(20px)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.1))',
  };

  const tabContainerStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.1))',
    padding: '0 16px',
    gap: '4px',
    overflowX: 'auto',
  };

  const getTabStyle = (tab: SettingsTab): React.CSSProperties => ({
    padding: '10px 16px',
    background: activeTab === tab ? 'var(--sn-accent-primary, #8b5cf6)' : 'transparent',
    color: activeTab === tab ? '#fff' : 'var(--sn-text-secondary, #94a3b8)',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: activeTab === tab ? 600 : 400,
    whiteSpace: 'nowrap',
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '24px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--sn-text-primary, #f1f5f9)',
    fontSize: 14,
    fontWeight: 500,
    marginBottom: '8px',
  };

  const descriptionStyle: React.CSSProperties = {
    color: 'var(--sn-text-tertiary, #64748b)',
    fontSize: 12,
    marginBottom: '12px',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--sn-bg-input, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.1))',
    borderRadius: 'var(--sn-radius-md, 8px)',
    color: 'var(--sn-text-primary, #f1f5f9)',
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'var(--sn-bg-input, rgba(255, 255, 255, 0.03))',
    borderRadius: 'var(--sn-radius-md, 8px)',
    marginBottom: '8px',
  };

  const warningBoxStyle: React.CSSProperties = {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    borderRadius: 'var(--sn-radius-md, 8px)',
    padding: '12px',
    marginTop: '12px',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTop: '1px solid var(--sn-border-subtle, rgba(255, 255, 255, 0.1))',
  };

  // ==========================================================================
  // Render Sections
  // ==========================================================================

  const renderVisibilityTab = () => (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>Default Visibility</label>
        <p style={descriptionStyle}>
          How your assets appear to others by default
        </p>
        <select
          value={localSettings.defaultVisibility}
          onChange={(e) => updateSettings('defaultVisibility', e.target.value as VisibilityLevel)}
          style={selectStyle}
        >
          <option value="public">Public - Discoverable by everyone</option>
          <option value="obfuscated">Obfuscated - Available but code is protected</option>
          <option value="private">Private - Only visible to you</option>
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Default Pipeline Usage</label>
        <p style={descriptionStyle}>
          How others can use your assets in their pipelines
        </p>
        <select
          value={localSettings.defaultPipelineUsage}
          onChange={(e) => updateSettings('defaultPipelineUsage', e.target.value as PipelineUsageLevel)}
          style={selectStyle}
        >
          <option value="none">None - Cannot be used in pipelines</option>
          <option value="read_only">Read Only - Can be used but not modified</option>
          <option value="derivative_allowed">Derivatives Allowed - Can create non-commercial derivatives</option>
          <option value="commercial_derivatives">Commercial Derivatives - Full commercial use</option>
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Attribution Format</label>
        <p style={descriptionStyle}>
          How others should credit you. Use {'{creator}'} as a placeholder.
        </p>
        <input
          type="text"
          value={localSettings.attributionFormat}
          onChange={(e) => updateSettings('attributionFormat', e.target.value)}
          placeholder="Created by {creator}"
          style={inputStyle}
        />
      </div>
    </>
  );

  const renderAITab = () => (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>Default AI Access Level</label>
        <p style={descriptionStyle}>
          What AI systems can do with your assets by default
        </p>
        <select
          value={localSettings.defaultAIAccess}
          onChange={(e) => updateSettings('defaultAIAccess', e.target.value as AIAccessLevel)}
          style={selectStyle}
        >
          <option value="none">None - AI cannot access</option>
          <option value="read">Read - AI can analyze but not modify</option>
          <option value="edit">Edit - AI can suggest modifications (owner only)</option>
          <option value="full">Full - AI can fully integrate and remix</option>
        </select>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="trainingOptOut"
          checked={localSettings.globalTrainingOptOut}
          onChange={(e) => updateSettings('globalTrainingOptOut', e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="trainingOptOut" style={{ ...labelStyle, marginBottom: 0 }}>
            Opt out of AI training
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Prevent your assets from being used to train AI models
          </p>
        </div>
      </div>

      <div style={warningBoxStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <SNIcon name="warning" size={18} color="#fbbf24" />
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 500, fontSize: 13 }}>
              Important: AI Access Implications
            </div>
            <p style={{ color: 'var(--sn-text-secondary)', fontSize: 12, marginTop: 4 }}>
              If you allow AI access, AI systems may analyze, modify, or incorporate your work.
              Choose "None" if you want to retain full control over your creative work.
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const renderDerivativesTab = () => (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>Fork Restrictions</label>
        <p style={descriptionStyle}>
          Control how others can create derivative works
        </p>
        <select
          value={localSettings.defaultDerivativeRules.forkRestrictions}
          onChange={(e) => updateSettings('defaultDerivativeRules', {
            ...localSettings.defaultDerivativeRules,
            forkRestrictions: e.target.value as ForkRestriction,
          })}
          style={selectStyle}
        >
          <option value="none">No Restrictions</option>
          <option value="allow_fork">Allow Forks</option>
          <option value="allow_fork_with_royalties">Allow Forks with Royalties</option>
          <option value="no_forks">No Forks Allowed</option>
        </select>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="requireCredit"
          checked={localSettings.defaultDerivativeRules.requireCredit}
          onChange={(e) => updateSettings('defaultDerivativeRules', {
            ...localSettings.defaultDerivativeRules,
            requireCredit: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="requireCredit" style={{ ...labelStyle, marginBottom: 0 }}>
            Require Attribution
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Derivatives must credit you as the original creator
          </p>
        </div>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="commercialDerivatives"
          checked={localSettings.defaultDerivativeRules.commercialDerivatives}
          onChange={(e) => updateSettings('defaultDerivativeRules', {
            ...localSettings.defaultDerivativeRules,
            commercialDerivatives: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="commercialDerivatives" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow Commercial Derivatives
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Others can sell products that incorporate your work
          </p>
        </div>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="allowLicenseChange"
          checked={localSettings.defaultDerivativeRules.allowLicenseChange}
          onChange={(e) => updateSettings('defaultDerivativeRules', {
            ...localSettings.defaultDerivativeRules,
            allowLicenseChange: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="allowLicenseChange" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow License Changes
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Derivatives can use a different license
          </p>
        </div>
      </div>
    </>
  );

  const renderRoyaltiesTab = () => (
    <>
      <div style={sectionStyle}>
        <label style={labelStyle}>Default Royalty Rate</label>
        <p style={descriptionStyle}>
          Percentage you receive from sales of derivatives (0-50%)
        </p>
        <input
          type="number"
          min="0"
          max="50"
          value={Math.round(localSettings.defaultRoyaltyRate * 100)}
          onChange={(e) => updateSettings('defaultRoyaltyRate', parseInt(e.target.value) / 100)}
          style={{ ...inputStyle, width: '120px' }}
        />
        <span style={{ color: 'var(--sn-text-secondary)', marginLeft: 8 }}>%</span>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="requireRoyalty"
          checked={localSettings.defaultDerivativeRules.requireRoyalty}
          onChange={(e) => updateSettings('defaultDerivativeRules', {
            ...localSettings.defaultDerivativeRules,
            requireRoyalty: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="requireRoyalty" style={{ ...labelStyle, marginBottom: 0 }}>
            Require Royalties for Derivatives
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Anyone who sells a derivative must pay you royalties
          </p>
        </div>
      </div>

      <div style={{
        ...warningBoxStyle,
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <SNIcon name="info" size={18} color="#8b5cf6" />
          <div>
            <div style={{ color: '#a78bfa', fontWeight: 500, fontSize: 13 }}>
              How Royalties Work
            </div>
            <p style={{ color: 'var(--sn-text-secondary)', fontSize: 12, marginTop: 4 }}>
              Royalties are calculated automatically based on asset lineage.
              If someone uses your asset in their project and sells it, you'll receive
              your percentage of the sale. Royalties stack but are capped at 50% total.
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const renderResaleTab = () => (
    <>
      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="allowResale"
          checked={localSettings.defaultResaleRules.allowResale}
          onChange={(e) => updateSettings('defaultResaleRules', {
            ...localSettings.defaultResaleRules,
            allowResale: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="allowResale" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow Resale
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Others can resell your assets
          </p>
        </div>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="allowInMarketplace"
          checked={localSettings.defaultResaleRules.allowInMarketplace}
          onChange={(e) => updateSettings('defaultResaleRules', {
            ...localSettings.defaultResaleRules,
            allowInMarketplace: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="allowInMarketplace" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow Marketplace Listing
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Others can list your assets in the marketplace
          </p>
        </div>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="allowFreeRemixPacks"
          checked={localSettings.defaultResaleRules.allowFreeRemixPacks}
          onChange={(e) => updateSettings('defaultResaleRules', {
            ...localSettings.defaultResaleRules,
            allowFreeRemixPacks: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="allowFreeRemixPacks" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow Free Remix Packs
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Others can include your assets in free remix packs
          </p>
        </div>
      </div>

      <div style={checkboxContainerStyle}>
        <input
          type="checkbox"
          id="allowBundling"
          checked={localSettings.defaultResaleRules.allowBundling}
          onChange={(e) => updateSettings('defaultResaleRules', {
            ...localSettings.defaultResaleRules,
            allowBundling: e.target.checked,
          })}
          style={{ width: 18, height: 18 }}
        />
        <div>
          <label htmlFor="allowBundling" style={{ ...labelStyle, marginBottom: 0 }}>
            Allow Bundling
          </label>
          <p style={{ ...descriptionStyle, marginBottom: 0 }}>
            Others can include your assets in bundles with other assets
          </p>
        </div>
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'visibility':
        return renderVisibilityTab();
      case 'ai':
        return renderAITab();
      case 'derivatives':
        return renderDerivativesTab();
      case 'royalties':
        return renderRoyaltiesTab();
      case 'resale':
        return renderResaleTab();
    }
  };

  // ==========================================================================
  // Main Render
  // ==========================================================================

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={dialogStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SNIcon name="shield" size={24} color="var(--sn-accent-primary, #8b5cf6)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--sn-text-primary)' }}>
                Creator License Settings
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--sn-text-tertiary)' }}>
                Configure default licensing for your assets
              </p>
            </div>
          </div>
          <SNIconButton
            icon="x"
            onClick={onClose}
            variant="ghost"
            size="sm"
          />
        </div>

        {/* Tabs */}
        <div style={tabContainerStyle}>
          <button
            style={getTabStyle('visibility')}
            onClick={() => setActiveTab('visibility')}
          >
            Visibility
          </button>
          <button
            style={getTabStyle('ai')}
            onClick={() => setActiveTab('ai')}
          >
            AI Access
          </button>
          <button
            style={getTabStyle('derivatives')}
            onClick={() => setActiveTab('derivatives')}
          >
            Derivatives
          </button>
          <button
            style={getTabStyle('royalties')}
            onClick={() => setActiveTab('royalties')}
          >
            Royalties
          </button>
          <button
            style={getTabStyle('resale')}
            onClick={() => setActiveTab('resale')}
          >
            Resale
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <SNButton variant="ghost" onClick={handleReset}>
            Reset to Defaults
          </SNButton>
          <div style={{ display: 'flex', gap: '12px' }}>
            <SNButton variant="secondary" onClick={onClose}>
              Cancel
            </SNButton>
            <SNButton variant="primary" onClick={handleSave}>
              Save Settings
            </SNButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorLicenseSettings;
