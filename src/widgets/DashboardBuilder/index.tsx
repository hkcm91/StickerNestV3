import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar, ToolbarSlot } from './Toolbar';
import {
  MousePointer2, Move, Type, Eraser, PaintBucket, PenTool, Shapes, Plus,
  Sun, Moon, Save, Square, Circle, Triangle, Minus, Star, Hexagon
} from 'lucide-react';

// Types
type ToolType = 'select' | 'move' | 'text' | 'pen' | 'shapes' | 'bucket' | 'eraser';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'star' | 'hexagon';

interface CanvasClickEvent {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  button: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
}

interface DashboardBuilderWidgetProps {
  api?: any;
}

// Shape picker submenu
const ShapePicker: React.FC<{
  isOpen: boolean;
  theme: 'light' | 'dark';
  selectedShape: ShapeType;
  onSelect: (shape: ShapeType) => void;
}> = ({ isOpen, theme, selectedShape, onSelect }) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const shapes: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
    { type: 'rectangle', icon: <Square size={16} />, label: 'Rectangle' },
    { type: 'circle', icon: <Circle size={16} />, label: 'Circle' },
    { type: 'triangle', icon: <Triangle size={16} />, label: 'Triangle' },
    { type: 'line', icon: <Minus size={16} />, label: 'Line' },
    { type: 'star', icon: <Star size={16} />, label: 'Star' },
    { type: 'hexagon', icon: <Hexagon size={16} />, label: 'Hexagon' },
  ];

  return (
    <div className={`
      absolute left-full ml-2 top-0 p-2 rounded-xl z-50
      ${isDark
        ? 'bg-[#1a1b26]/90 backdrop-blur-xl border border-white/10'
        : 'bg-white/90 backdrop-blur-xl border border-black/10'
      }
      shadow-xl flex flex-col gap-1 min-w-[120px]
    `}>
      {shapes.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
            ${selectedShape === type
              ? isDark
                ? 'bg-purple-500/20 text-white'
                : 'bg-indigo-500/20 text-indigo-700'
              : isDark
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-black/60 hover:bg-black/10 hover:text-black'
            }
          `}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// Color picker for fill tool
const ColorPicker: React.FC<{
  isOpen: boolean;
  theme: 'light' | 'dark';
  selectedColor: string;
  onSelect: (color: string) => void;
}> = ({ isOpen, theme, selectedColor, onSelect }) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'
  ];

  return (
    <div className={`
      absolute left-full ml-2 top-0 p-2 rounded-xl z-50
      ${isDark
        ? 'bg-[#1a1b26]/90 backdrop-blur-xl border border-white/10'
        : 'bg-white/90 backdrop-blur-xl border border-black/10'
      }
      shadow-xl grid grid-cols-5 gap-1.5
    `}>
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onSelect(color)}
          className={`
            w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110
            ${selectedColor === color
              ? 'border-cyan-400 scale-110'
              : 'border-transparent'
            }
          `}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export const DashboardBuilderWidget: React.FC<DashboardBuilderWidgetProps> = ({ api: propApi }) => {
  const API = propApi || (window as any).WidgetAPI || {
    emitOutput: console.log,
    setState: console.log,
    onInput: () => {},
    onStateChange: () => {},
    onMount: (cb: any) => cb({ state: {} }),
    log: console.log
  };

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('rectangle');
  const [selectedColor, setSelectedColor] = useState<string>('#8b5cf6');
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);

  // Emit current tool mode to canvas
  const emitToolMode = useCallback((tool: ToolType, shape?: ShapeType, color?: string) => {
    API.emitOutput('tool.mode', {
      tool,
      shape: tool === 'shapes' ? (shape || selectedShape) : undefined,
      color: tool === 'bucket' ? (color || selectedColor) : undefined,
      timestamp: Date.now()
    });
  }, [API, selectedShape, selectedColor]);

  useEffect(() => {
    API.onMount((context: any) => {
      if (context.state) {
        if (context.state.activeTool) setActiveTool(context.state.activeTool);
        if (context.state.theme) setTheme(context.state.theme);
        if (context.state.selectedShape) setSelectedShape(context.state.selectedShape);
        if (context.state.selectedColor) setSelectedColor(context.state.selectedColor);
      }
      // Emit initial tool mode
      emitToolMode(context.state?.activeTool || 'select');
    });

    // Listen for canvas clicks to handle tool actions
    API.onInput('canvas.click', (event: CanvasClickEvent) => {
      handleCanvasClick(event);
    });

    API.onInput('activeTool', (tool: ToolType) => {
      setActiveTool(tool);
      API.setState({ activeTool: tool });
      emitToolMode(tool);
    });

    API.onInput('theme', (newTheme: 'light' | 'dark') => {
      setTheme(newTheme);
      API.setState({ theme: newTheme });
    });

    API.onStateChange((newState: any) => {
      if (newState.activeTool) setActiveTool(newState.activeTool);
      if (newState.theme) setTheme(newState.theme);
    });
  }, []);

  // Handle canvas click based on active tool
  const handleCanvasClick = useCallback((event: CanvasClickEvent) => {
    const { canvasX, canvasY, shiftKey } = event;

    switch (activeTool) {
      case 'text':
        // Spawn text element at click position
        API.emitOutput('spawn.text', {
          type: 'text',
          x: canvasX,
          y: canvasY,
          text: 'Double-click to edit',
          fontSize: 16,
          fontFamily: 'Inter, sans-serif',
          color: selectedColor,
          id: `text-${Date.now()}`
        });
        API.log(`Spawned text at (${canvasX}, ${canvasY})`);
        break;

      case 'shapes':
        // Spawn shape at click position
        API.emitOutput('spawn.shape', {
          type: 'shape',
          shapeType: selectedShape,
          x: canvasX,
          y: canvasY,
          width: 100,
          height: selectedShape === 'line' ? 2 : 100,
          fill: selectedColor,
          stroke: theme === 'dark' ? '#ffffff' : '#000000',
          strokeWidth: 2,
          id: `shape-${Date.now()}`
        });
        API.log(`Spawned ${selectedShape} at (${canvasX}, ${canvasY})`);
        break;

      case 'pen':
        // Add anchor point for path
        const newPoint = { x: canvasX, y: canvasY };
        const newPoints = shiftKey ? [] : [...pathPoints, newPoint];

        if (shiftKey || pathPoints.length === 0) {
          // Start new path
          setPathPoints([newPoint]);
          API.emitOutput('spawn.anchor', {
            type: 'anchor',
            x: canvasX,
            y: canvasY,
            isStart: true,
            pathId: `path-${Date.now()}`,
            id: `anchor-${Date.now()}`
          });
        } else {
          // Add to existing path
          setPathPoints(newPoints);
          API.emitOutput('spawn.anchor', {
            type: 'anchor',
            x: canvasX,
            y: canvasY,
            isStart: false,
            pathId: pathPoints.length > 0 ? `path-continue` : `path-${Date.now()}`,
            id: `anchor-${Date.now()}`
          });

          // Also emit path segment
          if (pathPoints.length > 0) {
            const lastPoint = pathPoints[pathPoints.length - 1];
            API.emitOutput('spawn.path', {
              type: 'path',
              points: [lastPoint, newPoint],
              stroke: selectedColor,
              strokeWidth: 2,
              id: `pathseg-${Date.now()}`
            });
          }
        }
        API.log(`Added anchor at (${canvasX}, ${canvasY}), path length: ${newPoints.length}`);
        break;

      case 'bucket':
        // Fill at position
        API.emitOutput('canvas.fill', {
          type: 'fill',
          x: canvasX,
          y: canvasY,
          color: selectedColor,
          timestamp: Date.now()
        });
        API.log(`Fill at (${canvasX}, ${canvasY}) with ${selectedColor}`);
        break;

      case 'eraser':
        // Erase at position
        API.emitOutput('canvas.erase', {
          type: 'erase',
          x: canvasX,
          y: canvasY,
          radius: 20,
          timestamp: Date.now()
        });
        API.log(`Erase at (${canvasX}, ${canvasY})`);
        break;

      default:
        // Select/Move modes don't spawn anything
        break;
    }
  }, [activeTool, selectedShape, selectedColor, pathPoints, theme, API]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    API.setState({ theme: newTheme });
    API.emitOutput('theme:changed', { theme: newTheme });
  };

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    setShowShapePicker(false);
    setShowColorPicker(false);

    // Reset path points when switching away from pen
    if (tool !== 'pen') {
      setPathPoints([]);
    }

    API.setState({ activeTool: tool });
    API.emitOutput('tool:changed', { tool });
    emitToolMode(tool);
  };

  const handleShapeSelect = (shape: ShapeType) => {
    setSelectedShape(shape);
    setShowShapePicker(false);
    API.setState({ selectedShape: shape });
    emitToolMode('shapes', shape);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
    API.setState({ selectedColor: color });
    if (activeTool === 'bucket') {
      emitToolMode('bucket', undefined, color);
    }
  };

  const handleSave = () => {
    API.emitOutput('toolbar:saved', {
      activeTool,
      theme,
      selectedShape,
      selectedColor,
      timestamp: Date.now()
    });
  };

  // Double-click on shapes opens picker
  const handleShapesClick = () => {
    if (activeTool === 'shapes') {
      setShowShapePicker(!showShapePicker);
      setShowColorPicker(false);
    } else {
      handleToolChange('shapes');
    }
  };

  // Double-click on bucket opens color picker
  const handleBucketClick = () => {
    if (activeTool === 'bucket') {
      setShowColorPicker(!showColorPicker);
      setShowShapePicker(false);
    } else {
      handleToolChange('bucket');
    }
  };

  return (
    <div className={`
      relative w-full h-full transition-colors duration-500 ease-in-out
      ${theme === 'dark' ? 'bg-transparent' : 'bg-transparent'}
      flex items-start justify-start p-2
      font-sans selection:bg-cyan-500/30
    `}>
      {/* Main Tools Dock */}
      <Toolbar orientation="vertical" theme={theme}>
        {/* Tools Section */}
        <ToolbarSlot
          isActive={activeTool === 'select'}
          onClick={() => handleToolChange('select')}
          label="Select (V)"
          theme={theme}
        >
          <MousePointer2 size={20} />
        </ToolbarSlot>

        <ToolbarSlot
          isActive={activeTool === 'move'}
          onClick={() => handleToolChange('move')}
          label="Move (M)"
          theme={theme}
        >
          <Move size={20} />
        </ToolbarSlot>

        <ToolbarSlot
          isActive={activeTool === 'text'}
          onClick={() => handleToolChange('text')}
          label="Text (T) - Click canvas to add"
          theme={theme}
        >
          <Type size={20} />
        </ToolbarSlot>

        <ToolbarSlot
          isActive={activeTool === 'pen'}
          onClick={() => handleToolChange('pen')}
          label="Pen (P) - Click to add anchor points"
          theme={theme}
        >
          <PenTool size={20} />
          {pathPoints.length > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
              {pathPoints.length}
            </div>
          )}
        </ToolbarSlot>

        <div className="relative">
          <ToolbarSlot
            isActive={activeTool === 'shapes'}
            onClick={handleShapesClick}
            label="Shapes (S) - Click again for options"
            theme={theme}
          >
            <Shapes size={20} />
          </ToolbarSlot>
          <ShapePicker
            isOpen={showShapePicker}
            theme={theme}
            selectedShape={selectedShape}
            onSelect={handleShapeSelect}
          />
        </div>

        <div className="relative">
          <ToolbarSlot
            isActive={activeTool === 'bucket'}
            onClick={handleBucketClick}
            label="Fill (G) - Click again for colors"
            theme={theme}
          >
            <PaintBucket size={20} />
            <div
              className="absolute bottom-1 right-1 w-3 h-3 rounded-sm border border-white/30"
              style={{ backgroundColor: selectedColor }}
            />
          </ToolbarSlot>
          <ColorPicker
            isOpen={showColorPicker}
            theme={theme}
            selectedColor={selectedColor}
            onSelect={handleColorSelect}
          />
        </div>

        <ToolbarSlot
          isActive={activeTool === 'eraser'}
          onClick={() => handleToolChange('eraser')}
          label="Eraser (E)"
          theme={theme}
        >
          <Eraser size={20} />
        </ToolbarSlot>

        <div className={`h-px w-full my-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`} />

        <ToolbarSlot isEmpty label="Add Tool" theme={theme}>
          <Plus size={20} />
        </ToolbarSlot>

        <div className={`h-px w-full my-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`} />

        {/* Bottom Actions Section */}
        <div className="flex flex-row gap-1.5 w-full">
          <ToolbarSlot
            variant="action"
            onClick={toggleTheme}
            label="Toggle Theme"
            theme={theme}
            className="!h-8 !aspect-auto flex-1"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </ToolbarSlot>

          <ToolbarSlot
            variant="action"
            label="Save"
            theme={theme}
            className="!h-8 !aspect-auto flex-1"
            onClick={handleSave}
          >
            <Save size={14} />
          </ToolbarSlot>
        </div>
      </Toolbar>

      {/* Active Tool Indicator */}
      <div className={`
        absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg text-xs
        ${theme === 'dark'
          ? 'bg-white/5 text-white/60'
          : 'bg-black/5 text-black/60'
        }
        flex items-center justify-between
      `}>
        <span>Tool: <strong className={theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}>{activeTool}</strong></span>
        {activeTool === 'shapes' && (
          <span>Shape: <strong className={theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}>{selectedShape}</strong></span>
        )}
        {activeTool === 'pen' && pathPoints.length > 0 && (
          <span>Points: <strong className={theme === 'dark' ? 'text-cyan-400' : 'text-indigo-600'}>{pathPoints.length}</strong></span>
        )}
      </div>
    </div>
  );
};

export default DashboardBuilderWidget;






