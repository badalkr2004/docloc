import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { documentService } from '@/lib/services/document.service';
import { auditService } from '@/lib/services/audit.service';
import { updateDocumentSchema } from '@/lib/schemas/document.schema';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const doc = await documentService.getById(id, session.user.id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await auditService.log({
    action: 'view',
    actorUserId: session.user.id,
    documentId: id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await documentService.update(id, session.user.id, parsed.data);

  await auditService.log({
    action: 'edit_metadata',
    actorUserId: session.user.id,
    documentId: id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await documentService.softDelete(id, session.user.id);

  await auditService.log({
    action: 'delete',
    actorUserId: session.user.id,
    documentId: id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json({ success: true });
}
