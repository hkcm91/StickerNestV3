import React, { useMemo, useEffect, useState } from 'react';
import { WidgetInstance } from '../types/domain';
import { RuntimeContext } from '../runtime/RuntimeContext';
import { WidgetAPI } from '../types/runtime';

interface BuiltinWidgetWrapperProps {
    instance: WidgetInstance;
    component: React.ComponentType<any>;
    runtime: RuntimeContext;
}

/**
 * Wrapper for built-in React widgets running in the main thread.
 * Provides a scoped WidgetAPI instance to the widget component.
 */
export const BuiltinWidgetWrapper: React.FC<BuiltinWidgetWrapperProps> = ({
    instance,
    component: Component,
    runtime
}) => {
    // Create a scoped API for this widget instance
    const api = useMemo<WidgetAPI>(() => {
        return {
            widgetId: instance.id,
            widgetDefId: instance.widgetDefId,

            emitEvent: (event) => {
                runtime.eventBus.emit({
                    ...event,
                    sourceWidgetId: instance.id
                });
            },

            emitOutput: (port, data) => {
                runtime.eventBus.emit({
                    type: 'widget:output',
                    scope: 'canvas',
                    payload: {
                        widgetId: instance.id,
                        port,
                        data,
                        timestamp: Date.now()
                    },
                    sourceWidgetId: instance.id
                });
            },

            onEvent: (type, handler) => {
                return runtime.eventBus.on(type, handler);
            },

            onInput: (port, handler) => {
                // Listen for input events directed at this widget
                return runtime.eventBus.on('widget:input', (event) => {
                    if (event.payload.targetWidgetId === instance.id && event.payload.port === port) {
                        handler(event.payload.data, event.payload.sourceWidgetId);
                    }
                });
            },

            getState: () => {
                return instance.state || {};
            },

            setState: (patch) => {
                runtime.updateWidgetInstance(instance.id, {
                    state: { ...instance.state, ...patch }
                });

                // Emit state change event
                runtime.eventBus.emit({
                    type: 'widget:stateChanged',
                    scope: 'widget',
                    payload: {
                        widgetInstanceId: instance.id,
                        state: { ...instance.state, ...patch }
                    },
                    sourceWidgetId: instance.id
                });
            },

            getAssetUrl: (path) => {
                // For built-in widgets, assets might be in public folder or imported
                // This is a simplified implementation
                return path;
            },

            log: (...args) => console.log(`[${instance.widgetDefId}]`, ...args),
            info: (...args) => console.info(`[${instance.widgetDefId}]`, ...args),
            warn: (...args) => console.warn(`[${instance.widgetDefId}]`, ...args),
            error: (...args) => console.error(`[${instance.widgetDefId}]`, ...args),
            debugLog: (...args) => console.debug(`[${instance.widgetDefId}]`, ...args),

            onMount: (callback: (context: any) => void) => {
                // For built-in widgets, we are already mounted.
                // Call the callback immediately with the current state.
                callback({
                    state: instance.state || {}
                });
            },
        };
    }, [instance.id, instance.widgetDefId, runtime]);

    // Force update when instance state changes (since API.getState returns current instance state)
    // In a real implementation, we might want to pass state as a prop to the component
    // or have the component subscribe to state changes via the API.

    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <Component api={api} />
        </div>
    );
};
