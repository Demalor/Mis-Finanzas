import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'md' | 'lg'
  icon?: ReactNode
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none'

const variants: Record<string, string> = {
  primary: 'text-white shadow-sm hover:brightness-110',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]',
  danger: 'text-white bg-[var(--color-expense)] hover:brightness-110',
  ghost: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-muted)]',
}

const sizes: Record<string, string> = {
  md: 'px-5 py-3 text-[16px] min-h-[48px]',
  lg: 'px-7 py-4 text-[18px] min-h-[56px]',
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
