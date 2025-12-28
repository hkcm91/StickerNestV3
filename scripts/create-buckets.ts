/**
 * Create Supabase Storage Buckets
 * Run this script to create the required storage buckets for StickerNest
 */

import { supabaseClient } from '../src/services/supabaseClient.js';

async function createBuckets() {
    console.log('Creating Supabase storage buckets...');

    try {
        // Create 'widgets' bucket
        const { data: widgetsData, error: widgetsError } = await supabaseClient.storage.createBucket('widgets', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: [
                'application/json',
                'text/javascript',
                'application/javascript',
                'text/css',
                'text/html',
                'image/png',
                'image/jpeg',
                'image/svg+xml',
                'image/gif',
                'image/webp',
                'application/zip',
                'text/plain',
                'text/markdown'
            ]
        });

        if (widgetsError) {
            if (widgetsError.message.includes('already exists')) {
                console.log('✓ Bucket "widgets" already exists');
            } else {
                throw widgetsError;
            }
        } else {
            console.log('✓ Created bucket "widgets"');
        }

        // Create 'official-widgets' bucket
        const { data: officialData, error: officialError } = await supabaseClient.storage.createBucket('official-widgets', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: [
                'application/json',
                'text/javascript',
                'application/javascript',
                'text/css',
                'text/html',
                'image/png',
                'image/jpeg',
                'image/svg+xml',
                'image/gif',
                'image/webp',
                'application/zip',
                'text/plain',
                'text/markdown'
            ]
        });

        if (officialError) {
            if (officialError.message.includes('already exists')) {
                console.log('✓ Bucket "official-widgets" already exists');
            } else {
                throw officialError;
            }
        } else {
            console.log('✓ Created bucket "official-widgets"');
        }

        console.log('\n✅ All buckets created successfully!');
        console.log('\nYou can now upload widgets to Supabase Storage.');

    } catch (error) {
        console.error('❌ Error creating buckets:', error);
        console.log('\nPlease create the buckets manually in the Supabase dashboard:');
        console.log('1. Go to: https://supabase.com/dashboard/project/tkcmownuuxwauzndtdqi/storage/buckets');
        console.log('2. Click "New Bucket"');
        console.log('3. Create bucket named "widgets" with Public access enabled');
        console.log('4. Create bucket named "official-widgets" with Public access enabled');
    }
}

createBuckets();
