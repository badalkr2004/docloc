import { randomUUID } from 'node:crypto';
import { db } from '../db';
import { folders, documents } from '../db/schema';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';

export const folderService = {
  async getDepth(folderId: string): Promise<number> {
    const result = await db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 0 AS depth
        FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f.parent_id, a.depth + 1
        FROM folders f JOIN ancestors a ON f.id = a.parent_id
      )
      SELECT COALESCE(MAX(depth), 0) AS depth FROM ancestors
    `);
    return Number((result as any).rows?.[0]?.depth ?? (result as any)[0]?.depth ?? 0);
  },

  async create(ownerId: string, data: { name: string; parentId?: string; color?: string }) {
    if (data.parentId) {
      const parent = await this.getById(data.parentId, ownerId);
      if (!parent) throw new Error('Parent folder not found');
      
      const parentDepth = await this.getDepth(data.parentId);
      if (parentDepth >= 9) throw new Error('Maximum folder depth (10) exceeded');
    }

    const [folder] = await db.insert(folders).values({
      id: randomUUID(),
      ownerId,
      name: data.name,
      parentId: data.parentId || null,
      color: data.color || null,
    }).returning();

    return folder;
  },

  async list(ownerId: string, parentId?: string | null) {
    const conditions = [eq(folders.ownerId, ownerId)];
    if (!parentId || parentId === 'root' || parentId === 'null') {
      conditions.push(isNull(folders.parentId));
    } else if (parentId !== 'all') {
      conditions.push(eq(folders.parentId, parentId));
    }

    const results = await db.select({
      folder: folders,
      docCount: sql<number>`count(${documents.id})`
    }).from(folders)
      .leftJoin(documents, and(eq(documents.folderId, folders.id), eq(documents.isDeleted, false)))
      .where(and(...conditions))
      .groupBy(folders.id)
      .orderBy(desc(folders.createdAt));

    return results.map(r => ({
      ...r.folder,
      documentCount: Number(r.docCount)
    }));
  },

  async getById(id: string, ownerId: string) {
    const [folder] = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.ownerId, ownerId)));
    return folder || null;
  },

  async update(id: string, ownerId: string, data: { name?: string; color?: string | null }) {
    const folder = await this.getById(id, ownerId);
    if (!folder) throw new Error('Folder not found');

    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;

    const [updated] = await db.update(folders)
      .set(updateData)
      .where(eq(folders.id, id))
      .returning();

    return updated;
  },

  async move(id: string, ownerId: string, newParentId: string | null) {
    const folder = await this.getById(id, ownerId);
    if (!folder) throw new Error('Folder not found');

    if (newParentId) {
      if (newParentId === id) throw new Error('Cannot move folder into itself');
      const newParent = await this.getById(newParentId, ownerId);
      if (!newParent) throw new Error('New parent folder not found');

      // Check circular reference and depth using a single CTE
      const result = await db.execute(sql`
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id, 0 AS depth
          FROM folders WHERE id = ${newParentId}
          UNION ALL
          SELECT f.id, f.parent_id, a.depth + 1
          FROM folders f JOIN ancestors a ON f.id = a.parent_id
          WHERE a.depth < 15
        )
        SELECT 
          bool_or(id = ${id}) AS is_circular,
          COALESCE(MAX(depth), 0) AS max_depth
        FROM ancestors
      `);
      const row = (result as any).rows?.[0] ?? (result as any)[0];
      if (row?.is_circular) throw new Error('Cannot move folder into its own child');
      if (Number(row?.max_depth ?? 0) >= 9) throw new Error('Maximum folder depth (10) exceeded');
    }

    const [updated] = await db.update(folders)
      .set({ parentId: newParentId, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();

    return updated;
  },

  async delete(id: string, ownerId: string) {
    const folder = await this.getById(id, ownerId);
    if (!folder) throw new Error('Folder not found');

    await db.delete(folders).where(eq(folders.id, id));
  },

  async getBreadcrumbs(id: string, ownerId: string) {
    const result = await db.execute(sql`
      WITH RECURSIVE ancestors AS (
        SELECT id, name, parent_id, 0 AS depth
        FROM folders WHERE id = ${id} AND owner_id = ${ownerId}
        UNION ALL
        SELECT f.id, f.name, f.parent_id, a.depth + 1
        FROM folders f JOIN ancestors a ON f.id = a.parent_id
        WHERE f.owner_id = ${ownerId}
      )
      SELECT id, name FROM ancestors ORDER BY depth DESC
    `);
    const rows = (result as any).rows ?? result;
    return (rows as { id: string; name: string }[]);
  }
};
