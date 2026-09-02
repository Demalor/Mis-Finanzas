import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'sm' | 'md' | 'lg'
}

const paddings: Record<string, string> = {
  sm: 'p-[var(--sp-4)]',
  md: 'p-[var(--sp-5)]',
  lg: 'p-[var(--sp-6)]',
}

export function Card({ children, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div className={`card ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  )
}
