import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { getValidAccessToken, listBackupFolders } from '@/lib/server/google-drive';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = await getValidAccessToken(session.user.id);
    const folders = await listBackupFolders(token);
    return NextResponse.json({ folders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to list backups' },
      { status: 500 }
    );
  }
}
