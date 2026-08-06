import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import {
  ShareInfoResponseSchema,
  ShareVerifyResponseSchema,
  CreateShareGrantRequest,
  ShareGrantSchema,
} from '../schemas';
import { z } from 'zod/v4';

export const shareKeys = {
  all: ['shares'] as const,
  grants: () => [...shareKeys.all, 'grants'] as const,
  info: (token: string) => [...shareKeys.all, 'info', token] as const,
};

export function useShareGrants() {
  return useQuery({
    queryKey: shareKeys.grants(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/share/grants');
      return z.array(ShareGrantSchema).parse(data);
    },
  });
}

export function useShareInfo(token: string) {
  return useQuery({
    queryKey: shareKeys.info(token),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/share/${token}`);
      return ShareInfoResponseSchema.parse(data);
    },
    enabled: !!token,
  });
}

export function useCreateShareGrant(cartIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateShareGrantRequest & { cartId?: string }) => {
      const targetCartId = payload.cartId || cartIdParam;
      if (!targetCartId) throw new Error('cartId is required');
      const { cartId, ...body } = payload;
      const { data } = await apiClient.post(`/api/carts/${targetCartId}/share`, body);
      // Backend returns { shareGrant: {...}, shareUrl: '...' }
      const grant = ShareGrantSchema.parse(data.shareGrant);
      return grant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareKeys.grants() });
    },
  });
}

export function useRevokeGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grantId: string) => {
      const { data } = await apiClient.post(`/api/share/grants/${grantId}/revoke`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shareKeys.grants() });
    },
  });
}

export function useVerifyShareOtp(tokenParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { code?: string; otp?: string; token?: string }) => {
      const targetToken = payload.token || tokenParam;
      if (!targetToken) throw new Error('token is required');
      const code = payload.code || payload.otp || '';
      const { data } = await apiClient.post(`/api/share/${targetToken}/verify-otp`, { code });
      return ShareVerifyResponseSchema.parse(data);
    },
  });
}

export function useResendShareOtp(tokenParam?: string) {
  return useMutation({
    mutationFn: async (payload: { token?: string }) => {
      const targetToken = payload.token || tokenParam;
      if (!targetToken) throw new Error('token is required');
      const { data } = await apiClient.post(`/api/share/${targetToken}/resend-otp`);
      return data;
    },
  });
}
