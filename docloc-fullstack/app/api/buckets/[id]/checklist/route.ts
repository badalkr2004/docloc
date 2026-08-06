import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { bucketService } from '@/lib/services/bucket.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await bucketService.getChecklist(id, session.user.id);
  return NextResponse.json(result);
}
