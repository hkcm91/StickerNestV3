/**
 * StickerNest v2 - Code Editor
 * Monaco-based code editor for widget HTML/JS/CSS editing
 */

import React, { useState, useRef, useCallback } from 'react';

export type EditorLanguage = 'html' | 'javascript' | 'css' | 'json';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  readOnly?: boolean;
  height?: number | string;
  theme?: 'dark' | 'light';
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  onSave?: (value: string) => void;
  onFormat?: () => void;
}

// Simple syntax highlighting patterns
const SYNTAX_PATTERNS: Record<EditorLanguage, { pattern: RegExp; className: string }[]> = {
  html: [
    { pattern: /(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, className: 'syntax-tag' },
    { pattern: /([a-zA-Z-]+)=/g, className: 'syntax-attr' },
    { pattern: /("[^"]*"|'[^']*')/g, className: 'syntax-string' },
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, className: 'syntax-comment' },
  ],
  javascript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|extends|import|export|from|async|await|new|this|true|false|null|undefined)\b/g, className: 'syntax-keyword' },
    { pattern: /("[^"]*"|'[^']*'|`[^`]*`)/g, className: 'syntax-string' },
    { pattern: /\b(\d+\.?\d*)\b/g, className: 'syntax-number' },
    { pattern: /(\/\/.*$)/gm, className: 'syntax-comment' },
    { pattern: /\b([A-Z][a-zA-Z0-9]*)\b/g, className: 'syntax-class' },
  ],
  css: [
    { pattern: /([.#][a-zA-Z][a-zA-Z0-9_-]*)/g, className: 'syntax-selector' },
    { pattern: /([a-zA-Z-]+):/g, className: 'syntax-property' },
    { pattern: /(#[0-9a-fA-F]{3,8}|\d+px|\d+em|\d+rem|\d+%)/g, className: 'syntax-value' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'syntax-comment' },
  ],
  json: [
    { pattern: /("[^"]*"):/g, className: 'syntax-key' },
    { pattern: /:\s*("[^"]*")/g, className: 'syntax-string' },
    { pattern: /:\s*(\d+\.?\d*)/g, className: 'syntax-number' },
    { pattern: /:\s*(true|false|null)/g, className: 'syntax-keyword' },
  ],
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'html',
  readOnly = false,
  height = 300,
  theme = 'dark',
  showLineNumbers = true,
  onSave,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync scroll between textarea and highlight div
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      onSave?.(value);
    }
    
    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        // Reset cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  }, [value, onChange, onSave]);

  // Simple syntax highlighting (applied to display layer)
  const highlightCode = useCallback((code: string): string => {
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    const patterns = SYNTAX_PATTERNS[language];
    if (patterns) {
      for (const { pattern, className } of patterns) {
        highlighted = highlighted.replace(pattern, `<span class="${className}">$1</span>`);
      }
    }
    
    return highlighted;
  }, [language]);

  // Generate line numbers
  const lineNumbers = value.split('\n').map((_, i) => i + 1);

  // CSS for syntax highlighting
  const syntaxStyles = `
    .syntax-tag { color: #f472b6; }
    .syntax-attr { color: #a78bfa; }
    .syntax-string { color: #34d399; }
    .syntax-comment { color: #64748b; font-style: italic; }
    .syntax-keyword { color: #f472b6; }
    .syntax-number { color: #fbbf24; }
    .syntax-class { color: #38bdf8; }
    .syntax-selector { color: #f472b6; }
    .syntax-property { color: #a78bfa; }
    .syntax-value { color: #34d399; }
    .syntax-key { color: #a78bfa; }
  `;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: typeof height === 'number' ? `${height}px` : height,
        background: theme === 'dark' ? '#0d1117' : '#ffffff',
        borderRadius: 6,
        border: `1px solid ${isFocused ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: theme === 'dark' ? '#161b22' : '#f6f8fa',
          borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e1e4e8'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              background: 'rgba(139, 92, 246, 0.2)',
              borderRadius: 4,
              color: '#a78bfa',
              textTransform: 'uppercase',
            }}
          >
            {language}
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            {value.split('\n').length} lines
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onSave && (
            <button
              onClick={() => onSave(value)}
              style={{
                padding: '4px 8px',
                background: '#8b5cf6',
                border: 'none',
                borderRadius: 4,
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              💾 Save
            </button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <style>{syntaxStyles}</style>
        
        {/* Line Numbers */}
        {showLineNumbers && (
          <div
            style={{
              padding: '10px 8px',
              background: theme === 'dark' ? '#161b22' : '#f6f8fa',
              borderRight: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e1e4e8'}`,
              textAlign: 'right',
              userSelect: 'none',
              overflow: 'hidden',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              color: '#64748b',
            }}
          >
            {lineNumbers.map(num => (
              <div key={num}>{num}</div>
            ))}
          </div>
        )}

        {/* Code Display (with syntax highlighting) */}
        <div
          ref={highlightRef}
          style={{
            position: 'absolute',
            top: 0,
            left: showLineNumbers ? 50 : 0,
            right: 0,
            bottom: 0,
            padding: 10,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            color: theme === 'dark' ? '#e2e8f0' : '#24292e',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'auto',
            pointerEvents: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: highlightCode(value) || '&nbsp;' }}
        />

        {/* Actual Textarea (invisible but functional) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: showLineNumbers ? 50 : 0,
            right: 0,
            bottom: 0,
            padding: 10,
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            color: 'transparent',
            caretColor: theme === 'dark' ? '#e2e8f0' : '#24292e',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'auto',
          }}
        />
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 10px',
          background: theme === 'dark' ? '#161b22' : '#f6f8fa',
          borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e1e4e8'}`,
          fontSize: '0.65rem',
          color: '#64748b',
        }}
      >
        <span>{value.length} chars</span>
        <span>Ctrl+S to save • Tab to indent</span>
      </div>
    </div>
  );
};

export default CodeEditor;

