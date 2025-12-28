import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'UserWidgets';

async function debugBucket() {
    console.log('Debugging UserWidgets bucket...');

    try {
        // List root of bucket
        console.log('Listing root of UserWidgets...');
        const { data: rootData, error: rootError } = await supabase.storage
            .from(BUCKET_NAME)
            .list();

        if (rootError) {
            console.error('Error listing root:', rootError);
        } else {
            console.log('Root contents:', rootData);
        }

        // List demo-user-123 folder
        console.log('\nListing demo-user-123 folder...');
        const { data: userData, error: userError } = await supabase.storage
            .from(BUCKET_NAME)
            .list('demo-user-123');

        if (userError) {
            console.error('Error listing user folder:', userError);
        } else {
            console.log('User folder contents:', userData);
        }

        // List demo-user-123/manifest folder
        console.log('\nListing demo-user-123/manifest folder...');
        const { data: manifestData, error: manifestError } = await supabase.storage
            .from(BUCKET_NAME)
            .list('demo-user-123/manifest');

        if (manifestError) {
            console.error('Error listing manifest folder:', manifestError);
        } else {
            console.log('Manifest folder contents:', manifestData);
        }

        // Download manifest.json from demo-user-123/manifest/1.0.0/manifest.json
        console.log('\nDownloading manifest.json...');
        const { data: fileData, error: fileError } = await supabase.storage
            .from(BUCKET_NAME)
            .download('demo-user-123/manifest/1.0.0/manifest.json');

        if (fileError) {
            console.error('Error downloading manifest:', fileError);
        } else {
            const text = await fileData.text();
            console.log('Manifest content:', text);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

debugBucket();
