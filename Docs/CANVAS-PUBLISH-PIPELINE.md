# Canvas to Web Page Slug Pipeline - Development Notes

**Created for ALPHA Launch**
**Date:** December 2024

## Overview

This document describes the canvas-to-web-page publishing pipeline that allows users to publish their StickerNest canvases as shareable web pages with custom URLs (slugs).

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLISH WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Canvas ──► PublishCanvasDialog ──► API ──► Shared Page   │
│                         │                                        │
│                    ┌────┴────┐                                  │
│                    │ Steps:  │                                  │
│                    │ 1. Settings (visibility, slug, password)   │
│                    │ 2. SEO (title, description, OG tags)       │
│                    │ 3. Preview (desktop/mobile/social)         │
│                    │ 4. Confirm & Publish                       │
│                    └─────────┘                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Created

### Part 1: Types & State Management

| File | Purpose | Lines |
|------|---------|-------|
| `src/types/publish.ts` | Publishing types, SEO metadata, validation types, slug utilities | ~220 |
| `src/state/usePublishStore.ts` | Zustand store for publish workflow state | ~380 |
| `src/services/publishValidation.ts` | Canvas validation before publishing | ~200 |

### Part 2: Publish Dialog Components

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/publish/PublishCanvasDialog.tsx` | Main multi-step publish dialog | ~480 |
| `src/components/publish/SEOMetaFields.tsx` | SEO metadata form fields | ~280 |
| `src/components/publish/PublishPreviewPanel.tsx` | Desktop/mobile/social previews | ~420 |
| `src/components/publish/index.ts` | Component exports | ~10 |

### Part 3: Public Page Components

| File | Purpose | Lines |
|------|---------|-------|
| `src/components/SEOHead.tsx` | Document head meta tag management | ~200 |
| `src/components/PublishedPageLayout.tsx` | Public page layout with sharing | ~350 |
| `src/pages/SharedCanvasPage.tsx` | Updated to use new components | ~330 |

## Key Features Implemented

### ✅ Publishing Workflow
- Multi-step wizard (Settings → SEO → Preview → Confirm)
- Visibility options (private, unlisted, public)
- Custom slug with validation and availability check
- Password protection support
- Embed permission toggle

### ✅ SEO Support
- Custom page title and description
- Open Graph tags (og:title, og:description, og:image)
- Twitter Card meta tags
- JSON-LD structured data
- robots meta tag (indexing control)
- Keyword support

### ✅ Preview System
- Desktop browser preview
- Mobile device preview
- Social card preview (Twitter, Facebook/LinkedIn)
- Validation warnings display

### ✅ Public Page Features
- SEO meta tags automatically set
- Share menu with copy link/embed code
- Social sharing buttons (Twitter, Facebook, LinkedIn)
- View counter display
- "Made with StickerNest" branding
- Embed mode support (minimal UI)

## Existing Infrastructure Leveraged

- **Slug system**: `ShareDialog.tsx`, `canvas.service.ts`
- **Routes**: `/c/:slug`, `/embed/:slug` in `AppRouter.tsx`
- **Canvas loading**: `canvasManager.ts` `loadCanvasBySlug()`
- **Password protection**: Server-side hash validation
- **View counting**: `viewCount` field on Canvas model

## API Endpoints Required

### Existing (used as-is)
- `GET /api/canvas/s/:slug` - Get canvas by slug
- `PUT /api/canvas/:id/share` - Update share settings

### To Be Added (POST-ALPHA)
- `GET /api/canvas/check-slug?slug=xxx` - Check slug availability
- `POST /api/canvas/:id/publish` - Full publish workflow
- `POST /api/canvas/:id/thumbnail` - Generate thumbnail

## Integration Points

### To Open Publish Dialog
```typescript
import { usePublishStore } from '../state/usePublishStore';

// In your component
const openDialog = usePublishStore((s) => s.openDialog);

// Open for a canvas
openDialog(canvasId, existingSettings);
```

### Or use the component directly
```tsx
import { PublishCanvasDialog } from '../components/publish';

<PublishCanvasDialog
  isOpen={showPublish}
  onClose={() => setShowPublish(false)}
  canvasId={canvasId}
  onPublished={(url) => console.log('Published at:', url)}
/>
```

## Future Enhancements (Post-ALPHA)

### High Priority
1. **Thumbnail Generation** - Auto-generate canvas thumbnails on publish
2. **Slug Availability API** - Real-time slug uniqueness check
3. **Version Snapshots** - Create canvas version on publish
4. **Analytics Dashboard** - View counts, referrers, interactions

### Medium Priority
5. **Scheduled Publishing** - Publish at a future time
6. **Custom Domains** - Use custom domain for published pages
7. **A/B Testing** - Test different canvas versions
8. **Comments/Reactions** - Allow viewer feedback

### Lower Priority
9. **Password Recovery** - Email-based access recovery
10. **Expiring Links** - Auto-expire published pages
11. **Bandwidth/View Limits** - Rate limiting for public pages
12. **Export to Static HTML** - Download full canvas as HTML file

## Testing Checklist

### Manual Testing
- [ ] Open publish dialog from canvas editor
- [ ] Switch between visibility options
- [ ] Generate and validate slugs
- [ ] Add SEO metadata
- [ ] View desktop/mobile/social previews
- [ ] Complete publish flow
- [ ] Access published page via slug URL
- [ ] Verify SEO meta tags in page source
- [ ] Test share buttons
- [ ] Test embed code generation
- [ ] Test password protection flow

### Edge Cases
- [ ] Very long canvas names
- [ ] Special characters in description
- [ ] Missing thumbnail
- [ ] Large canvas (50+ widgets)
- [ ] Broken pipeline connections
- [ ] Concurrent slug check requests

## Database Schema Notes

The canvas model already supports:
- `visibility: 'private' | 'unlisted' | 'public'`
- `slug: string | null`
- `passwordHash: string | null`
- `thumbnailUrl: string | null`
- `viewCount: number`
- `settings: JSON` (stores SEO metadata)

No schema changes required for ALPHA.

## Known Limitations

1. **No SSR** - SEO meta tags set client-side (may affect social crawlers)
2. **No thumbnail generation** - Must be uploaded manually or rely on existing thumbnailUrl
3. **Slug check is mocked** - API endpoint not yet implemented
4. **No analytics** - View count exists but no detailed analytics

## Code Style Notes

- All components follow StickerNest theming (CSS variables)
- Files kept under 500 lines for maintainability
- TypeScript strict mode compatible
- Zustand store follows project patterns
- Components use shared-ui primitives (SNButton, SNInput, etc.)

---

**Author:** Claude (AI Assistant)
**Last Updated:** December 2024
**Status:** Ready for ALPHA testing
