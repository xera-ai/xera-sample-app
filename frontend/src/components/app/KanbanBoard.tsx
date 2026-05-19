import type { Task } from '../../lib/api'
import { TaskCard } from './TaskCard'

const COLUMNS: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

interface KanbanBoardProps {
  tasks: Task[]
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const byStatus = (status: Task['status']) => tasks.filter((t) => t.status === status)

  return (
    <div className="grid grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = byStatus(col.key)
        return (
          <div key={col.key} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-mute uppercase tracking-wider">
                {col.label}
              </span>
              <span className="text-xs text-mute bg-canvas-soft-2 rounded-full px-1.5 py-0.5">
                {colTasks.length}
              </span>
            </div>
            {/* Tasks */}
            <div className="flex flex-col gap-2 min-h-[120px] rounded-lg bg-canvas-soft border border-hairline p-2">
              {colTasks.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-mute">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
