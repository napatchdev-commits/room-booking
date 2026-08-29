import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const bucketName = (formData.get('bucket') as string) || 'room-images';

    if (!files || files.length === 0) {
      // Check if single 'file' was sent
      const singleFile = formData.get('file') as File | null;
      if (singleFile) {
        files.push(singleFile);
      } else {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
      }
    }

    const supabase = getAdminClient();
    const uploadedUrls: string[] = [];

    // Ensure bucket exists or handle upload
    for (const file of files) {
      if (!file || typeof file.arrayBuffer !== 'function') continue;

      const buffer = await file.arrayBuffer();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${cleanFileName}`;

      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });

        if (error) {
          console.warn(`Storage upload warning for ${file.name}:`, error.message);
          // If storage bucket isn't set up yet, fallback to high-quality Base64 Data URL so user is NEVER blocked!
          const base64 = Buffer.from(buffer).toString('base64');
          const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
          uploadedUrls.push(dataUrl);
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl);
          } else {
            const base64 = Buffer.from(buffer).toString('base64');
            uploadedUrls.push(`data:${file.type || 'image/jpeg'};base64,${base64}`);
          }
        }
      } catch (uploadErr) {
        console.error('File upload error, using fallback:', uploadErr);
        const base64 = Buffer.from(buffer).toString('base64');
        uploadedUrls.push(`data:${file.type || 'image/jpeg'};base64,${base64}`);
      }
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload files' }, { status: 500 });
  }
}
