import { useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { movementsInMonth, currencyOf } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'
import type { Currency, MovementType } from '../../types/models'

export function CategoryTotalWidget({ config }: { config: { categoryId: string; movementType: MovementType } }) {
  const { categories, movements, accounts } = useData()
  const month = currentMonthKey()
  const category = categories.find((c) => c.id === config.categoryId)
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  if (!category) return <WidgetShell label="Categoría" value="Categoría eliminada" />

  // Una categoría puede tener movimientos en varias monedas: se suma por
  // separado, nunca se mezclan (mismo criterio que el resto de la app).
  const totals = new Map<Currency, number>()
  for (const m of monthMovements) {
    if (m.categoryId !== category.id || m.type !== config.movementType) continue
    const currency = currencyOf(m, accountCurrency)
    totals.set(currency, (totals.get(currency) ?? 0) + m.amount)
  }
  const entries = Array.from(totals.entries())

  return (
    <WidgetShell
      icon={category.icon}
      label={category.name}
      value={entries.length === 0 ? formatAmount(0, 'COP') : entries.map(([c, v]) => formatAmount(v, c)).join(' · ')}
      tone={config.movementType === 'gasto' ? 'expense' : 'income'}
    />
  )
}
