import React from 'react'

interface CardProps {
  variant?: 'default' | 'soft'
  className?: string
  children: React.ReactNode
}

export function Card({ variant = 'default', className = '', children }: CardProps) {
  const base = 'rounded-lg p-4'
  const variants = {
    default: 'bg-canvas border border-hairline shadow-subtle',
    soft: 'bg-canvas-soft border border-hairline',
  }
  return (
    <div className={[base, variants[variant], className].join(' ')}>
      {children}
    </div>
  )
}
