import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { randomUUID } from 'node:crypto';
import { getAuthSession } from '@/lib/server/get-auth';
import { db } from '@/lib/db';
import {
  documents,
  folders,
  buckets,
  bucketDocuments,
  user as userTable,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as r2 from '@/lib/server/r2';
import { env } from '@/lib/config/env';
import { rateLimiter } from '@/lib/server/rate-limiter';
import { docTypeValues } from '@/lib/schemas/document.schema';

export const runtime = 'nodejs';

/**
 * Metadata-only restore commit.
 * Client downloads ciphertext from Drive and PUTs to returned R2 URLs —
 * file bytes never transit Vercel.
 */
const manifestSchema = z.object({
  format: z.literal('docloc-backup'),
  version: z.literal(1),
  keys: z
    .object({
      publicKey: z.string().min(1).max(10_000),
      encryptedPrivateKey: z.string().min(1).max(50_000),
      keyDerivationSalt: z.string().min(1).max(10_000),
    })
    .optional(),
  folders: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(500),
        parentId: z.string().uuid().nullable(),
        color: z.string().max(32).nullable(),
      })
    )
    .max(500),
  documents: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500),
        docType: z.enum(docTypeValues),
        wrappedDek: z.string().min(1).max(50_000),
        encryptionAlgo: z.string().min(1).max(50),
        maxPrivacy: z.boolean(),
        mimeType: z.string().min(1).max(200),
        fileSizeBytes: z.number().int().nonnegative().max(500_000_000),
        folderId: z.string().uuid().nullable(),
        issueDate: z.string().nullable(),
        expiryDate: z.string().nullable(),
        fileName: z
          .string()
          .min(1)
          .max(300)
          .regex(/^files\/[a-zA-Z0-9_.-]+\.enc$/),
      })
    )
    .max(500),
  buckets: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(500),
        type: z.string().min(1).max(64),
        description: z.string().max(5000).nullable(),
        checklistTemplate: z.unknown().optional(),
      })
    )
    .max(200)
    .default([]),
  bucketDocuments: z
    .array(
      z.object({
        bucketId: z.string().uuid(),
        documentId: z.string().uuid(),
      })
    )
    .max(5000)
    .default([]),
});

const bodySchema = z.object({
  folderId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  restoreKeys: z.boolean().default(false),
  manifest: manifestSchema,
});

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowed = await rateLimiter.check(
    `drive-restore:${session.user.id}`,
    10,
    60 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json({ error: 'Too many restore attempts' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid restore payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { restoreKeys, manifest } = parsed.data;
  const userId = session.user.id;

  try {
    if (restoreKeys && manifest.keys?.encryptedPrivateKey) {
      const [u] = await db
        .select({ encryptedPrivateKey: userTable.encryptedPrivateKey })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (!u?.encryptedPrivateKey) {
        await db
          .update(userTable)
          .set({
            publicKey: manifest.keys.publicKey,
            encryptedPrivateKey: manifest.keys.encryptedPrivateKey,
            keyDerivationSalt: manifest.keys.keyDerivationSalt,
          })
          .where(eq(userTable.id, userId));
      }
    }

    const folderIdMap = new Map<string, string>();
    const pending = [...manifest.folders];
    let guard = 0;
    while (pending.length && guard < 50) {
      guard++;
      for (let i = pending.length - 1; i >= 0; i--) {
        const f = pending[i];
        if (f.parentId && !folderIdMap.has(f.parentId)) continue;
        const newId = randomUUID();
        await db.insert(folders).values({
          id: newId,
          ownerId: userId,
          name: f.name,
          parentId: f.parentId ? folderIdMap.get(f.parentId)! : null,
          color: f.color,
        });
        folderIdMap.set(f.id, newId);
        pending.splice(i, 1);
      }
    }

    const uploads: Array<{
      oldDocumentId: string;
      newDocumentId: string;
      fileName: string;
      presignedUploadUrl: string;
      mimeType: string;
    }> = [];

    const docIdMap = new Map<string, string>();

    for (const doc of manifest.documents) {
      const newDocId = randomUUID();
      const sanitizedTitle = doc.title.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storageKey = r2.generateStorageKey(userId, newDocId, sanitizedTitle);

      await db.insert(documents).values({
        id: newDocId,
        ownerId: userId,
        title: doc.title,
        docType: doc.docType as any,
        storageKey,
        storageBucket: env.R2_BUCKET_NAME,
        wrappedDek: doc.wrappedDek,
        encryptionAlgo: doc.encryptionAlgo,
        maxPrivacy: doc.maxPrivacy,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes,
        folderId: doc.folderId ? folderIdMap.get(doc.folderId) || null : null,
        issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
      });

      // Presign as octet-stream — body is ciphertext, not original mime
      const presignedUploadUrl = await r2.getPresignedUploadUrl(
        storageKey,
        'application/octet-stream',
        900
      );

      docIdMap.set(doc.id, newDocId);
      uploads.push({
        oldDocumentId: doc.id,
        newDocumentId: newDocId,
        fileName: doc.fileName,
        presignedUploadUrl,
        mimeType: 'application/octet-stream',
      });
    }

    const bucketIdMap = new Map<string, string>();
    for (const b of manifest.buckets || []) {
      const newId = randomUUID();
      await db.insert(buckets).values({
        id: newId,
        ownerId: userId,
        name: b.name,
        type: b.type as any,
        description: b.description,
        checklistTemplate: b.checklistTemplate as any,
      });
      bucketIdMap.set(b.id, newId);
    }

    for (const bd of manifest.bucketDocuments || []) {
      const newBucketId = bucketIdMap.get(bd.bucketId);
      const newDocId = docIdMap.get(bd.documentId);
      if (!newBucketId || !newDocId) continue;
      await db.insert(bucketDocuments).values({
        bucketId: newBucketId,
        documentId: newDocId,
      });
    }

    return NextResponse.json({
      restoredFolders: folderIdMap.size,
      restoredBuckets: bucketIdMap.size,
      uploads,
    });
  } catch (err: any) {
    console.error('Restore commit error:', err);
    return NextResponse.json(
      { error: err?.message || 'Restore failed' },
      { status: 500 }
    );
  }
}
