import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WidgetManifest } from '../types/manifest';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper function to validate URL format
const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

// Check if we're in local dev mode (no Supabase configured or invalid URL)
const hasValidUrl = isValidUrl(SUPABASE_URL);
const hasValidKey = !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() !== '';

export const isLocalDevMode = !hasValidUrl || !hasValidKey;

// Debug log
console.log('[Supabase] isLocalDevMode:', isLocalDevMode, 'URL:', hasValidUrl ? 'valid' : SUPABASE_URL ? 'invalid' : 'not set');

// Create a mock or real client based on environment
export const supabaseClient: SupabaseClient | null = isLocalDevMode
    ? null
    : createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

export const BUCKETS = {
    WIDGETS: 'UserWidgets',
    OFFICIAL_WIDGETS: 'SystemWidgets'
};

export interface UploadResult {
    path: string;
    error: any;
}

/**
 * Upload a widget bundle (manifest + files) to Supabase Storage
 */
export const uploadWidgetBundle = async (
    userId: string,
    manifest: WidgetManifest,
    files: File[]
): Promise<{ success: boolean; error?: any }> => {
    if (isLocalDevMode || !supabaseClient) {
        console.warn('[Local Dev Mode] Upload skipped - no Supabase configured');
        return { success: false, error: 'Local dev mode - uploads disabled' };
    }

    const widgetId = manifest.id;
    const version = manifest.version;
    const basePath = `${userId}/${widgetId}/${version}`;

    try {
        // Upload each file
        const uploadPromises = files.map(async (file) => {
            let filePath = file.name;
            if (file.webkitRelativePath) {
                const parts = file.webkitRelativePath.split('/');
                if (parts.length > 1) {
                    filePath = parts.slice(1).join('/');
                }
            }

            const fullPath = `${basePath}/${filePath}`;

            const { error } = await supabaseClient.storage
                .from(BUCKETS.WIDGETS)
                .upload(fullPath, file, {
                    upsert: true,
                    contentType: file.type || 'application/octet-stream'
                });

            if (error) throw error;
            return fullPath;
        });

        await Promise.all(uploadPromises);

        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const { error: manifestError } = await supabaseClient.storage
            .from(BUCKETS.WIDGETS)
            .upload(`${basePath}/manifest.json`, manifestBlob, {
                upsert: true,
                contentType: 'application/json'
            });

        if (manifestError) throw manifestError;

        return { success: true };
    } catch (error) {
        console.error('Upload failed:', error);
        return { success: false, error };
    }
};

/**
 * Fetch a widget manifest from storage
 */
export const fetchWidgetManifest = async (
    bucket: string,
    path: string
): Promise<WidgetManifest | null> => {
    if (isLocalDevMode || !supabaseClient) {
        return null;
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .download(path);

        if (error) throw error;
        if (!data) return null;

        const text = await data.text();
        return JSON.parse(text) as WidgetManifest;
    } catch (error) {
        console.warn(`Failed to fetch manifest from ${bucket}/${path}:`, error);
        return null;
    }
};

/**
 * List widgets for a user
 * Returns a list of widget IDs (folder names)
 */
export const listUserWidgets = async (userId: string): Promise<string[]> => {
    if (isLocalDevMode || !supabaseClient) {
        return [];
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKETS.WIDGETS)
            .list(userId);

        if (error) throw error;

        // Filter for folders (widgets)
        return data?.map((item: any) => item.name) || [];
    } catch (error) {
        console.error('Failed to list user widgets:', error);
        return [];
    }
};

/**
 * List official widgets
 */
export const listOfficialWidgets = async (): Promise<string[]> => {
    if (isLocalDevMode || !supabaseClient) {
        return [];
    }

    try {
        const { data, error } = await supabaseClient.storage
            .from(BUCKETS.OFFICIAL_WIDGETS)
            .list();

        if (error) throw error;
        return data?.map((item: any) => item.name) || [];
    } catch (error) {
        console.error('Failed to list official widgets:', error);
        return [];
    }
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: string, path: string): string => {
    if (isLocalDevMode || !supabaseClient) {
        return '';
    }
    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};
