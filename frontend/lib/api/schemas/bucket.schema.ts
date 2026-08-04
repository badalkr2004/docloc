import { z } from 'zod/v4';
import { DocumentSchema } from './document.schema';

export const bucketTypeValues = ['scholarship', 'admission', 'visa', 'job_application', 'custom'] as const;
export const BucketTypeEnum = z.enum(bucketTypeValues);

export const BucketSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  name: z.string(),
  type: BucketTypeEnum,
  description: z.string().nullable(),
  checklistTemplate: z.array(
    z.object({
      docType: z.string(),
      required: z.boolean(),
    })
  ).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const BucketWithDocsSchema = BucketSchema.extend({
  documents: z.array(DocumentSchema),
});

export const ChecklistItemSchema = z.object({
  docType: z.string(),
  required: z.boolean(),
  present: z.boolean(),
});

export const ChecklistResponseSchema = z.object({
  checklist: z.array(ChecklistItemSchema),
});

export const CreateBucketInput = z.object({
  name: z.string().min(1).max(100),
  type: BucketTypeEnum,
  description: z.string().optional(),
  checklistTemplate: z.array(
    z.object({
      docType: z.string(),
      required: z.boolean(),
    })
  ).optional(),
});

export const UpdateBucketInput = z.object({
  name: z.string().optional(),
  type: BucketTypeEnum.optional(),
  description: z.string().nullable().optional(),
  checklistTemplate: z.array(
    z.object({
      docType: z.string(),
      required: z.boolean(),
    })
  ).nullable().optional(),
});

export type Bucket = z.infer<typeof BucketSchema>;
export type BucketWithDocs = z.infer<typeof BucketWithDocsSchema>;
export type BucketWithDocsType = BucketWithDocs;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type ChecklistItemType = ChecklistItem;
export type ChecklistResponse = z.infer<typeof ChecklistResponseSchema>;
export type ChecklistResponseType = ChecklistResponse;
export type CreateBucketRequest = z.infer<typeof CreateBucketInput>;
export type UpdateBucketRequest = z.infer<typeof UpdateBucketInput>;
export type BucketType = z.infer<typeof BucketTypeEnum>;
