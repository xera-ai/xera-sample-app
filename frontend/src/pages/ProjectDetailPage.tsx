import React, { useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, tasksApi } from '../lib/api'
import type { Task } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { KanbanBoard } from '../components/app/KanbanBoard'
import { useToast } from '../components/ui/Toast'

type Tab = 'board' | 'members'

const defaultTask: Partial<Task> = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('board')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Partial<Task>>(defaultTask)

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.list(id!, { limit: 100 }),
    enabled: !!id,
  })

  const { data: members } = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => projectsApi.getMembers(id!),
    enabled: !!id,
  })

  const membersById = useMemo(() => {
    const map: Record<string, { name: string }> = {}
    for (const m of members ?? []) {
      if (m.user) map[m.userId] = { name: m.user.name }
    }
    return map
  }, [members])

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] })
      toast.success('Task created!')
      setShowModal(false)
      setForm(defaultTask)
    },
    onError: () => toast.error('Failed to create task'),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.dueDate) delete payload.dueDate
    createMutation.mutate(payload)
  }

  if (projectLoading)
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-sm text-mute">Loading…</div>
      </main>
    )
  if (!project)
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-sm text-error">Project not found.</div>
      </main>
    )

  const tasks = tasksData?.data ?? []

  const tabClass = (t: Tab) =>
    [
      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      tab === t
        ? 'bg-canvas shadow-subtle text-ink'
        : 'text-mute hover:text-ink',
    ].join(' ')

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-xs text-mute hover:text-ink transition-colors mb-3"
      >
        <span aria-hidden>←</span> Projects
      </Link>

      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4 min-w-0">
          <Avatar name={project.name} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink truncate">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-mute mt-1 max-w-xl">{project.description}</p>
            )}
            <p className="text-xs text-mute mt-2">
              {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''} ·{' '}
              Created {formatDate(project.createdAt)}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Task</Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-canvas-soft-2 rounded-lg p-1 w-fit mb-6 border border-hairline">
        <button className={tabClass('board')} onClick={() => setTab('board')}>
          Board
        </button>
        <button className={tabClass('members')} onClick={() => setTab('members')}>
          Members
        </button>
      </div>

      {/* Tab content */}
      {tab === 'board' &&
        (tasksLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-canvas-soft/60 border border-hairline animate-pulse" />
            ))}
          </div>
        ) : (
          <KanbanBoard tasks={tasks} membersById={membersById} />
        ))}

      {tab === 'members' && (
        <Card className="p-0 overflow-hidden">
          {!members || members.length === 0 ? (
            <div className="py-12 text-center text-sm text-mute">No members yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft/60">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr
                    key={m.userId}
                    className={[
                      'hover:bg-canvas-soft/50 transition-colors',
                      i < members.length - 1 ? 'border-b border-hairline' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.user?.name ?? m.userId} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-ink truncate">
                            {m.user?.name ?? m.userId}
                          </p>
                          {m.user?.email && (
                            <p className="text-xs text-mute truncate">{m.user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.role === 'admin' ? 'admin' : 'user'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Task">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            label="Title"
            placeholder="Task title"
            value={form.title ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink">Description</label>
            <textarea
              className="form-input h-20 resize-none py-2"
              placeholder="Optional description…"
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink">Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as Task['status'] }))
                }
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink">Priority</label>
              <select
                className="form-input"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <Input
            label="Due date"
            type="date"
            value={form.dueDate ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  )
}
