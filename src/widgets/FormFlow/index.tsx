import React, { useState, useEffect } from 'react';
import { FormSchema, FormField, FormFlowState } from './types';

interface FormFlowWidgetProps {
    api?: any;
}

export const FormFlowWidget: React.FC<FormFlowWidgetProps> = ({ api: propApi }) => {
    const API = propApi || (window as any).WidgetAPI || {
        emitOutput: console.log,
        setState: console.log,
        onInput: () => { },
        onStateChange: () => { },
        onMount: (cb: any) => cb({ state: {} }),
        log: console.log
    };
    const [state, setState] = useState<FormFlowState>({
        schema: { steps: [] },
        values: {},
        currentStep: 0,
        isValid: false,
        errors: {}
    });

    useEffect(() => {
        API.onMount((context: any) => {
            if (context.state) {
                setState(prev => ({ ...prev, ...context.state }));
            }
        });

        API.onInput('schema', (schema: FormSchema) => {
            setState(prev => ({ ...prev, schema, currentStep: 0, values: {} }));
        });

        API.onStateChange((newState: any) => {
            setState(prev => ({ ...prev, ...newState }));
        });

    }, []);

    const handleInputChange = (fieldId: string, value: any) => {
        const newValues = { ...state.values, [fieldId]: value };
        // Simple validation logic (extensible)
        const isValid = validate(newValues, state.schema);

        const newState = { ...state, values: newValues, isValid };
        setState(newState);
        API.setState(newState);

        API.emitOutput('formflow:changed', {
            widgetId: 'form-flow', // Should get actual ID
            values: newValues,
            valid: isValid
        });
    };

    const validate = (values: Record<string, any>, schema: FormSchema): boolean => {
        // Basic required check
        if (!schema || !schema.steps) return true;
        for (const step of schema.steps) {
            for (const field of step.fields) {
                if (field.required && !values[field.id]) return false;
            }
        }
        return true;
    };

    const handleSubmit = () => {
        if (state.currentStep < state.schema.steps.length - 1) {
            setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
        } else {
            API.emitOutput('formflow:submitted', {
                widgetId: 'form-flow',
                values: state.values,
                valid: state.isValid
            });
            API.emitOutput('formflow:completed', {
                widgetId: 'form-flow',
                values: state.values,
                valid: state.isValid
            });
        }
    };

    const currentStepData = state.schema.steps[state.currentStep];

    if (!currentStepData) return <div className="p-4 text-gray-500">No schema loaded</div>;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm overflow-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{state.schema.title || currentStepData.title}</h2>

            <div className="space-y-4 flex-1">
                {currentStepData.fields.map(field => (
                    <div key={field.id} className="flex flex-col">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {renderField(field, state.values[field.id], handleInputChange)}
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-between">
                {state.currentStep > 0 && (
                    <button
                        onClick={() => setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={!state.isValid} // Simplified validation check
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto disabled:opacity-50"
                >
                    {state.currentStep === state.schema.steps.length - 1 ? (state.schema.submitLabel || 'Submit') : 'Next'}
                </button>
            </div>
        </div>
    );
};

function renderField(field: FormField, value: any, onChange: (id: string, val: any) => void) {
    switch (field.type) {
        case 'select':
            return (
                <select
                    value={value || ''}
                    onChange={e => onChange(field.id, e.target.value)}
                    className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="">Select...</option>
                    {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        case 'color':
            return (
                <input
                    type="color"
                    value={value || '#000000'}
                    onChange={e => onChange(field.id, e.target.value)}
                    className="h-10 w-full cursor-pointer"
                />
            );
        case 'text':
        case 'email':
        case 'tel':
        case 'url':
        default:
            return (
                <input
                    type={field.type}
                    value={value || ''}
                    placeholder={field.placeholder}
                    onChange={e => onChange(field.id, e.target.value)}
                    className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            );
    }
}
