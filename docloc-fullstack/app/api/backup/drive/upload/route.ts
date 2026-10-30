import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Intentionally disabled.
 * Ciphertext must go browser → Google Drive using a short-lived access token
 * so file bytes do not consume Vercel bandwidth or transit our servers.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Proxy upload disabled. Use /api/backup/drive/access-token and upload directly to Google Drive from the client.',
    },
    { status: 410 }
  );
}
