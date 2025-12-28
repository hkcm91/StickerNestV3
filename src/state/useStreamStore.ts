/**
 * StickerNest v2 - Stream Store (Zustand)
 * Global state management for streaming connections (OBS, Twitch, YouTube)
 * Provides connection status, stream metrics, and scene management
 */

import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';

// ==================
// Types
// ==================

/** OBS connection state */
export interface OBSConnection {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  host: string;
  port: number;
  password?: string;
  error?: string;
  lastConnected?: string;
}

/** Twitch connection state */
export interface TwitchConnection {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  channelName?: string;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  error?: string;
}

/** YouTube connection state */
export interface YouTubeConnection {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  channelId?: string;
  liveChatId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  error?: string;
}

/** Stream state across platforms */
export type StreamStatus = 'offline' | 'starting' | 'live' | 'stopping';

/** OBS scene */
export interface OBSScene {
  name: string;
  index: number;
}

/** OBS source */
export interface OBSSource {
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
}

/** Stream metrics */
export interface StreamMetrics {
  /** Current viewer count */
  viewers: number;
  /** Peak viewers this session */
  peakViewers: number;
  /** Stream bitrate in kbps */
  bitrate: number;
  /** Dropped frames count */
  droppedFrames: number;
  /** Total frames */
  totalFrames: number;
  /** CPU usage percentage (OBS) */
  cpuUsage: number;
  /** Memory usage in MB (OBS) */
  memoryUsage: number;
  /** Stream duration in seconds */
  streamDuration: number;
  /** Recording duration in seconds */
  recordingDuration: number;
}

// ==================
// Store State
// ==================

export interface StreamState {
  // Connection states
  obs: OBSConnection;
  twitch: TwitchConnection;
  youtube: YouTubeConnection;

  // Stream status
  streamStatus: StreamStatus;
  isRecording: boolean;

  // OBS scenes and sources
  scenes: OBSScene[];
  currentScene: string | null;
  sources: Map<string, OBSSource[]>; // scene name -> sources

  // Stream metrics
  metrics: StreamMetrics;

  // Settings
  autoReconnect: boolean;
  reconnectInterval: number; // ms
}

// ==================
// Store Actions
// ==================

export interface StreamActions {
  // OBS connection
  setOBSConnection: (connection: Partial<OBSConnection>) => void;
  connectOBS: (host: string, port: number, password?: string) => void;
  disconnectOBS: () => void;

  // Twitch connection
  setTwitchConnection: (connection: Partial<TwitchConnection>) => void;
  connectTwitch: (accessToken: string, refreshToken?: string) => void;
  disconnectTwitch: () => void;

  // YouTube connection
  setYouTubeConnection: (connection: Partial<YouTubeConnection>) => void;
  connectYouTube: (accessToken: string, refreshToken?: string) => void;
  disconnectYouTube: () => void;

  // Stream status
  setStreamStatus: (status: StreamStatus) => void;
  setRecording: (isRecording: boolean) => void;

  // OBS scenes
  setScenes: (scenes: OBSScene[]) => void;
  setCurrentScene: (sceneName: string | null) => void;
  setSources: (sceneName: string, sources: OBSSource[]) => void;
  setSourceVisibility: (sceneName: string, sourceName: string, visible: boolean) => void;

  // Metrics
  updateMetrics: (metrics: Partial<StreamMetrics>) => void;
  resetMetrics: () => void;

  // Settings
  setAutoReconnect: (enabled: boolean) => void;
  setReconnectInterval: (interval: number) => void;

  // Reset
  reset: () => void;
}

// ==================
// Initial State
// ==================

const initialMetrics: StreamMetrics = {
  viewers: 0,
  peakViewers: 0,
  bitrate: 0,
  droppedFrames: 0,
  totalFrames: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  streamDuration: 0,
  recordingDuration: 0,
};

const initialState: StreamState = {
  obs: {
    status: 'disconnected',
    host: 'localhost',
    port: 4455,
  },
  twitch: {
    status: 'disconnected',
  },
  youtube: {
    status: 'disconnected',
  },
  streamStatus: 'offline',
  isRecording: false,
  scenes: [],
  currentScene: null,
  sources: new Map(),
  metrics: initialMetrics,
  autoReconnect: true,
  reconnectInterval: 5000,
};

// ==================
// Store Creation
// ==================

export const useStreamStore = create<StreamState & StreamActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // OBS connection
        setOBSConnection: (connection) => {
          set(
            (state) => ({
              obs: { ...state.obs, ...connection },
            }),
            false,
            'setOBSConnection'
          );
        },

        connectOBS: (host, port, password) => {
          set(
            (state) => ({
              obs: {
                ...state.obs,
                host,
                port,
                password,
                status: 'connecting',
                error: undefined,
              },
            }),
            false,
            'connectOBS'
          );
        },

        disconnectOBS: () => {
          set(
            (state) => ({
              obs: {
                ...state.obs,
                status: 'disconnected',
                error: undefined,
              },
              scenes: [],
              currentScene: null,
              sources: new Map(),
            }),
            false,
            'disconnectOBS'
          );
        },

        // Twitch connection
        setTwitchConnection: (connection) => {
          set(
            (state) => ({
              twitch: { ...state.twitch, ...connection },
            }),
            false,
            'setTwitchConnection'
          );
        },

        connectTwitch: (accessToken, refreshToken) => {
          set(
            (state) => ({
              twitch: {
                ...state.twitch,
                accessToken,
                refreshToken,
                status: 'connecting',
                error: undefined,
              },
            }),
            false,
            'connectTwitch'
          );
        },

        disconnectTwitch: () => {
          set(
            (state) => ({
              twitch: {
                ...state.twitch,
                status: 'disconnected',
                accessToken: undefined,
                refreshToken: undefined,
                error: undefined,
              },
            }),
            false,
            'disconnectTwitch'
          );
        },

        // YouTube connection
        setYouTubeConnection: (connection) => {
          set(
            (state) => ({
              youtube: { ...state.youtube, ...connection },
            }),
            false,
            'setYouTubeConnection'
          );
        },

        connectYouTube: (accessToken, refreshToken) => {
          set(
            (state) => ({
              youtube: {
                ...state.youtube,
                accessToken,
                refreshToken,
                status: 'connecting',
                error: undefined,
              },
            }),
            false,
            'connectYouTube'
          );
        },

        disconnectYouTube: () => {
          set(
            (state) => ({
              youtube: {
                ...state.youtube,
                status: 'disconnected',
                accessToken: undefined,
                refreshToken: undefined,
                liveChatId: undefined,
                error: undefined,
              },
            }),
            false,
            'disconnectYouTube'
          );
        },

        // Stream status
        setStreamStatus: (streamStatus) => {
          set({ streamStatus }, false, 'setStreamStatus');
        },

        setRecording: (isRecording) => {
          set({ isRecording }, false, 'setRecording');
        },

        // OBS scenes
        setScenes: (scenes) => {
          set({ scenes }, false, 'setScenes');
        },

        setCurrentScene: (currentScene) => {
          set({ currentScene }, false, 'setCurrentScene');
        },

        setSources: (sceneName, sources) => {
          set(
            (state) => ({
              sources: new Map(state.sources).set(sceneName, sources),
            }),
            false,
            'setSources'
          );
        },

        setSourceVisibility: (sceneName, sourceName, visible) => {
          set(
            (state) => {
              const sceneSourcesArray = state.sources.get(sceneName);
              if (!sceneSourcesArray) return state;

              const updatedSources = sceneSourcesArray.map((source) =>
                source.name === sourceName ? { ...source, visible } : source
              );

              return {
                sources: new Map(state.sources).set(sceneName, updatedSources),
              };
            },
            false,
            'setSourceVisibility'
          );
        },

        // Metrics
        updateMetrics: (metrics) => {
          set(
            (state) => {
              const newMetrics = { ...state.metrics, ...metrics };
              // Update peak viewers if current exceeds peak
              if (newMetrics.viewers > newMetrics.peakViewers) {
                newMetrics.peakViewers = newMetrics.viewers;
              }
              return { metrics: newMetrics };
            },
            false,
            'updateMetrics'
          );
        },

        resetMetrics: () => {
          set({ metrics: initialMetrics }, false, 'resetMetrics');
        },

        // Settings
        setAutoReconnect: (autoReconnect) => {
          set({ autoReconnect }, false, 'setAutoReconnect');
        },

        setReconnectInterval: (reconnectInterval) => {
          set({ reconnectInterval }, false, 'setReconnectInterval');
        },

        // Reset
        reset: () => {
          set(initialState, false, 'reset');
        },
      }),
      {
        name: 'stream-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist connection settings, not sensitive tokens
          obs: {
            host: state.obs.host,
            port: state.obs.port,
            // Don't persist password
          },
          twitch: {
            channelName: state.twitch.channelName,
            // Don't persist tokens
          },
          youtube: {
            channelId: state.youtube.channelId,
            // Don't persist tokens
          },
          autoReconnect: state.autoReconnect,
          reconnectInterval: state.reconnectInterval,
        }),
      }
    ),
    {
      name: 'StreamStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// ==================
// Selector Hooks
// ==================

/** Check if any stream platform is connected */
export const useIsAnyConnected = () =>
  useStreamStore(
    (state) =>
      state.obs.status === 'connected' ||
      state.twitch.status === 'connected' ||
      state.youtube.status === 'connected'
  );

/** Get OBS connection status */
export const useOBSStatus = () => useStreamStore((state) => state.obs.status);

/** Get Twitch connection status */
export const useTwitchStatus = () => useStreamStore((state) => state.twitch.status);

/** Get YouTube connection status */
export const useYouTubeStatus = () => useStreamStore((state) => state.youtube.status);

/** Check if stream is live */
export const useIsLive = () => useStreamStore((state) => state.streamStatus === 'live');

/** Get current viewer count */
export const useViewerCount = () => useStreamStore((state) => state.metrics.viewers);

/** Get peak viewer count */
export const usePeakViewers = () => useStreamStore((state) => state.metrics.peakViewers);

/** Get current OBS scene */
export const useCurrentScene = () => useStreamStore((state) => state.currentScene);

/** Get OBS scenes list */
export const useScenes = () => useStreamStore((state) => state.scenes);

/** Get sources for current scene */
export const useCurrentSceneSources = () =>
  useStreamStore((state) => {
    if (!state.currentScene) return [];
    return state.sources.get(state.currentScene) || [];
  });

/** Get stream metrics */
export const useStreamMetrics = () => useStreamStore((state) => state.metrics);

/** Check if recording */
export const useIsRecording = () => useStreamStore((state) => state.isRecording);

/** Get stream health status based on metrics */
export const useStreamHealth = () =>
  useStreamStore((state) => {
    const { droppedFrames, totalFrames, cpuUsage, bitrate } = state.metrics;
    const dropRate = totalFrames > 0 ? droppedFrames / totalFrames : 0;

    if (dropRate > 0.05 || cpuUsage > 90) return 'critical';
    if (dropRate > 0.02 || cpuUsage > 75 || bitrate < 2000) return 'warning';
    return 'healthy';
  });
