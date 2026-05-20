import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi, tasksApi } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useAuthStore } from '../store/auth'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface Stat {
  label: string
  value: number
  total?: number
  tone: 'neutral' | 'progress' | 'success'
}

function StatCard({ stat }: { stat: Stat }) {
  const toneStyles = {
    neutral: 'bg-canvas-soft-2 text-body',
    progress: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
  }[stat.tone]

  const pct = stat.total && stat.total > 0 ? Math.round((stat.value / stat.total) * 100) : null

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-mute font-medium uppercase tracking-wider">{stat.label}</p>
        {pct !== null && (
          <span
            className={['text-[10px] font-semibold rounded-pill px-1.5 py-0.5', toneStyles].join(
              ' '
            )}
          >
            {pct}%
          </span>
        )}
      </div>
      <p className="text-3xl font-semibold text-ink leading-none">{stat.value}</p>
      {stat.total !== undefined && (
        <p className="text-xs text-mute mt-2">of {stat.total} total</p>
      )}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 6 }),
  })

  const projects = projectsData?.data ?? []
  const firstProjectId = projects[0]?.id

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', firstProjectId],
    queryFn: () => tasksApi.list(firstProjectId!, { limit: 50 }),
    enabled: !!firstProjectId,
  })

  const tasks = tasksData?.data ?? []
  const totalTasks = tasksData?.meta?.total ?? tasks.length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const done = tasks.filter((t) => t.status === 'done').length
  const recentTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

  const stats: Stat[] = [
    { label: 'Total Tasks', value: totalTasks, tone: 'neutral' },
    { label: 'In Progress', value: inProgress, total: totalTasks, tone: 'progress' },
    { label: 'Completed', value: done, total: totalTasks, tone: 'success' },
  ]

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mute">
            {formatToday()}
          </p>
          <h1 className="text-2xl font-semibold text-ink mt-1">
            {greeting()},{' '}
            <span className="text-body">{user?.name?.split(' ')[0] ?? 'there'}</span>
          </h1>
          <p className="text-sm text-mute mt-1">
            Here's what's happening across your workspace.
          </p>
        </div>
        {firstProjectId && (
          <Link
            to={`/projects/${firstProjectId}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-pill bg-ink text-canvas text-sm font-medium hover:bg-ink/90 transition-colors shrink-0"
          >
            Open board
            <ArrowRight />
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      {/* Recent projects */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Recent projects</h2>
          <Link
            to="/projects"
            className="text-xs text-mute hover:text-ink transition-colors inline-flex items-center gap-1"
          >
            View all <span aria-hidden>→</span>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card variant="soft">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-body">No projects yet.</p>
              <Link to="/projects" className="text-sm text-link mt-1 hover:underline">
                Create one →
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((p) => {
              const memberCount = (p as unknown as { memberCount?: number }).memberCount ?? 0
              return (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="group flex flex-col gap-3 rounded-lg bg-canvas border border-hairline shadow-subtle hover:border-hairline-strong hover:shadow-card transition-all p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-ink truncate group-hover:text-link transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-mute mt-0.5">
                        {memberCount} member{memberCount !== 1 ? 's' : ''} ·{' '}
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-body line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Recent tasks</h2>
          {firstProjectId && (
            <Link
              to={`/projects/${firstProjectId}`}
              className="text-xs text-mute hover:text-ink transition-colors inline-flex items-center gap-1"
            >
              View all <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        {recentTasks.length === 0 ? (
          <Card variant="soft">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-10 w-10 rounded-full bg-canvas border border-hairline grid place-items-center mb-3">
                <svg viewBox="0 0 20 20" className="h-5 w-5 text-mute" fill="currentColor">
                  <path d="M9 2a1 1 0 011-1h0a1 1 0 011 1v1.07A7.001 7.001 0 0117 10a1 1 0 11-2 0 5 5 0 10-10 0 1 1 0 11-2 0 7.001 7.001 0 015-6.93V2z" />
                </svg>
              </div>
              <p className="text-sm text-body">No tasks yet.</p>
              <Link to="/projects" className="text-sm text-link mt-1 hover:underline">
                Go to Projects
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft/60">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Title
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Priority
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task, i) => (
                  <tr
                    key={task.id}
                    className={[
                      'group hover:bg-canvas-soft/50 transition-colors',
                      i < recentTasks.length - 1 ? 'border-b border-hairline' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="text-ink group-hover:text-link transition-colors font-medium"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={task.priority} />
                    </td>
                    <td className="px-4 py-3 text-mute">{formatDate(task.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </main>
  )
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  )
}
