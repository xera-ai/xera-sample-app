import type { Task } from '../../lib/api'

type StatusVariant = Task['status']
type PriorityVariant = Task['priority']
type Variant = StatusVariant | PriorityVariant | 'admin' | 'user'

const variantClasses: Record<string, string> = {
  // Status
  todo: 'bg-canvas-soft-2 text-body border border-hairline',
  in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
  done: 'bg-green-50 text-green-700 border border-green-200',
  // Priority
  low: 'bg-canvas-soft-2 text-mute border border-hairline',
  medium: 'bg-warning-soft text-amber-700 border border-amber-200',
  high: 'bg-error-soft text-error border border-red-200',
  // Role
  admin: 'bg-blue-50 text-blue-700 border border-blue-200',
  user: 'bg-canvas-soft-2 text-body border border-hairline',
}

const labelMap: Record<string, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  admin: 'Admin',
  user: 'User',
}

interface BadgeProps {
  variant: Variant
  className?: string
}

export function Badge({ variant, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
        variantClasses[variant] ?? 'bg-canvas-soft-2 text-body border border-hairline',
        className,
      ].join(' ')}
    >
      {labelMap[variant] ?? variant}
    </span>
  )
}
