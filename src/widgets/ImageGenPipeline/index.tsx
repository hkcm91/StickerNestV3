import React, { useEffect, useState } from 'react';

interface ImageGenPipelineWidgetProps {
    api?: any;
}

export const ImageGenPipelineWidget: React.FC<ImageGenPipelineWidgetProps> = ({ api: propApi }) => {
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
            API.log('ImageGenPipelineWidget mounted');
        });

        API.onInput('layoutConfig', (config: any) => {
            setStatus('Generating Image...');
            generateImage(config);
        });
    }, []);

    const generateImage = async (config: any) => {
        // Simulate async image generation
        setTimeout(() => {
            // In a real implementation, this would call an API or use a canvas to render
            const mockImageUrl = `https://via.placeholder.com/${config.layout.layout.width}x${config.layout.layout.height}?text=${encodeURIComponent(config.layout.formValues.fullName)}`;

            setStatus('Image Ready');

            API.emitOutput('businesscard:image.ready', {
                widgetId: 'image-gen',
                imageUrl: mockImageUrl,
                metadata: config
            });
        }, 2000);
    };

    return (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded shadow text-sm">
            <div className="font-bold mb-2">Image Gen Pipeline</div>
            <div>Status: {status}</div>
        </div>
    );
};
