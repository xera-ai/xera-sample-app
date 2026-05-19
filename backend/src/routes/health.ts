import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { sql } from 'drizzle-orm'

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
            db: { type: 'string' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    let dbStatus = 'ok'
    try {
      await db.select({ count: sql<number>`count(*)` }).from(users).get()
    } catch {
      dbStatus = 'error'
    }

    return reply.send({
      status: 'ok',
      uptime: process.uptime(),
      db: dbStatus,
    })
  })
}
