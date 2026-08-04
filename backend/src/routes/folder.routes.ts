import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../plugins/auth.plugin';
import { folderService } from '../services/folder.service';
import {
  createFolderSchema,
  updateFolderSchema,
  moveFolderSchema,
  folderParamsSchema
} from '../schemas/folder.schema';
import { z } from 'zod';

export const folderRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/', {
    schema: { body: createFolderSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const result = await folderService.create(request.user!.id, request.body);
    return reply.status(201).send(result);
  });

  fastify.get('/', {
    schema: {
      querystring: z.object({
        parentId: z.string().optional(),
      })
    },
    preHandler: requireAuth,
  }, async (request, reply) => {
    let pid: string | null | undefined = request.query.parentId;
    if (!pid || pid === 'root' || pid === 'null') pid = null;
    const result = await folderService.list(request.user!.id, pid);
    return reply.send(result);
  });

  fastify.get('/:id', {
    schema: { params: folderParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const folder = await folderService.getById(id, request.user!.id);
    if (!folder) return reply.status(404).send({ error: 'Not found' });
    return reply.send(folder);
  });

  fastify.patch('/:id', {
    schema: { params: folderParamsSchema, body: updateFolderSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const folder = await folderService.update(id, request.user!.id, request.body);
    return reply.send(folder);
  });

  fastify.post('/:id/move', {
    schema: { params: folderParamsSchema, body: moveFolderSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const folder = await folderService.move(id, request.user!.id, request.body.parentId);
    return reply.send(folder);
  });

  fastify.delete('/:id', {
    schema: { params: folderParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    await folderService.delete(id, request.user!.id);
    return reply.send({ success: true });
  });

  fastify.get('/:id/breadcrumbs', {
    schema: { params: folderParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const breadcrumbs = await folderService.getBreadcrumbs(id, request.user!.id);
    return reply.send(breadcrumbs);
  });
};
