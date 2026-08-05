import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../plugins/auth.plugin';
import { documentService } from '../services/document.service';
import { auditService } from '../services/audit.service';
import { 
  createDocumentSchema, 
  updateDocumentSchema, 
  searchDocumentsSchema, 
  documentParamsSchema 
} from '../schemas/document.schema';
import { z } from 'zod';

export const documentRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: { body: createDocumentSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const data = request.body;
    const result = await documentService.create(request.user!.id, data);
    await auditService.log({
      action: 'upload',
      actorUserId: request.user!.id,
      documentId: result.document.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.status(201).send(result);
  });

  fastify.get('/', {
    schema: { querystring: searchDocumentsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const filters = request.query;
    const result = await documentService.list(request.user!.id, filters);
    return reply.send(result);
  });

  fastify.get('/:id', {
    schema: { params: documentParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const document = await documentService.getById(id, request.user!.id);
    if (!document) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await auditService.log({
      action: 'view',
      actorUserId: request.user!.id,
      documentId: document.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.send(document);
  });

  fastify.patch('/:id', {
    schema: { params: documentParamsSchema, body: updateDocumentSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const document = await documentService.update(id, request.user!.id, request.body);
    await auditService.log({
      action: 'edit_metadata',
      actorUserId: request.user!.id,
      documentId: document.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.send(document);
  });

  fastify.delete('/:id', {
    schema: { params: documentParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    await documentService.softDelete(id, request.user!.id);
    await auditService.log({
      action: 'delete',
      actorUserId: request.user!.id,
      documentId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.send({ success: true });
  });

  fastify.post('/:id/move', {
    schema: { 
      params: documentParamsSchema, 
      body: z.object({ folderId: z.string().uuid().nullable() }) 
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { folderId } = request.body;
    const document = await documentService.moveToFolder(id, request.user!.id, folderId);
    return reply.send(document);
  });

  fastify.get('/:id/download', {
    schema: { params: documentParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await documentService.getPresignedDownloadUrl(id, request.user!.id);
    await auditService.log({
      action: 'download',
      actorUserId: request.user!.id,
      documentId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.send(result);
  });

  fastify.get('/:id/audit', {
    schema: {
      params: documentParamsSchema,
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
      })
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { page, limit } = request.query;
    const result = await auditService.getByDocument(id, request.user!.id, page, limit);
    return reply.send(result);
  });

  fastify.post('/:id/ocr', {
    schema: {
      params: documentParamsSchema,
      body: z.object({
        plaintextBase64: z.string(),
        mimeType: z.string(),
      }),
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const doc = await documentService.getById(id, request.user!.id);
    if (!doc) {
      return reply.status(404).send({ error: 'Document not found' });
    }
    if (doc.maxPrivacy) {
      return reply.status(403).send({ error: 'Server-side OCR is disabled for max-privacy documents. Use client-side OCR instead.' });
    }
    const { plaintextBase64, mimeType } = request.body;
    await documentService.queueOcr(id, plaintextBase64, mimeType);
    return reply.send({ success: true });
  });
};
