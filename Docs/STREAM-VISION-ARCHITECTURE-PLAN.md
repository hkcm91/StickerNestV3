# StickerNest Stream Vision - 4-Phase Architecture Plan

> **Status**: Planning Document
> **Created**: 2025-12-12
> **Protocol Version**: 3.0
> **Mobile Standard**: WCAG 2.2 AA, 48px touch targets

## Vision Summary

Transform StickerNest into a streaming environment creation platform that allows users to build immersive, dynamic environments for OBS, integrating webcams, multi-user capabilities, and interactive widgets.

---

## Industry Standards Applied (2025)

| Standard | Implementation |
|----------|----------------|
| **WebRTC 1.0** | MediaStream capture, peer connections |
| **OBS WebSocket v5** | Official obs-websocket-js protocol |
| **Twitch EventSub** | Webhook-based real-time events |
| **YouTube Live API v3** | Chat, Super Chat, memberships |
| **Web Codecs API** | Hardware-accelerated video processing |
| **OffscreenCanvas** | Background thread rendering |
| **WCAG 2.2 AA** | 48px touch targets, reduced motion |
| **PWA Standards** | Offline capability, installable |

---

# PHASE 1: Stream Integration Foundation

**Goal**: Connect StickerNest to streaming infrastructure (OBS, Twitch, YouTube)

## 1.1 Stream State Management

### 1.1.1 Create `useStreamStore.ts`
**File**: `src/state/useStreamStore.ts`

- [ ] **1.1.1.1** Define TypeScript interfaces
  - `StreamConnection` (obs, twitch, youtube status)
  - `StreamState` (live, offline, starting, stopping)
  - `StreamMetrics` (viewers, bitrate, dropped frames)
  - `StreamScene` (current OBS scene, sources)
- [ ] **1.1.1.2** Implement Zustand store with persist middleware
  - Connection credentials (encrypted localStorage)
  - Auto-reconnect preferences
  - Last active scene memory
- [ ] **1.1.1.3** Create selector hooks
  - `useStreamConnected()`
  - `useStreamMetrics()`
  - `useCurrentScene()`
  - `useStreamSources()`
- [ ] **1.1.1.4** Add devtools integration for debugging

### 1.1.2 Create `useStreamEventsStore.ts`
**File**: `src/state/useStreamEventsStore.ts`

- [ ] **1.1.2.1** Define event type interfaces
  - `TwitchEvent` (follow, sub, raid, bits, reward)
  - `YouTubeEvent` (chat, super chat, member)
  - `OBSEvent` (scene change, source toggle, recording)
- [ ] **1.1.2.2** Implement circular event buffer (last 1000 events)
- [ ] **1.1.2.3** Add event filtering/query actions
- [ ] **1.1.2.4** Create event replay for testing

---

## 1.2 OBS Integration Layer

### 1.2.1 OBS WebSocket Service
**File**: `src/services/stream/OBSService.ts`

- [ ] **1.2.1.1** Implement OBS WebSocket v5 client
  - Connection management with auto-reconnect
  - Authentication (password-based)
  - Request/response handling
  - Event subscription management
- [ ] **1.2.1.2** Scene operations
  - `getScenes()` - List all scenes
  - `setCurrentScene(name)` - Switch scene
  - `getSceneSources(scene)` - Get sources in scene
- [ ] **1.2.1.3** Source operations
  - `setSourceVisibility(source, visible)`
  - `setSourceTransform(source, transform)`
  - `getSourceSettings(source)`
- [ ] **1.2.1.4** Stream control
  - `startStream()` / `stopStream()`
  - `startRecording()` / `stopRecording()`
  - `getStreamStatus()`
- [ ] **1.2.1.5** Mobile-specific: Connection status indicator widget

### 1.2.2 OBS Event Bridge
**File**: `src/runtime/OBSEventBridge.ts`

- [ ] **1.2.2.1** Subscribe to OBS events
  - SceneChanged, SceneItemEnabled, StreamStateChanged
  - RecordStateChanged, SourceFilterEnabled
- [ ] **1.2.2.2** Normalize events to EventBus format
- [ ] **1.2.2.3** Emit to EventBus with `obs:` namespace
  - `obs:scene-changed`
  - `obs:source-visibility`
  - `obs:stream-started`
  - `obs:stream-stopped`
- [ ] **1.2.2.4** Handle reconnection event replay

---

## 1.3 Stream Platform Integrations

### 1.3.1 Twitch EventSub Service
**File**: `src/services/stream/TwitchService.ts`

- [ ] **1.3.1.1** OAuth 2.0 authentication flow
  - PKCE flow for SPA security
  - Token refresh management
  - Scope request (channel:read:subscriptions, bits:read, etc.)
- [ ] **1.3.1.2** WebSocket connection to EventSub
  - Subscription management
  - Keepalive handling
  - Reconnection logic
- [ ] **1.3.1.3** Event types to support
  - `channel.follow`
  - `channel.subscribe` / `channel.subscription.gift`
  - `channel.cheer` (bits)
  - `channel.raid`
  - `channel.channel_points_custom_reward_redemption.add`
  - `stream.online` / `stream.offline`
- [ ] **1.3.1.4** Chat integration (IRC or Helix API)
- [ ] **1.3.1.5** Mobile: OAuth popup handling for in-app browser

### 1.3.2 YouTube Live API Service
**File**: `src/services/stream/YouTubeService.ts`

- [ ] **1.3.2.1** Google OAuth 2.0 flow
- [ ] **1.3.2.2** Live Chat API polling (500ms interval)
  - Super Chat detection
  - Super Sticker detection
  - Membership gifts
- [ ] **1.3.2.3** Live Broadcast API
  - Stream status monitoring
  - Viewer count polling
- [ ] **1.3.2.4** Mobile: Efficient polling with visibility API pause

### 1.3.3 Stream Event Bridge
**File**: `src/runtime/StreamEventBridge.ts`

- [ ] **1.3.3.1** Unified event normalization
  - Map platform-specific to generic types
  - `stream:follow`, `stream:subscribe`, `stream:donation`
  - `stream:raid`, `stream:reward-redeem`
- [ ] **1.3.3.2** Event enrichment (add user info, amounts)
- [ ] **1.3.3.3** Emit to EventBus for widget consumption
- [ ] **1.3.3.4** Event deduplication (prevent double-fires)

---

## 1.4 Stream Widgets (Protocol v3.0)

### 1.4.1 OBS Control Widget
**File**: `src/widgets/builtin/OBSControlWidget.ts`

- [ ] **1.4.1.1** Manifest definition
  - Inputs: `trigger.connect`, `scene.switch`, `source.toggle`
  - Outputs: `status.changed`, `scene.changed`, `error.occurred`
  - I/O hints for AI wiring
- [ ] **1.4.1.2** HTML/CSS implementation
  - Scene selector dropdown
  - Source visibility toggles
  - Stream/record status indicators
  - Connection status badge
- [ ] **1.4.1.3** Mobile optimization
  - 48px touch targets for all controls
  - Swipe gestures for scene switching
  - Haptic feedback on actions
- [ ] **1.4.1.4** Register in `BUILTIN_WIDGETS`

### 1.4.2 Stream Alert Widget
**File**: `src/widgets/builtin/StreamAlertWidget.ts`

- [ ] **1.4.2.1** Manifest with broadcast event listeners
  - Listens: `stream:follow`, `stream:subscribe`, `stream:raid`, `stream:donation`
- [ ] **1.4.2.2** Configurable alert display
  - Text templates with variables
  - Sound effects (Web Audio API)
  - Animation presets
- [ ] **1.4.2.3** Alert queue management
- [ ] **1.4.2.4** Mobile: Reduced motion support

### 1.4.3 Viewer Count Widget
**File**: `src/widgets/builtin/ViewerCountWidget.ts`

- [ ] **1.4.3.1** Real-time viewer display
- [ ] **1.4.3.2** Trend indicator (up/down/stable)
- [ ] **1.4.3.3** Peak viewer tracking
- [ ] **1.4.3.4** Output: `viewers.changed` for pipeline connections

### 1.4.4 Chat Display Widget
**File**: `src/widgets/builtin/ChatDisplayWidget.ts`

- [ ] **1.4.4.1** Unified chat from Twitch/YouTube
- [ ] **1.4.4.2** Emote rendering
- [ ] **1.4.4.3** Chat filtering (badges, keywords)
- [ ] **1.4.4.4** Mobile: Virtual scroll for performance

---

## 1.5 Canvas Overlay Mode

### 1.5.1 Overlay Canvas Mode
**File**: `src/canvas/modes/OverlayMode.ts`

- [ ] **1.5.1.1** New canvas mode: `'overlay'`
  - Transparent background (CSS `background: transparent`)
  - No grid display
  - Minimal UI chrome
- [ ] **1.5.1.2** Browser source URL generation
  - Query params for canvas ID, auth token
  - OBS browser source documentation
- [ ] **1.5.1.3** Overlay-specific viewport settings
  - Fixed resolution options (1920x1080, 2560x1440, etc.)
  - No zoom/pan in overlay mode
- [ ] **1.5.1.4** Preview mode toggle (show bounds, safe zones)

### 1.5.2 Chroma Key Background Widget
**File**: `src/widgets/builtin/ChromaKeyBgWidget.ts`

- [ ] **1.5.2.1** Solid color background options
  - Green (#00FF00), Blue (#0000FF), Magenta (#FF00FF)
  - Custom color picker
- [ ] **1.5.2.2** Use as canvas background layer
- [ ] **1.5.2.3** OBS filter compatibility notes in UI

---

## 1.6 Mobile Stream Dashboard

### 1.6.1 Mobile Stream Control Panel
**File**: `src/components/mobile/StreamControlPanel.tsx`

- [ ] **1.6.1.1** Bottom sheet UI pattern
  - Snap points: 25%, 50%, 90%
  - Swipe to dismiss
- [ ] **1.6.1.2** Quick actions grid
  - Go live / End stream
  - Scene quick-switch (large touch targets)
  - Mute/unmute mic
- [ ] **1.6.1.3** Stream health indicators
  - Connection status
  - Bitrate / dropped frames
  - CPU usage warning
- [ ] **1.6.1.4** Haptic feedback on all actions

### 1.6.2 Mobile Alert Preview
**File**: `src/components/mobile/AlertPreview.tsx`

- [ ] **1.6.2.1** Preview alerts on mobile before they show on stream
- [ ] **1.6.2.2** Manual alert trigger for testing
- [ ] **1.6.2.3** Alert queue management

---

# PHASE 2: Webcam Composition System

**Goal**: Integrate webcams into the canvas environment with chroma key and effects

## 2.1 Media Capture Infrastructure

### 2.1.1 Create `useMediaDevicesStore.ts`
**File**: `src/state/useMediaDevicesStore.ts`

- [ ] **2.1.1.1** Define interfaces
  - `MediaDeviceInfo` (id, label, kind, capabilities)
  - `ActiveStream` (stream, device, settings)
  - `CaptureConstraints` (resolution, frameRate)
- [ ] **2.1.1.2** Device enumeration with permissions
  - Camera list
  - Microphone list
  - Screen capture sources
- [ ] **2.1.1.3** Active stream management
  - Multiple simultaneous streams
  - Stream lifecycle (start, stop, pause)
- [ ] **2.1.1.4** Permission state tracking
- [ ] **2.1.1.5** Mobile: Handle iOS Safari constraints

### 2.1.2 Media Capture Service
**File**: `src/services/media/MediaCaptureService.ts`

- [ ] **2.1.2.1** Camera capture with constraints
  ```typescript
  startCamera(deviceId, {
    width: 1920, height: 1080,
    frameRate: 30,
    facingMode: 'user' // Mobile front/back
  })
  ```
- [ ] **2.1.2.2** Screen/window capture
  - `getDisplayMedia()` for screen share
  - Application window capture
- [ ] **2.1.2.3** Virtual camera output (future)
- [ ] **2.1.2.4** Mobile-specific
  - Front/back camera switching
  - Handle camera interruptions (calls, other apps)
  - Torch/flash control

---

## 2.2 Video Processing Pipeline

### 2.2.1 WebGL Video Processor
**File**: `src/services/media/VideoProcessor.ts`

- [ ] **2.2.1.1** WebGL2 rendering context setup
  - OffscreenCanvas for background processing
  - Fallback to Canvas2D for older devices
- [ ] **2.2.1.2** Shader programs
  - Passthrough shader
  - Chroma key shader (green/blue screen)
  - Color correction shader
  - Blur/bokeh background shader
- [ ] **2.2.1.3** Effect chain pipeline
  ```typescript
  processor.addEffect('chromaKey', { color: '#00FF00', threshold: 0.4 })
  processor.addEffect('colorCorrect', { brightness: 1.1, contrast: 1.05 })
  ```
- [ ] **2.2.1.4** Performance monitoring (FPS, GPU memory)
- [ ] **2.2.1.5** Mobile: Reduced resolution processing for performance

### 2.2.2 Chroma Key Implementation
**File**: `src/services/media/ChromaKeyProcessor.ts`

- [ ] **2.2.2.1** GPU-accelerated chroma key shader
  ```glsl
  // HSV-based keying for better edge detection
  uniform vec3 keyColor;
  uniform float threshold;
  uniform float smoothness;
  ```
- [ ] **2.2.2.2** Spill suppression (remove green tint on edges)
- [ ] **2.2.2.3** Edge softening/feathering
- [ ] **2.2.2.4** Key color picker (sample from video)
- [ ] **2.2.2.5** Real-time preview with adjustable parameters

### 2.2.3 Background Effects
**File**: `src/services/media/BackgroundEffects.ts`

- [ ] **2.2.3.1** AI segmentation (TensorFlow.js BodyPix/Selfie Segmentation)
  - No green screen required
  - Mobile: Use lighter model (MobileNet)
- [ ] **2.2.3.2** Virtual background replacement
- [ ] **2.2.3.3** Background blur levels (light, medium, heavy)
- [ ] **2.2.3.4** Background image/video support
- [ ] **2.2.3.5** Performance tier detection (auto-adjust quality)

---

## 2.3 Webcam Widget System

### 2.3.1 Webcam Widget
**File**: `src/widgets/builtin/WebcamWidget.ts`

- [ ] **2.3.1.1** Manifest definition
  - Inputs: `source.set`, `effect.apply`, `visibility.toggle`
  - Outputs: `stream.ready`, `stream.error`
  - Capabilities: draggable, resizable, rotatable
- [ ] **2.3.1.2** Video rendering
  - `<video>` element with MediaStream
  - Aspect ratio preservation
  - Mirror mode toggle
- [ ] **2.3.1.3** Integrated effects panel
  - Chroma key toggle + color picker
  - Background blur slider
  - Brightness/contrast adjustments
- [ ] **2.3.1.4** Mobile features
  - Camera switch button (front/back)
  - Double-tap to flip mirror
  - Pinch to zoom crop area

### 2.3.2 Webcam Frame Widget
**File**: `src/widgets/builtin/WebcamFrameWidget.ts`

- [ ] **2.3.2.1** Decorative frames for webcam
  - PNG frame overlays
  - Animated frame support (GIF, APNG)
  - SVG scalable frames
- [ ] **2.3.2.2** Frame library (built-in options)
- [ ] **2.3.2.3** Custom frame upload
- [ ] **2.3.2.4** Pipeline input: `frame.set` to change dynamically

### 2.3.3 Webcam Effects Widget
**File**: `src/widgets/builtin/WebcamEffectsWidget.ts`

- [ ] **2.3.3.1** Control panel for webcam effects
  - Connects to WebcamWidget via pipeline
- [ ] **2.3.3.2** Effect presets (streaming, professional, fun)
- [ ] **2.3.3.3** Save/load custom presets
- [ ] **2.3.3.4** Mobile: Swipe between presets

---

## 2.4 Webcam Positioning in Environment

### 2.4.1 Environment Composition Layer
**File**: `src/canvas/layers/CompositionLayer.ts`

- [ ] **2.4.1.1** Z-ordering system for webcams in scene
  - Behind environment elements
  - Between layers
  - In front of background
- [ ] **2.4.1.2** Mask/clip path support
  - Webcam visible only within defined shape
  - Environment elements can "occlude" webcam
- [ ] **2.4.1.3** Shadow casting
  - Webcam casts shadow on environment
  - Configurable shadow direction, blur, opacity
- [ ] **2.4.1.4** Perspective transformation
  - 3D-style positioning in 2D canvas
  - Keystone correction

### 2.4.2 Lighting Integration
**File**: `src/canvas/effects/LightingEffects.ts`

- [ ] **2.4.2.1** Environment lighting affects webcam
  - Color tint based on scene lighting
  - Brightness adjustments
- [ ] **2.4.2.2** Rim light effect (edge glow)
- [ ] **2.4.2.3** Ambient occlusion simulation
- [ ] **2.4.2.4** Pipeline integration: `lighting.update` event

---

## 2.5 Mobile Webcam Experience

### 2.5.1 Mobile Camera Controls
**File**: `src/components/mobile/CameraControls.tsx`

- [ ] **2.5.1.1** Floating camera control overlay
  - Flip camera button (48px, haptic)
  - Effects quick-toggle
  - Zoom slider
- [ ] **2.5.1.2** Gesture controls
  - Pinch to zoom
  - Double-tap to flip
  - Long-press for settings
- [ ] **2.5.1.3** Portrait/landscape handling
- [ ] **2.5.1.4** Battery-aware quality reduction

### 2.5.2 Mobile Preview Mode
**File**: `src/components/mobile/CameraPreview.tsx`

- [ ] **2.5.2.1** Full-screen preview of webcam output
- [ ] **2.5.2.2** A/B comparison (with/without effects)
- [ ] **2.5.2.3** Safe for streaming indicator
- [ ] **2.5.2.4** Quick share to social media

---

## 2.6 Performance Optimization

### 2.6.1 Adaptive Quality System
**File**: `src/services/media/AdaptiveQuality.ts`

- [ ] **2.6.1.1** FPS monitoring
- [ ] **2.6.1.2** Automatic resolution scaling
  - Target 30fps minimum
  - Reduce from 1080p → 720p → 480p as needed
- [ ] **2.6.1.3** Effect complexity reduction
  - Disable expensive effects when struggling
- [ ] **2.6.1.4** Mobile-specific profiles
  - Low power mode detection
  - Thermal throttling response

### 2.6.2 Memory Management
**File**: `src/services/media/MediaMemoryManager.ts`

- [ ] **2.6.2.1** Track video texture memory
- [ ] **2.6.2.2** Garbage collection hints
- [ ] **2.6.2.3** Stream cleanup on widget destroy
- [ ] **2.6.2.4** Mobile: Aggressive cleanup for limited memory

---

# PHASE 3: Multi-User Collaboration

**Goal**: Enable multiple streamers to share environments with real-time sync and permissions

## 3.1 Permission System Architecture

### 3.1.1 Create `usePermissionsStore.ts`
**File**: `src/state/usePermissionsStore.ts`

- [ ] **3.1.1.1** Define permission interfaces
  ```typescript
  interface Permission {
    level: 'read' | 'write' | 'execute' | 'full';
    scope: 'widget' | 'canvas' | 'user';
    targetId: string;
    grantedBy: string;
    expiresAt?: string;
  }

  interface ConnectionRequest {
    id: string;
    fromUserId: string;
    toUserId: string;
    canvasId: string;
    requestedPermissions: Permission[];
    status: 'pending' | 'approved' | 'denied' | 'expired';
  }

  interface TrustedConnection {
    id: string;
    userId: string;
    connectedUserId: string;
    permissions: Permission[];
    establishedAt: string;
  }
  ```
- [ ] **3.1.1.2** Implement store actions
  - `requestConnection(userId, permissions)`
  - `approveRequest(requestId)`
  - `denyRequest(requestId)`
  - `revokeConnection(connectionId)`
  - `updatePermissions(connectionId, permissions)`
- [ ] **3.1.1.3** Selector hooks
  - `usePendingRequests()`
  - `useTrustedConnections()`
  - `useCanUserEdit(userId, targetId)`
  - `useConnectionStatus(userId)`
- [ ] **3.1.1.4** Persist to Supabase (not just localStorage)

### 3.1.2 Permission Database Schema
**File**: `supabase/migrations/add_permissions.sql`

- [ ] **3.1.2.1** `connection_requests` table
  ```sql
  CREATE TABLE connection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES auth.users(id),
    to_user_id UUID REFERENCES auth.users(id),
    canvas_id UUID REFERENCES canvases(id),
    requested_permissions JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
  );
  ```
- [ ] **3.1.2.2** `trusted_connections` table
  ```sql
  CREATE TABLE trusted_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    connected_user_id UUID REFERENCES auth.users(id),
    canvas_id UUID REFERENCES canvases(id),
    permissions JSONB NOT NULL,
    established_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    UNIQUE(user_id, connected_user_id, canvas_id)
  );
  ```
- [ ] **3.1.2.3** `message_audit` table (for security logging)
  ```sql
  CREATE TABLE message_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID,
    to_user_id UUID,
    canvas_id UUID,
    message_type TEXT,
    message_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- [ ] **3.1.2.4** Row-level security policies
- [ ] **3.1.2.5** Indexes for query performance

### 3.1.3 Permission Service
**File**: `src/services/collaboration/PermissionService.ts`

- [ ] **3.1.3.1** CRUD operations via Supabase
- [ ] **3.1.3.2** Real-time subscription to permission changes
- [ ] **3.1.3.3** Permission validation middleware
- [ ] **3.1.3.4** Rate limiting (max requests per hour)
- [ ] **3.1.3.5** Audit logging for all permission changes

---

## 3.2 Real-Time Collaboration Infrastructure

### 3.2.1 Collaboration WebSocket Server
**File**: `src/services/collaboration/CollaborationServer.ts`

- [ ] **3.2.1.1** Supabase Realtime channels per canvas
  ```typescript
  const channel = supabase.channel(`canvas:${canvasId}`)
    .on('presence', { event: 'sync' }, handlePresenceSync)
    .on('broadcast', { event: 'widget:update' }, handleWidgetUpdate)
    .on('broadcast', { event: 'cursor:move' }, handleCursorMove)
    .subscribe()
  ```
- [ ] **3.2.1.2** Message types
  - `presence:join` / `presence:leave`
  - `cursor:move` (throttled 50ms)
  - `selection:change`
  - `widget:create` / `widget:update` / `widget:delete`
  - `viewport:change`
  - `chat:message`
- [ ] **3.2.1.3** Permission-checked message relay
- [ ] **3.2.1.4** Conflict resolution (last-write-wins with timestamps)
- [ ] **3.2.1.5** Mobile: Reconnection handling for unstable connections

### 3.2.2 Operational Transform / CRDT Layer
**File**: `src/services/collaboration/SyncEngine.ts`

- [ ] **3.2.2.1** Evaluate sync strategy
  - OT (Operational Transform) for text-like operations
  - CRDT (Yjs or Automerge) for complex state
  - LWW (Last-Write-Wins) for simple properties
- [ ] **3.2.2.2** Widget state sync
  - Position/size: LWW with timestamp
  - Content: OT or CRDT depending on widget type
- [ ] **3.2.2.3** Undo/redo across users
  - Local undo stack
  - Collaborative undo awareness
- [ ] **3.2.2.4** Offline queue with replay on reconnect
- [ ] **3.2.2.5** Mobile: Efficient delta sync for bandwidth

### 3.2.3 Presence Enhancement
**File**: `src/runtime/PresenceManager.ts` (extend existing)

- [ ] **3.2.3.1** Cross-user presence (not just cross-tab)
  - User avatar display
  - User name labels
  - Activity status (editing, viewing, idle)
- [ ] **3.2.3.2** Cursor rendering for remote users
  - Smooth interpolation (lerp)
  - Lag compensation
  - Color-coded by user
- [ ] **3.2.3.3** Selection highlighting
  - Show what other users have selected
  - Prevent conflicting edits (soft lock)
- [ ] **3.2.3.4** "Follow" mode (view follows another user)
- [ ] **3.2.3.5** Mobile: Simplified presence (no cursors, just indicators)

---

## 3.3 Multi-User Canvas Features

### 3.3.1 User Slots System
**File**: `src/state/useUserSlotsStore.ts`

- [ ] **3.3.1.1** Define user slot interfaces
  ```typescript
  interface UserSlot {
    id: string;
    userId: string | null;
    position: { x: number; y: number };
    role: 'host' | 'guest' | 'viewer';
    webcamWidgetId?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }
  ```
- [ ] **3.3.1.2** Slot management actions
  - `createSlot(position, role)`
  - `claimSlot(slotId)`
  - `releaseSlot(slotId)`
  - `assignSlot(slotId, userId)`
- [ ] **3.3.1.3** Auto-assign on join (optional)
- [ ] **3.3.1.4** Slot templates for common setups (podcast, panel, game)

### 3.3.2 View Switching System
**File**: `src/services/collaboration/ViewSwitcher.ts`

- [ ] **3.3.2.1** Named viewpoints
  ```typescript
  interface Viewpoint {
    id: string;
    name: string;
    viewport: ViewportState;
    visibleLayers: string[];
    highlightedWidgets: string[];
  }
  ```
- [ ] **3.3.2.2** Instant view switching
  - Animated transition (300ms ease)
  - Respect `prefers-reduced-motion`
- [ ] **3.3.2.3** View permissions (who can see which view)
- [ ] **3.3.2.4** Broadcast view to all guests
- [ ] **3.3.2.5** Mobile: Swipe between views

### 3.3.3 Teleport Points Widget
**File**: `src/widgets/builtin/TeleportPointWidget.ts`

- [ ] **3.3.3.1** Manifest definition
  - Inputs: `teleport.trigger`, `teleport.to`
  - Outputs: `teleport.activated`
  - Visual: Clickable hotspot on canvas
- [ ] **3.3.3.2** Click/tap to switch viewpoint
- [ ] **3.3.3.3** Visual indicator (icon, glow effect)
- [ ] **3.3.3.4** Pipeline: Trigger view change in connected widgets
- [ ] **3.3.3.5** Mobile: Large touch target (64px minimum)

---

## 3.4 Collaboration UI Components

### 3.4.1 Connection Request Modal
**File**: `src/components/collaboration/ConnectionRequestModal.tsx`

- [ ] **3.4.1.1** Incoming request display
  - Requester avatar + name
  - Requested permissions (clear language)
  - Canvas name
- [ ] **3.4.1.2** Action buttons
  - Approve / Deny
  - "Approve with limited permissions"
  - "Block user"
- [ ] **3.4.1.3** Request expiration timer
- [ ] **3.4.1.4** Mobile: Full-screen modal pattern

### 3.4.2 Active Users Panel
**File**: `src/components/collaboration/ActiveUsersPanel.tsx`

- [ ] **3.4.2.1** List of users in canvas
  - Avatar, name, role badge
  - Status indicator (active, idle, away)
  - "Following" indicator
- [ ] **3.4.2.2** User actions
  - Follow user's view
  - Send nudge/ping
  - Manage permissions
  - Remove from canvas (host only)
- [ ] **3.4.2.3** Collapsible panel design
- [ ] **3.4.2.4** Mobile: Bottom sheet with user list

### 3.4.3 Collaboration Toolbar
**File**: `src/components/collaboration/CollaborationToolbar.tsx`

- [ ] **3.4.3.1** Quick actions
  - Invite link generator
  - Voice chat toggle (future)
  - Screen share toggle
- [ ] **3.4.3.2** Collaboration mode indicator
  - Solo / Collaborating / Presenting
- [ ] **3.4.3.3** Network status indicator
- [ ] **3.4.3.4** Mobile: Floating action button group

### 3.4.4 Permission Management Panel
**File**: `src/components/collaboration/PermissionPanel.tsx`

- [ ] **3.4.4.1** Per-user permission editor
  - Checkbox grid for permission types
  - Scope selector (canvas-wide, specific widgets)
- [ ] **3.4.4.2** Trusted connections list
- [ ] **3.4.4.3** Connection history
- [ ] **3.4.4.4** Bulk permission templates
- [ ] **3.4.4.5** Mobile: Simplified toggle-based UI

---

## 3.5 Collaboration Widgets

### 3.5.1 User Avatar Widget
**File**: `src/widgets/builtin/UserAvatarWidget.ts`

- [ ] **3.5.1.1** Display user avatar in canvas
- [ ] **3.5.1.2** Auto-bind to user slot
- [ ] **3.5.1.3** Name label option
- [ ] **3.5.1.4** Status indicator overlay
- [ ] **3.5.1.5** Click to view user profile

### 3.5.2 Shared Notepad Widget
**File**: `src/widgets/builtin/SharedNotepadWidget.ts`

- [ ] **3.5.2.1** Collaborative text editing
- [ ] **3.5.2.2** CRDT-based sync (Yjs)
- [ ] **3.5.2.3** Cursor presence in text
- [ ] **3.5.2.4** Markdown support
- [ ] **3.5.2.5** Mobile: Auto-scroll to own cursor

### 3.5.3 Reaction Widget
**File**: `src/widgets/builtin/ReactionWidget.ts`

- [ ] **3.5.3.1** Floating reaction buttons
- [ ] **3.5.3.2** Reaction display area
- [ ] **3.5.3.3** Broadcast reactions to all users
- [ ] **3.5.3.4** Reaction animations
- [ ] **3.5.3.5** Mobile: Quick reaction gestures

---

## 3.6 Mobile Collaboration Experience

### 3.6.1 Mobile Collaboration Mode
**File**: `src/components/mobile/CollaborationMode.tsx`

- [ ] **3.6.1.1** Simplified mobile collaboration UI
  - Focus on viewing, not editing
  - Quick reactions
  - View switching
- [ ] **3.6.1.2** "Join as viewer" quick option
- [ ] **3.6.1.3** Bandwidth-efficient sync mode
  - Reduced cursor updates
  - Compressed state sync
- [ ] **3.6.1.4** Push notifications for @mentions

### 3.6.2 Mobile Voice Integration (Future)
**File**: `src/services/collaboration/VoiceService.ts`

- [ ] **3.6.2.1** WebRTC peer connections
- [ ] **3.6.2.2** Push-to-talk option
- [ ] **3.6.2.3** Audio level indicators
- [ ] **3.6.2.4** Mobile: Proximity-based audio (optional)

---

# PHASE 4: AI Characters & Advanced Reactivity

**Goal**: Create intelligent, responsive environments with AI-driven characters and cinematic event reactions

## 4.1 AI Character System Architecture

### 4.1.1 Create `useAICharacterStore.ts`
**File**: `src/state/useAICharacterStore.ts`

- [ ] **4.1.1.1** Define character interfaces
  ```typescript
  interface AICharacter {
    id: string;
    name: string;
    personality: PersonalityProfile;
    appearance: CharacterAppearance;
    voiceConfig: VoiceConfig;
    behaviorTree: BehaviorTreeNode;
    currentState: CharacterState;
    memory: ConversationMemory[];
  }

  interface PersonalityProfile {
    traits: string[];
    speakingStyle: string;
    responsePatterns: ResponsePattern[];
    triggerReactions: TriggerReaction[];
  }

  interface CharacterState {
    mood: 'neutral' | 'happy' | 'sad' | 'excited' | 'angry';
    activity: 'idle' | 'speaking' | 'reacting' | 'sleeping';
    attentionTarget: string | null;
  }
  ```
- [ ] **4.1.1.2** Character management actions
  - `createCharacter(config)`
  - `updateCharacter(id, updates)`
  - `setCharacterState(id, state)`
  - `triggerReaction(id, event)`
- [ ] **4.1.1.3** Selector hooks
  - `useCharacter(id)`
  - `useCharactersByCanvas(canvasId)`
  - `useActiveCharacters()`

### 4.1.2 AI Character Service
**File**: `src/services/ai/AICharacterService.ts`

- [ ] **4.1.2.1** LLM integration for responses
  - OpenAI GPT-4 / Claude API
  - Local LLM option (Ollama)
  - Configurable per character
- [ ] **4.1.2.2** Personality prompt construction
  ```typescript
  buildCharacterPrompt(character, context, userInput)
  ```
- [ ] **4.1.2.3** Response generation
  - Text response
  - Emotion/mood extraction
  - Action suggestions
- [ ] **4.1.2.4** Rate limiting and cost management
- [ ] **4.1.2.5** Mobile: Cached responses for common interactions

### 4.1.3 Behavior Tree Engine
**File**: `src/services/ai/BehaviorTreeEngine.ts`

- [ ] **4.1.3.1** Behavior tree node types
  ```typescript
  type BehaviorNode =
    | { type: 'sequence'; children: BehaviorNode[] }
    | { type: 'selector'; children: BehaviorNode[] }
    | { type: 'condition'; check: string; params: any }
    | { type: 'action'; action: string; params: any }
    | { type: 'wait'; duration: number }
    | { type: 'random'; weights: number[]; children: BehaviorNode[] }
  ```
- [ ] **4.1.3.2** Built-in conditions
  - `viewerCountAbove(n)`
  - `eventReceived(type)`
  - `timeElapsed(seconds)`
  - `moodIs(mood)`
  - `randomChance(percent)`
- [ ] **4.1.3.3** Built-in actions
  - `speak(text)`
  - `emote(animation)`
  - `changeMood(mood)`
  - `lookAt(target)`
  - `playSound(sound)`
- [ ] **4.1.3.4** Tree execution engine (tick-based)
- [ ] **4.1.3.5** Visual behavior tree editor (future)

---

## 4.2 Character Rendering & Animation

### 4.2.1 AI Character Widget
**File**: `src/widgets/builtin/AICharacterWidget.ts`

- [ ] **4.2.1.1** Manifest definition
  - Inputs: `trigger.speak`, `mood.set`, `event.react`
  - Outputs: `speech.started`, `speech.ended`, `mood.changed`
  - Events listens: `stream:*`, `chat:message`
- [ ] **4.2.1.2** Character display modes
  - Static image (with expression swaps)
  - Animated sprite sheet
  - Live2D model (advanced)
  - 3D avatar (future)
- [ ] **4.2.1.3** Expression system
  - Mood-based expression selection
  - Blend between expressions
  - Eye blink animation
- [ ] **4.2.1.4** Mobile: Simplified rendering for performance

### 4.2.2 Speech Bubble System
**File**: `src/widgets/builtin/SpeechBubbleWidget.ts`

- [ ] **4.2.2.1** Manifest with text input
- [ ] **4.2.2.2** Typing animation effect
- [ ] **4.2.2.3** Auto-size to content
- [ ] **4.2.2.4** Configurable styles (comic, modern, pixel)
- [ ] **4.2.2.5** Auto-hide after duration
- [ ] **4.2.2.6** Mobile: Responsive text size

### 4.2.3 Character Voice System
**File**: `src/services/ai/CharacterVoiceService.ts`

- [ ] **4.2.3.1** Text-to-Speech integration
  - Web Speech API (free, basic)
  - ElevenLabs API (premium, realistic)
  - Azure Cognitive Services
- [ ] **4.2.3.2** Voice configuration per character
  ```typescript
  interface VoiceConfig {
    provider: 'web' | 'elevenlabs' | 'azure';
    voiceId: string;
    pitch: number;
    rate: number;
    volume: number;
  }
  ```
- [ ] **4.2.3.3** Audio playback queue
- [ ] **4.2.3.4** Lip sync data generation (visemes)
- [ ] **4.2.3.5** Mobile: User-initiated audio only (autoplay restrictions)

---

## 4.3 Stream Event Reactivity Engine

### 4.3.1 Event Reaction System
**File**: `src/runtime/EventReactionEngine.ts`

- [ ] **4.3.1.1** Reaction rule definitions
  ```typescript
  interface ReactionRule {
    id: string;
    name: string;
    trigger: EventTrigger;
    conditions: Condition[];
    actions: ReactionAction[];
    cooldown?: number;
    priority: number;
  }

  interface EventTrigger {
    eventType: string;
    filters?: Record<string, any>;
  }

  interface ReactionAction {
    type: 'widget' | 'lighting' | 'sound' | 'character' | 'scene';
    target: string;
    action: string;
    params: Record<string, any>;
    delay?: number;
  }
  ```
- [ ] **4.3.1.2** Rule engine with priority ordering
- [ ] **4.3.1.3** Cooldown management
- [ ] **4.3.1.4** Action execution queue
- [ ] **4.3.1.5** Mobile: Notification of triggered reactions

### 4.3.2 Lighting Reaction Widget
**File**: `src/widgets/builtin/LightingControlWidget.ts`

- [ ] **4.3.2.1** Canvas-wide lighting effects
  - Color overlay
  - Brightness/contrast
  - Vignette
  - Color grading presets
- [ ] **4.3.2.2** Pipeline inputs for reactive control
  - `lighting.setColor(color, duration)`
  - `lighting.flash(color, intensity)`
  - `lighting.pulse(color, frequency)`
- [ ] **4.3.2.3** Preset transitions (day/night, alert, celebration)
- [ ] **4.3.2.4** Smooth animated transitions (CSS/WebGL)
- [ ] **4.3.2.5** Mobile: Respect reduced motion preferences

### 4.3.3 Audio Reaction System
**File**: `src/services/audio/ReactionAudioService.ts`

- [ ] **4.3.3.1** Web Audio API context management
- [ ] **4.3.3.2** Sound effect library
  - Alert sounds
  - Ambient loops
  - One-shot effects
- [ ] **4.3.3.3** Spatial audio (positional based on widget location)
- [ ] **4.3.3.4** Volume ducking (lower music during speech)
- [ ] **4.3.3.5** Mobile: User-interaction requirement handling

### 4.3.4 Ambient Audio Widget
**File**: `src/widgets/builtin/AmbientAudioWidget.ts`

- [ ] **4.3.4.1** Background audio player
  - Loop support
  - Crossfade between tracks
- [ ] **4.3.4.2** Reactive volume/effects
  - Duck during alerts
  - Change track based on events
- [ ] **4.3.4.3** Multiple ambient layers
- [ ] **4.3.4.4** Mobile: Play/pause controls (no autoplay)

---

## 4.4 Cinematic Event System

### 4.4.1 Scene Transition Engine
**File**: `src/services/cinematic/SceneTransitionEngine.ts`

- [ ] **4.4.1.1** Transition types
  ```typescript
  type TransitionType =
    | 'fade'
    | 'slide'
    | 'zoom'
    | 'wipe'
    | 'dissolve'
    | 'custom';
  ```
- [ ] **4.4.1.2** Multi-canvas transitions
  - Switch between prepared canvases
  - Preserve widget states
- [ ] **4.4.1.3** Triggered transitions
  - On stream event
  - On timer
  - On manual trigger
- [ ] **4.4.1.4** Mobile: Simplified fade transitions only

### 4.4.2 Stinger Widget
**File**: `src/widgets/builtin/StingerWidget.ts`

- [ ] **4.4.2.1** Full-screen animation overlay
  - Video stinger support
  - Lottie animation support
  - Image sequence support
- [ ] **4.4.2.2** Trigger inputs
  - `stinger.play()`
  - `stinger.playAndSwitch(targetCanvas)`
- [ ] **4.4.2.3** Callback outputs
  - `stinger.midpoint` (for scene switch timing)
  - `stinger.complete`
- [ ] **4.4.2.4** Library of built-in stingers

### 4.4.3 Event Celebration System
**File**: `src/services/cinematic/CelebrationService.ts`

- [ ] **4.4.3.1** Celebration presets
  - Confetti burst
  - Fireworks
  - Screen shake
  - Gold coin shower
- [ ] **4.4.3.2** Intensity scaling based on event value
  - $5 tip = small celebration
  - $100 tip = epic celebration
- [ ] **4.4.3.3** Particle system (Canvas2D or WebGL)
- [ ] **4.4.3.4** Sound + visual sync
- [ ] **4.4.3.5** Mobile: Reduced particle count

---

## 4.5 Advanced Reaction Patterns

### 4.5.1 Sentiment Analysis Widget
**File**: `src/widgets/builtin/SentimentWidget.ts`

- [ ] **4.5.1.1** Chat sentiment aggregation
  - Positive / Negative / Neutral scoring
  - Emote analysis
  - Keyword detection
- [ ] **4.5.1.2** Rolling sentiment window (last 100 messages)
- [ ] **4.5.1.3** Output: `sentiment.changed` for pipeline
- [ ] **4.5.1.4** Visualization (mood meter display)
- [ ] **4.5.1.5** Trigger reactions based on chat mood

### 4.5.2 Game Integration Widget
**File**: `src/widgets/builtin/GameIntegrationWidget.ts`

- [ ] **4.5.2.1** Webhook receiver for game events
  - D&D Beyond integration
  - Roll20 integration
  - Custom game webhooks
- [ ] **4.5.2.2** Event normalization
  ```typescript
  { type: 'game:roll', result: 1, rollType: 'attack' }
  { type: 'game:roll', result: 20, rollType: 'attack' }
  { type: 'game:combat', phase: 'start' }
  { type: 'game:death', character: 'Gandalf' }
  ```
- [ ] **4.5.2.3** Output to pipeline for reactions
- [ ] **4.5.2.4** Mobile: View game state, no edit

### 4.5.3 Reaction Rule Editor
**File**: `src/components/reactions/ReactionRuleEditor.tsx`

- [ ] **4.5.3.1** Visual rule builder UI
  - Trigger selector (dropdown of event types)
  - Condition builder (and/or logic)
  - Action sequence editor
- [ ] **4.5.3.2** Rule testing mode
  - Simulate events
  - Preview reactions
- [ ] **4.5.3.3** Rule templates library
- [ ] **4.5.3.4** Import/export rules (JSON)
- [ ] **4.5.3.5** Mobile: View-only, configure on desktop

---

## 4.6 AI Character Presets & Templates

### 4.6.1 Character Template Library
**File**: `src/services/ai/CharacterTemplates.ts`

- [ ] **4.6.1.1** Built-in character templates
  ```typescript
  const TEMPLATES = {
    'tavern-keeper': {
      personality: { traits: ['friendly', 'gossipy', 'helpful'] },
      triggerReactions: [
        { event: 'stream:subscribe', response: 'Welcome to the tavern!' },
        { event: 'stream:raid', response: 'Oi! We got visitors!' }
      ]
    },
    'dungeon-master': { /* ... */ },
    'hype-person': { /* ... */ },
    'mysterious-oracle': { /* ... */ }
  };
  ```
- [ ] **4.6.1.2** Character customization wizard
- [ ] **4.6.1.3** Save custom templates
- [ ] **4.6.1.4** Share templates (marketplace future)

### 4.6.2 Character Behavior Presets
**File**: `src/services/ai/BehaviorPresets.ts`

- [ ] **4.6.2.1** Behavior tree presets
  - "Reactive Host" - responds to all events
  - "Ambient NPC" - occasional idle animations
  - "Interactive" - responds to chat mentions
  - "Scheduled" - time-based behaviors
- [ ] **4.6.2.2** Combine presets
- [ ] **4.6.2.3** Behavior intensity slider (chatty ↔ quiet)

---

## 4.7 Mobile AI Experience

### 4.7.1 Mobile Character Control
**File**: `src/components/mobile/CharacterControl.tsx`

- [ ] **4.7.1.1** Character quick actions
  - Make character speak (text input)
  - Mood selector
  - Preset reactions
- [ ] **4.7.1.2** Character status display
- [ ] **4.7.1.3** Voice message input (speech-to-text → character speaks)
- [ ] **4.7.1.4** Haptic feedback on character reactions

### 4.7.2 Mobile Reaction Monitor
**File**: `src/components/mobile/ReactionMonitor.tsx`

- [ ] **4.7.2.1** Live feed of triggered reactions
- [ ] **4.7.2.2** Manual reaction triggers
- [ ] **4.7.2.3** Quick enable/disable rules
- [ ] **4.7.2.4** Push notifications for major events

---

# Summary

## Architecture Requirements by Phase

| Phase | New Files | New Stores | New Widgets | Key Dependencies |
|-------|-----------|------------|-------------|------------------|
| **1. Stream Integration** | ~15 | 2 | 5 | obs-websocket-js, @twurple/api |
| **2. Webcam Composition** | ~12 | 1 | 4 | TensorFlow.js (optional) |
| **3. Multi-User Collab** | ~18 | 2 | 4 | Supabase Realtime, Yjs |
| **4. AI Characters** | ~20 | 1 | 8 | OpenAI/Claude API, Web Speech |

## Technology Stack (2025 Standards)

| Category | Technology | Standard |
|----------|------------|----------|
| **Video Processing** | WebGL2 + OffscreenCanvas | Web Codecs API |
| **Real-time Sync** | Supabase Realtime + Yjs | WebSocket + CRDT |
| **AI/ML** | TensorFlow.js (segmentation) | WASM SIMD |
| **Audio** | Web Audio API | AudioWorklet |
| **Touch** | Pointer Events | WCAG 2.2 AA |
| **PWA** | Service Worker + Cache API | Workbox |

## Mobile-First Guarantees

Every component includes:
- 48px minimum touch targets
- Haptic feedback via Vibration API
- `prefers-reduced-motion` respect
- Safe area inset handling
- Bandwidth-efficient sync modes
- Battery-aware quality scaling
- Portrait/landscape responsive layouts

## Implementation Notes

### Protocol v3.0 Compatibility
All new widgets must:
- Use `window.WidgetAPI` for communication
- Declare inputs/outputs in manifest
- Follow naming conventions (`stickernest.widget-name`)
- Include proper lifecycle handlers (`onMount`, `onDestroy`)

### EventBus Integration
Stream/collaboration events use namespaced events:
- `obs:*` - OBS WebSocket events
- `stream:*` - Normalized stream platform events
- `collab:*` - Collaboration events
- `ai:*` - AI character events

### State Persistence
- Stream credentials: Encrypted localStorage
- User preferences: Zustand persist
- Collaboration state: Supabase real-time
- AI character state: Local + optional cloud sync
