import '@fastify/jwt'
import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      email: string
      role: string
    }
  }

  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
    authenticateOptional: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; email: string; role: string }
    user: { id: string; email: string; role: string }
  }
}
