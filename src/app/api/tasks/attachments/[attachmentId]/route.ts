import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabaseServer';

const MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  txt: 'text/plain; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  json: 'application/json',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;
    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    }

    // 1. Fetch attachment metadata from database
    const { data: attachment, error: attError } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (attError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    let fileBuffer: ArrayBuffer | null = null;
    let contentType: string | null = attachment.file_type || null;

    // 2. Attempt to retrieve from Supabase Storage bucket
    if (attachment.file_url) {
      let storagePath = attachment.file_url;
      if (storagePath.includes('/task-attachments/')) {
        storagePath = storagePath.split('/task-attachments/')[1];
      }
      try {
        storagePath = decodeURIComponent(storagePath);
      } catch {}

      const { data: storageData, error: storageError } = await supabase.storage
        .from('task-attachments')
        .download(storagePath);

      if (storageData && !storageError) {
        fileBuffer = await storageData.arrayBuffer();
        if (!contentType) {
          contentType = storageData.type || null;
        }
      }
    }

    // 3. Fallback: If direct download failed, fetch via file_url if HTTP
    if (!fileBuffer && attachment.file_url && attachment.file_url.startsWith('http')) {
      try {
        const fetchRes = await fetch(attachment.file_url);
        if (fetchRes.ok) {
          fileBuffer = await fetchRes.arrayBuffer();
          if (!contentType) {
            contentType = fetchRes.headers.get('content-type');
          }
        }
      } catch (fetchErr) {
        console.error('Failed fallback fetch for attachment:', fetchErr);
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'Attachment content could not be retrieved' }, { status: 404 });
    }

    // 4. Resolve correct Content-Type from extension if needed
    if (!contentType || contentType === 'application/octet-stream') {
      const ext = (attachment.file_name || '').split('.').pop()?.toLowerCase();
      if (ext && MIME_MAP[ext]) {
        contentType = MIME_MAP[ext];
      } else {
        contentType = 'application/octet-stream';
      }
    }

    // 5. Determine inline viewing vs direct download
    const url = new URL(req.url);
    const isDownload = url.searchParams.get('download') === '1';
    const disposition = isDownload ? 'attachment' : 'inline';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(attachment.file_name)}"`
    );
    headers.set('Cache-Control', 'private, max-age=86400, stale-while-revalidate=43200');
    headers.set('Content-Length', String(fileBuffer.byteLength));

    return new Response(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    console.error('Error serving attachment proxy:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
