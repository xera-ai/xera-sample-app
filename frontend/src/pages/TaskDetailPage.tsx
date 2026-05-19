import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, commentsApi, projectsApi, attachmentsApi } from '../lib/api'
import type { Task } from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuthStore } from '../store/auth'

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
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

  if (isLoading) return <div className="p-8 text-sm text-mute">Loading…</div>
  if (!task) return <div className="p-8 text-sm text-error">Task not found</div>

  const comments = commentsData?.data ?? []

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

  const assigneeName = members.find((m) => m.userId === task.assigneeId)?.name ?? null

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex gap-6">
        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Title */}
          {editingTitle ? (
            <input
              autoFocus
              className="text-xl font-semibold text-ink border-b border-ink bg-transparent outline-none w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            />
          ) : (
            <h1
              className="text-xl font-semibold text-ink cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {task.title}
            </h1>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-mute uppercase tracking-wider">Description</p>
            <textarea
              className="form-input min-h-[100px] resize-y py-2 text-sm"
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          </div>

          {/* HTML Notes — XSS surface */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-mute uppercase tracking-wider">HTML Notes</p>
              <span className="text-xs text-warning bg-warning-soft rounded px-1.5 py-0.5 font-mono">
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
                className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-body prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: notes }}
              />
            )}
          </div>

          {/* Attachments */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-mute uppercase tracking-wider">
                Attachments ({attachmentsList.length})
              </p>
              <button
                className="text-xs text-link hover:underline"
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
            {uploadMutation.isPending && (
              <p className="text-xs text-mute">Uploading…</p>
            )}
            {attachmentsList.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {attachmentsList.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-hairline bg-canvas px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <a
                        href={attachmentsApi.downloadUrl(att.id)}
                        className="text-sm text-link hover:underline truncate"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {att.originalName}
                      </a>
                      <span className="text-xs text-mute">
                        {formatBytes(att.size)} · {att.mimeType ?? 'unknown type'}
                      </span>
                    </div>
                    <button
                      className="text-xs text-error hover:underline ml-3 shrink-0"
                      onClick={() => deleteAttachmentMutation.mutate(att.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-mute uppercase tracking-wider">
              Comments ({comments.length})
            </p>
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-7 w-7 rounded-full bg-canvas-soft-2 border border-hairline flex items-center justify-center text-xs font-medium text-ink shrink-0">
                  {comment.author?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 bg-canvas rounded-lg border border-hairline p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink">
                      {comment.author?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-mute">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-body whitespace-pre-wrap">{comment.body}</p>
                </div>
              </div>
            ))}

            {/* Comment box */}
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-ink flex items-center justify-center text-xs font-medium text-canvas shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
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
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-56 shrink-0 flex flex-col gap-4">
          <div className="bg-canvas rounded-xl border border-hairline shadow-subtle p-4 flex flex-col gap-4">
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-mute">Status</p>
              <select
                className="form-input text-xs"
                value={task.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as Task['status'] })}
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-mute">Priority</p>
              <select
                className="form-input text-xs"
                value={task.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value as Task['priority'] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-mute">Assignee</p>
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
              {assigneeName && (
                <p className="text-xs text-mute">→ {assigneeName}</p>
              )}
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-mute">Due date</p>
              <input
                type="date"
                className="form-input text-xs"
                value={task.dueDate ?? ''}
                onChange={(e) => updateMutation.mutate({ dueDate: e.target.value || undefined })}
              />
            </div>

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-mute">Labels</p>
                <div className="flex flex-wrap gap-1">
                  {task.labels.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium border border-hairline"
                      style={{ backgroundColor: l.color + '22', color: l.color }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created */}
            <div className="flex flex-col gap-0.5 pt-2 border-t border-hairline">
              <p className="text-xs text-mute">Created {formatDate(task.createdAt)}</p>
            </div>
          </div>

          {/* Current badges */}
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant={task.status} />
            <Badge variant={task.priority} />
          </div>

          {/* Delete */}
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
