import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { CartWithDocsSchema, CreateCartRequest, CartSchema } from '../schemas';
import { z } from 'zod/v4';

export const cartKeys = {
  all: ['carts'] as const,
  lists: () => [...cartKeys.all, 'list'] as const,
  details: () => [...cartKeys.all, 'detail'] as const,
  detail: (id: string) => [...cartKeys.details(), id] as const,
};

export function useCarts() {
  return useQuery({
    queryKey: cartKeys.lists(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/carts');
      return z.array(CartSchema).parse(data);
    },
  });
}

export function useCart(id: string) {
  return useQuery({
    queryKey: cartKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/carts/${id}`);
      return CartWithDocsSchema.parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCartRequest) => {
      const { data } = await apiClient.post('/api/carts', payload);
      return CartSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.lists() });
    },
  });
}

export function useAddDocToCart(cartIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { documentId: string; cartId?: string }) => {
      let targetCartId = payload.cartId || cartIdParam;
      if (!targetCartId) {
        const { data: cartsData } = await apiClient.get('/api/carts');
        const existingCarts = z.array(CartSchema).parse(cartsData);
        const draftCart = existingCarts.find((c) => c.status === 'draft');
        if (draftCart) {
          targetCartId = draftCart.id;
        } else {
          const { data: newCartData } = await apiClient.post('/api/carts', { label: 'My Share Cart' });
          const newCart = CartSchema.parse(newCartData);
          targetCartId = newCart.id;
        }
      }
      const { data } = await apiClient.post(`/api/carts/${targetCartId}/documents`, { documentId: payload.documentId });
      return { data, cartId: targetCartId };
    },
    onSuccess: ({ cartId }) => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useAddBucketToCart(cartIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { bucketId: string; cartId?: string }) => {
      let targetCartId = payload.cartId || cartIdParam;
      if (!targetCartId) {
        const { data: cartsData } = await apiClient.get('/api/carts');
        const existingCarts = z.array(CartSchema).parse(cartsData);
        const draftCart = existingCarts.find((c) => c.status === 'draft');
        if (draftCart) {
          targetCartId = draftCart.id;
        } else {
          const { data: newCartData } = await apiClient.post('/api/carts', { label: 'My Share Cart' });
          const newCart = CartSchema.parse(newCartData);
          targetCartId = newCart.id;
        }
      }
      const { data } = await apiClient.post(`/api/carts/${targetCartId}/documents/bucket`, { bucketId: payload.bucketId });
      return { data, cartId: targetCartId };
    },
    onSuccess: ({ cartId }) => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

export function useRemoveDocFromCart(cartIdParam?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: string | { documentId: string; cartId?: string }) => {
      const documentId = typeof payload === 'string' ? payload : payload.documentId;
      const targetCartId = typeof payload === 'string' ? cartIdParam : (payload.cartId || cartIdParam);
      if (!targetCartId) throw new Error('cartId is required');
      const { data } = await apiClient.delete(`/api/carts/${targetCartId}/documents/${documentId}`);
      return { data, cartId: targetCartId };
    },
    onSuccess: ({ cartId }) => {
      queryClient.invalidateQueries({ queryKey: cartKeys.detail(cartId) });
    },
  });
}
