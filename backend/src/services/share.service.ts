import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { shareGrants, shareGrantDocuments, carts, documents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as appCrypto from '../lib/crypto';
import * as r2 from '../lib/r2';
import { env } from '../config/env';
import { redis } from '../lib/redis';
import { sendShareOtpEmail } from '../lib/email';

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

    const [shareGrant] = await db.transaction(async (tx) => {
      const [sg] = await tx.insert(shareGrants).values({
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
        await tx.insert(shareGrantDocuments).values(
          data.wrappedDeks.map(wd => ({
            shareGrantId,
            documentId: wd.documentId,
            wrappedDekForGrant: wd.wrappedDekForGrant,
          }))
        );
      }

      await tx.update(carts).set({ status: 'shared' }).where(eq(carts.id, data.cartId));
      return [sg];
    });

    // Generate and send OTP after transaction commits
    if (data.requireOtp && data.recipientEmail) {
      const otp = appCrypto.generateOtp();
      const hashedOtp = appCrypto.hashOtp(otp);
      await redis.set(`share-otp:${shareGrantId}`, hashedOtp, 'EX', 600); // 10 min TTL
      await sendShareOtpEmail(data.recipientEmail, otp);
    }

    return { shareGrant, shareUrl: `${env.APP_URL}/share/${shareToken}` };
  },

  async getGrantByToken(shareToken: string) {
    const [grant] = await db.select().from(shareGrants).where(eq(shareGrants.shareToken, shareToken));
    if (!grant) return null;

    const [cart] = await db.select().from(carts).where(eq(carts.id, grant.cartId));
    
    const now = Date.now();
    const expiresAtMs = grant.expiresAt ? new Date(grant.expiresAt).getTime() : null;
    const isExpired = expiresAtMs !== null && expiresAtMs < now;
    const isRevoked = grant.revokedAt !== null;

    return { grant, isExpired, isRevoked, cart };
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
    const storedHash = await redis.get(`share-otp:${shareGrantId}`);
    if (!storedHash) return { verified: false };

    const isValid = appCrypto.verifyOtp(code, storedHash);
    if (isValid) {
      await redis.del(`share-otp:${shareGrantId}`); // one-time use
    }
    return { verified: isValid };
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
