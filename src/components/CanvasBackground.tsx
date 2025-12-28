/**
 * StickerNest v2 - Canvas Background
 * Renders various background types for the canvas:
 * - Color/gradient
 * - Image
 * - Video
 * - 3D (Three.js)
 * - Vector (SVG)
 * - Audio visualizer
 * - Shader (WebGL)
 * - Widget (iframe)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import type { CanvasBackground as CanvasBackgroundConfig, CanvasVisualizerConfig } from '../types/domain';
import { ParallaxBackground } from './ParallaxBackground';

interface CanvasBackgroundProps {
  config: CanvasBackgroundConfig;
  width: number;
  height: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Main Canvas Background component
 * Renders the appropriate background based on config type
 */
export const CanvasBackground: React.FC<CanvasBackgroundProps> = ({
  config,
  width,
  height,
  onLoad,
  onError,
}) => {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    opacity: config.opacity ?? 1,
    mixBlendMode: (config.blendMode ?? 'normal') as any,
    pointerEvents: config.interactive ? 'auto' : 'none',
    zIndex: 0,
  };

  switch (config.type) {
    case 'color':
      return <ColorBackground config={config} style={containerStyle} />;
    case 'image':
      return <ImageBackground config={config} style={containerStyle} onLoad={onLoad} onError={onError} />;
    case 'video':
      return <VideoBackground config={config} style={containerStyle} onLoad={onLoad} onError={onError} />;
    case '3d':
      return <ThreeDBackground config={config} style={containerStyle} width={width} height={height} onLoad={onLoad} onError={onError} />;
    case 'vector':
      return <VectorBackground config={config} style={containerStyle} onLoad={onLoad} />;
    case 'visualizer':
      return <VisualizerBackground config={config} style={containerStyle} width={width} height={height} />;
    case 'shader':
      return <ShaderBackground config={config} style={containerStyle} width={width} height={height} />;
    case 'widget':
      return <WidgetBackground config={config} style={containerStyle} />;
    case 'parallax':
      if (!config.parallaxConfig) return null;
      return (
        <ParallaxBackground
          config={config.parallaxConfig}
          style={{
            ...containerStyle,
            background: 'transparent',
          }}
          width={width}
          height={height}
        />
      );
    default:
      return null;
  }
};

// ============================================
// Color Background
// ============================================
interface ColorBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
}

const ColorBackground: React.FC<ColorBackgroundProps> = ({ config, style }) => {
  return (
    <div
      style={{
        ...style,
        background: config.color || '#1a1a2e',
      }}
    />
  );
};

// ============================================
// Image Background
// ============================================
interface ImageBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const ImageBackground: React.FC<ImageBackgroundProps> = ({ config, style, onLoad, onError }) => {
  return (
    <div style={style}>
      <img
        src={config.src}
        alt="Canvas background"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onLoad={onLoad}
        onError={(e) => onError?.(new Error(`Failed to load image: ${config.src}`))}
      />
    </div>
  );
};

// ============================================
// Video Background
// ============================================
interface VideoBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const VideoBackground: React.FC<VideoBackgroundProps> = ({ config, style, onLoad, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked - that's okay
      });
    }
  }, [config.src]);

  return (
    <div style={style}>
      <video
        ref={videoRef}
        src={config.src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        autoPlay
        loop
        muted
        playsInline
        onLoadedData={onLoad}
        onError={(e) => onError?.(new Error(`Failed to load video: ${config.src}`))}
      />
    </div>
  );
};

// ============================================
// 3D Background (Three.js)
// ============================================
interface ThreeDBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  width: number;
  height: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const ThreeDBackground: React.FC<ThreeDBackgroundProps> = ({ config, style, width, height, onLoad, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !config.scene3d) return;

    let cleanup: (() => void) | null = null;

    // Dynamic import Three.js to avoid bundling if not used
    const init3DScene = async () => {
      try {
        // @ts-ignore - three.js is optional
        const THREE = await import('three').catch(() => null);
        if (!THREE) {
          console.warn('[CanvasBackground] Three.js not installed. Run: npm install three');
          onError?.(new Error('Three.js not installed'));
          return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        });

        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current?.appendChild(renderer.domElement);

        // Set camera position
        const camPos = config.scene3d?.cameraPosition || { x: 0, y: 0, z: 5 };
        camera.position.set(camPos.x, camPos.y, camPos.z);

        const camTarget = config.scene3d?.cameraTarget || { x: 0, y: 0, z: 0 };
        camera.lookAt(camTarget.x, camTarget.y, camTarget.z);

        // Add ambient light
        const ambientColor = config.scene3d?.ambientLight || '#ffffff';
        const ambientLight = new THREE.AmbientLight(ambientColor, 0.5);
        scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Create scene based on preset
        const preset = config.scene3d?.preset || 'particles';

        if (preset === 'particles') {
          // Particle system
          const particleCount = 1000;
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(particleCount * 3);

          for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 20;
            positions[i + 1] = (Math.random() - 0.5) * 20;
            positions[i + 2] = (Math.random() - 0.5) * 20;
          }

          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const material = new THREE.PointsMaterial({
            color: 0x8b5cf6,
            size: 0.05,
            transparent: true,
            opacity: 0.8,
          });
          const particles = new THREE.Points(geometry, material);
          scene.add(particles);
        } else if (preset === 'skybox') {
          // Simple gradient skybox
          scene.background = new THREE.Color(0x1a1a2e);
        } else if (preset === 'terrain') {
          // Simple terrain plane
          const planeGeometry = new THREE.PlaneGeometry(20, 20, 50, 50);
          const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d2d44,
            wireframe: true,
          });
          const plane = new THREE.Mesh(planeGeometry, planeMaterial);
          plane.rotation.x = -Math.PI / 2;
          plane.position.y = -2;
          scene.add(plane);
        }

        // Animation loop
        const animate = () => {
          const animationId = requestAnimationFrame(animate);

          if (config.scene3d?.animation?.autoRotate) {
            const speed = config.scene3d.animation.rotateSpeed || 0.001;
            scene.rotation.y += speed;
          }

          renderer.render(scene, camera);

          cleanup = () => {
            cancelAnimationFrame(animationId);
            renderer.dispose();
            containerRef.current?.removeChild(renderer.domElement);
          };
        };

        animate();
        setIsLoaded(true);
        onLoad?.();
      } catch (err) {
        console.error('[CanvasBackground] Failed to initialize 3D scene:', err);
        onError?.(err as Error);
      }
    };

    init3DScene();

    return () => {
      cleanup?.();
    };
  }, [config.scene3d, width, height, onLoad, onError]);

  return (
    <div ref={containerRef} style={style}>
      {!isLoaded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666',
        }}>
          Loading 3D scene...
        </div>
      )}
    </div>
  );
};

// ============================================
// Vector Background (SVG)
// ============================================
interface VectorBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  onLoad?: () => void;
}

/**
 * Sanitize SVG content to prevent XSS attacks.
 * Uses DOMPurify with SVG-specific configuration.
 */
const sanitizeSvg = (svg: string): string => {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // Allow SVG-specific elements
    ADD_TAGS: ['use', 'image', 'feGaussianBlur', 'feColorMatrix', 'feComposite', 'feMerge', 'feMergeNode'],
    // Remove potentially dangerous attributes
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    // Remove script elements entirely
    FORBID_TAGS: ['script', 'style'],
  });
};

const VectorBackground: React.FC<VectorBackgroundProps> = ({ config, style, onLoad }) => {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    if (!config.vectorContent) return;

    // Check if it's a URL or inline SVG
    if (config.vectorContent.startsWith('http') || config.vectorContent.startsWith('/')) {
      // Fetch SVG from URL
      fetch(config.vectorContent)
        .then(res => res.text())
        .then(svg => {
          // Sanitize SVG content to prevent XSS
          const sanitized = sanitizeSvg(svg);
          setSvgContent(sanitized);
          onLoad?.();
        })
        .catch(console.error);
    } else {
      // Inline SVG - also sanitize
      const sanitized = sanitizeSvg(config.vectorContent);
      setSvgContent(sanitized);
      onLoad?.();
    }
  }, [config.vectorContent, onLoad]);

  if (!svgContent) return <div style={style} />;

  return (
    <div
      style={style}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// ============================================
// Audio Visualizer Background
// ============================================
interface VisualizerBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  width: number;
  height: number;
}

const VisualizerBackground: React.FC<VisualizerBackgroundProps> = ({ config, style, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !config.visualizerConfig) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vizConfig = config.visualizerConfig;
    let audioContext: AudioContext | null = null;
    let analyzer: AnalyserNode | null = null;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    const initAudio = async () => {
      try {
        audioContext = new AudioContext();
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzerRef.current = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

        // Connect to audio source based on config
        if (vizConfig.audioSource === 'microphone') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyzer);
        } else if (vizConfig.audioSource === 'element' && vizConfig.audioSourceId) {
          const audioEl = document.getElementById(vizConfig.audioSourceId) as HTMLAudioElement;
          if (audioEl) {
            const source = audioContext.createMediaElementSource(audioEl);
            source.connect(analyzer);
            analyzer.connect(audioContext.destination);
          }
        }

        // Start visualization
        const colors = vizConfig.colors || ['#8b5cf6', '#6366f1', '#3b82f6'];
        const sensitivity = vizConfig.sensitivity ?? 1;
        const smoothing = vizConfig.smoothing ?? 0.8;
        analyzer.smoothingTimeConstant = smoothing;

        const draw = () => {
          animationRef.current = requestAnimationFrame(draw);
          if (!analyzer || !dataArray) return;

          analyzer.getByteFrequencyData(dataArray);

          ctx.fillStyle = 'rgba(26, 26, 46, 0.2)';
          ctx.fillRect(0, 0, width, height);

          if (vizConfig.type === 'bars') {
            const barWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * height * sensitivity;
              const colorIndex = Math.floor((i / bufferLength) * colors.length);
              ctx.fillStyle = colors[colorIndex % colors.length];
              ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
              x += barWidth;
            }
          } else if (vizConfig.type === 'waveform') {
            ctx.lineWidth = 2;
            ctx.strokeStyle = colors[0];
            ctx.beginPath();

            const sliceWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const v = dataArray[i] / 128.0 * sensitivity;
              const y = (v * height) / 2;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.lineTo(width, height / 2);
            ctx.stroke();
          } else if (vizConfig.type === 'circular') {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 4;

            ctx.beginPath();
            for (let i = 0; i < bufferLength; i++) {
              const amplitude = (dataArray[i] / 255) * radius * sensitivity;
              const angle = (i / bufferLength) * Math.PI * 2;
              const x = centerX + Math.cos(angle) * (radius + amplitude);
              const y = centerY + Math.sin(angle) * (radius + amplitude);

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.strokeStyle = colors[0];
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        };

        draw();
      } catch (err) {
        console.error('[CanvasBackground] Failed to initialize audio visualizer:', err);
      }
    };

    initAudio();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioContext?.close();
    };
  }, [config.visualizerConfig, width, height]);

  return (
    <div style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// ============================================
// Shader Background (WebGL)
// ============================================
interface ShaderBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
  width: number;
  height: number;
}

const ShaderBackground: React.FC<ShaderBackgroundProps> = ({ config, style, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || !config.shaderCode) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('[CanvasBackground] WebGL not supported');
      return;
    }

    // Default vertex shader
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader from config (with default uniforms)
    const fragmentShaderSource = `
      precision mediump float;
      uniform float time;
      uniform vec2 resolution;
      ${config.shaderCode}
    `;

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('[CanvasBackground] Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
      return;
    }

    // Create program
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');

    const startTime = Date.now();

    // Render loop
    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(timeLocation, (Date.now() - startTime) / 1000);
      gl.uniform2f(resolutionLocation, width, height);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [config.shaderCode, width, height]);

  return (
    <div style={style}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// ============================================
// Widget Background (iframe)
// ============================================
interface WidgetBackgroundProps {
  config: CanvasBackgroundConfig;
  style: React.CSSProperties;
}

const WidgetBackground: React.FC<WidgetBackgroundProps> = ({ config, style }) => {
  // This would integrate with the widget sandbox system
  // For now, it's a placeholder that will be connected to WidgetSandboxHost
  return (
    <div style={style}>
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#666',
        fontSize: 14,
      }}>
        Widget Background: {config.widgetId || 'No widget selected'}
      </div>
    </div>
  );
};

export default CanvasBackground;
