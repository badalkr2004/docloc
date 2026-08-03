import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { auth } from '../lib/auth';

// Types for augmenting Fastify request
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  // E2EE fields
  publicKey?: string | null;
  encryptedPrivateKey?: string | null;
  keyDerivationSalt?: string | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
    session: AuthSession | null;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate request with null defaults
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('session', null);
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});

// Standalone preHandler hooks (not part of the plugin, exported separately)
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers as any,
    });
    
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    
    request.user = session.user as AuthUser;
    request.session = session.session as AuthSession;
  } catch (error) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function requireFreshAuth(request: FastifyRequest, reply: FastifyReply) {
  // First, do normal auth check
  await requireAuth(request, reply);
  if (reply.sent) return;
  
  // Then check session age
  if (request.session) {
    const sessionAge = Date.now() - new Date(request.session.createdAt).getTime();
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (sessionAge > FIVE_MINUTES) {
      return reply.status(403).send({ 
        error: 'Re-authentication required for this action' 
      });
    }
  }
}
