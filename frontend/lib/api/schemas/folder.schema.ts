import { z } from 'zod/v4';

export const FolderSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FolderWithCountSchema = FolderSchema.extend({
  documentCount: z.number().optional(),
  childFolderCount: z.number().optional(),
});

export const FolderBreadcrumbSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const CreateFolderInput = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  color: z.string().optional(),
});

export const UpdateFolderInput = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().nullable().optional(),
});

export type Folder = z.infer<typeof FolderSchema>;
export type FolderWithCount = z.infer<typeof FolderWithCountSchema>;
export type FolderBreadcrumb = z.infer<typeof FolderBreadcrumbSchema>;
export type CreateFolderRequest = z.infer<typeof CreateFolderInput>;
export type UpdateFolderRequest = z.infer<typeof UpdateFolderInput>;
