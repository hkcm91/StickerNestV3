#!/usr/bin/env node
/**
 * Comprehensive Widget Audit Script v3
 * More thorough testing including checking HTML rendering
 */

const fs = require('fs');
const path = require('path');

const WIDGETS_DIR = path.join(__dirname, '../public/test-widgets');
const BUILTIN_DIR = path.join(__dirname, '../src/widgets/builtin');

const results = {
  broken: [],      // Definitely won't work
  suspect: [],     // Probably won't work
  warning: [],     // May have issues
  working: [],     // Should work
};

function addResult(category, widget, reasons) {
  results[category].push({ widget, reasons });
}

function analyzeWidget(widgetDir, widgetName) {
  const reasons = {
    broken: [],
    suspect: [],
    warning: []
  };

  const manifestPath = path.join(widgetDir, 'manifest.json');

  // Check 1: manifest.json exists
  if (!fs.existsSync(manifestPath)) {
    reasons.broken.push('No manifest.json');
    return reasons;
  }

  // Check 2: Valid JSON
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    reasons.broken.push(`Invalid JSON: ${e.message}`);
    return reasons;
  }

  // Check 3: Required manifest fields
  if (!manifest.id) reasons.broken.push('Missing "id" field');
  if (!manifest.name) reasons.broken.push('Missing "name" field');
  if (!manifest.version) reasons.broken.push('Missing "version" field');
  if (!manifest.entry) reasons.broken.push('Missing "entry" field');
  if (!manifest.kind) reasons.suspect.push('Missing "kind" field (defaults to 2d)');

  // Check 4: Entry file exists
  if (manifest.entry) {
    const entryPath = path.join(widgetDir, manifest.entry);
    if (!fs.existsSync(entryPath)) {
      reasons.broken.push(`Entry file "${manifest.entry}" not found`);
    }
  }

  // Check 5: Capabilities (may prevent proper display)
  if (!manifest.capabilities) {
    reasons.suspect.push('Missing "capabilities" object');
  } else {
    if (typeof manifest.capabilities.draggable !== 'boolean') {
      reasons.warning.push('capabilities.draggable not a boolean');
    }
    if (typeof manifest.capabilities.resizable !== 'boolean') {
      reasons.warning.push('capabilities.resizable not a boolean');
    }
  }

  // If entry doesn't exist, skip HTML analysis
  if (!manifest.entry) return reasons;

  const entryPath = path.join(widgetDir, manifest.entry);
  if (!fs.existsSync(entryPath)) return reasons;

  // HTML Analysis
  const html = fs.readFileSync(entryPath, 'utf-8');

  // Check 6: Minimum viable content
  if (html.trim().length < 100) {
    reasons.broken.push(`HTML too small (${html.trim().length} chars)`);
    return reasons;
  }

  // Check 7: Has script tags
  if (!html.includes('<script')) {
    reasons.broken.push('No <script> tags - widget has no JavaScript');
  }

  // Check 8: JavaScript syntax errors
  const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scriptMatches) {
    const script = match[1].trim();
    if (!script) continue;
    try {
      new Function(script);
    } catch (e) {
      const err = e.message.split('\n')[0];
      reasons.broken.push(`JS syntax error: ${err}`);
    }
  }

  // Check 9: CSS brace matching
  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  for (const match of styleMatches) {
    const css = match[1];
    const open = (css.match(/{/g) || []).length;
    const close = (css.match(/}/g) || []).length;
    if (open !== close) {
      reasons.suspect.push(`CSS brace mismatch (${open} open, ${close} close)`);
    }
  }

  // Check 10: WidgetAPI or communication mechanism
  const hasWidgetAPI = html.includes('WidgetAPI');
  const hasPostMessage = html.includes('postMessage');
  const hasReadySignal = html.includes("'READY'") || html.includes('"READY"') ||
                         html.includes('widget:ready');

  if (!hasWidgetAPI && !hasPostMessage) {
    reasons.suspect.push('No WidgetAPI or postMessage - cannot communicate with host');
  } else if (!hasWidgetAPI && hasPostMessage && !hasReadySignal) {
    reasons.warning.push('Uses postMessage but may not send READY signal');
  }

  // Check 11: Basic rendering elements
  const hasContent = html.includes('<div') || html.includes('<canvas') ||
                     html.includes('<svg') || html.includes('<span') ||
                     html.includes('<p') || html.includes('<button') ||
                     html.includes('<input');
  if (!hasContent) {
    reasons.suspect.push('No visible content elements (<div>, <canvas>, etc.)');
  }

  // Check 12: Common runtime error patterns
  if (html.includes('while(true)') || html.includes('while (true)')) {
    reasons.broken.push('Contains while(true) infinite loop');
  }

  // Check 13: External script dependencies that may fail
  const srcMatches = [...html.matchAll(/src=["']([^"']+)["']/gi)];
  for (const match of srcMatches) {
    const src = match[1];
    // Skip data URIs, CDN, and blob URLs
    if (src.startsWith('data:') || src.startsWith('http') ||
        src.startsWith('//') || src.includes('blob:')) continue;
    // Check local files
    const srcPath = path.join(widgetDir, src);
    if (!fs.existsSync(srcPath) && !src.startsWith('/') && !src.includes('${')) {
      reasons.warning.push(`External resource not found: ${src}`);
    }
  }

  // Check 14: Template literals in HTML attributes (won't work)
  if (html.match(/src=["']\$\{/)) {
    reasons.warning.push('Template literal in src= attribute (only works in JS)');
  }

  // Check 15: Empty or broken event listeners
  if (html.includes("addEventListener('')") || html.includes('addEventListener("")') ||
      html.includes('addEventListener()')) {
    reasons.suspect.push('Empty or missing event listener name');
  }

  return reasons;
}

function runAudit() {
  console.log('='.repeat(72));
  console.log('WIDGET AUDIT REPORT v3 - Comprehensive Analysis');
  console.log('='.repeat(72));
  console.log(`\nScanning: ${WIDGETS_DIR}\n`);

  const widgets = fs.readdirSync(WIDGETS_DIR).filter(f => {
    return fs.statSync(path.join(WIDGETS_DIR, f)).isDirectory();
  }).sort();

  console.log(`Found ${widgets.length} widgets\n`);

  for (const widget of widgets) {
    const widgetDir = path.join(WIDGETS_DIR, widget);
    const reasons = analyzeWidget(widgetDir, widget);

    if (reasons.broken.length > 0) {
      addResult('broken', widget, reasons.broken);
    } else if (reasons.suspect.length > 0) {
      addResult('suspect', widget, reasons.suspect);
    } else if (reasons.warning.length > 0) {
      addResult('warning', widget, reasons.warning);
    } else {
      addResult('working', widget, ['No issues detected']);
    }
  }

  // Print results
  console.log('='.repeat(72));
  console.log('BROKEN: Will NOT load (critical errors)');
  console.log('='.repeat(72));
  for (const item of results.broken) {
    console.log(`\n  ${item.widget}:`);
    item.reasons.forEach(r => console.log(`    ✗ ${r}`));
  }
  if (results.broken.length === 0) console.log('  None');

  console.log('\n' + '='.repeat(72));
  console.log('SUSPECT: Likely won\'t load or display properly');
  console.log('='.repeat(72));
  for (const item of results.suspect) {
    console.log(`\n  ${item.widget}:`);
    item.reasons.forEach(r => console.log(`    ? ${r}`));
  }
  if (results.suspect.length === 0) console.log('  None');

  console.log('\n' + '='.repeat(72));
  console.log('WARNING: May have minor issues');
  console.log('='.repeat(72));
  for (const item of results.warning) {
    console.log(`\n  ${item.widget}:`);
    item.reasons.forEach(r => console.log(`    ! ${r}`));
  }
  if (results.warning.length === 0) console.log('  None');

  // Summary
  const totalBroken = results.broken.length + results.suspect.length;

  console.log('\n' + '='.repeat(72));
  console.log('SUMMARY');
  console.log('='.repeat(72));
  console.log(`  Total widgets: ${widgets.length}`);
  console.log(`  BROKEN (won't load): ${results.broken.length}`);
  console.log(`  SUSPECT (likely broken): ${results.suspect.length}`);
  console.log(`  WARNING (may have issues): ${results.warning.length}`);
  console.log(`  WORKING (should be fine): ${results.working.length}`);
  console.log('');
  console.log(`  >>> ${totalBroken} widgets likely WON'T PREVIEW <<<`);

  // Final list
  if (totalBroken > 0) {
    console.log('\n' + '='.repeat(72));
    console.log(`COMPLETE LIST: ${totalBroken} WIDGETS THAT WON'T PREVIEW`);
    console.log('='.repeat(72));
    for (const item of results.broken) {
      console.log(`  [BROKEN]  ${item.widget}`);
    }
    for (const item of results.suspect) {
      console.log(`  [SUSPECT] ${item.widget}`);
    }
  }

  // Also check builtin widgets
  console.log('\n' + '='.repeat(72));
  console.log('BUILTIN WIDGETS CHECK');
  console.log('='.repeat(72));
  checkBuiltinWidgets();
}

function checkBuiltinWidgets() {
  const builtinIndex = path.join(BUILTIN_DIR, 'index.ts');
  if (!fs.existsSync(builtinIndex)) {
    console.log('  Could not find builtin/index.ts');
    return;
  }

  const content = fs.readFileSync(builtinIndex, 'utf-8');

  // Find widgets that only have component (no html)
  const reactOnlyWidgets = [];

  // Pattern: 'widget.id': { manifest: ..., component: ... } (no html)
  const widgetEntries = content.matchAll(/'([^']+)':\s*\{\s*manifest:[^}]+component:\s*\w+\s*\}/g);
  for (const match of widgetEntries) {
    reactOnlyWidgets.push(match[1]);
  }

  if (reactOnlyWidgets.length > 0) {
    console.log('\n  React-only widgets (may not preview in FloatingPreview):');
    for (const w of reactOnlyWidgets) {
      console.log(`    - ${w}`);
    }
  }

  // Check for widgets with html property (should work)
  const htmlWidgets = [];
  const htmlMatches = content.matchAll(/'([^']+)':\s*\w+Widget/g);
  for (const match of htmlMatches) {
    if (!reactOnlyWidgets.includes(match[1])) {
      htmlWidgets.push(match[1]);
    }
  }

  console.log(`\n  Builtin widgets with HTML (should preview): ${htmlWidgets.length}`);
  console.log(`  Builtin widgets React-only: ${reactOnlyWidgets.length}`);
}

runAudit();
