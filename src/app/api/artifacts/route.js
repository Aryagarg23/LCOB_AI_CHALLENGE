import { uploadArtifact, listArtifacts } from '@/lib/supabase';

export async function POST(req) {
  try {
    const { content, filename } = await req.json();

    if (!content || !filename) {
      return new Response(JSON.stringify({ success: false, error: 'Content and filename required' }), { status: 400 });
    }

    const { url, error } = await uploadArtifact(content, filename);

    if (error) {
      throw new Error(error);
    }

    return new Response(JSON.stringify({ success: true, url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API Artifacts Error]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req) {
  try {
    const { data, error } = await listArtifacts();

    if (error) {
      throw new Error(error);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API Artifacts Error]', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
