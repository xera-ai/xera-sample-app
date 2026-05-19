// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { createWriteStream, createReadStream, existsSync, unlinkSync, statSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { db } from '../db/index.js'
import { attachments, tasks } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'
import { checkProjectAccess } from '../lib/project-access.js'

const UPLOADS_DIR = './data/uploads'

export default async function attachmentsRoutes(fastify: FastifyInstance) {
  // POST /tasks/:taskId/attachments — upload a file
  fastify.post('/tasks/:taskId/attachments', {
    schema: {
      tags: ['attachments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: { type: 'object', properties: { taskId: { type: 'string' } } },
      // No response schema for multipart to avoid serialization issues
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params

    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task) return reply.code(404).send({ error: 'Task not found' })

    const access = await checkProjectAccess(request.user.id, task.projectId, request.user.role, reply)
    if (!access) return

    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const id = uuidv4()
    const storedName = `${id}-${data.filename}`
    const filePath = path.join(UPLOADS_DIR, storedName)

    await pipeline(data.file, createWriteStream(filePath))

    const size = statSync(filePath).size

    await db.insert(attachments).values({
      id,
      taskId,
      uploadedBy: request.user.id,
      originalName: data.filename,
      storedName,
      mimeType: data.mimetype,
      size,
      createdAt: Math.floor(Date.now() / 1000),
    })

    return reply.code(201).send({
      attachment: { id, taskId, originalName: data.filename, mimeType: data.mimetype, size, createdAt: Math.floor(Date.now() / 1000) },
    })
  })

  // GET /tasks/:taskId/attachments — list attachments
  fastify.get('/tasks/:taskId/attachments', {
    schema: {
      tags: ['attachments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: { type: 'object', properties: { taskId: { type: 'string' } } },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  taskId: { type: 'string' },
                  uploadedBy: { type: 'string' },
                  originalName: { type: 'string' },
                  mimeType: { type: 'string', nullable: true },
                  size: { type: 'integer', nullable: true },
                  createdAt: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply) => {
    const { taskId } = request.params
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).get()
    if (!task) return reply.code(404).send({ error: 'Task not found' })

    const access = await checkProjectAccess(request.user.id, task.projectId, request.user.role, reply)
    if (!access) return

    const rows = await db.select().from(attachments).where(eq(attachments.taskId, taskId))
    return reply.send({ data: rows })
  })

  // GET /attachments/:id/download — download file
  fastify.get('/attachments/:id/download', {
    schema: {
      tags: ['attachments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const attachment = await db.select().from(attachments).where(eq(attachments.id, request.params.id)).get()
    if (!attachment) return reply.code(404).send({ error: 'Attachment not found' })

    const task = await db.select().from(tasks).where(eq(tasks.id, attachment.taskId)).get()
    if (!task) return reply.code(404).send({ error: 'Task not found' })

    const access = await checkProjectAccess(request.user.id, task.projectId, request.user.role, reply)
    if (!access) return

    const filePath = path.join(UPLOADS_DIR, attachment.storedName)
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'File not found on disk' })

    reply.header('Content-Disposition', `attachment; filename="${attachment.originalName}"`)
    reply.header('Content-Type', attachment.mimeType ?? 'application/octet-stream')
    return reply.send(createReadStream(filePath))
  })

  // DELETE /attachments/:id
  fastify.delete('/attachments/:id', {
    schema: {
      tags: ['attachments'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const attachment = await db.select().from(attachments).where(eq(attachments.id, request.params.id)).get()
    if (!attachment) return reply.code(404).send({ error: 'Attachment not found' })

    if (attachment.uploadedBy !== request.user.id && request.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Not authorized' })
    }

    const filePath = path.join(UPLOADS_DIR, attachment.storedName)
    if (existsSync(filePath)) unlinkSync(filePath)

    await db.delete(attachments).where(eq(attachments.id, attachment.id))
    return reply.send({ message: 'Attachment deleted' })
  })
}
