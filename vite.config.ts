import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'
import type { Plugin } from 'vite'

// Simple API middleware plugin for development
function apiMiddleware(): Plugin {
    let replicateKey: string | undefined;
    let openaiKey: string | undefined;
    let anthropicKey: string | undefined;
    let googleKey: string | undefined;

    return {
        name: 'api-middleware',
        config(_, { mode }) {
            // Load env vars during config phase
            const env = loadEnv(mode, process.cwd(), '');
            replicateKey = env.VITE_REPLICATE_API_TOKEN;
            openaiKey = env.VITE_OPENAI_API_KEY;
            anthropicKey = env.VITE_ANTHROPIC_API_KEY;
            googleKey = env.VITE_GOOGLE_API_KEY;
        },
        configureServer(server) {
            // ============================================
            // OpenAI API Proxy
            // ============================================
            server.middlewares.use('/api/openai', (req: any, res: any, next: any) => {
                if (req.method === 'GET' && req.url?.includes('/status')) {
                    res.statusCode = openaiKey ? 200 : 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ configured: !!openaiKey }));
                    return;
                }

                if (req.method !== 'POST') {
                    return next();
                }

                if (!openaiKey) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'OpenAI API key not configured. Add VITE_OPENAI_API_KEY to .env' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: any) => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const requestBody = JSON.parse(body);
                        console.log('[OpenAI Proxy] Model:', requestBody.model);

                        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${openaiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(requestBody)
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            console.error('[OpenAI Proxy] Error:', result);
                            res.statusCode = response.status;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(result));
                            return;
                        }

                        console.log('[OpenAI Proxy] Success, tokens:', result.usage?.total_tokens);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(result));
                    } catch (error: any) {
                        console.error('[OpenAI Proxy] Error:', error.message);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            });

            // ============================================
            // Anthropic API Proxy
            // ============================================
            server.middlewares.use('/api/anthropic', (req: any, res: any, next: any) => {
                if (req.method === 'GET' && req.url?.includes('/status')) {
                    res.statusCode = anthropicKey ? 200 : 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ configured: !!anthropicKey }));
                    return;
                }

                if (req.method !== 'POST') {
                    return next();
                }

                if (!anthropicKey) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Anthropic API key not configured. Add VITE_ANTHROPIC_API_KEY to .env' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: any) => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const requestBody = JSON.parse(body);
                        console.log('[Anthropic Proxy] Model:', requestBody.model);

                        const response = await fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'x-api-key': anthropicKey!,
                                'Content-Type': 'application/json',
                                'anthropic-version': '2023-06-01',
                            },
                            body: JSON.stringify(requestBody)
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            console.error('[Anthropic Proxy] Error:', result);
                            res.statusCode = response.status;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(result));
                            return;
                        }

                        console.log('[Anthropic Proxy] Success, tokens:', result.usage?.output_tokens);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(result));
                    } catch (error: any) {
                        console.error('[Anthropic Proxy] Error:', error.message);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            });

            // ============================================
            // Google Gemini API Proxy
            // ============================================
            server.middlewares.use('/api/google', (req: any, res: any, next: any) => {
                if (req.method === 'GET' && req.url?.includes('/status')) {
                    res.statusCode = googleKey ? 200 : 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ configured: !!googleKey }));
                    return;
                }

                if (req.method !== 'POST') {
                    return next();
                }

                if (!googleKey) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Google API key not configured. Add VITE_GOOGLE_API_KEY to .env' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: any) => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const requestBody = JSON.parse(body);
                        const model = requestBody.model || 'gemini-1.5-flash';
                        console.log('[Google Proxy] Model:', model);

                        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`;

                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                contents: requestBody.contents,
                                generationConfig: requestBody.generationConfig,
                            })
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            console.error('[Google Proxy] Error:', result);
                            res.statusCode = response.status;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(result));
                            return;
                        }

                        console.log('[Google Proxy] Success');
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(result));
                    } catch (error: any) {
                        console.error('[Google Proxy] Error:', error.message);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            });

            // ============================================
            // Replicate API Proxy
            // ============================================
            server.middlewares.use('/api/replicate', (req: any, res: any, next: any) => {
                if (req.method !== 'POST') {
                    return next();
                }

                const apiKey = replicateKey;
                console.log('[API Proxy] Request received, API key present:', !!apiKey);

                if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Replicate API token not configured in .env' }));
                    return;
                }

                let body = '';
                req.on('data', (chunk: any) => { body += chunk; });
                req.on('end', async () => {
                    try {
                        const { prompt, model, max_tokens, temperature, system_prompt } = JSON.parse(body);

                        // Use Replicate's model-based API endpoint
                        const modelToUse = model || 'meta/meta-llama-3-70b-instruct';

                        // Handle version if present (owner/model:version)
                        const [modelPath] = modelToUse.split(':');
                        const parts = modelPath.split('/');

                        let owner, name;
                        if (parts.length >= 2) {
                            owner = parts[0];
                            name = parts.slice(1).join('/');
                        } else {
                            console.warn('[API Proxy] Model string missing owner:', modelToUse);
                            owner = 'meta';
                            name = modelToUse;
                        }

                        const apiUrl = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;
                        console.log('[API Proxy] Model:', modelToUse);
                        console.log('[API Proxy] URL:', apiUrl);

                        const fullPrompt = system_prompt ? `${system_prompt}\n\n${prompt}` : prompt;

                        // Build input based on model type
                        const input: Record<string, any> = {
                            prompt: fullPrompt,
                            temperature: temperature || 0.6,
                            top_p: 0.9,
                        };

                        // Add token limits - use max_new_tokens which is most common for recent models
                        const tokenLimit = max_tokens || 2048;
                        input.max_new_tokens = tokenLimit;

                        // Some models need system_prompt separately
                        if (system_prompt) {
                            input.system_prompt = system_prompt;
                        }

                        console.log('[API Proxy] Sending request...');

                        // First request - start prediction
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Token ${apiKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'wait=60'
                            },
                            body: JSON.stringify({ input })
                        });

                        let result = await response.json();
                        console.log('[API Proxy] Response status:', response.status);

                        if (!response.ok) {
                            console.error('[API Proxy] API Error:', JSON.stringify(result, null, 2));

                            let errorMsg = `Model "${modelToUse}" failed. `;
                            if (result.detail) {
                                errorMsg += result.detail;
                            } else if (result.error) {
                                errorMsg += result.error;
                            } else {
                                errorMsg += 'Try a different model like llama-3.1-70b or mixtral-8x7b.';
                            }

                            res.statusCode = response.status;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                error: errorMsg,
                                model: modelToUse,
                                details: result
                            }));
                            return;
                        }

                        console.log('[API Proxy] Prediction status:', result.status);

                        // Poll for completion if not done
                        let pollCount = 0;
                        const maxPolls = 90; // Max 3 minutes of polling (2s intervals)

                        while (result.status === 'starting' || result.status === 'processing') {
                            if (pollCount >= maxPolls) {
                                throw new Error('Generation timed out - try a faster model like llama-3.1-8b');
                            }

                            await new Promise(resolve => setTimeout(resolve, 2000));
                            pollCount++;

                            if (pollCount % 5 === 0) {
                                console.log('[API Proxy] Still waiting...', pollCount * 2, 'seconds');
                            }

                            const pollResponse = await fetch(result.urls.get, {
                                headers: { 'Authorization': `Token ${apiKey}` }
                            });
                            result = await pollResponse.json();
                        }

                        if (result.status === 'failed') {
                            console.error('[API Proxy] Generation failed:', result.error);
                            throw new Error(result.error || 'Generation failed - try a different model');
                        }

                        if (result.status === 'canceled') {
                            throw new Error('Generation was canceled');
                        }

                        // Extract output
                        let output = '';
                        if (result.output) {
                            if (Array.isArray(result.output)) {
                                output = result.output.join('');
                            } else if (typeof result.output === 'string') {
                                output = result.output;
                            } else if (typeof result.output === 'object') {
                                output = result.output.text || result.output.content || JSON.stringify(result.output);
                            }
                        }

                        console.log('[API Proxy] ✓ Success! Output length:', output.length, 'chars');
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ output, raw: result }));
                    } catch (error: any) {
                        console.error('[API Proxy] Error:', error.message);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            });
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
    plugins: [
        react(),
        // Only use apiMiddleware in dev mode (not during build)
        ...(command === 'serve' ? [apiMiddleware()] : []),
        // HTTPS for WebXR development with Meta Quest Link (only when XR_DEV=true)
        ...(command === 'serve' && process.env.XR_DEV === 'true' ? [basicSsl()] : []),
    ],
    // Strip console.log/debug in production to prevent data exposure
    esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
        port: 3000,
        host: true,
        open: true,
        proxy: {
            // Proxy API requests to the backend server
            // Excludes routes handled by apiMiddleware (openai, anthropic, google, replicate)
            '/api/auth': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/canvas': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/marketplace': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/ai': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/upload': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/events': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/jobs': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/payments': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/embed': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/user': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/health': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            '/api/docs': {
                target: 'http://localhost:3010',
                changeOrigin: true,
            },
            // WebSocket proxy
            '/ws': {
                target: 'ws://localhost:3010',
                ws: true,
            },
        },
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks(id: string) {
                    // Keep all node_modules together as 'vendor' to avoid
                    // React import ordering issues (useLayoutEffect undefined errors)
                    if (id.includes('node_modules')) {
                        return 'vendor';
                    }

                    // Split builtin widgets by category
                    if (id.includes('/widgets/builtin/')) {
                        if (id.includes('/commerce/')) return 'widgets-commerce';
                        if (id.includes('/social/')) return 'widgets-social';
                        if (id.includes('/automation/')) return 'widgets-automation';
                        if (id.includes('/signin/')) return 'widgets-signin';
                        if (id.includes('/grocery/')) return 'widgets-grocery';
                        if (id.includes('/halo/')) return 'widgets-halo';
                        if (id.includes('/wizards/')) return 'widgets-wizards';
                        // Split large core widgets individually
                        if (id.includes('JitsiMeetWidget')) return 'widgets-jitsi';
                        if (id.includes('ShelfWidget')) return 'widgets-shelf';
                        if (id.includes('SignalTesterWidget')) return 'widgets-signal';
                        if (id.includes('BubbleHunterWidget')) return 'widgets-bubbles';
                        if (id.includes('BubblesWidget')) return 'widgets-bubbles';
                        if (id.includes('RetroTVWidget')) return 'widgets-media';
                        if (id.includes('WebcamWidget')) return 'widgets-media';
                        if (id.includes('TextToolWidgetV2')) return 'widgets-design-v2';
                        if (id.includes('ShapeToolWidgetV2')) return 'widgets-design-v2';
                        if (id.includes('ImageToolWidgetV2')) return 'widgets-design-v2';
                        if (id.includes('TikTokPlaylistWidget')) return 'widgets-tiktok';
                        if (id.includes('AIBrainWidget')) return 'widgets-ai';
                        if (id.includes('ContainerWidget')) return 'widgets-container';
                        if (id.includes('CollaboratorListWidget')) return 'widgets-collab';
                        if (id.includes('ViewSwitcherWidget')) return 'widgets-collab';
                        if (id.includes('OBSControlWidget')) return 'widgets-stream';
                        if (id.includes('StreamAlertWidget')) return 'widgets-stream';
                        if (id.includes('ViewerCountWidget')) return 'widgets-stream';
                        // Remaining core widgets
                        return 'widgets-core';
                    }

                    // Split other widget directories
                    if (id.includes('/widgets/FormFlow')) return 'widgets-formflow';
                    if (id.includes('/widgets/BusinessCardLayout')) return 'widgets-businesscard';
                    if (id.includes('/widgets/ImageGenPipeline')) return 'widgets-imagegen';
                    if (id.includes('/widgets/PreviewExport')) return 'widgets-preview';
                    if (id.includes('/widgets/DashboardBuilder')) return 'widgets-dashboard';

                    // Split AI modules
                    if (id.includes('/src/ai/')) {
                        return 'ai-core';
                    }

                    // Split runtime
                    if (id.includes('/src/runtime/')) {
                        return 'runtime';
                    }

                    // Don't group pages - let Vite handle lazy-loading naturally
                },
            },
        },
        chunkSizeWarningLimit: 600,
    },
    publicDir: 'public',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        },
        dedupe: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei', '@react-three/xr']
    },
    optimizeDeps: {
        include: [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/xr',
            'react-reconciler'
        ],
        esbuildOptions: {
            // Ensure consistent handling of these packages
            target: 'esnext'
        }
    }
}))
