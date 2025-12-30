# StickerNest Spatial XR Implementation Roadmap

A scalable, phased approach to implementing VR and AR following the core principle:
**VR and AR are rendering modes, not separate applications.**

---

## Phase 0: Foundation (COMPLETED)
*Prerequisites that enable all future work*

- [x] Create `useSpatialModeStore` for Desktop/VR/AR mode management
- [x] Add VR toggle button to CreativeToolbar
- [x] Create `implementing-spatial-xr` skill for development guidance

---

## Phase 1: Core Infrastructure
*Establish the shared systems that all modes will use*

### 1.1 Dependencies & Configuration
- [ ] Install Three.js ecosystem (`three`, `@react-three/fiber`, `@react-three/xr`, `@react-three/drei`)
- [ ] Configure Vite for WebXR (HTTPS in dev mode)
- [ ] Add WebXR TypeScript types

### 1.2 Spatial Scene Graph
- [ ] Create `SpatialScene` type (top-level container for canvases, widgets, objects)
- [ ] Implement spatial coordinate system (meters, not pixels)
- [ ] Add Z-depth and layering management
- [ ] Create `SpatialTransform` interface for all positioned objects

### 1.3 XR Capability Detection
- [ ] Create `XRCapabilityChecker` component
- [ ] Wire capability detection to `useSpatialModeStore`
- [ ] Add graceful fallback messaging for unsupported devices

### 1.4 XR Store Setup
- [ ] Create shared `xrStore` with `createXRStore()`
- [ ] Configure default session options (frameRate, foveation, handTracking)
- [ ] Wire XR session lifecycle to `useSpatialModeStore`

---

## Phase 2: Intent-Based Interaction Layer
*Normalize all input to semantic intents — critical for accessibility*

### 2.1 Core Intent System
- [ ] Define `InteractionIntent` type (`select`, `focus`, `grab`, `move`, `resize`, `rotate`, `release`)
- [ ] Create `InteractionIntentContext` for intent propagation
- [ ] Build `useInteractionIntent` hook for widgets

### 2.2 Input Adapters
- [ ] Create `MouseInputAdapter` (mouse → intents)
- [ ] Create `TouchInputAdapter` (touch → intents)
- [ ] Create `ControllerInputAdapter` (XR controller → intents)
- [ ] Create `HandInputAdapter` (hand tracking → intents)
- [ ] Create `KeyboardInputAdapter` (keyboard → intents for accessibility)

### 2.3 Unified Pointer Events
- [ ] Create `InteractiveObject` wrapper component
- [ ] Map R3F pointer events to intents
- [ ] Handle multi-input scenarios (controller + hand switching)

---

## Phase 3: Rendering Mode Adapters
*Mode-specific rendering without forking core logic*

### 3.1 Desktop Adapter
- [ ] Create `DesktopRenderAdapter` component
- [ ] Implement OrbitControls for desktop navigation
- [ ] Add optional depth cues toggle
- [ ] Ensure existing 2D canvas continues working

### 3.2 VR Adapter
- [ ] Create `VRRenderAdapter` component
- [ ] Implement `XROrigin` positioning
- [ ] Add VR environment provider (360° backgrounds)
- [ ] Configure VR-specific lighting

### 3.3 AR Adapter
- [ ] Create `ARRenderAdapter` component
- [ ] Configure passthrough (no environment)
- [ ] Add AR-specific lighting (match real world)

### 3.4 Adapter Switcher
- [ ] Create `SpatialRenderSwitcher` that selects adapter based on mode
- [ ] Handle seamless transitions between modes
- [ ] Preserve scene state across mode switches

---

## Phase 4: Locomotion & Navigation
*How users move through spatial experiences*

### 4.1 Teleportation (Primary - Accessibility First)
- [ ] Create `TeleportableFloor` component
- [ ] Implement teleport arc visualization
- [ ] Add teleport pointer to controllers and hands
- [ ] Store teleport position in state

### 4.2 Snap Rotation
- [ ] Implement 45° snap rotation for comfort
- [ ] Add rotation controls to thumbsticks
- [ ] Respect reduced motion preference

### 4.3 Focus Mode
- [ ] Create `FocusMode` component (bring content to user)
- [ ] Add focus activation gesture/button
- [ ] Animate content closer without user movement

### 4.4 No-Locomotion Fallback
- [ ] Ensure all content reachable without movement
- [ ] World comes to user option
- [ ] Bounded experience support

---

## Phase 5: Spatial Canvas System
*Extend existing canvas to be 3D-first*

### 5.1 Canvas Transform Extension
- [ ] Add `position: { x, y, z }` to canvas data model
- [ ] Add `rotation: { x, y, z }` to canvas data model
- [ ] Add `scale: { x, y, z }` to canvas data model
- [ ] Define bounding volume for interaction

### 5.2 Flat Canvas (2D Compatibility)
- [ ] Create `FlatCanvas` component (z=0 case)
- [ ] Render existing 2D content on plane
- [ ] Support billboarding option (always face user)

### 5.3 Curved Canvas
- [ ] Create `CurvedCanvas` component for VR comfort
- [ ] Implement curved projection for wide content
- [ ] Add curvature controls

### 5.4 Canvas Placement
- [ ] Implement grab-to-move for canvases in VR
- [ ] Add snap-to-grid option
- [ ] Support canvas pinning/locking

---

## Phase 6: Spatial Widget Rendering
*Widgets work identically across all modes*

### 6.1 Widget Container 3D
- [ ] Create `SpatialWidgetContainer` wrapper
- [ ] Render widget HTML to texture (CSS3DRenderer or html2canvas)
- [ ] Handle widget interaction raycasting

### 6.2 Mode-Agnostic Widgets
- [ ] Verify widgets receive intents, not raw input
- [ ] Test existing widgets in VR mode
- [ ] Document widget spatial guidelines

### 6.3 Widget Depth Ordering
- [ ] Implement Z-index equivalent for 3D
- [ ] Handle widget overlap interaction
- [ ] Add bring-to-front gesture

---

## Phase 7: AR-Specific Features
*Real-world integration for AR mode*

### 7.1 Hit Testing
- [ ] Create `ARHitTestIndicator` component
- [ ] Implement hit test for surface detection
- [ ] Add placement confirmation UX

### 7.2 Plane Detection (Optional)
- [ ] Enable plane detection feature
- [ ] Visualize detected planes
- [ ] Use planes for widget placement constraints

### 7.3 Anchors
- [ ] Implement session-based anchors
- [ ] Store anchor data for persistence
- [ ] Add anchor visualization

### 7.4 Real-World Stickers
- [ ] Create subtle anchor affordances
- [ ] User-placed spatial triggers
- [ ] Anchor-to-widget binding

---

## Phase 8: Accessibility
*Non-negotiable requirements across all modes*

### 8.1 Motion Sickness Prevention
- [ ] Implement vignette effect for locomotion
- [ ] Respect `prefers-reduced-motion` system setting
- [ ] Add comfort settings UI

### 8.2 Scalable Widgets
- [ ] Allow scaling beyond "realistic" sizes
- [ ] Add pinch-to-zoom for widget scaling
- [ ] Store per-widget scale preferences

### 8.3 Keyboard Navigation
- [ ] Implement spatial keyboard focus system
- [ ] Add keyboard shortcuts for common actions
- [ ] Support switch input devices

### 8.4 No Required Precision
- [ ] Enlarge interaction targets in VR
- [ ] Add gaze-based interaction option
- [ ] Implement dwell-to-select

### 8.5 Audio & Haptic Feedback
- [ ] Add spatial audio cues for interactions
- [ ] Implement haptic feedback for controllers
- [ ] Voice feedback option

---

## Phase 9: VR Environments
*Immersive backgrounds for VR mode*

### 9.1 360° Panoramas (v1)
- [ ] Create `VREnvironmentProvider` component
- [ ] Support equirectangular image loading
- [ ] Add preset environments

### 9.2 Environment Presets
- [ ] Create "Studio" environment (neutral)
- [ ] Create "Nature" environment
- [ ] Create "Abstract" environment
- [ ] Add environment selector UI

### 9.3 Custom Environments
- [ ] Support user-uploaded panoramas
- [ ] Add environment from URL
- [ ] Store environment preference

---

## Phase 10: Persistence & State
*Save and restore spatial experiences*

### 10.1 Session Persistence
- [ ] Save spatial positions during session
- [ ] Restore on page reload
- [ ] Handle mode-specific state

### 10.2 Cross-Session (Best Effort)
- [ ] Design persistence schema for spatial data
- [ ] Store canvas/widget transforms
- [ ] Handle coordinate space differences between sessions

### 10.3 Anchor Persistence (AR)
- [ ] Implement persistent anchor API
- [ ] Store anchor handles
- [ ] Restore anchors on session resume

---

## Phase 11: Performance & Polish
*Ensure smooth 90fps+ in VR*

### 11.1 Performance Monitoring
- [ ] Add FPS counter for XR sessions
- [ ] Implement frame time tracking
- [ ] Create performance budget alerts

### 11.2 Level of Detail
- [ ] Implement distance-based LOD for widgets
- [ ] Reduce detail for peripheral content
- [ ] Add foveated rendering hints

### 11.3 Adaptive Quality
- [ ] Detect frame drops
- [ ] Auto-reduce quality when needed
- [ ] User quality presets

### 11.4 Testing Infrastructure
- [ ] Set up WebXR Emulator for CI
- [ ] Create XR-specific test utilities
- [ ] Document manual testing procedures

---

## Future Phases (Post-v1)

### Phase 12: Hand Gesture Recognition
- [ ] Implement pinch detection
- [ ] Add swipe gestures
- [ ] Create custom gesture system

### Phase 13: Spatial Audio
- [ ] Integrate Web Audio API
- [ ] Positional audio for widgets
- [ ] Environment reverb

### Phase 14: Multi-User (Not v1)
- [ ] Shared spatial state
- [ ] Avatar representation
- [ ] Voice chat

### Phase 15: Native Shells (Not v1)
- [ ] Quest native wrapper
- [ ] Vision Pro native wrapper
- [ ] Renderer abstraction for Unity

---

## Implementation Order Recommendation

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
    ↓         ↓         ↓         ↓
    └─────────┴─────────┴─────────┘
                   ↓
              Phase 5 → Phase 6
                   ↓
         Phase 7 (AR) + Phase 8 (A11y)
                   ↓
              Phase 9 → Phase 10
                   ↓
              Phase 11
```

**Critical Path**: 1 → 2 → 3 → 5 → 6 (minimum for functional VR)
**Parallel Work**: Phase 7 (AR) and Phase 8 (Accessibility) can proceed alongside Phases 5-6

---

## Success Metrics

| Phase | Success Criteria |
|-------|------------------|
| 1 | XR session can be started from toolbar |
| 2 | Widget receives same intent from mouse and controller |
| 3 | Scene renders correctly in all three modes |
| 4 | User can teleport in VR without discomfort |
| 5 | Existing 2D canvases visible in VR |
| 6 | Widgets interactive in VR mode |
| 7 | Objects placeable on real surfaces in AR |
| 8 | All features keyboard-navigable |
| 9 | User can select VR environment |
| 10 | Session survives page reload |
| 11 | Consistent 90fps on Quest 2 |

---

## Key Files Reference

| Component | Path |
|-----------|------|
| Spatial Mode Store | `src/state/useSpatialModeStore.ts` |
| VR Toggle | `src/components/CreativeToolbar.tsx` |
| XR Skill | `.claude/skills/implementing-spatial-xr/` |
| Entity Types | `src/types/entities.ts` |
