/**
 * useSpawnEvents
 * Handle spawn events from toolbar widgets (text, shapes, etc.)
 */

import { useRef, useCallback, useEffect } from 'react';
import type { EventBus } from '../../runtime/EventBus';
import type { Event } from '../../types/runtime';
import type { MainCanvasRef } from '../../canvas/MainCanvas';

export interface UseSpawnEventsOptions {
  canvasIds: string[];
  getEventBus: (canvasId: string) => EventBus;
  getCanvasInstance: (canvasId: string) => MainCanvasRef | null;
}

export function useSpawnEvents(options: UseSpawnEventsOptions) {
  const { canvasIds, getEventBus, getCanvasInstance } = options;

  // Track recent spawn events to prevent duplicates (React strict mode double-invokes)
  const recentSpawnsRef = useRef<Set<string>>(new Set());

  // Handle spawn events from Modular Toolbar widget
  const handleSpawnEvent = useCallback((canvasId: string, event: Event) => {
    const { portName, value } = event.payload || {};
    if (!portName?.startsWith('spawn.') && !portName?.startsWith('canvas.')) return;

    // Prevent duplicate spawns at same position within 100ms
    const spawnKey = `${canvasId}:${portName}:${value?.x}:${value?.y}:${Math.floor(Date.now() / 100)}`;
    if (recentSpawnsRef.current.has(spawnKey)) {
      console.log('[useSpawnEvents] Ignoring duplicate spawn:', spawnKey);
      return;
    }
    recentSpawnsRef.current.add(spawnKey);
    setTimeout(() => recentSpawnsRef.current.delete(spawnKey), 200);

    const canvas = getCanvasInstance(canvasId);
    if (!canvas) return;

    console.log(`[useSpawnEvents] Spawn event on ${canvasId}: ${portName}`, value);

    const widgets = canvas.getWidgets();
    const nextZIndex = widgets.length + 1;

    switch (portName) {
      case 'spawn.text': {
        canvas.addWidget({
          widgetDefId: 'stickernest.basic-text',
          version: '1.0.0',
          name: 'Text Element',
          position: { x: value.x || 100, y: value.y || 100 },
          width: 200,
          height: 50,
          sizePreset: 'sm',
          rotation: 0,
          zIndex: nextZIndex,
          state: {
            text: value.text || 'Double-click to edit',
            fontSize: value.fontSize || 16,
            color: value.color || '#ffffff',
          },
          visible: true,
          locked: false,
          opacity: 1,
          metadata: { source: 'toolbar', toolType: 'text' },
        });
        break;
      }

      case 'spawn.shape': {
        canvas.addWidget({
          widgetDefId: 'stickernest.shape-tool-v2',
          version: '1.0.0',
          name: `Shape: ${value.shapeType || 'rectangle'}`,
          position: { x: value.x || 100, y: value.y || 100 },
          width: value.width || 100,
          height: value.height || 100,
          sizePreset: 'sm',
          rotation: 0,
          zIndex: nextZIndex,
          state: {
            shapeType: value.shapeType || 'rectangle',
            fillColor: value.fill || '#8b5cf6',
            strokeColor: value.stroke || '#ffffff',
            strokeWidth: value.strokeWidth || 2,
          },
          visible: true,
          locked: false,
          opacity: 1,
          metadata: { source: 'toolbar', toolType: 'shape', shapeType: value.shapeType },
        });
        break;
      }

      case 'spawn.anchor':
      case 'spawn.path': {
        if (value.isStart || portName === 'spawn.anchor') {
          canvas.addWidget({
            widgetDefId: 'stickernest.counter',
            version: '1.0.0',
            name: `Anchor Point`,
            position: { x: (value.x || 100) - 8, y: (value.y || 100) - 8 },
            width: 16,
            height: 16,
            sizePreset: 'xs',
            rotation: 0,
            zIndex: nextZIndex + 100,
            state: { value: value.isStart ? 1 : 0 },
            visible: true,
            locked: false,
            opacity: 0.8,
            metadata: { source: 'toolbar', toolType: 'anchor', pathId: value.pathId },
          });
        }
        break;
      }

      case 'canvas.fill': {
        console.log(`Fill requested at (${value.x}, ${value.y}) with color ${value.color}`);
        break;
      }

      case 'canvas.erase': {
        console.log(`Erase requested at (${value.x}, ${value.y})`);
        break;
      }
    }
  }, [getCanvasInstance]);

  // Listen for spawn events on all canvases
  useEffect(() => {
    const unsubscribers = canvasIds.map(canvasId => {
      const bus = getEventBus(canvasId);
      return bus.on('widget:output', (event) => {
        const { portName } = event.payload || {};
        if (portName?.startsWith('spawn.') || portName?.startsWith('canvas.')) {
          handleSpawnEvent(canvasId, event);
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [canvasIds, getEventBus, handleSpawnEvent]);

  return { handleSpawnEvent };
}
