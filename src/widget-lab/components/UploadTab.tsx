/**
 * Upload Tab Component
 * Tab content for uploading widget bundles
 */

import React from 'react';
import { theme } from '../theme';
import { WidgetUploader } from '../WidgetUploader';
import { WidgetPreview } from '../WidgetPreview';
import type { WidgetManifest } from '../../types/manifest';

export interface UploadTabProps {
  labManifest: WidgetManifest | null;
  setLabManifest: React.Dispatch<React.SetStateAction<WidgetManifest | null>>;
  labFiles: File[];
  setLabFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  labManifest,
  setLabManifest,
  labFiles,
  setLabFiles,
}) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {!labManifest ? (
        <div style={{
          background: theme.bg.secondary,
          borderRadius: '8px',
          border: `1px solid ${theme.border}`,
          padding: '24px',
        }}>
          <p style={{ color: theme.text.secondary, marginBottom: '20px', fontSize: '14px' }}>
            Upload a widget bundle (manifest.json + assets) to preview and test it.
          </p>
          <WidgetUploader
            onUpload={(manifest, files) => {
              setLabManifest(manifest);
              setLabFiles(files);
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <button
              onClick={() => { setLabManifest(null); setLabFiles([]); }}
              style={{
                padding: '10px 16px',
                background: theme.bg.secondary,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                color: theme.text.primary,
                fontSize: '13px',
              }}
            >
              ← Back
            </button>
            <div style={{ fontWeight: 500, color: theme.text.primary, fontSize: '14px' }}>
              {labManifest.name}
            </div>
          </div>
          <div style={{
            flex: 1,
            minHeight: '400px',
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            overflow: 'hidden',
            background: theme.bg.secondary,
          }}>
            <WidgetPreview manifest={labManifest} files={labFiles} />
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTab;
