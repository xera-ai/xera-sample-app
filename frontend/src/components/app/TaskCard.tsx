import { useNavigate } from 'react-router-dom'
import type { Task } from '../../lib/api'
import { Badge } from '../ui/Badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/tasks/${task.id}`)}
      className="bg-canvas rounded-md border border-hairline p-3 cursor-pointer hover:border-hairline-strong hover:shadow-subtle transition-all group"
    >
      <p className="text-sm font-medium text-ink leading-snug group-hover:text-ink mb-2 line-clamp-2">
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant={task.priority} />
        </div>
        {task.dueDate && (
          <span className="text-xs text-mute shrink-0">{formatDate(task.dueDate)}</span>
        )}
      </div>
    </div>
  )
}
