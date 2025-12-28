/**
 * StickerNest v2 - Anthropic Claude API Proxy
 * Server-side endpoint for calling Claude API
 */

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Anthropic API key not configured' });
    }

    try {
        const { model, max_tokens, system, messages, temperature, top_p, stop_sequences } = req.body;

        // Default to Claude 3.5 Sonnet for best code quality
        const useModel = model || 'claude-3-5-sonnet-20241022';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: useModel,
                max_tokens: max_tokens || 4000,
                system,
                messages,
                temperature: temperature ?? 0.7,
                top_p,
                stop_sequences,
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            console.error('Anthropic API error:', error);
            return res.status(response.status).json({
                error: error.error?.message || error.error || 'Anthropic API error',
            });
        }

        const result = await response.json();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Anthropic API error:', error);
        return res.status(500).json({
            error: 'Anthropic API call failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
