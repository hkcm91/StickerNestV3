import React, { useEffect, useState } from 'react';

interface PreviewExportWidgetProps {
    api?: any;
}

export const PreviewExportWidget: React.FC<PreviewExportWidgetProps> = ({ api: propApi }) => {
    // Mock WidgetAPI
    const API = propApi || (window as any).WidgetAPI || {
        emitOutput: console.log,
        onInput: () => { },
        onMount: (cb: any) => cb({ state: {} }),
        log: console.log
    };
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        API.onMount((context: any) => {
            if (context.state && context.state.imageUrl) {
                setImageUrl(context.state.imageUrl);
            }
        });

        API.onInput('imageUrl', (data: any) => {
            // Handle both direct string and object wrapper
            const url = typeof data === 'string' ? data : data.imageUrl;
            setImageUrl(url);
        });
    }, []);

    const handleExport = (format: 'png' | 'jpg' | 'pdf') => {
        API.emitOutput('preview:export.request', { format, imageUrl });
        // Simulate export
        setTimeout(() => {
            API.emitOutput('preview:export.completed', { format, success: true });
            alert(`Exported as ${format}`);
        }, 1000);
    };

    if (!imageUrl) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                Waiting for preview...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-4 rounded shadow overflow-hidden">
            <h3 className="text-lg font-bold mb-2 dark:text-white">Preview</h3>
            <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded mb-4 overflow-hidden">
                <img src={imageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex gap-2 justify-center">
                <button onClick={() => handleExport('png')} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">PNG</button>
                <button onClick={() => handleExport('jpg')} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">JPG</button>
                <button onClick={() => handleExport('pdf')} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">PDF</button>
            </div>
        </div>
    );
};
