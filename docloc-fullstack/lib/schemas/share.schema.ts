import { z } from 'zod';

export const createShareGrantSchema = z.object({
  cartId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().min(10).max(15).optional(),
  accessType: z.enum(['view', 'download']).default('view'),
  requireOtp: z.boolean().default(true),
  expiresInHours: z.number().int().min(1).max(720),
  wrappedDeks: z.array(z.object({
    documentId: z.string().uuid(),
    wrappedDekForGrant: z.string(),
  })),
});

export const verifyShareOtpSchema = z.object({
  code: z.string().optional().default(''),
});

export const shareTokenParamsSchema = z.object({
  token: z.string().min(1),
});

export const shareGrantParamsSchema = z.object({
  id: z.string().uuid(),
});
