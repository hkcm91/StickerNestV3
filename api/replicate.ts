/**
 * StickerNest v2 - Replicate API Proxy
 * Server-side endpoint for calling Replicate API with Gemini
 */

import Replicate from 'replicate';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.VITE_REPLICATE_API_TOKEN;

    if (!apiKey) {
        return res.status(500).json({ error: 'Replicate API token not configured' });
    }

    try {
        const { prompt, model, max_tokens, temperature } = req.body;

        const replicate = new Replicate({
            auth: apiKey,
        });

        // Default to Llama 3.1 70B for reliable widget generation
        const useModel = model || 'meta/meta-llama-3.1-70b-instruct';

        const output = await replicate.run(
            useModel as any,
            {
                input: {
                    prompt,
                    max_tokens: max_tokens || 2000,
                    temperature: temperature || 0.3,
                }
            }
        );

        // Replicate returns output as an array of strings
        let result = '';
        if (Array.isArray(output)) {
            result = output.join('');
        } else if (typeof output === 'string') {
            result = output;
        }

        return res.status(200).json({ output: result });
    } catch (error) {
        console.error('Replicate API error:', error);
        return res.status(500).json({
            error: 'Replicate API call failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
