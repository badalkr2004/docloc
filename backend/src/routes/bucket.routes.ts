import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../plugins/auth.plugin';
import { bucketService } from '../services/bucket.service';
import { 
  createBucketSchema, 
  updateBucketSchema, 
  addDocumentToBucketSchema, 
  bucketParamsSchema 
} from '../schemas/bucket.schema';
import { z } from 'zod';

export const bucketRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: { body: createBucketSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const bucket = await bucketService.create(request.user!.id, request.body);
    return reply.status(201).send(bucket);
  });

  fastify.get('/', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const buckets = await bucketService.list(request.user!.id);
    return reply.send(buckets);
  });

  fastify.get('/:id', {
    schema: { params: bucketParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await bucketService.getById(id, request.user!.id);
    if (!result) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.send(result);
  });

  fastify.patch('/:id', {
    schema: { params: bucketParamsSchema, body: updateBucketSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const bucket = await bucketService.update(id, request.user!.id, request.body);
    return reply.send(bucket);
  });

  fastify.delete('/:id', {
    schema: { params: bucketParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    await bucketService.deleteBucket(id, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.post('/:id/documents', {
    schema: { params: bucketParamsSchema, body: addDocumentToBucketSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { documentId } = request.body;
    await bucketService.addDocument(id, documentId, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.delete('/:id/documents/:docId', {
    schema: { 
      params: z.object({
        id: z.string(),
        docId: z.string()
      }) 
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id, docId } = request.params;
    await bucketService.removeDocument(id, docId, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.get('/:id/checklist', {
    schema: { params: bucketParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await bucketService.getChecklist(id, request.user!.id);
    return reply.send(result);
  });
};
