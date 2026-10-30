import { eq } from 'drizzle-orm';
import { db } from '../db';
import { googleDriveConnections } from '../db/schema';
import { env } from '../config/env';
import { encryptSecret, decryptSecret } from './token-crypto';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export function isGoogleDriveConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_DRIVE_REDIRECT_URI,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
    include_granted_scopes: 'true',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_DRIVE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email || null;
  } catch {
    return null;
  }
}

export async function saveDriveConnection(
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number },
  existingRefreshEnc?: string | null
) {
  const refreshPlain =
    tokens.refresh_token ||
    (existingRefreshEnc ? decryptSecret(existingRefreshEnc) : null);
  if (!refreshPlain) {
    throw new Error('No refresh token returned. Disconnect and reconnect Google Drive with consent.');
  }

  const email = await fetchGoogleEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db
    .insert(googleDriveConnections)
    .values({
      userId,
      googleEmail: email,
      refreshTokenEnc: encryptSecret(refreshPlain),
      accessTokenEnc: encryptSecret(tokens.access_token),
      accessTokenExpiresAt: expiresAt,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: googleDriveConnections.userId,
      set: {
        googleEmail: email,
        refreshTokenEnc: encryptSecret(refreshPlain),
        accessTokenEnc: encryptSecret(tokens.access_token),
        accessTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getDriveConnection(userId: string) {
  const [row] = await db
    .select()
    .from(googleDriveConnections)
    .where(eq(googleDriveConnections.userId, userId))
    .limit(1);
  return row || null;
}

export async function disconnectDrive(userId: string) {
  await db.delete(googleDriveConnections).where(eq(googleDriveConnections.userId, userId));
}

/** Returns a valid access token + expiry, refreshing if needed. Refresh token never leaves this module. */
export async function getValidAccessTokenMeta(userId: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const conn = await getDriveConnection(userId);
  if (!conn) throw new Error('Google Drive is not connected');

  const skewMs = 60_000;
  if (
    conn.accessTokenEnc &&
    conn.accessTokenExpiresAt &&
    conn.accessTokenExpiresAt.getTime() - skewMs > Date.now()
  ) {
    return {
      accessToken: decryptSecret(conn.accessTokenEnc),
      expiresAt: conn.accessTokenExpiresAt,
    };
  }

  const refresh = decryptSecret(conn.refreshTokenEnc);
  const refreshed = await refreshAccessToken(refresh);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db
    .update(googleDriveConnections)
    .set({
      accessTokenEnc: encryptSecret(refreshed.access_token),
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(googleDriveConnections.userId, userId));

  return { accessToken: refreshed.access_token, expiresAt };
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const { accessToken } = await getValidAccessTokenMeta(userId);
  return accessToken;
}

export async function createDriveFolder(accessToken: string, name: string) {
  const res = await fetch(`${DRIVE_API}/files?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create Drive folder: ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; name: string; webViewLink?: string }>;
}

export async function uploadDriveFile(
  accessToken: string,
  opts: {
    name: string;
    mimeType: string;
    parentId: string;
    body: Buffer | Uint8Array | string;
  }
) {
  const metadata = {
    name: opts.name,
    parents: [opts.parentId],
  };
  const boundary = `docloc_${Date.now()}`;
  const bodyBuf = typeof opts.body === 'string' ? Buffer.from(opts.body, 'utf8') : Buffer.from(opts.body);

  const preamble = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${opts.mimeType}\r\n\r\n`
  );
  const closing = Buffer.from(`\r\n--${boundary}--`);
  const multipart = Buffer.concat([preamble, bodyBuf, closing]);

  const res = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,size,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipart,
    }
  );

  if (!res.ok) {
    throw new Error(`Drive upload failed for ${opts.name}: ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; name: string; size?: string; webViewLink?: string }>;
}

export async function listBackupFolders(accessToken: string) {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.folder' and name contains 'Docloc Backup' and trashed=false"
  );
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=25`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to list Drive backups: ${await res.text()}`);
  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; createdTime?: string; webViewLink?: string }>;
  };
  return data.files || [];
}

export async function listFilesInFolder(accessToken: string, folderId: string) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to list folder files: ${await res.text()}`);
  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; mimeType?: string; size?: string }>;
  };
  return data.files || [];
}

export async function downloadDriveFile(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download Drive file: ${await res.text()}`);
  return res.arrayBuffer();
}
