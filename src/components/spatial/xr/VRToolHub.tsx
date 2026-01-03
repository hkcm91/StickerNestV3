/**
 * StickerNest - VR Tool Hub
 *
 * A true 3D floating toolbar for VR/AR with depth, physicality, and style.
 * NOT a 2D overlay - this is built with actual 3D geometry.
 *
 * Features:
 * - Curved or straight backplate (adjustable via slider)
 * - 3D buttons with actual depth and press animation
 * - Sleek materials that respond to lighting
 * - Expandable modular design
 * - Hand attachment or pinned in space
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { animated, useSpring } from '@react-spring/three';
import { useMenuGesture, useHandGestures } from './useHandGestures';
import { useVRToolHubStore } from '../../../state/useVRToolHubStore';

// ============================================================================
// Types
// ============================================================================

export type VRToolType = 'select' | 'move' | 'resize' | 'rotate' | 'draw' | 'widget';

export interface VRToolHubProps {
  /** Currently selected tool */
  activeTool?: VRToolType;
  /** Called when tool is selected */
  onToolChange?: (tool: VRToolType) => void;
  /** Called when undo is pressed */
  onUndo?: () => void;
  /** Called when redo is pressed */
  onRedo?: () => void;
  /** Called when add widget is pressed */
  onAddWidget?: () => void;
  /** Called when settings is pressed */
  onSettings?: () => void;
  /** Initial curve amount (0 = flat, 1 = fully curved) */
  initialCurve?: number;
  /** Accent color */
  accentColor?: string;
  /** Whether to show the hub */
  visible?: boolean;
  /** Fixed position (if not following hand) */
  position?: [number, number, number];
}

// ============================================================================
// Constants
// ============================================================================

const HUB_WIDTH = 0.42; // meters
const HUB_HEIGHT = 0.16; // meters
const HUB_DEPTH = 0.025; // meters - gives it thickness
const BUTTON_SIZE = 0.052; // meters
const BUTTON_DEPTH = 0.018; // meters - how thick buttons are
const BUTTON_PRESS_DEPTH = 0.008; // meters - how far they press in
const BUTTON_GAP = 0.012; // meters between buttons
const CURVE_RADIUS_MIN = 0.8; // meters - tightest curve
const CURVE_RADIUS_MAX = 50; // meters - essentially flat

// ============================================================================
// Curved Backplate Geometry
// ============================================================================

interface CurvedBackplateProps {
  width: number;
  height: number;
  depth: number;
  curveAmount: number; // 0 = flat, 1 = fully curved
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
}

function CurvedBackplate({
  width,
  height,
  depth,
  curveAmount,
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
}: CurvedBackplateProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create curved geometry
  const geometry = useMemo(() => {
    const segments = 32;

    // Interpolate radius based on curve amount
    const radius = THREE.MathUtils.lerp(CURVE_RADIUS_MAX, CURVE_RADIUS_MIN, curveAmount);

    // Calculate the arc angle based on width and radius
    const arcAngle = width / radius;
    const halfAngle = arcAngle / 2;

    // Create a curved panel shape
    const shape = new THREE.Shape();
    const cornerRadius = 0.012;

    // Create rounded rectangle path
    shape.moveTo(-width / 2 + cornerRadius, -height / 2);
    shape.lineTo(width / 2 - cornerRadius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + cornerRadius);
    shape.lineTo(width / 2, height / 2 - cornerRadius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - cornerRadius, height / 2);
    shape.lineTo(-width / 2 + cornerRadius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - cornerRadius);
    shape.lineTo(-width / 2, -height / 2 + cornerRadius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + cornerRadius, -height / 2);

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 3,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Now bend the geometry if curved
    if (curveAmount > 0.01) {
      const positions = geo.attributes.position;
      const vertex = new THREE.Vector3();

      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);

        // Calculate angle based on x position
        const angle = (vertex.x / width) * arcAngle;

        // Bend around the curve
        const originalX = vertex.x;
        const originalZ = vertex.z;

        // Apply cylindrical transformation
        vertex.x = Math.sin(angle) * (radius + originalZ);
        vertex.z = -(Math.cos(angle) * (radius + originalZ) - radius);

        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }

      geo.computeVertexNormals();
    }

    // Center the geometry
    geo.translate(0, 0, -depth / 2);

    return geo;
  }, [width, height, depth, curveAmount]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={0.3}
        roughness={0.7}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

// ============================================================================
// 3D Button Component
// ============================================================================

interface Button3DProps {
  position: [number, number, number];
  size?: number;
  depth?: number;
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  accentColor: string;
  onClick: () => void;
  curveAmount: number;
  buttonIndex: number;
  totalButtons: number;
  hubWidth: number;
}

function Button3D({
  position,
  size = BUTTON_SIZE,
  depth = BUTTON_DEPTH,
  icon,
  label,
  active = false,
  disabled = false,
  accentColor,
  onClick,
  curveAmount,
  buttonIndex,
  totalButtons,
  hubWidth,
}: Button3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Spring animation for press effect
  const { pressZ, glowIntensity, buttonScale } = useSpring({
    pressZ: pressed ? -BUTTON_PRESS_DEPTH : 0,
    glowIntensity: hovered ? 0.4 : active ? 0.25 : 0,
    buttonScale: hovered ? 1.05 : 1,
    config: { tension: 400, friction: 30 },
  });

  // Calculate curved position
  const curvedPosition = useMemo((): [number, number, number] => {
    if (curveAmount < 0.01) {
      return position;
    }

    const radius = THREE.MathUtils.lerp(CURVE_RADIUS_MAX, CURVE_RADIUS_MIN, curveAmount);
    const arcAngle = hubWidth / radius;
    const angle = (position[0] / hubWidth) * arcAngle;

    const x = Math.sin(angle) * radius;
    const z = -(Math.cos(angle) * radius - radius) + position[2];

    return [x, position[1], z];
  }, [position, curveAmount, hubWidth]);

  // Calculate rotation to face outward on curve
  const curvedRotation = useMemo((): [number, number, number] => {
    if (curveAmount < 0.01) {
      return [0, 0, 0];
    }

    const radius = THREE.MathUtils.lerp(CURVE_RADIUS_MAX, CURVE_RADIUS_MIN, curveAmount);
    const arcAngle = hubWidth / radius;
    const angle = (position[0] / hubWidth) * arcAngle;

    return [0, angle, 0];
  }, [position, curveAmount, hubWidth]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!disabled) {
      setPressed(true);
    }
  }, [disabled]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (pressed && !disabled) {
      onClick();
    }
    setPressed(false);
  }, [pressed, disabled, onClick]);

  const handlePointerEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
    }
  }, [disabled]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    setPressed(false);
  }, []);

  // Button colors
  const baseColor = active ? accentColor : '#2a2a3a';
  const hoverColor = active ? accentColor : '#3a3a4a';
  const currentColor = hovered ? hoverColor : baseColor;

  return (
    <animated.group
      ref={groupRef}
      position={curvedPosition}
      rotation={curvedRotation}
      scale={buttonScale}
    >
      {/* Button housing (the depression it sits in) */}
      <mesh position={[0, 0, -depth / 2 - 0.002]}>
        <cylinderGeometry args={[size / 2 + 0.004, size / 2 + 0.004, 0.006, 24]} />
        <meshStandardMaterial
          color="#151520"
          metalness={0.5}
          roughness={0.8}
        />
      </mesh>

      {/* The actual button */}
      <animated.mesh
        name={`vr-button-${label?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`}
        position-z={pressZ}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        pointerEventsType="all"
      >
        <cylinderGeometry args={[size / 2, size / 2, depth, 24]} />
        <animated.meshStandardMaterial
          color={currentColor}
          emissive={accentColor}
          emissiveIntensity={glowIntensity}
          metalness={0.4}
          roughness={0.5}
        />
      </animated.mesh>

      {/* Button top cap (slightly lighter) */}
      <animated.mesh position-z={pressZ.to((z) => z + depth / 2 + 0.001)}>
        <circleGeometry args={[size / 2 - 0.002, 24]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : '#e0e0e0'}
          metalness={0.2}
          roughness={0.4}
          transparent
          opacity={0.15}
        />
      </animated.mesh>

      {/* Icon */}
      <animated.group position-z={pressZ.to((z) => z + depth / 2 + 0.002)}>
        <Text
          fontSize={0.022}
          color={active || hovered ? '#ffffff' : '#c0c0c0'}
          anchorX="center"
          anchorY="middle"
        >
          {icon}
        </Text>
      </animated.group>

      {/* Label (below button) */}
      <Text
        position={[0, -size / 2 - 0.012, 0.01]}
        fontSize={0.008}
        color={active ? '#ffffff' : '#888888'}
        anchorX="center"
        anchorY="top"
      >
        {label}
      </Text>

      {/* Active indicator ring */}
      {active && (
        <mesh position={[0, 0, depth / 2 + 0.003]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size / 2 + 0.002, size / 2 + 0.005, 32]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.8} />
        </mesh>
      )}
    </animated.group>
  );
}

// ============================================================================
// Small Action Button (for undo/redo/etc)
// ============================================================================

interface ActionButton3DProps {
  position: [number, number, number];
  icon: string;
  tooltip: string;
  onClick: () => void;
  accentColor: string;
  primary?: boolean;
  curveAmount: number;
  hubWidth: number;
}

function ActionButton3D({
  position,
  icon,
  tooltip,
  onClick,
  accentColor,
  primary = false,
  curveAmount,
  hubWidth,
}: ActionButton3DProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const size = 0.032;
  const depth = 0.012;

  const { pressZ, glowIntensity } = useSpring({
    pressZ: pressed ? -0.005 : 0,
    glowIntensity: hovered ? 0.5 : primary ? 0.2 : 0,
    config: { tension: 500, friction: 25 },
  });

  // Calculate curved position
  const curvedPosition = useMemo((): [number, number, number] => {
    if (curveAmount < 0.01) {
      return position;
    }

    const radius = THREE.MathUtils.lerp(CURVE_RADIUS_MAX, CURVE_RADIUS_MIN, curveAmount);
    const arcAngle = hubWidth / radius;
    const angle = (position[0] / hubWidth) * arcAngle;

    const x = Math.sin(angle) * radius;
    const z = -(Math.cos(angle) * radius - radius) + position[2];

    return [x, position[1], z];
  }, [position, curveAmount, hubWidth]);

  const curvedRotation = useMemo((): [number, number, number] => {
    if (curveAmount < 0.01) {
      return [0, 0, 0];
    }

    const radius = THREE.MathUtils.lerp(CURVE_RADIUS_MAX, CURVE_RADIUS_MIN, curveAmount);
    const arcAngle = hubWidth / radius;
    const angle = (position[0] / hubWidth) * arcAngle;

    return [0, angle, 0];
  }, [position, curveAmount, hubWidth]);

  const baseColor = primary ? accentColor : '#252530';

  return (
    <group position={curvedPosition} rotation={curvedRotation}>
      {/* Button body */}
      <animated.mesh
        name={`vr-action-${tooltip?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`}
        position-z={pressZ}
        onPointerDown={(e) => {
          e.stopPropagation();
          setPressed(true);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (pressed) onClick();
          setPressed(false);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        pointerEventsType="all"
      >
        <RoundedBox args={[size, size, depth]} radius={0.005} smoothness={4}>
          <animated.meshStandardMaterial
            color={hovered ? '#3a3a4a' : baseColor}
            emissive={primary ? accentColor : '#6366f1'}
            emissiveIntensity={glowIntensity}
            metalness={0.4}
            roughness={0.5}
          />
        </RoundedBox>
      </animated.mesh>

      {/* Icon */}
      <animated.group position-z={pressZ.to((z) => z + depth / 2 + 0.002)}>
        <Text
          fontSize={0.016}
          color={hovered || primary ? '#ffffff' : '#a0a0a0'}
          anchorX="center"
          anchorY="middle"
        >
          {icon}
        </Text>
      </animated.group>
    </group>
  );
}

// ============================================================================
// Curve Slider Component
// ============================================================================

interface CurveSliderProps {
  value: number;
  onChange: (value: number) => void;
  position: [number, number, number];
  accentColor: string;
}

function CurveSlider({ value, onChange, position, accentColor }: CurveSliderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<THREE.Mesh>(null);

  const trackWidth = 0.1;
  const trackHeight = 0.012;
  const knobSize = 0.018;

  const knobX = (value - 0.5) * trackWidth;

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragging || !trackRef.current) return;

      // Get local position on track
      const localPoint = trackRef.current.worldToLocal(e.point.clone());
      const newValue = THREE.MathUtils.clamp((localPoint.x / trackWidth) + 0.5, 0, 1);
      onChange(newValue);
    },
    [dragging, onChange, trackWidth]
  );

  return (
    <group position={position}>
      {/* Label */}
      <Text
        position={[-trackWidth / 2 - 0.02, 0, 0.01]}
        fontSize={0.008}
        color="#888888"
        anchorX="right"
        anchorY="middle"
      >
        Curve
      </Text>

      {/* Track background */}
      <mesh
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
        pointerEventsType="all"
      >
        <RoundedBox args={[trackWidth, trackHeight, 0.006]} radius={0.003} smoothness={4}>
          <meshStandardMaterial color="#1a1a25" metalness={0.5} roughness={0.6} />
        </RoundedBox>
      </mesh>

      {/* Track fill */}
      <mesh position={[-(trackWidth / 2 - (value * trackWidth) / 2), 0, 0.001]}>
        <RoundedBox
          args={[value * trackWidth, trackHeight - 0.002, 0.005]}
          radius={0.002}
          smoothness={4}
        >
          <meshStandardMaterial
            color={accentColor}
            emissive={accentColor}
            emissiveIntensity={0.3}
            metalness={0.3}
            roughness={0.5}
          />
        </RoundedBox>
      </mesh>

      {/* Knob */}
      <mesh
        position={[knobX, 0, 0.008]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        pointerEventsType="all"
      >
        <sphereGeometry args={[knobSize / 2, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={accentColor}
          emissiveIntensity={dragging ? 0.5 : 0.2}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Min/Max icons */}
      <Text
        position={[-trackWidth / 2 - 0.008, -0.015, 0.01]}
        fontSize={0.007}
        color="#666666"
        anchorX="center"
      >
        ▬
      </Text>
      <Text
        position={[trackWidth / 2 + 0.008, -0.015, 0.01]}
        fontSize={0.007}
        color="#666666"
        anchorX="center"
      >
        ⌒
      </Text>
    </group>
  );
}

// ============================================================================
// Main VR Tool Hub Component
// ============================================================================

export function VRToolHub({
  activeTool: propActiveTool,
  onToolChange,
  onUndo,
  onRedo,
  onAddWidget,
  onSettings,
  initialCurve,
  accentColor: propAccentColor,
  visible = true,
  position: fixedPosition,
}: VRToolHubProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  // Use store for persistent state
  const {
    curveAmount,
    setCurveAmount,
    isPinned,
    togglePin,
    activeTool: storeActiveTool,
    setActiveTool: storeSetActiveTool,
    showSettings,
    toggleSettings,
    accentColor: storeAccentColor,
  } = useVRToolHubStore();

  // Allow props to override store (for controlled usage)
  const activeTool = propActiveTool ?? storeActiveTool;
  const accentColor = propAccentColor ?? storeAccentColor;

  const menuGesture = useMenuGesture('left');

  // Auto-show toolbar in VR mode - user can dismiss via pin toggle
  const [autoShow, setAutoShow] = useState(true);

  // Check for controller button press to toggle toolbar visibility
  const [showFromController, setShowFromController] = useState(false);

  // Detect controller input for toggling toolbar
  useEffect(() => {
    const session = gl.xr?.getSession?.();
    if (!session) return;

    let lastButtonState = false;

    const checkControllers = () => {
      for (const source of session.inputSources) {
        if (source.gamepad) {
          // Check for B/Y button (typically button 2 or 4) to toggle toolbar
          const buttons = source.gamepad.buttons;
          if (buttons.length > 2) {
            const menuPressed = buttons[2]?.pressed || buttons[4]?.pressed;
            // Toggle on button release (to avoid rapid toggling)
            if (!menuPressed && lastButtonState) {
              setShowFromController((prev) => !prev);
              setAutoShow(false); // User has interacted, disable auto-show
            }
            lastButtonState = menuPressed;
          }
        }
      }
    };

    const interval = setInterval(checkControllers, 50);
    return () => clearInterval(interval);
  }, [gl.xr]);

  // Haptic feedback helper
  const triggerHaptic = useCallback((intensity: number = 0.5, duration: number = 50) => {
    const session = gl.xr?.getSession?.();
    if (!session) return;

    for (const source of session.inputSources) {
      if (source.gamepad?.hapticActuators?.[0]) {
        source.gamepad.hapticActuators[0].pulse(intensity, duration);
      }
    }
  }, [gl.xr]);

  // Tools configuration
  const tools: { type: VRToolType; icon: string; label: string }[] = [
    { type: 'select', icon: '👆', label: 'Select' },
    { type: 'move', icon: '✋', label: 'Move' },
    { type: 'resize', icon: '⤡', label: 'Resize' },
    { type: 'rotate', icon: '↻', label: 'Rotate' },
    { type: 'draw', icon: '✏️', label: 'Draw' },
    { type: 'widget', icon: '⊞', label: 'Widget' },
  ];

  const handleToolSelect = useCallback(
    (tool: VRToolType) => {
      triggerHaptic(0.3, 30);
      storeSetActiveTool(tool);
      onToolChange?.(tool);
    },
    [onToolChange, storeSetActiveTool, triggerHaptic]
  );

  const handlePinToggle = useCallback(() => {
    triggerHaptic(0.2, 20);
    togglePin();
  }, [togglePin, triggerHaptic]);

  const handleSettingsToggle = useCallback(() => {
    triggerHaptic(0.2, 20);
    toggleSettings();
  }, [toggleSettings, triggerHaptic]);

  // Calculate positions for tool buttons
  const toolButtonPositions = useMemo(() => {
    const startX = -((tools.length - 1) * (BUTTON_SIZE + BUTTON_GAP)) / 2;
    return tools.map((_, i) => [
      startX + i * (BUTTON_SIZE + BUTTON_GAP),
      0.025,
      HUB_DEPTH / 2 + BUTTON_DEPTH / 2 + 0.003,
    ] as [number, number, number]);
  }, [tools.length]);

  // Action button positions
  const actionButtonPositions: [number, number, number][] = [
    [-0.09, -0.045, HUB_DEPTH / 2 + 0.008],
    [-0.045, -0.045, HUB_DEPTH / 2 + 0.008],
    [0, -0.045, HUB_DEPTH / 2 + 0.008],
    [0.045, -0.045, HUB_DEPTH / 2 + 0.008],
    [0.09, -0.045, HUB_DEPTH / 2 + 0.008],
  ];

  // Show/hide logic - show when:
  // 1. Pinned by user
  // 2. Hand gesture detected (palm up)
  // 3. Toggled via controller button
  // 4. Auto-show on VR entry (until user interacts)
  const shouldShow = visible && (
    isPinned ||
    menuGesture.isMenuGesture ||
    showFromController ||
    autoShow  // Show by default on VR entry
  );

  // Animate visibility
  const { opacity, scale } = useSpring({
    opacity: shouldShow ? 1 : 0,
    scale: shouldShow ? 1 : 0.8,
    config: { tension: 300, friction: 25 },
  });

  // Position - follow hand or fixed
  const hubPosition = useMemo(() => {
    if (fixedPosition) return fixedPosition;
    if (isPinned) return undefined; // Keep last position
    if (menuGesture.isMenuGesture) {
      return [
        menuGesture.palmPosition.x,
        menuGesture.palmPosition.y + 0.15,
        menuGesture.palmPosition.z,
      ] as [number, number, number];
    }
    return [0, 1.4, -0.5] as [number, number, number];
  }, [fixedPosition, isPinned, menuGesture]);

  // Combined useFrame for position following and camera facing
  // IMPORTANT: This must be BEFORE any conditional returns (React hooks rule)
  useFrame((state) => {
    if (!groupRef.current) return;

    // Update position when following hand gesture
    if (!isPinned && !fixedPosition && menuGesture.isMenuGesture) {
      groupRef.current.position.lerp(
        new THREE.Vector3(
          menuGesture.palmPosition.x,
          menuGesture.palmPosition.y + 0.15,
          menuGesture.palmPosition.z
        ),
        0.15
      );
    }

    // Make the toolbar face the camera (billboard behavior)
    const cameraPos = state.camera.position;
    const groupPos = groupRef.current.position;

    // Calculate direction from toolbar to camera (only Y rotation to keep upright)
    const direction = new THREE.Vector3(
      cameraPos.x - groupPos.x,
      0, // Keep Y level
      cameraPos.z - groupPos.z
    ).normalize();

    // Calculate the angle to face the camera
    const angle = Math.atan2(direction.x, direction.z);
    groupRef.current.rotation.y = angle;
  });

  // Early return if not visible (AFTER all hooks)
  if (!shouldShow && opacity.get() < 0.01) {
    return null;
  }

  return (
    <animated.group
      ref={groupRef}
      position={hubPosition}
      scale={scale}
    >
      {/* Main backplate */}
      <CurvedBackplate
        width={HUB_WIDTH}
        height={HUB_HEIGHT}
        depth={HUB_DEPTH}
        curveAmount={curveAmount}
        color="#1a1a25"
        emissive={accentColor}
        emissiveIntensity={0.02}
      />

      {/* Rim light effect */}
      <mesh position={[0, 0, -HUB_DEPTH / 2 - 0.001]}>
        <RoundedBox
          args={[HUB_WIDTH + 0.006, HUB_HEIGHT + 0.006, 0.002]}
          radius={0.015}
          smoothness={4}
        >
          <meshBasicMaterial
            color={accentColor}
            transparent
            opacity={0.15}
          />
        </RoundedBox>
      </mesh>

      {/* Tool buttons */}
      {tools.map((tool, i) => (
        <Button3D
          key={tool.type}
          position={toolButtonPositions[i]}
          icon={tool.icon}
          label={tool.label}
          active={activeTool === tool.type}
          accentColor={accentColor}
          onClick={() => handleToolSelect(tool.type)}
          curveAmount={curveAmount}
          buttonIndex={i}
          totalButtons={tools.length}
          hubWidth={HUB_WIDTH}
        />
      ))}

      {/* Divider line */}
      <mesh position={[0, -0.012, HUB_DEPTH / 2 + 0.001]}>
        <planeGeometry args={[HUB_WIDTH - 0.04, 0.001]} />
        <meshBasicMaterial color="#333340" transparent opacity={0.5} />
      </mesh>

      {/* Action buttons row */}
      <ActionButton3D
        position={actionButtonPositions[0]}
        icon="↩"
        tooltip="Undo"
        onClick={() => onUndo?.()}
        accentColor={accentColor}
        curveAmount={curveAmount}
        hubWidth={HUB_WIDTH}
      />
      <ActionButton3D
        position={actionButtonPositions[1]}
        icon="↪"
        tooltip="Redo"
        onClick={() => onRedo?.()}
        accentColor={accentColor}
        curveAmount={curveAmount}
        hubWidth={HUB_WIDTH}
      />
      <ActionButton3D
        position={actionButtonPositions[2]}
        icon="+"
        tooltip="Add Widget"
        onClick={() => onAddWidget?.()}
        accentColor={accentColor}
        primary
        curveAmount={curveAmount}
        hubWidth={HUB_WIDTH}
      />
      <ActionButton3D
        position={actionButtonPositions[3]}
        icon="⚙"
        tooltip="Settings"
        onClick={handleSettingsToggle}
        accentColor={accentColor}
        curveAmount={curveAmount}
        hubWidth={HUB_WIDTH}
      />
      <ActionButton3D
        position={actionButtonPositions[4]}
        icon={isPinned ? '📍' : '📌'}
        tooltip={isPinned ? 'Unpin' : 'Pin'}
        onClick={handlePinToggle}
        accentColor={accentColor}
        curveAmount={curveAmount}
        hubWidth={HUB_WIDTH}
      />

      {/* Settings panel (expandable) */}
      {showSettings && (
        <group position={[0, -HUB_HEIGHT / 2 - 0.05, 0]}>
          {/* Settings backplate */}
          <CurvedBackplate
            width={HUB_WIDTH * 0.8}
            height={0.05}
            depth={HUB_DEPTH * 0.8}
            curveAmount={curveAmount * 0.5}
            color="#151520"
            emissive={accentColor}
            emissiveIntensity={0.01}
          />

          {/* Curve slider */}
          <CurveSlider
            value={curveAmount}
            onChange={setCurveAmount}
            position={[0.03, 0, HUB_DEPTH / 2 + 0.005]}
            accentColor={accentColor}
          />
        </group>
      )}

      {/* Ambient point light for depth */}
      <pointLight
        position={[0, 0, 0.1]}
        intensity={0.1}
        distance={0.3}
        color={accentColor}
      />
    </animated.group>
  );
}

export default VRToolHub;
