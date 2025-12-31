/**
 * StickerNest v2 - Todo List Widget
 *
 * A task list widget with add, complete, and remove functionality.
 */

import type { WidgetManifest } from '../../types/manifest';
import type { BuiltinWidget } from './index';

export const ToDoListWidgetManifest: WidgetManifest = {
  id: 'stickernest.todo-list',
  name: 'Todo List',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'A task list widget with add, complete, and remove functionality',
  author: 'StickerNest',
  tags: ['todo', 'list', 'tasks', 'productivity', 'interactive', 'core'],
  inputs: {
    items: {
      type: 'array',
      description: 'List of todo items',
      default: [],
    },
  },
  outputs: {
    itemAdded: {
      type: 'object',
      description: 'Emitted when an item is added',
    },
    itemCompleted: {
      type: 'object',
      description: 'Emitted when an item is completed',
    },
    itemRemoved: {
      type: 'object',
      description: 'Emitted when an item is removed',
    },
    listChanged: {
      type: 'array',
      description: 'Emitted when the list changes',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['data.set', 'list.add', 'list.clear', 'action.trigger'],
    outputs: ['list.itemSelected', 'list.itemRemoved', 'list.reordered', 'data.changed'],
  },
  size: {
    width: 280,
    height: 320,
    minWidth: 200,
    minHeight: 150,
    scaleMode: 'stretch',
  },
};

export const ToDoListWidgetHTML = `
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      overflow: hidden;
    }
    .header {
      padding: 16px;
      background: rgba(0,0,0,0.2);
    }
    .header h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header .count {
      font-size: 12px;
      opacity: 0.8;
    }
    .add-form {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.1);
    }
    .add-input {
      flex: 1;
      padding: 10px 14px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      background: rgba(255,255,255,0.9);
      color: #333;
      outline: none;
    }
    .add-input::placeholder {
      color: #999;
    }
    .add-btn {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: white;
      color: #667eea;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .add-btn:hover {
      transform: scale(1.1);
    }
    .list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.1);
      margin: 4px 12px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .item:hover {
      background: rgba(255,255,255,0.2);
    }
    .item.completed {
      opacity: 0.6;
    }
    .item.completed .item-text {
      text-decoration: line-through;
    }
    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid rgba(255,255,255,0.5);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .checkbox:hover {
      border-color: white;
    }
    .checkbox.checked {
      background: white;
      border-color: white;
    }
    .checkbox.checked::after {
      content: '✓';
      color: #667eea;
      font-weight: bold;
    }
    .item-text {
      flex: 1;
      font-size: 14px;
      word-break: break-word;
    }
    .delete-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .delete-btn:hover {
      background: rgba(255,0,0,0.3);
      color: white;
    }
    .empty {
      padding: 32px 16px;
      text-align: center;
      opacity: 0.6;
    }
    .footer {
      padding: 8px 16px;
      background: rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      opacity: 0.8;
    }
    .clear-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      opacity: 0.8;
      font-size: 12px;
    }
    .clear-btn:hover {
      opacity: 1;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Todo List</h2>
      <div class="count" id="count">0 tasks</div>
    </div>
    <form class="add-form" id="addForm">
      <input type="text" class="add-input" id="addInput" placeholder="Add a new task..." />
      <button type="submit" class="add-btn">+</button>
    </form>
    <div class="list" id="list"></div>
    <div class="footer">
      <span id="completedCount">0 completed</span>
      <button class="clear-btn" id="clearCompleted">Clear completed</button>
    </div>
  </div>
  <script>
    (function() {
      const API = window.WidgetAPI;
      const listEl = document.getElementById('list');
      const addForm = document.getElementById('addForm');
      const addInput = document.getElementById('addInput');
      const countEl = document.getElementById('count');
      const completedCountEl = document.getElementById('completedCount');
      const clearCompletedBtn = document.getElementById('clearCompleted');

      let items = [];
      let nextId = 1;
      let documentId = null;  // Reference to unified document store
      let saveTimeout = null;

      function render() {
        if (items.length === 0) {
          listEl.innerHTML = '<div class="empty">No tasks yet. Add one above!</div>';
        } else {
          listEl.innerHTML = items.map(item => \`
            <div class="item \${item.completed ? 'completed' : ''}" data-id="\${item.id}">
              <div class="checkbox \${item.completed ? 'checked' : ''}" data-action="toggle"></div>
              <span class="item-text">\${escapeHtml(item.text)}</span>
              <button class="delete-btn" data-action="delete">×</button>
            </div>
          \`).join('');
        }

        const total = items.length;
        const completed = items.filter(i => i.completed).length;
        countEl.textContent = total + ' task' + (total !== 1 ? 's' : '');
        completedCountEl.textContent = completed + ' completed';
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      async function saveAndEmit() {
        // Debounce saves
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
          const content = JSON.stringify(items);
          const title = 'Todo List (' + items.length + ' items)';

          try {
            if (documentId) {
              await API.request('document:update', {
                id: documentId,
                updates: { title, content }
              });
            } else {
              const result = await API.request('document:create', {
                title,
                content,
                contentType: 'text',
                category: 'todo',
                tags: ['todo', 'tasks'],
                sourceType: 'manual',
              });
              documentId = result.document.id;
              API.setState({ documentId });
            }
          } catch (err) {
            API.log('Failed to save todo list: ' + err.message, 'error');
          }

          API.emitOutput('data.changed', items);
          API.emitOutput('list.reordered', items);
        }, 500);
      }

      function addItem(text) {
        if (!text.trim()) return;
        const item = { id: nextId++, text: text.trim(), completed: false, createdAt: Date.now() };
        items.push(item);
        render();
        saveAndEmit();
        API.emitOutput('list.itemSelected', item);
        API.log('Item added: ' + item.text);
      }

      function toggleItem(id) {
        const item = items.find(i => i.id === id);
        if (item) {
          item.completed = !item.completed;
          render();
          saveAndEmit();
          if (item.completed) {
            API.emitOutput('list.itemSelected', item);
          }
        }
      }

      function deleteItem(id) {
        const item = items.find(i => i.id === id);
        if (item) {
          items = items.filter(i => i.id !== id);
          render();
          saveAndEmit();
          API.emitOutput('list.itemRemoved', item);
        }
      }

      // Initialize
      API.onMount(async function(context) {
        const state = context.state || {};

        if (state.documentId) {
          // Load from unified store
          documentId = state.documentId;
          try {
            const result = await API.request('document:get', { id: documentId });
            if (result.document && result.document.content) {
              items = JSON.parse(result.document.content);
              nextId = Math.max(1, ...items.map(i => i.id || 0)) + 1;
              API.log('Loaded todo list from unified store');
            }
          } catch (err) {
            API.log('Failed to load todo list: ' + err.message, 'error');
          }
        } else if (Array.isArray(state.items) && state.items.length > 0) {
          // Migrate legacy items to unified store
          items = state.items;
          nextId = Math.max(1, ...items.map(i => i.id || 0)) + 1;

          try {
            const content = JSON.stringify(items);
            const result = await API.request('document:create', {
              title: 'Todo List (' + items.length + ' items)',
              content,
              contentType: 'text',
              category: 'todo',
              tags: ['todo', 'tasks'],
              sourceType: 'import',
            });
            documentId = result.document.id;
            API.setState({
              documentId,
              items: undefined  // Clear legacy field
            });
            API.log('Migrated todo list to unified store');
          } catch (err) {
            API.log('Failed to migrate todo list: ' + err.message, 'error');
          }
        }

        render();
        API.log('ToDoListWidget mounted');
      });

      // Form submit
      addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addItem(addInput.value);
        addInput.value = '';
      });

      // List clicks
      listEl.addEventListener('click', function(e) {
        const target = e.target;
        const action = target.dataset.action;
        const itemEl = target.closest('.item');
        if (!itemEl) return;
        const id = parseInt(itemEl.dataset.id, 10);

        if (action === 'toggle') {
          toggleItem(id);
        } else if (action === 'delete') {
          deleteItem(id);
        }
      });

      // Clear completed
      clearCompletedBtn.addEventListener('click', function() {
        items = items.filter(i => !i.completed);
        render();
        saveAndEmit();
      });

      // Handle data.set input
      API.onInput('data.set', function(data) {
        if (Array.isArray(data)) {
          items = data.map((item, i) => ({
            id: item.id || nextId + i,
            text: item.text || String(item),
            completed: item.completed || false,
            createdAt: item.createdAt || Date.now()
          }));
          nextId = Math.max(nextId, ...items.map(i => i.id)) + 1;
        } else if (data && Array.isArray(data.items)) {
          items = data.items;
          nextId = Math.max(nextId, ...items.map(i => i.id || 0)) + 1;
        }
        render();
        saveAndEmit();
      });

      // Handle list.add
      API.onInput('list.add', function(value) {
        if (typeof value === 'string') {
          addItem(value);
        } else if (value && value.text) {
          addItem(value.text);
        }
      });

      // Handle list.clear
      API.onInput('list.clear', function() {
        items = [];
        render();
        saveAndEmit();
      });

      // Handle action.trigger
      API.onInput('action.trigger', function(action) {
        if (action === 'clear' || action === 'clearAll') {
          items = [];
          render();
          saveAndEmit();
        } else if (action === 'clearCompleted') {
          items = items.filter(i => !i.completed);
          render();
          saveAndEmit();
        }
      });

      API.onDestroy(function() {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        API.log('ToDoListWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ToDoListWidget: BuiltinWidget = {
  manifest: ToDoListWidgetManifest,
  html: ToDoListWidgetHTML,
};
