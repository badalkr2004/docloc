import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { auditService } from '@/lib/services/audit.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const result = await auditService.getByDocument(id, session.user.id, page, limit);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching audit logs' }, { status: 400 });
  }
}
