import { randomUUID } from "node:crypto";
import { db } from "../db";
import { buckets, bucketDocuments, documents } from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export const bucketService = {
  async create(
    ownerId: string,
    data: {
      name: string;
      type: string;
      description?: string;
      checklistTemplate?: Array<{ docType: string; required: boolean }>;
    },
  ) {
    const [bucket] = await db
      .insert(buckets)
      .values({
        id: randomUUID(),
        ownerId,
        name: data.name,
        type: data.type,
        description: data.description,
        checklistTemplate: data.checklistTemplate || [],
      })
      .returning();
    return bucket;
  },

  async list(ownerId: string) {
    const rows = await db
      .select({
        bucket: buckets,
        documentCount: count(bucketDocuments.documentId),
      })
      .from(buckets)
      .leftJoin(bucketDocuments, eq(buckets.id, bucketDocuments.bucketId))
      .where(eq(buckets.ownerId, ownerId))
      .groupBy(buckets.id)
      .orderBy(desc(buckets.createdAt));

    return rows.map((row) => ({
      ...row.bucket,
      documentCount: Number(row.documentCount || 0),
    }));
  },

  async getById(bucketId: string, ownerId: string) {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.ownerId, ownerId)));
    if (!bucket) throw new Error("Bucket not found");

    const docs = await db
      .select({
        document: documents,
      })
      .from(bucketDocuments)
      .innerJoin(documents, eq(bucketDocuments.documentId, documents.id))
      .where(eq(bucketDocuments.bucketId, bucketId));

    return { ...bucket, documents: docs.map((d) => d.document) };
  },

  async update(
    bucketId: string,
    ownerId: string,
    patch: { name?: string; description?: string },
  ) {
    const updateData: any = { updatedAt: new Date() };
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.description !== undefined)
      updateData.description = patch.description;

    const [updated] = await db
      .update(buckets)
      .set(updateData)
      .where(and(eq(buckets.id, bucketId), eq(buckets.ownerId, ownerId)))
      .returning();

    if (!updated) throw new Error("Bucket not found");
    return updated;
  },

  async deleteBucket(bucketId: string, ownerId: string) {
    const [deleted] = await db
      .delete(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.ownerId, ownerId)))
      .returning();
    if (!deleted) throw new Error("Bucket not found");
  },

  async addDocument(bucketId: string, documentId: string, ownerId: string) {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.ownerId, ownerId)));
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.ownerId, ownerId)));

    if (!bucket || !doc)
      throw new Error("Bucket or Document not found/unauthorized");

    await db
      .insert(bucketDocuments)
      .values({
        bucketId,
        documentId,
        addedAt: new Date(),
      })
      .onConflictDoNothing();
  },

  async removeDocument(bucketId: string, documentId: string, ownerId: string) {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(and(eq(buckets.id, bucketId), eq(buckets.ownerId, ownerId)));
    if (!bucket) throw new Error("Bucket not found");

    await db
      .delete(bucketDocuments)
      .where(
        and(
          eq(bucketDocuments.bucketId, bucketId),
          eq(bucketDocuments.documentId, documentId),
        ),
      );
  },

  async getChecklist(bucketId: string, ownerId: string) {
    const { documents: docs, checklistTemplate } = await this.getById(
      bucketId,
      ownerId,
    );

    const checklist = (
      (checklistTemplate as Array<{ docType: string; required: boolean }>) || []
    ).map((item) => {
      const present = docs.some((d) => d.docType === item.docType);
      return { ...item, present };
    });

    return { checklist };
  },
};
