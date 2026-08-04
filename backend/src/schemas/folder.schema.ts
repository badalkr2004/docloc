import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  color: z.string().max(20).optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().optional(),
  color: z.string().nullable().optional(),
});

export const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export const folderParamsSchema = z.object({
  id: z.string().uuid(),
});

export const moveDocumentToFolderSchema = z.object({
  folderId: z.string().uuid().nullable(),
});
