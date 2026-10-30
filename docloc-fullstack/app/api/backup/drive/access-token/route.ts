import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import {
  getValidAccessTokenMeta,
  isGoogleDriveConfigured,
} from '@/lib/server/google-drive';
import { rateLimiter } from '@/lib/server/rate-limiter';

export const runtime = 'nodejs';

/**
 * Issues a short-lived Google Drive *access* token for the authenticated user.
 * Refresh tokens never leave the server.
 */
export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json({ error: 'Google Drive is not configured' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const allowedUser = await rateLimiter.check(
    `drive-token:user:${session.user.id}`,
    40,
    60 * 60 * 1000
  );
  const allowedIp = await rateLimiter.check(`drive-token:ip:${ip}`, 80, 60 * 60 * 1000);
  if (!allowedUser || !allowedIp) {
    return NextResponse.json(
      { error: 'Too many token requests. Try again later.' },
      { status: 429 }
    );
  }

  try {
    const meta = await getValidAccessTokenMeta(session.user.id);
    const expiresIn = Math.max(
      0,
      Math.floor((meta.expiresAt.getTime() - Date.now()) / 1000)
    );

    const res = NextResponse.json({
      accessToken: meta.accessToken,
      expiresIn,
      expiresAt: meta.expiresAt.toISOString(),
      tokenType: 'Bearer',
      // Informational only — actual scope is enforced by Google on the token
      scope: 'https://www.googleapis.com/auth/drive.file',
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (err: any) {
    console.error('Drive access-token error:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to issue Drive access token' },
      { status: 500 }
    );
  }
}
