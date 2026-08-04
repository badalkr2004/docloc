import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { env } from './config/env';
import authPlugin from './plugins/auth.plugin';
import { authRoutes } from './routes/auth.routes';
import { documentRoutes } from './routes/document.routes';
import { folderRoutes } from './routes/folder.routes';
import { bucketRoutes } from './routes/bucket.routes';
import { cartRoutes } from './routes/cart.routes';
import { shareRoutes } from './routes/share.routes';
import { auditRoutes } from './routes/audit.routes';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Zod type provider
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Global plugins
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  // Auth plugin (decorators)
  await app.register(authPlugin);

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(documentRoutes, { prefix: '/api/documents' });
  await app.register(folderRoutes, { prefix: '/api/folders' });
  await app.register(bucketRoutes, { prefix: '/api/buckets' });
  await app.register(cartRoutes, { prefix: '/api/carts' });
  await app.register(shareRoutes, { prefix: '/api/share' });
  await app.register(auditRoutes, { prefix: '/api/audit' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Global error handler for Zod errors
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.validation,
      });
    }
    
    app.log.error(error);
    return reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  return app;
}
