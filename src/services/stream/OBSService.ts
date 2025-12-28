/**
 * StickerNest v2 - OBS WebSocket Service
 * Manages connection to OBS Studio via obs-websocket v5 protocol
 * Provides scene control, source management, and event handling
 *
 * @see https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
 */

import { useStreamStore } from '../../state/useStreamStore';
import { useStreamEventsStore } from '../../state/useStreamEventsStore';
import type { OBSScene, OBSSource } from '../../state/useStreamStore';

// ==================
// Types
// ==================

/** OBS WebSocket message */
interface OBSMessage {
  op: number;
  d: Record<string, unknown>;
}

/** OBS WebSocket opcodes */
const OpCode = {
  Hello: 0,
  Identify: 1,
  Identified: 2,
  Reidentify: 3,
  Event: 5,
  Request: 6,
  RequestResponse: 7,
  RequestBatch: 8,
  RequestBatchResponse: 9,
} as const;

/** OBS Event subscriptions (bitmask) */
const EventSubscription = {
  None: 0,
  General: 1 << 0,
  Config: 1 << 1,
  Scenes: 1 << 2,
  Inputs: 1 << 3,
  Transitions: 1 << 4,
  Filters: 1 << 5,
  Outputs: 1 << 6,
  SceneItems: 1 << 7,
  MediaInputs: 1 << 8,
  Vendors: 1 << 9,
  Ui: 1 << 10,
  All: (1 << 11) - 1,
} as const;

/** Pending request tracker */
interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ==================
// OBS Service Class
// ==================

class OBSServiceClass {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;
  private eventHandlers: Map<string, Set<(data: unknown) => void>> = new Map();

  // ==================
  // Connection Management
  // ==================

  /**
   * Connect to OBS WebSocket server
   */
  async connect(host: string, port: number, password?: string): Promise<void> {
    // Update store state
    useStreamStore.getState().connectOBS(host, port, password);
    this.isManualDisconnect = false;

    return new Promise((resolve, reject) => {
      try {
        const url = `ws://${host}:${port}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[OBSService] WebSocket connected, waiting for Hello...');
        };

        this.ws.onmessage = (event) => {
          try {
            const message: OBSMessage = JSON.parse(event.data);
            this.handleMessage(message, password, resolve, reject);
          } catch (err) {
            console.error('[OBSService] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[OBSService] WebSocket error:', error);
          useStreamStore.getState().setOBSConnection({
            status: 'error',
            error: 'Connection error',
          });
          reject(new Error('WebSocket connection error'));
        };

        this.ws.onclose = (event) => {
          console.log('[OBSService] WebSocket closed:', event.code, event.reason);
          this.handleDisconnect();
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        useStreamStore.getState().setOBSConnection({
          status: 'error',
          error: error.message,
        });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from OBS
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Disconnected'));
    }
    this.pendingRequests.clear();

    useStreamStore.getState().disconnectOBS();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ==================
  // Message Handling
  // ==================

  private handleMessage(
    message: OBSMessage,
    password: string | undefined,
    connectResolve: (value: void) => void,
    connectReject: (error: Error) => void
  ): void {
    switch (message.op) {
      case OpCode.Hello:
        this.handleHello(message.d, password);
        break;

      case OpCode.Identified:
        this.handleIdentified(connectResolve);
        break;

      case OpCode.Event:
        this.handleEvent(message.d);
        break;

      case OpCode.RequestResponse:
        this.handleRequestResponse(message.d);
        break;

      default:
        console.log('[OBSService] Unhandled opcode:', message.op);
    }
  }

  private async handleHello(data: Record<string, unknown>, password?: string): Promise<void> {
    console.log('[OBSService] Received Hello, identifying...');

    const identifyData: Record<string, unknown> = {
      rpcVersion: 1,
      eventSubscriptions: EventSubscription.All,
    };

    // Handle authentication if required
    if (data.authentication && password) {
      const auth = data.authentication as { challenge: string; salt: string };
      identifyData.authentication = await this.generateAuthString(
        password,
        auth.challenge,
        auth.salt
      );
    }

    this.send(OpCode.Identify, identifyData);
  }

  private async handleIdentified(resolve: (value: void) => void): Promise<void> {
    console.log('[OBSService] Successfully identified with OBS');

    useStreamStore.getState().setOBSConnection({
      status: 'connected',
      lastConnected: new Date().toISOString(),
      error: undefined,
    });

    // Fetch initial state
    await this.refreshState();

    resolve();
  }

  private handleEvent(data: Record<string, unknown>): void {
    const eventType = data.eventType as string;
    const eventData = data.eventData as Record<string, unknown>;

    // Map OBS events to our event types and add to store
    this.processOBSEvent(eventType, eventData);

    // Call registered handlers
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(eventData));
    }

    // Call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler({ eventType, eventData }));
    }
  }

  private handleRequestResponse(data: Record<string, unknown>): void {
    const requestId = data.requestId as string;
    const pending = this.pendingRequests.get(requestId);

    if (!pending) {
      console.warn('[OBSService] Received response for unknown request:', requestId);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    const status = data.requestStatus as { result: boolean; code: number; comment?: string };

    if (status.result) {
      pending.resolve(data.responseData);
    } else {
      pending.reject(new Error(status.comment || `Request failed with code ${status.code}`));
    }
  }

  // ==================
  // Authentication
  // ==================

  private async generateAuthString(
    password: string,
    challenge: string,
    salt: string
  ): Promise<string> {
    const encoder = new TextEncoder();

    // Create base64(SHA256(password + salt))
    const secret = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(password + salt)
    );
    const secretBase64 = btoa(String.fromCharCode(...new Uint8Array(secret)));

    // Create base64(SHA256(secret + challenge))
    const auth = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(secretBase64 + challenge)
    );
    return btoa(String.fromCharCode(...new Uint8Array(auth)));
  }

  // ==================
  // Request/Response
  // ==================

  private send(opcode: number, data: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[OBSService] Cannot send - not connected');
      return;
    }

    const message: OBSMessage = { op: opcode, d: data };
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send a request to OBS and wait for response
   */
  async request<T = unknown>(
    requestType: string,
    requestData?: Record<string, unknown>,
    timeoutMs = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Not connected to OBS'));
        return;
      }

      const requestId = `req_${++this.requestId}`;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timed out: ${requestType}`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout,
      });

      this.send(OpCode.Request, {
        requestType,
        requestId,
        requestData: requestData || {},
      });
    });
  }

  // ==================
  // Scene Operations
  // ==================

  /**
   * Get list of scenes
   */
  async getScenes(): Promise<OBSScene[]> {
    const response = await this.request<{
      currentProgramSceneName: string;
      scenes: Array<{ sceneName: string; sceneIndex: number }>;
    }>('GetSceneList');

    const scenes = response.scenes.map((s) => ({
      name: s.sceneName,
      index: s.sceneIndex,
    }));

    // Update store
    useStreamStore.getState().setScenes(scenes);
    useStreamStore.getState().setCurrentScene(response.currentProgramSceneName);

    return scenes;
  }

  /**
   * Set current scene
   */
  async setCurrentScene(sceneName: string): Promise<void> {
    await this.request('SetCurrentProgramScene', { sceneName });
    useStreamStore.getState().setCurrentScene(sceneName);
  }

  // ==================
  // Source Operations
  // ==================

  /**
   * Get sources in a scene
   */
  async getSceneSources(sceneName: string): Promise<OBSSource[]> {
    const response = await this.request<{
      sceneItems: Array<{
        sourceName: string;
        sourceType: string;
        sceneItemEnabled: boolean;
        sceneItemLocked: boolean;
      }>;
    }>('GetSceneItemList', { sceneName });

    const sources = response.sceneItems.map((item) => ({
      name: item.sourceName,
      type: item.sourceType,
      visible: item.sceneItemEnabled,
      locked: item.sceneItemLocked,
    }));

    // Update store
    useStreamStore.getState().setSources(sceneName, sources);

    return sources;
  }

  /**
   * Set source visibility
   */
  async setSourceVisibility(
    sceneName: string,
    sourceName: string,
    visible: boolean
  ): Promise<void> {
    // First get the scene item ID
    const response = await this.request<{ sceneItemId: number }>('GetSceneItemId', {
      sceneName,
      sourceName,
    });

    await this.request('SetSceneItemEnabled', {
      sceneName,
      sceneItemId: response.sceneItemId,
      sceneItemEnabled: visible,
    });

    useStreamStore.getState().setSourceVisibility(sceneName, sourceName, visible);
  }

  // ==================
  // Stream Control
  // ==================

  /**
   * Start streaming
   */
  async startStream(): Promise<void> {
    await this.request('StartStream');
    useStreamStore.getState().setStreamStatus('starting');
  }

  /**
   * Stop streaming
   */
  async stopStream(): Promise<void> {
    await this.request('StopStream');
    useStreamStore.getState().setStreamStatus('stopping');
  }

  /**
   * Get stream status
   */
  async getStreamStatus(): Promise<{
    outputActive: boolean;
    outputReconnecting: boolean;
    outputTimecode: string;
    outputDuration: number;
    outputBytes: number;
  }> {
    return this.request('GetStreamStatus');
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    await this.request('StartRecord');
    useStreamStore.getState().setRecording(true);
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    await this.request('StopRecord');
    useStreamStore.getState().setRecording(false);
  }

  // ==================
  // Stats
  // ==================

  /**
   * Get OBS stats
   */
  async getStats(): Promise<void> {
    const stats = await this.request<{
      cpuUsage: number;
      memoryUsage: number;
      availableDiskSpace: number;
      activeFps: number;
      averageFrameRenderTime: number;
      renderSkippedFrames: number;
      renderTotalFrames: number;
      outputSkippedFrames: number;
      outputTotalFrames: number;
    }>('GetStats');

    useStreamStore.getState().updateMetrics({
      cpuUsage: stats.cpuUsage,
      memoryUsage: stats.memoryUsage,
      droppedFrames: stats.outputSkippedFrames,
      totalFrames: stats.outputTotalFrames,
    });
  }

  // ==================
  // Event Handlers
  // ==================

  /**
   * Subscribe to OBS events
   */
  on(eventType: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Process OBS events and add to stream events store
   */
  private processOBSEvent(eventType: string, eventData: Record<string, unknown>): void {
    const addEvent = useStreamEventsStore.getState().addEvent;

    switch (eventType) {
      case 'CurrentProgramSceneChanged':
        useStreamStore.getState().setCurrentScene(eventData.sceneName as string);
        addEvent({
          source: 'obs',
          type: 'obs:scene-changed',
          payload: { sceneName: eventData.sceneName },
        });
        break;

      case 'SceneItemEnableStateChanged':
        addEvent({
          source: 'obs',
          type: 'obs:source-visibility',
          payload: {
            sceneName: eventData.sceneName,
            sceneItemId: eventData.sceneItemId,
            enabled: eventData.sceneItemEnabled,
          },
        });
        break;

      case 'StreamStateChanged':
        const outputState = eventData.outputState as string;
        if (outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
          useStreamStore.getState().setStreamStatus('live');
          addEvent({ source: 'obs', type: 'obs:stream-started', payload: {} });
        } else if (outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
          useStreamStore.getState().setStreamStatus('offline');
          addEvent({ source: 'obs', type: 'obs:stream-stopped', payload: {} });
        }
        break;

      case 'RecordStateChanged':
        const recordState = eventData.outputState as string;
        if (recordState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
          useStreamStore.getState().setRecording(true);
          addEvent({ source: 'obs', type: 'obs:recording-started', payload: {} });
        } else if (recordState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
          useStreamStore.getState().setRecording(false);
          addEvent({ source: 'obs', type: 'obs:recording-stopped', payload: {} });
        }
        break;

      case 'SourceFilterEnableStateChanged':
        addEvent({
          source: 'obs',
          type: eventData.filterEnabled ? 'obs:filter-enabled' : 'obs:filter-disabled',
          payload: {
            sourceName: eventData.sourceName,
            filterName: eventData.filterName,
          },
        });
        break;
    }
  }

  // ==================
  // Reconnection
  // ==================

  private handleDisconnect(): void {
    this.ws = null;

    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Disconnected'));
    }
    this.pendingRequests.clear();

    // Update store
    useStreamStore.getState().setOBSConnection({ status: 'disconnected' });

    // Auto-reconnect if enabled and not manual disconnect
    if (!this.isManualDisconnect) {
      const { autoReconnect, reconnectInterval, obs } = useStreamStore.getState();
      if (autoReconnect && obs.host) {
        console.log(`[OBSService] Will attempt reconnect in ${reconnectInterval}ms`);
        this.reconnectTimer = setTimeout(() => {
          this.connect(obs.host, obs.port, obs.password).catch((err) => {
            console.error('[OBSService] Reconnect failed:', err);
          });
        }, reconnectInterval);
      }
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ==================
  // State Refresh
  // ==================

  /**
   * Refresh all OBS state (scenes, sources, status)
   */
  async refreshState(): Promise<void> {
    try {
      // Get scenes
      const scenes = await this.getScenes();

      // Get sources for current scene
      const currentScene = useStreamStore.getState().currentScene;
      if (currentScene) {
        await this.getSceneSources(currentScene);
      }

      // Get stream status
      try {
        const streamStatus = await this.getStreamStatus();
        useStreamStore.getState().setStreamStatus(
          streamStatus.outputActive ? 'live' : 'offline'
        );
        useStreamStore.getState().updateMetrics({
          streamDuration: streamStatus.outputDuration / 1000,
        });
      } catch {
        // Stream might not be active
      }

      // Get stats
      await this.getStats();
    } catch (err) {
      console.error('[OBSService] Failed to refresh state:', err);
    }
  }
}

// ==================
// Singleton Export
// ==================

export const OBSService = new OBSServiceClass();

// Re-export types
export type { OBSScene, OBSSource };
