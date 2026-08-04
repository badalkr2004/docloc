import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  FolderWithCountSchema,
  FolderSchema,
  FolderBreadcrumbSchema,
  CreateFolderRequest,
  UpdateFolderRequest,
} from '../schemas';
import { z } from 'zod/v4';
import { documentKeys } from './use-documents';

export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (parentId?: string | null) => [...folderKeys.lists(), { parentId }] as const,
  details: () => [...folderKeys.all, 'detail'] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
  breadcrumbs: (id: string) => [...folderKeys.all, 'breadcrumbs', id] as const,
};

export function useFolders(parentId?: string | null) {
  return useQuery({
    queryKey: folderKeys.list(parentId),
    queryFn: async () => {
      const url = parentId ? `/api/folders?parentId=${parentId}` : '/api/folders';
      const { data } = await apiClient.get(url);
      return z.array(FolderWithCountSchema).parse(data);
    },
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/folders/${id}`);
      return FolderWithCountSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useFolderBreadcrumbs(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? folderKeys.breadcrumbs(id) : [],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await apiClient.get(`/api/folders/${id}/breadcrumbs`);
      return z.array(FolderBreadcrumbSchema).parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFolderRequest) => {
      const { data } = await apiClient.post('/api/folders', payload);
      return FolderSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFolderRequest }) => {
      const { data: res } = await apiClient.patch(`/api/folders/${id}`, data);
      return FolderSchema.parse(res);
    },
    onSuccess: (updatedFolder) => {
      queryClient.setQueryData(folderKeys.detail(updatedFolder.id), updatedFolder);
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/folders/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: folderKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      const { data } = await apiClient.post(`/api/folders/${id}/move`, { parentId });
      return FolderSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useMoveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const { data } = await apiClient.post(`/api/documents/${id}/move`, { folderId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
  });
}
