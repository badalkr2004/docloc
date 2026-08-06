import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { shareService } from '@/lib/services/share.service';
import { auditService } from '@/lib/services/audit.service';
import { createShareGrantSchema } from '@/lib/schemas/share.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = createShareGrantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await shareService.createGrant(session.user.id, { ...parsed.data, cartId: id });
  
  await auditService.log({
    action: 'share',
    actorUserId: session.user.id,
    shareGrantId: result.shareGrant.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return NextResponse.json(result, { status: 201 });
}
