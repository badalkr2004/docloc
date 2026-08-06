import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  BucketSchema,
  BucketWithDocsSchema,
  ChecklistResponseSchema,
  CreateBucketRequest,
  UpdateBucketRequest,
} from '../schemas';
import { z } from 'zod/v4';

export const bucketKeys = {
  all: ['buckets'] as const,
  lists: () => [...bucketKeys.all, 'list'] as const,
  details: () => [...bucketKeys.all, 'detail'] as const,
  detail: (id: string) => [...bucketKeys.details(), id] as const,
  checklist: (id: string) => [...bucketKeys.all, 'checklist', id] as const,
};

export function useBuckets() {
  return useQuery({
    queryKey: bucketKeys.lists(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/buckets');
      return z.array(BucketSchema).parse(data);
    },
  });
}

export function useBucket(id: string) {
  return useQuery({
    queryKey: bucketKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/buckets/${id}`);
      return BucketWithDocsSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useBucketChecklist(id: string) {
  return useQuery({
    queryKey: bucketKeys.checklist(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/buckets/${id}/checklist`);
      return ChecklistResponseSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBucketRequest) => {
      const { data } = await apiClient.post('/api/buckets', payload);
      return BucketSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bucketKeys.lists() });
    },
  });
}

export function useUpdateBucket(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateBucketRequest) => {
      const { data } = await apiClient.patch(`/api/buckets/${id}`, payload);
      return BucketSchema.parse(data);
    },
    onSuccess: (updatedBucket) => {
      queryClient.setQueryData(bucketKeys.detail(id), updatedBucket);
      queryClient.invalidateQueries({ queryKey: bucketKeys.lists() });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/buckets/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: bucketKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: bucketKeys.lists() });
    },
  });
}

export function useAddDocToBucket(bucketIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { documentId: string; bucketId?: string }) => {
      const targetBucketId = payload.bucketId || bucketIdParam;
      if (!targetBucketId) throw new Error('bucketId is required');
      const { data } = await apiClient.post(`/api/buckets/${targetBucketId}/documents`, { documentId: payload.documentId });
      return { data, bucketId: targetBucketId };
    },
    onSuccess: ({ bucketId }) => {
      queryClient.invalidateQueries({ queryKey: bucketKeys.detail(bucketId) });
      queryClient.invalidateQueries({ queryKey: bucketKeys.checklist(bucketId) });
    },
  });
}

export function useRemoveDocFromBucket(bucketIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: string | { documentId: string; bucketId?: string }) => {
      const documentId = typeof payload === 'string' ? payload : payload.documentId;
      const targetBucketId = typeof payload === 'string' ? bucketIdParam : (payload.bucketId || bucketIdParam);
      if (!targetBucketId) throw new Error('bucketId is required');
      const { data } = await apiClient.delete(`/api/buckets/${targetBucketId}/documents/${documentId}`);
      return { data, bucketId: targetBucketId };
    },
    onSuccess: ({ bucketId }) => {
      queryClient.invalidateQueries({ queryKey: bucketKeys.detail(bucketId) });
      queryClient.invalidateQueries({ queryKey: bucketKeys.checklist(bucketId) });
    },
  });
}
