# Development Scripts

This document describes the development and maintenance scripts available in the StickerNest project.

## Widget Audit Script

**Location:** `scripts/audit-widgets-v3.cjs`

**Purpose:** Comprehensive audit of all test widgets to identify issues that would prevent them from loading or previewing properly.

### Usage

```bash
node scripts/audit-widgets-v3.cjs
```

### What It Checks

The script analyzes each widget in `/public/test-widgets/` for:

#### Critical Issues (Widget won't load)
- Missing `manifest.json`
- Invalid JSON in manifest
- Missing required manifest fields: `id`, `name`, `version`, `entry`
- Entry file referenced in manifest doesn't exist
- JavaScript syntax errors in inline scripts
- Infinite loops (`while(true)`)

#### Major Issues (Widget likely won't work)
- Missing `kind` field (defaults to '2d')
- Missing `capabilities` object
- Missing `capabilities.draggable` or `capabilities.resizable`
- CSS brace mismatches
- No `<script>` tags (widget has no JavaScript)
- No WidgetAPI or postMessage communication
- No visible content elements

#### Warnings (May have issues)
- Uses postMessage but may not send READY signal
- Template literals in HTML src attributes
- External resources not found locally
- setInterval without clearInterval (memory leak)
- fetch() without error handling

### Output

The script outputs:
1. **BROKEN** - Widgets that definitely won't load
2. **SUSPECT** - Widgets likely to have issues
3. **WARNING** - Widgets with minor concerns
4. **Summary** - Total counts and list of all problematic widgets

### Example Output

```
========================================================================
WIDGET AUDIT REPORT v3 - Comprehensive Analysis
========================================================================

Scanning: /home/user/StickerNestV2/public/test-widgets

Found 88 widgets

========================================================================
BROKEN: Will NOT load (critical errors)
========================================================================

  image-tool:
    ✗ Missing required manifest field: "entry"

  stress-generator:
    ✗ Entry file "index.html" does not exist

========================================================================
SUMMARY
========================================================================
  Total widgets: 88
  BROKEN (won't load): 4
  SUSPECT (likely broken): 7
  WARNING (may have issues): 7
  WORKING (should be fine): 70

  >>> 11 widgets likely WON'T PREVIEW <<<
```

## Adding New Scripts

When adding new development scripts:

1. Place them in the `scripts/` directory
2. Use `.cjs` extension for CommonJS scripts (project uses ES modules)
3. Add documentation to this file
4. Include a shebang (`#!/usr/bin/env node`) for executable scripts
