import type { ReactNode } from 'react'
import { Card } from '../Card'

export function WidgetShell({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon?: string
  label: string
  value: string
  sub?: ReactNode
  tone?: 'income' | 'expense'
}) {
  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1">
      <div className="flex items-center gap-1.5 text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {/* Sin truncate: un monto largo (CHF con decimales, COP con miles) debe
          poder envolverse en vez de perderse cortado fuera de la celda. */}
      <div
        className="amount text-[var(--fs-lg)] font-bold leading-tight break-words"
        style={{ color: tone === 'expense' ? 'var(--color-expense)' : tone === 'income' ? 'var(--color-income)' : 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] leading-tight break-words">{sub}</div>}
    </Card>
  )
}
