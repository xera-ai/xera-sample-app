// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { labels, projectMembers, projects } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { checkProjectAccess } from '../lib/project-access.js'

const labelSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    projectId: { type: 'string' },
    name: { type: 'string' },
    color: { type: 'string' },
  },
}

export default async function labelsRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/labels
  fastify.get('/projects/:projectId/labels', {
    schema: {
      tags: ['labels'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: labelSchema },
          },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const access = await checkProjectAccess(request.user.id, request.params.projectId, request.user.role, reply)
    if (!access) return

    const projectLabels = await db
      .select()
      .from(labels)
      .where(eq(labels.projectId, request.params.projectId))

    return reply.send({ data: projectLabels })
  })

  // POST /projects/:projectId/labels
  fastify.post('/projects/:projectId/labels', {
    schema: {
      tags: ['labels'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['name', 'color'],
        properties: {
          name: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { label: labelSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { projectId: string }; Body: { name: string; color: string } }>, reply: FastifyReply) => {
    const access = await checkProjectAccess(request.user.id, request.params.projectId, request.user.role, reply)
    if (!access) return

    const { name, color } = request.body
    const id = uuidv4()

    await db.insert(labels).values({
      id,
      projectId: request.params.projectId,
      name,
      color,
    })

    return reply.code(201).send({ label: { id, projectId: request.params.projectId, name, color } })
  })

  // DELETE /labels/:id
  fastify.delete('/labels/:id', {
    schema: {
      tags: ['labels'],
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
    const label = await db.select().from(labels).where(eq(labels.id, request.params.id)).get()
    if (!label) {
      return reply.code(404).send({ error: 'Label not found' })
    }

    const access = await checkProjectAccess(request.user.id, label.projectId, request.user.role, reply)
    if (!access) return

    await db.delete(labels).where(eq(labels.id, label.id))

    return reply.send({ message: 'Label deleted' })
  })
}
