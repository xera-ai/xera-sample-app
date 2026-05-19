import type { FastifyRequest, FastifyReply } from 'fastify'
import { createHash } from 'crypto'
import { db } from '../db/index.js'
import { apiKeys, users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // 1. Try JWT Bearer token
  const authHeader = request.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await request.jwtVerify()
      const payload = request.user as { id: string; email: string; role: string }
      request.user = { id: payload.id, email: payload.email, role: payload.role }
      return
    } catch {
      reply.code(401).send({ error: 'Invalid or expired token' })
      return
    }
  }

  // 2. Try X-API-Key header
  const apiKey = request.headers['x-api-key'] as string | undefined
  if (apiKey) {
    const keyHash = sha256(apiKey)
    const keyRow = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).get()
    if (keyRow) {
      const user = await db.select().from(users).where(eq(users.id, keyRow.userId)).get()
      if (user) {
        // Update lastUsedAt
        await db
          .update(apiKeys)
          .set({ lastUsedAt: Math.floor(Date.now() / 1000) })
          .where(eq(apiKeys.id, keyRow.id))
        request.user = { id: user.id, email: user.email, role: user.role ?? 'user' }
        return
      }
    }
    reply.code(401).send({ error: 'Invalid API key' })
    return
  }

  reply.code(401).send({ error: 'Authentication required' })
}

export async function authenticateOptional(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  // 1. Try JWT Bearer token
  const authHeader = request.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await request.jwtVerify()
      const payload = request.user as { id: string; email: string; role: string }
      request.user = { id: payload.id, email: payload.email, role: payload.role }
      return
    } catch {
      return
    }
  }

  // 2. Try X-API-Key header
  const apiKey = request.headers['x-api-key'] as string | undefined
  if (apiKey) {
    const keyHash = sha256(apiKey)
    const keyRow = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).get()
    if (keyRow) {
      const user = await db.select().from(users).where(eq(users.id, keyRow.userId)).get()
      if (user) {
        await db
          .update(apiKeys)
          .set({ lastUsedAt: Math.floor(Date.now() / 1000) })
          .where(eq(apiKeys.id, keyRow.id))
        request.user = { id: user.id, email: user.email, role: user.role ?? 'user' }
      }
    }
  }
}
