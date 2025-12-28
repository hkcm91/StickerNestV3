/**
 * StickerNest v2 - Publish Preview Panel
 * Shows a preview of how the published page will appear
 *
 * ALPHA NOTES:
 * - Shows mobile/desktop preview modes
 * - Displays social share preview cards
 * - Shows validation warnings/errors
 */

import React, { useState } from 'react';
import { SNIcon } from '../../shared-ui/SNIcon';
import { SNButton } from '../../shared-ui/SNButton';
import type { CanvasPublishSettings, PublishValidationResult } from '../../types/publish';
import { generatePublicUrl } from '../../types/publish';

type PreviewMode = 'desktop' | 'mobile' | 'social';

interface PublishPreviewPanelProps {
  /** Publish settings */
  settings: CanvasPublishSettings;
  /** Canvas name */
  canvasName: string;
  /** Canvas thumbnail URL */
  thumbnailUrl?: string;
  /** Validation results */
  validation: PublishValidationResult | null;
  /** Widget count */
  widgetCount: number;
}

export const PublishPreviewPanel: React.FC<PublishPreviewPanelProps> = ({
  settings,
  canvasName,
  thumbnailUrl,
  validation,
  widgetCount,
}) => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');

  const publicUrl = settings.slug ? generatePublicUrl(settings.slug) : '';
  const pageTitle = settings.seo?.title || canvasName;
  const pageDescription = settings.seo?.description || '';

  return (
    <div style={styles.container}>
      {/* Preview Mode Tabs */}
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(previewMode === 'desktop' ? styles.tabActive : {}),
          }}
          onClick={() => setPreviewMode('desktop')}
        >
          <SNIcon name="monitor" size="sm" />
          Desktop
        </button>
        <button
          style={{
            ...styles.tab,
            ...(previewMode === 'mobile' ? styles.tabActive : {}),
          }}
          onClick={() => setPreviewMode('mobile')}
        >
          <SNIcon name="smartphone" size="sm" />
          Mobile
        </button>
        <button
          style={{
            ...styles.tab,
            ...(previewMode === 'social' ? styles.tabActive : {}),
          }}
          onClick={() => setPreviewMode('social')}
        >
          <SNIcon name="share" size="sm" />
          Social
        </button>
      </div>

      {/* Preview Content */}
      <div style={styles.previewContainer}>
        {previewMode === 'desktop' && (
          <DesktopPreview
            url={publicUrl}
            title={pageTitle}
            thumbnailUrl={thumbnailUrl}
            widgetCount={widgetCount}
          />
        )}
        {previewMode === 'mobile' && (
          <MobilePreview
            url={publicUrl}
            title={pageTitle}
            thumbnailUrl={thumbnailUrl}
          />
        )}
        {previewMode === 'social' && (
          <SocialPreview
            url={publicUrl}
            title={pageTitle}
            description={pageDescription}
            thumbnailUrl={thumbnailUrl}
          />
        )}
      </div>

      {/* Validation Summary */}
      {validation && (
        <div style={styles.validationSection}>
          <ValidationSummary validation={validation} />
        </div>
      )}

      {/* URL Preview */}
      {settings.slug && (
        <div style={styles.urlPreview}>
          <span style={styles.urlLabel}>Public URL:</span>
          <code style={styles.urlCode}>{publicUrl}</code>
          <SNButton
            variant="ghost"
            size="sm"
            leftIcon="copy"
            onClick={() => navigator.clipboard.writeText(publicUrl)}
            tooltip="Copy URL"
          />
        </div>
      )}
    </div>
  );
};

// Desktop Preview Component
const DesktopPreview: React.FC<{
  url: string;
  title: string;
  thumbnailUrl?: string;
  widgetCount: number;
}> = ({ url, title, thumbnailUrl, widgetCount }) => (
  <div style={styles.browserFrame}>
    {/* Browser Chrome */}
    <div style={styles.browserChrome}>
      <div style={styles.browserDots}>
        <span style={{ ...styles.dot, background: '#ff5f57' }} />
        <span style={{ ...styles.dot, background: '#febc2e' }} />
        <span style={{ ...styles.dot, background: '#28c840' }} />
      </div>
      <div style={styles.browserUrlBar}>
        <SNIcon name="lock" size="xs" />
        <span style={styles.browserUrl}>{url || 'stickernest.app/c/...'}</span>
      </div>
    </div>
    {/* Page Content */}
    <div style={styles.browserContent}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <span style={styles.pageLogo}>StickerNest</span>
        <span style={styles.pageTitle}>{title}</span>
      </div>
      {/* Canvas Area */}
      <div style={styles.canvasArea}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="Canvas preview" style={styles.thumbnail} />
        ) : (
          <div style={styles.placeholderCanvas}>
            <SNIcon name="layout" size="xl" />
            <span>{widgetCount} widgets</span>
          </div>
        )}
      </div>
      {/* Footer */}
      <div style={styles.pageFooter}>
        Created with StickerNest
      </div>
    </div>
  </div>
);

// Mobile Preview Component
const MobilePreview: React.FC<{
  url: string;
  title: string;
  thumbnailUrl?: string;
}> = ({ url, title, thumbnailUrl }) => (
  <div style={styles.mobileFrame}>
    {/* Status Bar */}
    <div style={styles.mobileStatusBar}>
      <span>9:41</span>
      <span style={styles.mobileNotch} />
      <span style={{ display: 'flex', gap: 4 }}>
        <SNIcon name="signal" size="xs" />
        <SNIcon name="wifi" size="xs" />
        <SNIcon name="battery" size="xs" />
      </span>
    </div>
    {/* Content */}
    <div style={styles.mobileContent}>
      <div style={styles.mobileHeader}>
        <span style={styles.mobileLogo}>SN</span>
        <span style={styles.mobileTitle}>{title}</span>
      </div>
      <div style={styles.mobileCanvas}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="Canvas" style={styles.mobileThumbnail} />
        ) : (
          <div style={styles.mobilePlaceholder}>
            <SNIcon name="layout" size="lg" />
          </div>
        )}
      </div>
    </div>
    {/* Home Indicator */}
    <div style={styles.mobileHomeIndicator} />
  </div>
);

// Social Preview Component
const SocialPreview: React.FC<{
  url: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
}> = ({ url, title, description, thumbnailUrl }) => (
  <div style={styles.socialContainer}>
    {/* Twitter Card */}
    <div style={styles.socialCard}>
      <div style={styles.socialPlatform}>
        <SNIcon name="twitter" size="sm" />
        Twitter / X
      </div>
      <div style={styles.twitterCard}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="OG" style={styles.socialImage} />
        ) : (
          <div style={styles.socialImagePlaceholder}>
            <SNIcon name="image" size="lg" />
          </div>
        )}
        <div style={styles.twitterContent}>
          <div style={styles.twitterTitle}>{title || 'Page Title'}</div>
          <div style={styles.twitterDescription}>
            {description || 'Add a description to improve social sharing...'}
          </div>
          <div style={styles.twitterUrl}>{new URL(url || 'https://stickernest.app').hostname}</div>
        </div>
      </div>
    </div>

    {/* Facebook/LinkedIn Card */}
    <div style={styles.socialCard}>
      <div style={styles.socialPlatform}>
        <SNIcon name="facebook" size="sm" />
        Facebook / LinkedIn
      </div>
      <div style={styles.facebookCard}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="OG" style={styles.facebookImage} />
        ) : (
          <div style={styles.facebookImagePlaceholder}>
            <SNIcon name="image" size="xl" />
          </div>
        )}
        <div style={styles.facebookContent}>
          <div style={styles.facebookUrl}>{new URL(url || 'https://stickernest.app').hostname.toUpperCase()}</div>
          <div style={styles.facebookTitle}>{title || 'Page Title'}</div>
          <div style={styles.facebookDescription}>
            {description || 'No description provided'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Validation Summary Component
const ValidationSummary: React.FC<{ validation: PublishValidationResult }> = ({ validation }) => {
  const { isValid, errors, warnings } = validation;

  if (isValid && warnings.length === 0) {
    return (
      <div style={styles.validationSuccess}>
        <SNIcon name="check-circle" size="sm" />
        <span>Ready to publish</span>
      </div>
    );
  }

  return (
    <div style={styles.validationList}>
      {errors.map((error, i) => (
        <div key={i} style={styles.validationError}>
          <SNIcon name="x-circle" size="sm" />
          <span>{error.message}</span>
        </div>
      ))}
      {warnings.map((warning, i) => (
        <div key={i} style={styles.validationWarning}>
          <SNIcon name="alert-triangle" size="sm" />
          <span>{warning.message}</span>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: 4,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-md)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--sn-radius-sm)',
    color: 'var(--sn-text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  tabActive: {
    background: 'var(--sn-bg-primary)',
    color: 'var(--sn-text-primary)',
  },
  previewContainer: {
    minHeight: 280,
    display: 'flex',
    justifyContent: 'center',
    padding: 16,
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-lg)',
    overflow: 'hidden',
  },
  // Browser Frame Styles
  browserFrame: {
    width: '100%',
    maxWidth: 400,
    background: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  browserChrome: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    background: '#2d2d2d',
    borderBottom: '1px solid #3d3d3d',
  },
  browserDots: {
    display: 'flex',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  browserUrlBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    background: '#1e1e1e',
    borderRadius: 4,
    fontSize: 11,
    color: '#888',
  },
  browserUrl: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  browserContent: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 180,
    background: 'var(--sn-bg-primary)',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderBottom: '1px solid var(--sn-border-primary)',
    fontSize: 11,
  },
  pageLogo: {
    fontWeight: 700,
    color: 'var(--sn-accent-primary)',
  },
  pageTitle: {
    color: 'var(--sn-text-primary)',
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  thumbnail: {
    maxWidth: '100%',
    maxHeight: 120,
    borderRadius: 4,
    objectFit: 'contain',
  },
  placeholderCanvas: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    color: 'var(--sn-text-tertiary)',
    fontSize: 11,
  },
  pageFooter: {
    padding: 6,
    textAlign: 'center',
    fontSize: 9,
    color: 'var(--sn-text-tertiary)',
    borderTop: '1px solid var(--sn-border-primary)',
  },
  // Mobile Frame Styles
  mobileFrame: {
    width: 180,
    background: '#1c1c1e',
    borderRadius: 24,
    padding: 8,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  mobileStatusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 12px',
    fontSize: 9,
    color: '#fff',
  },
  mobileNotch: {
    width: 60,
    height: 16,
    background: '#000',
    borderRadius: 8,
  },
  mobileContent: {
    background: 'var(--sn-bg-primary)',
    borderRadius: 16,
    minHeight: 200,
    overflow: 'hidden',
  },
  mobileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderBottom: '1px solid var(--sn-border-primary)',
  },
  mobileLogo: {
    fontWeight: 700,
    fontSize: 10,
    color: 'var(--sn-accent-primary)',
  },
  mobileTitle: {
    fontSize: 9,
    color: 'var(--sn-text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileCanvas: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minHeight: 140,
  },
  mobileThumbnail: {
    maxWidth: '100%',
    maxHeight: 100,
    borderRadius: 4,
  },
  mobilePlaceholder: {
    color: 'var(--sn-text-tertiary)',
  },
  mobileHomeIndicator: {
    width: 100,
    height: 4,
    background: '#fff',
    borderRadius: 2,
    margin: '8px auto',
  },
  // Social Preview Styles
  socialContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  socialCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  socialPlatform: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'var(--sn-text-tertiary)',
  },
  twitterCard: {
    display: 'flex',
    background: '#15202b',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #38444d',
  },
  socialImage: {
    width: 120,
    height: 80,
    objectFit: 'cover',
  },
  socialImagePlaceholder: {
    width: 120,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-tertiary)',
    color: 'var(--sn-text-tertiary)',
  },
  twitterContent: {
    flex: 1,
    padding: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  twitterTitle: {
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
  },
  twitterDescription: {
    fontSize: 11,
    color: '#8899a6',
    lineHeight: 1.3,
  },
  twitterUrl: {
    fontSize: 10,
    color: '#8899a6',
  },
  facebookCard: {
    background: '#242526',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #3e4042',
  },
  facebookImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
  },
  facebookImagePlaceholder: {
    width: '100%',
    height: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--sn-bg-tertiary)',
    color: 'var(--sn-text-tertiary)',
  },
  facebookContent: {
    padding: 10,
  },
  facebookUrl: {
    fontSize: 10,
    color: '#b0b3b8',
    marginBottom: 4,
  },
  facebookTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e4e6eb',
    marginBottom: 2,
  },
  facebookDescription: {
    fontSize: 11,
    color: '#b0b3b8',
  },
  // Validation Styles
  validationSection: {
    padding: '12px 0',
  },
  validationSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--sn-success)',
    fontSize: 13,
  },
  validationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  validationError: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: 'var(--sn-error)',
    fontSize: 12,
  },
  validationWarning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: 'var(--sn-warning)',
    fontSize: 12,
  },
  // URL Preview
  urlPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--sn-bg-tertiary)',
    borderRadius: 'var(--sn-radius-md)',
  },
  urlLabel: {
    fontSize: 11,
    color: 'var(--sn-text-tertiary)',
  },
  urlCode: {
    flex: 1,
    fontSize: 11,
    color: 'var(--sn-text-primary)',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

export default PublishPreviewPanel;
