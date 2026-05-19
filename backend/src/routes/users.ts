// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { requireAdmin, requireSelfOrAdmin } from '../hooks/rbac.js'
import { parsePagination, buildMeta } from '../lib/pagination.js'

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string' },
    createdAt: { type: 'number', nullable: true },
  },
}

export default async function usersRoutes(fastify: FastifyInstance) {
  // GET /users - Admin only, paginated
  fastify.get('/', {
    schema: {
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: userSchema },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number } }>, reply: FastifyReply) => {
    const { page = 1, limit = 20 } = request.query
    const { offset, limit: parsedLimit } = parsePagination(page, limit)

    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).limit(parsedLimit).offset(offset)

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(users).get()
    const total = countResult?.count ?? 0

    return reply.send({
      data: allUsers,
      meta: buildMeta(total, Number(page), parsedLimit),
    })
  })

  // GET /users/:id
  fastify.get('/:id', {
    schema: {
      tags: ['users'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: { user: userSchema },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, request.params.id)).get()

    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }

    return reply.send({ user })
  })

  // PUT /users/:id
  fastify.put('/:id', {
    schema: {
      tags: ['users'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { user: userSchema },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; email?: string } }>, reply: FastifyReply) => {
    const { id } = request.params
    await requireSelfOrAdmin(request, reply, id)
    if (reply.sent) return

    const updates: Partial<{ name: string; email: string }> = {}
    if (request.body.name !== undefined) updates.name = request.body.name
    if (request.body.email !== undefined) updates.email = request.body.email

    if (Object.keys(updates).length === 0) {
      const existing = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, id)).get()

      if (!existing) return reply.code(404).send({ error: 'User not found' })
      return reply.send({ user: existing })
    }

    await db.update(users).set(updates).where(eq(users.id, id))

    const updated = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id)).get()

    if (!updated) return reply.code(404).send({ error: 'User not found' })

    return reply.send({ user: updated })
  })

  // DELETE /users/:id - Admin only
  fastify.delete('/:id', {
    schema: {
      tags: ['users'],
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
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await db.select().from(users).where(eq(users.id, request.params.id)).get()
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }

    await db.delete(users).where(eq(users.id, request.params.id))

    return reply.send({ message: 'User deleted' })
  })
}
