/**
 * StickerNest v2 - OCR Scanner Widget
 *
 * Converts handwritten notes and images to text using Tesseract.js OCR.
 * Supports image upload, camera capture, and clipboard paste.
 * Outputs text to pipeline for further processing.
 *
 * Part of personal document management pipeline.
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';

export const OCRScannerWidgetManifest: WidgetManifest = {
  id: 'stickernest.ocr-scanner',
  name: 'OCR Scanner',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description:
    'Converts handwritten notes and images to text using OCR. Supports camera capture, file upload, and clipboard paste.',
  author: 'StickerNest',
  tags: ['ocr', 'handwriting', 'scanner', 'text', 'notes', 'conversion'],
  inputs: {
    image: {
      type: 'string',
      description: 'Base64 image data to process',
    },
    trigger: {
      type: 'trigger',
      description: 'Trigger OCR processing on current image',
    },
    language: {
      type: 'string',
      description: 'OCR language (default: eng)',
      default: 'eng',
    },
  },
  outputs: {
    text: {
      type: 'object',
      description: 'Extracted text with confidence score',
    },
    processing: {
      type: 'boolean',
      description: 'Whether OCR is currently processing',
    },
    error: {
      type: 'string',
      description: 'Error message if OCR fails',
    },
    documentSaved: {
      type: 'object',
      description: 'Emitted when text is saved to document store',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['image.set', 'trigger.scan', 'config.language'],
    outputs: ['text.extracted', 'status.processing', 'error.message', 'document.saved'],
  },
  size: {
    width: 320,
    height: 400,
    minWidth: 280,
    minHeight: 350,
    scaleMode: 'stretch',
  },
  events: {
    emits: ['ocr.complete', 'document.created'],
    listens: ['scan.request'],
  },
};

export const OCRScannerWidgetHTML = `
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
      background: var(--sn-bg-primary, #0f0f19);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .header {
      padding: 12px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--sn-accent-primary, #8b5cf6);
      flex: 1;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sn-text-secondary, #94a3b8);
    }
    .status-dot.processing { background: var(--sn-warning, #f59e0b); animation: pulse 1s infinite; }
    .status-dot.success { background: var(--sn-success, #22c55e); }
    .status-dot.error { background: var(--sn-error, #ef4444); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .preview-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--sn-bg-secondary, #1a1a2e);
      margin: 12px;
      border-radius: var(--sn-radius-md, 6px);
      border: 2px dashed var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      cursor: pointer;
      overflow: hidden;
      position: relative;
      transition: border-color 0.2s;
    }
    .preview-area:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
    }
    .preview-area.has-image {
      border-style: solid;
    }
    .preview-area img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .drop-hint {
      text-align: center;
      color: var(--sn-text-secondary, #94a3b8);
      font-size: 12px;
    }
    .drop-hint svg {
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .controls {
      padding: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      flex: 1;
      min-width: 80px;
      padding: 8px 12px;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .btn-primary {
      background: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }
    .btn-primary:hover { filter: brightness(1.1); }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }
    .btn-secondary:hover { background: var(--sn-bg-secondary, #1a1a2e); }

    .result-area {
      max-height: 120px;
      overflow-y: auto;
      margin: 0 12px 12px;
      padding: 8px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 12px;
      line-height: 1.5;
      display: none;
    }
    .result-area.visible { display: block; }
    .result-text {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .confidence {
      margin-top: 8px;
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .progress-bar {
      height: 3px;
      background: var(--sn-bg-tertiary, #252538);
      border-radius: 2px;
      margin: 0 12px 12px;
      overflow: hidden;
      display: none;
    }
    .progress-bar.visible { display: block; }
    .progress-fill {
      height: 100%;
      background: var(--sn-accent-primary, #8b5cf6);
      width: 0%;
      transition: width 0.3s;
    }

    .footer {
      padding: 8px 12px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .save-btn {
      padding: 6px 12px;
      background: var(--sn-success, #22c55e);
      color: white;
      border: none;
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 11px;
      cursor: pointer;
      display: none;
    }
    .save-btn.visible { display: block; }
    .save-btn:hover { filter: brightness(1.1); }
    .word-count {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    input[type="file"] { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h3>OCR Scanner</h3>
      <div class="status-dot" id="statusDot"></div>
    </div>

    <div class="preview-area" id="previewArea">
      <div class="drop-hint" id="dropHint">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div>Drop image, paste, or click</div>
        <div style="margin-top:4px;opacity:0.7">Supports handwritten notes</div>
      </div>
      <img id="previewImg" style="display:none" />
    </div>

    <div class="progress-bar" id="progressBar">
      <div class="progress-fill" id="progressFill"></div>
    </div>

    <div class="controls">
      <button class="btn btn-secondary" id="uploadBtn">
        <span>Upload</span>
      </button>
      <button class="btn btn-secondary" id="cameraBtn">
        <span>Camera</span>
      </button>
      <button class="btn btn-primary" id="scanBtn" disabled>
        <span>Scan Text</span>
      </button>
    </div>

    <div class="result-area" id="resultArea">
      <div class="result-text" id="resultText"></div>
      <div class="confidence" id="confidence"></div>
    </div>

    <div class="footer">
      <span class="word-count" id="wordCount"></span>
      <button class="save-btn" id="saveBtn">Save Document</button>
    </div>

    <input type="file" id="fileInput" accept="image/*" />
  </div>

  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
  <script>
    (function() {
      const API = window.WidgetAPI;

      // Elements
      const previewArea = document.getElementById('previewArea');
      const previewImg = document.getElementById('previewImg');
      const dropHint = document.getElementById('dropHint');
      const statusDot = document.getElementById('statusDot');
      const progressBar = document.getElementById('progressBar');
      const progressFill = document.getElementById('progressFill');
      const uploadBtn = document.getElementById('uploadBtn');
      const cameraBtn = document.getElementById('cameraBtn');
      const scanBtn = document.getElementById('scanBtn');
      const resultArea = document.getElementById('resultArea');
      const resultText = document.getElementById('resultText');
      const confidence = document.getElementById('confidence');
      const saveBtn = document.getElementById('saveBtn');
      const wordCount = document.getElementById('wordCount');
      const fileInput = document.getElementById('fileInput');

      // State
      let state = {
        imageData: null,
        extractedText: '',
        confidence: 0,
        language: 'eng',
        isProcessing: false,
      };

      // Initialize Tesseract worker
      let worker = null;

      async function initWorker() {
        if (worker) return worker;
        try {
          worker = await Tesseract.createWorker(state.language, 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                updateProgress(m.progress * 100);
              }
            },
          });
          API.log('Tesseract worker initialized');
          return worker;
        } catch (err) {
          API.log('Failed to init Tesseract: ' + err.message);
          throw err;
        }
      }

      function setStatus(status) {
        statusDot.className = 'status-dot ' + status;
      }

      function updateProgress(percent) {
        progressFill.style.width = percent + '%';
      }

      function showProgress(show) {
        progressBar.classList.toggle('visible', show);
        if (show) updateProgress(0);
      }

      function countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\\s+/).filter(w => w.length > 0).length;
      }

      function showImage(dataUrl) {
        state.imageData = dataUrl;
        previewImg.src = dataUrl;
        previewImg.style.display = 'block';
        dropHint.style.display = 'none';
        previewArea.classList.add('has-image');
        scanBtn.disabled = false;
        API.setState({ imageData: dataUrl });
      }

      function showResult(text, conf) {
        state.extractedText = text;
        state.confidence = conf;
        resultText.textContent = text;
        confidence.textContent = 'Confidence: ' + Math.round(conf) + '%';
        resultArea.classList.add('visible');
        saveBtn.classList.add('visible');
        const words = countWords(text);
        wordCount.textContent = words + ' word' + (words === 1 ? '' : 's');

        API.setState({ extractedText: text, confidence: conf });
        API.emitOutput('text.extracted', {
          text: text,
          confidence: conf,
          wordCount: words,
          timestamp: Date.now(),
        });
        API.emit('ocr.complete', { text, confidence: conf });
      }

      async function performOCR() {
        if (!state.imageData || state.isProcessing) return;

        state.isProcessing = true;
        setStatus('processing');
        showProgress(true);
        scanBtn.disabled = true;
        API.emitOutput('status.processing', true);

        try {
          const w = await initWorker();
          const result = await w.recognize(state.imageData);

          const text = result.data.text.trim();
          const conf = result.data.confidence;

          showResult(text, conf);
          setStatus('success');
          API.log('OCR complete: ' + countWords(text) + ' words');
        } catch (err) {
          setStatus('error');
          API.emitOutput('error.message', err.message);
          API.log('OCR error: ' + err.message);
          resultText.textContent = 'Error: ' + err.message;
          resultArea.classList.add('visible');
        } finally {
          state.isProcessing = false;
          showProgress(false);
          scanBtn.disabled = false;
          API.emitOutput('status.processing', false);
        }
      }

      function saveDocument() {
        if (!state.extractedText) return;

        const doc = {
          title: 'OCR Scan - ' + new Date().toLocaleDateString(),
          content: state.extractedText,
          contentType: 'text',
          category: 'ocr-scan',
          tags: ['ocr', 'handwritten'],
          sourceType: 'ocr',
          starred: false,
          archived: false,
          originalImage: state.imageData,
        };

        API.emitOutput('document.saved', doc);
        API.emit('document.created', doc);
        API.log('Document saved');

        // Visual feedback
        saveBtn.textContent = 'Saved!';
        saveBtn.style.background = 'var(--sn-text-secondary)';
        setTimeout(() => {
          saveBtn.textContent = 'Save Document';
          saveBtn.style.background = '';
        }, 2000);
      }

      // File handling
      function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => showImage(e.target.result);
        reader.readAsDataURL(file);
      }

      // Event listeners
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
      });

      previewArea.addEventListener('click', () => {
        if (!state.imageData) fileInput.click();
      });

      previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        previewArea.style.borderColor = 'var(--sn-accent-primary)';
      });

      previewArea.addEventListener('dragleave', () => {
        previewArea.style.borderColor = '';
      });

      previewArea.addEventListener('drop', (e) => {
        e.preventDefault();
        previewArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      });

      // Paste support
      document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            handleFile(items[i].getAsFile());
            break;
          }
        }
      });

      // Camera capture
      cameraBtn.addEventListener('click', async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();

          // Capture frame
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);

          // Stop camera
          stream.getTracks().forEach(t => t.stop());

          showImage(canvas.toDataURL('image/jpeg', 0.9));
        } catch (err) {
          API.log('Camera error: ' + err.message);
          alert('Camera access denied or not available');
        }
      });

      scanBtn.addEventListener('click', performOCR);
      saveBtn.addEventListener('click', saveDocument);

      // Pipeline inputs
      API.onInput('image.set', (value) => {
        if (typeof value === 'string' && value.startsWith('data:image')) {
          showImage(value);
        }
      });

      API.onInput('trigger.scan', () => {
        if (state.imageData) performOCR();
      });

      API.onInput('config.language', (lang) => {
        if (lang && typeof lang === 'string') {
          state.language = lang;
          worker = null; // Reset worker for new language
          API.log('Language changed to: ' + lang);
        }
      });

      // Broadcast listener
      API.on('scan.request', (data) => {
        if (data && data.image) {
          showImage(data.image);
          performOCR();
        }
      });

      // Lifecycle
      API.onMount((context) => {
        const saved = context.state || {};
        if (saved.imageData) {
          showImage(saved.imageData);
        }
        if (saved.extractedText) {
          showResult(saved.extractedText, saved.confidence || 0);
        }
        if (saved.language) {
          state.language = saved.language;
        }
        API.log('OCRScannerWidget mounted');
      });

      API.onDestroy(() => {
        if (worker) {
          worker.terminate();
          worker = null;
        }
        API.log('OCRScannerWidget destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const OCRScannerWidget: BuiltinWidget = {
  manifest: OCRScannerWidgetManifest,
  html: OCRScannerWidgetHTML,
};

// Legacy export for backwards compatibility
export const HaloOCRWidget = OCRScannerWidget;
