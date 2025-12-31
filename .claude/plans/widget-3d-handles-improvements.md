# Widget3DHandles Improvement Plan

**Goal**: Raise each feature from current 4/10 average to 7-8/10

---

## Phase 1: Architecture Refactor (Current: 4/10 → Target: 8/10)

### Problem
1200+ lines in single file, mixed concerns, no memoization, poor separation.

### Tasks
1. **Split into modules**:
   ```
   src/components/spatial/xr/widget-handles/
   ├── index.ts                    # Re-exports
   ├── Widget3DHandles.tsx         # Main orchestrator (~200 lines)
   ├── handles/
   │   ├── CornerHandle.tsx        # Memoized
   │   ├── EdgeHandle.tsx          # Memoized
   │   ├── RotationHandle.tsx      # Memoized
   │   └── DepthHandle.tsx         # Memoized
   ├── hooks/
   │   ├── useXRHaptics.ts         # Haptic feedback system
   │   ├── useTwoHandedGesture.ts  # Two-hand detection
   │   ├── useSnapBehavior.ts      # Snapping logic
   │   └── useHandleInteraction.ts # Shared pointer logic
   ├── utils/
   │   ├── snapUtils.ts            # Pure snap functions
   │   └── geometryUtils.ts        # Handle positioning math
   └── types.ts                    # All interfaces
   ```

2. **Memoize handle components** with `React.memo()` and stable callbacks

3. **Extract state to custom hook** `useWidgetManipulation()` that manages:
   - Active handle
   - Drag state
   - Snap state
   - Two-hand state

---

## Phase 2: XR Haptics (Current: 4/10 → Target: 8/10)

### Problems
- Just wraps pulse(), no patterns
- No device detection
- No accessibility/preferences

### Tasks
1. **Create haptic pattern system**:
   ```typescript
   // Waveform patterns, not just pulses
   const HAPTIC_PATTERNS = {
     hover: [{ intensity: 0.1, duration: 20 }],
     grab: [
       { intensity: 0.3, duration: 10 },
       { intensity: 0.6, duration: 30 },
       { intensity: 0.3, duration: 10 },
     ],
     snap: [
       { intensity: 0.5, duration: 15 },
       { pause: 30 },
       { intensity: 0.3, duration: 15 },
     ],
   };
   ```

2. **Add device capability detection**:
   ```typescript
   interface HapticCapabilities {
     supported: boolean;
     hdHaptics: boolean;  // Quest 3 vs Quest 2
     maxIntensity: number;
     maxDuration: number;
   }
   ```

3. **Add user preference store** in Zustand:
   ```typescript
   interface HapticPreferences {
     enabled: boolean;
     intensity: 'low' | 'medium' | 'high';
     reduceMotion: boolean;  // Accessibility
   }
   ```

4. **Fallback to Vibration API** for non-XR devices

---

## Phase 3: Two-Handed Manipulation (Current: 3/10 → Target: 8/10)

### Problems
- Controller-only, no hand tracking
- No rotation during scale
- Scale applies on release, not live
- No dead zone

### Tasks
1. **Support both input types**:
   ```typescript
   // Detect input source type
   type TwoHandInput =
     | { type: 'controllers'; left: XRController; right: XRController }
     | { type: 'hands'; left: XRHand; right: XRHand };

   // Use appropriate detection
   const isPinching = inputType === 'hands'
     ? detectPinchGesture(hand)
     : isGripPressed(controller);
   ```

2. **Add rotation during two-handed**:
   ```typescript
   // Track angle between hands
   const initialAngle = Math.atan2(
     rightPos.y - leftPos.y,
     rightPos.x - leftPos.x
   );
   const currentAngle = /* ... */;
   const rotationDelta = currentAngle - initialAngle;
   ```

3. **Live scaling** (update every frame, not on release):
   ```typescript
   // In useFrame:
   if (twoHandActive) {
     const scale = currentDistance / initialDistance;
     onResize(initialWidth * scale, initialHeight * scale, 'two-hand');
   }
   ```

4. **Dead zone** to prevent accidental activation:
   ```typescript
   const ACTIVATION_THRESHOLD = 0.1; // 10cm hand movement before activating
   const SCALE_DEAD_ZONE = 0.05;     // 5% scale change before responding
   ```

5. **Widget targeting** - track which widget hands are near:
   ```typescript
   const nearestWidget = findNearestWidget(handMidpoint, widgets);
   if (nearestWidget?.id !== selectedWidgetId) {
     // Don't manipulate unselected widgets
     return;
   }
   ```

---

## Phase 4: Z-Axis Depth Handle (Current: 5/10 → Target: 8/10)

### Problems
- Only appears with callback prop
- No rotation compensation
- No limits
- Confusing direction

### Tasks
1. **Always show depth handle** when selected (remove conditional)

2. **Account for widget rotation**:
   ```typescript
   // Transform drag delta to widget's local space
   const localDelta = delta.clone().applyQuaternion(
     widget.quaternion.clone().invert()
   );
   const depthDelta = localDelta.z;
   ```

3. **Add depth constraints**:
   ```typescript
   const DEPTH_LIMITS = {
     min: 0.3,  // 30cm minimum (inside personal space)
     max: 5.0,  // 5m maximum (practical limit)
   };
   ```

4. **Bidirectional handle** (arrows both ways):
   ```tsx
   <group>
     {/* Push arrow */}
     <mesh position={[0, 0, offset]} rotation={[Math.PI/2, 0, 0]}>
       <coneGeometry args={[size, size*2, 8]} />
     </mesh>
     {/* Pull arrow */}
     <mesh position={[0, 0, -offset]} rotation={[-Math.PI/2, 0, 0]}>
       <coneGeometry args={[size, size*2, 8]} />
     </mesh>
   </group>
   ```

5. **Visual depth indicator**:
   ```tsx
   // Show distance from user
   <Text>{`${depth.toFixed(1)}m`}</Text>
   ```

---

## Phase 5: Snap-to-Grid (Current: 4/10 → Target: 8/10)

### Problems
- Variable naming bug (`snapToGrid` is both prop and function)
- No visual grid
- Fixed threshold
- No modifier to disable

### Tasks
1. **Fix naming conflict**:
   ```typescript
   // Rename function
   function applyGridSnap(value: number, gridSize: number, threshold: number): number

   // Keep prop name
   snapToGrid?: boolean;
   ```

2. **Add visual grid overlay**:
   ```tsx
   function SnapGridOverlay({ gridSize, active }: { gridSize: number; active: boolean }) {
     if (!active) return null;

     return (
       <group>
         {/* Grid lines in X and Y */}
         {Array.from({ length: 20 }, (_, i) => (
           <line key={i}>
             <bufferGeometry>
               {/* Horizontal and vertical lines */}
             </bufferGeometry>
             <lineBasicMaterial color="#4f46e5" opacity={0.3} transparent />
           </line>
         ))}
       </group>
     );
   }
   ```

3. **Adaptive threshold** based on widget size:
   ```typescript
   const threshold = Math.min(
     SNAP_THRESHOLD,
     Math.min(width, height) * 0.1  // 10% of smallest dimension
   );
   ```

4. **Pinch modifier** to disable snapping:
   ```typescript
   // If user is pinching with non-dominant hand, disable snap
   const { left } = useHandGestures();
   const snapDisabled = left.isPinching && activeHand === 'right';
   ```

---

## Phase 6: Rotation Snapping (Current: 5/10 → Target: 8/10)

### Problems
- Indicators only show during drag
- Hardcoded 15° visuals
- Delta accumulation error
- No fine-tune mode

### Tasks
1. **Show indicators on hover**, not just active:
   ```typescript
   const showIndicators = snapEnabled && (hovered || active);
   ```

2. **Dynamic indicator generation**:
   ```typescript
   const indicators = useMemo(() => {
     const count = 360 / snapAngleIncrement;
     return Array.from({ length: count }, (_, i) => ({
       angle: i * snapAngleIncrement,
       isMain: i * snapAngleIncrement % 90 === 0,
       isMid: i * snapAngleIncrement % 45 === 0,
     }));
   }, [snapAngleIncrement]);
   ```

3. **Snap absolute angle**, not delta:
   ```typescript
   // Track cumulative rotation
   const totalRotation = initialRotation + accumulatedDelta;
   const snappedTotal = snapToAngle(totalRotation, increment);
   // Report actual change from initial
   onRotate(snappedTotal - initialRotation);
   ```

4. **Fine-tune mode** with slow drag:
   ```typescript
   // If drag speed is slow, reduce snap strength
   const dragSpeed = delta.length() / frameDelta;
   const snapStrength = dragSpeed < 0.01 ? 0.2 : 1.0;
   ```

---

## Phase 7: Aspect Ratio Lock (Current: 2/10 → Target: 7/10)

### Problems
- Math is wrong
- No toggle UI
- Doesn't work with two-handed
- Edge handles should hide

### Tasks
1. **Fix the math**:
   ```typescript
   if (lockAspectRatio && isCorner) {
     const aspectRatio = initialWidth / initialHeight;

     // Use the larger delta to drive both dimensions
     const maxDelta = Math.max(Math.abs(delta.x), Math.abs(delta.y));
     const sign = (delta.x + delta.y) > 0 ? 1 : -1;

     newWidth = initialWidth + sign * maxDelta;
     newHeight = newWidth / aspectRatio;
   }
   ```

2. **Add toggle gesture** (double-tap corner handle):
   ```typescript
   const [tapCount, setTapCount] = useState(0);
   const tapTimerRef = useRef<NodeJS.Timeout>();

   const handlePointerDown = () => {
     setTapCount(c => c + 1);
     clearTimeout(tapTimerRef.current);
     tapTimerRef.current = setTimeout(() => setTapCount(0), 300);

     if (tapCount === 1) {
       onToggleAspectLock?.();
     }
   };
   ```

3. **Apply to two-handed**:
   ```typescript
   if (lockAspectRatio && twoHandActive) {
     // Scale maintains aspect ratio by definition
     // Just ensure we use uniform scale
     newWidth = initialWidth * scaleFactor;
     newHeight = initialHeight * scaleFactor;
   }
   ```

4. **Hide edge handles** when locked:
   ```tsx
   {!lockAspectRatio && edgeHandles.map(/* ... */)}
   ```

---

## Phase 8: Visual Feedback (Current: 6/10 → Target: 8/10)

### Problems
- Dashed lines don't render properly
- Hardcoded colors
- Inconsistent units
- No snap animation

### Tasks
1. **Fix dashed line rendering**:
   ```typescript
   useEffect(() => {
     if (lineRef.current) {
       lineRef.current.computeLineDistances();
     }
   }, [points]);
   ```

2. **Use theme tokens**:
   ```typescript
   const { accentColor, successColor, borderColor } = useThemeTokens();
   const snapColor = successColor || '#22c55e';
   ```

3. **Consistent units** (always meters in 3D, convert at boundaries):
   ```typescript
   // Display in user-friendly units
   const displayWidth = `${(width * 100).toFixed(0)}cm`;
   // Or for larger widgets
   const displayWidth = width >= 1
     ? `${width.toFixed(2)}m`
     : `${(width * 100).toFixed(0)}cm`;
   ```

4. **Snap animation** with spring:
   ```typescript
   const { borderColor: animatedBorderColor } = useSpring({
     borderColor: isSnapped ? successColor : accentColor,
     config: { tension: 500, friction: 20 },
   });
   ```

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Architecture | High | Large | None |
| 5. Snap-to-Grid | High | Small | Phase 1 (fixes bug) |
| 7. Aspect Ratio | High | Small | Phase 1 (fixes bug) |
| 3. Two-Handed | High | Medium | Phase 1 |
| 2. Haptics | Medium | Medium | Phase 1 |
| 6. Rotation Snap | Medium | Small | Phase 1 |
| 4. Depth Handle | Medium | Small | None |
| 8. Visual Feedback | Low | Small | Phase 1 |

**Estimated total effort**: 2-3 focused sessions

---

## Success Criteria

Each feature at 7+/10 means:
- [ ] No bugs in core functionality
- [ ] Works on both controllers AND hand tracking
- [ ] Has appropriate visual feedback
- [ ] Respects user preferences
- [ ] Code is maintainable (<300 lines per file)
- [ ] Memoized to prevent unnecessary re-renders
