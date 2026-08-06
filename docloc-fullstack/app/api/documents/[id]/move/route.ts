import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { documentService } from '@/lib/services/document.service';
import { moveDocumentToFolderSchema } from '@/lib/schemas/folder.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = moveDocumentToFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await documentService.moveToFolder(id, session.user.id, parsed.data.folderId);
  return NextResponse.json(updated);
}
