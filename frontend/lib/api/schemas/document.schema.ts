import { z } from 'zod/v4';

export const docTypeValues = ['aadhaar', 'pan', 'passport', 'marksheet', 'certificate', 'income_proof', 'photo', 'other'] as const;
export const DocTypeEnum = z.enum(docTypeValues);

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  title: z.string(),
  docType: DocTypeEnum,
  storageKey: z.string(),
  storageBucket: z.string(),
  wrappedDek: z.string(),
  encryptionAlgo: z.string(),
  maxPrivacy: z.boolean(),
  mimeType: z.string(),
  fileSizeBytes: z.number(),
  ocrText: z.string().nullable(),
  extractedFields: z.record(z.string(), z.any()).nullable(),
  issueDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  isDeleted: z.boolean(),
  folderId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DocumentListResponseSchema = z.object({
  documents: z.array(DocumentSchema),
  total: z.number(),
});

export const CreateDocumentResponseSchema = z.object({
  document: DocumentSchema,
  presignedUploadUrl: z.string(),
});

export const CreateDocumentInput = z.object({
  title: z.string().min(1).max(200),
  docType: DocTypeEnum,
  mimeType: z.string(),
  fileSizeBytes: z.number().int().positive(),
  wrappedDek: z.string(),
  encryptionAlgo: z.string().optional().default('AES-256-GCM'),
  maxPrivacy: z.boolean().default(false),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const UpdateDocumentInput = z.object({
  title: z.string().optional(),
  docType: DocTypeEnum.optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

export const DocumentFilters = z.object({
  query: z.string().optional(),
  docType: DocTypeEnum.optional(),
  bucketId: z.string().optional(),
  folderId: z.string().uuid().nullable().optional(),
  expiryBefore: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type DocumentType = Document;
export type DocType = z.infer<typeof DocTypeEnum>;
export type DocumentListResponse = z.infer<typeof DocumentListResponseSchema>;
export type CreateDocumentResponse = z.infer<typeof CreateDocumentResponseSchema>;
export type CreateDocumentRequest = z.infer<typeof CreateDocumentInput>;
export type UpdateDocumentRequest = z.infer<typeof UpdateDocumentInput>;
export type DocumentFilters = z.infer<typeof DocumentFilters>;
export type DocumentFiltersType = DocumentFilters;
