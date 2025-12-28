import React, { useEffect, useState } from 'react';
import minimalTemplate from '../../pipelines/templates/businessCard/minimal.json';

const TEMPLATES: Record<string, any> = {
    'minimal': minimalTemplate
};

interface BusinessCardLayoutWidgetProps {
    api?: any;
}

export const BusinessCardLayoutWidget: React.FC<BusinessCardLayoutWidgetProps> = ({ api: propApi }) => {
    // Mock WidgetAPI
    const API = propApi || (window as any).WidgetAPI || {
        emitOutput: console.log,
        onInput: () => { },
        onMount: (cb: any) => cb({ state: {} }),
        log: console.log
    };
    const [status, setStatus] = useState('Idle');

    useEffect(() => {
        API.onMount(() => {
            API.log('BusinessCardLayoutWidget mounted');
        });

        API.onInput('formData', (data: any) => {
            setStatus('Processing...');
            processLayout(data);
        });
    }, []);

    const processLayout = (data: any) => {
        const { values } = data; // Assuming data comes from FormFlow output structure
        const style = values.style || 'minimal';
        const template = TEMPLATES[style] || TEMPLATES['minimal'];

        // Merge form values into template
        const layoutConfig = {
            templateId: template.id,
            layout: {
                ...template.layout,
                // Dynamic overrides could go here
            },
            formValues: values
        };

        setStatus('Layout Ready');

        API.emitOutput('businesscard:layout.ready', {
            widgetId: 'layout-pipeline',
            layoutConfig
        });
    };

    return (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded shadow text-sm">
            <div className="font-bold mb-2">Layout Pipeline</div>
            <div>Status: {status}</div>
        </div>
    );
};
