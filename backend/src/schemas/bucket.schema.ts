import { z } from 'zod';
import { docTypeValues } from './document.schema';

export const createBucketSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(['scholarship', 'admission', 'visa', 'job_application', 'custom']),
  description: z.string().max(500).optional(),
  checklistTemplate: z.array(z.object({
    docType: z.enum(docTypeValues),
    required: z.boolean()
  })).optional(),
});

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
});

export const addDocumentToBucketSchema = z.object({
  documentId: z.string().uuid(),
});

export const bucketParamsSchema = z.object({
  id: z.string().uuid(),
});
