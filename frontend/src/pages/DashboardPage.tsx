import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi, tasksApi } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 5 }),
  })

  const firstProjectId = projectsData?.data[0]?.id

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

  const stats = [
    { label: 'Total Tasks', value: totalTasks },
    { label: 'In Progress', value: inProgress },
    { label: 'Completed', value: done },
  ]

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-mute font-medium uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-3xl font-semibold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Recent tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Recent Tasks</h2>
          {firstProjectId && (
            <Link
              to={`/projects/${firstProjectId}`}
              className="text-xs text-mute hover:text-ink transition-colors"
            >
              View all →
            </Link>
          )}
        </div>

        {recentTasks.length === 0 ? (
          <Card variant="soft">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-mute">No tasks yet.</p>
              <Link to="/projects" className="text-sm text-link mt-1 hover:underline">
                Go to Projects
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Title</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Priority</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task, i) => (
                  <tr
                    key={task.id}
                    className={i < recentTasks.length - 1 ? 'border-b border-hairline' : ''}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="text-ink hover:text-link transition-colors font-medium"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={task.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={task.priority} />
                    </td>
                    <td className="px-4 py-2.5 text-mute">{formatDate(task.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  )
}
