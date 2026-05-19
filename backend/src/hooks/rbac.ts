import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user || request.user.role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' })
  }
}

export async function requireSelfOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  targetUserId: string
): Promise<void> {
  if (!request.user) {
    reply.code(401).send({ error: 'Authentication required' })
    return
  }
  if (request.user.role !== 'admin' && request.user.id !== targetUserId) {
    reply.code(403).send({ error: 'Access denied' })
  }
}
