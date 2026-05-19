import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectsApi } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 50 }),
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ink">Projects</h1>
        <Button onClick={() => setShowModal(true)}>New Project</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-mute">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-canvas py-16 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-ink">No projects yet</p>
          <p className="text-sm text-mute mt-1">Create your first project to get started.</p>
          <Button className="mt-4" onClick={() => setShowModal(true)}>
            New Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-canvas rounded-xl border border-hairline shadow-subtle hover:border-hairline-strong hover:shadow-card transition-all p-5 flex flex-col gap-3"
            >
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-ink">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-mute mt-1 line-clamp-2">{project.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-hairline">
                <span className="text-xs text-mute">
                  {(project as any).memberCount ?? 0} member{((project as any).memberCount ?? 0) !== 1 ? 's' : ''}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  Open →
                </Button>
              </div>
            </div>
          ))}
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
