import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { SessionSchema, KeysResponseSchema, StoreKeysRequest } from '../schemas';

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  keys: () => [...authKeys.all, 'keys'] as const,
};

export function useSession() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/api/auth/get-session');
        if (!data || typeof data !== 'object' || !data.user) return null;
        return SessionSchema.parse(data);
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useKeys() {
  return useQuery({
    queryKey: authKeys.keys(),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/api/auth/keys');
        if (!data || typeof data !== 'object' || !data.publicKey) return null;
        return KeysResponseSchema.parse(data);
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await apiClient.post('/api/auth/sign-up/email', payload);
      return data;
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { data } = await apiClient.post('/api/auth/sign-in/email', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/auth/sign-out');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

export function useStoreKeys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StoreKeysRequest) => {
      const { data } = await apiClient.post('/api/auth/keys', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.keys() });
    },
  });
}
