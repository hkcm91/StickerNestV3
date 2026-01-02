/**
 * AmbientEnvironment - Visual elements that make VR space feel alive
 *
 * Adds depth and atmosphere to the VR environment without cluttering workspace:
 * - Floating particles (dust motes drifting through space)
 * - Nebula clouds (soft colorful volumes in the distance)
 * - Distant geometric structures (abstract shapes for spatial reference)
 * - Enhanced aurora/ribbon effects
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSpatialModeStore, useActiveSpatialMode } from '../../state/useSpatialModeStore';

// ============================================================================
// Floating Particles - Dust motes that drift slowly through space
// ============================================================================

interface FloatingParticlesProps {
  count?: number;
  radius?: number;
  particleSize?: number;
  color?: string;
  speed?: number;
}

function FloatingParticles({
  count = 200,
  radius = 25,
  particleSize = 0.03,
  color = '#8b5cf6',
  speed = 0.1,
}: FloatingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>();

  const { positions, opacities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute particles in a sphere around the user
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * radius; // Keep away from center

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 1 + r * Math.cos(phi) * 0.5; // Compressed vertically, offset up
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Random opacity for depth variation
      opacities[i] = 0.2 + Math.random() * 0.6;

      // Slow drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed * 0.3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;
    }

    velocitiesRef.current = velocities;
    return { positions, opacities };
  }, [count, radius, speed]);

  // Animate particles
  useFrame((_, delta) => {
    if (!pointsRef.current || !velocitiesRef.current) return;

    const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const velocities = velocitiesRef.current;

    for (let i = 0; i < count; i++) {
      // Update positions
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Wrap around if too far
      const dist = Math.sqrt(
        positions[i * 3] ** 2 +
        positions[i * 3 + 2] ** 2
      );

      if (dist > radius + 5) {
        // Respawn closer
        const theta = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 5;
        positions[i * 3] = r * Math.cos(theta);
        positions[i * 3 + 2] = r * Math.sin(theta);
      }
    }

    posAttr.needsUpdate = true;
  });

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Soft circular gradient
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-opacity"
          array={opacities}
          count={count}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        color={color}
        transparent
        opacity={0.6}
        map={texture}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================================================
// Nebula Clouds - Soft volumetric clouds in the distance
// ============================================================================

interface NebulaCloudProps {
  position: [number, number, number];
  scale?: number;
  color?: string;
  opacity?: number;
  rotationSpeed?: number;
}

function NebulaCloud({
  position,
  scale = 1,
  color = '#6366f1',
  opacity = 0.15,
  rotationSpeed = 0.02,
}: NebulaCloudProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
    meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });

  const cloudMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec2 vUv;

        void main() {
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;

        varying vec3 vPosition;
        varying vec2 vUv;

        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          // Create cloud-like pattern
          vec3 pos = vPosition * 0.5;

          float n1 = snoise(pos * 2.0) * 0.5 + 0.5;
          float n2 = snoise(pos * 4.0) * 0.25 + 0.25;
          float n3 = snoise(pos * 8.0) * 0.125 + 0.125;

          float cloud = n1 + n2 + n3;
          cloud = smoothstep(0.3, 0.8, cloud);

          // Fade at edges (sphere falloff)
          float dist = length(vPosition);
          float falloff = 1.0 - smoothstep(0.0, 1.0, dist);

          float alpha = cloud * falloff * uOpacity;

          // Color variation
          vec3 finalColor = uColor * (0.8 + n1 * 0.4);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
  }, [color, opacity]);

  // Update time uniform
  useFrame((state) => {
    cloudMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={cloudMaterial} attach="material" />
    </mesh>
  );
}

// ============================================================================
// Distant Structures - Abstract geometric shapes for spatial reference
// ============================================================================

interface DistantStructuresProps {
  count?: number;
  minDistance?: number;
  maxDistance?: number;
}

function DistantStructures({
  count = 8,
  minDistance = 30,
  maxDistance = 45,
}: DistantStructuresProps) {
  const groupRef = useRef<THREE.Group>(null);

  const structures = useMemo(() => {
    const items: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      type: 'octahedron' | 'tetrahedron' | 'icosahedron' | 'torus';
      color: string;
      rotationSpeed: [number, number, number];
    }> = [];

    const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#4f46e5', '#7c3aed'];
    const types: Array<'octahedron' | 'tetrahedron' | 'icosahedron' | 'torus'> = [
      'octahedron', 'tetrahedron', 'icosahedron', 'torus'
    ];

    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const height = 5 + Math.random() * 20;

      items.push({
        position: [
          Math.cos(theta) * distance,
          height,
          Math.sin(theta) * distance,
        ],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
        scale: 1.5 + Math.random() * 2.5,
        type: types[Math.floor(Math.random() * types.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        rotationSpeed: [
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
        ],
      });
    }

    return items;
  }, [count, minDistance, maxDistance]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      const structure = structures[i];
      if (structure && child instanceof THREE.Mesh) {
        child.rotation.x += structure.rotationSpeed[0] * delta;
        child.rotation.y += structure.rotationSpeed[1] * delta;
        child.rotation.z += structure.rotationSpeed[2] * delta;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {structures.map((structure, i) => (
        <mesh
          key={i}
          position={structure.position}
          rotation={structure.rotation}
          scale={structure.scale}
        >
          {structure.type === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
          {structure.type === 'tetrahedron' && <tetrahedronGeometry args={[1, 0]} />}
          {structure.type === 'icosahedron' && <icosahedronGeometry args={[1, 0]} />}
          {structure.type === 'torus' && <torusGeometry args={[1, 0.3, 8, 16]} />}
          <meshBasicMaterial
            color={structure.color}
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// Aurora Effect - Flowing light ribbons
// ============================================================================

function AuroraRibbons() {
  const meshRef = useRef<THREE.Mesh>(null);

  const auroraMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#6366f1') },
        uColor2: { value: new THREE.Color('#8b5cf6') },
        uColor3: { value: new THREE.Color('#06b6d4') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;

        void main() {
          vUv = uv;
          vPosition = position;

          // Wave displacement
          vec3 pos = position;
          float wave = sin(pos.x * 0.5 + uTime * 0.3) * 2.0;
          wave += sin(pos.x * 0.3 + uTime * 0.2) * 1.5;
          pos.y += wave;
          pos.z += sin(pos.x * 0.4 + uTime * 0.25) * 1.0;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Color gradient along ribbon
          float t = vUv.x;
          vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 0.5, t));
          color = mix(color, uColor3, smoothstep(0.5, 1.0, t));

          // Fade at edges
          float edgeFade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
          float endFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

          // Shimmer effect
          float shimmer = sin(vUv.x * 20.0 + uTime * 2.0) * 0.5 + 0.5;
          shimmer = shimmer * 0.3 + 0.7;

          float alpha = edgeFade * endFade * shimmer * 0.25;

          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    auroraMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group position={[0, 25, -20]} rotation={[0.3, 0, 0]}>
      {/* Multiple ribbon layers */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={i === 0 ? meshRef : undefined}
          position={[0, i * 2, i * -3]}
          rotation={[0, i * 0.2, 0]}
        >
          <planeGeometry args={[60, 4, 64, 1]} />
          <primitive object={auroraMaterial.clone()} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// Orbital Rings - Distant ring structures
// ============================================================================

function OrbitalRings() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <group ref={groupRef} position={[0, 15, 0]}>
      {/* Large outer ring */}
      <mesh rotation={[Math.PI * 0.1, 0, Math.PI * 0.05]}>
        <torusGeometry args={[40, 0.1, 8, 128]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.2} />
      </mesh>

      {/* Medium ring */}
      <mesh rotation={[Math.PI * -0.15, Math.PI * 0.3, 0]}>
        <torusGeometry args={[35, 0.08, 8, 128]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.15} />
      </mesh>

      {/* Inner ring */}
      <mesh rotation={[Math.PI * 0.2, Math.PI * -0.2, Math.PI * 0.1]}>
        <torusGeometry args={[30, 0.06, 8, 128]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main Ambient Environment Component
// ============================================================================

export interface AmbientEnvironmentProps {
  /** Show floating particles */
  particles?: boolean;
  /** Number of particles */
  particleCount?: number;
  /** Show nebula clouds */
  nebulae?: boolean;
  /** Show distant geometric structures */
  structures?: boolean;
  /** Show aurora ribbons */
  aurora?: boolean;
  /** Show orbital rings */
  rings?: boolean;
  /** Overall intensity (0-1) affects opacity of all elements */
  intensity?: number;
}

export function AmbientEnvironment({
  particles = true,
  particleCount = 150,
  nebulae = true,
  structures = true,
  aurora = true,
  rings = true,
  intensity = 1.0,
}: AmbientEnvironmentProps) {
  const spatialMode = useActiveSpatialMode();
  const sessionState = useSpatialModeStore((s) => s.sessionState);
  const targetMode = useSpatialModeStore((s) => s.targetMode);

  // Don't show ambient environment in AR mode (real world)
  const isARMode = spatialMode === 'ar' ||
    (sessionState === 'requesting' && targetMode === 'ar');

  if (isARMode) return null;

  // Only show in VR mode or when 3D canvas is active
  const shouldShow = spatialMode === 'vr' ||
    spatialMode === 'desktop' ||
    sessionState === 'active';

  if (!shouldShow) return null;

  return (
    <group name="ambient-environment">
      {/* Floating dust particles */}
      {particles && (
        <FloatingParticles
          count={particleCount}
          radius={25}
          particleSize={0.04}
          color="#a78bfa"
          speed={0.15}
        />
      )}

      {/* Nebula clouds in the distance */}
      {nebulae && (
        <>
          <NebulaCloud
            position={[-25, 12, -30]}
            scale={8}
            color="#6366f1"
            opacity={0.12 * intensity}
          />
          <NebulaCloud
            position={[30, 18, -25]}
            scale={6}
            color="#8b5cf6"
            opacity={0.1 * intensity}
          />
          <NebulaCloud
            position={[0, 25, -35]}
            scale={10}
            color="#4f46e5"
            opacity={0.08 * intensity}
          />
          <NebulaCloud
            position={[-35, 8, 10]}
            scale={5}
            color="#a855f7"
            opacity={0.1 * intensity}
          />
        </>
      )}

      {/* Distant geometric structures */}
      {structures && (
        <DistantStructures
          count={10}
          minDistance={35}
          maxDistance={45}
        />
      )}

      {/* Aurora ribbons in the sky */}
      {aurora && <AuroraRibbons />}

      {/* Orbital rings */}
      {rings && <OrbitalRings />}
    </group>
  );
}

export default AmbientEnvironment;
