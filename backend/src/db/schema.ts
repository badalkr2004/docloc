import {
  pgTable, text, timestamp, boolean, uuid, jsonb, integer, varchar, primaryKey, pgEnum, index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import * as auth from './auth-schema';

export * from './auth-schema';

export const docTypeEnum = pgEnum('doc_type', [
  'aadhaar', 'pan', 'passport', 'marksheet',
  'certificate', 'income_proof', 'photo', 'other'
]);
export const bucketTypeEnum = pgEnum('bucket_type', [
  'scholarship', 'admission', 'visa', 'job_application', 'custom'
]);
export const shareAccessEnum = pgEnum('share_access', ['view', 'download']);
export const auditActionEnum = pgEnum('audit_action', [
  'upload', 'view', 'download', 'share', 'revoke', 'delete', 'edit_metadata', 'ocr_process'
]);

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => auth.user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  docType: docTypeEnum('doc_type').notNull(),
  storageKey: text('storage_key').notNull(),
  storageBucket: text('storage_bucket').notNull(),
  wrappedDek: text('wrapped_dek').notNull(),
  encryptionAlgo: varchar('encryption_algo', { length: 50 }).notNull(),
  maxPrivacy: boolean('max_privacy').default(false).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  ocrText: text('ocr_text'),
  extractedFields: jsonb('extracted_fields'),
  issueDate: timestamp('issue_date'),
  expiryDate: timestamp('expiry_date'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('documents_owner_id_idx').on(table.ownerId),
  index('documents_ocr_text_idx').on(table.ocrText),
  index('documents_folder_id_idx').on(table.folderId),
]);

export const folders = pgTable('folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => auth.user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): any => folders.id, { onDelete: 'cascade' }),
  color: varchar('color', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  index('folders_owner_id_idx').on(table.ownerId),
  index('folders_parent_id_idx').on(table.parentId),
]);

export const buckets = pgTable('buckets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => auth.user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: bucketTypeEnum('type').notNull(),
  description: text('description'),
  checklistTemplate: jsonb('checklist_template'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const bucketDocuments = pgTable('bucket_documents', {
  bucketId: uuid('bucket_id').notNull().references(() => buckets.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.bucketId, t.documentId] }),
]);

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id').notNull().references(() => auth.user.id, { onDelete: 'cascade' }),
  label: text('label'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cartDocuments = pgTable('cart_documents', {
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.cartId, t.documentId] }),
]);

export const shareGrants = pgTable('share_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull().references(() => auth.user.id, { onDelete: 'cascade' }),
  recipientEmail: text('recipient_email'),
  recipientPhone: text('recipient_phone'),
  accessType: shareAccessEnum('access_type').notNull(),
  requireOtp: boolean('require_otp').default(true).notNull(),
  shareToken: text('share_token').notNull().unique(),
  expiresAt: timestamp('expires_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('share_grants_token_idx').on(t.shareToken),
]);

export const shareGrantDocuments = pgTable('share_grant_documents', {
  shareGrantId: uuid('share_grant_id').notNull().references(() => shareGrants.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  wrappedDekForGrant: text('wrapped_dek_for_grant').notNull(),
}, (t) => [
  primaryKey({ columns: [t.shareGrantId, t.documentId] }),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: text('actor_user_id').references(() => auth.user.id, { onDelete: 'set null' }),
  actorLabel: text('actor_label').notNull(),
  action: auditActionEnum('action').notNull(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
  shareGrantId: uuid('share_grant_id').references(() => shareGrants.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('audit_logs_document_id_idx').on(t.documentId),
  index('audit_logs_actor_idx').on(t.actorUserId),
]);

export const usersRelations = relations(auth.user, ({ many }) => ({
  documents: many(documents),
  folders: many(folders),
  buckets: many(buckets),
  carts: many(carts),
  shareGrants: many(shareGrants),
  auditLogs: many(auditLogs),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(auth.user, { fields: [documents.ownerId], references: [auth.user.id] }),
  folder: one(folders, { fields: [documents.folderId], references: [folders.id] }),
  bucketDocuments: many(bucketDocuments),
  cartDocuments: many(cartDocuments),
  shareGrantDocuments: many(shareGrantDocuments),
  auditLogs: many(auditLogs),
}));

export const bucketsRelations = relations(buckets, ({ one, many }) => ({
  owner: one(auth.user, { fields: [buckets.ownerId], references: [auth.user.id] }),
  bucketDocuments: many(bucketDocuments),
}));

export const bucketDocumentsRelations = relations(bucketDocuments, ({ one }) => ({
  bucket: one(buckets, { fields: [bucketDocuments.bucketId], references: [buckets.id] }),
  document: one(documents, { fields: [bucketDocuments.documentId], references: [documents.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  owner: one(auth.user, { fields: [carts.ownerId], references: [auth.user.id] }),
  cartDocuments: many(cartDocuments),
  shareGrants: many(shareGrants),
}));

export const cartDocumentsRelations = relations(cartDocuments, ({ one }) => ({
  cart: one(carts, { fields: [cartDocuments.cartId], references: [carts.id] }),
  document: one(documents, { fields: [cartDocuments.documentId], references: [documents.id] }),
}));

export const shareGrantsRelations = relations(shareGrants, ({ one, many }) => ({
  cart: one(carts, { fields: [shareGrants.cartId], references: [carts.id] }),
  createdBy: one(auth.user, { fields: [shareGrants.createdBy], references: [auth.user.id] }),
  shareGrantDocuments: many(shareGrantDocuments),
  auditLogs: many(auditLogs),
}));

export const shareGrantDocumentsRelations = relations(shareGrantDocuments, ({ one }) => ({
  shareGrant: one(shareGrants, { fields: [shareGrantDocuments.shareGrantId], references: [shareGrants.id] }),
  document: one(documents, { fields: [shareGrantDocuments.documentId], references: [documents.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(auth.user, { fields: [auditLogs.actorUserId], references: [auth.user.id] }),
  document: one(documents, { fields: [auditLogs.documentId], references: [documents.id] }),
  shareGrant: one(shareGrants, { fields: [auditLogs.shareGrantId], references: [shareGrants.id] }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  owner: one(auth.user, { fields: [folders.ownerId], references: [auth.user.id] }),
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folder_children' }),
  children: many(folders, { relationName: 'folder_children' }),
  documents: many(documents),
}));
