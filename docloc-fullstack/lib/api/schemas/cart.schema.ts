import { z } from 'zod/v4';
import { DocumentSchema } from './document.schema';

export const CartSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  label: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

export const CartWithDocsSchema = CartSchema.extend({
  documents: z.array(DocumentSchema),
});

export const CreateCartInput = z.object({
  label: z.string().max(150).optional(),
});

export type Cart = z.infer<typeof CartSchema>;
export type CartType = Cart;
export type CartWithDocs = z.infer<typeof CartWithDocsSchema>;
export type CartWithDocsType = CartWithDocs;
export type CreateCartRequest = z.infer<typeof CreateCartInput>;
