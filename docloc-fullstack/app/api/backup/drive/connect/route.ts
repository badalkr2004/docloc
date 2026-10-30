import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getAuthSession } from '@/lib/server/get-auth';
import {
  getGoogleAuthUrl,
  isGoogleDriveConfigured,
} from '@/lib/server/google-drive';
import { env } from '@/lib/config/env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        error:
          'Google Drive is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      },
      { status: 503 }
    );
  }

  // Prefer same-site navigations; block obvious cross-site CSRF starts
  const secFetchSite = req.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none' && secFetchSite !== 'same-site') {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const nonce = randomBytes(16).toString('hex');
  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, nonce, ts: Date.now() })
  ).toString('base64url');

  const url = getGoogleAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set('docloc_gdrive_oauth', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.APP_URL.startsWith('https://'),
    path: '/',
    maxAge: 600,
  });
  return res;
}
