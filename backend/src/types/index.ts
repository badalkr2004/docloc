// Shared TypeScript types for the Document Locker backend

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  publicKey?: string;
  encryptedPrivateKey?: string;
  keyDerivationSalt?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Re-export schema types for convenience
export type { Env } from '../config/env';
