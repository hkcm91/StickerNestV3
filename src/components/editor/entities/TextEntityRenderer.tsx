/**
 * StickerNest v2 - Text Entity Renderer
 *
 * Renders text entities with typography controls.
 * Supports inline editing when double-clicked.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CanvasTextEntity } from '../../../types/canvasEntity';
import { useCanvasEntityStore } from '../../../state/useCanvasEntityStore';

// ============================================================================
// Types
// ============================================================================

interface TextEntityRendererProps {
  entity: CanvasTextEntity;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function TextEntityRenderer({
  entity,
  isEditing = false,
  onStartEditing,
  onStopEditing,
}: TextEntityRendererProps) {
  const updateEntity = useCanvasEntityStore((s) => s.updateEntity);
  const textRef = useRef<HTMLDivElement>(null);
  const [localContent, setLocalContent] = useState(entity.content);

  // Sync local content with entity when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(entity.content);
    }
  }, [entity.content, isEditing]);

  // Focus the text element when entering edit mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      // Set initial content as text (not HTML) to prevent XSS
      textRef.current.textContent = localContent;
      textRef.current.focus();
      // Select all text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing, localContent]);

  // Handle content changes
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setLocalContent(newContent);
  }, []);

  // Save content when blur
  const handleBlur = useCallback(() => {
    if (localContent !== entity.content) {
      updateEntity(entity.id, { content: localContent });
    }
    onStopEditing?.();
  }, [entity.id, entity.content, localContent, updateEntity, onStopEditing]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalContent(entity.content);
        onStopEditing?.();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    },
    [entity.content, handleBlur, onStopEditing]
  );

  // Compute text styles
  const textStyle = useMemo((): React.CSSProperties => {
    return {
      width: '100%',
      height: '100%',
      fontFamily: entity.fontFamily,
      fontSize: entity.fontSize,
      fontWeight: entity.fontWeight,
      color: entity.color,
      textAlign: entity.textAlign,
      lineHeight: entity.lineHeight,
      letterSpacing: entity.letterSpacing,
      textDecoration: entity.textDecoration,
      outline: 'none',
      border: 'none',
      background: 'transparent',
      padding: 0,
      margin: 0,
      overflow: 'hidden',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      cursor: isEditing ? 'text' : 'inherit',
    };
  }, [entity, isEditing]);

  // Render editable or static text
  if (isEditing) {
    return (
      <div
        ref={textRef}
        contentEditable
        suppressContentEditableWarning
        style={textStyle}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        // Content is set via useEffect using textContent to prevent XSS
      />
    );
  }

  return (
    <div
      style={textStyle}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEditing?.();
      }}
    >
      {entity.content || 'Double-click to edit'}
    </div>
  );
}

export default TextEntityRenderer;
