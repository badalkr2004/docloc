import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { bucketService } from '@/lib/services/bucket.service';
import { addDocumentToBucketSchema } from '@/lib/schemas/bucket.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = addDocumentToBucketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  await bucketService.addDocument(id, parsed.data.documentId, session.user.id);
  return NextResponse.json({ success: true });
}
