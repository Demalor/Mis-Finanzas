import { useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { budgetStatusFor, movementsInMonth } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'

export function BudgetStatusWidget({ config }: { config: { categoryId: string } }) {
  const { budgets, categories, movements, accounts } = useData()
  const month = currentMonthKey()
  const category = categories.find((c) => c.id === config.categoryId)
  const budget = budgets.find((b) => b.categoryId === config.categoryId && b.month === month)
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  if (!category) return <WidgetShell label="Presupuesto" value="Categoría eliminada" />
  if (!budget) return <WidgetShell icon={category.icon} label={category.name} value="Sin presupuesto este mes" />

  const currency = budget.currency ?? 'COP'
  const status = budgetStatusFor(budget, monthMovements, accountCurrency, currency)
  return (
    <WidgetShell
      icon={category.icon}
      label={category.name}
      value={formatAmount(status.available, currency)}
      sub={`Disponible de ${formatAmount(budget.amount, currency)}`}
      tone={status.overBudget ? 'expense' : undefined}
    />
  )
}
