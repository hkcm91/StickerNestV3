# StickerNest Profile & Gallery - UI Wireframes

## Document Version: 1.0
## Status: Phase 1 - Planning
## Last Updated: 2025-12-16

---

## Overview

This document contains text-based wireframes and layout specifications for the profile and gallery system UI components.

---

## 1. Public Profile Page (/@username)

### Desktop Layout (1440px+)

```
+--------------------------------------------------------------------------------+
| [Logo] StickerNest          [Search]     [Explore] [Create] [Avatar v]         |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  |                        BANNER IMAGE (1400 x 350)                         |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +--------+  +---------------------------------------------------------------+  |
|  |        |  |                                                               |  |
|  | AVATAR |  |  Display Name                              [Follow] [Share]  |  |
|  | (120px)|  |  @username                                                    |  |
|  |        |  |                                                               |  |
|  |  [V]   |  |  Bio text goes here. Can be multiple lines describing        |  |
|  +--------+  |  the user and their work...                                   |  |
|              |                                                               |  |
|              |  [Link] website.com  [Calendar] Joined Dec 2024               |  |
|              |                                                               |  |
|              +---------------------------------------------------------------+  |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |   12        234       89        5.4k                                     |  |
|  | Canvases  Followers Following  Views                                     |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  | [Canvases]    [Collections]    [Favorites]    [About]                    |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +------ CONTENT AREA (varies by tab) --------------------------------------+  |
|  |                                                                          |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |  |       |  |       |  |       |  |       |                              |  |
|  |  | THUMB |  | THUMB |  | THUMB |  | THUMB |                              |  |
|  |  |       |  |       |  |       |  |       |                              |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |  | Title |  | Title |  | Title |  | Title |                              |  |
|  |  | Stats |  | Stats |  | Stats |  | Stats |                              |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |                                                                          |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |  |       |  |       |  |       |  |       |                              |  |
|  |  | THUMB |  | THUMB |  | THUMB |  | THUMB |                              |  |
|  |  |       |  |       |  |       |  |       |                              |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |  | Title |  | Title |  | Title |  | Title |                              |  |
|  |  | Stats |  | Stats |  | Stats |  | Stats |                              |  |
|  |  +-------+  +-------+  +-------+  +-------+                              |  |
|  |                                                                          |  |
|  |                     [Load More]                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+--------------------------------------------------------------------------------+
| Footer: Links | Terms | Privacy | (c) StickerNest 2025                         |
+--------------------------------------------------------------------------------+
```

### Mobile Layout (< 768px)

```
+----------------------------------+
| [=] StickerNest      [Search][+] |
+----------------------------------+
|                                  |
|        BANNER (full width)       |
|                                  |
+----------------------------------+
|                                  |
|           +--------+             |
|           | AVATAR |             |
|           |  [V]   |             |
|           +--------+             |
|                                  |
|        Display Name              |
|         @username                |
|                                  |
|   [Follow]      [Share]          |
|                                  |
|  Bio text goes here...           |
|                                  |
|  [Link] [Calendar] Dec 2024      |
|                                  |
+----------------------------------+
|  12    234    89    5.4k         |
| Canvas Followers ... Views       |
+----------------------------------+
| [Canvases] [Collections] [Fav]   |
+----------------------------------+
|                                  |
|  +-------+  +-------+            |
|  | THUMB |  | THUMB |            |
|  +-------+  +-------+            |
|  | Title |  | Title |            |
|  +-------+  +-------+            |
|                                  |
|  +-------+  +-------+            |
|  | THUMB |  | THUMB |            |
|  +-------+  +-------+            |
|  | Title |  | Title |            |
|  +-------+  +-------+            |
|                                  |
+----------------------------------+
```

---

## 2. Public Gallery / Explore Page (/explore)

### Desktop Layout

```
+--------------------------------------------------------------------------------+
| [Logo] StickerNest          [Search.............]     [Sign In] [Get Started]  |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  |                    Explore Creative Canvases                             |  |
|  |           Discover amazing work from creators worldwide                   |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +-- FILTERS BAR ----------------------------------------------------------- +  |
|  |                                                                          |  |
|  |  Categories: [All] [Portfolio] [Dashboard] [Art] [Game] [More v]         |  |
|  |                                                                          |  |
|  |  Sort: [Trending v]  Time: [This Week v]        View: [Grid][List]       |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +-- FEATURED SECTION -----------------------------------------------------+   |
|  |                                                                          |  |
|  |  Featured Today                                        [View All >]      |  |
|  |                                                                          |  |
|  |  +------------------+  +------------------+  +------------------+         |  |
|  |  |                  |  |                  |  |                  |         |  |
|  |  |  LARGE THUMB     |  |  LARGE THUMB     |  |  LARGE THUMB     |         |  |
|  |  |     (16:10)      |  |     (16:10)      |  |     (16:10)      |         |  |
|  |  |                  |  |                  |  |                  |         |  |
|  |  +------------------+  +------------------+  +------------------+         |  |
|  |  | Title            |  | Title            |  | Title            |         |  |
|  |  | @author   Views  |  | @author   Views  |  | @author   Views  |         |  |
|  |  +------------------+  +------------------+  +------------------+         |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +-- CANVAS GRID ----------------------------------------------------------+   |
|  |                                                                          |  |
|  |  +-------+  +-------+  +-------+  +-------+  +-------+                   |  |
|  |  |       |  |       |  |       |  |       |  |       |                   |  |
|  |  | THUMB |  | THUMB |  | THUMB |  | THUMB |  | THUMB |                   |  |
|  |  |       |  |       |  |       |  |       |  |       |                   |  |
|  |  +-------+  +-------+  +-------+  +-------+  +-------+                   |  |
|  |  | Title |  | Title |  | Title |  | Title |  | Title |                   |  |
|  |  |@user  |  |@user  |  |@user  |  |@user  |  |@user  |                   |  |
|  |  |Views  |  |Views  |  |Views  |  |Views  |  |Views  |                   |  |
|  |  +-------+  +-------+  +-------+  +-------+  +-------+                   |  |
|  |                                                                          |  |
|  |  ... more rows with infinite scroll ...                                  |  |
|  |                                                                          |  |
|  |                        [Loading Spinner]                                 |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+--------------------------------------------------------------------------------+
```

---

## 3. Public Canvas View Page (/c/:slug)

### Desktop Layout

```
+--------------------------------------------------------------------------------+
| [Logo] StickerNest                                    [Sign In] [Get Started]  |
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +-- CANVAS HEADER ------------------------------------------------------+     |
|  |                                                                        |     |
|  |  Canvas Title                                                          |     |
|  |  Created by @username on Dec 15, 2024                                  |     |
|  |                                                                        |     |
|  |  [<3 Like (234)]  [Share]  [Embed]  [Fork]       [Open in Editor]      |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  |                                                                          |  |
|  |                                                                          |  |
|  |                                                                          |  |
|  |                      CANVAS RENDERER                                     |  |
|  |                      (Read-Only Mode)                                    |  |
|  |                                                                          |  |
|  |                       [Full Screen]                                      |  |
|  |                                                                          |  |
|  |                                                                          |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
|  +-- SIDEBAR (Right) ---+  +-- COMMENTS SECTION ---------------------------+   |
|  |                      |  |                                                |   |
|  |  AUTHOR CARD         |  |  Comments (12)                                 |   |
|  |  +----------------+  |  |                                                |   |
|  |  | [Avatar]       |  |  |  [Your comment...]              [Post]        |   |
|  |  | Display Name   |  |  |                                                |   |
|  |  | @username      |  |  |  +------------------------------------------+  |   |
|  |  | [Follow]       |  |  |  | [Av] @user1 - 2h ago                     |  |   |
|  |  +----------------+  |  |  | Comment text here...                     |  |   |
|  |                      |  |  | [Reply] [Like]                           |  |   |
|  |  Canvas Stats        |  |  +------------------------------------------+  |   |
|  |  Views: 1,234        |  |                                                |   |
|  |  Likes: 234          |  |  +------------------------------------------+  |   |
|  |  Forks: 12           |  |  | [Av] @user2 - 5h ago                     |  |   |
|  |  Comments: 12        |  |  | Another comment here...                  |  |   |
|  |                      |  |  | [Reply] [Like]                           |  |   |
|  |  Tags                |  |  +------------------------------------------+  |   |
|  |  [portfolio] [art]   |  |                                                |   |
|  |                      |  |  [Load More Comments]                          |   |
|  +----------------------+  +------------------------------------------------+   |
|                                                                                 |
|  +-- RELATED CANVASES ---------------------------------------------------+     |
|  |                                                                        |     |
|  |  More from @username                              [View Profile >]     |     |
|  |                                                                        |     |
|  |  +-------+  +-------+  +-------+  +-------+                            |     |
|  |  | THUMB |  | THUMB |  | THUMB |  | THUMB |                            |     |
|  |  +-------+  +-------+  +-------+  +-------+                            |     |
|  |                                                                        |     |
|  +------------------------------------------------------------------------+     |
|                                                                                 |
+--------------------------------------------------------------------------------+
```

### Password Prompt Overlay

```
+--------------------------------------------------------------------------------+
|                                                                                 |
|  +--------------------------------------------------------------------------+  |
|  |                                                                          |  |
|  |                     +---------------------------+                        |  |
|  |                     |                           |                        |  |
|  |                     |   [Lock Icon]             |                        |  |
|  |                     |                           |                        |  |
|  |                     |   This canvas is          |                        |  |
|  |                     |   password protected      |                        |  |
|  |                     |                           |                        |  |
|  |                     |   Enter password:         |                        |  |
|  |                     |   [...................]   |                        |  |
|  |                     |                           |                        |  |
|  |                     |   [Unlock]    [Cancel]    |                        |  |
|  |                     |                           |                        |  |
|  |                     +---------------------------+                        |  |
|  |                                                                          |  |
|  +--------------------------------------------------------------------------+  |
|                                                                                 |
+--------------------------------------------------------------------------------+
```

---

## 4. Canvas Card Component

### Grid View Card

```
+----------------------------------+
|                                  |
|          THUMBNAIL               |
|           (16:10)                |
|                                  |
|   [V] Public     [<3] [Share]   |  <- Hover overlay
+----------------------------------+
| Canvas Title                     |
| @username                        |
| 1.2k views  -  2 days ago        |
+----------------------------------+
```

### List View Card

```
+--------------------------------------------------------------------------------+
|  +--------+  Canvas Title                              [V]    1.2k views       |
|  | THUMB  |  @username                                 Public  2 days ago      |
|  | (1:1)  |  Short description preview text...                                 |
|  +--------+                                             [Like] [Share] [More]  |
+--------------------------------------------------------------------------------+
```

### Card States

```
DEFAULT:
+----------------------------------+
|          THUMBNAIL               |
|       (slightly dimmed)          |
+----------------------------------+
| Title                            |
| @username  -  Views              |
+----------------------------------+

HOVER:
+----------------------------------+
|          THUMBNAIL               |
|    +--------------------+        |
|    |  [View Canvas]     |        |  <- Centered button
|    +--------------------+        |
|   [V]              [<3] [->]     |  <- Corner actions
+----------------------------------+
| Title                            |
| @username  -  Views              |
+----------------------------------+
```

---

## 5. Publish Modal (Multi-Step Wizard)

### Step 1: Visibility

```
+------------------------------------------------------------+
|  Publish Canvas                                    [X]      |
+------------------------------------------------------------+
|                                                             |
|  Step 1 of 4: Visibility                                    |
|  [====]----------------------------------------------       |
|                                                             |
|  Who can see this canvas?                                   |
|                                                             |
|  +------------------------------------------------------+   |
|  |  [Radio]  Public                                     |   |
|  |           Anyone can find and view this canvas       |   |
|  +------------------------------------------------------+   |
|                                                             |
|  +------------------------------------------------------+   |
|  |  [Radio]  Unlisted                                   |   |
|  |           Only people with the link can view         |   |
|  +------------------------------------------------------+   |
|                                                             |
|  +------------------------------------------------------+   |
|  |  [Radio]  Password Protected                         |   |
|  |           Requires password to view                  |   |
|  |                                                      |   |
|  |           Password: [...................]            |   |
|  |           Confirm:  [...................]            |   |
|  +------------------------------------------------------+   |
|                                                             |
|                          [Cancel]     [Next: URL Setup >]   |
+------------------------------------------------------------+
```

### Step 2: URL/Slug

```
+------------------------------------------------------------+
|  Publish Canvas                                    [X]      |
+------------------------------------------------------------+
|                                                             |
|  Step 2 of 4: Canvas URL                                    |
|  [========]------------------------------------------       |
|                                                             |
|  Choose a URL for your canvas                               |
|                                                             |
|  stickernest.vercel.app/c/                                  |
|  +------------------------------------------------------+   |
|  |  [my-awesome-canvas________________]  [Generate New] |   |
|  +------------------------------------------------------+   |
|  [Check] Available!                                         |
|                                                             |
|  Preview URL:                                               |
|  https://stickernest.vercel.app/c/my-awesome-canvas         |
|  [Copy URL]                                                 |
|                                                             |
|  Tips:                                                      |
|  - Use lowercase letters, numbers, and hyphens              |
|  - Keep it short and memorable                              |
|  - Avoid special characters                                 |
|                                                             |
|                     [< Back]     [Next: SEO Settings >]     |
+------------------------------------------------------------+
```

### Step 3: SEO Settings

```
+------------------------------------------------------------+
|  Publish Canvas                                    [X]      |
+------------------------------------------------------------+
|                                                             |
|  Step 3 of 4: SEO & Social Sharing                          |
|  [============]--------------------------------------       |
|                                                             |
|  SEO Title (for search engines & social)                    |
|  +------------------------------------------------------+   |
|  |  My Awesome Canvas | StickerNest                     |   |
|  +------------------------------------------------------+   |
|                                                             |
|  Description                                                |
|  +------------------------------------------------------+   |
|  |  A creative canvas showcasing...                     |   |
|  |                                                      |   |
|  +------------------------------------------------------+   |
|  0/160 characters                                           |
|                                                             |
|  Social Preview Image                                       |
|  +------------------+  [Auto-generate from canvas]          |
|  |                  |  [Upload custom image]                |
|  |  [Preview Img]   |                                       |
|  |                  |                                       |
|  +------------------+                                       |
|                                                             |
|  [ ] Allow search engines to index this canvas              |
|                                                             |
|                     [< Back]     [Next: Preview >]          |
+------------------------------------------------------------+
```

### Step 4: Preview & Confirm

```
+------------------------------------------------------------+
|  Publish Canvas                                    [X]      |
+------------------------------------------------------------+
|                                                             |
|  Step 4 of 4: Review & Publish                              |
|  [================]----------------------------------       |
|                                                             |
|  +------------------------------------------------------+   |
|  |  SOCIAL PREVIEW CARD                                 |   |
|  |  +------------------+                                |   |
|  |  |   Preview Img    |  My Awesome Canvas             |   |
|  |  |                  |  stickernest.vercel.app        |   |
|  |  +------------------+  A creative canvas...          |   |
|  +------------------------------------------------------+   |
|                                                             |
|  Summary:                                                   |
|  - Visibility: Public                                       |
|  - URL: stickernest.vercel.app/c/my-awesome-canvas          |
|  - Embedding: Allowed                                       |
|  - Indexing: Enabled                                        |
|                                                             |
|  [!] Publishing will make this canvas visible to everyone.  |
|                                                             |
|                     [< Back]     [Publish Now]              |
+------------------------------------------------------------+
```

---

## 6. Share Modal

```
+--------------------------------------------+
|  Share Canvas                        [X]   |
+--------------------------------------------+
|                                            |
|  Link                                      |
|  +----------------------------------+      |
|  | https://stickernest.../c/slug   | [Copy]|
|  +----------------------------------+      |
|                                            |
|  Share on                                  |
|  [Twitter] [Facebook] [LinkedIn] [Email]   |
|                                            |
|  +--------------------------------------+  |
|  |  Embed Code                         |  |
|  |  <iframe src="..." width="800"...>  |  |
|  |                            [Copy]   |  |
|  +--------------------------------------+  |
|                                            |
|  QR Code           +----------+            |
|  Scan to view      |  [QR]    |            |
|                    +----------+            |
|                    [Download PNG]          |
|                                            |
+--------------------------------------------+
```

---

## 7. User Stats Display Component

### Compact (Profile Page)

```
+---------------------------------------------------+
|   12       234      89       5.4k                 |
| Canvases Followers Following Views                |
+---------------------------------------------------+
```

### Detailed (Dashboard)

```
+---------------------------------------------------+
|  +----------+  +----------+  +----------+         |
|  |    12    |  |   234    |  |   5.4k   |         |
|  | Canvases |  | Followers |  |  Views  |         |
|  | +5 month |  | +12 week  |  | +1.2k   |         |
|  +----------+  +----------+  +----------+         |
+---------------------------------------------------+
```

---

## 8. Empty States

### No Canvases

```
+--------------------------------------------------+
|                                                  |
|              [Canvas Icon - Large]               |
|                                                  |
|            No canvases yet                       |
|                                                  |
|     Start creating and publish your first        |
|     canvas to share with the world!              |
|                                                  |
|            [Create Your First Canvas]            |
|                                                  |
+--------------------------------------------------+
```

### No Results (Search)

```
+--------------------------------------------------+
|                                                  |
|              [Search Icon - Large]               |
|                                                  |
|         No results for "search term"             |
|                                                  |
|       Try different keywords or browse           |
|           our featured canvases                  |
|                                                  |
|      [Browse Featured]  [Clear Search]           |
|                                                  |
+--------------------------------------------------+
```

### User Not Found

```
+--------------------------------------------------+
|                                                  |
|              [User X Icon - Large]               |
|                                                  |
|            User not found                        |
|                                                  |
|    The profile you're looking for doesn't        |
|       exist or has been removed.                 |
|                                                  |
|               [Go to Explore]                    |
|                                                  |
+--------------------------------------------------+
```

---

## 9. Loading States

### Canvas Card Skeleton

```
+----------------------------------+
|  +----------------------------+  |
|  |                            |  |
|  |    [Shimmer Animation]     |  |
|  |                            |  |
|  +----------------------------+  |
|  | [===================]      |  |
|  | [============]             |  |
+----------------------------------+
```

### Profile Skeleton

```
+--------------------------------------------------+
|  +----------------------------------------------+|
|  |          [Shimmer Banner]                    ||
|  +----------------------------------------------+|
|                                                  |
|  [Avatar]  [=======================]             |
|            [================]                    |
|            [========]                            |
|                                                  |
|  [====] [====] [====] [====]                     |
+--------------------------------------------------+
```

---

## 10. Color & Spacing Tokens

### Colors (Dark Theme)

```
Background Primary:    #0a0a12
Background Secondary:  #14141e
Background Card:       rgba(20, 20, 30, 0.6)
Border Primary:        rgba(139, 92, 246, 0.1)
Border Hover:          rgba(139, 92, 246, 0.3)
Text Primary:          #f1f5f9
Text Secondary:        #94a3b8
Text Muted:            #64748b
Accent Primary:        #8b5cf6
Accent Secondary:      #a78bfa
Success:               #22c55e
Warning:               #f59e0b
Error:                 #ef4444
```

### Spacing

```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

### Border Radius

```
sm:  4px
md:  8px
lg:  12px
xl:  16px
2xl: 24px
full: 9999px
```

### Typography

```
Heading 1:   28px, 700 weight
Heading 2:   24px, 600 weight
Heading 3:   20px, 600 weight
Body:        14px, 400 weight
Body Small:  13px, 400 weight
Caption:     12px, 400 weight
```

---

## 11. Responsive Breakpoints

```
Mobile:       < 640px   (1-2 columns)
Tablet:       640-1024px (2-3 columns)
Desktop:      1024-1440px (3-4 columns)
Large:        > 1440px   (4-5 columns)
```

---

## 12. Interaction States

### Button States

```
Default:   Background: accent, Text: white
Hover:     Background: accent-light, Scale: 1.02
Active:    Background: accent-dark, Scale: 0.98
Disabled:  Background: gray, Opacity: 0.5
Loading:   Background: accent, Spinner icon
```

### Card States

```
Default:   Border: transparent, Shadow: none
Hover:     Border: accent/30, Shadow: elevation-2, Transform: translateY(-4px)
Active:    Border: accent/50, Shadow: elevation-1
Selected:  Border: accent, Ring: accent/20
```

### Input States

```
Default:   Border: border-primary
Focus:     Border: accent, Ring: accent/20
Error:     Border: error, Text: error
Disabled:  Background: gray/10, Opacity: 0.5
```

---

*Document maintained by: Development Team*
*Last review: 2025-12-16*
