import React, { useEffect, useState, useMemo } from 'react';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { listUserWidgets, listOfficialWidgets, fetchWidgetManifest, BUCKETS, isLocalDevMode } from '../services/supabaseClient';
import { getCurrentUser } from '../services/auth';
import { WidgetManifest } from '../types/manifest';
import { getAllBuiltinManifests, getBuiltinWidget } from '../widgets/builtin';

// Category metadata for display - extensible without code changes
const CATEGORY_CONFIG: Record<string, { displayName: string; color: string; description?: string }> = {
    builtin: { displayName: 'Core Widgets', color: '#3b82f6', description: 'Built-in React components' },
    element: { displayName: 'Canvas Elements', color: '#14b8a6', description: 'Text, shapes & buttons that appear directly on canvas' },
    ai: { displayName: 'AI Tools', color: '#8b5cf6' },
    design: { displayName: 'Design Editors', color: '#ec4899', description: 'Style editors for canvas elements' },
    canvas: { displayName: 'Canvas Control', color: '#f97316', description: 'Control canvas background, filters, grid & transforms' },
    ecosystem: { displayName: 'Project Ecosystem', color: '#4299e1', description: 'Interconnected widgets that work together' },
    organization: { displayName: 'Organization', color: '#22c55e', description: 'Folders, file management, and workspace organization' },
    gallery: { displayName: 'Gallery & Photos', color: '#e91e63', description: 'Image gallery, polaroid, photobooth & slideshow' },
    farming: { displayName: 'Farming Sim', color: '#28a745' },
    game: { displayName: 'Game Dev', color: '#f59e0b', description: 'Isometric & 2D game components' },
    pipeline: { displayName: 'Pipeline Widgets', color: '#9333ea', description: 'Test pipeline connections and data flow' },
    debug: { displayName: 'Debug Tools', color: '#f59e0b' },
    utility: { displayName: 'Utility', color: '#06b6d4' },
    editor: { displayName: 'Editor Widgets', color: '#ec4899', description: 'Nested editing capabilities' },
    vector: { displayName: 'Vector Graphics', color: '#10b981', description: 'Full vector editing ecosystem' },
    stress: { displayName: 'Stress Tests', color: '#ef4444', description: 'Use with caution - may cause performance issues' },
    test: { displayName: 'Test Widgets', color: '#666' },
    dashboard: { displayName: 'Standalone', color: '#666' },
    social: { displayName: 'Standalone', color: '#666' },
    productivity: { displayName: 'Standalone', color: '#666' },
};

// Generate a color from category name for unknown categories
const generateCategoryColor = (category: string): string => {
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 45%)`;
};

const getCategoryMeta = (category: string) => {
    if (CATEGORY_CONFIG[category]) {
        return CATEGORY_CONFIG[category];
    }
    // Auto-generate display name and color for unknown categories
    return {
        displayName: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
        color: generateCategoryColor(category),
    };
};

// Local test widgets for dev mode - exported for use in StickerPropertiesPanel
export const LOCAL_TEST_WIDGETS: LocalWidget[] = [
    // Canvas Elements - appear directly on canvas
    { id: 'text-block', name: 'Text Block', category: 'element' },
    { id: 'shape-element', name: 'Shape', category: 'element' },
    { id: 'button-element', name: 'Button', category: 'element' },
    // AI Tools
    { id: 'ai-widget-generator', name: 'AI Widget Generator', category: 'ai' },
    // Design Editors - style the canvas elements
    { id: 'text-styles', name: 'Text Styles', category: 'design' },
    { id: 'text-effects', name: 'Text Effects', category: 'design' },
    { id: 'shape-generator', name: 'Shape Generator', category: 'design' },
    { id: 'link-button', name: 'Link Button', category: 'design' },
    { id: 'image-crop-mask', name: 'Image Crop & Mask', category: 'design' },
    { id: 'gradient-maker', name: 'Gradient Maker', category: 'design' },
    { id: 'image-tool', name: 'Image Tool', category: 'design' },
    { id: 'shape-tool', name: 'Shape Tool', category: 'design' },
    { id: 'text-tool', name: 'Text Tool', category: 'design' },
    // Canvas Control Widgets
    { id: 'canvas-bg-color', name: 'Canvas Background Color', category: 'canvas' },
    { id: 'canvas-bg-pattern', name: 'Canvas Background Pattern', category: 'canvas' },
    { id: 'canvas-filters', name: 'Canvas Filters', category: 'canvas' },
    { id: 'canvas-grid', name: 'Canvas Grid Controller', category: 'canvas' },
    // Organization - folders and file management
    { id: 'folder-widget', name: 'Folder Manager', category: 'organization' },
    // Project Management Ecosystem (interconnected widgets)
    { id: 'project-tracker', name: 'Project Tracker', category: 'ecosystem' },
    { id: 'time-tracker', name: 'Time Tracker', category: 'ecosystem' },
    { id: 'notes-widget', name: 'Task Notes', category: 'ecosystem' },
    { id: 'notification-center', name: 'Notification Center', category: 'ecosystem' },
    { id: 'activity-feed', name: 'Activity Feed', category: 'ecosystem' },
    // Gallery & Photo widgets (interconnected)
    { id: 'gallery-widget', name: 'Gallery', category: 'gallery' },
    { id: 'polaroid-widget', name: 'Polaroid', category: 'gallery' },
    { id: 'photobooth-widget', name: 'Photobooth Strip', category: 'gallery' },
    { id: 'slideshow-widget', name: 'Slideshow', category: 'gallery' },
    { id: 'youtube-playlist-widget', name: 'YouTube Playlist', category: 'gallery' },
    { id: 'spotify-playlist-widget', name: 'Spotify Playlist', category: 'gallery' },
    { id: 'preview-player-widget', name: 'Preview Player', category: 'gallery' },
    // Complex standalone widgets
    { id: 'dashboard-analytics', name: 'Analytics Dashboard', category: 'dashboard' },
    { id: 'chat-room', name: 'Chat Room', category: 'social' },
    { id: 'kanban-board', name: 'Kanban Board', category: 'productivity' },
    { id: 'sticky-notes-widget', name: 'Sticky Notes', category: 'productivity' },
    { id: 'word-processor-widget', name: 'Word Processor', category: 'productivity' },
    // Farming simulation
    { id: 'farm-crop-plot', name: 'Crop Plot', category: 'farming' },
    { id: 'farm-seed-bag', name: 'Seed Bag', category: 'farming' },
    { id: 'farm-weather', name: 'Weather Station', category: 'farming' },
    { id: 'farm-stats', name: 'Farm Stats', category: 'farming' },
    { id: 'farm-sprinkler', name: 'Water Sprinkler', category: 'farming' },
    // Game Development
    { id: 'isometric-grid', name: 'Isometric Grid', category: 'game' },
    { id: 'game-character', name: 'Game Character', category: 'game' },
    // Pipeline test widgets
    { id: 'pipeline-button', name: 'Pipeline Button', category: 'pipeline' },
    { id: 'pipeline-text', name: 'Pipeline Text', category: 'pipeline' },
    { id: 'pipeline-timer', name: 'Pipeline Timer', category: 'pipeline' },
    { id: 'pipeline-progressbar', name: 'Pipeline Progress', category: 'pipeline' },
    { id: 'pipeline-visualizer', name: 'Pipeline Visualizer', category: 'pipeline' },
    // Type system test widgets
    { id: 'type-sender', name: 'Type Sender', category: 'pipeline' },
    { id: 'type-receiver', name: 'Type Receiver', category: 'pipeline' },
    // Cross-canvas messaging test widgets
    { id: 'message-sender', name: 'Message Sender', category: 'pipeline' },
    { id: 'message-receiver', name: 'Message Receiver', category: 'pipeline' },
    // Debug & monitoring widgets
    { id: 'identity-debugger', name: 'Identity Debugger', category: 'debug' },
    { id: 'transport-monitor', name: 'Transport Monitor', category: 'debug' },
    { id: 'echo-widget', name: 'Echo Widget', category: 'debug' },
    // Stress test widgets
    { id: 'event-flooder', name: 'Event Flooder', category: 'stress' },
    { id: 'latency-simulator', name: 'Latency Simulator', category: 'stress' },
    { id: 'random-state-mutator', name: 'Random State Mutator', category: 'stress' },
    { id: 'stress-generator', name: 'Stress Generator', category: 'stress' },
    { id: 'sandbox-breaker', name: 'Sandbox Breaker', category: 'stress' },
    // Utility widgets
    { id: 'canvas-dimension-listener', name: 'Canvas Dimensions', category: 'utility' },
    { id: 'cursor-tracker', name: 'Cursor Tracker', category: 'utility' },
    { id: 'state-mirror', name: 'State Mirror', category: 'utility' },
    { id: 'buttonpad', name: 'Button Pad', category: 'utility' },
    { id: 'button-deck', name: 'Button Deck', category: 'utility' },
    // Editor widgets (nested/parent-child)
    { id: 'text-editor', name: 'Text Editor', category: 'editor' },
    { id: 'vector-editor', name: 'Vector Editor', category: 'editor' },
    { id: 'image-editor', name: 'Image Editor', category: 'editor' },
    // Vector Graphics Ecosystem
    { id: 'vector-canvas', name: 'Vector Canvas', category: 'vector' },
    { id: 'shape-spawner', name: 'Shape Spawner', category: 'vector' },
    { id: 'vector-color-picker', name: 'Color Picker', category: 'vector' },
    { id: 'vector-transform', name: 'Transform Tool', category: 'vector' },
    { id: 'vector-style-panel', name: 'Style Panel', category: 'vector' },
    { id: 'vector-layers', name: 'Layer Manager', category: 'vector' },
    { id: 'vector-export', name: 'SVG Export', category: 'vector' },
    { id: 'drop-shadow-control', name: 'Drop Shadow Control', category: 'vector' },
    // Basic test widgets
    { id: 'color-sender', name: 'Color Picker', category: 'test' },
    { id: 'color-receiver', name: 'Color Display', category: 'test' },
    { id: 'ping-sender', name: 'Ping Sender', category: 'test' },
    { id: 'ping-receiver', name: 'Ping Receiver', category: 'test' },
    // Creative Suite
    { id: 'filter-overlay', name: 'Filter Overlay', category: 'creative' },
    { id: 'synth-master', name: 'Synth Master', category: 'creative' },
    { id: 'effect-glitch', name: 'Glitch Effect', category: 'creative' },
    { id: 'source-audio', name: 'Audio Source', category: 'creative' },
    { id: 'source-video', name: 'Video Source', category: 'creative' },
    // AI & Generation
    { id: 'lora-training-widget', name: 'LoRA Trainer', category: 'ai' },
    { id: 'photo-generation-widget', name: 'Photo Generator', category: 'ai' },
    { id: 'video-generation-widget', name: 'Video Generator', category: 'ai' },
    { id: 'prompt-options-widget', name: 'Prompt Options', category: 'ai' },
    { id: 'api-settings-widget', name: 'API Settings', category: 'ai' },
    // Productivity
    { id: 'word-processor-widget', name: 'Word Processor', category: 'productivity' },
    // Design
    { id: 'sprite-manager', name: 'Sprite Manager', category: 'design' },
];

export interface LocalWidget {
    id: string;
    name: string;
    category: string;
}

interface WidgetLibraryProps {
    runtime: RuntimeContext;
}

type WidgetSource = 'user' | 'official' | 'local' | 'builtin';

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ runtime }) => {
    const [userWidgets, setUserWidgets] = useState<string[]>([]);
    const [officialWidgets, setOfficialWidgets] = useState<string[]>([]);
    // Use constant directly to ensure updates are reflected immediately during dev
    const localWidgets = LOCAL_TEST_WIDGETS;
    const [selectedWidget, setSelectedWidget] = useState<{ id: string, source: WidgetSource } | null>(null);
    const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());
    const [manifest, setManifest] = useState<WidgetManifest | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const user = getCurrentUser();

    // Get built-in widgets
    const builtinWidgets = useMemo(() => {
        return getAllBuiltinManifests().map(m => ({
            id: m.id,
            name: m.name,
            category: m.tags?.includes('pipeline') ? 'pipeline' : 'builtin'
        }));
    }, []);

    // Derive unique categories in order of first appearance
    const categories = useMemo(() => {
        const seen = new Set<string>();
        const result: string[] = [];

        // Add builtin and pipeline categories first
        const specialCategories = ['builtin', 'pipeline'];
        specialCategories.forEach(cat => {
            if (builtinWidgets.some(w => w.category === cat)) {
                seen.add(cat);
                result.push(cat);
            }
        });

        for (const widget of localWidgets) {
            if (!seen.has(widget.category)) {
                seen.add(widget.category);
                result.push(widget.category);
            }
        }
        return result;
    }, [localWidgets, builtinWidgets]);

    // Group widgets by category
    const widgetsByCategory = useMemo(() => {
        const grouped: Record<string, LocalWidget[]> = {};

        // Add built-in widgets
        builtinWidgets.forEach(w => {
            if (!grouped[w.category]) {
                grouped[w.category] = [];
            }
            grouped[w.category].push(w);
        });

        for (const widget of localWidgets) {
            if (!grouped[widget.category]) {
                grouped[widget.category] = [];
            }
            grouped[widget.category].push(widget);
        }
        return grouped;
    }, [localWidgets, builtinWidgets]);

    useEffect(() => {
        loadWidgets();
    }, []);

    const loadWidgets = async () => {
        setLoading(true);
        try {
            if (!isLocalDevMode) {
                const [userList, officialList] = await Promise.all([
                    listUserWidgets(user.userId),
                    listOfficialWidgets()
                ]);
                setUserWidgets(userList);
                setOfficialWidgets(officialList);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load widget lists');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectWidget = async (id: string, source: WidgetSource) => {
        setSelectedWidget({ id, source });
        setManifest(null);
        setError(null);

        // For built-in widgets
        if (source === 'builtin') {
            const widget = getBuiltinWidget(id);
            if (widget) {
                setManifest(widget.manifest);
            } else {
                setError('Built-in widget not found');
            }
            return;
        }

        // For local widgets, load manifest from test-widgets folder
        if (source === 'local') {
            try {
                const response = await fetch(`/test-widgets/${id}/manifest.json`);
                if (!response.ok) throw new Error('Failed to load manifest');
                const loadedManifest = await response.json();
                setManifest(loadedManifest);
            } catch (err) {
                console.error('Error loading local manifest:', err);
                setError('Failed to load local manifest');
            }
            return;
        }

        // Supabase-based loading
        try {
            const bucket = source === 'official' ? BUCKETS.OFFICIAL_WIDGETS : BUCKETS.WIDGETS;
            const basePath = source === 'official' ? id : `${user.userId}/${id}`;

            const { supabaseClient } = await import('../services/supabaseClient');
            if (!supabaseClient) {
                setError('Supabase not configured');
                return;
            }

            const { data: versions, error: listError } = await supabaseClient.storage.from(bucket).list(basePath);

            if (listError) throw listError;

            if (!versions || versions.length === 0) {
                setError('No versions found for this widget');
                return;
            }

            const versionList = versions
                .map((v: any) => v.name)
                .filter((n: string) => n !== '.emptyFolderPlaceholder' && !n.startsWith('.'))
                .sort((a: string, b: string) => b.localeCompare(a));

            if (versionList.length === 0) {
                setError('No valid versions found');
                return;
            }

            const latestVersion = versionList[0];
            const path = `${basePath}/${latestVersion}/manifest.json`;
            const loadedManifest = await fetchWidgetManifest(bucket, path);

            if (loadedManifest) {
                setManifest(loadedManifest);
            } else {
                setError(`Could not load manifest for version ${latestVersion}`);
            }
        } catch (err) {
            console.error('Error selecting widget:', err);
            setError('Failed to load manifest details');
        }
    };

    const toggleWidgetSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelection = new Set(selectedWidgets);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedWidgets(newSelection);
    };

    const handleAddToCanvas = () => {
        if (!selectedWidget) return;

        runtime.eventBus.emit({
            type: 'widget:add-request',
            scope: 'canvas',
            payload: {
                widgetDefId: selectedWidget.id,
                version: manifest?.version,
                source: selectedWidget.source
            }
        });
    };

    const handleAddSelectedToCanvas = () => {
        if (selectedWidgets.size === 0) return;

        // Add all selected widgets with staggered positions
        let offsetX = 0;
        let offsetY = 0;

        selectedWidgets.forEach((widgetId) => {
            // Check if it's a builtin widget
            const isBuiltin = builtinWidgets.some(w => w.id === widgetId);
            const localWidget = localWidgets.find(w => w.id === widgetId);

            let source: WidgetSource = 'user';
            if (isBuiltin) source = 'builtin';
            else if (localWidget) source = 'local';

            runtime.eventBus.emit({
                type: 'widget:add-request',
                scope: 'canvas',
                payload: {
                    widgetDefId: widgetId,
                    version: '1.0.0',
                    source: source,
                    positionOffset: { x: offsetX, y: offsetY }
                }
            });
            offsetX += 50;
            offsetY += 50;
        });

        // Clear selection after adding
        setSelectedWidgets(new Set());
    };

    const selectCategoryWidgets = (category: string) => {
        const categoryIds = localWidgets.filter(w => w.category === category).map(w => w.id);
        setSelectedWidgets(new Set(categoryIds));
    };

    const clearSelection = () => {
        setSelectedWidgets(new Set());
    };

    // Render a category section dynamically
    const renderCategorySection = (category: string) => {
        const widgets = widgetsByCategory[category] || [];
        if (widgets.length === 0) return null;

        const meta = getCategoryMeta(category);
        const showSelectAll = widgets.length > 1;

        return (
            <div key={category} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9rem', color: meta.color, textTransform: 'uppercase', margin: '0 0 8px 0' }}>
                        {meta.displayName}
                    </h4>
                    {showSelectAll && (
                        <button
                            onClick={() => selectCategoryWidgets(category)}
                            style={{
                                padding: '2px 8px',
                                background: 'transparent',
                                border: `1px solid ${meta.color}`,
                                borderRadius: 3,
                                color: meta.color,
                                cursor: 'pointer',
                                fontSize: '0.7rem'
                            }}
                        >
                            Select All
                        </button>
                    )}
                </div>
                {meta.description && (
                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 8 }}>
                        {meta.description}
                    </div>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {widgets.map(widget => (
                        <li key={widget.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                            <input
                                type="checkbox"
                                checked={selectedWidgets.has(widget.id)}
                                onChange={(e) => toggleWidgetSelection(widget.id, e as any)}
                                style={{ marginRight: 8 }}
                            />
                            <button
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/widget-def-id', widget.id);
                                    e.dataTransfer.setData('text/widget-source', builtinWidgets.some(w => w.id === widget.id) ? 'builtin' : 'local');
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => handleSelectWidget(widget.id, builtinWidgets.some(w => w.id === widget.id) ? 'builtin' : 'local')}
                                style={{
                                    flex: 1,
                                    textAlign: 'left',
                                    padding: '6px 10px',
                                    border: 'none',
                                    background: selectedWidget?.id === widget.id ? '#e9ecef' : 'transparent',
                                    cursor: 'grab',
                                    borderRadius: 4,
                                    fontSize: '0.85rem'
                                }}
                            >
                                {widget.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="widget-library" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            <div style={{ width: 280, borderRight: '1px solid #ddd', padding: 10, overflowY: 'auto', background: '#f8f9fa' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Widget Library</h3>

                <div style={{
                    padding: '8px 12px',
                    background: isLocalDevMode ? '#fff3cd' : '#d1ecf1',
                    borderRadius: 4,
                    marginBottom: 15,
                    fontSize: '0.75rem',
                    color: isLocalDevMode ? '#856404' : '#0c5460'
                }}>
                    {isLocalDevMode ? 'Local Dev Mode - Loading test widgets' : 'Test Widgets Available'}
                </div>

                {/* Multi-select controls */}
                {selectedWidgets.size > 0 && (
                    <div style={{
                        padding: 10,
                        background: '#d4edda',
                        borderRadius: 6,
                        marginBottom: 15
                    }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
                            {selectedWidgets.size} widget{selectedWidgets.size > 1 ? 's' : ''} selected
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={handleAddSelectedToCanvas}
                                style={{
                                    flex: 1,
                                    padding: '6px 12px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                }}
                            >
                                Add All to Canvas
                            </button>
                            <button
                                onClick={clearSelection}
                                style={{
                                    padding: '6px 12px',
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Dynamic category sections */}
                {categories.map(category => renderCategorySection(category))}

                {/* Supabase-based widgets - shown when Supabase is configured */}
                {!isLocalDevMode && (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <h4 style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>Official</h4>
                            {officialWidgets.length === 0 && <div style={{ fontSize: '0.8rem', color: '#999' }}>No official widgets yet</div>}
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {officialWidgets.map(id => (
                                    <li key={id}>
                                        <button
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/widget-def-id', id);
                                                e.dataTransfer.setData('text/widget-source', 'official');
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            onClick={() => handleSelectWidget(id, 'official')}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '6px 10px',
                                                border: 'none',
                                                background: selectedWidget?.id === id && selectedWidget?.source === 'official' ? '#e9ecef' : 'transparent',
                                                cursor: 'grab',
                                                borderRadius: 4
                                            }}
                                        >
                                            {id}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>My Widgets</h4>
                            {userWidgets.length === 0 && <div style={{ fontSize: '0.8rem', color: '#999' }}>No uploaded widgets yet</div>}
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {userWidgets.map(id => (
                                    <li key={id}>
                                        <button
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/widget-def-id', id);
                                                e.dataTransfer.setData('text/widget-source', 'user');
                                                e.dataTransfer.effectAllowed = 'copy';
                                            }}
                                            onClick={() => handleSelectWidget(id, 'user')}
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '6px 10px',
                                                border: 'none',
                                                background: selectedWidget?.id === id && selectedWidget?.source === 'user' ? '#e9ecef' : 'transparent',
                                                cursor: 'grab',
                                                borderRadius: 4
                                            }}
                                        >
                                            {id}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>

            <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                {loading && <div>Loading...</div>}

                {!selectedWidget && !loading && (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: 50 }}>
                        <p>Select a widget to view details</p>
                        <p style={{ fontSize: '0.85rem' }}>Use checkboxes to select multiple widgets, then click "Add All to Canvas"</p>
                    </div>
                )}

                {selectedWidget && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
                            <h2 style={{ margin: 0 }}>{manifest?.name || selectedWidget.id}</h2>
                            <button
                                onClick={handleAddToCanvas}
                                style={{
                                    padding: '8px 16px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Add to Canvas
                            </button>
                        </div>

                        {error && (
                            <div style={{ color: 'red', padding: 10, background: '#fff0f0', borderRadius: 4, marginBottom: 20 }}>
                                {error}
                            </div>
                        )}

                        {manifest ? (
                            <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #eee' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 20px', marginBottom: 20 }}>
                                    <strong>Version:</strong> <span>{manifest.version}</span>
                                    <strong>Kind:</strong> <span>{manifest.kind}</span>
                                    <strong>Source:</strong> <span style={{
                                        padding: '2px 8px',
                                        background: selectedWidget.source === 'local' ? '#fff3cd' : selectedWidget.source === 'builtin' ? '#cce5ff' : '#d4edda',
                                        borderRadius: 3,
                                        fontSize: '0.85rem'
                                    }}>{selectedWidget.source}</span>
                                    <strong>Capabilities:</strong>
                                    <span>
                                        {[
                                            manifest.capabilities.draggable && 'Draggable',
                                            manifest.capabilities.resizable && 'Resizable',
                                            manifest.capabilities.rotatable && 'Rotatable'
                                        ].filter(Boolean).join(', ') || 'None'}
                                    </span>
                                </div>

                                {manifest.inputs && Object.keys(manifest.inputs).length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <strong>Inputs:</strong>
                                        <ul style={{ marginTop: 5 }}>
                                            {Object.entries(manifest.inputs).map(([key, schema]) => (
                                                <li key={key}>
                                                    <code>{key}</code>: {schema.type}
                                                    {schema.description && <span style={{ color: '#666', marginLeft: 8 }}>- {schema.description}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {manifest.outputs && Object.keys(manifest.outputs).length > 0 && (
                                    <div style={{ marginBottom: 20 }}>
                                        <strong>Outputs:</strong>
                                        <ul style={{ marginTop: 5 }}>
                                            {Object.entries(manifest.outputs).map(([key, schema]) => (
                                                <li key={key}>
                                                    <code>{key}</code>: {schema.type}
                                                    {schema.description && <span style={{ color: '#666', marginLeft: 8 }}>- {schema.description}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div style={{ marginTop: 20 }}>
                                    <details>
                                        <summary style={{ cursor: 'pointer', color: '#007bff' }}>View Raw Manifest</summary>
                                        <pre style={{ background: '#f8f9fa', padding: 10, borderRadius: 4, overflowX: 'auto', fontSize: '0.8rem' }}>
                                            {JSON.stringify(manifest, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            </div>
                        ) : (
                            !error && <div>Loading manifest...</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
