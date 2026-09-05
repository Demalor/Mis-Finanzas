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
  sub?: string
  tone?: 'income' | 'expense'
}) {
  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1">
      <div className="flex items-center gap-1.5 text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div
        className="amount text-[var(--fs-lg)] font-bold truncate"
        style={{ color: tone === 'expense' ? 'var(--color-expense)' : tone === 'income' ? 'var(--color-income)' : 'var(--color-text)' }}
      >
        {value}
      </div>
      {sub && <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">{sub}</div>}
    </Card>
  )
}
