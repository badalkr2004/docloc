import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForTokens,
  getDriveConnection,
  saveDriveConnection,
} from '@/lib/server/google-drive';
import { env } from '@/lib/config/env';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const oauthError = searchParams.get('error');

  const settingsUrl = `${env.APP_URL}/settings`;

  if (oauthError) {
    return NextResponse.redirect(`${settingsUrl}?backup=error&reason=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(`${settingsUrl}?backup=error&reason=missing_code`);
  }

  try {
    const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')) as {
      userId: string;
      nonce: string;
      ts: number;
    };

    if (!state.userId || !state.nonce || Date.now() - state.ts > 10 * 60 * 1000) {
      return NextResponse.redirect(`${settingsUrl}?backup=error&reason=invalid_state`);
    }

    const cookieStore = await cookies();
    const expected = cookieStore.get('docloc_gdrive_oauth')?.value;
    if (!expected || expected !== state.nonce) {
      return NextResponse.redirect(`${settingsUrl}?backup=error&reason=csrf`);
    }

    const existing = await getDriveConnection(state.userId);
    const tokens = await exchangeCodeForTokens(code);
    await saveDriveConnection(state.userId, tokens, existing?.refreshTokenEnc);

    const res = NextResponse.redirect(`${settingsUrl}?backup=connected`);
    res.cookies.set('docloc_gdrive_oauth', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    console.error('Drive OAuth callback error:', err);
    return NextResponse.redirect(
      `${settingsUrl}?backup=error&reason=${encodeURIComponent(err?.message || 'callback_failed')}`
    );
  }
}
