import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import {
  getDriveConnection,
  isGoogleDriveConfigured,
} from '@/lib/server/google-drive';
import { db } from '@/lib/db';
import { vaultBackups } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const configured = isGoogleDriveConfigured();
  const conn = configured ? await getDriveConnection(session.user.id) : null;

  const backups = await db
    .select({
      id: vaultBackups.id,
      label: vaultBackups.label,
      documentCount: vaultBackups.documentCount,
      totalBytes: vaultBackups.totalBytes,
      status: vaultBackups.status,
      driveFolderUrl: vaultBackups.driveFolderUrl,
      createdAt: vaultBackups.createdAt,
      completedAt: vaultBackups.completedAt,
      errorMessage: vaultBackups.errorMessage,
    })
    .from(vaultBackups)
    .where(eq(vaultBackups.userId, session.user.id))
    .orderBy(desc(vaultBackups.createdAt))
    .limit(20);

  return NextResponse.json({
    configured,
    connected: Boolean(conn),
    googleEmail: conn?.googleEmail || null,
    connectedAt: conn?.connectedAt || null,
    backups,
  });
}
