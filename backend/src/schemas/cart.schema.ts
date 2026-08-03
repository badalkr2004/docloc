import { z } from 'zod';

export const createCartSchema = z.object({
  label: z.string().max(150).optional(),
});

export const addDocumentToCartSchema = z.object({
  documentId: z.string().uuid(),
});

export const addBucketToCartSchema = z.object({
  bucketId: z.string().uuid(),
});

export const cartParamsSchema = z.object({
  id: z.string().uuid(),
});
