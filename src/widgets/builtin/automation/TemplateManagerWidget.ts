/**
 * Template Manager Widget (System Widget)
 *
 * Pipeline owner control panel for managing templates.
 * - Upload new templates (JSON files)
 * - Edit existing templates
 * - Preview template zones
 * - Set default templates
 * - Export templates
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const TemplateManagerManifest: WidgetManifest = {
  id: 'stickernest.template-manager',
  name: 'Template Manager',
  version: '1.0.0',
  kind: 'hybrid',
  entry: 'index.html',
  description: 'System widget for pipeline owners to upload, edit, and manage templates. Configure which templates are available to end users.',
  author: 'StickerNest',
  tags: ['system', 'admin', 'template', 'manager', 'configuration'],
  inputs: {
    loadTemplates: {
      type: 'trigger',
      description: 'Load all stored templates',
    },
    importTemplate: {
      type: 'object',
      description: 'Import a template JSON object',
    },
    deleteTemplate: {
      type: 'string',
      description: 'Delete template by ID',
    },
    setDefault: {
      type: 'string',
      description: 'Set a template as default',
    },
  },
  outputs: {
    templatesUpdated: {
      type: 'array',
      description: 'Full list of templates after changes',
    },
    templateSelected: {
      type: 'object',
      description: 'Currently selected template for editing',
    },
    templateExported: {
      type: 'object',
      description: 'Template data for export',
    },
    error: {
      type: 'object',
      description: 'Error information',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: [
      'trigger.load',
      'template.import',
      'template.delete',
      'template.setDefault',
    ],
    outputs: [
      'templates.updated',
      'template.selected',
      'template.exported',
      'error.occurred',
    ],
  },
  size: {
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
  },
};

export const TemplateManagerHTML = `
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
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e2e8f0;
    }
    .header {
      padding: 16px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 11px;
      color: #94a3b8;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(0,0,0,0.1);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #e2e8f0;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    .template-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .template-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .template-card:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(139, 92, 246, 0.5);
    }
    .template-card.selected {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
    }
    .template-card.default {
      border-color: #22c55e;
    }
    .template-card.default::before {
      content: 'DEFAULT';
      font-size: 9px;
      padding: 2px 6px;
      background: #22c55e;
      color: white;
      border-radius: 4px;
      margin-right: 8px;
    }
    .template-name {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .template-meta {
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      gap: 12px;
    }
    .template-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .template-actions .btn {
      padding: 4px 10px;
      font-size: 10px;
    }
    .upload-zone {
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin-bottom: 16px;
      transition: all 0.2s;
    }
    .upload-zone:hover, .upload-zone.dragover {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
    }
    .upload-zone input {
      display: none;
    }
    .upload-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    .upload-text {
      font-size: 12px;
      color: #94a3b8;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }
    .zone-preview {
      margin-top: 12px;
      background: rgba(0,0,0,0.3);
      border-radius: 6px;
      padding: 8px;
    }
    .zone-preview canvas {
      width: 100%;
      height: 80px;
      border-radius: 4px;
    }
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal.open {
      display: flex;
    }
    .modal-content {
      background: #1e293b;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }
    .modal h3 {
      margin-bottom: 16px;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
    }
    .form-group textarea {
      min-height: 100px;
      resize: vertical;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📋 Template Manager</h2>
      <p>Upload and manage templates for your pipeline</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" id="btnUpload">+ Upload Template</button>
      <button class="btn btn-secondary" id="btnCreate">Create New</button>
      <button class="btn btn-secondary" id="btnRefresh">↻ Refresh</button>
    </div>

    <div class="content">
      <div class="upload-zone" id="uploadZone">
        <input type="file" id="fileInput" accept=".json" multiple>
        <div class="upload-icon">📁</div>
        <div class="upload-text">Drop template JSON files here or click to upload</div>
      </div>

      <div class="template-list" id="templateList">
        <div class="empty-state">No templates loaded. Upload or create one.</div>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div class="modal" id="editModal">
    <div class="modal-content">
      <h3>Edit Template</h3>
      <div class="form-group">
        <label>Template Name</label>
        <input type="text" id="editName" placeholder="My Template">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="editCategory">
          <option value="business-card">Business Card</option>
          <option value="tarot">Tarot Card</option>
          <option value="birthday-card">Birthday Card</option>
          <option value="flyer">Flyer</option>
          <option value="poster">Poster</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="editDescription" placeholder="Template description..."></textarea>
      </div>
      <div class="form-group">
        <label>AI Prompt Template</label>
        <textarea id="editPrompt" placeholder="professional {{category}} design, {{stylePrompt}}, {{primaryColor}}..."></textarea>
      </div>
      <div class="form-group">
        <label>Compositor System Prompt</label>
        <textarea id="editCompositorPrompt" placeholder="Explain black/white zones to AI..."></textarea>
      </div>
      <div class="form-group">
        <label>Negative Prompt</label>
        <textarea id="editNegativePrompt" placeholder="text, watermark, blurry..."></textarea>
      </div>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn btn-secondary" id="btnCancelEdit">Cancel</button>
        <button class="btn btn-primary" id="btnSaveEdit">Save Changes</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        setState: () => {},
        log: console.log,
      };

      // State
      let templates = [];
      let selectedTemplateId = null;
      let defaultTemplateId = null;
      let editingTemplate = null;

      // DOM Elements
      const templateList = document.getElementById('templateList');
      const uploadZone = document.getElementById('uploadZone');
      const fileInput = document.getElementById('fileInput');
      const btnUpload = document.getElementById('btnUpload');
      const btnCreate = document.getElementById('btnCreate');
      const btnRefresh = document.getElementById('btnRefresh');
      const editModal = document.getElementById('editModal');

      // Storage key
      const STORAGE_KEY = 'sn_templates';
      const DEFAULT_KEY = 'sn_default_template';

      // Initialize
      API.onMount(function(context) {
        loadTemplatesFromStorage();
        setupEventListeners();
        API.log('TemplateManager mounted');
      });

      function setupEventListeners() {
        // Upload button
        btnUpload.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
          uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', handleFileDrop);
        uploadZone.addEventListener('click', () => fileInput.click());

        // Create new
        btnCreate.addEventListener('click', createNewTemplate);

        // Refresh
        btnRefresh.addEventListener('click', loadTemplatesFromStorage);

        // Modal buttons
        document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
        document.getElementById('btnSaveEdit').addEventListener('click', saveEditedTemplate);
      }

      function loadTemplatesFromStorage() {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          templates = stored ? JSON.parse(stored) : [];
          defaultTemplateId = localStorage.getItem(DEFAULT_KEY);
          renderTemplateList();
          emitTemplatesUpdated();
          API.log('Loaded ' + templates.length + ' templates');
        } catch (err) {
          API.log('Error loading templates: ' + err.message);
        }
      }

      function saveTemplatesToStorage() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
          if (defaultTemplateId) {
            localStorage.setItem(DEFAULT_KEY, defaultTemplateId);
          }
        } catch (err) {
          API.log('Error saving templates: ' + err.message);
        }
      }

      function handleFileSelect(e) {
        const files = e.target.files;
        processFiles(files);
      }

      function handleFileDrop(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        processFiles(files);
      }

      function processFiles(files) {
        for (const file of files) {
          if (file.type === 'application/json' || file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const template = JSON.parse(e.target.result);
                importTemplate(template);
              } catch (err) {
                API.emitOutput('error.occurred', {
                  code: 'PARSE_ERROR',
                  message: 'Failed to parse ' + file.name
                });
              }
            };
            reader.readAsText(file);
          }
        }
      }

      function importTemplate(template) {
        // Validate required fields
        if (!template.id) {
          template.id = 'template-' + Date.now();
        }
        if (!template.name) {
          template.name = 'Untitled Template';
        }

        // Check for duplicate
        const existingIdx = templates.findIndex(t => t.id === template.id);
        if (existingIdx >= 0) {
          templates[existingIdx] = template;
          API.log('Updated template: ' + template.id);
        } else {
          templates.push(template);
          API.log('Imported template: ' + template.id);
        }

        saveTemplatesToStorage();
        renderTemplateList();
        emitTemplatesUpdated();
      }

      function createNewTemplate() {
        const template = {
          id: 'template-' + Date.now(),
          name: 'New Template',
          category: 'business-card',
          description: 'A new custom template',
          dimensions: { width: 1050, height: 600, dpi: 300 },
          zones: [],
          promptTemplate: 'professional {{category}} design, {{stylePrompt}}, high quality',
          compositorPrompt: 'BLACK areas are for text content. WHITE areas should be filled with design.',
          negativePromptBase: 'text, watermark, blurry, low quality',
          defaultColors: {
            primary: '#8b5cf6',
            secondary: '#06b6d4',
            background: '#ffffff',
            text: '#1f2937'
          },
          version: '1.0.0'
        };

        editingTemplate = template;
        openEditModal(template);
      }

      function renderTemplateList() {
        if (templates.length === 0) {
          templateList.innerHTML = '<div class="empty-state">No templates loaded. Upload or create one.</div>';
          return;
        }

        templateList.innerHTML = templates.map(t => {
          const isDefault = t.id === defaultTemplateId;
          const isSelected = t.id === selectedTemplateId;
          return \`
            <div class="template-card \${isDefault ? 'default' : ''} \${isSelected ? 'selected' : ''}"
                 data-id="\${t.id}">
              <div class="template-name">\${t.name}</div>
              <div class="template-meta">
                <span>📁 \${t.category || 'custom'}</span>
                <span>📐 \${t.zones?.length || 0} zones</span>
                <span>v\${t.version || '1.0'}</span>
              </div>
              <div class="template-actions">
                <button class="btn btn-secondary btn-edit" data-id="\${t.id}">Edit</button>
                <button class="btn btn-secondary btn-preview" data-id="\${t.id}">Preview</button>
                <button class="btn btn-secondary btn-default" data-id="\${t.id}">\${isDefault ? '★ Default' : 'Set Default'}</button>
                <button class="btn btn-secondary btn-export" data-id="\${t.id}">Export</button>
                <button class="btn btn-danger btn-delete" data-id="\${t.id}">×</button>
              </div>
            </div>
          \`;
        }).join('');

        // Attach event listeners
        templateList.querySelectorAll('.template-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('btn')) {
              selectTemplate(card.dataset.id);
            }
          });
        });

        templateList.querySelectorAll('.btn-edit').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            editTemplate(btn.dataset.id);
          });
        });

        templateList.querySelectorAll('.btn-preview').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            previewTemplate(btn.dataset.id);
          });
        });

        templateList.querySelectorAll('.btn-default').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setAsDefault(btn.dataset.id);
          });
        });

        templateList.querySelectorAll('.btn-export').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportTemplate(btn.dataset.id);
          });
        });

        templateList.querySelectorAll('.btn-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTemplate(btn.dataset.id);
          });
        });
      }

      function selectTemplate(id) {
        selectedTemplateId = id;
        const template = templates.find(t => t.id === id);
        renderTemplateList();
        API.emitOutput('template.selected', template);
      }

      function editTemplate(id) {
        const template = templates.find(t => t.id === id);
        if (template) {
          editingTemplate = { ...template };
          openEditModal(template);
        }
      }

      function openEditModal(template) {
        document.getElementById('editName').value = template.name || '';
        document.getElementById('editCategory').value = template.category || 'business-card';
        document.getElementById('editDescription').value = template.description || '';
        document.getElementById('editPrompt').value = template.promptTemplate || '';
        document.getElementById('editCompositorPrompt').value = template.compositorPrompt || '';
        document.getElementById('editNegativePrompt').value = template.negativePromptBase || '';
        editModal.classList.add('open');
      }

      function closeEditModal() {
        editModal.classList.remove('open');
        editingTemplate = null;
      }

      function saveEditedTemplate() {
        if (!editingTemplate) return;

        editingTemplate.name = document.getElementById('editName').value;
        editingTemplate.category = document.getElementById('editCategory').value;
        editingTemplate.description = document.getElementById('editDescription').value;
        editingTemplate.promptTemplate = document.getElementById('editPrompt').value;
        editingTemplate.compositorPrompt = document.getElementById('editCompositorPrompt').value;
        editingTemplate.negativePromptBase = document.getElementById('editNegativePrompt').value;

        // Update or add
        const existingIdx = templates.findIndex(t => t.id === editingTemplate.id);
        if (existingIdx >= 0) {
          templates[existingIdx] = editingTemplate;
        } else {
          templates.push(editingTemplate);
        }

        saveTemplatesToStorage();
        renderTemplateList();
        emitTemplatesUpdated();
        closeEditModal();
        API.log('Saved template: ' + editingTemplate.id);
      }

      function previewTemplate(id) {
        const template = templates.find(t => t.id === id);
        if (template) {
          API.emitOutput('template.selected', template);
        }
      }

      function setAsDefault(id) {
        defaultTemplateId = id;
        saveTemplatesToStorage();
        renderTemplateList();
        emitTemplatesUpdated();
        API.log('Set default template: ' + id);
      }

      function exportTemplate(id) {
        const template = templates.find(t => t.id === id);
        if (template) {
          // Trigger download
          const dataStr = JSON.stringify(template, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = template.id + '.json';
          a.click();
          URL.revokeObjectURL(url);

          API.emitOutput('template.exported', template);
        }
      }

      function deleteTemplate(id) {
        if (confirm('Delete this template?')) {
          templates = templates.filter(t => t.id !== id);
          if (defaultTemplateId === id) {
            defaultTemplateId = null;
          }
          saveTemplatesToStorage();
          renderTemplateList();
          emitTemplatesUpdated();
          API.log('Deleted template: ' + id);
        }
      }

      function emitTemplatesUpdated() {
        API.emitOutput('templates.updated', templates.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          isDefault: t.id === defaultTemplateId,
          zoneCount: t.zones?.length || 0,
        })));
      }

      // Input handlers
      API.onInput('trigger.load', loadTemplatesFromStorage);

      API.onInput('template.import', function(template) {
        if (template) {
          importTemplate(template);
        }
      });

      API.onInput('template.delete', function(id) {
        deleteTemplate(id);
      });

      API.onInput('template.setDefault', function(id) {
        setAsDefault(id);
      });

    })();
  </script>
</body>
</html>
`;

export const TemplateManagerWidget: BuiltinWidget = {
  manifest: TemplateManagerManifest,
  html: TemplateManagerHTML,
};
