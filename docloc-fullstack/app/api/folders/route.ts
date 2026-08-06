import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { folderService } from '@/lib/services/folder.service';
import { createFolderSchema } from '@/lib/schemas/folder.schema';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId');
  const folders = await folderService.list(session.user.id, parentId);
  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const folder = await folderService.create(session.user.id, parsed.data);
    return NextResponse.json(folder, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating folder' }, { status: 400 });
  }
}
