/**
 * StickerNest v2 - Container Widget
 *
 * A container widget that can hold and organize child widgets.
 * Supports various layout modes and styling options.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ContainerWidgetManifest: WidgetManifest = {
  id: 'stickernest.container',
  name: 'Container',
  version: '1.0.0',
  kind: 'container',
  entry: 'index.html',
  description: 'A container that can hold and organize child widgets',
  author: 'StickerNest',
  tags: ['container', 'layout', 'group', 'panel', 'core'],
  inputs: {
    layout: {
      type: 'string',
      description: 'Layout mode: stack, grid, flow, free',
      default: 'stack',
    },
    direction: {
      type: 'string',
      description: 'Stack direction: horizontal, vertical',
      default: 'vertical',
    },
    gap: {
      type: 'number',
      description: 'Gap between children in pixels',
      default: 8,
    },
    padding: {
      type: 'number',
      description: 'Container padding in pixels',
      default: 16,
    },
    backgroundColor: {
      type: 'string',
      description: 'Background color',
      default: 'rgba(255,255,255,0.1)',
    },
    borderRadius: {
      type: 'number',
      description: 'Border radius in pixels',
      default: 12,
    },
    title: {
      type: 'string',
      description: 'Container title (optional)',
      default: '',
    },
    collapsible: {
      type: 'boolean',
      description: 'Whether container can be collapsed',
      default: false,
    },
  },
  outputs: {
    childAdded: {
      type: 'object',
      description: 'Emitted when a child widget is added',
    },
    childRemoved: {
      type: 'object',
      description: 'Emitted when a child widget is removed',
    },
    collapsed: {
      type: 'boolean',
      description: 'Emitted when container is collapsed/expanded',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['ui.show', 'ui.hide', 'ui.toggle', 'state.set', 'data.set', 'action.trigger'],
    outputs: ['ui.clicked', 'state.changed', 'ui.resized'],
  },
  size: {
    width: 320,
    height: 480,
    minWidth: 150,
    minHeight: 100,
    scaleMode: 'stretch',
  },
};

export const ContainerWidgetHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: rgba(25, 25, 35, 0.85); /* Slightly darker, premium panel feel */
      backdrop-filter: blur(12px);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    .header {
      display: none;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      user-select: none;
      gap: 8px;
    }
    .header.visible {
      display: flex;
    }
    .title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      letter-spacing: 0.5px;
    }
    .header-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.4);
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .header-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .collapse-btn.collapsed {
      transform: rotate(-90deg);
    }
    .content {
      flex: 1;
      display: flex;
      padding: 16px;
      gap: 12px;
      overflow-y: auto;
      overflow-x: hidden;
      transition: height 0.3s ease;
    }
    .content.collapsed {
      height: 0 !important;
      padding: 0 16px;
      overflow: hidden;
    }
    .content.stack {
      flex-direction: column;
    }
    .content.stack.horizontal {
      flex-direction: row;
      overflow-y: hidden;
      overflow-x: auto;
    }
    .content.grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
    .content.flow {
      flex-wrap: wrap;
    }
    .content.free {
      position: relative;
    }
    
    /* Clean Scrollbar */
    .content::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .content::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.02);
      margin: 4px 0;
    }
    .content::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }
    .content::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.2);
    }

    .drop-zone {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 80px;
      border: 2px dashed rgba(255,255,255,0.1);
      border-radius: 8px;
      color: rgba(255,255,255,0.3);
      font-size: 13px;
      text-align: center;
      padding: 16px;
      margin-top: 8px;
      transition: all 0.2s ease;
    }
    .drop-zone.has-children {
      display: none;
      border: 1px dashed rgba(255,255,255,0.05);
      min-height: 40px;
      font-size: 11px;
      color: rgba(255,255,255,0.2);
    }
    .drop-zone:hover {
      border-color: rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.5);
    }
    .drop-zone.drag-over {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      color: #8b5cf6;
      min-height: 80px;
    }

    .child-placeholder {
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.5);
      font-size: 13px;
      text-align: center;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Resize Handle */
    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .container:hover .resize-handle {
      opacity: 1;
    }
    .resize-handle::after {
      content: '';
      position: absolute;
      bottom: 5px;
      right: 5px;
      width: 6px;
      height: 6px;
      border-right: 2px solid rgba(255,255,255,0.3);
      border-bottom: 2px solid rgba(255,255,255,0.3);
      border-radius: 0 0 2px 0;
    }
  </style>
</head>
<body>
  <div class="container" id="container">
    <div class="header" id="header">
      <span class="title" id="title"></span>
      <div style="flex: 1"></div>
      <button class="header-btn" id="saveBtn" title="Save Dock Preset">💾</button>
      <button class="header-btn collapse-btn" id="collapseBtn">▼</button>
    </div>
    <div class="content stack" id="content">
      <div class="drop-zone" id="dropZone">
        <span>Drop widgets here</span>
      </div>
    </div>
    <div class="resize-handle"></div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const container = document.getElementById('container');
      const header = document.getElementById('header');
      const title = document.getElementById('title');
      const collapseBtn = document.getElementById('collapseBtn');
      const saveBtn = document.getElementById('saveBtn');
      const content = document.getElementById('content');
      const dropZone = document.getElementById('dropZone');

      let layout = 'stack';
      let direction = 'vertical';
      let gap = 12;
      let padding = 16;
      let backgroundColor = 'rgba(25, 25, 35, 0.85)';
      let borderRadius = 12;
      let collapsible = false;
      let isCollapsed = false;
      let children = [];

      function applyStyles() {
        if (!state.backgroundColor) { 
        }
        container.style.background = backgroundColor;
        container.style.borderRadius = borderRadius + 'px';
        content.style.padding = padding + 'px';
        content.style.gap = gap + 'px';

        content.className = 'content ' + layout;
        if (layout === 'stack' && direction === 'horizontal') {
          content.classList.add('horizontal');
        }
        if (layout === 'grid') {
          content.style.gridGap = gap + 'px';
        }
      }

      function updateHeader() {
        // If specific state isn't set, default to no title
        const titleText = API.getState().title || '';
        // Also show header if specifically requested or if collapsible
        if (titleText || collapsible) {
          header.classList.add('visible');
          title.textContent = titleText || 'Container';
          collapseBtn.style.display = collapsible ? 'flex' : 'none';
        } else {
          header.classList.remove('visible');
        }
      }

      function toggleCollapse() {
        if (!collapsible) return;
        isCollapsed = !isCollapsed;
        content.classList.toggle('collapsed', isCollapsed);
        collapseBtn.classList.toggle('collapsed', isCollapsed);
        API.setState({ isCollapsed: isCollapsed });
        API.emitOutput('state.changed', { isCollapsed: isCollapsed });
      }

      function addChild(childData) {
        // Optimistic add, waiting for state update to confirm
        children.push(childData);
        API.emitOutput('state.changed', { children: children });
      }
      
      // Initialize state object variable
      let state = {};

      function updateChildrenList() {
        // Remove existing wrappers
        const wrappers = content.querySelectorAll('.child-wrapper');
        wrappers.forEach(w => w.remove());
        const existingPlaceholders = content.querySelectorAll('.child-placeholder');
        existingPlaceholders.forEach(p => p.remove());
        
        children.forEach(child => {
          const wrapper = document.createElement('div');
          wrapper.className = 'child-wrapper';
          wrapper.style.width = '100%';
          // Use flex-shrink 0 to prevent squashing
          wrapper.style.flexShrink = '0';
          wrapper.style.position = 'relative';
          wrapper.style.display = 'flex';
          wrapper.style.flexDirection = 'column';
          wrapper.dataset.childId = child.id;

          // Determine height
          let height = 150; // Default
          if (child.savedInstance && child.savedInstance.height) {
            height = child.savedInstance.height;
          } else if (child.manifest && child.manifest.size && child.manifest.size.height) {
            height = child.manifest.size.height;
          }
          wrapper.style.height = height + 'px';

          // --- Toolbar ---
          const toolbar = document.createElement('div');
          toolbar.className = 'child-toolbar';
          toolbar.style.height = '24px';
          toolbar.style.background = 'rgba(0,0,0,0.4)';
          toolbar.style.display = 'flex';
          toolbar.style.alignItems = 'center';
          toolbar.style.padding = '0 8px';
          toolbar.style.gap = '8px';
          toolbar.style.cursor = 'grab';
          toolbar.style.flexShrink = '0';
          
          // Drag Handle
          const dragHandle = document.createElement('span');
          dragHandle.textContent = '::';
          dragHandle.style.color = 'rgba(255,255,255,0.4)';
          dragHandle.style.marginRight = '4px';
          toolbar.appendChild(dragHandle);

          // Title
          const title = document.createElement('span');
          title.textContent = child.name || 'Widget';
          title.style.flex = '1';
          title.style.fontSize = '11px';
          title.style.color = 'rgba(255,255,255,0.8)';
          title.style.whiteSpace = 'nowrap';
          title.style.overflow = 'hidden';
          title.style.textOverflow = 'ellipsis';
          toolbar.appendChild(title);

          // Undock Button
          const undockBtn = document.createElement('button');
          undockBtn.textContent = '⇱'; // North West Arrow
          undockBtn.title = 'Undock';
          undockBtn.style.background = 'transparent';
          undockBtn.style.border = 'none';
          undockBtn.style.color = 'rgba(255,255,255,0.6)';
          undockBtn.style.cursor = 'pointer';
          undockBtn.style.fontSize = '12px';
          undockBtn.onclick = (e) => {
            e.stopPropagation();
            API.emitOutput('action.triggered', { action: 'undock', childId: child.id });
          };
          toolbar.appendChild(undockBtn);

          // Remove Button
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '×';
          removeBtn.title = 'Remove';
          removeBtn.style.background = 'transparent';
          removeBtn.style.border = 'none';
          removeBtn.style.color = 'rgba(255,255,255,0.6)';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.fontSize = '14px';
          removeBtn.onclick = (e) => {
            e.stopPropagation();
            API.emitOutput('action.triggered', { action: 'remove', childId: child.id });
             // Optimistic remove
            wrapper.remove();
          };
          toolbar.appendChild(removeBtn);

          wrapper.appendChild(toolbar);

          // --- Widget Content ---
          const widgetContainer = document.createElement('div');
          widgetContainer.style.flex = '1';
          widgetContainer.style.position = 'relative';
          widgetContainer.style.overflow = 'hidden';
          widgetContainer.style.background = 'rgba(0,0,0,0.1)';

          if (child.html) {
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.background = 'transparent';
            
            let contentHtml = child.html || '';
            if (!contentHtml.includes('<html') && !contentHtml.includes('<!DOCTYPE')) {
               contentHtml = '<style>body{margin:0;overflow:hidden;background:transparent;}</style>' + contentHtml;
            }
            
            iframe.srcdoc = contentHtml;
            // Allow pointer events for interaction!
            iframe.style.pointerEvents = 'auto'; 
            widgetContainer.appendChild(iframe);
            
          } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'child-placeholder';
            placeholder.textContent = child.name || child.id || 'Widget';
            placeholder.style.height = '100%';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.color = 'rgba(255,255,255,0.3)';
            widgetContainer.appendChild(placeholder);
          }
          wrapper.appendChild(widgetContainer);

          // --- Vertical Resize Handle ---
          const resizeHandle = document.createElement('div');
          resizeHandle.style.height = '6px';
          resizeHandle.style.background = 'rgba(255,255,255,0.05)';
          resizeHandle.style.cursor = 'ns-resize';
          resizeHandle.style.flexShrink = '0';
          resizeHandle.className = 'child-resize-handle';
          resizeHandle.onmousedown = (e) => {
             e.preventDefault();
             e.stopPropagation();
             const startY = e.clientY;
             const startHeight = wrapper.offsetHeight;
             
             const onMove = (moveEvent) => {
               const diff = moveEvent.clientY - startY;
               const newHeight = Math.max(50, startHeight + diff);
               wrapper.style.height = newHeight + 'px';
             };
             
             const onUp = () => {
               document.removeEventListener('mousemove', onMove);
               document.removeEventListener('mouseup', onUp);
               // Persist new height
               const newHeight = parseInt(wrapper.style.height);
               if (child.savedInstance) child.savedInstance.height = newHeight;
               // Also update the child in our local array to persist
               const childIndex = children.findIndex(c => c.id === child.id);
               if (childIndex !== -1) {
                  if (!children[childIndex].savedInstance) children[childIndex].savedInstance = {};
                  children[childIndex].savedInstance.height = newHeight;
               }
               API.setState({ children: children });
             };
             
             document.addEventListener('mousemove', onMove);
             document.addEventListener('mouseup', onUp);
          };
          wrapper.appendChild(resizeHandle);

          content.insertBefore(wrapper, dropZone);
        });
      }

      function updateState(newState) {
        state = newState || {};
        
        if (state.layout !== undefined) layout = state.layout;
        if (state.direction !== undefined) direction = state.direction;
        if (state.gap !== undefined) gap = state.gap;
        if (state.padding !== undefined) padding = state.padding;
        
        if (state.backgroundColor !== undefined) backgroundColor = state.backgroundColor;
        else backgroundColor = 'rgba(25, 25, 35, 0.85)';
        
        if (state.borderRadius !== undefined) borderRadius = state.borderRadius;
        
        if (state.title !== undefined) {
          API.setState({ title: state.title });
        }
        if (state.collapsible !== undefined) {
          collapsible = state.collapsible;
        }
        
        updateHeader();

        if (state.children !== undefined) {
          children = state.children || [];
          API.log('Container children updated:', children.length);
          updateChildrenList();
        }
        applyStyles();
      }

      // Initialize
      API.onMount(function(context) {
        const initialState = context.state || {};
        
        // Defaults if not in state
        layout = initialState.layout || 'stack';
        direction = initialState.direction || 'vertical';
        gap = initialState.gap !== undefined ? initialState.gap : 12;
        padding = initialState.padding !== undefined ? initialState.padding : 16;
        backgroundColor = initialState.backgroundColor || 'rgba(25, 25, 35, 0.85)';
        borderRadius = initialState.borderRadius || 12;
        collapsible = initialState.collapsible || false;
        
        children = initialState.children || [];
        
        // Initial setup
        updateState(initialState);
        updateHeader(); // Ensure header is consistent

        if (initialState.isCollapsed) {
          isCollapsed = true;
          content.classList.add('collapsed');
          collapseBtn.classList.add('collapsed');
        }

        API.log('ContainerWidget mounted');
      });

      // Header click
      header.addEventListener('click', function(e) {
         if (e.target !== saveBtn && e.target !== collapseBtn) {
             toggleCollapse();
         }
      });
      
      saveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        API.emitOutput('action.triggered', { action: 'save_preset' });
      });
      
      collapseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleCollapse();
      });

      // Drop zone events
      dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        try {
          // 1. Try JSON (legacy/internal)
          const rawData = e.dataTransfer.getData('application/json');
          if (rawData) {
            const data = JSON.parse(rawData);
            if (data && data.widgetId) {
              addChild({ id: data.widgetId, name: data.name });
              API.emit('container:child-added', { childId: data.widgetId });
              return;
            }
          }

          // 2. Try text/widget-id (Existing widget on canvas)
          const widgetId = e.dataTransfer.getData('text/widget-id');
          if (widgetId) {
            addChild({ id: widgetId, name: 'Widget ' + widgetId.substring(0, 8) });
            API.emit('container:child-added', { childId: widgetId });
            return;
          }

          // 3. Try text/widget-def-id (New widget from library)
          const widgetDefId = e.dataTransfer.getData('text/widget-def-id');
          if (widgetDefId) {
            // Request host to create the widget
            API.emit('container:create-child', { widgetDefId: widgetDefId });
            return;
          }
        } catch (err) {
          console.error('Drop handling error:', err);
        }
      });

      // Pipeline inputs
      API.onInput('ui.show', function() {
        container.style.display = 'flex';
      });

      API.onInput('ui.hide', function() {
        container.style.display = 'none';
      });

      API.onInput('ui.toggle', toggleCollapse);

      API.onInput('state.set', function (newState) {
        updateState(newState);
        API.setState(newState); // Persist input changes
      });

      API.onStateChange(function (newState) {
        updateState(newState);
      });

      API.onInput('data.set', function (data) {
        if (Array.isArray(data)) {
          // Replcae children via data
          API.onInput('state.set', { children: data });
        } else if (data) {
          API.onInput('state.set', data);
        }
      });

      API.onInput('action.trigger', function (action) {
        if (action === 'collapse') {
          if (!isCollapsed) toggleCollapse();
        } else if (action === 'expand') {
          if (isCollapsed) toggleCollapse();
        } else if (action === 'toggle') {
          toggleCollapse();
        } else if (action === 'clear') {
           API.emitOutput('state.changed', { children: [] });
           updateState({ ...state, children: [] });
        }
      });

      API.onResize(function (size) {
        API.emitOutput('ui.resized', size);
      });

      API.onDestroy(function () {
        API.log('ContainerWidget destroyed');
      });
    }) ();
  </script>
</body>
</html>
`;

export const ContainerWidget: BuiltinWidget = {
  manifest: ContainerWidgetManifest,
  html: ContainerWidgetHTML,
};
