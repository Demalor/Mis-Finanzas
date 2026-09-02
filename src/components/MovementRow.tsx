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
      className="w-full flex items-center gap-3 py-3.5 px-2 hover:bg-[var(--color-muted)] rounded-[14px] transition-colors text-left"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] shrink-0"
        style={{ background: category?.color ? `${category.color}22` : '#F0F0F2' }}
      >
        {category?.icon ?? '❓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-medium truncate">{movement.description || category?.name || 'Movimiento'}</div>
        <div className="text-[13px] text-[var(--color-text-secondary)]">
          {category?.name ?? 'Sin categoría'} · {formatDateReadable(movement.date)}
        </div>
      </div>
      <div
        className="text-[16px] font-bold shrink-0"
        style={{ color: isIncome ? 'var(--color-income)' : 'var(--color-expense)' }}
      >
        {isIncome ? '+ ' : '− '}
        {formatAmount(movement.amount, currency)}
      </div>
    </button>
  )
}
