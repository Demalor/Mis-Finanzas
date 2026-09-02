import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: 'sm' | 'md' | 'lg'
}

const paddings: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div className={`card ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  )
}
