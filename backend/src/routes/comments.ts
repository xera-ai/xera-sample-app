// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { comments, tasks, users } from '../db/schema.js'
import { eq, and, inArray } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { checkProjectAccess } from '../lib/project-access.js'
import { parsePagination, buildMeta } from '../lib/pagination.js'

const commentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    taskId: { type: 'string' },
    authorId: { type: 'string' },
    body: { type: 'string' },
    createdAt: { type: 'number', nullable: true },
    author: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
}

export default async function commentsRoutes(fastify: FastifyInstance) {
  // GET /tasks/:taskId/comments
  fastify.get('/tasks/:taskId/comments', {
    schema: {
      tags: ['comments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
      },
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
            data: { type: 'array', items: commentSchema },
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
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Querystring: { page?: number; limit?: number } }>, reply: FastifyReply) => {
    const { taskId } = request.params
    const { page = 1, limit = 20 } = request.query

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' })
    }

    const access = await checkProjectAccess(request.user.id, task.projectId, request.user.role, reply)
    if (!access) return

    const { offset, limit: parsedLimit } = parsePagination(page, limit)

    const allComments = await db.select().from(comments).where(eq(comments.taskId, taskId))
    const total = allComments.length
    const paginated = allComments.slice(offset, offset + parsedLimit)

    // Attach author info
    const authorIds = [...new Set(paginated.map(c => c.authorId))]
    const authorRows = authorIds.length
      ? await db.select().from(users).where(inArray(users.id, authorIds))
      : []
    const authorMap = Object.fromEntries(authorRows.map(u => [u.id, { id: u.id, name: u.name, email: u.email }]))

    return reply.send({
      data: paginated.map(c => ({ ...c, author: authorMap[c.authorId] ?? null })),
      meta: buildMeta(total, Number(page), parsedLimit),
    })
  })

  // POST /tasks/:taskId/comments
  fastify.post('/tasks/:taskId/comments', {
    schema: {
      tags: ['comments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { taskId: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 1 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { comment: commentSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { taskId: string }; Body: { body: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' })
    }

    const access = await checkProjectAccess(request.user.id, task.projectId, request.user.role, reply)
    if (!access) return

    const id = uuidv4()
    const createdAt = Math.floor(Date.now() / 1000)

    await db.insert(comments).values({
      id,
      taskId,
      authorId: request.user.id,
      body: request.body.body,
      createdAt,
    })

    return reply.code(201).send({
      comment: { id, taskId, authorId: request.user.id, body: request.body.body, createdAt },
    })
  })

  // PUT /comments/:id
  fastify.put('/comments/:id', {
    schema: {
      tags: ['comments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { comment: commentSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { body: string } }>, reply: FastifyReply) => {
    const comment = await db.select().from(comments).where(eq(comments.id, request.params.id)).get()
    if (!comment) {
      return reply.code(404).send({ error: 'Comment not found' })
    }

    if (comment.authorId !== request.user.id) {
      return reply.code(403).send({ error: 'Only the author can edit this comment' })
    }

    await db.update(comments).set({ body: request.body.body }).where(eq(comments.id, comment.id))

    const updated = await db.select().from(comments).where(eq(comments.id, comment.id)).get()
    return reply.send({ comment: updated })
  })

  // DELETE /comments/:id
  fastify.delete('/comments/:id', {
    schema: {
      tags: ['comments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const comment = await db.select().from(comments).where(eq(comments.id, request.params.id)).get()
    if (!comment) {
      return reply.code(404).send({ error: 'Comment not found' })
    }

    if (comment.authorId !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Not authorized to delete this comment' })
    }

    await db.delete(comments).where(eq(comments.id, comment.id))

    return reply.send({ message: 'Comment deleted' })
  })
}
