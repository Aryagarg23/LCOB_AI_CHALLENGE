import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Uploads markdown text to a Supabase storage bucket called "artifacts"
 * @param {string} content - Markdown content of the strategy report
 * @param {string} filename - Filename to save as (e.g., 'report-123.md')
 * @returns {Promise<{url: string|null, error: any}>}
 */
export async function uploadArtifact(content, filename) {
  try {
    const { data, error } = await supabase.storage
      .from('artifacts')
      .upload(filename, content, {
        contentType: 'text/markdown',
        upsert: true,
      });

    if (error) throw error;

    // Get the public URL for the newly uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('artifacts')
      .getPublicUrl(filename);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err) {
    console.error('Error uploading artifact to Supabase:', err);
    return { url: null, error: err.message };
  }
}

/**
 * Uploads an image file to a Supabase storage bucket called "artifacts"
 * @param {File} file - The physical file object from the browser
 * @param {string} filename - Filename to save as (e.g., 'photo-123.jpg')
 * @returns {Promise<{url: string|null, error: any}>}
 */
export async function uploadImage(file, filename) {
  try {
    const { data, error } = await supabase.storage
      .from('artifacts')
      .upload(`images/${filename}`, file, {
        upsert: true,
      });

    if (error) throw error;

    // Get the public URL for the newly uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('artifacts')
      .getPublicUrl(`images/${filename}`);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err) {
    console.error('Error uploading image to Supabase:', err);
    return { url: null, error: err.message };
  }
}

/**
 * Lists all artifacts available in the "artifacts" bucket
 */
export async function listArtifacts() {
  try {
    const { data, error } = await supabase.storage
      .from('artifacts')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      
    if (error) throw error;
    
    // Fetch public URLs mapping
    const artifactsWithUrls = data
      .filter(file => file.name.endsWith('.md'))
      .map(file => {
        const { data: publicUrlData } = supabase.storage
          .from('artifacts')
          .getPublicUrl(file.name);
        return {
          ...file,
          publicUrl: publicUrlData.publicUrl
        };
      });
      
    return { data: artifactsWithUrls, error: null };
  } catch (err) {
    console.error('Error listing artifacts:', err);
    return { data: [], error: err.message };
  }
}
