import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { shareService } from '@/lib/services/share.service';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const grants = await shareService.listGrantsByUser(session.user.id);
    return NextResponse.json(grants);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching grants' }, { status: 500 });
  }
}
