import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { auth } from '../lib/auth';
import { requireAuth } from '../plugins/auth.plugin';
import { db } from '../db';
import { user as userTable } from '../db/schema';
import { eq } from 'drizzle-orm';

const storeKeysSchema = z.object({
  publicKey: z.string().min(1),
  encryptedPrivateKey: z.string().min(1),
  keyDerivationSalt: z.string().min(1),
});

export const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  // Store E2EE keys (after client-side key generation)
  fastify.post('/keys', {
    preHandler: [requireAuth],
    schema: {
      body: storeKeysSchema,
    },
  }, async (request, reply) => {
    const { publicKey, encryptedPrivateKey, keyDerivationSalt } = request.body;
    const userId = request.user!.id;

    await db.update(userTable)
      .set({
        publicKey,
        encryptedPrivateKey,
        keyDerivationSalt,
      })
      .where(eq(userTable.id, userId));

    return reply.status(200).send({ success: true });
  });

  // Retrieve E2EE keys (needed after login to unlock private key client-side)
  fastify.get('/keys', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userId = request.user!.id;

    const [foundUser] = await db.select({
      publicKey: userTable.publicKey,
      encryptedPrivateKey: userTable.encryptedPrivateKey,
      keyDerivationSalt: userTable.keyDerivationSalt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

    if (!foundUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.status(200).send({
      publicKey: foundUser.publicKey,
      encryptedPrivateKey: foundUser.encryptedPrivateKey,
      keyDerivationSalt: foundUser.keyDerivationSalt,
    });
  });

  // Proxy all other /api/auth/* to Better-Auth handler
  fastify.all('/*', async (request, reply) => {
    const url = new URL(request.url, `http://${request.hostname}`);
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, String(value));
        }
      }
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined && request.body !== null;
    const bodyStr = hasBody ? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) : undefined;

    const webRequest = new Request(url.toString(), {
      method: request.method,
      headers,
      body: bodyStr,
    });

    const response = await auth.handler(webRequest);

    reply.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      reply.header(key, value);
    });

    const setCookies = response.headers.getSetCookie();
    if (setCookies && setCookies.length > 0) {
      reply.header('set-cookie', setCookies);
    }

    const responseBody = await response.text();
    return reply.send(responseBody);
  });
};
