/**
 * StickerNest v2 - Receipt Scanner Widget
 *
 * Specialized receipt scanning and parsing with:
 * - Camera capture and image upload
 * - OCR processing with Tesseract.js
 * - Intelligent receipt parsing (store, items, prices, totals)
 * - Multi-channel output to Pantry, Shopping List, Price Tracker
 * - Receipt history and storage
 */

import type { WidgetManifest } from '../../../types/manifest';
import type { BuiltinWidget } from '../index';
import {
  PORT_CHANNEL_SELECTOR_STYLES,
  PORT_CHANNEL_SELECTOR_SCRIPT,
} from '../../../runtime/PortChannelSelector';

export const ReceiptScannerWidgetManifest: WidgetManifest = {
  id: 'stickernest.receipt-scanner',
  name: 'Receipt Scanner',
  version: '1.0.0',
  kind: 'interactive',
  entry: 'index.html',
  description: 'Scan grocery receipts to track prices and update pantry inventory',
  author: 'StickerNest',
  tags: ['grocery', 'receipt', 'ocr', 'scanner', 'prices'],
  inputs: {
    'image.scan': {
      type: 'string',
      description: 'Base64 image data to scan',
    },
    'trigger.scan': {
      type: 'trigger',
      description: 'Trigger camera capture',
    },
    'receipt.reparse': {
      type: 'string',
      description: 'Receipt ID to re-parse with updated settings',
    },
  },
  outputs: {
    'receipt.parsed': {
      type: 'object',
      description: 'Full parsed receipt data',
    },
    'items.extracted': {
      type: 'array',
      description: 'Array of extracted line items with prices',
    },
    'prices.recorded': {
      type: 'array',
      description: 'Price records for the price tracker',
    },
    'pantry.items': {
      type: 'array',
      description: 'Items formatted for pantry addition',
    },
    'status.processing': {
      type: 'boolean',
      description: 'OCR processing status',
    },
    'error.message': {
      type: 'string',
      description: 'Error messages',
    },
  },
  capabilities: {
    draggable: true,
    resizable: true,
    rotatable: true,
  },
  io: {
    inputs: ['image.scan', 'trigger.scan', 'receipt.reparse'],
    outputs: ['receipt.parsed', 'items.extracted', 'prices.recorded', 'pantry.items', 'status.processing', 'error.message'],
  },
  events: {
    emits: ['grocery.receipt.scanned', 'grocery.prices.updated'],
    listens: [],
  },
  size: {
    width: 320,
    height: 480,
    minWidth: 280,
    minHeight: 400,
  },
};

export const ReceiptScannerWidgetHTML = `
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
      background: var(--sn-bg-secondary, #1a1a2e);
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .header h2 {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header h2::before {
      content: '🧾';
    }

    .capture-area {
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      background: var(--sn-bg-tertiary, #252538);
    }

    .preview-container {
      width: 100%;
      aspect-ratio: 3/4;
      max-height: 200px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 2px dashed var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-md, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .preview-container.has-image {
      border-style: solid;
    }

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .preview-placeholder {
      text-align: center;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .preview-placeholder .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .capture-buttons {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .capture-btn {
      flex: 1;
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      color: var(--sn-text-primary, #e2e8f0);
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .capture-btn:hover {
      border-color: var(--sn-accent-primary, #8b5cf6);
      background: var(--sn-bg-tertiary, #252538);
    }

    .capture-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .capture-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .processing-overlay.active {
      display: flex;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--sn-bg-tertiary, #252538);
      border-top-color: var(--sn-accent-primary, #8b5cf6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .progress-text {
      font-size: 12px;
      color: var(--sn-text-secondary, #94a3b8);
    }

    .results-area {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .result-section {
      margin-bottom: 16px;
    }

    .section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--sn-text-secondary, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .store-info {
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      margin-bottom: 12px;
    }

    .store-name {
      font-size: 14px;
      font-weight: 600;
    }

    .store-date {
      font-size: 11px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-top: 4px;
    }

    .items-list {
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
      overflow: hidden;
    }

    .item-row {
      display: flex;
      align-items: center;
      padding: 8px 10px;
      border-bottom: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.1));
    }

    .item-row:last-child {
      border-bottom: none;
    }

    .item-row.editable {
      cursor: pointer;
    }

    .item-row.editable:hover {
      background: var(--sn-bg-tertiary, #252538);
    }

    .item-check {
      width: 18px;
      height: 18px;
      border: 2px solid var(--sn-border-primary, rgba(139, 92, 246, 0.4));
      border-radius: 4px;
      margin-right: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .item-check.checked {
      background: var(--sn-success, #22c55e);
      border-color: var(--sn-success, #22c55e);
    }

    .item-check.checked::after {
      content: '✓';
      color: white;
      font-size: 11px;
    }

    .item-name {
      flex: 1;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-price {
      font-size: 12px;
      font-weight: 500;
      color: var(--sn-success, #22c55e);
      margin-left: 8px;
    }

    .item-qty {
      font-size: 10px;
      color: var(--sn-text-secondary, #94a3b8);
      margin-left: 8px;
    }

    .totals-section {
      padding: 10px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-radius: var(--sn-radius-sm, 4px);
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }

    .total-row:last-child {
      margin-bottom: 0;
      font-weight: 600;
      font-size: 14px;
      padding-top: 6px;
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .footer {
      padding: 12px;
      background: var(--sn-bg-secondary, #1a1a2e);
      border-top: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.2));
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--sn-border-primary, rgba(139, 92, 246, 0.3));
      border-radius: var(--sn-radius-sm, 4px);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.secondary {
      background: var(--sn-bg-tertiary, #252538);
      color: var(--sn-text-primary, #e2e8f0);
    }

    .action-btn.primary {
      background: var(--sn-accent-primary, #8b5cf6);
      border-color: var(--sn-accent-primary, #8b5cf6);
      color: white;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .channel-selectors {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .empty-state {
      text-align: center;
      color: var(--sn-text-secondary, #94a3b8);
      padding: 20px;
    }

    .empty-state .icon {
      font-size: 24px;
      margin-bottom: 8px;
    }

    input[type="file"] {
      display: none;
    }

    video {
      max-width: 100%;
      max-height: 100%;
    }

    ${PORT_CHANNEL_SELECTOR_STYLES}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Receipt Scanner</h2>
    </div>

    <div class="capture-area">
      <div class="preview-container" id="preview-container">
        <div class="preview-placeholder" id="placeholder">
          <div class="icon">📸</div>
          <div>Take a photo or upload</div>
        </div>
        <img class="preview-image" id="preview-image" style="display: none;" />
        <video id="camera-video" style="display: none;" autoplay playsinline></video>
        <div class="processing-overlay" id="processing-overlay">
          <div class="spinner"></div>
          <div class="progress-text" id="progress-text">Processing...</div>
        </div>
      </div>

      <div class="capture-buttons">
        <button class="capture-btn" id="upload-btn">📁 Upload</button>
        <button class="capture-btn" id="camera-btn">📷 Camera</button>
        <button class="capture-btn primary" id="scan-btn" disabled>🔍 Scan</button>
      </div>
      <input type="file" id="file-input" accept="image/*" />
    </div>

    <div class="results-area" id="results-area">
      <div class="empty-state" id="empty-results">
        <div class="icon">🧾</div>
        <div>Scan a receipt to see items</div>
      </div>
    </div>

    <div class="footer">
      <div class="action-buttons">
        <button class="action-btn secondary" id="clear-btn" disabled>Clear</button>
        <button class="action-btn secondary" id="to-pantry-btn" disabled>Add to Pantry</button>
        <button class="action-btn primary" id="save-btn" disabled>Save Prices</button>
      </div>
      <div class="channel-selectors" id="channel-selectors"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>

  <script>
    ${PORT_CHANNEL_SELECTOR_SCRIPT}
  </script>

  <script>
    (function() {
      const API = window.WidgetAPI;

      // State
      let currentImage = null;
      let parsedReceipt = null;
      let selectedItems = new Set();
      let isProcessing = false;
      let cameraStream = null;

      // DOM Elements
      const previewContainer = document.getElementById('preview-container');
      const placeholder = document.getElementById('placeholder');
      const previewImage = document.getElementById('preview-image');
      const cameraVideo = document.getElementById('camera-video');
      const processingOverlay = document.getElementById('processing-overlay');
      const progressText = document.getElementById('progress-text');
      const resultsArea = document.getElementById('results-area');
      const emptyResults = document.getElementById('empty-results');
      const uploadBtn = document.getElementById('upload-btn');
      const cameraBtn = document.getElementById('camera-btn');
      const scanBtn = document.getElementById('scan-btn');
      const clearBtn = document.getElementById('clear-btn');
      const toPantryBtn = document.getElementById('to-pantry-btn');
      const saveBtn = document.getElementById('save-btn');
      const fileInput = document.getElementById('file-input');
      const channelSelectors = document.getElementById('channel-selectors');

      // Create channel selectors
      let pantryChannel = null;
      let pricesChannel = null;
      if (window.PortChannelSelector) {
        const pantryContainer = document.createElement('div');
        const pricesContainer = document.createElement('div');
        channelSelectors.appendChild(pantryContainer);
        channelSelectors.appendChild(pricesContainer);

        pantryChannel = window.PortChannelSelector.create('pantry.items', pantryContainer, {
          label: 'Pantry:',
          showAllOption: true
        });
        pricesChannel = window.PortChannelSelector.create('prices.recorded', pricesContainer, {
          label: 'Prices:',
          showAllOption: true
        });
      }

      // File upload
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          loadImage(file);
        }
      });

      // Camera handling
      cameraBtn.addEventListener('click', async () => {
        if (cameraStream) {
          stopCamera();
          return;
        }

        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          cameraVideo.srcObject = cameraStream;
          cameraVideo.style.display = 'block';
          previewImage.style.display = 'none';
          placeholder.style.display = 'none';
          cameraBtn.textContent = '📸 Capture';
          scanBtn.disabled = true;
        } catch (err) {
          API.log('Camera error: ' + err.message);
          API.emitOutput('error.message', 'Could not access camera: ' + err.message);
        }
      });

      function stopCamera() {
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          cameraStream = null;
        }
        cameraVideo.style.display = 'none';
        cameraBtn.textContent = '📷 Camera';
      }

      function captureFromCamera() {
        const canvas = document.createElement('canvas');
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
        currentImage = canvas.toDataURL('image/jpeg', 0.9);
        previewImage.src = currentImage;
        previewImage.style.display = 'block';
        previewContainer.classList.add('has-image');
        stopCamera();
        scanBtn.disabled = false;
      }

      cameraBtn.addEventListener('click', () => {
        if (cameraStream && cameraVideo.style.display !== 'none') {
          captureFromCamera();
        }
      });

      // Load image from file
      function loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          currentImage = e.target.result;
          previewImage.src = currentImage;
          previewImage.style.display = 'block';
          placeholder.style.display = 'none';
          previewContainer.classList.add('has-image');
          scanBtn.disabled = false;
          stopCamera();
        };
        reader.readAsDataURL(file);
      }

      // Scan receipt
      scanBtn.addEventListener('click', async () => {
        if (!currentImage || isProcessing) return;
        await processReceipt(currentImage);
      });

      // OCR and parsing
      async function processReceipt(imageData) {
        isProcessing = true;
        processingOverlay.classList.add('active');
        progressText.textContent = 'Loading OCR...';
        API.emitOutput('status.processing', true);

        try {
          const worker = await Tesseract.createWorker('eng', 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                progressText.textContent = 'Scanning: ' + Math.round(m.progress * 100) + '%';
              }
            }
          });

          progressText.textContent = 'Recognizing text...';
          const { data } = await worker.recognize(imageData);
          await worker.terminate();

          progressText.textContent = 'Parsing receipt...';
          parsedReceipt = parseReceiptText(data.text, data.confidence);

          // Emit outputs
          API.emitOutput('receipt.parsed', parsedReceipt);
          API.emitOutput('items.extracted', parsedReceipt.items);
          API.emit('grocery.receipt.scanned', parsedReceipt);

          // Select all items by default
          selectedItems = new Set(parsedReceipt.items.map((_, i) => i));

          renderResults();
          updateButtons();

          API.log('Receipt scanned: ' + parsedReceipt.items.length + ' items found');

        } catch (err) {
          API.log('OCR error: ' + err.message);
          API.emitOutput('error.message', err.message);
        } finally {
          isProcessing = false;
          processingOverlay.classList.remove('active');
          API.emitOutput('status.processing', false);
        }
      }

      // Parse receipt text
      function parseReceiptText(text, confidence) {
        const lines = text.split('\\n').map(l => l.trim()).filter(l => l);
        const items = [];
        let storeName = 'Unknown Store';
        let date = new Date().toISOString().split('T')[0];
        let subtotal = 0;
        let tax = 0;
        let total = 0;

        // Common store patterns
        const storePatterns = [
          /walmart/i, /target/i, /kroger/i, /safeway/i, /costco/i,
          /whole foods/i, /trader joe/i, /aldi/i, /publix/i, /wegmans/i
        ];

        // Date pattern
        const datePattern = /\\b(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})\\b/;

        // Price pattern: captures item name and price
        const pricePattern = /^(.+?)\\s+\\$?(\\d+\\.\\d{2})\\s*$/;
        const qtyPricePattern = /^(.+?)\\s+(\\d+)\\s*@\\s*\\$?(\\d+\\.\\d{2})\\s+\\$?(\\d+\\.\\d{2})$/;

        // Total patterns
        const subtotalPattern = /subtotal|sub total/i;
        const taxPattern = /tax/i;
        const totalPattern = /^total|grand total/i;

        for (const line of lines) {
          // Try to find store name
          for (const pattern of storePatterns) {
            if (pattern.test(line)) {
              storeName = line.match(pattern)[0];
              break;
            }
          }

          // Try to find date
          const dateMatch = line.match(datePattern);
          if (dateMatch) {
            date = dateMatch[1];
          }

          // Try to match item with quantity and unit price
          const qtyMatch = line.match(qtyPricePattern);
          if (qtyMatch) {
            items.push({
              name: qtyMatch[1].trim(),
              quantity: parseInt(qtyMatch[2]),
              unitPrice: parseFloat(qtyMatch[3]),
              price: parseFloat(qtyMatch[4])
            });
            continue;
          }

          // Try to match simple item with price
          const priceMatch = line.match(pricePattern);
          if (priceMatch) {
            const name = priceMatch[1].trim();
            const price = parseFloat(priceMatch[2]);

            // Check if it's a total line
            if (subtotalPattern.test(name)) {
              subtotal = price;
            } else if (taxPattern.test(name)) {
              tax = price;
            } else if (totalPattern.test(name)) {
              total = price;
            } else if (price > 0 && price < 500 && name.length > 2) {
              // Likely a regular item
              items.push({
                name: cleanItemName(name),
                quantity: 1,
                unitPrice: price,
                price: price
              });
            }
          }
        }

        // Calculate totals if not found
        if (subtotal === 0) {
          subtotal = items.reduce((sum, item) => sum + item.price, 0);
        }
        if (total === 0) {
          total = subtotal + tax;
        }

        return {
          id: Date.now().toString(36),
          store: storeName,
          date: date,
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          rawText: text,
          confidence: confidence,
          scannedAt: Date.now()
        };
      }

      // Clean item name
      function cleanItemName(name) {
        return name
          .replace(/[^a-zA-Z0-9\\s\\-]/g, '')
          .replace(/\\s+/g, ' ')
          .trim()
          .substring(0, 50);
      }

      // Render results
      function renderResults() {
        if (!parsedReceipt || parsedReceipt.items.length === 0) {
          resultsArea.innerHTML = '<div class="empty-state"><div class="icon">🧾</div><div>No items found</div></div>';
          return;
        }

        let html = '';

        // Store info
        html += '<div class="store-info">';
        html += '<div class="store-name">' + escapeHtml(parsedReceipt.store) + '</div>';
        html += '<div class="store-date">📅 ' + parsedReceipt.date + '</div>';
        html += '</div>';

        // Items
        html += '<div class="result-section">';
        html += '<div class="section-header">';
        html += '<span>Items (' + parsedReceipt.items.length + ')</span>';
        html += '<span style="font-size:10px;cursor:pointer" id="select-all">Select All</span>';
        html += '</div>';
        html += '<div class="items-list">';

        parsedReceipt.items.forEach((item, index) => {
          const checked = selectedItems.has(index);
          html += '<div class="item-row editable" data-index="' + index + '">';
          html += '<div class="item-check' + (checked ? ' checked' : '') + '"></div>';
          html += '<div class="item-name">' + escapeHtml(item.name) + '</div>';
          if (item.quantity > 1) {
            html += '<div class="item-qty">x' + item.quantity + '</div>';
          }
          html += '<div class="item-price">$' + item.price.toFixed(2) + '</div>';
          html += '</div>';
        });

        html += '</div>';
        html += '</div>';

        // Totals
        html += '<div class="result-section">';
        html += '<div class="section-header"><span>Summary</span></div>';
        html += '<div class="totals-section">';
        html += '<div class="total-row"><span>Subtotal</span><span>$' + parsedReceipt.subtotal.toFixed(2) + '</span></div>';
        html += '<div class="total-row"><span>Tax</span><span>$' + parsedReceipt.tax.toFixed(2) + '</span></div>';
        html += '<div class="total-row"><span>Total</span><span>$' + parsedReceipt.total.toFixed(2) + '</span></div>';
        html += '</div>';
        html += '</div>';

        resultsArea.innerHTML = html;

        // Attach click handlers
        resultsArea.querySelectorAll('.item-row').forEach(row => {
          row.addEventListener('click', () => {
            const index = parseInt(row.dataset.index);
            const check = row.querySelector('.item-check');
            if (selectedItems.has(index)) {
              selectedItems.delete(index);
              check.classList.remove('checked');
            } else {
              selectedItems.add(index);
              check.classList.add('checked');
            }
            updateButtons();
          });
        });

        document.getElementById('select-all')?.addEventListener('click', () => {
          if (selectedItems.size === parsedReceipt.items.length) {
            selectedItems.clear();
          } else {
            selectedItems = new Set(parsedReceipt.items.map((_, i) => i));
          }
          renderResults();
          updateButtons();
        });
      }

      // Update button states
      function updateButtons() {
        const hasItems = parsedReceipt && parsedReceipt.items.length > 0;
        const hasSelected = selectedItems.size > 0;

        clearBtn.disabled = !currentImage && !parsedReceipt;
        toPantryBtn.disabled = !hasSelected;
        saveBtn.disabled = !hasSelected;
      }

      // Clear all
      clearBtn.addEventListener('click', () => {
        currentImage = null;
        parsedReceipt = null;
        selectedItems.clear();
        previewImage.style.display = 'none';
        placeholder.style.display = 'block';
        previewContainer.classList.remove('has-image');
        resultsArea.innerHTML = '<div class="empty-state"><div class="icon">🧾</div><div>Scan a receipt to see items</div></div>';
        scanBtn.disabled = true;
        updateButtons();
      });

      // Send to pantry
      toPantryBtn.addEventListener('click', () => {
        if (!parsedReceipt || selectedItems.size === 0) return;

        const pantryItems = [];
        selectedItems.forEach(index => {
          const item = parsedReceipt.items[index];
          pantryItems.push({
            name: item.name,
            category: guessCategory(item.name),
            quantity: item.quantity,
            unit: 'count',
            purchasePrice: item.price,
            purchaseDate: Date.now()
          });
        });

        if (pantryChannel) {
          pantryChannel.emitToSelected(pantryItems);
        } else {
          API.emitOutput('pantry.items', pantryItems);
        }

        API.log('Sent ' + pantryItems.length + ' items to pantry');
      });

      // Save prices
      saveBtn.addEventListener('click', () => {
        if (!parsedReceipt || selectedItems.size === 0) return;

        const priceRecords = [];
        selectedItems.forEach(index => {
          const item = parsedReceipt.items[index];
          priceRecords.push({
            itemName: item.name,
            normalizedName: item.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            price: item.price,
            quantity: item.quantity,
            unit: 'count',
            pricePerUnit: item.price / item.quantity,
            store: parsedReceipt.store,
            receiptId: parsedReceipt.id,
            date: Date.now(),
            category: guessCategory(item.name)
          });
        });

        if (pricesChannel) {
          pricesChannel.emitToSelected(priceRecords);
        } else {
          API.emitOutput('prices.recorded', priceRecords);
        }

        API.emit('grocery.prices.updated', priceRecords);
        API.log('Saved ' + priceRecords.length + ' price records');
      });

      // Guess category from item name
      function guessCategory(name) {
        const lower = name.toLowerCase();
        const categories = {
          produce: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'onion', 'potato', 'carrot', 'celery', 'fruit', 'vegetable'],
          dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
          meat: ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'ham', 'steak'],
          seafood: ['fish', 'salmon', 'shrimp', 'tuna', 'crab'],
          bakery: ['bread', 'bagel', 'muffin', 'cake', 'donut', 'roll'],
          frozen: ['frozen', 'ice cream', 'pizza'],
          beverages: ['juice', 'soda', 'water', 'coffee', 'tea', 'drink'],
          snacks: ['chip', 'cookie', 'cracker', 'candy', 'popcorn', 'nut']
        };

        for (const [category, keywords] of Object.entries(categories)) {
          if (keywords.some(kw => lower.includes(kw))) {
            return category;
          }
        }
        return 'other';
      }

      // Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Initialize
      API.onMount(function(context) {
        const savedState = context.state || {};
        if (savedState.lastReceipt) {
          parsedReceipt = savedState.lastReceipt;
          selectedItems = new Set(parsedReceipt.items.map((_, i) => i));
          renderResults();
          updateButtons();
        }
        API.log('Receipt Scanner mounted');
      });

      // Handle inputs
      API.onInput('image.scan', function(imageData) {
        if (imageData) {
          currentImage = imageData;
          previewImage.src = imageData;
          previewImage.style.display = 'block';
          placeholder.style.display = 'none';
          previewContainer.classList.add('has-image');
          processReceipt(imageData);
        }
      });

      API.onInput('trigger.scan', function() {
        if (currentImage) {
          processReceipt(currentImage);
        }
      });

      // Cleanup
      API.onDestroy(function() {
        stopCamera();
        API.setState({ lastReceipt: parsedReceipt });
        API.log('Receipt Scanner destroyed');
      });
    })();
  </script>
</body>
</html>
`;

export const ReceiptScannerWidget: BuiltinWidget = {
  manifest: ReceiptScannerWidgetManifest,
  html: ReceiptScannerWidgetHTML,
};
