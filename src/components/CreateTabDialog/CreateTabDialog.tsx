/**
 * StickerNest v2 - Create Tab Dialog
 * Modal dialog for creating new tabs with type selection and configuration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { TabTypeSelector } from './TabTypeSelector';
import { UrlPreviewConfig } from './UrlPreviewConfig';
import { CanvasSelector } from './CanvasSelector';
import { useTabsStore } from '../../state/useTabsStore';
import type {
  TabType,
  TabConfig,
  WidgetDockerTabConfig,
  Docker2TabConfig,
  UrlPreviewTabConfig,
  CanvasTabConfig,
} from '../tabs/types';

interface CreateTabDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string;
}

type DialogStep = 'type-select' | 'configure';

export const CreateTabDialog: React.FC<CreateTabDialogProps> = ({
  isOpen,
  onClose,
  accentColor = '#8b5cf6',
}) => {
  const createTypedTab = useTabsStore((s) => s.createTypedTab);

  // Dialog state
  const [step, setStep] = useState<DialogStep>('type-select');
  const [selectedType, setSelectedType] = useState<TabType | null>(null);
  const [title, setTitle] = useState('');

  // Configuration state for each type
  const [urlConfig, setUrlConfig] = useState<Partial<UrlPreviewTabConfig>>({
    type: 'url-preview',
    showControls: true,
    allowFullscreen: true,
    url: '',
  });

  const [canvasConfig, setCanvasConfig] = useState<Partial<CanvasTabConfig>>({
    type: 'canvas',
    fitMode: 'contain',
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('type-select');
      setSelectedType(null);
      setTitle('');
      setUrlConfig({
        type: 'url-preview',
        showControls: true,
        allowFullscreen: true,
        url: '',
      });
      setCanvasConfig({
        type: 'canvas',
        fitMode: 'contain',
      });
    }
  }, [isOpen]);

  // Handle type selection
  const handleTypeSelect = useCallback((type: TabType) => {
    setSelectedType(type);

    // Set default title based on type
    switch (type) {
      case 'widget-docker':
        setTitle('Widgets');
        break;
      case 'widget-docker-v2':
        setTitle('Widget Stack');
        break;
      case 'url-preview':
        setTitle('Web Preview');
        break;
      case 'canvas':
        setTitle('Canvas');
        break;
    }
  }, []);

  // Handle next step
  const handleNext = useCallback(() => {
    if (!selectedType) return;

    // Widget docker types don't need configuration step
    if (selectedType === 'widget-docker' || selectedType === 'widget-docker-v2') {
      handleCreate();
      return;
    }

    setStep('configure');
  }, [selectedType]);

  // Handle back
  const handleBack = useCallback(() => {
    setStep('type-select');
  }, []);

  // Handle create
  const handleCreate = useCallback(() => {
    if (!selectedType) return;

    let config: TabConfig;

    switch (selectedType) {
      case 'widget-docker':
        config = { type: 'widget-docker' } as WidgetDockerTabConfig;
        break;
      case 'widget-docker-v2':
        config = {
          type: 'widget-docker-v2',
          layoutMode: 'vertical',
          themeMode: 'dark',
        } as Docker2TabConfig;
        break;
      case 'url-preview':
        if (!urlConfig.url) return; // URL is required
        config = {
          type: 'url-preview',
          url: urlConfig.url,
          showControls: urlConfig.showControls,
          allowFullscreen: urlConfig.allowFullscreen,
        } as UrlPreviewTabConfig;
        break;
      case 'canvas':
        if (!canvasConfig.slug && !canvasConfig.canvasId) return; // Canvas is required
        config = {
          type: 'canvas',
          slug: canvasConfig.slug,
          canvasId: canvasConfig.canvasId,
          canvasName: canvasConfig.canvasName,
          isOwn: canvasConfig.isOwn,
          password: canvasConfig.password,
          fitMode: canvasConfig.fitMode,
        } as CanvasTabConfig;
        break;
      default:
        return;
    }

    createTypedTab({
      title: title || 'New Tab',
      config,
    });

    onClose();
  }, [selectedType, title, urlConfig, canvasConfig, createTypedTab, onClose]);

  // Check if can proceed
  const canProceed = useCallback(() => {
    if (step === 'type-select') {
      return !!selectedType;
    }

    if (step === 'configure') {
      switch (selectedType) {
        case 'url-preview':
          return !!urlConfig.url;
        case 'canvas':
          return !!(canvasConfig.slug || canvasConfig.canvasId);
        default:
          return true;
      }
    }

    return false;
  }, [step, selectedType, urlConfig, canvasConfig]);

  // Get step title
  const getStepTitle = () => {
    if (step === 'type-select') {
      return 'Create New Tab';
    }

    switch (selectedType) {
      case 'url-preview':
        return 'Configure Web Preview';
      case 'canvas':
        return 'Select Canvas';
      default:
        return 'Configure Tab';
    }
  };

  // Get step description
  const getStepDescription = () => {
    if (step === 'type-select') {
      return 'Choose what type of content this tab will display';
    }

    switch (selectedType) {
      case 'url-preview':
        return 'Enter the URL of the website you want to preview';
      case 'canvas':
        return 'Select a canvas to display in this tab';
      default:
        return 'Configure your new tab';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(15, 15, 25, 0.98)',
          backdropFilter: 'blur(40px) saturate(200%)',
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {step === 'configure' && (
            <button
              onClick={handleBack}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#94a3b8',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#e2e8f0',
                margin: 0,
                marginBottom: 4,
              }}
            >
              {getStepTitle()}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: '#94a3b8',
                margin: 0,
              }}
            >
              {getStepDescription()}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#94a3b8',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
          }}
        >
          {step === 'type-select' && (
            <TabTypeSelector
              selectedType={selectedType}
              onSelect={handleTypeSelect}
              accentColor={accentColor}
            />
          )}

          {step === 'configure' && selectedType === 'url-preview' && (
            <UrlPreviewConfig
              config={urlConfig}
              onConfigChange={setUrlConfig}
              title={title}
              onTitleChange={setTitle}
              accentColor={accentColor}
            />
          )}

          {step === 'configure' && selectedType === 'canvas' && (
            <CanvasSelector
              config={canvasConfig}
              onConfigChange={setCanvasConfig}
              title={title}
              onTitleChange={setTitle}
              accentColor={accentColor}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 10,
              color: '#94a3b8',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            Cancel
          </button>

          <button
            onClick={step === 'type-select' ? handleNext : handleCreate}
            disabled={!canProceed()}
            style={{
              padding: '10px 20px',
              background: canProceed() ? accentColor : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 10,
              color: canProceed() ? 'white' : '#64748b',
              fontSize: 14,
              fontWeight: 500,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (canProceed()) {
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {step === 'type-select' ? (
              selectedType === 'widget-docker' ? (
                <>
                  <Plus size={16} />
                  Create Tab
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={16} />
                </>
              )
            ) : (
              <>
                <Plus size={16} />
                Create Tab
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTabDialog;
