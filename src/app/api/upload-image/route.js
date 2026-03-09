import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/supabase';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const filename = formData.get('filename');

    if (!file || !filename) {
      return NextResponse.json({ success: false, error: 'Missing file or filename' }, { status: 400 });
    }

    const { url, error } = await uploadImage(file, filename);

    if (error) throw error;
    
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[Upload Image API Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
