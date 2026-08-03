import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../plugins/auth.plugin';
import { auditService } from '../services/audit.service';
import { z } from 'zod';

export const auditRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
      })
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { page, limit } = request.query;
    const result = await auditService.getByUser(request.user!.id, page, limit);
    return reply.send(result);
  });
};
