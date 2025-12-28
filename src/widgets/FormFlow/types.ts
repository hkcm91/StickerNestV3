
export type FieldType = 'text' | 'number' | 'email' | 'tel' | 'url' | 'select' | 'color' | 'image';

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[]; // For select
    defaultValue?: any;
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    };
}

export interface FormStep {
    id: string;
    title: string;
    fields: FormField[];
}

export interface FormSchema {
    title?: string;
    description?: string;
    steps: FormStep[]; // Can be single step
    submitLabel?: string;
}

export interface FormFlowState {
    schema: FormSchema;
    values: Record<string, any>;
    currentStep: number;
    isValid: boolean;
    errors: Record<string, string>;
}

export interface FormFlowEvents {
    'formflow:changed': { widgetId: string; values: Record<string, any>; valid: boolean };
    'formflow:submitted': { widgetId: string; values: Record<string, any>; valid: boolean };
    'formflow:validated': { widgetId: string; valid: boolean; errors: Record<string, string> };
    'formflow:completed': { widgetId: string; values: Record<string, any>; valid: boolean };
}
