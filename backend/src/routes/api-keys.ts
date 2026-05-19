// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { createHash, randomBytes } from 'crypto'
import { db } from '../db/index.js'
import { apiKeys } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

const apiKeySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    lastUsedAt: { type: 'number', nullable: true },
    createdAt: { type: 'number', nullable: true },
  },
}

export default async function apiKeysRoutes(fastify: FastifyInstance) {
  // GET /api-keys - list current user's keys
  fastify.get('/', {
    schema: {
      tags: ['api-keys'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: apiKeySchema },
          },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const keys = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    }).from(apiKeys).where(eq(apiKeys.userId, request.user.id))

    return reply.send({ data: keys })
  })

  // POST /api-keys - create new key
  fastify.post('/', {
    schema: {
      tags: ['api-keys'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            rawKey: { type: 'string' },
            createdAt: { type: 'number', nullable: true },
          },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.body
    const rawKey = randomBytes(32).toString('hex')
    const keyHash = sha256(rawKey)
    const id = uuidv4()
    const createdAt = Math.floor(Date.now() / 1000)

    await db.insert(apiKeys).values({
      id,
      userId: request.user.id,
      name,
      keyHash,
      createdAt,
    })

    return reply.code(201).send({ id, name, rawKey, createdAt })
  })

  // DELETE /api-keys/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['api-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const key = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, request.params.id), eq(apiKeys.userId, request.user.id)))
      .get()

    if (!key) {
      return reply.code(404).send({ error: 'API key not found' })
    }

    await db.delete(apiKeys).where(eq(apiKeys.id, request.params.id))

    return reply.send({ message: 'API key deleted' })
  })
}
