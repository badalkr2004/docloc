import { z } from 'zod/v4';
import { CartSchema } from './cart.schema';

export const ShareGrantSchema = z.object({
  id: z.string().uuid(),
  cartId: z.string(),
  createdBy: z.string(),
  recipientEmail: z.string().nullable(),
  recipientPhone: z.string().nullable(),
  accessType: z.enum(['view', 'download']),
  requireOtp: z.boolean(),
  shareToken: z.string(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const ShareInfoResponseSchema = z.object({
  grant: ShareGrantSchema,
  isExpired: z.boolean(),
  isRevoked: z.boolean(),
  cart: CartSchema,
});

export const ShareVerifyResponseSchema = z.object({
  verified: z.boolean(),
  documents: z.array(
    z.object({
      documentId: z.string(),
      title: z.string(),
      mimeType: z.string(),
      fileSizeBytes: z.number(),
      wrappedDekForGrant: z.string(),
      presignedUrl: z.string(),
    })
  ),
});

export const CreateShareGrantInput = z.object({
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  accessType: z.enum(['view', 'download']).default('view'),
  requireOtp: z.boolean().default(true),
  expiresInHours: z.number().min(1).max(720),
  wrappedDeks: z.array(
    z.object({
      documentId: z.string(),
      wrappedDekForGrant: z.string(),
    })
  ),
});

export type ShareGrant = z.infer<typeof ShareGrantSchema>;
export type ShareGrantType = ShareGrant;
export type ShareInfoResponse = z.infer<typeof ShareInfoResponseSchema>;
export type ShareInfoResponseType = ShareInfoResponse;
export type ShareVerifyResponse = z.infer<typeof ShareVerifyResponseSchema>;
export type ShareVerifyResponseType = ShareVerifyResponse;
export type CreateShareGrantRequest = z.infer<typeof CreateShareGrantInput>;
