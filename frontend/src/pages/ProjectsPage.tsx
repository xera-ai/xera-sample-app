import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { projectsApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { Avatar } from '../components/ui/Avatar'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectsApi.list({ limit: 50, search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created!')
      setShowModal(false)
      setName('')
      setDescription('')
      navigate(`/projects/${project.id}`)
    },
    onError: () => toast.error('Failed to create project'),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ name, description })
  }

  const projects = data?.data ?? []
  const total = data?.meta?.total ?? projects.length

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-mute">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold text-ink mt-1">Projects</h1>
          <p className="text-sm text-mute mt-1">
            {total} project{total !== 1 ? 's' : ''} · click any card to open its board.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Project</Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 text-mute absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l3 3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-input pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-canvas border border-hairline animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-canvas py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-canvas-soft-2 grid place-items-center mb-3">
            <svg viewBox="0 0 20 20" className="h-6 w-6 text-mute" fill="currentColor">
              <path d="M2 4a2 2 0 012-2h4a2 2 0 012 2v1h6a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink">
            {search ? 'No projects match your search.' : 'No projects yet'}
          </p>
          <p className="text-sm text-mute mt-1">
            {search ? 'Try a different keyword.' : 'Create your first project to get started.'}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              + New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const memberCount =
              (project as unknown as { memberCount?: number }).memberCount ?? 0
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group flex flex-col gap-3 rounded-lg bg-canvas border border-hairline shadow-subtle hover:border-hairline-strong hover:shadow-card transition-all p-5"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={project.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink truncate group-hover:text-link transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-mute mt-0.5">
                      Created {formatDate(project.createdAt)}
                    </p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs text-body line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <span className="text-xs text-mute inline-flex items-center gap-1">
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3.5 w-3.5"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
                    </svg>
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-mute group-hover:text-ink transition-colors">
                    Open →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Project">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Project name"
            placeholder="My Awesome Project"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink">Description</label>
            <textarea
              className="form-input h-20 resize-none py-2"
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
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
