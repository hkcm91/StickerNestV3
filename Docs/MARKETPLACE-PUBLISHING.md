# StickerNest v2 — Marketplace Publishing Guide

This document describes how to publish widgets to the StickerNest Marketplace, including validation, bundling, and monetization.

---

## Overview

The Marketplace allows creators to:

- Share widgets with the community
- Monetize widgets through one-time or subscription pricing
- Track downloads and earnings
- Manage widget versions

---

## Publishing Flow

### 1. Widget Validation

Before publishing, your widget must pass validation:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Validate  │ ──> │   Bundle    │ ──> │   Upload    │
│   Widget    │     │   Files     │     │   & Publish │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2. Bundling

The bundler packages your widget:
- Combines manifest and code
- Minifies JavaScript (optional)
- Hashes files for integrity
- Creates distributable bundle

### 3. Upload

The uploader stores your bundle:
- Validates bundle structure
- Uploads to storage provider
- Returns accessible URLs

### 4. Publishing

Final publishing step:
- Creates marketplace listing
- Sets pricing and description
- Makes widget discoverable

---

## Validation Requirements

### Manifest Validation

| Field | Required | Rules |
|-------|----------|-------|
| `id` | Yes | Lowercase alphanumeric with hyphens, 3-50 chars |
| `name` | Yes | 1-100 characters |
| `version` | Yes | Semantic version (X.Y.Z) |
| `entry` | Yes | Valid filename |
| `description` | Recommended | 1-500 characters |
| `author` | Recommended | Author name or email |
| `kind` | No | One of: display, control, data, integration, container, effect |
| `tags` | No | Max 10 tags, each 1-30 chars |

### Code Validation

**Required Patterns:**

```javascript
// Must signal ready
window.parent.postMessage({ type: 'READY' }, '*');

// OR with SDK
api.onMount(() => { /* ... */ });
```

**Forbidden Patterns:**

| Pattern | Reason |
|---------|--------|
| `eval()` | Security risk |
| `new Function()` | Security risk |
| `document.write` | Security risk |
| `window.WidgetAPI` (old) | Deprecated |
| `innerHTML` with template literals | XSS risk |

### Size Limits

| Type | Limit |
|------|-------|
| Code files | 500 KB per file |
| Assets | 2 MB per file |
| Total bundle | 10 MB |
| Asset count | 50 files |

---

## Validation Severity Levels

### Errors (Blocking)

Errors must be fixed before publishing:

```typescript
{
    severity: 'error',
    code: 'MISSING_ID',
    message: 'Manifest must have an id field',
    path: 'manifest.id'
}
```

### Warnings

Warnings are advisory but should be addressed:

```typescript
{
    severity: 'warning',
    code: 'MISSING_DESCRIPTION',
    message: 'Consider adding a description',
    suggestion: 'Add a description field to improve discoverability'
}
```

### Info

Informational messages:

```typescript
{
    severity: 'info',
    code: 'OPTIONAL_ASSETS',
    message: 'No assets included in bundle'
}
```

---

## Using the Validator

### Programmatic Validation

```typescript
import { WidgetValidator } from '@/marketplace';

const validator = new WidgetValidator();

// Validate manifest
const manifestResult = await validator.validateManifest(manifest);

// Validate HTML code
const htmlResult = await validator.validateHtml(htmlContent);

// Validate bundle files
const bundleResult = await validator.validateBundle(files);

// Check if publishable
if (manifestResult.valid && htmlResult.valid && bundleResult.valid) {
    // Proceed with bundling
}
```

### Validation Result

```typescript
interface ValidationResult {
    valid: boolean;              // No errors
    issues: ValidationIssue[];   // All issues found
    stats: {
        errors: number;
        warnings: number;
        info: number;
    };
}

interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    path?: string;
    suggestion?: string;
}
```

---

## Bundling Widgets

### Creating a Bundle

```typescript
import { WidgetBundler, BundleOptions } from '@/marketplace';

const bundler = new WidgetBundler();

const options: BundleOptions = {
    manifest: myManifest,
    entryHtml: '<html>...</html>',
    assets: [
        { path: 'icons/logo.svg', content: svgContent }
    ],
    minify: true  // Minify JS in HTML
};

const result = await bundler.bundle(options);

// Result contains
{
    files: [
        { path: 'manifest.json', content: '...', size: 1024, hash: '...' },
        { path: 'index.html', content: '...', size: 4096, hash: '...' }
    ],
    totalSize: 5120,
    hash: 'sha256-...'
}
```

### Bundle Structure

```
bundle/
├── manifest.json     # Widget manifest
├── index.html        # Entry point (or custom entry)
└── assets/           # Optional assets folder
    ├── icons/
    ├── images/
    └── sounds/
```

### Minification

When `minify: true`:
- JavaScript in `<script>` tags is minified
- Whitespace is preserved in HTML structure
- CSS is not modified (add CSS minification separately)

---

## Uploading Bundles

### Storage Providers

The uploader supports multiple storage backends:

| Provider | Use Case |
|----------|----------|
| `LocalStorage` | Development/testing |
| `IndexedDB` | Local app storage |
| `HTTP` | Production server |

### Using the Uploader

```typescript
import { BundleUploader } from '@/marketplace';

// Create uploader with provider
const uploader = new BundleUploader({
    provider: 'indexeddb',
    // For HTTP: baseUrl: 'https://api.stickernest.com'
});

// Upload bundle
const result = await uploader.upload(bundleResult, {
    onProgress: (progress) => {
        console.log(`Uploading: ${progress.percent}%`);
    }
});

// Result
{
    bundlePath: 'widgets/my-widget-1.0.0.zip',
    bundleSize: 5120,
    manifestUrl: 'widgets/my-widget-1.0.0/manifest.json',
    widgetId: 'my-widget',
    version: '1.0.0'
}
```

### Progress Tracking

```typescript
interface UploadProgress {
    phase: 'preparing' | 'uploading' | 'finalizing';
    percent: number;
    bytesUploaded: number;
    totalBytes: number;
}
```

---

## Publishing UI

### Using the Publishing Component

```tsx
import { PublishingUI } from '@/components/marketplace';

function PublishPage() {
    return (
        <PublishingUI
            onPublish={(result) => {
                console.log('Published:', result.widgetId);
            }}
            onCancel={() => {
                navigate('/widgets');
            }}
        />
    );
}
```

### Publishing Wizard Steps

1. **Select Widget**
   - Choose from local widgets
   - Or upload widget files

2. **Validation**
   - Automatic validation
   - Fix any errors
   - Review warnings

3. **Manifest Editor**
   - Edit name, description
   - Add tags
   - Set category

4. **Preview**
   - Live widget preview
   - Manifest inspector
   - Port visualization

5. **Pricing**
   - Free or paid
   - One-time or subscription
   - Set price points

6. **Review & Publish**
   - Final review
   - Accept terms
   - Publish

---

## Versioning

### Semantic Versioning

Use semantic versioning for widget releases:

```
MAJOR.MINOR.PATCH

1.0.0 - Initial release
1.0.1 - Bug fix
1.1.0 - New feature (backwards compatible)
2.0.0 - Breaking change
```

### Version History

Each version is stored independently:

```
my-widget/
├── 1.0.0/
│   ├── manifest.json
│   └── index.html
├── 1.1.0/
│   ├── manifest.json
│   └── index.html
└── latest -> 1.1.0/
```

### Updating Widgets

```typescript
// Publish new version
const result = await publishWidget({
    manifest: { ...manifest, version: '1.1.0' },
    entryHtml: updatedHtml,
    changelog: 'Added dark mode support'
});
```

---

## Monetization

### Pricing Options

| Type | Description |
|------|-------------|
| Free | No charge |
| One-time | Single purchase |
| Monthly | Recurring monthly |
| Yearly | Recurring yearly |

### Setting Prices

```typescript
import { CreatorService } from '@/payments';

await CreatorService.setWidgetPricing('my-widget', {
    isFree: false,
    oneTimePrice: 499,    // $4.99 in cents
    monthlyPrice: 99,     // $0.99/month
    yearlyPrice: 999      // $9.99/year
});
```

### Revenue Split

- Creator: 85%
- Platform: 15%

### Requirements for Paid Widgets

1. Complete Stripe Connect onboarding
2. Have verified creator account
3. Starter tier or higher subscription

---

## Marketplace Listing

### Listing Fields

| Field | Description |
|-------|-------------|
| Name | Widget name from manifest |
| Description | Detailed description |
| Screenshots | Up to 5 preview images |
| Demo | Optional live demo canvas |
| Tags | Searchable tags |
| Category | Widget category |
| Author | Creator profile |
| Version | Current version |
| Downloads | Download count |
| Rating | User ratings |

### Optimizing Discoverability

1. **Clear Name**: Descriptive, unique name
2. **Good Description**: Explain what it does
3. **Tags**: Relevant keywords
4. **Screenshots**: Show widget in action
5. **Demo**: Interactive preview

---

## API Reference

### WidgetValidator

```typescript
class WidgetValidator {
    validateManifest(manifest: WidgetManifest): Promise<ValidationResult>;
    validateHtml(html: string): Promise<ValidationResult>;
    validateBundle(files: BundleFile[]): Promise<ValidationResult>;
    validateFull(options: {
        manifest: WidgetManifest;
        entryHtml: string;
        assets?: BundleFile[];
    }): Promise<{
        manifest: ValidationResult;
        html: ValidationResult;
        bundle: ValidationResult;
        overall: { valid: boolean; issues: ValidationIssue[] };
    }>;
}
```

### WidgetBundler

```typescript
class WidgetBundler {
    bundle(options: BundleOptions): Promise<BundleResult>;
}

interface BundleOptions {
    manifest: WidgetManifest;
    entryHtml: string;
    assets?: Array<{ path: string; content: string | Uint8Array }>;
    minify?: boolean;
}

interface BundleResult {
    files: BundleFile[];
    totalSize: number;
    hash: string;
}
```

### BundleUploader

```typescript
class BundleUploader {
    constructor(config: UploaderConfig);
    upload(bundle: BundleResult, options?: UploadOptions): Promise<UploadResult>;
}

interface UploaderConfig {
    provider: 'localstorage' | 'indexeddb' | 'http';
    baseUrl?: string;  // For HTTP provider
}

interface UploadOptions {
    onProgress?: (progress: UploadProgress) => void;
}

interface UploadResult {
    bundlePath: string;
    bundleSize: number;
    manifestUrl: string;
    widgetId: string;
    version: string;
}
```

---

## Best Practices

### Before Publishing

1. **Test Thoroughly**: Test in all canvas modes
2. **Validate**: Fix all errors and address warnings
3. **Document**: Add clear description and usage info
4. **Screenshot**: Capture good screenshots
5. **Version**: Use proper semantic versioning

### Maintaining Widgets

1. **Changelog**: Document changes in each version
2. **Compatibility**: Note breaking changes
3. **Support**: Respond to user feedback
4. **Updates**: Regular bug fixes and improvements

### Security

1. **No Secrets**: Never include API keys or passwords
2. **Validate Input**: Sanitize user input
3. **Safe Patterns**: Avoid eval, innerHTML with user data
4. **HTTPS Only**: Use HTTPS for external requests

---

## Troubleshooting

### Validation Fails

**"Missing READY signal"**
- Add `window.parent.postMessage({ type: 'READY' }, '*')` at end of script

**"Invalid manifest ID"**
- Use lowercase letters, numbers, and hyphens only
- Example: `my-cool-widget`

**"Bundle too large"**
- Reduce asset sizes
- Remove unused code
- Consider splitting into multiple widgets

### Upload Fails

**"Network error"**
- Check internet connection
- Retry with exponential backoff
- Check server status

**"Authentication required"**
- Log in to your account
- Ensure valid session

### Widget Not Appearing

**"Pending review"**
- First-time publishers may have review period
- Check email for updates

**"Version conflict"**
- Increment version number
- Cannot overwrite existing versions

---

## Related Documentation

- [Widget Development](./WIDGET-DEVELOPMENT.md) - Creating widgets
- [Widget Runtime API](./WIDGET-RUNTIME-API.md) - Widget API
- [Payments & Subscriptions](./PAYMENTS-SUBSCRIPTIONS.md) - Monetization
