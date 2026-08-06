import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { shareGrants, shareGrantDocuments, carts, documents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as appCrypto from '../server/crypto';
import * as r2 from '../server/r2';
import { env } from '../config/env';
import { sendShareOtpEmail } from '../server/email';
import { rateLimiter } from '../server/rate-limiter';
import { redis } from '../server/redis';

// Fallback in-memory OTP storage if Redis is not configured
const otpMemoryCache = new Map<string, { hash: string; expiresAt: number }>();

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

    if (data.requireOtp && data.recipientEmail) {
      // Basic rate limiting on grant creation isn't required here since cart creation is authenticated,
      // but if we were strictly enforcing system-wide limits, we would do it at the API layer.
      const otp = appCrypto.generateOtp();
      const hashedOtp = appCrypto.hashOtp(otp);
      
      const payload = { hash: hashedOtp, expiresAt: Date.now() + 600000 };
      if (redis) {
        await redis.set(`otp:${shareGrantId}`, payload, { ex: 600 });
      } else {
        otpMemoryCache.set(shareGrantId, payload);
      }
      
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

  async verifyRecipientOtp(shareGrantId: string, code: string, ip: string = 'unknown') {
    // Max 10 verification attempts per 15 minutes per IP
    const allowed = await rateLimiter.check(`verify:${ip}`, 10, 15 * 60000);
    if (!allowed) {
      throw new Error('Too many verification attempts. Please try again later.');
    }

    let cached;
    if (redis) {
      cached = await redis.get<{ hash: string; expiresAt: number }>(`otp:${shareGrantId}`);
    } else {
      cached = otpMemoryCache.get(shareGrantId);
    }
    
    if (!cached || cached.expiresAt < Date.now()) {
      return { verified: false };
    }

    const isValid = appCrypto.verifyOtp(code, cached.hash);
    // Deliberately NOT deleting the OTP from cache on success
    // This allows the user to refresh the page within the 10-minute window without getting locked out.
    return { verified: isValid };
  },

  async resendOtp(shareToken: string, ip: string = 'unknown') {
    // Max 3 resends per 15 minutes per IP
    const allowedIp = await rateLimiter.check(`resend:ip:${ip}`, 3, 15 * 60000);
    if (!allowedIp) {
      throw new Error('Too many resend requests from this IP. Please try again later.');
    }

    const grantResult = await this.getGrantByToken(shareToken);
    if (!grantResult || grantResult.isExpired || grantResult.isRevoked) {
      throw new Error('Invalid or expired share token');
    }
    
    if (!grantResult.grant.requireOtp || !grantResult.grant.recipientEmail) {
      throw new Error('OTP not required or no recipient email configured');
    }

    // Max 3 resends per 15 minutes specifically for this grant
    const allowedGrant = await rateLimiter.check(`resend:grant:${grantResult.grant.id}`, 3, 15 * 60000);
    if (!allowedGrant) {
      throw new Error('Too many resend requests for this link. Please try again later.');
    }

    const otp = appCrypto.generateOtp();
    const hashedOtp = appCrypto.hashOtp(otp);
    
    const payload = { hash: hashedOtp, expiresAt: Date.now() + 600000 };
    if (redis) {
      await redis.set(`otp:${grantResult.grant.id}`, payload, { ex: 600 });
    } else {
      otpMemoryCache.set(grantResult.grant.id, payload);
    }
    
    await sendShareOtpEmail(grantResult.grant.recipientEmail, otp);
    return { success: true };
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
