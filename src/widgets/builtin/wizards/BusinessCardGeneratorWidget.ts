/**
 * Business Card Generator Widget
 *
 * Complete self-contained UI widget for business card generation.
 * Contains all wizard steps: form, upload, style, templates, design picker, final preview.
 * Connects to automation widgets via pipeline for AI generation.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../types';

export const BusinessCardGeneratorManifest: WidgetManifest = {
  id: 'stickernest.business-card-generator',
  name: 'Business Card Generator',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Complete AI-powered business card generator with multi-step wizard UI. Collects user info, uploads, style preferences, and generates professional business cards.',
  author: 'StickerNest',
  tags: ['wizard', 'business-card', 'generator', 'ai', 'form', 'ui'],
  inputs: {
    templateData: {
      type: 'object',
      description: 'Available templates to display',
    },
    generatedDesigns: {
      type: 'array',
      description: 'AI-generated design variations',
    },
    progressUpdate: {
      type: 'object',
      description: 'Generation progress status',
    },
    composedImage: {
      type: 'object',
      description: 'Final composed image from compositor',
    },
  },
  outputs: {
    generateRequest: {
      type: 'object',
      description: 'Request to generate designs with all user data',
    },
    regenerateRequest: {
      type: 'trigger',
      description: 'Request new design variations',
    },
    exportRequest: {
      type: 'object',
      description: 'Export final design',
    },
    dataCollected: {
      type: 'object',
      description: 'All collected user data',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: false,
  },
  io: {
    inputs: [
      'templates.data',
      'designs.generated',
      'progress.update',
      'image.composed',
    ],
    outputs: [
      'generate.request',
      'regenerate.request',
      'export.request',
      'data.collected',
    ],
  },
  size: {
    width: 340,
    height: 620,
    minWidth: 300,
    minHeight: 550,
  },
};

export const BusinessCardGeneratorHTML = `
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
      background: #ffffff;
    }

    /* Main Container */
    .generator-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
    }

    /* Preview Area */
    .preview-area {
      flex-shrink: 0;
      height: 130px;
      background: #f8fafc;
      border-radius: 12px;
      margin: 12px 12px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: 2px dashed #e2e8f0;
      position: relative;
    }
    .preview-placeholder {
      color: #6366f1;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
    }
    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: none;
    }
    .preview-image.visible {
      display: block;
    }

    /* Step Header */
    .step-header {
      padding: 6px 12px 10px;
      text-align: center;
    }
    .step-title {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      background: #f1f5f9;
      padding: 6px 16px;
      border-radius: 16px;
      display: inline-block;
    }

    /* Step Content */
    .step-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 12px;
    }
    .step-panel {
      display: none;
    }
    .step-panel.active {
      display: block;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 14px;
    }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 5px;
    }
    .form-input {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      color: #1f2937;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      transition: all 0.2s;
    }
    .form-input::placeholder {
      color: #9ca3af;
    }
    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    .more-fields-btn {
      width: 100%;
      padding: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #6366f1;
      background: #f1f5f9;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 4px;
    }
    .expandable-fields {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .expandable-fields.expanded {
      max-height: 300px;
      padding-top: 14px;
    }

    /* Upload Styles */
    .upload-zone {
      width: 100%;
      height: 140px;
      background: #f8fafc;
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .upload-zone:hover {
      border-color: #6366f1;
      background: #f1f5f9;
    }
    .upload-zone.has-image {
      border-style: solid;
      border-color: #22c55e;
    }
    .upload-text {
      font-size: 13px;
      color: #6b7280;
    }
    .upload-preview {
      position: absolute;
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 8px;
      display: none;
    }
    .upload-preview.visible {
      display: block;
    }
    .choose-file-btn {
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      background: #ffffff;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 12px;
    }

    /* Style Config */
    .section-label {
      font-size: 12px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    .color-palette {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      border: 3px solid transparent;
      transition: all 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .color-swatch:hover {
      transform: scale(1.1);
    }
    .color-swatch.selected {
      border-color: #1f2937;
    }
    .prompt-textarea {
      width: 100%;
      padding: 10px 12px;
      font-size: 13px;
      color: #1f2937;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      resize: vertical;
      min-height: 60px;
      outline: none;
      font-family: inherit;
      margin-bottom: 14px;
    }
    .prompt-textarea:focus {
      border-color: #6366f1;
    }
    .ref-upload-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ref-upload-btn {
      padding: 6px 12px;
      font-size: 12px;
      color: #374151;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
    }
    .ref-file-name {
      font-size: 12px;
      color: #6b7280;
    }

    /* Template Grid */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .template-item {
      aspect-ratio: 1.6;
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      overflow: hidden;
    }
    .template-item:hover {
      border-color: #6366f1;
    }
    .template-item.selected {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }

    /* Design Grid */
    .design-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .design-item {
      aspect-ratio: 1.6;
      background: #f1f5f9;
      border: 3px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      overflow: hidden;
    }
    .design-item:hover {
      border-color: #6366f1;
    }
    .design-item.selected {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }
    .design-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .generate-new-btn {
      width: 100%;
      padding: 10px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 12px;
    }
    .generate-new-btn:hover {
      border-color: #6366f1;
      color: #6366f1;
    }

    /* Loading State */
    .loading-card {
      background: #ffffff;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 20px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .dots-container {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-bottom: 16px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #c7d2fe;
      animation: dotPulse 1.4s ease-in-out infinite;
    }
    .dot:nth-child(1) { animation-delay: 0s; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    .dot:nth-child(4) { animation-delay: 0.6s; }
    .dot:nth-child(5) { animation-delay: 0.8s; }
    @keyframes dotPulse {
      0%, 100% { background: #c7d2fe; transform: scale(1); }
      50% { background: #6366f1; transform: scale(1.2); }
    }
    .loading-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .loading-subtitle {
      font-size: 12px;
      color: #64748b;
      margin-top: 16px;
    }
    .progress-bar {
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      margin-top: 12px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      width: 0%;
      transition: width 0.3s;
      animation: progressIndeterminate 2s ease-in-out infinite;
    }
    @keyframes progressIndeterminate {
      0% { width: 0%; margin-left: 0%; }
      50% { width: 50%; margin-left: 25%; }
      100% { width: 0%; margin-left: 100%; }
    }

    /* Final Preview */
    .final-preview-frame {
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }
    .final-image {
      max-width: 100%;
      max-height: 180px;
      border-radius: 6px;
    }
    .final-placeholder {
      color: #94a3b8;
      font-size: 14px;
      padding: 40px 0;
    }
    .edit-btn {
      width: 100%;
      padding: 10px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 12px;
    }

    /* Navigation */
    .nav-area {
      flex-shrink: 0;
      padding: 12px;
    }
    .continue-btn {
      width: 100%;
      padding: 12px 20px;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
    }
    .continue-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 10px -1px rgba(99, 102, 241, 0.4);
    }
    .continue-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 10px;
      color: #64748b;
      font-size: 13px;
      cursor: pointer;
    }
    .back-link:hover {
      color: #6366f1;
    }
    .back-link.hidden {
      display: none;
    }

    /* Scrollbar */
    .step-content::-webkit-scrollbar {
      width: 4px;
    }
    .step-content::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    /* Hidden elements */
    .file-input { display: none; }
  </style>
</head>
<body>
  <div class="generator-container">
    <!-- Live Preview -->
    <div class="preview-area" id="previewArea">
      <span class="preview-placeholder" id="previewPlaceholder">LIVE<br>PREVIEW</span>
      <img class="preview-image" id="previewImage" alt="Preview">
    </div>

    <!-- Step Header -->
    <div class="step-header">
      <span class="step-title" id="stepTitle">Add Your Information</span>
    </div>

    <!-- Step Content -->
    <div class="step-content" id="stepContent">

      <!-- Step 1: Info Form -->
      <div class="step-panel active" id="step-info">
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="fullName" placeholder="John Doe">
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <input type="tel" class="form-input" id="phone" placeholder="(123) 456-7890">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-input" id="email" placeholder="email@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Business</label>
          <input type="text" class="form-input" id="businessName" placeholder="Your Business Name">
        </div>
        <button class="more-fields-btn" id="moreFieldsBtn">More Fields</button>
        <div class="expandable-fields" id="expandableFields">
          <div class="form-group">
            <label class="form-label">Job Title</label>
            <input type="text" class="form-input" id="jobTitle" placeholder="CEO / Designer / etc.">
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input type="url" class="form-input" id="website" placeholder="www.example.com">
          </div>
        </div>
      </div>

      <!-- Step 2: Image Upload -->
      <div class="step-panel" id="step-upload">
        <div class="upload-zone" id="uploadZone">
          <span class="upload-text" id="uploadText">No image</span>
          <img class="upload-preview" id="uploadPreview" alt="Upload preview">
        </div>
        <input type="file" class="file-input" id="logoInput" accept="image/*">
        <button class="choose-file-btn" id="chooseFileBtn">Choose File</button>
      </div>

      <!-- Step 3: Style Config -->
      <div class="step-panel" id="step-style">
        <div class="section-label">Primary Colors</div>
        <div class="color-palette" id="primaryPalette">
          <div class="color-swatch selected" style="background:#ec4899" data-color="#ec4899"></div>
          <div class="color-swatch" style="background:#8b5cf6" data-color="#8b5cf6"></div>
          <div class="color-swatch" style="background:#06b6d4" data-color="#06b6d4"></div>
          <div class="color-swatch" style="background:#10b981" data-color="#10b981"></div>
        </div>

        <div class="section-label">Secondary Colors</div>
        <div class="color-palette" id="secondaryPalette">
          <div class="color-swatch selected" style="background:#f8fafc;border-color:#e2e8f0" data-color="#f8fafc"></div>
          <div class="color-swatch" style="background:#fef3c7" data-color="#fef3c7"></div>
          <div class="color-swatch" style="background:#1e293b" data-color="#1e293b"></div>
          <div class="color-swatch" style="background:#ffffff;border-color:#e2e8f0" data-color="#ffffff"></div>
        </div>

        <div class="section-label">Style Prompt</div>
        <textarea class="prompt-textarea" id="stylePrompt" placeholder="Describe the style you want"></textarea>

        <div class="section-label">What to Avoid</div>
        <textarea class="prompt-textarea" id="avoidPrompt" placeholder="Elements to avoid in design"></textarea>

        <div class="section-label">Reference Image</div>
        <div class="ref-upload-row">
          <button class="ref-upload-btn" id="refUploadBtn">Choose File</button>
          <span class="ref-file-name" id="refFileName">No file chosen</span>
        </div>
        <input type="file" class="file-input" id="refInput" accept="image/*">
      </div>

      <!-- Step 4: Loading -->
      <div class="step-panel" id="step-loading">
        <div class="loading-card">
          <div class="dots-container">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
          <div class="loading-title" id="loadingTitle">Generating Your Business Card</div>
        </div>
        <div class="loading-subtitle" id="loadingSubtitle">This may take a moment as we create your design</div>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
      </div>

      <!-- Step 5: Template Picker -->
      <div class="step-panel" id="step-template">
        <div class="template-grid" id="templateGrid"></div>
      </div>

      <!-- Step 6: Design Picker -->
      <div class="step-panel" id="step-design">
        <div class="design-grid" id="designGrid">
          <div class="design-item selected" data-index="0"></div>
          <div class="design-item" data-index="1"></div>
          <div class="design-item" data-index="2"></div>
          <div class="design-item" data-index="3"></div>
        </div>
        <button class="generate-new-btn" id="generateNewBtn">Generate New Designs</button>
      </div>

      <!-- Step 7: Final Preview -->
      <div class="step-panel" id="step-final">
        <div class="final-preview-frame">
          <span class="final-placeholder" id="finalPlaceholder">FINAL<br>DESIGN</span>
          <img class="final-image" id="finalImage" alt="Final Design" style="display:none">
        </div>
        <button class="edit-btn" id="editBtn">Edit Design</button>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav-area">
      <button class="continue-btn" id="continueBtn">Continue</button>
      <span class="back-link hidden" id="backLink">Go Back</span>
    </div>
  </div>

  <script>
    (function() {
      const API = window.WidgetAPI || {
        emitOutput: console.log,
        onInput: () => {},
        onMount: (cb) => cb({ state: {} }),
        onStateChange: () => {},
        setState: () => {},
        log: console.log,
        emit: () => {},
      };

      // Steps configuration
      const STEPS = [
        { id: 'info', title: 'Add Your Information', btnText: 'Continue' },
        { id: 'upload', title: 'Upload a Photo or Logo', btnText: 'Continue' },
        { id: 'style', title: 'Generate Style', btnText: 'Continue' },
        { id: 'template', title: 'Pick Your Template', btnText: 'Continue' },
        { id: 'loading', title: 'Generating Your Business Card', btnText: 'Generating...', disabled: true },
        { id: 'design', title: 'Pick Your Design', btnText: 'Continue' },
        { id: 'final', title: 'Final Design', btnText: 'Download' },
      ];

      // Default templates (thumbnails would be loaded)
      const DEFAULT_TEMPLATES = [];
      for (let i = 0; i < 12; i++) {
        DEFAULT_TEMPLATES.push({ id: 'template-' + i, index: i });
      }

      // State
      let state = {
        currentStep: 0,
        data: {
          fullName: '',
          phone: '',
          email: '',
          businessName: '',
          jobTitle: '',
          website: '',
          logo: null,
          primaryColor: '#ec4899',
          secondaryColor: '#f8fafc',
          stylePrompt: '',
          avoidPrompt: '',
          referenceImage: null,
          templateId: null,
          selectedDesignIndex: 0,
        },
        templates: DEFAULT_TEMPLATES,
        generatedDesigns: [],
        finalImage: null,
        isExpanded: false,
      };

      // DOM Elements
      const previewArea = document.getElementById('previewArea');
      const previewPlaceholder = document.getElementById('previewPlaceholder');
      const previewImage = document.getElementById('previewImage');
      const stepTitle = document.getElementById('stepTitle');
      const stepContent = document.getElementById('stepContent');
      const continueBtn = document.getElementById('continueBtn');
      const backLink = document.getElementById('backLink');
      const moreFieldsBtn = document.getElementById('moreFieldsBtn');
      const expandableFields = document.getElementById('expandableFields');

      // Initialize
      API.onMount(function(context) {
        if (context.state) {
          state = { ...state, ...context.state };
        }
        setupEventListeners();
        renderTemplates();
        updateUI();
        API.log('BusinessCardGenerator mounted');
      });

      // Setup all event listeners
      function setupEventListeners() {
        // Navigation
        continueBtn.addEventListener('click', handleContinue);
        backLink.addEventListener('click', handleBack);

        // More fields toggle
        moreFieldsBtn.addEventListener('click', toggleMoreFields);

        // Form inputs
        ['fullName', 'phone', 'email', 'businessName', 'jobTitle', 'website'].forEach(id => {
          const input = document.getElementById(id);
          if (input) {
            input.addEventListener('input', (e) => {
              state.data[id] = e.target.value;
              emitDataChange();
            });
          }
        });

        // Logo upload
        const uploadZone = document.getElementById('uploadZone');
        const logoInput = document.getElementById('logoInput');
        const chooseFileBtn = document.getElementById('chooseFileBtn');

        uploadZone.addEventListener('click', () => logoInput.click());
        chooseFileBtn.addEventListener('click', (e) => { e.stopPropagation(); logoInput.click(); });
        logoInput.addEventListener('change', handleLogoUpload);

        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#6366f1'; });
        uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
        uploadZone.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadZone.style.borderColor = '';
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], 'logo');
        });

        // Color palettes
        document.getElementById('primaryPalette').addEventListener('click', (e) => {
          if (e.target.classList.contains('color-swatch')) {
            selectColor('primary', e.target);
          }
        });
        document.getElementById('secondaryPalette').addEventListener('click', (e) => {
          if (e.target.classList.contains('color-swatch')) {
            selectColor('secondary', e.target);
          }
        });

        // Style prompts
        document.getElementById('stylePrompt').addEventListener('input', (e) => {
          state.data.stylePrompt = e.target.value;
        });
        document.getElementById('avoidPrompt').addEventListener('input', (e) => {
          state.data.avoidPrompt = e.target.value;
        });

        // Reference image
        const refUploadBtn = document.getElementById('refUploadBtn');
        const refInput = document.getElementById('refInput');
        refUploadBtn.addEventListener('click', () => refInput.click());
        refInput.addEventListener('change', (e) => {
          if (e.target.files[0]) {
            handleFile(e.target.files[0], 'reference');
            document.getElementById('refFileName').textContent = e.target.files[0].name;
          }
        });

        // Template grid - delegate
        document.getElementById('templateGrid').addEventListener('click', (e) => {
          const item = e.target.closest('.template-item');
          if (item) selectTemplate(item);
        });

        // Design grid - delegate
        document.getElementById('designGrid').addEventListener('click', (e) => {
          const item = e.target.closest('.design-item');
          if (item) selectDesign(parseInt(item.dataset.index));
        });

        // Generate new
        document.getElementById('generateNewBtn').addEventListener('click', requestRegenerate);

        // Edit button
        document.getElementById('editBtn').addEventListener('click', () => {
          API.emit('wizard:edit', state.data);
        });
      }

      // Handle continue button
      function handleContinue() {
        const step = STEPS[state.currentStep];

        if (step.id === 'template') {
          // After template selection, start generation
          state.currentStep++;
          updateUI();
          triggerGeneration();
          return;
        }

        if (step.id === 'final') {
          // Download
          downloadFinal();
          return;
        }

        if (state.currentStep < STEPS.length - 1) {
          state.currentStep++;
          updateUI();
        }
      }

      // Handle back button
      function handleBack() {
        if (state.currentStep > 0) {
          // Skip loading step
          let newStep = state.currentStep - 1;
          if (STEPS[newStep].id === 'loading') newStep--;
          state.currentStep = Math.max(0, newStep);
          updateUI();
        }
      }

      // Toggle more fields
      function toggleMoreFields() {
        state.isExpanded = !state.isExpanded;
        expandableFields.classList.toggle('expanded', state.isExpanded);
        moreFieldsBtn.textContent = state.isExpanded ? 'Less Fields' : 'More Fields';
      }

      // Handle logo upload
      function handleLogoUpload(e) {
        if (e.target.files[0]) {
          handleFile(e.target.files[0], 'logo');
        }
      }

      // Handle file upload
      function handleFile(file, type) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const dataUrl = e.target.result;

          if (type === 'logo') {
            state.data.logo = { name: file.name, dataUrl: dataUrl };
            const uploadPreview = document.getElementById('uploadPreview');
            const uploadText = document.getElementById('uploadText');
            const uploadZone = document.getElementById('uploadZone');

            uploadPreview.src = dataUrl;
            uploadPreview.classList.add('visible');
            uploadText.style.display = 'none';
            uploadZone.classList.add('has-image');

            // Update live preview
            previewImage.src = dataUrl;
            previewImage.classList.add('visible');
            previewPlaceholder.style.display = 'none';
          } else if (type === 'reference') {
            state.data.referenceImage = { name: file.name, dataUrl: dataUrl };
          }

          emitDataChange();
        };
        reader.readAsDataURL(file);
      }

      // Select color
      function selectColor(type, swatch) {
        const palette = swatch.parentElement;
        palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');

        if (type === 'primary') {
          state.data.primaryColor = swatch.dataset.color;
        } else {
          state.data.secondaryColor = swatch.dataset.color;
        }
        emitDataChange();
      }

      // Render templates
      function renderTemplates() {
        const grid = document.getElementById('templateGrid');
        grid.innerHTML = '';

        state.templates.forEach((template, i) => {
          const item = document.createElement('div');
          item.className = 'template-item' + (i === 0 ? ' selected' : '');
          item.dataset.id = template.id;
          item.dataset.index = i;
          grid.appendChild(item);
        });

        if (state.templates.length > 0) {
          state.data.templateId = state.templates[0].id;
        }
      }

      // Select template
      function selectTemplate(item) {
        document.querySelectorAll('.template-item').forEach(t => t.classList.remove('selected'));
        item.classList.add('selected');
        state.data.templateId = item.dataset.id;
        emitDataChange();
      }

      // Select design
      function selectDesign(index) {
        state.data.selectedDesignIndex = index;
        document.querySelectorAll('.design-item').forEach((d, i) => {
          d.classList.toggle('selected', i === index);
        });

        // Update final preview
        if (state.generatedDesigns[index]) {
          const design = state.generatedDesigns[index];
          const src = design.imageUrl || design.imageData;
          if (src) {
            document.getElementById('finalImage').src = src;
            document.getElementById('finalImage').style.display = 'block';
            document.getElementById('finalPlaceholder').style.display = 'none';

            previewImage.src = src;
            previewImage.classList.add('visible');
            previewPlaceholder.style.display = 'none';
          }
        }
      }

      // Trigger AI generation
      function triggerGeneration() {
        API.emitOutput('generate.request', {
          templateId: state.data.templateId,
          userData: {
            fullName: state.data.fullName,
            email: state.data.email,
            phone: state.data.phone,
            businessName: state.data.businessName,
            jobTitle: state.data.jobTitle,
            website: state.data.website,
          },
          styleConfig: {
            primaryColor: state.data.primaryColor,
            secondaryColor: state.data.secondaryColor,
            stylePrompt: state.data.stylePrompt,
            avoidPrompt: state.data.avoidPrompt,
          },
          uploadedImages: state.data.logo ? [state.data.logo] : [],
        });

        // Simulate completion for demo (replace with actual pipeline response)
        setTimeout(() => {
          if (STEPS[state.currentStep].id === 'loading') {
            state.generatedDesigns = [
              { id: '1', imageData: generateMockDesign(0) },
              { id: '2', imageData: generateMockDesign(1) },
              { id: '3', imageData: generateMockDesign(2) },
              { id: '4', imageData: generateMockDesign(3) },
            ];
            renderDesigns();
            state.currentStep++;
            updateUI();
          }
        }, 3000);
      }

      // Generate mock design (placeholder)
      function generateMockDesign(index) {
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, state.data.primaryColor || colors[index % 4]);
        gradient.addColorStop(1, state.data.secondaryColor || '#f8fafc');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add text placeholder
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Design ' + (index + 1), canvas.width/2, canvas.height/2);

        return canvas.toDataURL();
      }

      // Render designs
      function renderDesigns() {
        const items = document.querySelectorAll('.design-item');
        items.forEach((item, i) => {
          if (state.generatedDesigns[i]) {
            const src = state.generatedDesigns[i].imageUrl || state.generatedDesigns[i].imageData;
            item.innerHTML = '<img class="design-image" src="' + src + '">';
          }
        });
      }

      // Request regeneration
      function requestRegenerate() {
        state.currentStep = STEPS.findIndex(s => s.id === 'loading');
        updateUI();
        triggerGeneration();
        API.emitOutput('regenerate.request', {});
      }

      // Download final
      function downloadFinal() {
        const design = state.generatedDesigns[state.data.selectedDesignIndex];
        if (design) {
          const link = document.createElement('a');
          link.href = design.imageUrl || design.imageData;
          link.download = 'business-card.png';
          link.click();
        }
        API.emitOutput('export.request', { format: 'png', data: state.data });
      }

      // Emit data change
      function emitDataChange() {
        API.emitOutput('data.collected', state.data);
        API.setState({ data: state.data });
      }

      // Update UI
      function updateUI() {
        const step = STEPS[state.currentStep];

        // Update title
        stepTitle.textContent = step.title;

        // Update panels
        document.querySelectorAll('.step-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        const activePanel = document.getElementById('step-' + step.id);
        if (activePanel) activePanel.classList.add('active');

        // Update button
        continueBtn.textContent = step.btnText;
        continueBtn.disabled = step.disabled || false;

        // Update back link
        backLink.classList.toggle('hidden', state.currentStep === 0);

        API.setState({ currentStep: state.currentStep });
      }

      // Input handlers from automation widgets
      API.onInput('templates.data', function(templates) {
        if (templates && Array.isArray(templates)) {
          state.templates = templates;
          renderTemplates();
        }
      });

      API.onInput('designs.generated', function(designs) {
        if (designs && Array.isArray(designs)) {
          state.generatedDesigns = designs;
          renderDesigns();
          // Skip to design picker
          const designStepIdx = STEPS.findIndex(s => s.id === 'design');
          if (state.currentStep === designStepIdx - 1) {
            state.currentStep = designStepIdx;
            updateUI();
          }
        }
      });

      API.onInput('progress.update', function(progress) {
        if (progress) {
          const fill = document.getElementById('progressFill');
          if (progress.percent) {
            fill.style.width = progress.percent + '%';
            fill.style.animation = 'none';
          }
          if (progress.message) {
            document.getElementById('loadingTitle').textContent = progress.message;
          }
        }
      });

      API.onInput('image.composed', function(result) {
        if (result && result.imageData) {
          state.finalImage = result.imageData;
          document.getElementById('finalImage').src = result.imageData;
          document.getElementById('finalImage').style.display = 'block';
          document.getElementById('finalPlaceholder').style.display = 'none';

          previewImage.src = result.imageData;
          previewImage.classList.add('visible');
          previewPlaceholder.style.display = 'none';
        }
      });

      // State change
      API.onStateChange(function(newState) {
        state = { ...state, ...newState };
        updateUI();
      });

    })();
  </script>
</body>
</html>
`;

export const BusinessCardGeneratorWidget: BuiltinWidget = {
  manifest: BusinessCardGeneratorManifest,
  html: BusinessCardGeneratorHTML,
};
