interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function hashHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 360
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name || '?')
  const hue = hashHue(name || 'x')
  const bg = `hsl(${hue}, 55%, 32%)`
  const text = `hsl(${hue}, 60%, 92%)`

  return (
    <span
      aria-label={name}
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold tracking-tight select-none ring-1 ring-black/5',
        sizeClasses[size],
        className,
      ].join(' ')}
      style={{ backgroundColor: bg, color: text }}
    >
      {initials}
    </span>
  )
}
