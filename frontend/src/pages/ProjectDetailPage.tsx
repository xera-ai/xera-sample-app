import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, tasksApi } from '../lib/api'
import type { Task } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
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

  if (projectLoading) return <div className="p-8 text-sm text-mute">Loading…</div>
  if (!project) return <div className="p-8 text-sm text-error">Project not found</div>

  const tasks = tasksData?.data ?? []

  const tabClass = (t: Tab) =>
    [
      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      tab === t ? 'bg-canvas shadow-subtle text-ink' : 'text-mute hover:text-ink',
    ].join(' ')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-mute mt-0.5">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setShowModal(true)}>Add Task</Button>
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
      {tab === 'board' && (
        <>
          {tasksLoading ? (
            <div className="text-sm text-mute">Loading tasks…</div>
          ) : (
            <KanbanBoard tasks={tasks} />
          )}
        </>
      )}

      {tab === 'members' && (
        <div className="bg-canvas rounded-xl border border-hairline shadow-subtle overflow-hidden">
          {!members || members.length === 0 ? (
            <div className="py-10 text-center text-sm text-mute">No members yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-mute">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.userId} className={i < members.length - 1 ? 'border-b border-hairline' : ''}>
                    <td className="px-4 py-2.5 text-ink">{m.user?.name ?? m.userId}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={m.role === 'admin' ? 'admin' : 'user'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task['status'] }))}
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
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))}
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
