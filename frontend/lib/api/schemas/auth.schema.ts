import { z } from 'zod/v4';

export const SessionSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
  session: z.object({
    id: z.string(),
    userId: z.string(),
    token: z.string(),
    expiresAt: z.string(),
  }),
});

export const KeysResponseSchema = z.object({
  publicKey: z.string().nullable(),
  encryptedPrivateKey: z.string().nullable(),
  keyDerivationSalt: z.string().nullable(),
});

export const StoreKeysInput = z.object({
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1),
  keyDerivationSalt: z.string().min(1),
});

export type SessionType = z.infer<typeof SessionSchema>;
export type KeysResponseType = z.infer<typeof KeysResponseSchema>;
export type StoreKeysRequest = z.infer<typeof StoreKeysInput>;
