import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { documentService } from '@/lib/services/document.service';
import { auditService } from '@/lib/services/audit.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await documentService.getPresignedDownloadUrl(id, session.user.id);

  await auditService.log({
    action: 'download',
    actorUserId: session.user.id,
    documentId: id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(result);
}
