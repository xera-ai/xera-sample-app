import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

interface RouteStats {
  count: number
  latencies: number[]
}

export const metricsStore: {
  totalRequests: number
  routeStats: Record<string, RouteStats>
} = {
  totalRequests: 0,
  routeStats: {},
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

export function recordRequest(route: string, latencyMs: number): void {
  metricsStore.totalRequests++

  if (!metricsStore.routeStats[route]) {
    metricsStore.routeStats[route] = { count: 0, latencies: [] }
  }

  const stats = metricsStore.routeStats[route]
  stats.count++

  // Keep last 1000 latencies
  stats.latencies.push(latencyMs)
  if (stats.latencies.length > 1000) {
    stats.latencies.shift()
  }
}

export default async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/metrics', {
    schema: {
      tags: ['metrics'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalRequests: { type: 'integer' },
            routeStats: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  count: { type: 'integer' },
                  p50: { type: 'number' },
                  p95: { type: 'number' },
                  p99: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const routeStats: Record<string, { count: number; p50: number; p95: number; p99: number }> = {}

    for (const [route, stats] of Object.entries(metricsStore.routeStats)) {
      const sorted = [...stats.latencies].sort((a, b) => a - b)
      routeStats[route] = {
        count: stats.count,
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
      }
    }

    return reply.send({
      totalRequests: metricsStore.totalRequests,
      routeStats,
    })
  })
}
