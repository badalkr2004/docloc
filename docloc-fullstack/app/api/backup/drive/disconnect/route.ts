import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { disconnectDrive } from '@/lib/server/google-drive';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await disconnectDrive(session.user.id);
  return NextResponse.json({ success: true });
}
