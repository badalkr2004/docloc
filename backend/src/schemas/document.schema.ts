import { z } from 'zod';

// Enum matching the DB docTypeEnum
export const docTypeValues = [
  'aadhaar', 'pan', 'passport', 'marksheet',
  'certificate', 'income_proof', 'photo', 'other'
] as const;

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  docType: z.enum(docTypeValues),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
  wrappedDek: z.string().min(1),
  encryptionAlgo: z.string().default('AES-256-GCM'),
  maxPrivacy: z.boolean().default(false),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  docType: z.enum(docTypeValues).optional(),
  issueDate: z.string().datetime().nullable().optional(),
  expiryDate: z.string().datetime().nullable().optional(),
});

export const searchDocumentsSchema = z.object({
  query: z.string().optional(),
  docType: z.enum(docTypeValues).optional(),
  bucketId: z.string().uuid().optional(),
  folderId: z.union([z.string().uuid(), z.literal('root'), z.literal('null'), z.literal('all')]).nullable().optional(),
  expiryBefore: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const documentParamsSchema = z.object({
  id: z.string().uuid(),
});

// Response schemas
export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  docType: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  maxPrivacy: z.boolean(),
  issueDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
