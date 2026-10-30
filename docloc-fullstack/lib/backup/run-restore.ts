import { apiClient } from '@/lib/api/client';
import type { BackupManifestV1 } from './types';
import {
  type DriveAccessSession,
  downloadDriveFileBytes,
  listDriveFolderFiles,
} from './drive-client';

export type RestoreProgress = {
  phase: 'token' | 'manifest' | 'commit' | 'files' | 'done' | 'error';
  current: number;
  total: number;
  message: string;
};

async function fetchDriveSession(): Promise<DriveAccessSession> {
  const { data } = await apiClient.post<{
    accessToken: string;
    expiresAt: string;
  }>('/api/backup/drive/access-token');
  return {
    accessToken: data.accessToken,
    expiresAt: new Date(data.expiresAt).getTime(),
  };
}

/**
 * Restore: Drive → browser → R2. Metadata commit only hits Vercel.
 */
export async function runGoogleDriveRestore(
  folderId: string,
  onProgress?: (p: RestoreProgress) => void
): Promise<{ restoredDocuments: number; restoredFolders: number; restoredBuckets: number }> {
  const report = (p: RestoreProgress) => onProgress?.(p);

  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    throw new Error('Invalid folder id');
  }

  report({ phase: 'token', current: 0, total: 0, message: 'Requesting Drive access…' });
  const session = await fetchDriveSession();

  report({ phase: 'manifest', current: 0, total: 0, message: 'Downloading manifest from Drive…' });
  const files = await listDriveFolderFiles(session, folderId);
  const manifestMeta = files.find((f) => f.name === 'manifest.json');
  if (!manifestMeta) throw new Error('manifest.json not found in backup folder');

  const manifestBytes = await downloadDriveFileBytes(session, manifestMeta.id);
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as BackupManifestV1;

  if (manifest.format !== 'docloc-backup' || manifest.version !== 1) {
    throw new Error('Unsupported backup format');
  }

  report({
    phase: 'commit',
    current: 0,
    total: manifest.documents.length,
    message: 'Creating vault records…',
  });

  const { data: commit } = await apiClient.post<{
    restoredFolders: number;
    restoredBuckets: number;
    uploads: Array<{
      oldDocumentId: string;
      newDocumentId: string;
      fileName: string;
      presignedUploadUrl: string;
      mimeType: string;
    }>;
  }>('/api/backup/drive/restore', {
    folderId,
    restoreKeys: false,
    manifest: {
      format: manifest.format,
      version: manifest.version,
      keys: manifest.keys,
      folders: manifest.folders,
      documents: manifest.documents,
      buckets: manifest.buckets,
      bucketDocuments: manifest.bucketDocuments,
    },
  });

  const uploads = commit.uploads || [];
  const fileByName = new Map(files.map((f) => [f.name, f]));

  for (let i = 0; i < uploads.length; i++) {
    const u = uploads[i];
    report({
      phase: 'files',
      current: i + 1,
      total: uploads.length,
      message: `Restoring encrypted file ${i + 1}/${uploads.length}`,
    });

    const driveFile = fileByName.get(u.fileName);
    if (!driveFile) {
      throw new Error(`Missing ciphertext on Drive: ${u.fileName}`);
    }

    const ciphertext = await downloadDriveFileBytes(session, driveFile.id);

    // Host allowlist for R2 presigned URLs
    const uploadHost = new URL(u.presignedUploadUrl).hostname;
    if (
      !uploadHost.endsWith('.r2.cloudflarestorage.com') &&
      !uploadHost.endsWith('.r2.dev')
    ) {
      throw new Error('Unexpected storage upload host');
    }

    const put = await fetch(u.presignedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': u.mimeType || 'application/octet-stream' },
      body: ciphertext as unknown as BodyInit,
    });
    if (!put.ok) {
      throw new Error(`Failed to upload restored file to storage (${put.status})`);
    }
  }

  report({
    phase: 'done',
    current: uploads.length,
    total: uploads.length,
    message: 'Restore complete',
  });

  return {
    restoredDocuments: uploads.length,
    restoredFolders: commit.restoredFolders,
    restoredBuckets: commit.restoredBuckets,
  };
}
