/**
 * StickerNest v2 - Widget IO Bridge
 * Bridges iframe postMessage communication to EventBus for pipeline routing
 * Handles widget:output events from iframes and delivers widget:input events back
 */

import { EventBus } from './EventBus';
import type { WidgetInstance } from '../types/domain';
import type { WidgetOutputEvent, WidgetInputEvent } from './PipelineRuntime';

/** Message types from widget iframes */
export interface WidgetMessage {
  type: 'widget-event' | 'widget-ready' | 'widget-error' | 'widget-log';
  widgetId: string;
  signal?: string;
  payload?: any;
  error?: string;
  message?: string;
}

/** Bridge configuration */
export interface WidgetIOBridgeConfig {
  eventBus: EventBus;
  debugEnabled?: boolean;
}

/**
 * WidgetIOBridge - Central hub for widget iframe communication
 * 
 * Flow:
 * 1. Widget iframe emits postMessage with type='widget-event'
 * 2. Bridge receives message, validates source
 * 3. Bridge emits 'widget:output' event to EventBus
 * 4. PipelineRuntime routes to connected widgets
 * 5. Bridge receives 'widget:input' event from EventBus
 * 6. Bridge posts message to target widget iframe
 */
export class WidgetIOBridge {
  private eventBus: EventBus;
  private debugEnabled: boolean;
  
  /** Map of widget instance ID to iframe element */
  private iframeRegistry: Map<string, HTMLIFrameElement> = new Map();
  
  /** Map of widget instance ID to widget definition ID */
  private widgetDefMap: Map<string, string> = new Map();
  
  /** Bound message handler for cleanup */
  private messageHandler: (event: MessageEvent) => void;
  
  /** Unsubscribe function for input events */
  private inputUnsubscribe?: () => void;

  constructor(config: WidgetIOBridgeConfig) {
    this.eventBus = config.eventBus;
    this.debugEnabled = config.debugEnabled ?? false;

    // Bind and register message handler
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);

    // NOTE: widget:input delivery is handled by WidgetSandboxHost which uses the correct
    // EVENT protocol with pipeline:input. WidgetIOBridge's deliverInput() uses a different
    // protocol (widget-input with hyphen) that test widgets don't understand.
    // See WidgetSandboxHost.setupEventSubscriptions() for the correct implementation.
    // Keeping this commented out to avoid protocol conflicts:
    // this.inputUnsubscribe = this.eventBus.on('widget:input', (event) => {
    //   this.deliverInput(event.payload as WidgetInputEvent);
    // });

    this.log('WidgetIOBridge initialized');
  }

  /**
   * Register a widget iframe for communication
   */
  registerWidget(instance: WidgetInstance, iframe: HTMLIFrameElement): void {
    this.iframeRegistry.set(instance.id, iframe);
    this.widgetDefMap.set(instance.id, instance.widgetDefId);
    this.log(`Registered widget: ${instance.id} (${instance.widgetDefId})`);
  }

  /**
   * Unregister a widget iframe
   */
  unregisterWidget(instanceId: string): void {
    this.iframeRegistry.delete(instanceId);
    this.widgetDefMap.delete(instanceId);
    this.log(`Unregistered widget: ${instanceId}`);
  }

  /**
   * Get all registered widget IDs
   */
  getRegisteredWidgets(): string[] {
    return Array.from(this.iframeRegistry.keys());
  }

  /**
   * Check if a widget is registered
   */
  isRegistered(instanceId: string): boolean {
    return this.iframeRegistry.has(instanceId);
  }

  /**
   * Handle incoming postMessage from widget iframes
   */
  private handleMessage(event: MessageEvent): void {
    // Validate message structure
    if (!event.data || typeof event.data !== 'object') return;
    if (!event.data.type || !event.data.widgetId) return;
    
    const message = event.data as WidgetMessage;
    
    // Verify the source iframe is registered
    const iframe = this.iframeRegistry.get(message.widgetId);
    if (!iframe) {
      // Widget might use a placeholder ID - try to find by source
      const matchingEntry = Array.from(this.iframeRegistry.entries()).find(
        ([, el]) => el.contentWindow === event.source
      );
      if (!matchingEntry) {
        this.log(`Message from unknown widget: ${message.widgetId}`, 'warn');
        return;
      }
      // Update the widget ID to the registered one
      message.widgetId = matchingEntry[0];
    }

    switch (message.type) {
      case 'widget-event':
        this.handleWidgetEvent(message);
        break;
        
      case 'widget-ready':
        this.handleWidgetReady(message);
        break;
        
      case 'widget-error':
        this.handleWidgetError(message);
        break;
        
      case 'widget-log':
        this.handleWidgetLog(message);
        break;
    }
  }

  /**
   * Handle widget-event (output signal from widget)
   */
  private handleWidgetEvent(message: WidgetMessage): void {
    if (!message.signal) {
      this.log(`Widget event missing signal: ${message.widgetId}`, 'warn');
      return;
    }

    const outputEvent: WidgetOutputEvent = {
      widgetInstanceId: message.widgetId,
      portName: message.signal,
      value: message.payload
    };

    this.log(`Widget output: ${message.widgetId}:${message.signal}`, 'debug', message.payload);

    // Emit to EventBus for PipelineRuntime to route
    this.eventBus.emit({
      type: 'widget:output',
      scope: 'canvas',
      payload: outputEvent,
      sourceWidgetId: message.widgetId
    });
  }

  /**
   * Handle widget-ready (widget finished initializing)
   */
  private handleWidgetReady(message: WidgetMessage): void {
    this.log(`Widget ready: ${message.widgetId}`);
    
    this.eventBus.emit({
      type: 'widget:ready',
      scope: 'canvas',
      payload: { widgetInstanceId: message.widgetId },
      sourceWidgetId: message.widgetId
    });
  }

  /**
   * Handle widget-error (widget encountered an error)
   */
  private handleWidgetError(message: WidgetMessage): void {
    this.log(`Widget error: ${message.widgetId} - ${message.error}`, 'error');
    
    this.eventBus.emit({
      type: 'widget:error',
      scope: 'canvas',
      payload: { 
        widgetInstanceId: message.widgetId,
        error: message.error 
      },
      sourceWidgetId: message.widgetId
    });
  }

  /**
   * Handle widget-log (debug log from widget)
   */
  private handleWidgetLog(message: WidgetMessage): void {
    if (this.debugEnabled) {
      console.log(`[Widget:${message.widgetId}]`, message.message, message.payload);
    }
  }

  /**
   * Deliver input event to a widget iframe
   */
  private deliverInput(input: WidgetInputEvent): void {
    const iframe = this.iframeRegistry.get(input.targetWidgetId);
    
    if (!iframe || !iframe.contentWindow) {
      this.log(`Cannot deliver input - widget not found: ${input.targetWidgetId}`, 'warn');
      return;
    }

    this.log(`Delivering input: ${input.targetWidgetId}:${input.portName}`, 'debug', input.value);

    // Post message to widget iframe
    iframe.contentWindow.postMessage({
      type: 'widget-input',
      widgetId: input.targetWidgetId,
      portName: input.portName,
      value: input.value,
      source: {
        widgetId: input.sourceWidgetId,
        portName: input.sourcePortName,
        connectionId: input.connectionId
      }
    }, '*');
  }

  /**
   * Send configuration to a widget
   */
  sendConfig(instanceId: string, config: Record<string, any>): void {
    const iframe = this.iframeRegistry.get(instanceId);
    
    if (!iframe || !iframe.contentWindow) {
      this.log(`Cannot send config - widget not found: ${instanceId}`, 'warn');
      return;
    }

    iframe.contentWindow.postMessage({
      type: 'init',
      widgetId: instanceId,
      config
    }, '*');
  }

  /**
   * Send action to a widget (direct call, not via pipeline)
   */
  sendAction(instanceId: string, action: string, payload?: any): void {
    const iframe = this.iframeRegistry.get(instanceId);
    
    if (!iframe || !iframe.contentWindow) {
      this.log(`Cannot send action - widget not found: ${instanceId}`, 'warn');
      return;
    }

    iframe.contentWindow.postMessage({
      type: 'action',
      widgetId: instanceId,
      action,
      payload
    }, '*');
  }

  /**
   * Cleanup and destroy the bridge
   */
  destroy(): void {
    window.removeEventListener('message', this.messageHandler);
    this.inputUnsubscribe?.();
    this.iframeRegistry.clear();
    this.widgetDefMap.clear();
    this.log('WidgetIOBridge destroyed');
  }

  /**
   * Debug logging
   */
  private log(message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info', data?: any): void {
    if (!this.debugEnabled && level === 'debug') return;
    
    const prefix = '[WidgetIOBridge]';
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
      default:
        console.log(prefix, message, data ?? '');
    }
  }
}

// Singleton instance
let bridgeInstance: WidgetIOBridge | null = null;

/**
 * Get or create the global WidgetIOBridge instance
 */
export function getWidgetIOBridge(config?: WidgetIOBridgeConfig): WidgetIOBridge {
  if (!bridgeInstance && config) {
    bridgeInstance = new WidgetIOBridge(config);
  }
  if (!bridgeInstance) {
    throw new Error('WidgetIOBridge not initialized. Call with config first.');
  }
  return bridgeInstance;
}

/**
 * Destroy the global bridge instance
 */
export function destroyWidgetIOBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.destroy();
    bridgeInstance = null;
  }
}

