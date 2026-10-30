import { apiClient } from '@/lib/api/client';
import type { BackupManifestV1 } from './types';
import {
  type DriveAccessSession,
  uploadCiphertextToDrive,
} from './drive-client';

export type BackupProgress = {
  phase: 'meta' | 'token' | 'start' | 'files' | 'manifest' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
};

type ExportMeta = Omit<BackupManifestV1, 'createdAt' | 'app' | 'note' | 'documents'> & {
  documents: BackupManifestV1['documents'];
};

async function fetchDriveSession(): Promise<DriveAccessSession> {
  const { data } = await apiClient.post<{
    accessToken: string;
    expiresAt: string;
    expiresIn: number;
  }>('/api/backup/drive/access-token');

  if (!data?.accessToken) throw new Error('Server did not return a Drive access token');

  return {
    accessToken: data.accessToken,
    expiresAt: new Date(data.expiresAt).getTime(),
  };
}

async function ensureFreshSession(
  session: DriveAccessSession
): Promise<DriveAccessSession> {
  if (Date.now() < session.expiresAt - 60_000) return session;
  return fetchDriveSession();
}

async function fetchCiphertext(documentId: string): Promise<Uint8Array> {
  const downloadRes = await apiClient.get<{
    presignedUrl?: string;
    downloadUrl?: string;
  }>(`/api/documents/${documentId}/download`);
  const url = downloadRes.data.presignedUrl || downloadRes.data.downloadUrl;
  if (!url) throw new Error(`No download URL for document ${documentId}`);

  if (url.startsWith('http://') || url.startsWith('https://')) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download ciphertext (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }

  const res = await apiClient.get(url, { responseType: 'arraybuffer' });
  return new Uint8Array(res.data);
}

/**
 * Encrypted vault → Google Drive.
 * Ciphertext path: R2 → browser → Drive (does not traverse Vercel).
 * Server only: OAuth refresh, folder create, backup row, short-lived access token.
 */
export async function runGoogleDriveBackup(
  onProgress?: (p: BackupProgress) => void
): Promise<{ folderUrl: string | null; documentCount: number; totalBytes: number }> {
  const report = (p: BackupProgress) => onProgress?.(p);

  report({ phase: 'meta', current: 0, total: 0, message: 'Collecting vault metadata…' });
  const metaRes = await apiClient.get<ExportMeta>('/api/backup/export-meta');
  const meta = metaRes.data;

  report({ phase: 'token', current: 0, total: meta.documents.length, message: 'Requesting Drive access…' });
  let driveSession = await fetchDriveSession();

  report({
    phase: 'start',
    current: 0,
    total: meta.documents.length,
    message: 'Creating Drive folder…',
  });
  const startRes = await apiClient.post<{
    backupId: string;
    folderId: string;
    folderUrl: string | null;
    label: string;
  }>('/api/backup/drive/start');
  const { backupId, folderId, folderUrl } = startRes.data;

  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    throw new Error('Invalid backup folder id from server');
  }

  let totalBytes = 0;
  const docs = meta.documents;

  try {
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      report({
        phase: 'files',
        current: i + 1,
        total: docs.length,
        message: `Uploading encrypted file ${i + 1}/${docs.length}: ${doc.title}`,
      });

      driveSession = await ensureFreshSession(driveSession);
      const ciphertext = await fetchCiphertext(doc.id);
      totalBytes += ciphertext.byteLength;

      // Direct to Google — not via Vercel
      await uploadCiphertextToDrive(driveSession, {
        name: doc.fileName,
        parentId: folderId,
        bytes: ciphertext,
        mimeType: 'application/octet-stream',
      });
    }

    const manifest: BackupManifestV1 = {
      format: 'docloc-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      app: 'docloc',
      note: 'Encrypted vault backup. Files are ciphertext; private key is passphrase-wrapped. Docloc and Google cannot read your documents.',
      keys: meta.keys,
      folders: meta.folders,
      documents: docs,
      buckets: meta.buckets,
      bucketDocuments: meta.bucketDocuments,
    };

    report({
      phase: 'manifest',
      current: docs.length,
      total: docs.length,
      message: 'Uploading manifest…',
    });

    driveSession = await ensureFreshSession(driveSession);
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
    totalBytes += manifestBytes.byteLength;

    await uploadCiphertextToDrive(driveSession, {
      name: 'manifest.json',
      parentId: folderId,
      bytes: manifestBytes,
      mimeType: 'application/json',
    });

    await apiClient.post('/api/backup/drive/complete', {
      backupId,
      documentCount: docs.length,
      totalBytes,
      success: true,
    });

    report({
      phase: 'done',
      current: docs.length,
      total: docs.length,
      message: 'Backup complete',
    });

    // Clear token from closure as soon as we're done
    driveSession = { accessToken: '', expiresAt: 0 };

    return { folderUrl, documentCount: docs.length, totalBytes };
  } catch (err: any) {
    await apiClient
      .post('/api/backup/drive/complete', {
        backupId,
        documentCount: docs.length,
        totalBytes,
        success: false,
        errorMessage: err?.message || 'Backup failed',
      })
      .catch(() => {});
    report({
      phase: 'error',
      current: 0,
      total: docs.length,
      message: err?.message || 'Backup failed',
    });
    throw err;
  }
}
