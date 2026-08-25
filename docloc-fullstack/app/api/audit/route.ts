export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { auditService } from '@/lib/services/audit.service';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const result = await auditService.getByUser(session.user.id, page, limit);
  return NextResponse.json(result);
}

