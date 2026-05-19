import Fastify from 'fastify'
import { mkdirSync } from 'fs'
import { recordRequest } from './routes/metrics.js'

// Ensure data directory exists
try {
  mkdirSync('./data', { recursive: true })
} catch {
  // Already exists
}

export async function buildServer() {
  const fastify = Fastify({
    logger: true,
  })

  // Register metrics hooks
  fastify.addHook('onRequest', async (request) => {
    (request as any)._startTime = Date.now()
  })

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any)._startTime
    if (startTime) {
      const latencyMs = Date.now() - startTime
      const route = request.routeOptions?.url ?? request.url ?? 'unknown'
      recordRequest(route, latencyMs)
    }
  })

  // Import plugins
  const corsPlugin = (await import('./plugins/cors.js')).default
  const rateLimitPlugin = (await import('./plugins/rate-limit.js')).default
  const swaggerPlugin = (await import('./plugins/swagger.js')).default
  const authPlugin = (await import('./plugins/auth.js')).default

  // Register plugins
  await fastify.register(corsPlugin)
  await fastify.register(rateLimitPlugin)
  await fastify.register(swaggerPlugin)
  await fastify.register(authPlugin)
  await fastify.register(import('@fastify/multipart'), {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — intentionally permissive for security testing
  })

  // Import routes
  const healthRoutes = (await import('./routes/health.js')).default
  const metricsRoutes = (await import('./routes/metrics.js')).default
  const seedRoutes = (await import('./routes/seed.js')).default
  const authRoutes = (await import('./routes/auth.js')).default
  const usersRoutes = (await import('./routes/users.js')).default
  const apiKeysRoutes = (await import('./routes/api-keys.js')).default
  const projectsRoutes = (await import('./routes/projects.js')).default
  const tasksRoutes = (await import('./routes/tasks.js')).default
  const commentsRoutes = (await import('./routes/comments.js')).default
  const labelsRoutes = (await import('./routes/labels.js')).default
  const attachmentsRoutes = (await import('./routes/attachments.js')).default

  // Register routes (health and metrics outside API prefix)
  await fastify.register(healthRoutes)
  await fastify.register(metricsRoutes)

  // Register all API routes under /api/v1
  await fastify.register(async (api) => {
    await api.register(seedRoutes)
    await api.register(authRoutes, { prefix: '/auth' })
    await api.register(usersRoutes, { prefix: '/users' })
    await api.register(apiKeysRoutes, { prefix: '/api-keys' })
    await api.register(projectsRoutes, { prefix: '/projects' })
    await api.register(tasksRoutes)
    await api.register(commentsRoutes)
    await api.register(labelsRoutes)
    await api.register(attachmentsRoutes)
  }, { prefix: '/api/v1' })

  return fastify
}

export async function main() {
  const fastify = await buildServer()
  const port = parseInt(process.env.PORT ?? '3000', 10)

  try {
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on port ${port}`)

    // Auto-seed on first boot when DB is empty.
    // Controlled by AUTO_SEED env var (default: true unless NODE_ENV=production).
    const autoSeed = process.env.AUTO_SEED
      ? process.env.AUTO_SEED === 'true'
      : process.env.NODE_ENV !== 'production'

    if (autoSeed) {
      const { isDbEmpty, runSeed } = await import('./lib/seed.js')
      if (await isDbEmpty()) {
        fastify.log.info('Empty database detected — running auto-seed...')
        const keys = await runSeed()
        fastify.log.info(`Auto-seed complete. admin@test.com / admin123 | user@test.com / user123`)
        fastify.log.info(`Admin API key: ${keys.adminApiKey}`)
        fastify.log.info(`User  API key: ${keys.userApiKey}`)
      }
    }
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
