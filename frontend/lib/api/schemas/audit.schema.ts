import { z } from 'zod/v4';

export const auditActionValues = ['upload', 'view', 'download', 'share', 'revoke', 'delete', 'edit_metadata', 'ocr_process'] as const;
export const AuditActionEnum = z.enum(auditActionValues);

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().nullable(),
  actorLabel: z.string(),
  action: AuditActionEnum,
  documentId: z.string().nullable(),
  shareGrantId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});

export const AuditLogListResponseSchema = z.object({
  logs: z.array(AuditLogSchema),
  total: z.number(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogType = AuditLog;
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;
export type AuditLogListResponseType = AuditLogListResponse;
