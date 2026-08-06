import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { auditLogs, documents } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

interface LogParams {
  action: 'upload' | 'view' | 'download' | 'share' | 'revoke' | 'delete' | 'edit_metadata' | 'ocr_process';
  actorUserId?: string;
  actorLabel?: string;
  documentId?: string;
  shareGrantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  async log(params: LogParams): Promise<void> {
    const actorLabel = params.actorLabel || (params.actorUserId ? 'user' : 'system');
    await db.insert(auditLogs).values({
      id: randomUUID(),
      action: params.action,
      actorUserId: params.actorUserId || null,
      actorLabel,
      documentId: params.documentId || null,
      shareGrantId: params.shareGrantId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  },

  async getByDocument(documentId: string, ownerId: string, page: number, limit: number) {
    const [doc] = await db.select().from(documents).where(
      and(eq(documents.id, documentId), eq(documents.ownerId, ownerId))
    );
    if (!doc) throw new Error('Document not found or unauthorized');

    const offset = (page - 1) * limit;
    
    const logs = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.documentId, documentId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
      
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.documentId, documentId));

    return { logs, total: Number(countResult.count) };
  },

  async getByUser(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    
    const logs = await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
      
    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.actorUserId, userId));

    return { logs, total: Number(countResult.count) };
  }
};
