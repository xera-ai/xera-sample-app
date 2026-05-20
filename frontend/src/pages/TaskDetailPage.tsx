import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, commentsApi, projectsApi, attachmentsApi } from '../lib/api'
import type { Task } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'
import { useAuthStore } from '../store/auth'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts * 1000
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(ts)
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [commentBody, setCommentBody] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.get(id!),
    enabled: !!id,
  })

  const { data: project } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => projectsApi.get(task!.projectId),
    enabled: !!task?.projectId,
  })

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentsApi.list(id!),
    enabled: !!id,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', task?.projectId],
    queryFn: () => projectsApi.getMembers(task!.projectId),
    enabled: !!task?.projectId,
  })

  const { data: attachmentsList = [] } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => attachmentsApi.list(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setNotes(task.notes ?? '')
    }
  }, [task])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', task?.projectId] })
    },
    onError: () => toast.error('Failed to update task'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(id!),
    onSuccess: () => {
      toast.success('Task deleted')
      navigate(task?.projectId ? `/projects/${task.projectId}` : '/projects')
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const commentMutation = useMutation({
    mutationFn: (body: string) => commentsApi.create(id!, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      setCommentBody('')
    },
    onError: () => toast.error('Failed to post comment'),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', id] })
      toast.success('File uploaded')
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.delete(attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', id] }),
    onError: () => toast.error('Failed to delete attachment'),
  })

  if (isLoading)
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-sm text-mute">Loading…</div>
      </main>
    )
  if (!task)
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="text-sm text-error">Task not found.</div>
      </main>
    )

  const comments = commentsData?.data ?? []
  const assignee = members.find((m) => m.userId === task.assigneeId)

  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      updateMutation.mutate({ title: title.trim() })
    }
    setEditingTitle(false)
  }

  const handleDescriptionBlur = () => {
    if (description !== (task.description ?? '')) {
      updateMutation.mutate({ description })
    }
  }

  const handleNotesBlur = () => {
    if (notes !== (task.notes ?? '')) {
      updateMutation.mutate({ notes })
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-mute mb-3">
        <Link to="/projects" className="hover:text-ink transition-colors">
          Projects
        </Link>
        {project && (
          <>
            <span aria-hidden>/</span>
            <Link to={`/projects/${project.id}`} className="hover:text-ink transition-colors">
              {project.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="text-body">Task</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              className="text-2xl font-semibold text-ink border-b-2 border-ink bg-transparent outline-none w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            />
          ) : (
            <h1
              className="text-2xl font-semibold text-ink cursor-pointer hover:opacity-70 transition-opacity inline-flex items-center gap-2"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {task.title}
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-mute opacity-0 hover:opacity-100" fill="currentColor">
                <path d="M2.695 14.763l-1.262 3.155a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant={task.status} />
            <Badge variant={task.priority} />
            {task.labels?.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium border"
                style={{ backgroundColor: l.color + '22', color: l.color, borderColor: l.color + '44' }}
              >
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Description */}
          <section>
            <p className="text-xs font-semibold text-mute uppercase tracking-wider mb-2">
              Description
            </p>
            <textarea
              className="form-input min-h-[100px] resize-y py-2 text-sm"
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          </section>

          {/* HTML Notes */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-mute uppercase tracking-wider">HTML Notes</p>
              <span className="text-[10px] text-amber-700 bg-warning-soft rounded-pill px-1.5 py-0.5 font-medium">
                rendered as HTML
              </span>
            </div>
            <textarea
              className="form-input min-h-[80px] resize-y py-2 text-sm font-mono"
              placeholder="<b>Bold text</b>, <a href='...'>links</a>, or any HTML…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
            />
            {notes && (
              <div
                className="rounded-lg border border-hairline bg-canvas-soft p-3 mt-2 text-sm text-body prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: notes }}
              />
            )}
          </section>

          {/* Attachments */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-mute uppercase tracking-wider">
                Attachments
                <span className="ml-1.5 text-mute">({attachmentsList.length})</span>
              </p>
              <button
                className="text-xs text-link hover:underline font-medium"
                onClick={() => fileInputRef.current?.click()}
              >
                + Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadMutation.mutate(file)
                  e.target.value = ''
                }}
              />
            </div>
            {uploadMutation.isPending && <p className="text-xs text-mute">Uploading…</p>}
            {attachmentsList.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {attachmentsList.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-hairline bg-canvas px-3 py-2 hover:border-hairline-strong transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-canvas-soft-2 grid place-items-center shrink-0">
                        <svg viewBox="0 0 20 20" className="h-4 w-4 text-mute" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <a
                          href={attachmentsApi.downloadUrl(att.id)}
                          className="text-sm text-ink hover:text-link transition-colors truncate font-medium"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {att.originalName}
                        </a>
                        <span className="text-xs text-mute">
                          {formatBytes(att.size)} · {att.mimeType ?? 'unknown type'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="text-xs text-mute hover:text-error transition-colors ml-3 shrink-0"
                      onClick={() => deleteAttachmentMutation.mutate(att.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute">No files yet.</p>
            )}
          </section>

          {/* Comments */}
          <section>
            <p className="text-xs font-semibold text-mute uppercase tracking-wider mb-3">
              Activity
              <span className="ml-1.5 text-mute">({comments.length})</span>
            </p>

            {/* Composer */}
            <div className="flex gap-3 mb-4">
              <Avatar name={user?.name ?? '?'} size="sm" />
              <div className="flex-1 flex flex-col gap-2">
                <textarea
                  className="form-input min-h-[72px] resize-none py-2 text-sm"
                  placeholder="Write a comment…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => commentBody.trim() && commentMutation.mutate(commentBody.trim())}
                    loading={commentMutation.isPending}
                    disabled={!commentBody.trim()}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing comments */}
            <div className="flex flex-col gap-3">
              {comments.length === 0 ? (
                <p className="text-xs text-mute">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar name={comment.author?.name ?? '?'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-ink">
                          {comment.author?.name ?? 'Unknown'}
                        </span>
                        <span className="text-[11px] text-mute">
                          {relativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <div className="bg-canvas-soft rounded-lg border border-hairline px-3 py-2">
                        <p className="text-sm text-body whitespace-pre-wrap">{comment.body}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <aside className="flex flex-col gap-4">
          <Card>
            <SidebarRow label="Status">
              <select
                className="form-input text-xs"
                value={task.status}
                onChange={(e) =>
                  updateMutation.mutate({ status: e.target.value as Task['status'] })
                }
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </SidebarRow>

            <SidebarRow label="Priority">
              <select
                className="form-input text-xs"
                value={task.priority}
                onChange={(e) =>
                  updateMutation.mutate({ priority: e.target.value as Task['priority'] })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </SidebarRow>

            <SidebarRow label="Assignee">
              <select
                className="form-input text-xs"
                value={task.assigneeId ?? ''}
                onChange={(e) =>
                  updateMutation.mutate({ assigneeId: e.target.value || undefined })
                }
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
              {assignee?.name && (
                <div className="flex items-center gap-2 mt-2">
                  <Avatar name={assignee.name} size="sm" className="!h-6 !w-6 !text-[9px]" />
                  <span className="text-xs text-body">{assignee.name}</span>
                </div>
              )}
            </SidebarRow>

            <SidebarRow label="Due date">
              <input
                type="date"
                className="form-input text-xs"
                value={task.dueDate ?? ''}
                onChange={(e) =>
                  updateMutation.mutate({ dueDate: e.target.value || undefined })
                }
              />
            </SidebarRow>

            <div className="pt-3 mt-1 border-t border-hairline text-[11px] text-mute">
              Created {formatDate(task.createdAt)}
            </div>
          </Card>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Delete this task?')) deleteMutation.mutate()
            }}
            loading={deleteMutation.isPending}
          >
            Delete task
          </Button>
        </aside>
      </div>
    </main>
  )
}

function SidebarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3 last:mb-0">
      <p className="text-[11px] font-semibold text-mute uppercase tracking-wider">{label}</p>
      {children}
    </div>
  )
}
