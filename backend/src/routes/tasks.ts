// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { tasks, taskLabels, labels, projects, projectMembers } from '../db/schema.js'
import { eq, and, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { checkProjectAccess } from '../lib/project-access.js'
import { parsePagination, buildMeta } from '../lib/pagination.js'

const taskSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    projectId: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', nullable: true },
    priority: { type: 'string', nullable: true },
    assigneeId: { type: 'string', nullable: true },
    dueDate: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    createdAt: { type: 'number', nullable: true },
    updatedAt: { type: 'number', nullable: true },
  },
}

async function checkTaskProjectAccess(
  userId: string,
  taskId: string,
  userRole: string,
  reply: FastifyReply
): Promise<typeof tasks.$inferSelect | null> {
  const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
  if (!task) {
    reply.code(404).send({ error: 'Task not found' })
    return null
  }

  const access = await checkProjectAccess(userId, task.projectId, userRole, reply)
  if (!access) return null

  return task
}

export default async function tasksRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/tasks
  fastify.get('/projects/:projectId/tasks', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          assigneeId: { type: 'string' },
          search: { type: 'string', description: 'Search in title and description' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: taskSchema },
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
  }, async (request: FastifyRequest<{
    Params: { projectId: string }
    Querystring: { status?: string; priority?: string; assigneeId?: string; page?: number; limit?: number }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params
    const { status, priority, assigneeId, search, page = 1, limit = 20 } = request.query

    const access = await checkProjectAccess(request.user.id, projectId, request.user.role, reply)
    if (!access) return

    const { offset, limit: parsedLimit } = parsePagination(page, limit)

    const allTasks = await db.select().from(tasks).where(eq(tasks.projectId, projectId))

    let filtered = allTasks
    if (status) filtered = filtered.filter(t => t.status === status)
    if (priority) filtered = filtered.filter(t => t.priority === priority)
    if (assigneeId) filtered = filtered.filter(t => t.assigneeId === assigneeId)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      )
    }

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + parsedLimit)

    return reply.send({
      data: paginated,
      meta: buildMeta(total, Number(page), parsedLimit),
    })
  })

  // POST /projects/:projectId/tasks
  fastify.post('/projects/:projectId/tasks', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { task: taskSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { projectId: string }
    Body: { title: string; description?: string; status?: string; priority?: string; assigneeId?: string; dueDate?: string }
  }>, reply: FastifyReply) => {
    const { projectId } = request.params

    const access = await checkProjectAccess(request.user.id, projectId, request.user.role, reply)
    if (!access) return

    const { title, description, status, priority, assigneeId, dueDate } = request.body
    const id = uuidv4()
    const createdAt = Math.floor(Date.now() / 1000)

    await db.insert(tasks).values({
      id,
      projectId,
      title,
      description: description ?? null,
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      assigneeId: assigneeId ?? null,
      dueDate: dueDate ?? null,
      createdAt,
    })

    const task = { id, projectId, title, description: description ?? null, status: status ?? 'todo', priority: priority ?? 'medium', assigneeId: assigneeId ?? null, dueDate: dueDate ?? null, createdAt }
    return reply.code(201).send({ task })
  })

  // GET /tasks/:id
  fastify.get('/tasks/:id', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            task: {
              type: 'object',
              properties: {
                ...taskSchema.properties,
                labels: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      color: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const task = await checkTaskProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!task) return

    const taskLabelRows = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(taskLabels)
      .leftJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, task.id))

    return reply.send({ task: { ...task, labels: taskLabelRows } })
  })

  // PUT /tasks/:id
  fastify.put('/tasks/:id', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          assigneeId: { type: 'string' },
          dueDate: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { task: taskSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string }
    Body: { title?: string; description?: string; status?: string; priority?: string; assigneeId?: string; dueDate?: string; notes?: string }
  }>, reply: FastifyReply) => {
    const task = await checkTaskProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!task) return

    const updates: Partial<typeof tasks.$inferInsert> = {}
    const body = request.body
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId
    if (body.dueDate !== undefined) updates.dueDate = body.dueDate
    if (body.notes !== undefined) updates.notes = body.notes

    if (Object.keys(updates).length > 0) {
      await db.update(tasks).set(updates).where(eq(tasks.id, task.id))
    }

    const updated = await db.select().from(tasks).where(eq(tasks.id, task.id)).get()
    return reply.send({ task: updated })
  })

  // DELETE /tasks/:id
  fastify.delete('/tasks/:id', {
    schema: {
      tags: ['tasks'],
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
    const task = await checkTaskProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!task) return

    await db.delete(taskLabels).where(eq(taskLabels.taskId, task.id))
    await db.delete(tasks).where(eq(tasks.id, task.id))

    return reply.send({ message: 'Task deleted' })
  })

  // POST /tasks/:id/labels - attach label
  fastify.post('/tasks/:id/labels', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['labelId'],
        properties: {
          labelId: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { labelId: string } }>, reply: FastifyReply) => {
    const task = await checkTaskProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!task) return

    const { labelId } = request.body

    // Check label exists and belongs to this project
    const label = await db.select().from(labels).where(and(eq(labels.id, labelId), eq(labels.projectId, task.projectId))).get()
    if (!label) {
      return reply.code(404).send({ error: 'Label not found in this project' })
    }

    // Check if already attached
    const existing = await db.select().from(taskLabels).where(and(eq(taskLabels.taskId, task.id), eq(taskLabels.labelId, labelId))).get()
    if (existing) {
      return reply.code(409).send({ error: 'Label already attached' })
    }

    await db.insert(taskLabels).values({ taskId: task.id, labelId })

    return reply.code(201).send({ message: 'Label attached' })
  })

  // DELETE /tasks/:id/labels/:labelId - detach label
  fastify.delete('/tasks/:id/labels/:labelId', {
    schema: {
      tags: ['tasks'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          labelId: { type: 'string' },
        },
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
  }, async (request: FastifyRequest<{ Params: { id: string; labelId: string } }>, reply: FastifyReply) => {
    const task = await checkTaskProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!task) return

    await db
      .delete(taskLabels)
      .where(and(eq(taskLabels.taskId, task.id), eq(taskLabels.labelId, request.params.labelId)))

    return reply.send({ message: 'Label detached' })
  })
}
