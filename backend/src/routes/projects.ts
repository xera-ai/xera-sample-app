// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { projects, projectMembers, users, tasks, labels, taskLabels, comments } from '../db/schema.js'
import { eq, and, or, sql } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { checkProjectAccess, checkProjectOwnerOrAdmin } from '../lib/project-access.js'
import { parsePagination, buildMeta } from '../lib/pagination.js'

const projectSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    ownerId: { type: 'string' },
    createdAt: { type: 'number', nullable: true },
  },
}

const memberSchema = {
  type: 'object',
  properties: {
    projectId: { type: 'string' },
    userId: { type: 'string' },
    role: { type: 'string', nullable: true },
    name: { type: 'string' },
    email: { type: 'string' },
  },
}

export default async function projectsRoutes(fastify: FastifyInstance) {
  // GET /projects - paginated, user's projects
  fastify.get('/', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          search: { type: 'string', description: 'Search in name and description' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: projectSchema },
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
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; search?: string } }>, reply: FastifyReply) => {
    const { page = 1, limit = 20, search } = request.query
    const { offset, limit: parsedLimit } = parsePagination(page, limit)
    const userId = request.user.id
    const isAdmin = request.user.role === 'admin'

    let projectList
    let total: number

    if (isAdmin) {
      let allProjects = await db.select().from(projects)
      if (search) {
        const q = search.toLowerCase()
        allProjects = allProjects.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      }
      total = allProjects.length
      projectList = allProjects.slice(offset, offset + parsedLimit)
    } else {
      // Owner or member
      const memberProjects = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, userId))

      const memberProjectIds = memberProjects.map(m => m.projectId)

      // Get all projects where user is owner
      const ownerProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.ownerId, userId))

      const ownerProjectIds = new Set(ownerProjects.map(p => p.id))

      // Combine and deduplicate
      const allProjectIds = [...new Set([...ownerProjectIds, ...memberProjectIds])]

      if (allProjectIds.length === 0) {
        return reply.send({ data: [], meta: buildMeta(0, Number(page), parsedLimit) })
      }

      // Get all projects by ids using a raw query approach
      let allProjectsList = await db.select().from(projects)
      let filteredProjects = allProjectsList.filter(p => allProjectIds.includes(p.id))
      if (search) {
        const q = search.toLowerCase()
        filteredProjects = filteredProjects.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
        )
      }
      total = filteredProjects.length
      projectList = filteredProjects.slice(offset, offset + parsedLimit)
    }

    return reply.send({
      data: projectList,
      meta: buildMeta(total, Number(page), parsedLimit),
    })
  })

  // POST /projects
  fastify.post('/', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { project: projectSchema },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: { name: string; description?: string } }>, reply: FastifyReply) => {
    const { name, description } = request.body
    const id = uuidv4()
    const createdAt = Math.floor(Date.now() / 1000)

    await db.insert(projects).values({
      id,
      name,
      description: description ?? null,
      ownerId: request.user.id,
      createdAt,
    })

    await db.insert(projectMembers).values({
      projectId: id,
      userId: request.user.id,
      role: 'owner',
    })

    const project = { id, name, description: description ?? null, ownerId: request.user.id, createdAt }
    return reply.code(201).send({ project })
  })

  // GET /projects/:id
  fastify.get('/:id', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            project: {
              type: 'object',
              properties: {
                ...projectSchema.properties,
                members: { type: 'array', items: memberSchema },
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
    const access = await checkProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!access) return

    const members = await db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, request.params.id))

    return reply.send({
      project: {
        ...access.project,
        members,
      },
    })
  })

  // PUT /projects/:id
  fastify.put('/:id', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { project: projectSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>, reply: FastifyReply) => {
    const isOwnerOrAdmin = await checkProjectOwnerOrAdmin(request.user.id, request.params.id, request.user.role, reply)
    if (!isOwnerOrAdmin) return

    const updates: Partial<{ name: string; description: string }> = {}
    if (request.body.name !== undefined) updates.name = request.body.name
    if (request.body.description !== undefined) updates.description = request.body.description

    await db.update(projects).set(updates).where(eq(projects.id, request.params.id))

    const updated = await db.select().from(projects).where(eq(projects.id, request.params.id)).get()
    if (!updated) return reply.code(404).send({ error: 'Project not found' })

    return reply.send({ project: updated })
  })

  // DELETE /projects/:id
  fastify.delete('/:id', {
    schema: {
      tags: ['projects'],
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
    const isOwnerOrAdmin = await checkProjectOwnerOrAdmin(request.user.id, request.params.id, request.user.role, reply)
    if (!isOwnerOrAdmin) return

    // Delete cascade: task labels, comments, tasks, labels, members, project
    const projectTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, request.params.id))
    const taskIds = projectTasks.map(t => t.id)

    if (taskIds.length > 0) {
      for (const taskId of taskIds) {
        await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId))
        await db.delete(comments).where(eq(comments.taskId, taskId))
      }
    }

    await db.delete(tasks).where(eq(tasks.projectId, request.params.id))
    await db.delete(labels).where(eq(labels.projectId, request.params.id))
    await db.delete(projectMembers).where(eq(projectMembers.projectId, request.params.id))
    await db.delete(projects).where(eq(projects.id, request.params.id))

    return reply.send({ message: 'Project deleted' })
  })

  // GET /projects/:id/members
  fastify.get('/:id/members', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: memberSchema },
          },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const access = await checkProjectAccess(request.user.id, request.params.id, request.user.role, reply)
    if (!access) return

    const members = await db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, request.params.id))

    return reply.send({ data: members })
  })

  // POST /projects/:id/members
  fastify.post('/:id/members', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          role: { type: 'string', default: 'member' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: { member: memberSchema },
        },
        403: { type: 'object', properties: { error: { type: 'string' } } },
        404: { type: 'object', properties: { error: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { userId: string; role?: string } }>, reply: FastifyReply) => {
    const isOwnerOrAdmin = await checkProjectOwnerOrAdmin(request.user.id, request.params.id, request.user.role, reply)
    if (!isOwnerOrAdmin) return

    const { userId, role = 'member' } = request.body

    // Check user exists
    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }

    // Check if already a member
    const existing = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, request.params.id), eq(projectMembers.userId, userId)))
      .get()

    if (existing) {
      return reply.code(409).send({ error: 'User is already a member' })
    }

    await db.insert(projectMembers).values({
      projectId: request.params.id,
      userId,
      role,
    })

    return reply.code(201).send({
      member: { projectId: request.params.id, userId, role, name: user.name, email: user.email },
    })
  })

  // DELETE /projects/:id/members/:userId
  fastify.delete('/:id/members/:userId', {
    schema: {
      tags: ['projects'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) => {
    const isOwnerOrAdmin = await checkProjectOwnerOrAdmin(request.user.id, request.params.id, request.user.role, reply)
    if (!isOwnerOrAdmin) return

    const member = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, request.params.id), eq(projectMembers.userId, request.params.userId)))
      .get()

    if (!member) {
      return reply.code(404).send({ error: 'Member not found' })
    }

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, request.params.id), eq(projectMembers.userId, request.params.userId)))

    return reply.send({ message: 'Member removed' })
  })
}
