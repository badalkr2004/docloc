import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { AuditLogListResponseSchema } from '../schemas';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: { page?: number; limit?: number }) => [...auditKeys.lists(), filters] as const,
};

export function useAuditLogs(page = 1, limit = 20) {
  return useQuery({
    queryKey: auditKeys.list({ page, limit }),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/audit', { params: { page, limit } });
      return AuditLogListResponseSchema.parse(data);
    },
  });
}
