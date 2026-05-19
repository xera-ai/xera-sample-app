// @ts-nocheck
import type { FastifyInstance } from 'fastify'
import { runSeed } from '../lib/seed.js'

export default async function seedRoutes(fastify: FastifyInstance) {
  if (process.env.NODE_ENV === 'production') return

  fastify.post('/seed', {
    schema: {
      tags: ['seed'],
      description: 'Reset and re-seed the database with test data. Dev only.',
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            adminApiKey: { type: 'string' },
            userApiKey: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const { adminApiKey, userApiKey } = await runSeed()
    return reply.send({ message: 'Seeded', adminApiKey, userApiKey })
  })
}
