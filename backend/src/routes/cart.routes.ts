import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth, requireFreshAuth } from '../plugins/auth.plugin';
import { cartService } from '../services/cart.service';
import { shareService } from '../services/share.service';
import { auditService } from '../services/audit.service';
import { 
  createCartSchema, 
  addDocumentToCartSchema, 
  addBucketToCartSchema, 
  cartParamsSchema 
} from '../schemas/cart.schema';
import { createShareGrantSchema } from '../schemas/share.schema';
import { z } from 'zod';

export const cartRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: { body: createCartSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const cart = await cartService.create(request.user!.id, request.body.label);
    return reply.status(201).send(cart);
  });

  fastify.get('/', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const carts = await cartService.list(request.user!.id);
    return reply.send(carts);
  });

  fastify.get('/:id', {
    schema: { params: cartParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await cartService.getById(id, request.user!.id);
    return reply.send(result);
  });

  fastify.post('/:id/documents', {
    schema: { params: cartParamsSchema, body: addDocumentToCartSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { documentId } = request.body;
    await cartService.addDocument(id, documentId, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.post('/:id/documents/bucket', {
    schema: { params: cartParamsSchema, body: addBucketToCartSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const { bucketId } = request.body;
    await cartService.addBucket(id, bucketId, request.user!.id);
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
    await cartService.removeDocument(id, docId, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.post('/:id/share', {
    schema: { params: cartParamsSchema, body: createShareGrantSchema },
    preHandler: requireFreshAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const result = await shareService.createGrant(request.user!.id, { ...request.body, cartId: id });
    await auditService.log({
      action: 'share',
      actorUserId: request.user!.id,
      shareGrantId: result.shareGrant.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return reply.status(201).send(result);
  });
};
