import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { shareService } from '@/lib/services/share.service';
import { auditService } from '@/lib/services/audit.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await shareService.revoke(id, session.user.id);
    await auditService.log({
      action: 'revoke',
      actorUserId: session.user.id,
      shareGrantId: id,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error revoking grant' }, { status: 400 });
  }
}
