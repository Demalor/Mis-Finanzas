import { useMemo } from 'react'
import { useData } from '../../context/useData'
import { useAuth } from '../../firebase/useAuth'
import { budgetStatusFor, movementsInMonth, currencyOf } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey, toMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'

export function BudgetStatusWidget({ config }: { config: { categoryId: string } }) {
  const { budgets, categories, movements, accounts } = useData()
  const { profile } = useAuth()
  const month = currentMonthKey()
  const category = categories.find((c) => c.id === config.categoryId)
  // Puede haber más de un presupuesto por categoría/mes si quedaron en monedas
  // distintas: se prefiere el de la moneda principal antes que el primero.
  const delMes = budgets.filter((b) => b.categoryId === config.categoryId && b.month === month)
  const budget = delMes.find((b) => (b.currency ?? 'COP') === (profile?.monedaPreferida ?? 'COP')) ?? delMes[0]
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  if (!category) return <WidgetShell label="Presupuesto" value="Categoría eliminada" />
  if (!budget) return <WidgetShell icon={category.icon} label={category.name} value="Sin presupuesto este mes" />

  const currency = budget.currency ?? 'COP'
  const status = budgetStatusFor(budget, monthMovements, accountCurrency, currency)

  // Un "no has gastado nada" puede ser mentira: el presupuesto mide un mes
  // calendario y una sola moneda, así que los gastos de otro mes o de una
  // cuenta en otra moneda no cuentan. Sin avisarlo, parece que la app falla.
  let aviso: string | undefined
  if (status.spent === 0) {
    const delMes = monthMovements.filter((m) => m.categoryId === category.id && m.type === 'gasto')
    const enOtraMoneda = delMes.filter((m) => currencyOf(m, accountCurrency) !== currency)
    const enOtroMes = movements.filter(
      (m) => m.categoryId === category.id && m.type === 'gasto' && toMonthKey(m.date) !== month
    )
    if (enOtraMoneda.length > 0) aviso = `Hay ${enOtraMoneda.length} gasto(s) este mes en otra moneda`
    else if (enOtroMes.length > 0) aviso = `Sin gastos este mes · ${enOtroMes.length} en meses anteriores`
  }

  return (
    <WidgetShell
      icon={category.icon}
      label={category.name}
      value={formatAmount(status.available, currency)}
      sub={
        <>
          <div>Disponible de {formatAmount(budget.amount, currency)} este mes</div>
          {aviso && <div style={{ color: 'var(--color-warn)' }}>⚠ {aviso}</div>}
        </>
      }
      tone={status.overBudget ? 'expense' : undefined}
    />
  )
}
