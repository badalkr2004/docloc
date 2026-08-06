import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { bucketService } from '@/lib/services/bucket.service';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, docId } = await params;
  await bucketService.removeDocument(id, docId, session.user.id);
  return NextResponse.json({ success: true });
}
