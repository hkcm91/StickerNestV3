/**
 * StickerNest v2 - Publish Canvas Dialog
 * Main dialog for publishing a canvas to a public URL
 *
 * ALPHA NOTES:
 * - Multi-step wizard: Settings → SEO → Preview → Confirm
 * - Integrates with usePublishStore for state management
 * - Validates before allowing publish
 */

import React, { useCallback, useEffect } from 'react';
import { SNButton } from '../../shared-ui/SNButton';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNIconButton } from '../../shared-ui/SNIconButton';
import { SNInput } from '../../shared-ui/SNInput';
import { usePublishStore } from '../../state/usePublishStore';
import { useCanvasStore } from '../../state/useCanvasStore';
import { SEOMetaFields } from './SEOMetaFields';
import { PublishPreviewPanel } from './PublishPreviewPanel';
import type { CanvasVisibility } from '../../types/domain';
import type { CanvasPublishSettings } from '../../types/publish';

interface PublishCanvasDialogProps {
  /** Whether the dialog is open (controlled mode) */
  isOpen?: boolean;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Canvas ID to publish */
  canvasId?: string;
  /** Existing publish settings */
  existingSettings?: CanvasPublishSettings;
  /** Callback on successful publish */
  onPublished?: (url: string) => void;
}

export const PublishCanvasDialog: React.FC<PublishCanvasDialogProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  canvasId: controlledCanvasId,
  existingSettings,
  onPublished,
}) => {
  // Store state
  const {
    isDialogOpen,
    currentCanvasId,
    currentStep,
    draftSettings,
    validationResult,
    isPublishing,
    isCheckingSlug,
    slugAvailable,
    error,
    successMessage,
    publishedUrl,
    openDialog,
    closeDialog,
    nextStep,
    prevStep,
    goToStep,
    setVisibility,
    setSlug,
    generateSlug,
    setPassword,
    setAllowEmbed,
    updateSEO,
    resetSEO,
    validate,
    checkSlugAvailability,
    publish,
    clearMessages,
  } = usePublishStore();

  // Canvas state
  const canvasName = useCanvasStore((s) => s.canvasName) || 'Untitled Canvas';
  const widgets = useCanvasStore((s) => Object.values(s.widgets));
  const pipelines = useCanvasStore((s) => s.pipelines);
  const canvas = useCanvasStore((s) => s.canvas);

  // Use controlled or store state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isDialogOpen;
  const canvasId = controlledCanvasId || currentCanvasId;

  // Initialize dialog when opened
  useEffect(() => {
    if (isOpen && canvasId && !currentCanvasId) {
      openDialog(canvasId, existingSettings);
    }
  }, [isOpen, canvasId, currentCanvasId, existingSettings, openDialog]);

  // Validate on step change
  useEffect(() => {
    if (currentStep === 'preview' || currentStep === 'confirm') {
      validate(widgets, pipelines, canvasName);
    }
  }, [currentStep, widgets, pipelines, canvasName, validate]);

  // Check slug availability when slug changes
  useEffect(() => {
    if (draftSettings.slug && draftSettings.slug.length >= 3) {
      const timer = setTimeout(() => {
        checkSlugAvailability(draftSettings.slug!);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [draftSettings.slug, checkSlugAvailability]);

  const handleClose = useCallback(() => {
    closeDialog();
    controlledOnClose?.();
  }, [closeDialog, controlledOnClose]);

  const handlePublish = useCallback(async () => {
    const success = await publish();
    if (success && publishedUrl) {
      onPublished?.(publishedUrl);
    }
  }, [publish, publishedUrl, onPublished]);

  const handleNext = useCallback(() => {
    if (currentStep === 'confirm') {
      handlePublish();
    } else {
      nextStep();
    }
  }, [currentStep, nextStep, handlePublish]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 'settings':
        if (draftSettings.visibility === 'private') return true;
        return draftSettings.slug && draftSettings.slug.length >= 3 && slugAvailable !== false;
      case 'seo':
        return true; // SEO is optional
      case 'preview':
        return validationResult?.isValid ?? false;
      case 'confirm':
        return validationResult?.isValid ?? false;
      default:
        return true;
    }
  }, [currentStep, draftSettings, slugAvailable, validationResult]);

  if (!isOpen) return null;

  const steps = ['settings', 'seo', 'preview', 'confirm'] as const;
  const stepIndex = steps.indexOf(currentStep);

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <SNIcon name="globe" size="lg" />
            <div>
              <h2 style={styles.title}>Publish Canvas</h2>
              <span style={styles.subtitle}>{canvasName}</span>
            </div>
          </div>
          <SNIconButton
            icon="close"
            variant="ghost"
            size="sm"
            tooltip="Close"
            onClick={handleClose}
          />
        </div>

        {/* Progress Steps */}
        <div style={styles.progress}>
          {steps.map((step, i) => (
            <React.Fragment key={step}>
              <button
                style={{
                  ...styles.stepButton,
                  ...(i <= stepIndex ? styles.stepActive : {}),
                  ...(i === stepIndex ? styles.stepCurrent : {}),
                }}
                onClick={() => i < stepIndex && goToStep(step)}
                disabled={i > stepIndex}
              >
                <span style={styles.stepNumber}>{i + 1}</span>
                <span style={styles.stepLabel}>
                  {step === 'settings' && 'Settings'}
                  {step === 'seo' && 'SEO'}
                  {step === 'preview' && 'Preview'}
                  {step === 'confirm' && 'Publish'}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div style={{
                  ...styles.stepConnector,
                  ...(i < stepIndex ? styles.stepConnectorActive : {}),
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Error/Success Messages */}
          {error && (
            <div style={styles.errorBanner}>
              <SNIcon name="alert-circle" size="sm" />
              <span>{error}</span>
              <SNIconButton icon="close" variant="ghost" size="sm" onClick={clearMessages} />
            </div>
          )}
          {successMessage && (
            <div style={styles.successBanner}>
              <SNIcon name="check-circle" size="sm" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'settings' && (
            <SettingsStep
              settings={draftSettings}
              slugAvailable={slugAvailable}
              isCheckingSlug={isCheckingSlug}
              onVisibilityChange={setVisibility}
              onSlugChange={setSlug}
              onGenerateSlug={generateSlug}
              onPasswordChange={setPassword}
              onAllowEmbedChange={setAllowEmbed}
            />
          )}

          {currentStep === 'seo' && (
            <SEOMetaFields
              seo={draftSettings.seo}
              canvasName={canvasName}
              onChange={updateSEO}
              onReset={resetSEO}
            />
          )}

          {currentStep === 'preview' && (
            <PublishPreviewPanel
              settings={draftSettings}
              canvasName={canvasName}
              thumbnailUrl={canvas?.thumbnailUrl}
              validation={validationResult}
              widgetCount={widgets.length}
            />
          )}

          {currentStep === 'confirm' && (
            <ConfirmStep
              settings={draftSettings}
              canvasName={canvasName}
              publishedUrl={publishedUrl}
            />
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {stepIndex > 0 && !publishedUrl && (
              <SNButton variant="ghost" onClick={prevStep} leftIcon="arrow-left">
                Back
              </SNButton>
            )}
          </div>
          <div style={styles.footerRight}>
            {publishedUrl ? (
              <>
                <SNButton
                  variant="secondary"
                  leftIcon="copy"
                  onClick={() => navigator.clipboard.writeText(publishedUrl)}
                >
                  Copy URL
                </SNButton>
                <SNButton variant="primary" onClick={handleClose}>
                  Done
                </SNButton>
              </>
            ) : (
              <>
                <SNButton variant="ghost" onClick={handleClose}>
                  Cancel
                </SNButton>
                <SNButton
                  variant={currentStep === 'confirm' ? 'gradient' : 'primary'}
                  onClick={handleNext}
                  disabled={!canProceed() || isPublishing}
                  loading={isPublishing}
                  rightIcon={currentStep === 'confirm' ? 'send' : 'arrow-right'}
                >
                  {currentStep === 'confirm' ? 'Publish Now' : 'Continue'}
                </SNButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Step Component
const SettingsStep: React.FC<{
  settings: CanvasPublishSettings;
  slugAvailable: boolean | null;
  isCheckingSlug: boolean;
  onVisibilityChange: (v: CanvasVisibility) => void;
  onSlugChange: (s: string) => void;
  onGenerateSlug: () => void;
  onPasswordChange: (p: string | undefined) => void;
  onAllowEmbedChange: (a: boolean) => void;
}> = ({
  settings,
  slugAvailable,
  isCheckingSlug,
  onVisibilityChange,
  onSlugChange,
  onGenerateSlug,
  onPasswordChange,
  onAllowEmbedChange,
}) => {
  const [usePassword, setUsePassword] = React.useState(Boolean(settings.password));
  const [password, setPassword] = React.useState(settings.password || '');

  const handlePasswordToggle = (checked: boolean) => {
    setUsePassword(checked);
    if (!checked) {
      setPassword('');
      onPasswordChange(undefined);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    onPasswordChange(value || undefined);
  };

  return (
    <div style={styles.stepContent}>
      {/* Visibility */}
      <div style={styles.field}>
        <label style={styles.fieldLabel}>Visibility</label>
        <div style={styles.visibilityOptions}>
          {(['private', 'unlisted', 'public'] as const).map((vis) => (
            <button
              key={vis}
              style={{
                ...styles.visibilityButton,
                ...(settings.visibility === vis ? styles.visibilityActive : {}),
              }}
              onClick={() => onVisibilityChange(vis)}
            >
              <SNIcon
                name={vis === 'private' ? 'lock' : vis === 'unlisted' ? 'link' : 'globe'}
                size="lg"
              />
              <span style={styles.visibilityLabel}>
                {vis === 'private' && 'Private'}
                {vis === 'unlisted' && 'Unlisted'}
                {vis === 'public' && 'Public'}
              </span>
              <span style={styles.visibilityDesc}>
                {vis === 'private' && 'Only you can access'}
                {vis === 'unlisted' && 'Anyone with the link'}
                {vis === 'public' && 'Discoverable by all'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Slug */}
      {settings.visibility !== 'private' && (
        <div style={styles.field}>
          <label style={styles.fieldLabel}>Page URL</label>
          <div style={styles.slugRow}>
            <span style={styles.slugPrefix}>stickernest.app/c/</span>
            <SNInput
              value={settings.slug || ''}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="your-page-slug"
              style={{ flex: 1 }}
              rightElement={
                isCheckingSlug ? (
                  <SNIcon name="loading" size="sm" spin />
                ) : slugAvailable === true ? (
                  <SNIcon name="check" size="sm" style={{ color: 'var(--sn-success)' }} />
                ) : slugAvailable === false ? (
                  <SNIcon name="x" size="sm" style={{ color: 'var(--sn-error)' }} />
                ) : null
              }
            />
            <SNIconButton
              icon="refresh"
              variant="secondary"
              size="sm"
              tooltip="Generate random slug"
              onClick={onGenerateSlug}
            />
          </div>
          {slugAvailable === false && (
            <span style={styles.slugError}>This URL is already taken</span>
          )}
        </div>
      )}

      {/* Password */}
      {settings.visibility !== 'private' && (
        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={usePassword}
              onChange={(e) => handlePasswordToggle(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Require password to view</span>
          </label>
          {usePassword && (
            <SNInput
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Enter password"
              fullWidth
            />
          )}
        </div>
      )}

      {/* Allow Embed */}
      {settings.visibility !== 'private' && (
        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.allowEmbed !== false}
              onChange={(e) => onAllowEmbedChange(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Allow embedding on other websites</span>
          </label>
        </div>
      )}
    </div>
  );
};

// Confirm Step Component
const ConfirmStep: React.FC<{
  settings: CanvasPublishSettings;
  canvasName: string;
  publishedUrl: string | null;
}> = ({ settings, canvasName, publishedUrl }) => {
  if (publishedUrl) {
    return (
      <div style={styles.confirmSuccess}>
        <div style={styles.successIcon}>
          <SNIcon name="check-circle" size="xl" />
        </div>
        <h3 style={styles.successTitle}>Published!</h3>
        <p style={styles.successText}>Your canvas is now live at:</p>
        <a href={publishedUrl} target="_blank" rel="noopener noreferrer" style={styles.successUrl}>
          {publishedUrl}
        </a>
      </div>
    );
  }

  return (
    <div style={styles.confirmContent}>
      <h3 style={styles.confirmTitle}>Ready to Publish</h3>
      <div style={styles.confirmSummary}>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Canvas</span>
          <span style={styles.summaryValue}>{canvasName}</span>
        </div>
        <div style={styles.summaryRow}>
          <span style={styles.summaryLabel}>Visibility</span>
          <span style={styles.summaryValue}>{settings.visibility}</span>
        </div>
        {settings.slug && (
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>URL</span>
            <span style={styles.summaryValue}>stickernest.app/c/{settings.slug}</span>
          </div>
        )}
        {settings.password && (
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Password</span>
            <span style={styles.summaryValue}>Protected</span>
          </div>
        )}
      </div>
      <p style={styles.confirmNote}>
        Click "Publish Now" to make your canvas available at the URL above.
        You can update or unpublish at any time.
      </p>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  dialog: {
    background: 'var(--sn-glass-bg, rgba(15, 15, 36, 0.95))',
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '1px solid var(--sn-border-primary)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--sn-border-primary)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: 'var(--sn-accent-primary)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
  },
  subtitle: {
    fontSize: 12,
    color: 'var(--sn-text-tertiary)',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--sn-border-primary)',
  },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 20,
    color: 'var(--sn-text-tertiary)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  stepActive: {
    color: 'var(--sn-text-primary)',
  },
  stepCurrent: {
    background: 'var(--sn-accent-primary)',
    color: 'white',
  },
  stepNumber: {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'var(--sn-bg-tertiary)',
    fontSize: 11,
    fontWeight: 600,
  },
  stepLabel: {
    fontWeight: 500,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    background: 'var(--sn-bg-tertiary)',
    margin: '0 8px',
  },
  stepConnectorActive: {
    background: 'var(--sn-accent-primary)',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTop: '1px solid var(--sn-border-primary)',
  },
  footerLeft: {},
  footerRight: {
    display: 'flex',
    gap: 8,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: 'var(--sn-error)',
    fontSize: 13,
    marginBottom: 16,
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    color: 'var(--sn-success)',
    fontSize: 13,
    marginBottom: 16,
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--sn-text-secondary)',
  },
  visibilityOptions: {
    display: 'flex',
    gap: 10,
  },
  visibilityButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '16px 8px',
    background: 'var(--sn-bg-tertiary)',
    border: '1px solid var(--sn-border-primary)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    color: 'var(--sn-text-secondary)',
  },
  visibilityActive: {
    background: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'var(--sn-accent-primary)',
    color: 'var(--sn-text-primary)',
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: 600,
  },
  visibilityDesc: {
    fontSize: 10,
    color: 'var(--sn-text-tertiary)',
    textAlign: 'center',
  },
  slugRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  slugPrefix: {
    fontSize: 13,
    color: 'var(--sn-text-tertiary)',
    whiteSpace: 'nowrap',
  },
  slugError: {
    fontSize: 11,
    color: 'var(--sn-error)',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'var(--sn-text-primary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--sn-accent-primary)',
  },
  confirmContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 16,
  },
  confirmSummary: {
    width: '100%',
    maxWidth: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 16,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
  },
  summaryLabel: {
    color: 'var(--sn-text-tertiary)',
  },
  summaryValue: {
    color: 'var(--sn-text-primary)',
    fontWeight: 500,
  },
  confirmNote: {
    fontSize: 12,
    color: 'var(--sn-text-tertiary)',
    lineHeight: 1.5,
    maxWidth: 350,
  },
  confirmSuccess: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 32,
    textAlign: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(34, 197, 94, 0.15)',
    borderRadius: '50%',
    color: 'var(--sn-success)',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--sn-text-primary)',
    marginBottom: 8,
  },
  successText: {
    fontSize: 13,
    color: 'var(--sn-text-tertiary)',
    marginBottom: 8,
  },
  successUrl: {
    fontSize: 14,
    color: 'var(--sn-accent-primary)',
    textDecoration: 'none',
    padding: '8px 16px',
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 6,
  },
};

export default PublishCanvasDialog;
