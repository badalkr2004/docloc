import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { folderService } from '@/lib/services/folder.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const breadcrumbs = await folderService.getBreadcrumbs(id, session.user.id);
  return NextResponse.json(breadcrumbs);
}
