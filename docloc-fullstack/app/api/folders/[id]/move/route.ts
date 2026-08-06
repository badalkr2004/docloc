import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { folderService } from '@/lib/services/folder.service';
import { moveFolderSchema } from '@/lib/schemas/folder.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = moveFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await folderService.move(id, session.user.id, parsed.data.parentId);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error moving folder' }, { status: 400 });
  }
}
