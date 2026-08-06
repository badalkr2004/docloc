import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { carts, cartDocuments, bucketDocuments, documents } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const cartService = {
  async create(ownerId: string, label?: string) {
    const [cart] = await db.insert(carts).values({
      id: randomUUID(),
      ownerId,
      label,
      status: 'draft',
    }).returning();
    return cart;
  },

  async list(ownerId: string) {
    return db.select().from(carts).where(eq(carts.ownerId, ownerId)).orderBy(desc(carts.createdAt));
  },

  async getById(cartId: string, ownerId: string) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.ownerId, ownerId)));
    if (!cart) throw new Error('Cart not found');

    const docs = await db.select({
      document: documents
    }).from(cartDocuments)
      .innerJoin(documents, eq(cartDocuments.documentId, documents.id))
      .where(eq(cartDocuments.cartId, cartId));

    return { ...cart, documents: docs.map(d => d.document) };
  },

  async addDocument(cartId: string, documentId: string, ownerId: string) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.ownerId, ownerId)));
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));
    if (!cart || !doc) throw new Error('Cart or Document not found');

    await db.insert(cartDocuments).values({
      cartId,
      documentId,
    }).onConflictDoNothing();
  },

  async addBucket(cartId: string, bucketId: string, ownerId: string) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.ownerId, ownerId)));
    if (!cart) throw new Error('Cart not found');

    const docsInBucket = await db.select({ documentId: bucketDocuments.documentId })
      .from(bucketDocuments)
      .innerJoin(documents, eq(bucketDocuments.documentId, documents.id))
      .where(and(eq(bucketDocuments.bucketId, bucketId), eq(documents.ownerId, ownerId)));

    if (docsInBucket.length === 0) return;

    await db.insert(cartDocuments)
      .values(docsInBucket.map(d => ({ cartId, documentId: d.documentId })))
      .onConflictDoNothing();
  },

  async removeDocument(cartId: string, documentId: string, ownerId: string) {
    const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartId), eq(carts.ownerId, ownerId)));
    if (!cart) throw new Error('Cart not found');

    await db.delete(cartDocuments).where(and(
      eq(cartDocuments.cartId, cartId),
      eq(cartDocuments.documentId, documentId)
    ));
  }
};
