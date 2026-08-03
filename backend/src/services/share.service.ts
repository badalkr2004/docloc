import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { shareGrants, shareGrantDocuments, carts, documents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as appCrypto from '../lib/crypto';
import * as r2 from '../lib/r2';
import { env } from '../config/env';

export const shareService = {
  async createGrant(ownerId: string, data: {
    cartId: string; recipientEmail?: string; recipientPhone?: string;
    accessType: 'view' | 'download'; requireOtp: boolean;
    expiresInHours: number;
    wrappedDeks: Array<{ documentId: string; wrappedDekForGrant: string }>;
  }) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, data.cartId), eq(carts.ownerId, ownerId)));
    if (!cart) throw new Error('Cart not found');

    const shareToken = appCrypto.generateShareToken();
    const expiresAt = new Date(Date.now() + data.expiresInHours * 3600000);
    const shareGrantId = randomUUID();

    const [shareGrant] = await db.insert(shareGrants).values({
      id: shareGrantId,
      cartId: data.cartId,
      createdBy: ownerId,
      recipientEmail: data.recipientEmail || null,
      recipientPhone: data.recipientPhone || null,
      accessType: data.accessType,
      requireOtp: data.requireOtp,
      shareToken,
      expiresAt,
    }).returning();

    if (data.wrappedDeks.length > 0) {
      await db.insert(shareGrantDocuments).values(
        data.wrappedDeks.map(wd => ({
          shareGrantId,
          documentId: wd.documentId,
          wrappedDekForGrant: wd.wrappedDekForGrant,
        }))
      );
    }

    await db.update(carts).set({ status: 'shared' }).where(eq(carts.id, data.cartId));

    if (data.requireOtp && data.recipientEmail) {
      const otp = appCrypto.generateOtp();
      console.log(`Stub: Sending OTP ${otp} to ${data.recipientEmail}`);
      // TODO: implement real OTP hash and store logic
    }

    return { shareGrant, shareUrl: `${env.APP_URL}/share/${shareToken}` };
  },

  async getGrantByToken(shareToken: string) {
    const [grant] = await db.select().from(shareGrants).where(eq(shareGrants.shareToken, shareToken));
    if (!grant) return null;

    const [cart] = await db.select().from(carts).where(eq(carts.id, grant.cartId));
    
    const now = new Date();
    const isExpired = grant.expiresAt && new Date(grant.expiresAt) < now;
    const isRevoked = grant.revokedAt !== null;

    return { grant, isExpired: !!isExpired, isRevoked, cart };
  },

  async getDocumentsForGrant(shareGrantId: string) {
    const docs = await db.select({
      documentId: shareGrantDocuments.documentId,
      title: documents.title,
      mimeType: documents.mimeType,
      fileSizeBytes: documents.fileSizeBytes,
      wrappedDekForGrant: shareGrantDocuments.wrappedDekForGrant,
      storageKey: documents.storageKey
    })
    .from(shareGrantDocuments)
    .innerJoin(documents, eq(shareGrantDocuments.documentId, documents.id))
    .where(eq(shareGrantDocuments.shareGrantId, shareGrantId));

    const result = await Promise.all(docs.map(async d => ({
      documentId: d.documentId,
      title: d.title,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      wrappedDekForGrant: d.wrappedDekForGrant,
      presignedUrl: await r2.getPresignedDownloadUrl(d.storageKey, d.title)
    })));

    return result;
  },

  async verifyRecipientOtp(shareGrantId: string, code: string) {
    // Stub
    return { verified: true };
  },

  async revoke(shareGrantId: string, ownerId: string) {
    const [updated] = await db.update(shareGrants)
      .set({ revokedAt: new Date() })
      .where(and(eq(shareGrants.id, shareGrantId), eq(shareGrants.createdBy, ownerId)))
      .returning();
    if (!updated) throw new Error('Grant not found or unauthorized');
  },

  async listGrantsByUser(ownerId: string) {
    return db.select().from(shareGrants).where(eq(shareGrants.createdBy, ownerId)).orderBy(desc(shareGrants.createdAt));
  },

  async listGrantsForCart(cartId: string, ownerId: string) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.ownerId, ownerId)));
    if (!cart) throw new Error('Cart not found');

    return db.select().from(shareGrants).where(eq(shareGrants.cartId, cartId)).orderBy(desc(shareGrants.createdAt));
  }
};
