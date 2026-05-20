import type { Task } from '../../lib/api'
import { TaskCard } from './TaskCard'

interface ColumnDef {
  key: Task['status']
  label: string
  dot: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'todo', label: 'Todo', dot: 'bg-mute' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'done', label: 'Done', dot: 'bg-green-500' },
]

interface KanbanBoardProps {
  tasks: Task[]
  membersById?: Record<string, { name: string }>
}

export function KanbanBoard({ tasks, membersById = {} }: KanbanBoardProps) {
  const byStatus = (status: Task['status']) => tasks.filter((t) => t.status === status)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = byStatus(col.key)
        return (
          <div key={col.key} className="flex flex-col">
            {/* Column header */}
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <span className={['h-2 w-2 rounded-full', col.dot].join(' ')} aria-hidden />
                <span className="text-xs font-semibold text-ink uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="text-[10px] font-medium text-mute bg-canvas-soft-2 rounded-pill px-2 py-0.5">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="flex flex-col gap-2 min-h-[160px] rounded-lg bg-canvas-soft/60 border border-hairline p-2">
              {colTasks.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-mute border-2 border-dashed border-hairline rounded-md">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assigneeName={task.assigneeId ? membersById[task.assigneeId]?.name : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
