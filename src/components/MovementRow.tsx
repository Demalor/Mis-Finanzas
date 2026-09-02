import type { Movement, Category } from '../types/models'
import { formatAmount } from '../utils/currency'
import { formatDateReadable } from '../utils/date'

interface MovementRowProps {
  movement: Movement
  category?: Category
  currency?: string
  onClick?: () => void
}

export function MovementRow({ movement, category, currency = 'COP', onClick }: MovementRowProps) {
  const isIncome = movement.type === 'ingreso'
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-[var(--sp-3)] py-[var(--sp-3)] px-[var(--sp-2)] hover:bg-[var(--color-muted)] rounded-[var(--radius-md)] transition-colors text-left"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--fs-lg)] shrink-0"
        style={{ background: category?.color ? `${category.color}22` : 'var(--color-muted)' }}
      >
        {category?.icon ?? '❓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[var(--fs-md)] font-medium truncate">{movement.description || category?.name || 'Movimiento'}</div>
        <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] truncate">
          {category?.name ?? 'Sin categoría'} · {formatDateReadable(movement.date)}
        </div>
      </div>
      <div
        className="amount text-[var(--fs-md)] font-bold shrink-0 text-right"
        style={{ color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }}
      >
        {isIncome ? '+ ' : '− '}
        {formatAmount(movement.amount, currency)}
      </div>
    </button>
  )
}
