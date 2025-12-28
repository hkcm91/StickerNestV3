/**
 * Widget Generator 2.0 - Tab 3: Code Output
 *
 * Read-only code view (unless expert mode enabled):
 * - index.html
 * - state.ts
 * - actions.ts
 * - manifest.json
 * - tests
 *
 * With "Regenerate from SpecJSON" button
 */

import { useState, useMemo } from 'react';
import type { SpecJSON, GeneratedWidgetPackage, GeneratedFile } from '../../../types/specjson';

interface CodeOutputProps {
  spec: SpecJSON;
  package: GeneratedWidgetPackage | null;
  expertMode: boolean;
  onRegenerate: () => void;
}

type FileType = GeneratedFile['type'];

const FILE_ICONS: Record<FileType, string> = {
  manifest: '📄',
  index: '🌐',
  state: '📦',
  actions: '🎬',
  styles: '🎨',
  test: '🧪',
  asset: '🖼️'
};

const FILE_LABELS: Record<FileType, string> = {
  manifest: 'manifest.json',
  index: 'index.html',
  state: 'state.ts',
  actions: 'actions.ts',
  styles: 'styles.css',
  test: 'widget.test.ts',
  asset: 'Asset'
};

export function CodeOutput({ spec, package: pkg, expertMode, onRegenerate }: CodeOutputProps) {
  const [activeFile, setActiveFile] = useState<string>('index.html');

  // Group files by type
  const files = useMemo(() => {
    if (!pkg) return [];
    return pkg.files;
  }, [pkg]);

  // Get current file content
  const currentFile = useMemo(() => {
    return files.find(f => f.path === activeFile);
  }, [files, activeFile]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!pkg) return null;
    const totalSize = files.reduce((acc, f) => acc + f.content.length, 0);
    const lineCount = files.reduce((acc, f) => acc + f.content.split('\n').length, 0);
    return {
      totalSize,
      lineCount,
      fileCount: files.length
    };
  }, [pkg, files]);

  // Syntax highlighting helper (basic)
  const highlightCode = (code: string, type: string): string => {
    // Very basic syntax highlighting
    if (type === 'json') {
      return code
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]+)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false|null)/g, ': <span class="json-boolean">$1</span>');
    }
    if (type === 'html' || type === 'tsx') {
      return code
        .replace(/(&lt;\/?)(\w+)/g, '$1<span class="html-tag">$2</span>')
        .replace(/(\w+)=/g, '<span class="html-attr">$1</span>=')
        .replace(/"([^"]+)"/g, '<span class="html-string">"$1"</span>')
        .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
        .replace(/(function|const|let|var|if|else|return|export|import)\b/g, '<span class="keyword">$1</span>');
    }
    if (type === 'css') {
      return code
        .replace(/([.#]?\w+)\s*\{/g, '<span class="css-selector">$1</span> {')
        .replace(/([\w-]+):/g, '<span class="css-property">$1</span>:')
        .replace(/:\s*([^;]+);/g, ': <span class="css-value">$1</span>;');
    }
    return code;
  };

  const getFileType = (path: string): string => {
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.tsx') || path.endsWith('.ts')) return 'tsx';
    if (path.endsWith('.css')) return 'css';
    return 'text';
  };

  return (
    <div className="code-output">
      {/* Toolbar */}
      <div className="code-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">Generated Code</span>
          {pkg && (
            <span className="generation-info">
              Generated at {new Date(pkg.generatedAt).toLocaleTimeString()}
              {' • '}
              Template v{pkg.templateVersion}
            </span>
          )}
        </div>
        <div className="toolbar-right">
          {stats && (
            <div className="stats">
              <span className="stat">
                <span className="stat-value">{stats.fileCount}</span>
                <span className="stat-label">files</span>
              </span>
              <span className="stat">
                <span className="stat-value">{stats.lineCount.toLocaleString()}</span>
                <span className="stat-label">lines</span>
              </span>
              <span className="stat">
                <span className="stat-value">{(stats.totalSize / 1024).toFixed(1)}KB</span>
                <span className="stat-label">total</span>
              </span>
            </div>
          )}
          <button className="regenerate-btn" onClick={onRegenerate}>
            <span className="btn-icon">🔄</span>
            Regenerate from SpecJSON
          </button>
        </div>
      </div>

      {/* Main Content */}
      {!pkg ? (
        <div className="empty-state">
          <span className="empty-icon">💻</span>
          <h3>No Code Generated</h3>
          <p>Click "Generate" to compile your SpecJSON into widget code</p>
          <button className="generate-btn" onClick={onRegenerate}>
            <span>⚡</span> Generate Code
          </button>
        </div>
      ) : (
        <div className="code-viewer">
          {/* File List */}
          <div className="file-list">
            <div className="file-list-header">
              <span className="folder-icon">📁</span>
              <span>{spec.id}/</span>
            </div>
            {files.map(file => (
              <button
                key={file.path}
                className={`file-item ${activeFile === file.path ? 'active' : ''}`}
                onClick={() => setActiveFile(file.path)}
              >
                <span className="file-icon">{FILE_ICONS[file.type]}</span>
                <span className="file-name">{file.path}</span>
                <span className="file-size">{(file.content.length / 1024).toFixed(1)}KB</span>
              </button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="code-editor">
            <div className="editor-header">
              <span className="editor-filename">
                {FILE_ICONS[currentFile?.type || 'asset']} {activeFile}
              </span>
              <div className="editor-actions">
                <button
                  className="editor-btn"
                  onClick={() => navigator.clipboard.writeText(currentFile?.content || '')}
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
                <button
                  className="editor-btn"
                  onClick={() => {
                    const blob = new Blob([currentFile?.content || ''], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = activeFile;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  title="Download file"
                >
                  💾 Download
                </button>
              </div>
            </div>
            <div className="editor-content">
              {expertMode ? (
                <textarea
                  className="code-textarea"
                  value={currentFile?.content || ''}
                  onChange={() => {/* TODO: Handle edit in expert mode */}}
                  spellCheck={false}
                />
              ) : (
                <pre className="code-pre">
                  <code
                    className={`language-${getFileType(activeFile)}`}
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(
                        escapeHtml(currentFile?.content || ''),
                        getFileType(activeFile)
                      )
                    }}
                  />
                </pre>
              )}
            </div>
            <div className="editor-footer">
              <span className="line-count">
                {(currentFile?.content || '').split('\n').length} lines
              </span>
              {!expertMode && (
                <span className="readonly-badge">Read-only (enable Expert Mode to edit)</span>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .code-output {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }

        .code-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .toolbar-title {
          font-weight: 600;
          font-size: 14px;
        }

        .generation-info {
          font-size: 12px;
          color: var(--text-secondary, #888);
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .stats {
          display: flex;
          gap: 16px;
        }

        .stat {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .stat-value {
          font-weight: 600;
          font-size: 14px;
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-muted, #666);
        }

        .regenerate-btn {
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
          font-weight: 500;
        }

        .regenerate-btn:hover {
          background: var(--accent-hover, #5a6fd6);
        }

        /* Empty State */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
          color: var(--text-secondary, #888);
        }

        .empty-icon {
          font-size: 64px;
        }

        .empty-state h3 {
          margin: 0;
          color: var(--text-primary, #fff);
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--accent-color, #667eea);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          margin-top: 8px;
        }

        /* Code Viewer */
        .code-viewer {
          flex: 1;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 16px;
          min-height: 0;
        }

        .file-list {
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          overflow: hidden;
        }

        .file-list-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--bg-tertiary, #252525);
          border-bottom: 1px solid var(--border-color, #333);
          font-family: monospace;
          font-size: 13px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #888);
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          transition: all 0.2s;
        }

        .file-item:hover {
          background: var(--bg-hover, #252525);
          color: var(--text-primary, #fff);
        }

        .file-item.active {
          background: var(--accent-color, #667eea);
          color: white;
        }

        .file-icon {
          font-size: 14px;
        }

        .file-name {
          flex: 1;
          font-family: monospace;
        }

        .file-size {
          font-size: 11px;
          opacity: 0.7;
        }

        .code-editor {
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 8px;
          overflow: hidden;
        }

        .editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--bg-tertiary, #252525);
          border-bottom: 1px solid var(--border-color, #333);
        }

        .editor-filename {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-size: 13px;
        }

        .editor-actions {
          display: flex;
          gap: 8px;
        }

        .editor-btn {
          padding: 6px 12px;
          background: var(--bg-quaternary, #1a1a1a);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          font-size: 12px;
        }

        .editor-btn:hover {
          background: var(--bg-hover, #333);
          color: var(--text-primary, #fff);
        }

        .editor-content {
          flex: 1;
          overflow: auto;
          padding: 16px;
        }

        .code-textarea {
          width: 100%;
          height: 100%;
          padding: 0;
          background: transparent;
          border: none;
          color: var(--text-primary, #fff);
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.6;
          resize: none;
        }

        .code-textarea:focus {
          outline: none;
        }

        .code-pre {
          margin: 0;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.6;
          white-space: pre;
          overflow-x: auto;
        }

        .code-pre code {
          display: block;
        }

        /* Syntax Highlighting */
        .json-key { color: #9cdcfe; }
        .json-string { color: #ce9178; }
        .json-number { color: #b5cea8; }
        .json-boolean { color: #569cd6; }
        .html-tag { color: #569cd6; }
        .html-attr { color: #9cdcfe; }
        .html-string { color: #ce9178; }
        .comment { color: #6a9955; }
        .keyword { color: #c586c0; }
        .css-selector { color: #d7ba7d; }
        .css-property { color: #9cdcfe; }
        .css-value { color: #ce9178; }

        .editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: var(--bg-tertiary, #252525);
          border-top: 1px solid var(--border-color, #333);
          font-size: 11px;
          color: var(--text-muted, #666);
        }

        .readonly-badge {
          color: var(--warning-color, #f39c12);
        }
      `}</style>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default CodeOutput;
