/** Docloc encrypted vault backup format (v1). Ciphertext only — never plaintext. */
export const BACKUP_FORMAT_VERSION = 1 as const;

export interface BackupManifestV1 {
  format: 'docloc-backup';
  version: typeof BACKUP_FORMAT_VERSION;
  createdAt: string;
  app: 'docloc';
  note: string;
  keys: {
    publicKey: string;
    encryptedPrivateKey: string;
    keyDerivationSalt: string;
  };
  folders: Array<{
    id: string;
    name: string;
    parentId: string | null;
    color: string | null;
  }>;
  documents: Array<{
    id: string;
    title: string;
    docType: string;
    wrappedDek: string;
    encryptionAlgo: string;
    maxPrivacy: boolean;
    mimeType: string;
    fileSizeBytes: number;
    folderId: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    /** Relative path inside the Drive backup folder */
    fileName: string;
  }>;
  buckets: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    checklistTemplate: unknown;
  }>;
  bucketDocuments: Array<{
    bucketId: string;
    documentId: string;
  }>;
}
