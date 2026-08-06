import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { documentService } from '@/lib/services/document.service';
import { auditService } from '@/lib/services/audit.service';
import { createDocumentSchema, searchDocumentsSchema } from '@/lib/schemas/document.schema';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = searchDocumentsSchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await documentService.list(session.user.id, parsed.data);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await documentService.create(session.user.id, parsed.data);

  await auditService.log({
    action: 'upload',
    actorUserId: session.user.id,
    documentId: result.document.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(result, { status: 201 });
}
