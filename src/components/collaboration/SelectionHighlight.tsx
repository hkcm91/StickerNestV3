/**
 * StickerNest v2 - Selection Highlight
 *
 * Renders visual highlights around widgets that remote users have selected.
 * Shows colored borders and user indicators for collaborative editing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollaborationService, type RemoteUser } from '../../services/CollaborationService';
import { useCollaborationStore } from '../../state/useCollaborationStore';
import { useCanvasStore } from '../../state/useCanvasStore';

// ==================
// Types
// ==================

interface SelectionData {
  userId: string;
  username: string;
  color: string;
  selectedIds: string[];
  lastUpdated: number;
}

interface WidgetBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionHighlightProps {
  /** Canvas zoom level */
  zoom?: number;
  /** Canvas pan offset */
  panOffset?: { x: number; y: number };
  /** Time before hiding stale selections */
  staleTimeout?: number;
  /** Show user labels on selections */
  showLabels?: boolean;
}

// ==================
// Selection Box Component
// ==================

interface SelectionBoxProps {
  bounds: WidgetBounds;
  color: string;
  username: string;
  zoom: number;
  showLabel: boolean;
}

const SelectionBox: React.FC<SelectionBoxProps> = React.memo(({
  bounds,
  color,
  username,
  zoom,
  showLabel,
}) => {
  const borderWidth = 2 / zoom;
  const labelFontSize = 10 / zoom;
  const labelPadding = 4 / zoom;

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        border: `${borderWidth}px solid ${color}`,
        borderRadius: 4 / zoom,
        pointerEvents: 'none',
        boxSizing: 'border-box',
        boxShadow: `0 0 ${8 / zoom}px ${color}40`,
        transition: 'all 100ms ease-out',
      }}
    >
      {/* User label at top-left */}
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            top: -labelFontSize - labelPadding * 3,
            left: -borderWidth,
            background: color,
            color: 'white',
            padding: `${labelPadding / 2}px ${labelPadding}px`,
            borderRadius: `${3 / zoom}px`,
            fontSize: labelFontSize,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            maxWidth: bounds.width,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {username}
        </div>
      )}

      {/* Corner indicators */}
      <div
        style={{
          position: 'absolute',
          top: -3 / zoom,
          left: -3 / zoom,
          width: 6 / zoom,
          height: 6 / zoom,
          background: color,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -3 / zoom,
          right: -3 / zoom,
          width: 6 / zoom,
          height: 6 / zoom,
          background: color,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -3 / zoom,
          left: -3 / zoom,
          width: 6 / zoom,
          height: 6 / zoom,
          background: color,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -3 / zoom,
          right: -3 / zoom,
          width: 6 / zoom,
          height: 6 / zoom,
          background: color,
          borderRadius: '50%',
        }}
      />
    </div>
  );
});

SelectionBox.displayName = 'SelectionBox';

// ==================
// Main Component
// ==================

export const SelectionHighlight: React.FC<SelectionHighlightProps> = ({
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  staleTimeout = 5000,
  showLabels = true,
}) => {
  // Track remote selections
  const [selections, setSelections] = useState<Map<string, SelectionData>>(new Map());

  // Get widget bounds from canvas store
  const widgets = useCanvasStore((s) => s.widgets);

  // Get collaborators from collaboration store
  const collaborators = useCollaborationStore((s) => Array.from(s.collaborators.values()));

  // Get collaborator info by ID
  const getCollaboratorInfo = useCallback((userId: string) => {
    const collaborator = collaborators.find(c => c.id === userId);
    return {
      username: collaborator?.displayName || `User ${userId.slice(-4)}`,
      color: collaborator?.color || '#6366f1',
    };
  }, [collaborators]);

  // Get widget bounds by ID
  const getWidgetBounds = useCallback((widgetId: string): WidgetBounds | null => {
    const widget = widgets.get(widgetId);
    if (!widget) return null;

    return {
      id: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      width: widget.width,
      height: widget.height,
    };
  }, [widgets]);

  // Handle selection updates from CollaborationService
  useEffect(() => {
    const handleEvent = (event: { type: string; data?: unknown }) => {
      if (event.type === 'selection:changed') {
        const { userId, selectedIds } = event.data as {
          userId: string;
          selectedIds: string[];
        };

        setSelections(prev => {
          const newSelections = new Map(prev);
          const { username, color } = getCollaboratorInfo(userId);

          if (selectedIds.length === 0) {
            newSelections.delete(userId);
          } else {
            newSelections.set(userId, {
              userId,
              username,
              color,
              selectedIds,
              lastUpdated: Date.now(),
            });
          }

          return newSelections;
        });
      }

      if (event.type === 'user:left') {
        const { userId } = event.data as { userId: string };
        setSelections(prev => {
          const newSelections = new Map(prev);
          newSelections.delete(userId);
          return newSelections;
        });
      }
    };

    const unsubscribe = CollaborationService.onEvent(handleEvent);
    return () => unsubscribe();
  }, [getCollaboratorInfo]);

  // Sync with remote users from service
  useEffect(() => {
    const remoteUsers = CollaborationService.getRemoteUsers();
    if (remoteUsers.length > 0) {
      setSelections(prev => {
        const newSelections = new Map(prev);
        remoteUsers.forEach(user => {
          if (user.selectedIds && user.selectedIds.length > 0 && !newSelections.has(user.id)) {
            const { username, color } = getCollaboratorInfo(user.id);
            newSelections.set(user.id, {
              userId: user.id,
              username: user.username || username,
              color: user.color || color,
              selectedIds: user.selectedIds,
              lastUpdated: Date.now(),
            });
          }
        });
        return newSelections;
      });
    }
  }, [getCollaboratorInfo]);

  // Stale selection cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSelections(prev => {
        let hasChanges = false;
        const newSelections = new Map(prev);

        newSelections.forEach((selection, id) => {
          if (now - selection.lastUpdated > staleTimeout) {
            newSelections.delete(id);
            hasChanges = true;
          }
        });

        return hasChanges ? newSelections : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [staleTimeout]);

  // Build list of selection boxes to render
  const selectionBoxes = useMemo(() => {
    const boxes: Array<{
      key: string;
      bounds: WidgetBounds;
      color: string;
      username: string;
    }> = [];

    selections.forEach(selection => {
      selection.selectedIds.forEach(widgetId => {
        const bounds = getWidgetBounds(widgetId);
        if (bounds) {
          boxes.push({
            key: `${selection.userId}-${widgetId}`,
            bounds,
            color: selection.color,
            username: selection.username,
          });
        }
      });
    });

    return boxes;
  }, [selections, getWidgetBounds]);

  if (selectionBoxes.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 9997,
      }}
    >
      {selectionBoxes.map(({ key, bounds, color, username }) => (
        <SelectionBox
          key={key}
          bounds={bounds}
          color={color}
          username={username}
          zoom={zoom}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
};

export default SelectionHighlight;
