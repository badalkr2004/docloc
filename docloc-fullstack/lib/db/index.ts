import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/docloc';

// Global cache for serverless environments (Next.js hot-reloading & Lambda)
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

export const queryClient = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = queryClient;
}

export const db = drizzle(queryClient, { schema });
