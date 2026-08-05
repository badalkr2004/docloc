import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { documents, bucketDocuments } from '../db/schema';
import { eq, and, or, ilike, desc, lt, sql, isNull, type SQL } from 'drizzle-orm';
import * as r2 from '../lib/r2';
import { env } from '../config/env';
import { ocrQueue } from '../workers/ocr.queue';
import { docTypeValues } from '../schemas/document.schema';

export const documentService = {
  async create(ownerId: string, data: {
    title: string; docType: (typeof docTypeValues)[number]; mimeType: string;
    fileSizeBytes: number; wrappedDek: string;
    encryptionAlgo?: string; maxPrivacy?: boolean;
    issueDate?: string; expiryDate?: string;
    folderId?: string | null;
  }) {
    const id = randomUUID();
    const sanitizedTitle = data.title.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storageKey = r2.generateStorageKey(ownerId, id, sanitizedTitle);
    
    const [document] = await db.insert(documents).values({
      id,
      ownerId,
      title: data.title,
      docType: data.docType,
      storageKey,
      storageBucket: env.R2_BUCKET_NAME,
      wrappedDek: data.wrappedDek,
      encryptionAlgo: data.encryptionAlgo || 'aes-256-gcm',
      maxPrivacy: data.maxPrivacy ?? false,
      mimeType: data.mimeType,
      fileSizeBytes: data.fileSizeBytes,
      issueDate: data.issueDate ? new Date(data.issueDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      folderId: data.folderId || null,
    }).returning();

    const presignedUploadUrl = await r2.getPresignedUploadUrl(storageKey, data.mimeType);

    return { document, presignedUploadUrl };
  },

  async getById(documentId: string, ownerId: string) {
    const [doc] = await db.select().from(documents).where(
      and(eq(documents.id, documentId), eq(documents.ownerId, ownerId), eq(documents.isDeleted, false))
    );
    return doc || null;
  },

  async list(ownerId: string, filters: {
    query?: string; docType?: string; bucketId?: string;
    folderId?: string | null;
    expiryBefore?: string; page: number; limit: number;
  }) {
    const conditions: SQL[] = [eq(documents.ownerId, ownerId), eq(documents.isDeleted, false)];
    
    if (filters.query) {
      const searchCondition = or(
        ilike(documents.title, `%${filters.query}%`),
        ilike(documents.ocrText, `%${filters.query}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (filters.docType) {
      conditions.push(eq(documents.docType, filters.docType as any));
    }
    if (filters.expiryBefore) {
      conditions.push(lt(documents.expiryDate, new Date(filters.expiryBefore)));
    }
    if (filters.folderId !== 'all') {
      if (filters.query && !filters.folderId) {
        // When searching with query and no explicit folder scope, search across all folders
      } else if (!filters.folderId || filters.folderId === 'root' || filters.folderId === 'null') {
        conditions.push(isNull(documents.folderId));
      } else {
        conditions.push(eq(documents.folderId, filters.folderId));
      }
    }

    const offset = (filters.page - 1) * filters.limit;

    if (filters.bucketId) {
      const bucketJoinConditions = and(...conditions, eq(bucketDocuments.bucketId, filters.bucketId));
      const rawDocs = await db.select({
        document: documents
      }).from(documents)
        .innerJoin(bucketDocuments, eq(documents.id, bucketDocuments.documentId))
        .where(bucketJoinConditions)
        .orderBy(desc(documents.createdAt))
        .limit(filters.limit)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(documents)
        .innerJoin(bucketDocuments, eq(documents.id, bucketDocuments.documentId))
        .where(bucketJoinConditions);

      return { documents: rawDocs.map(r => r.document), total: Number(countResult.count) };
    }

    const docs = await db.select().from(documents)
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(filters.limit)
      .offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(...conditions));

    return { documents: docs, total: Number(countResult.count) };
  },

  async update(documentId: string, ownerId: string, patch: {
    title?: string; docType?: string;
    issueDate?: string | null; expiryDate?: string | null;
  }) {
    const doc = await this.getById(documentId, ownerId);
    if (!doc) throw new Error('Document not found');

    const updateData: any = { updatedAt: new Date() };
    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.docType !== undefined) updateData.docType = patch.docType;
    if (patch.issueDate !== undefined) updateData.issueDate = patch.issueDate ? new Date(patch.issueDate) : null;
    if (patch.expiryDate !== undefined) updateData.expiryDate = patch.expiryDate ? new Date(patch.expiryDate) : null;

    const [updated] = await db.update(documents)
      .set(updateData)
      .where(eq(documents.id, documentId))
      .returning();

    return updated;
  },

  async softDelete(documentId: string, ownerId: string) {
    const doc = await this.getById(documentId, ownerId);
    if (!doc) throw new Error('Document not found');

    await db.update(documents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  },

  async getPresignedDownloadUrl(documentId: string, ownerId: string) {
    const doc = await this.getById(documentId, ownerId);
    if (!doc) throw new Error('Document not found');

    const presignedUrl = await r2.getPresignedDownloadUrl(doc.storageKey, doc.title);
    return { document: doc, presignedUrl };
  },

  async queueOcr(documentId: string, plaintextBase64: string, mimeType: string) {
    await ocrQueue.add('ocr', { documentId, plaintextBase64, mimeType });
  },

  async moveToFolder(documentId: string, ownerId: string, folderId: string | null) {
    const doc = await this.getById(documentId, ownerId);
    if (!doc) throw new Error('Document not found');

    const [updated] = await db.update(documents)
      .set({ folderId, updatedAt: new Date() })
      .where(eq(documents.id, documentId))
      .returning();
      
    return updated;
  }
};
