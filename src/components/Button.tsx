import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'md' | 'lg'
  icon?: ReactNode
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-md)] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap'

const variants: Record<string, string> = {
  primary: 'text-white shadow-sm hover:brightness-110',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]',
  danger: 'text-white bg-[var(--color-expense)] hover:brightness-110',
  ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-muted)]',
}

const sizes: Record<string, string> = {
  md: 'px-[var(--sp-5)] py-[var(--sp-3)] text-[var(--fs-md)] min-h-[var(--tap)]',
  lg: 'px-[var(--sp-6)] py-[var(--sp-4)] text-[var(--fs-lg)] min-h-[3.25rem]',
}

export function Button({ variant = 'primary', size = 'md', icon, children, className = '', style, ...props }: ButtonProps) {
  const primaryStyle = variant === 'primary' ? { backgroundColor: 'var(--color-accent)', ...style } : style
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={primaryStyle}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
