/**
 * StickerNest v2 - usePanelsStore Tests
 * Tests for the floating panel state management including
 * panel CRUD, widget docking/undocking, tab operations, and presets
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePanelsStore } from './usePanelsStore';
import type { FloatingPanel, PanelTab } from '../types/panels';

describe('usePanelsStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    usePanelsStore.setState({
      panels: new Map(),
      dockedPanelWidgets: new Map(),
      panelPresets: [],
      maxPresets: 15,
      draggedWidgetId: null,
      dropTargetPanelId: null,
      dropTargetTabId: null,
      focusedPanelId: null,
    });
  });

  afterEach(() => {
    usePanelsStore.setState({
      panels: new Map(),
      dockedPanelWidgets: new Map(),
      panelPresets: [],
      maxPresets: 15,
      draggedWidgetId: null,
      dropTargetPanelId: null,
      dropTargetTabId: null,
      focusedPanelId: null,
    });
  });

  describe('Panel CRUD Operations', () => {
    it('should create a panel with default values', () => {
      const { createPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });

      expect(panel).toBeDefined();
      expect(panel.id).toBeDefined();
      expect(panel.canvasId).toBe('canvas-1');
      expect(panel.title).toBe('Panel');
      expect(panel.tabs).toHaveLength(1);
      expect(panel.tabs[0].label).toBe('Tab 1');
      expect(panel.visible).toBe(true);
      expect(panel.collapsed).toBe(false);
    });

    it('should create a panel with custom options', () => {
      const { createPanel } = usePanelsStore.getState();

      const panel = createPanel({
        canvasId: 'canvas-1',
        title: 'My Panel',
        position: { x: 100, y: 200 },
        size: { width: 400, height: 500 },
        layoutMode: 'grid',
      });

      expect(panel.title).toBe('My Panel');
      expect(panel.position).toEqual({ x: 100, y: 200 });
      expect(panel.size).toEqual({ width: 400, height: 500 });
      expect(panel.layoutMode).toBe('grid');
    });

    it('should get a panel by ID', () => {
      const { createPanel, getPanel } = usePanelsStore.getState();

      const created = createPanel({ canvasId: 'canvas-1', title: 'Test Panel' });
      const retrieved = getPanel(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Test Panel');
    });

    it('should return undefined for non-existent panel', () => {
      const { getPanel } = usePanelsStore.getState();

      const panel = getPanel('non-existent-id');

      expect(panel).toBeUndefined();
    });

    it('should update a panel', () => {
      const { createPanel, updatePanel, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      updatePanel(panel.id, { title: 'Updated Title', collapsed: true });

      const updated = getPanel(panel.id);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.collapsed).toBe(true);
    });

    it('should delete a panel', () => {
      const { createPanel, deletePanel, getPanel, getPanels } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      expect(getPanels()).toHaveLength(1);

      deletePanel(panel.id);

      expect(getPanel(panel.id)).toBeUndefined();
      expect(getPanels()).toHaveLength(0);
    });

    it('should get all panels', () => {
      const { createPanel, getPanels } = usePanelsStore.getState();

      createPanel({ canvasId: 'canvas-1', title: 'Panel 1' });
      createPanel({ canvasId: 'canvas-1', title: 'Panel 2' });
      createPanel({ canvasId: 'canvas-2', title: 'Panel 3' });

      const panels = getPanels();
      expect(panels).toHaveLength(3);
    });

    it('should get panels by canvas', () => {
      const { createPanel, getPanelsByCanvas } = usePanelsStore.getState();

      createPanel({ canvasId: 'canvas-1', title: 'Panel 1' });
      createPanel({ canvasId: 'canvas-1', title: 'Panel 2' });
      createPanel({ canvasId: 'canvas-2', title: 'Panel 3' });

      const canvas1Panels = getPanelsByCanvas('canvas-1');
      const canvas2Panels = getPanelsByCanvas('canvas-2');

      expect(canvas1Panels).toHaveLength(2);
      expect(canvas2Panels).toHaveLength(1);
      expect(canvas2Panels[0].title).toBe('Panel 3');
    });
  });

  describe('Panel Position and Size', () => {
    it('should update panel position', () => {
      const { createPanel, updatePanelPosition, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1', position: { x: 0, y: 0 } });
      updatePanelPosition(panel.id, { x: 150, y: 250 });

      const updated = getPanel(panel.id);
      expect(updated?.position).toEqual({ x: 150, y: 250 });
    });

    it('should update panel size', () => {
      const { createPanel, updatePanelSize, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      updatePanelSize(panel.id, { width: 500, height: 600 });

      const updated = getPanel(panel.id);
      expect(updated?.size).toEqual({ width: 500, height: 600 });
    });

    it('should toggle panel collapsed state', () => {
      const { createPanel, togglePanelCollapsed, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      expect(getPanel(panel.id)?.collapsed).toBe(false);

      togglePanelCollapsed(panel.id);
      expect(getPanel(panel.id)?.collapsed).toBe(true);

      togglePanelCollapsed(panel.id);
      expect(getPanel(panel.id)?.collapsed).toBe(false);
    });

    it('should toggle panel maximized state', () => {
      const { createPanel, togglePanelMaximized, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      expect(getPanel(panel.id)?.maximized).toBe(false);

      togglePanelMaximized(panel.id);
      expect(getPanel(panel.id)?.maximized).toBe(true);

      togglePanelMaximized(panel.id);
      expect(getPanel(panel.id)?.maximized).toBe(false);
    });

    it('should focus a panel and update z-index', () => {
      const { createPanel, focusPanel, getPanel } = usePanelsStore.getState();

      const panel1 = createPanel({ canvasId: 'canvas-1' });
      const panel2 = createPanel({ canvasId: 'canvas-1' });

      const initialZ1 = getPanel(panel1.id)?.zIndex || 0;
      const initialZ2 = getPanel(panel2.id)?.zIndex || 0;

      // Focus panel1 - should get highest z-index
      focusPanel(panel1.id);

      const newZ1 = getPanel(panel1.id)?.zIndex || 0;
      expect(newZ1).toBeGreaterThan(initialZ1);
      expect(newZ1).toBeGreaterThan(initialZ2);
    });
  });

  describe('Tab Operations', () => {
    it('should add a tab to a panel', () => {
      const { createPanel, addTab, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const newTab = addTab(panel.id, { label: 'New Tab' });

      const updated = getPanel(panel.id);
      expect(updated?.tabs).toHaveLength(2);
      expect(updated?.tabs[1].label).toBe('New Tab');
      expect(newTab.id).toBeDefined();
    });

    it('should remove a tab from a panel', () => {
      const { createPanel, addTab, removeTab, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tab2 = addTab(panel.id, { label: 'Tab 2' });

      expect(getPanel(panel.id)?.tabs).toHaveLength(2);

      removeTab(panel.id, tab2.id);

      expect(getPanel(panel.id)?.tabs).toHaveLength(1);
    });

    it('should not remove the last tab', () => {
      const { createPanel, removeTab, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const initialTab = panel.tabs[0];

      removeTab(panel.id, initialTab.id);

      // Should still have 1 tab
      expect(getPanel(panel.id)?.tabs).toHaveLength(1);
    });

    it('should rename a tab', () => {
      const { createPanel, renameTab, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      renameTab(panel.id, tabId, 'Renamed Tab');

      const updated = getPanel(panel.id);
      expect(updated?.tabs[0].label).toBe('Renamed Tab');
    });

    it('should switch active tab', () => {
      const { createPanel, addTab, switchTab, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tab2 = addTab(panel.id, { label: 'Tab 2' });

      switchTab(panel.id, tab2.id);

      expect(getPanel(panel.id)?.activeTab).toBe(tab2.id);
    });

    it('should reorder tabs', () => {
      const { createPanel, addTab, reorderTabs, getPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tab1 = panel.tabs[0];
      const tab2 = addTab(panel.id, { label: 'Tab 2' });
      const tab3 = addTab(panel.id, { label: 'Tab 3' });

      // Reorder: Tab3, Tab1, Tab2
      reorderTabs(panel.id, [tab3.id, tab1.id, tab2.id]);

      const updated = getPanel(panel.id);
      expect(updated?.tabs[0].id).toBe(tab3.id);
      expect(updated?.tabs[1].id).toBe(tab1.id);
      expect(updated?.tabs[2].id).toBe(tab2.id);
    });
  });

  describe('Widget Docking', () => {
    it('should dock a widget to a panel tab', () => {
      const { createPanel, addWidgetToPanelTab, getWidgetsInPanelTab, isWidgetDockedInPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      addWidgetToPanelTab(panel.id, tabId, 'widget-1', {
        position: { x: 100, y: 200 },
        size: { width: 300, height: 200 },
        zIndex: 5,
        rotation: 0,
      });

      expect(isWidgetDockedInPanel('widget-1')).toBe(true);
      expect(getWidgetsInPanelTab(panel.id, tabId)).toContain('widget-1');
    });

    it('should undock a widget from a panel', () => {
      const { createPanel, addWidgetToPanelTab, removeWidgetFromPanelTab, isWidgetDockedInPanel, getDockedWidgetState } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      addWidgetToPanelTab(panel.id, tabId, 'widget-1', {
        position: { x: 100, y: 200 },
        size: { width: 300, height: 200 },
        zIndex: 5,
        rotation: 15,
      });

      const dockedState = removeWidgetFromPanelTab(panel.id, tabId, 'widget-1');

      expect(isWidgetDockedInPanel('widget-1')).toBe(false);
      expect(dockedState).toBeDefined();
      expect(dockedState?.originalPosition).toEqual({ x: 100, y: 200 });
      expect(dockedState?.originalRotation).toBe(15);
    });

    it('should get docked widget state', () => {
      const { createPanel, addWidgetToPanelTab, getDockedWidgetState } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      addWidgetToPanelTab(panel.id, tabId, 'widget-1', {
        position: { x: 50, y: 75 },
        size: { width: 200, height: 150 },
        zIndex: 10,
        rotation: 45,
      });

      const state = getDockedWidgetState('widget-1');

      expect(state).toBeDefined();
      expect(state?.panelId).toBe(panel.id);
      expect(state?.tabId).toBe(tabId);
      expect(state?.originalPosition).toEqual({ x: 50, y: 75 });
      expect(state?.originalSize).toEqual({ width: 200, height: 150 });
      expect(state?.originalZIndex).toBe(10);
      expect(state?.originalRotation).toBe(45);
    });

    it('should move widget between tabs', () => {
      const { createPanel, addTab, addWidgetToPanelTab, moveWidgetBetweenTabs, getWidgetsInPanelTab, getDockedWidgetState } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tab1 = panel.tabs[0];
      const tab2 = addTab(panel.id, { label: 'Tab 2' });

      addWidgetToPanelTab(panel.id, tab1.id, 'widget-1', {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
      });

      expect(getWidgetsInPanelTab(panel.id, tab1.id)).toContain('widget-1');
      expect(getWidgetsInPanelTab(panel.id, tab2.id)).not.toContain('widget-1');

      moveWidgetBetweenTabs(panel.id, 'widget-1', tab1.id, tab2.id);

      expect(getWidgetsInPanelTab(panel.id, tab1.id)).not.toContain('widget-1');
      expect(getWidgetsInPanelTab(panel.id, tab2.id)).toContain('widget-1');

      // Should update docked state
      const state = getDockedWidgetState('widget-1');
      expect(state?.tabId).toBe(tab2.id);
    });

    it('should reorder widgets in a tab', () => {
      const { createPanel, addWidgetToPanelTab, reorderWidgetsInTab, getWidgetsInPanelTab } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      addWidgetToPanelTab(panel.id, tabId, 'widget-1', {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
      });
      addWidgetToPanelTab(panel.id, tabId, 'widget-2', {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
      });
      addWidgetToPanelTab(panel.id, tabId, 'widget-3', {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
      });

      // Reorder: widget-3, widget-1, widget-2
      reorderWidgetsInTab(panel.id, tabId, ['widget-3', 'widget-1', 'widget-2']);

      const widgets = getWidgetsInPanelTab(panel.id, tabId);
      expect(widgets[0]).toBe('widget-3');
      expect(widgets[1]).toBe('widget-1');
      expect(widgets[2]).toBe('widget-2');
    });

    it('should remove docked widgets when deleting a panel', () => {
      const { createPanel, addWidgetToPanelTab, deletePanel, isWidgetDockedInPanel } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      addWidgetToPanelTab(panel.id, tabId, 'widget-1', {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        zIndex: 1,
        rotation: 0,
      });

      expect(isWidgetDockedInPanel('widget-1')).toBe(true);

      deletePanel(panel.id);

      expect(isWidgetDockedInPanel('widget-1')).toBe(false);
    });
  });

  describe('Panel Presets', () => {
    it('should save a panel as a preset', () => {
      const { createPanel, savePanelPreset, getPanelPresets } = usePanelsStore.getState();

      const panel = createPanel({
        canvasId: 'canvas-1',
        title: 'My Panel',
        size: { width: 400, height: 500 },
      });

      const preset = savePanelPreset(panel.id, 'My Preset', 'A saved panel configuration');

      expect(preset).toBeDefined();
      expect(preset.name).toBe('My Preset');
      expect(preset.description).toBe('A saved panel configuration');
      expect(preset.panel.title).toBe('My Panel');
      expect(preset.panel.size).toEqual({ width: 400, height: 500 });

      const presets = getPanelPresets();
      expect(presets).toHaveLength(1);
    });

    it('should load a panel from a preset', () => {
      const { createPanel, savePanelPreset, loadPanelPreset, getPanel } = usePanelsStore.getState();

      const original = createPanel({
        canvasId: 'canvas-1',
        title: 'Original Panel',
        size: { width: 350, height: 450 },
        layoutMode: 'grid',
      });

      const preset = savePanelPreset(original.id, 'Saved Preset');

      // Load on a different canvas
      const loaded = loadPanelPreset(preset.id, 'canvas-2', { width: 1920, height: 1080 });

      expect(loaded).toBeDefined();
      expect(loaded?.canvasId).toBe('canvas-2');
      expect(loaded?.title).toBe('Original Panel');
      expect(loaded?.size).toEqual({ width: 350, height: 450 });
      expect(loaded?.layoutMode).toBe('grid');
      expect(loaded?.id).not.toBe(original.id); // Different ID
    });

    it('should delete a preset', () => {
      const { createPanel, savePanelPreset, deletePanelPreset, getPanelPresets } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const preset = savePanelPreset(panel.id, 'To Delete');

      expect(getPanelPresets()).toHaveLength(1);

      deletePanelPreset(preset.id);

      expect(getPanelPresets()).toHaveLength(0);
    });

    it('should duplicate a preset', () => {
      const { createPanel, savePanelPreset, duplicatePanelPreset, getPanelPresets } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1', title: 'Original' });
      const preset = savePanelPreset(panel.id, 'Original Preset');

      const duplicate = duplicatePanelPreset(preset.id);

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Original Preset (Copy)');
      expect(duplicate?.id).not.toBe(preset.id);
      expect(getPanelPresets()).toHaveLength(2);
    });

    it('should toggle preset favorite', () => {
      const { createPanel, savePanelPreset, togglePresetFavorite, getPanelPresets } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const preset = savePanelPreset(panel.id, 'Favorite Test');

      expect(getPanelPresets()[0].isFavorite).toBeFalsy();

      togglePresetFavorite(preset.id);
      expect(getPanelPresets()[0].isFavorite).toBe(true);

      togglePresetFavorite(preset.id);
      expect(getPanelPresets()[0].isFavorite).toBe(false);
    });

    it('should enforce max presets limit', () => {
      const { createPanel, savePanelPreset, getPanelPresets } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });

      // Create 16 presets (limit is 15)
      for (let i = 0; i < 16; i++) {
        savePanelPreset(panel.id, `Preset ${i}`);
      }

      const presets = getPanelPresets();
      expect(presets.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Drag and Drop State', () => {
    it('should set dragged widget', () => {
      const { setDraggedWidgetForPanel, getDragState } = usePanelsStore.getState();

      setDraggedWidgetForPanel('widget-1');

      const state = getDragState();
      expect(state.draggedWidgetId).toBe('widget-1');
    });

    it('should set drop target panel', () => {
      const { createPanel, setDropTargetPanel, getDragState } = usePanelsStore.getState();

      const panel = createPanel({ canvasId: 'canvas-1' });
      const tabId = panel.tabs[0].id;

      setDropTargetPanel(panel.id, tabId);

      const state = getDragState();
      expect(state.dropTargetPanelId).toBe(panel.id);
      expect(state.dropTargetTabId).toBe(tabId);
    });

    it('should clear drag state', () => {
      const { setDraggedWidgetForPanel, setDropTargetPanel, getDragState } = usePanelsStore.getState();

      setDraggedWidgetForPanel('widget-1');
      setDropTargetPanel('panel-1', 'tab-1');

      setDraggedWidgetForPanel(null);
      setDropTargetPanel(null, null);

      const state = getDragState();
      expect(state.draggedWidgetId).toBeNull();
      expect(state.dropTargetPanelId).toBeNull();
      expect(state.dropTargetTabId).toBeNull();
    });
  });
});
