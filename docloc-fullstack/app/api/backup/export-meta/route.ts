import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { db } from '@/lib/db';
import {
  documents,
  folders,
  buckets,
  bucketDocuments,
  user as userTable,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { BACKUP_FORMAT_VERSION } from '@/lib/backup/types';

export const runtime = 'nodejs';

/** Metadata + keys for a client-driven encrypted backup (no ciphertext). */
export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;

  const [keys] = await db
    .select({
      publicKey: userTable.publicKey,
      encryptedPrivateKey: userTable.encryptedPrivateKey,
      keyDerivationSalt: userTable.keyDerivationSalt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!keys?.publicKey || !keys.encryptedPrivateKey || !keys.keyDerivationSalt) {
    return NextResponse.json(
      { error: 'Encryption keys are missing. Complete vault setup first.' },
      { status: 400 }
    );
  }

  const folderRows = await db
    .select({
      id: folders.id,
      name: folders.name,
      parentId: folders.parentId,
      color: folders.color,
    })
    .from(folders)
    .where(and(eq(folders.ownerId, userId), eq(folders.isDeleted, false)));

  const docRows = await db
    .select({
      id: documents.id,
      title: documents.title,
      docType: documents.docType,
      wrappedDek: documents.wrappedDek,
      encryptionAlgo: documents.encryptionAlgo,
      maxPrivacy: documents.maxPrivacy,
      mimeType: documents.mimeType,
      fileSizeBytes: documents.fileSizeBytes,
      folderId: documents.folderId,
      issueDate: documents.issueDate,
      expiryDate: documents.expiryDate,
    })
    .from(documents)
    .where(and(eq(documents.ownerId, userId), eq(documents.isDeleted, false)));

  const bucketRows = await db
    .select({
      id: buckets.id,
      name: buckets.name,
      type: buckets.type,
      description: buckets.description,
      checklistTemplate: buckets.checklistTemplate,
    })
    .from(buckets)
    .where(eq(buckets.ownerId, userId));

  const bucketIds = bucketRows.map((b) => b.id);
  let bucketDocRows: Array<{ bucketId: string; documentId: string }> = [];
  if (bucketIds.length > 0) {
    const links = await db
      .select({
        bucketId: bucketDocuments.bucketId,
        documentId: bucketDocuments.documentId,
      })
      .from(bucketDocuments)
      .where(inArray(bucketDocuments.bucketId, bucketIds));
    bucketDocRows = links;
  }

  return NextResponse.json({
    format: 'docloc-backup',
    version: BACKUP_FORMAT_VERSION,
    keys: {
      publicKey: keys.publicKey,
      encryptedPrivateKey: keys.encryptedPrivateKey,
      keyDerivationSalt: keys.keyDerivationSalt,
    },
    folders: folderRows,
    documents: docRows.map((d) => ({
      id: d.id,
      title: d.title,
      docType: d.docType,
      wrappedDek: d.wrappedDek,
      encryptionAlgo: d.encryptionAlgo,
      maxPrivacy: d.maxPrivacy,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      folderId: d.folderId,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      fileName: `files/${d.id}.enc`,
    })),
    buckets: bucketRows,
    bucketDocuments: bucketDocRows,
  });
}
