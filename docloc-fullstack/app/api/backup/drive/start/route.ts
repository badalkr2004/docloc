import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import {
  createDriveFolder,
  getValidAccessToken,
  isGoogleDriveConfigured,
} from '@/lib/server/google-drive';
import { db } from '@/lib/db';
import { vaultBackups } from '@/lib/db/schema';
import { rateLimiter } from '@/lib/server/rate-limiter';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json({ error: 'Google Drive is not configured' }, { status: 503 });
  }

  const allowed = await rateLimiter.check(
    `drive-backup-start:${session.user.id}`,
    20,
    60 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json({ error: 'Too many backup attempts' }, { status: 429 });
  }

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const label = `Docloc Backup ${stamp}`;

    const accessToken = await getValidAccessToken(session.user.id);
    const folder = await createDriveFolder(accessToken, label);

    const [backup] = await db
      .insert(vaultBackups)
      .values({
        userId: session.user.id,
        provider: 'google_drive',
        label,
        driveFolderId: folder.id,
        driveFolderUrl: folder.webViewLink || null,
        status: 'uploading',
      })
      .returning();

    return NextResponse.json({
      backupId: backup.id,
      folderId: folder.id,
      folderUrl: folder.webViewLink || null,
      label,
    });
  } catch (err: any) {
    console.error('Backup start error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to start backup' },
      { status: 500 }
    );
  }
}
