/**
 * StickerNest v2 - ManifestAI
 * AI-powered manifest generation using Gemini via Replicate HTTP API
 * Analyzes widget bundles and generates valid manifest.json files
 */

import type { WidgetManifest } from '../types/manifest';
import type { WidgetKind } from '../types/domain';

/** Result from manifest generation */
export interface ManifestGenerationResult {
  success: boolean;
  manifest?: WidgetManifest;
  suggestions?: ManifestSuggestions;
  errors?: string[];
  rawResponse?: string;
}

/** AI suggestions for manifest fields */
export interface ManifestSuggestions {
  id: string;
  name: string;
  version: string;
  entry: string;
  kind: WidgetKind;
  capabilities: {
    draggable: boolean;
    resizable: boolean;
    rotatable?: boolean;
  };
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  assets?: string[];
  sandbox?: boolean;
  reasoning: string;
}

/** File content for AI analysis */
interface FileContent {
  path: string;
  content: string;
  size: number;
}

const MAX_FILE_SIZE = 50000;
const MAX_TOTAL_CONTENT = 200000;
const GEMINI_MODEL = 'google-deepmind/gemini-2.0-flash-exp:a8c8e4c4e5e6b8e3e5e8e5e8e5e8e5e8';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

/**
 * Generate a manifest from widget bundle files using Gemini
 */
export async function generateManifestFromBundle(
  files: File[],
  model?: string
): Promise<ManifestGenerationResult> {
  try {
    const fileContents = await prepareFileContents(files);

    if (fileContents.length === 0) {
      return {
        success: false,
        errors: ['No readable files found in bundle'],
      };
    }

    const prompt = buildManifestPrompt(fileContents);
    const response = await runGeminiManifestInference(prompt, model);

    if (!response) {
      return {
        success: false,
        errors: ['Failed to get response from Gemini API'],
      };
    }

    return parseManifestResponse(response, fileContents);
  } catch (error) {
    return {
      success: false,
      errors: [`Manifest generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Prepare file contents for AI analysis
 */
async function prepareFileContents(files: File[]): Promise<FileContent[]> {
  const contents: FileContent[] = [];
  let totalSize = 0;

  const priorityOrder = [
    'manifest.json',
    'package.json',
    'index.html',
    'index.tsx',
    'index.ts',
    'index.js',
    'main.tsx',
    'main.ts',
    'main.js',
    'app.tsx',
    'app.ts',
    'app.js'
  ];

  const sortedFiles = [...files].sort((a, b) => {
    const aName = getFileName(a).toLowerCase();
    const bName = getFileName(b).toLowerCase();
    const aIndex = priorityOrder.findIndex(p => aName.endsWith(p));
    const bIndex = priorityOrder.findIndex(p => bName.endsWith(p));

    if (aIndex !== -1 && bIndex === -1) return -1;
    if (bIndex !== -1 && aIndex === -1) return 1;
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    return 0;
  });

  for (const file of sortedFiles) {
    if (isBinaryFile(file)) continue;
    if (file.size > MAX_FILE_SIZE * 2) continue;
    if (totalSize >= MAX_TOTAL_CONTENT) break;

    try {
      let content = await file.text();
      const path = getFileName(file);

      if (content.length > MAX_FILE_SIZE) {
        content = content.substring(0, MAX_FILE_SIZE) + '\n... (truncated)';
      }

      if (totalSize + content.length > MAX_TOTAL_CONTENT) {
        content = content.substring(0, MAX_TOTAL_CONTENT - totalSize) + '\n... (truncated)';
      }

      contents.push({
        path,
        content,
        size: file.size
      });

      totalSize += content.length;
    } catch {
      // Skip unreadable files
    }
  }

  return contents;
}

/**
 * Get file name handling webkitRelativePath
 */
function getFileName(file: File): string {
  const relativePath = (file as any).webkitRelativePath;
  if (relativePath) {
    const parts = relativePath.split('/');
    return parts.length > 1 ? parts.slice(1).join('/') : file.name;
  }
  return file.name;
}

/**
 * Check if file is binary
 */
function isBinaryFile(file: File): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
    '.mp3', '.mp4', '.wav', '.ogg', '.webm',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.zip', '.tar', '.gz', '.rar',
    '.pdf', '.doc', '.docx',
    '.exe', '.dll', '.so', '.dylib'
  ];

  const name = file.name.toLowerCase();
  return binaryExtensions.some(ext => name.endsWith(ext));
}

/**
 * Build the prompt for Gemini to analyze the bundle
 */
function buildManifestPrompt(files: FileContent[]): string {
  const fileList = files.map(f => `- ${f.path} (${f.size} bytes)`).join('\n');
  const fileContents = files.map(f =>
    `=== ${f.path} ===\n${f.content}\n`
  ).join('\n');

  return `You are analyzing a widget bundle for StickerNest, a widget-based canvas application. Your task is to generate a valid manifest.json file based on the bundle contents.

## Widget Bundle Files
${fileList}

## File Contents
${fileContents}

## Manifest Schema
The manifest.json must follow this exact schema:
\`\`\`typescript
interface WidgetManifest {
  id: string;           // lowercase alphanumeric with hyphens only (e.g., "my-widget")
  name: string;         // Human-readable name
  version: string;      // Semver format (e.g., "1.0.0")
  entry: string;        // Entry file path (must exist in files)
  kind: "2d" | "3d" | "audio" | "video" | "hybrid";
  capabilities: {
    draggable: boolean; // Can widget be dragged?
    resizable: boolean; // Can widget be resized?
    rotatable?: boolean; // Can widget be rotated?
  };
  inputs?: Record<string, any>;   // Optional input ports
  outputs?: Record<string, any>;  // Optional output ports
  assets?: string[];              // Optional additional asset files
}
\`\`\`

## Kind Detection Rules
- "2d": HTML/CSS/Canvas 2D widgets, React components without 3D
- "3d": Three.js, WebGL, 3D rendering
- "audio": Audio players, visualizers, music widgets
- "video": Video players, streaming widgets
- "hybrid": Combinations of multiple types

## Your Task
Analyze the files and determine:
1. The most appropriate entry file (index.html, main.js, index.tsx, etc.)
2. Widget kind based on imports and code patterns
3. Capabilities based on code analysis
4. A suitable id and name
5. Version (default to "1.0.0" if not found)
6. Any additional asset files that should be included

Respond with a JSON object in this exact format:
\`\`\`json
{
  "manifest": {
    "id": "suggested-id",
    "name": "Widget Name",
    "version": "1.0.0",
    "entry": "index.html",
    "kind": "2d",
    "capabilities": {
      "draggable": true,
      "resizable": true,
      "rotatable": false
    },
    "assets": []
  },
  "reasoning": "Brief explanation of why you made these choices"
}
\`\`\`

IMPORTANT: Only respond with the JSON object, no additional text.`;
}

/**
 * Call Gemini API via Replicate HTTP API for manifest inference
 */
async function runGeminiManifestInference(prompt: string, model?: string): Promise<string | null> {
  const apiKey = (import.meta as any).env?.VITE_REPLICATE_API_TOKEN;

  if (!apiKey) {
    console.error('No Replicate API key available. Set VITE_REPLICATE_API_TOKEN in .env');
    return generateMockResponse(prompt);
  }

  try {
    const useModel = model || GEMINI_MODEL;

    // Create prediction
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: useModel.split(':')[1], // Extract version ID
        input: {
          prompt: prompt,
          max_tokens: 2000,
          temperature: 0.3,
        }
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create prediction: ${createResponse.status}`);
    }

    const prediction = await createResponse.json();
    const predictionUrl = prediction.urls?.get || `${REPLICATE_API_URL}/${prediction.id}`;

    // Poll for result
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await fetch(predictionUrl, {
        headers: {
          'Authorization': `Token ${apiKey}`,
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to get prediction status: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();

      if (status.status === 'succeeded') {
        result = status.output;
        break;
      } else if (status.status === 'failed') {
        throw new Error(`Prediction failed: ${status.error}`);
      }

      attempts++;
    }

    if (!result) {
      throw new Error('Prediction timed out');
    }

    // Replicate returns output as an array of strings
    if (Array.isArray(result)) {
      return result.join('');
    } else if (typeof result === 'string') {
      return result;
    }

    return null;
  } catch (error) {
    console.error('Gemini API call via Replicate failed:', error);
    return generateMockResponse(prompt);
  }
}

/**
 * Generate a mock response for development when API is unavailable
 */
function generateMockResponse(prompt: string): string {
  const fileMatch = prompt.match(/## Widget Bundle Files\n([\s\S]*?)## File Contents/);
  const files = fileMatch ? fileMatch[1].trim().split('\n').map(f => f.replace(/^- /, '').split(' ')[0]) : [];

  let entry = 'index.html';
  const entryPriority = ['index.html', 'index.tsx', 'index.ts', 'index.js', 'main.tsx', 'main.ts', 'main.js'];
  for (const e of entryPriority) {
    if (files.some(f => f.toLowerCase().endsWith(e))) {
      entry = files.find(f => f.toLowerCase().endsWith(e)) || e;
      break;
    }
  }

  let kind: WidgetKind = '2d';
  if (files.some(f => f.includes('three') || prompt.includes('three.js') || prompt.includes('THREE'))) {
    kind = '3d';
  } else if (files.some(f => f.includes('audio') || prompt.includes('AudioContext'))) {
    kind = 'audio';
  } else if (files.some(f => f.includes('video') || prompt.includes('<video'))) {
    kind = 'video';
  }

  const idBase = files[0]?.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'widget';
  const id = idBase.substring(0, 30);
  const name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const assets = files.filter(f =>
    f.endsWith('.css') ||
    f.endsWith('.png') ||
    f.endsWith('.jpg') ||
    f.endsWith('.svg')
  ).filter(f => f !== entry);

  return JSON.stringify({
    manifest: {
      id,
      name,
      version: '1.0.0',
      entry,
      kind,
      capabilities: {
        draggable: true,
        resizable: true,
        rotatable: false
      },
      assets: assets.length > 0 ? assets : undefined
    },
    reasoning: 'Mock response generated for development. Connect Replicate API with Gemini for production inference.'
  }, null, 2);
}

/**
 * Parse Gemini's response into a manifest result
 */
function parseManifestResponse(response: string, files: FileContent[]): ManifestGenerationResult {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.manifest) {
      return {
        success: false,
        errors: ['Invalid response format: missing manifest object'],
        rawResponse: response
      };
    }

    const manifest = parsed.manifest as WidgetManifest;
    const fileNames = files.map(f => f.path);

    const validationErrors = validateGeneratedManifest(manifest, fileNames);

    if (validationErrors.length > 0) {
      return {
        success: false,
        manifest,
        suggestions: {
          ...manifest,
          reasoning: parsed.reasoning || 'No reasoning provided'
        },
        errors: validationErrors,
        rawResponse: response
      };
    }

    const finalManifest: WidgetManifest = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version || '1.0.0',
      entry: manifest.entry,
      kind: manifest.kind,
      capabilities: {
        draggable: manifest.capabilities?.draggable ?? true,
        resizable: manifest.capabilities?.resizable ?? true,
        rotatable: manifest.capabilities?.rotatable ?? false
      },
      inputs: manifest.inputs || {},
      outputs: manifest.outputs || {},
      assets: manifest.assets
    };

    return {
      success: true,
      manifest: finalManifest,
      suggestions: {
        ...finalManifest,
        reasoning: parsed.reasoning || 'Manifest generated successfully'
      },
      rawResponse: response
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`],
      rawResponse: response
    };
  }
}

/**
 * Validate the generated manifest
 */
function validateGeneratedManifest(manifest: any, fileNames: string[]): string[] {
  const errors: string[] = [];

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Missing or invalid id');
  } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push('ID must contain only lowercase letters, numbers, and hyphens');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Missing or invalid version');
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push('Version must follow semver format (e.g., "1.0.0")');
  }

  if (!manifest.entry || typeof manifest.entry !== 'string') {
    errors.push('Missing or invalid entry');
  } else if (!fileNames.includes(manifest.entry)) {
    errors.push(`Entry file "${manifest.entry}" not found in bundle files`);
  }

  const validKinds = ['2d', '3d', 'audio', 'video', 'hybrid'];
  if (!manifest.kind || !validKinds.includes(manifest.kind)) {
    errors.push(`Invalid kind. Must be one of: ${validKinds.join(', ')}`);
  }

  if (!manifest.capabilities || typeof manifest.capabilities !== 'object') {
    errors.push('Missing capabilities object');
  } else {
    if (typeof manifest.capabilities.draggable !== 'boolean') {
      errors.push('capabilities.draggable must be a boolean');
    }
    if (typeof manifest.capabilities.resizable !== 'boolean') {
      errors.push('capabilities.resizable must be a boolean');
    }
  }

  if (manifest.assets && Array.isArray(manifest.assets)) {
    for (const asset of manifest.assets) {
      if (!fileNames.includes(asset)) {
        errors.push(`Asset "${asset}" not found in bundle files`);
      }
    }
  }

  return errors;
}

/**
 * Validate an existing manifest against the schema
 */
export function validateManifest(manifest: any, fileNames?: string[]): string[] {
  return validateGeneratedManifest(manifest, fileNames || []);
}
