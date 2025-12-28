import React, { useEffect, useState } from 'react';
import { FormFlowWidget } from '../widgets/FormFlow';
import { BusinessCardLayoutWidget } from '../widgets/BusinessCardLayout';
import { ImageGenPipelineWidget } from '../widgets/ImageGenPipeline';
import { PreviewExportWidget } from '../widgets/PreviewExport';
import { workflowOrchestrator } from '../services/workflow/WorkflowOrchestrator';
import workflowDef from '../workflows/businessCard.workflow.json';

// Mock API for the demo
const MockAPI = {
    emitOutput: (event: string, payload: any) => {
        console.log(`[MockAPI] Emitting ${event}`, payload);
        (window as any)._eventBus.emit(event, payload);
    },
    onInput: (name: string, callback: any) => {
        console.log(`[MockAPI] Registered input listener for ${name}`);
        (window as any)._inputListeners = (window as any)._inputListeners || {};
        (window as any)._inputListeners[name] = callback;
    },
    onMount: (cb: any) => cb({ state: {} }),
    onStateChange: () => { },
    setState: () => { },
    log: console.log
};

// Inject Mock API
(window as any).WidgetAPI = MockAPI;

// Simple Event Bus implementation for the demo
class DemoEventBus {
    private listeners: Record<string, Function[]> = {};

    subscribe(event: string, callback: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event: string, payload: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(payload));
        }
    }
}

const eventBus = new DemoEventBus();
(window as any)._eventBus = eventBus;

// Override Orchestrator's EventBus usage for this demo
// Note: In a real app, we'd use dependency injection or a singleton service
// For this demo, we'll patch the window object that the Orchestrator might use
// or just rely on the fact that we are manually wiring things up below.

export const BusinessCardDemoPage: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    useEffect(() => {
        // Register workflow
        // workflowOrchestrator.registerWorkflow(workflowDef); // If we could import it directly

        // Manual wiring for the demo since we don't have the full runtime
        eventBus.subscribe('formflow:submitted', (payload: any) => {
            addLog('Form submitted, triggering layout...');
            const layoutInputListener = (window as any)._inputListeners['formData'];
            if (layoutInputListener) layoutInputListener(payload);
        });

        eventBus.subscribe('businesscard:layout.ready', (payload: any) => {
            addLog('Layout ready, triggering image gen...');
            const imageInputListener = (window as any)._inputListeners['layoutConfig'];
            if (imageInputListener) imageInputListener(payload.layoutConfig);
        });

        eventBus.subscribe('businesscard:image.ready', (payload: any) => {
            addLog('Image ready, triggering preview...');
            const previewInputListener = (window as any)._inputListeners['imageUrl'];
            if (previewInputListener) previewInputListener(payload.imageUrl);
        });

        // Initialize FormFlow with Schema
        setTimeout(() => {
            addLog('Initializing Form Schema...');
            const schemaListener = (window as any)._inputListeners['schema'];
            if (schemaListener) {
                schemaListener({
                    title: "Business Card Generator",
                    steps: [
                        {
                            id: "details",
                            title: "Contact Details",
                            fields: [
                                { id: "fullName", label: "Full Name", type: "text", required: true },
                                { id: "title", label: "Job Title", type: "text", required: true },
                                { id: "email", label: "Email", type: "email", required: true },
                                {
                                    id: "style",
                                    label: "Style",
                                    type: "select",
                                    options: [
                                        { label: "Minimal", value: "minimal" },
                                        { label: "Modern", value: "modern" }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            }
        }, 1000);

    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white p-8 overflow-hidden">
            <h1 className="text-2xl font-bold mb-8">Business Card Generator Demo</h1>

            <div className="grid grid-cols-4 gap-8 h-full">
                {/* Step 1: Form */}
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold text-gray-400">1. Data Collection</h2>
                    <div className="flex-1 bg-gray-800 rounded p-2 border border-gray-700">
                        <FormFlowWidget />
                    </div>
                </div>

                {/* Step 2: Pipeline (Layout + Image) */}
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold text-gray-400">2. Pipeline Processing</h2>
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-gray-800 rounded p-4 border border-gray-700">
                            <h3 className="text-sm mb-2">Layout Engine</h3>
                            <BusinessCardLayoutWidget />
                        </div>
                        <div className="bg-gray-800 rounded p-4 border border-gray-700">
                            <h3 className="text-sm mb-2">Image Generator</h3>
                            <ImageGenPipelineWidget />
                        </div>
                    </div>
                </div>

                {/* Step 3: Preview */}
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold text-gray-400">3. Final Output</h2>
                    <div className="flex-1 bg-gray-800 rounded p-2 border border-gray-700">
                        <PreviewExportWidget />
                    </div>
                </div>

                {/* Logs */}
                <div className="flex flex-col gap-2">
                    <h2 className="font-bold text-gray-400">System Logs</h2>
                    <div className="flex-1 bg-black rounded p-4 font-mono text-xs overflow-auto border border-gray-700">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-green-400">{`> ${log}`}</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
