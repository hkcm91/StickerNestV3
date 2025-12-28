# StickerNest Language Library

> **Purpose**: This document defines the official terminology, naming conventions, and language standards for the StickerNest platform. All code, documentation, and UI text should follow these guidelines to maintain consistency.

---

## Table of Contents

1. [Core Entities](#core-entities)
2. [Feature Names](#feature-names)
3. [Canvas Terminology](#canvas-terminology)
4. [Widget Terminology](#widget-terminology)
5. [Pipeline Terminology](#pipeline-terminology)
6. [Marketplace Terminology](#marketplace-terminology)
7. [Licensing & Rights Framework](#licensing--rights-framework)
8. [User & Creator Terminology](#user--creator-terminology)
9. [UI Terminology](#ui-terminology)
10. [Technical Naming Conventions](#technical-naming-conventions)
11. [Deprecated Terms](#deprecated-terms)
12. [Usage Examples](#usage-examples)

---

## Core Entities

### Canvas

The primary workspace where users create and arrange content.

| Term | Definition | Usage Context |
|------|------------|---------------|
| **Canvas** | A single editable/viewable workspace containing widgets, stickers, and other content | UI, Code, Database |
| **Canvas Instance** | A specific canvas owned by a user | Code |
| **Shared Canvas** | A canvas with public or unlisted visibility | UI |
| **Embedded Canvas** | A canvas displayed within an iframe on external sites | UI, Code |

**Database Table**: `canvases`

**DO NOT USE**: "Board", "Page", "Workspace" (use "Canvas")

---

### Widget

Interactive components that provide functionality on a canvas.

| Term | Definition | Usage Context |
|------|------------|---------------|
| **Widget** | An interactive component placed on a canvas | UI, Code |
| **Widget Definition** | The blueprint/template that defines a widget's behavior and appearance | Code |
| **Widget Instance** | A specific placement of a widget on a canvas | Code, Database |
| **Widget Bundle** | A packaged widget ready for distribution (contains code, assets, manifest) | Code, Marketplace |
| **Built-in Widget** | Official widgets provided by StickerNest | UI |
| **Community Widget** | User-created widgets shared via marketplace | UI |

**Database Table**: `widget_instances`

**DO NOT USE**: "Plugin", "Module", "Component" when referring to widgets

**DEPRECATED**: "Widget Package" - use "Widget Bundle" instead

---

### Sticker

Visual elements that add personality and decoration to canvases.

| Term | Definition | Usage Context |
|------|------------|---------------|
| **Sticker** | A visual element (image, emoji, GIF, etc.) placed on a canvas | UI, Code |
| **Sticker Instance** | A specific sticker placement on a canvas | Code |
| **Sticker Pack** | A collection of related stickers | UI, Marketplace |
| **Sticker Library** | The browsable collection of available stickers | UI |

**Sticker Media Types**: `image`, `lottie`, `gif`, `video`, `emoji`, `icon`

---

### Pipeline

Data flow connections between widgets.

| Term | Definition | Usage Context |
|------|------------|---------------|
| **Pipeline** | A data flow graph connecting widgets | UI, Code |
| **Pipeline Node** | A single widget or operator in a pipeline | Code |
| **Pipeline Connection** | A link between two pipeline nodes | Code |
| **Pipeline Port** | An input or output point on a pipeline node | Code |

**Database Table**: `pipelines`

---

## Feature Names

### Primary Features

| Feature | Description | Route |
|---------|-------------|-------|
| **Home Dashboard** | User's main page showing their canvases | `/dashboard` |
| **Canvas Editor** | The interface for editing a canvas | `/canvas/:id` or `/editor/:id` |
| **Marketplace** | Browse and discover community widgets | `/marketplace` |
| **Widget Library** | In-editor panel for adding widgets | Panel in editor |
| **Sticker Library** | In-editor panel for adding stickers | Panel in editor |
| **Creator Studio** | Tools for creators to manage their published content | `/creator/*` |

### Secondary Features

| Feature | Description |
|---------|-------------|
| **Creator Analytics** | Dashboard showing widget performance metrics |
| **Template Library** | Saved canvas layouts for reuse |
| **Canvas Sharing** | Public/unlisted canvas visibility settings |
| **Widget Sandbox** | Isolated iframe environment for widget execution |

---

## Canvas Terminology

### Canvas Modes

The canvas operates in three distinct modes:

| Mode | Description | User Action |
|------|-------------|-------------|
| **View Mode** | Read-only interaction with widgets | Clicking, interacting |
| **Edit Mode** | Modify canvas layout | Drag, resize, rotate, delete |
| **Connect Mode** | Create pipelines between widgets | Draw connections |

**Type Definition**: `CanvasMode = "view" | "edit" | "connect"`

**DO NOT CONFUSE WITH**: Developer modes (see [Developer Modes](#developer-modes))

### Developer Modes

Used internally for development and testing:

| Mode | Description |
|------|-------------|
| **Developer Mode** | Full debugging capabilities enabled |
| **User Mode** | Standard user experience |
| **Preview Mode** | Testing view before publishing |

**Type Definition**: `DeveloperCanvasMode = "developer" | "user" | "preview"`

### Canvas Visibility

| Visibility | Description |
|------------|-------------|
| **Private** | Only visible to the owner |
| **Unlisted** | Accessible via direct link only |
| **Public** | Discoverable and shareable |

### Canvas Size Presets

**Screen Sizes**: `hd`, `qhd`, `4k`, `portrait-hd`

**Social Media**: `square`, `instagram-post`, `instagram-story`, `facebook-cover`, `twitter-header`, `youtube-thumbnail`, `og-image`

**Print**: `a4-portrait`, `a4-landscape`, `letter-portrait`, `poster-24x36`, `business-card`

---

## Widget Terminology

### Widget Categories

| Category ID | Display Name | Description |
|-------------|--------------|-------------|
| `element` | Canvas Elements | Basic building blocks (text, shapes, buttons) |
| `ai` | AI Tools | AI-powered widgets |
| `design` | Design Editors | Creative tools (text styles, generators) |
| `canvas` | Canvas Control | Canvas settings (background, filters, grid) |
| `ecosystem` | Project Ecosystem | Project management widgets |
| `organization` | Organization | File and content organization |
| `gallery` | Gallery & Photos | Image display widgets |
| `pipeline` | Pipeline Widgets | Data flow visualization |
| `utility` | Utility | Helper widgets |
| `editor` | Editor Widgets | Rich editing widgets |
| `vector` | Vector Graphics | Vector editing tools |
| `debug` | Debug Tools | Development helpers |
| `test` | Test Widgets | Testing purposes |

### Widget Source Types

| Source | Description |
|--------|-------------|
| `official` | Built-in widgets from StickerNest |
| `community` | Published by community creators |
| `local` | User's unpublished widgets |
| `generated` | AI-generated widgets |

**Type Definition**: `WidgetSource = "official" | "community" | "local" | "generated"`

**DEPRECATED**: `isOfficial: boolean` - use `source` field instead

### Widget Capabilities

| Capability | Description |
|------------|-------------|
| `draggable` | Can be moved on canvas |
| `resizable` | Can be resized |
| `rotatable` | Can be rotated |
| `supports3d` | Has 3D features |
| `supportsAudio` | Has audio features |

---

## Pipeline Terminology

### Pipeline Components

| Term | Definition |
|------|------------|
| **Input Port** | Receives data from other widgets |
| **Output Port** | Sends data to other widgets |
| **Trigger** | Event that starts a pipeline execution |
| **Pipeline Runtime** | Engine that executes pipeline graphs |

### Pipeline States

| State | Description |
|-------|-------------|
| `idle` | Not currently executing |
| `running` | Actively processing data |
| `error` | Execution failed |
| `complete` | Finished successfully |

---

## Marketplace Terminology

### Publishing Flow

| Stage | Description |
|-------|-------------|
| **Draft** | Widget being prepared for publishing |
| **Pending Review** | Submitted for approval |
| **Published** | Live in marketplace |
| **Rejected** | Did not pass review |
| **Unlisted** | Removed from public listing |

### Marketplace Entities

| Term | Definition | Context |
|------|------------|---------|
| **Widget Listing** | A marketplace entry for a widget (UI term) | UI, Documentation |
| **Widget Bundle** | The downloadable widget files (code/assets) | Code, Storage |
| **WidgetPackage** | Database model for marketplace listings | Database, API |
| **Creator** | A user who publishes widgets | All |
| **Purchaser** | A user who acquires a widget | All |

> **Note on Package vs Bundle vs Listing**:
> - **WidgetPackage** is the database model name (Prisma) - represents the marketplace entity
> - **Widget Bundle** is the actual files/code package that gets downloaded
> - **Widget Listing** is the UI-facing term for the marketplace entry
> - In new UI/documentation, prefer "Listing" over "Package"
> - In code dealing with files/downloads, use "Bundle"

### Pricing Terms

| Term | Definition |
|------|------------|
| **Free** | No cost to use |
| **Premium** | Requires payment |
| **Creator Payout** | Earnings distributed to creators |

---

## Licensing & Rights Framework

The Creator Rights & Royalty Framework governs how assets are licensed, shared, and monetized.

### Core Licensing Concepts

| Term | Definition | Usage Context |
|------|------------|---------------|
| **Widget License Manifest (WLM)** | JSON schema defining all licensing terms for an asset | Code, Documentation |
| **Asset License** | The complete licensing configuration for any asset | All |
| **Creator Rights** | The set of permissions a creator retains over their work | UI, Documentation |
| **Royalty** | Percentage payment owed to creators when their assets are used | All |

### Visibility Levels

| Level | Description |
|-------|-------------|
| **Public** | Fully visible and discoverable |
| **Obfuscated** | Available but source code is protected |
| **Private** | Only visible to the owner |

**Type Definition**: `VisibilityLevel = "public" | "obfuscated" | "private"`

### AI Access Levels

| Level | Description |
|-------|-------------|
| **None** | AI cannot access this asset |
| **Read** | AI can analyze but not modify |
| **Edit** | AI can suggest modifications (owner only) |
| **Full** | AI can fully integrate, remix, and generate derivatives |

**Type Definition**: `AIAccessLevel = "none" | "read" | "edit" | "full"`

### Pipeline Usage Levels

| Level | Description |
|-------|-------------|
| **None** | Cannot be used in pipelines |
| **Read Only** | Can be used but not modified |
| **Derivative Allowed** | Can create non-commercial derivatives |
| **Commercial Derivatives** | Full commercial use allowed |

**Type Definition**: `PipelineUsageLevel = "none" | "read_only" | "derivative_allowed" | "commercial_derivatives"`

### Fork Restrictions

| Restriction | Description |
|-------------|-------------|
| **None** | No restrictions on forking |
| **Allow Fork** | Forks allowed freely |
| **Allow Fork with Royalties** | Forks allowed with royalty obligations |
| **No Forks** | No forks or derivatives allowed |

**Type Definition**: `ForkRestriction = "none" | "allow_fork" | "allow_fork_with_royalties" | "no_forks"`

### Contributor Roles

| Role | Description |
|------|-------------|
| **Developer** | Wrote code/logic |
| **Artist** | Created visual assets |
| **Designer** | Designed UI/UX |
| **Pipeline Creator** | Built data flow systems |
| **AI Contributor** | AI system that contributed |
| **Maintainer** | Maintains the asset |

**Type Definition**: `ContributorRole = "developer" | "artist" | "designer" | "pipeline_creator" | "ai_contributor" | "maintainer"`

### Asset Lineage Terms

| Term | Definition |
|------|------------|
| **Asset Lineage** | The ancestry/dependency tree of an asset |
| **Parent Asset** | An asset that this asset is derived from |
| **Child Asset** | An asset derived from this asset |
| **Derivation Type** | How an asset relates to its parent |
| **Attribution Chain** | List of required credits for all dependencies |

**Derivation Types**: `original`, `modified`, `incorporated`, `reference`

### Royalty Terms

| Term | Definition |
|------|------------|
| **Royalty Rate** | Percentage of sale owed to creator (0-50%) |
| **Royalty Cap** | Maximum cumulative royalty (50% of sale price) |
| **Royalty Breakdown** | Itemized list of royalties per dependency |
| **Net Creator Amount** | Amount creator receives after royalties and fees |
| **Platform Fee** | StickerNest's percentage (default 15%) |

### Compliance Terms

| Term | Definition |
|------|------------|
| **Compliant** | All licensing requirements met |
| **Needs Review** | Requires manual review |
| **Violation** | Known licensing violation |
| **Pending** | Not yet verified |

**Type Definition**: `ComplianceStatus = "compliant" | "needs_review" | "violation" | "pending"`

### Marketplace Transparency

| Term | Definition |
|------|------------|
| **Transparency Panel** | UI showing all licensing info for a listing |
| **Dependency Breakdown** | List of all assets used with their royalties |
| **Royalty Obligation** | Total percentage owed to all contributors |
| **AI Contributed** | Whether AI helped create the asset |
| **Human Artists Contributed** | Whether human artists contributed |

### Related Files

- **Type Definitions**: `src/types/licensing.ts`
- **Lineage Engine**: `src/services/AssetLineageEngine.ts`
- **Enforcement Service**: `src/services/LicenseEnforcement.ts`
- **UI Components**: `src/components/licensing/`

---

## User & Creator Terminology

### User Types

| Term | Definition |
|------|------------|
| **User** | Any registered account holder |
| **Creator** | A user who publishes widgets or content |
| **Viewer** | Someone viewing a shared canvas (may not be logged in) |

### User Properties

| Property | Description |
|----------|-------------|
| **Display Name** | Public-facing name |
| **Username** | Unique identifier (URL-safe) |
| **Avatar** | Profile picture |
| **Creator Status** | Whether user is an approved creator |

---

## UI Terminology

### Action Labels

| Action | Button/Label Text | DO NOT USE |
|--------|-------------------|------------|
| Create new canvas | "New Canvas" | "Create", "Add Canvas" |
| Add widget to canvas | "Add Widget" | "Insert", "Place" |
| Save changes | "Save" | "Update", "Apply" |
| Share canvas | "Share" | "Publish" (different action) |
| Publish widget | "Publish" | "Share", "Submit" |
| Delete item | "Delete" | "Remove" (use for detaching) |
| Remove from canvas | "Remove" | "Delete" (use for permanent) |

### Navigation Labels

| Location | Label |
|----------|-------|
| Main navigation home | "Dashboard" |
| Widget browsing | "Marketplace" |
| In-editor widget panel | "Widget Library" |
| User settings | "Settings" |
| Creator tools | "Creator Studio" |

### Status Messages

| Status | Message Pattern |
|--------|-----------------|
| Loading | "Loading..." or skeleton |
| Empty state | "No [items] yet" |
| Success | "[Action] successful" |
| Error | "Failed to [action]. Please try again." |

---

## Technical Naming Conventions

### Code Naming Patterns

| Type | Convention | Example |
|------|------------|---------|
| Types/Interfaces | PascalCase | `WidgetInstance`, `CanvasMode` |
| Variables | camelCase | `widgetDefId`, `canvasId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_WIDGETS`, `DEFAULT_SIZE` |
| Database columns | snake_case | `widget_def_id`, `created_at` |
| API endpoints | kebab-case | `/api/marketplace/my-widgets` |
| File names | kebab-case | `widget-library.tsx` |
| Component files | PascalCase | `WidgetLibrary.tsx` |
| Widget IDs | kebab-case | `text-block`, `ai-widget-generator` |

### Event Naming

| Namespace | Pattern | Example |
|-----------|---------|---------|
| Canvas events | `canvas:*` | `canvas:modeChanged`, `canvas:clicked` |
| Widget events | `widget:*` | `widget:ready`, `widget:emit` |
| Pipeline events | `pipeline:*` | `pipeline:executed` |
| System events | `system:*` | `system:error` |

### Hook Naming

| Pattern | Example |
|---------|---------|
| Zustand stores | `use*Store` | `useCanvasStore`, `useWidgetStore` |
| React contexts | `use*Context` | `useEditorContext` |
| Custom hooks | `use*` | `useWidgetInstance`, `useCanvasMode` |

### Component Naming

| Pattern | Example |
|---------|---------|
| Panels | `*Panel` | `WidgetLibraryPanel`, `PropertiesPanel` |
| Dialogs | `*Dialog` | `ShareDialog`, `DeleteDialog` |
| Modals | `*Modal` | `PublishModal` |
| Cards | `*Card` | `WidgetCard`, `CanvasCard` |
| Lists | `*List` | `WidgetList`, `CanvasList` |

---

## Deprecated Terms

Terms that should NOT be used and their replacements:

| Deprecated Term | Replacement | Reason |
|-----------------|-------------|--------|
| Widget Package (UI) | Widget Listing | Clearer marketplace terminology |
| Widget Package (files) | Widget Bundle | Clearer distinction |
| Board | Canvas | Platform terminology |
| Workspace | Canvas | Platform terminology |
| Plugin | Widget | Platform terminology |
| Module | Widget | Platform terminology |
| isOfficial | source: "official" | Better enum support |
| CanvasMode (in DeveloperMode.ts) | DeveloperCanvasMode | Avoid type conflict with main CanvasMode |
| Publisher | Creator | Platform terminology |
| Developer (for creators) | Creator | Platform terminology |

> **Note**: `WidgetPackage` remains valid as the Prisma/database model name. The deprecation
> applies to using "package" in UI text and new documentation.

---

## Usage Examples

### Correct Usage

```typescript
// Good: Using correct terminology
const widgetBundle = await downloadWidgetBundle(widgetId);
const canvasMode: CanvasMode = "edit";
const source: WidgetSource = "official";

// Good: Consistent event naming
eventBus.emit("canvas:modeChanged", { mode: "edit" });
eventBus.emit("widget:ready", { widgetId });

// Good: Following naming conventions
interface WidgetInstanceProps {
  widgetDefId: string;
  canvasId: string;
}
```

### Incorrect Usage

```typescript
// Bad: Using deprecated terminology
const widgetPackage = await downloadWidgetPackage(widgetId); // Use "Bundle"
const isOfficial = true; // Use source: "official"

// Bad: Inconsistent event naming
eventBus.emit("modeChanged", { mode: "edit" }); // Missing namespace
eventBus.emit("WIDGET_READY", { widgetId }); // Wrong format
```

---

## Contributing to This Document

When adding new terminology:

1. Check if an existing term covers the concept
2. Follow established naming patterns
3. Add to the appropriate section
4. Include "DO NOT USE" alternatives if applicable
5. Update the deprecated terms section if replacing old terminology

---

## Future Terminology Improvements

The following inconsistencies have been identified and should be addressed in future updates:

### 1. Unify `isOfficial` and `source` Fields

**Current State**: Both `isOfficial: boolean` and `source: 'official' | 'user' | 'local' | 'generated'` exist.

**Locations Affected**:
- `server/db/prisma/schema.prisma` - `is_official` column in `widget_packages`
- `src/types/widget.ts` - `isOfficial` property
- `src/types/manifest.ts` - `isOfficial` property
- `server/schemas/marketplace.schema.ts` - validation schema
- Multiple components using `isOfficial`

**Recommended Fix**:
1. Add `source` column to database if not present
2. Migrate `isOfficial` data: `true` → `source: 'official'`, `false` → `source: 'community'`
3. Remove `isOfficial` from all types and schemas
4. Update all component logic to use `source === 'official'`

**Priority**: Medium (functional but inconsistent)

### 2. Standardize "Widget Listing" in API Layer

**Current State**: API endpoints use "package" in naming (e.g., `widgetPackageIdParamSchema`)

**Recommended Fix**:
- Keep Prisma model names as-is
- Add API DTO types that map to "Listing" terminology
- Update Swagger/OpenAPI documentation to use "Listing"

**Priority**: Low (internal naming)

---

*Last Updated: 2025-12-06*
*Version: 1.1.0*

> Version 1.1.0 adds the Licensing & Rights Framework section for the Creator Rights & Royalty system.
