import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../plugins/auth.plugin';
import { shareService } from '../services/share.service';
import { auditService } from '../services/audit.service';
import { 
  verifyShareOtpSchema, 
  shareTokenParamsSchema, 
  shareGrantParamsSchema 
} from '../schemas/share.schema';

export const shareRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/:token', {
    schema: { params: shareTokenParamsSchema },
  }, async (request, reply) => {
    const { token } = request.params;
    const result = await shareService.getGrantByToken(token);
    
    if (!result) {
      return reply.status(404).send({ error: 'Share not found' });
    }
    
    if (result.isExpired || result.isRevoked) {
      return reply.status(410).send({ error: 'Share has expired or been revoked' });
    }
    
    return reply.send(result);
  });

  fastify.post('/:token/verify-otp', {
    schema: { params: shareTokenParamsSchema, body: verifyShareOtpSchema },
  }, async (request, reply) => {
    const { token } = request.params;
    const { code } = request.body;
    
    const grantResult = await shareService.getGrantByToken(token);
    if (!grantResult || grantResult.isExpired || grantResult.isRevoked) {
      return reply.status(400).send({ error: 'Invalid or expired share token' });
    }
    
    const result = await shareService.verifyRecipientOtp(grantResult.grant.id, code);
    
    if (result.verified) {
      const sharedDocs = await shareService.getDocumentsForGrant(grantResult.grant.id);
      await auditService.log({
        action: 'view',
        actorLabel: grantResult.grant.recipientEmail || 'anonymous',
        shareGrantId: grantResult.grant.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return reply.send({ verified: true, documents: sharedDocs });
    }
    
    return reply.status(403).send({ verified: false });
  });

  fastify.post('/grants/:id/revoke', {
    schema: { params: shareGrantParamsSchema },
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    await shareService.revoke(id, request.user!.id);
    
    await auditService.log({
      action: 'revoke',
      actorUserId: request.user!.id,
      shareGrantId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    
    return reply.send({ success: true });
  });

  fastify.get('/grants', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const grants = await shareService.listGrantsByUser(request.user!.id);
    return reply.send(grants);
  });
};
