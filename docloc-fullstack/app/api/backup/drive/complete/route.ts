import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { getAuthSession } from '@/lib/server/get-auth';
import { db } from '@/lib/db';
import { vaultBackups } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export const runtime = 'nodejs';

const bodySchema = z.object({
  backupId: z.string().uuid(),
  documentCount: z.number().int().min(0),
  totalBytes: z.number().int().min(0),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { backupId, documentCount, totalBytes, success, errorMessage } = parsed.data;

  const [updated] = await db
    .update(vaultBackups)
    .set({
      documentCount,
      totalBytes,
      status: success ? 'complete' : 'failed',
      errorMessage: success ? null : errorMessage || 'Backup failed',
      completedAt: success ? new Date() : null,
    })
    .where(and(eq(vaultBackups.id, backupId), eq(vaultBackups.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
  }

  return NextResponse.json({ backup: updated });
}
