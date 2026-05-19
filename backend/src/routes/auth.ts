// @ts-nocheck
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'crypto'
import { db } from '../db/index.js'
import { users, refreshTokens } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { authenticate } from '../middleware/authenticate.js'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string' },
  },
}

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post('/register', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: userSchema,
          },
        },
        409: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { name: string; email: string; password: string } }>, reply: FastifyReply) => {
    const { name, email, password } = request.body

    // Check uniqueness
    const existing = await db.select().from(users).where(eq(users.email, email)).get()
    if (existing) {
      return reply.code(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const id = uuidv4()
    const createdAt = Math.floor(Date.now() / 1000)

    await db.insert(users).values({ id, name, email, passwordHash, role: 'user', createdAt })

    const user = { id, name, email, role: 'user' }
    return reply.code(201).send({ user })
  })

  // POST /auth/login
  fastify.post('/login', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            user: userSchema,
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) => {
    const { email, password } = request.body

    const user = await db.select().from(users).where(eq(users.email, email)).get()
    if (!user) {
      return reply.code(401).send({ error: 'Invalid email or password' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' })
    }

    const access_token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    )

    const rawRefreshToken = uuidv4()
    const tokenHash = sha256(rawRefreshToken)
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

    await db.insert(refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
    })

    return reply.send({
      access_token,
      refresh_token: rawRefreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  })

  // POST /auth/refresh
  fastify.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { refresh_token: string } }>, reply: FastifyReply) => {
    const { refresh_token } = request.body
    const tokenHash = sha256(refresh_token)
    const now = Math.floor(Date.now() / 1000)

    const tokenRow = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).get()
    if (!tokenRow) {
      return reply.code(401).send({ error: 'Invalid refresh token' })
    }

    if (tokenRow.expiresAt < now) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRow.id))
      return reply.code(401).send({ error: 'Refresh token expired' })
    }

    const user = await db.select().from(users).where(eq(users.id, tokenRow.userId)).get()
    if (!user) {
      return reply.code(401).send({ error: 'User not found' })
    }

    const access_token = fastify.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' }
    )

    return reply.send({ access_token })
  })

  // POST /auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: { refresh_token: string } }>, reply: FastifyReply) => {
    const { refresh_token } = request.body
    const tokenHash = sha256(refresh_token)

    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash))

    return reply.send({ message: 'Logged out successfully' })
  })

  // GET /auth/me
  fastify.get('/me', {
    schema: {
      tags: ['auth'],
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'number' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await db.select().from(users).where(eq(users.id, request.user.id)).get()
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  })
}
