import { WidgetInstance } from '../../types/domain';

// Mock EventBus and StateManager for now
const EventBus = {
    subscribe: (event: string, callback: (payload: any) => void) => {
        // In a real app, this would hook into the global event bus
        console.log(`Subscribed to ${event}`);
        // Mock implementation for demo purposes
        (window as any)._eventBus = (window as any)._eventBus || {};
        (window as any)._eventBus[event] = callback;
    },
    emit: (event: string, payload: any) => {
        console.log(`Emitting ${event}`, payload);
        const callback = (window as any)._eventBus?.[event];
        if (callback) callback(payload);
    }
};

interface WorkflowStep {
    id: string;
    widgetId: string; // The ID of the widget instance in the canvas
    nextStepId?: string;
    triggerEvent: string;
    mapOutputToInput?: (payload: any) => any;
}

interface WorkflowDefinition {
    id: string;
    name: string;
    steps: WorkflowStep[];
}

export class WorkflowOrchestrator {
    private activeWorkflows: Map<string, WorkflowDefinition> = new Map();

    constructor() {
        // Initialize
    }

    public registerWorkflow(workflow: WorkflowDefinition) {
        this.activeWorkflows.set(workflow.id, workflow);
        this.setupListeners(workflow);
    }

    private setupListeners(workflow: WorkflowDefinition) {
        workflow.steps.forEach(step => {
            EventBus.subscribe(step.triggerEvent, (payload) => {
                console.log(`Workflow ${workflow.id}: Step ${step.id} triggered by ${step.triggerEvent}`);
                this.handleStepComplete(workflow, step, payload);
            });
        });
    }

    private handleStepComplete(workflow: WorkflowDefinition, step: WorkflowStep, payload: any) {
        if (!step.nextStepId) {
            console.log(`Workflow ${workflow.id} completed.`);
            return;
        }

        const nextStep = workflow.steps.find(s => s.id === step.nextStepId);
        if (!nextStep) {
            console.error(`Next step ${step.nextStepId} not found in workflow ${workflow.id}`);
            return;
        }

        // Transform payload if needed
        const inputData = step.mapOutputToInput ? step.mapOutputToInput(payload) : payload;

        // In a real app, we would find the widget instance and send input to it
        // For now, we'll simulate sending input via the EventBus or a direct API call
        console.log(`Advancing to step ${nextStep.id} (Widget: ${nextStep.widgetId}) with data:`, inputData);

        // Dispatch to the next widget
        // This assumes widgets listen to specific input events or we have a way to push data
        // For this demo, we'll emit a synthetic event that the next widget might listen to 
        // OR we assume the Orchestrator can call `widget.setInput` directly.

        // Let's assume we emit an event that routes to the widget's input
        // e.g., "widget:input:{widgetId}:{inputName}"
        // But our widgets listen to `API.onInput('name')`.
        // The bridge would handle this.

        // For the purpose of this task, we'll log the transition.
    }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
