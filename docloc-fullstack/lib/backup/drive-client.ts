/**
 * Browser → Google Drive uploads (ciphertext only).
 * Access token must be short-lived and never a refresh token.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

export type DriveAccessSession = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

function assertToken(session: DriveAccessSession) {
  if (!session?.accessToken || session.accessToken.length < 20) {
    throw new Error('Missing Drive access token');
  }
  if (Date.now() > session.expiresAt - 30_000) {
    throw new Error('Drive access token expired — refresh and retry');
  }
}

/** Multipart upload for smaller files. */
async function uploadMultipart(
  accessToken: string,
  opts: { name: string; mimeType: string; parentId: string; bytes: Uint8Array }
) {
  const boundary = `docloc_${crypto.randomUUID().replace(/-/g, '')}`;
  const metadata = JSON.stringify({
    name: opts.name,
    parents: [opts.parentId],
  });

  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`
  );
  const part3 = encoder.encode(`\r\n--${boundary}--`);

  const body = new Blob([part1, opts.bytes as unknown as BlobPart, part3]);

  const res = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    throw new Error(`Drive upload failed (${opts.name}): ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; name: string; size?: string }>;
}

/** Resumable upload for larger ciphertext (avoids giant multipart bodies). */
async function uploadResumable(
  accessToken: string,
  opts: { name: string; mimeType: string; parentId: string; bytes: Uint8Array }
) {
  const initRes = await fetch(
    `${DRIVE_UPLOAD}/files?uploadType=resumable&fields=id,name,size`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': opts.mimeType,
        'X-Upload-Content-Length': String(opts.bytes.byteLength),
      },
      body: JSON.stringify({
        name: opts.name,
        parents: [opts.parentId],
      }),
    }
  );

  if (!initRes.ok) {
    throw new Error(`Drive resumable init failed: ${await initRes.text()}`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('Drive did not return a resumable upload URL');

  // Only allow Google upload hosts (open-redirect / SSRF style abuse protection)
  const host = new URL(uploadUrl).hostname;
  if (
    host !== 'www.googleapis.com' &&
    !host.endsWith('.googleapis.com') &&
    host !== 'googleapis.com'
  ) {
    throw new Error('Unexpected Drive upload host');
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': opts.mimeType,
      'Content-Length': String(opts.bytes.byteLength),
    },
    body: opts.bytes as unknown as BodyInit,
  });

  if (!putRes.ok) {
    throw new Error(`Drive resumable put failed: ${await putRes.text()}`);
  }
  return putRes.json() as Promise<{ id: string; name: string; size?: string }>;
}

const RESUMABLE_THRESHOLD = 4 * 1024 * 1024; // 4 MiB

export async function uploadCiphertextToDrive(
  session: DriveAccessSession,
  opts: { name: string; parentId: string; bytes: Uint8Array; mimeType?: string }
) {
  assertToken(session);
  const mimeType = opts.mimeType || 'application/octet-stream';
  const payload = {
    name: opts.name,
    mimeType,
    parentId: opts.parentId,
    bytes: opts.bytes,
  };

  if (opts.bytes.byteLength >= RESUMABLE_THRESHOLD) {
    return uploadResumable(session.accessToken, payload);
  }
  return uploadMultipart(session.accessToken, payload);
}

export async function listDriveFolderFiles(
  session: DriveAccessSession,
  folderId: string
) {
  assertToken(session);
  // folderId must be a simple Drive id (no path injection)
  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    throw new Error('Invalid Drive folder id');
  }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=200`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  if (!res.ok) throw new Error(`Failed to list Drive folder: ${await res.text()}`);
  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; mimeType?: string; size?: string }>;
  };
  return data.files || [];
}

export async function downloadDriveFileBytes(
  session: DriveAccessSession,
  fileId: string
): Promise<Uint8Array> {
  assertToken(session);
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    throw new Error('Invalid Drive file id');
  }

  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to download Drive file: ${await res.text()}`);
  return new Uint8Array(await res.arrayBuffer());
}
