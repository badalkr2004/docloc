import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  DocumentListResponseSchema,
  DocumentSchema,
  CreateDocumentResponseSchema,
  DocumentFiltersType,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from '../schemas';
import { AuditLogListResponseSchema } from '../schemas/audit.schema';

export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: DocumentFiltersType) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  audit: (id: string) => [...documentKeys.all, 'audit', id] as const,
};

export function useDocuments(filters: DocumentFiltersType) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/documents', { params: filters });
      return DocumentListResponseSchema.parse(data);
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/documents/${id}`);
      return DocumentSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useDocumentAudit(id: string, page = 1) {
  return useQuery({
    queryKey: [...documentKeys.audit(id), page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/documents/${id}/audit`, { params: { page } });
      return AuditLogListResponseSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDocumentRequest) => {
      const { data } = await apiClient.post('/api/documents', payload);
      return CreateDocumentResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateDocument(idParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: (UpdateDocumentRequest & { id?: string }) | { id: string; data: UpdateDocumentRequest }) => {
      const targetId = ('id' in payload && payload.id) ? payload.id : idParam;
      const body = 'data' in payload ? payload.data : (() => { const { id, ...rest } = payload as any; return rest; })();
      if (!targetId) throw new Error('Document id is required');
      const { data } = await apiClient.patch(`/api/documents/${targetId}`, body);
      return DocumentSchema.parse(data);
    },
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(documentKeys.detail(updatedDoc.id), updatedDoc);
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/documents/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: documentKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useTriggerOcr(idParam?: string) {
  return useMutation({
    mutationFn: async (payload: { plaintextBase64: string; mimeType: string; id?: string }) => {
      const targetId = payload.id || idParam;
      if (!targetId) throw new Error('Document id is required');
      const { id, ...body } = payload;
      const { data } = await apiClient.post(`/api/documents/${targetId}/ocr`, body);
      return data;
    },
  });
}
