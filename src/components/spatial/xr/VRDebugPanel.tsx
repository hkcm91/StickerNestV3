/**
 * StickerNest - VR Debug Panel
 *
 * Shows debug logs directly in VR space so you can see what's happening
 * without needing browser dev tools on your headset.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useXR } from '@react-three/xr';

interface LogEntry {
  id: number;
  type: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

const MAX_LOGS = 12;
let logId = 0;

// Global log storage
const logEntries: LogEntry[] = [];
const listeners: Set<() => void> = new Set();

function addLog(type: LogEntry['type'], message: string) {
  logEntries.unshift({
    id: logId++,
    type,
    message: message.substring(0, 80), // Truncate long messages
    timestamp: Date.now(),
  });

  // Keep only recent logs
  while (logEntries.length > MAX_LOGS) {
    logEntries.pop();
  }

  // Notify listeners
  listeners.forEach(fn => fn());
}

// Override console methods to capture logs
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

let isHooked = false;

function hookConsole() {
  if (isHooked) return;
  isHooked = true;

  console.log = (...args) => {
    originalConsole.log(...args);
    addLog('log', args.map(a => String(a)).join(' '));
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    addLog('warn', args.map(a => String(a)).join(' '));
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    addLog('error', args.map(a => String(a)).join(' '));
  };

  console.info = (...args) => {
    originalConsole.info(...args);
    addLog('info', args.map(a => String(a)).join(' '));
  };
}

function useLogEntries() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const update = () => forceUpdate({});
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  return logEntries;
}

interface VRDebugPanelProps {
  /** Whether to show the debug panel */
  enabled?: boolean;
  /** Position in 3D space */
  position?: [number, number, number];
}

export function VRDebugPanel({
  enabled = true,
  position = [-1.5, 1.6, -1.5],
}: VRDebugPanelProps) {
  const session = useXR((s) => s.session);
  const logs = useLogEntries();

  // Hook console when component mounts
  useEffect(() => {
    if (enabled) {
      hookConsole();
      addLog('info', 'VR Debug Panel active');
    }
  }, [enabled]);

  // Only show in VR and when enabled
  if (!session || !enabled) return null;

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#ffffff';
    }
  };

  return (
    <group position={position} rotation={[0, Math.PI / 6, 0]}>
      {/* Background panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.8, 0.6]} />
        <meshBasicMaterial color="#0a0a0f" transparent opacity={0.95} />
      </mesh>

      {/* Border */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[0.82, 0.62]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.5} />
      </mesh>

      {/* Title */}
      <Text
        position={[0, 0.25, 0]}
        fontSize={0.03}
        color="#8b5cf6"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        Debug Console
      </Text>

      {/* Log entries */}
      {logs.map((log, index) => (
        <Text
          key={log.id}
          position={[0, 0.18 - index * 0.035, 0]}
          fontSize={0.018}
          color={getColor(log.type)}
          anchorX="center"
          anchorY="middle"
          maxWidth={0.75}
          font={undefined}
        >
          {log.message}
        </Text>
      ))}

      {logs.length === 0 && (
        <Text
          position={[0, 0, 0]}
          fontSize={0.02}
          color="#666"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          No logs yet...
        </Text>
      )}
    </group>
  );
}

// Export function to manually add debug messages
export function vrLog(message: string) {
  addLog('log', message);
}

export function vrWarn(message: string) {
  addLog('warn', message);
}

export function vrError(message: string) {
  addLog('error', message);
}

export default VRDebugPanel;
