import { useNavigate } from 'react-router-dom'
import type { Task } from '../../lib/api'
import { Badge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function isDueSoon(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 * 3 && diff >= 0
}

function isOverdue(dateStr: string, status: Task['status']) {
  if (status === 'done') return false
  return new Date(dateStr).getTime() < Date.now()
}

interface TaskCardProps {
  task: Task
  assigneeName?: string
}

export function TaskCard({ task, assigneeName }: TaskCardProps) {
  const navigate = useNavigate()
  const overdue = task.dueDate ? isOverdue(task.dueDate, task.status) : false
  const dueSoon = task.dueDate && !overdue ? isDueSoon(task.dueDate) : false

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-canvas rounded-md border border-hairline p-3 cursor-pointer hover:border-hairline-strong hover:shadow-subtle transition-all group"
    >
      <p className="text-sm font-medium text-ink leading-snug mb-2 line-clamp-2 group-hover:text-link transition-colors">
        {task.title}
      </p>

      <div className="flex items-center justify-between gap-2">
        <Badge variant={task.priority} />
        {assigneeName && (
          <Avatar name={assigneeName} size="sm" className="!h-6 !w-6 !text-[9px]" />
        )}
      </div>

      {task.dueDate && (
        <div
          className={[
            'flex items-center gap-1 mt-2 text-[11px] font-medium',
            overdue ? 'text-error' : dueSoon ? 'text-amber-700' : 'text-mute',
          ].join(' ')}
        >
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
              clipRule="evenodd"
            />
          </svg>
          {formatDate(task.dueDate)}
          {overdue && <span>· Overdue</span>}
        </div>
      )}
    </div>
  )
}
