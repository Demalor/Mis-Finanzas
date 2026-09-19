import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/useData'
import { useAuth } from '../../firebase/useAuth'
import { budgetStatusFor, budgetForCategory, currencyOf } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey, toMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'

export function BudgetStatusWidget({ config }: { config: { categoryId: string } }) {
  const { budgets, categories, movements, accounts } = useData()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const month = currentMonthKey()
  const category = categories.find((c) => c.id === config.categoryId)
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  // El más específico gana (uno de un solo mes sobre uno recurrente), y entre
  // monedas se prefiere la principal — mismo criterio que la lista completa.
  const preferida = profile?.monedaPreferida ?? 'COP'
  const budget = budgetForCategory(budgets, config.categoryId, month, preferida) ?? budgets.find((b) => b.categoryId === config.categoryId)

  if (!category) return <WidgetShell label="Presupuesto" value="Categoría eliminada" />
  if (!budget)
    return (
      <WidgetShell
        icon={category.icon}
        label={category.name}
        value="Sin presupuesto"
        sub="Toca para crear uno"
        onClick={() => navigate('/categorias')}
      />
    )

  const currency = budget.currency ?? 'COP'
  const vigencia = budget.vigencia ?? 'solo-este-mes'
  const status = budgetStatusFor(budget, movements, accountCurrency, currency, month)

  // Un "no has gastado nada" puede ser mentira: un presupuesto normal mide un
  // mes calendario y una sola moneda, así que gastos de otro mes o de otra
  // cuenta no cuentan. En 'rango' esto no aplica: ahí sí se suman varios
  // meses a propósito, así que el aviso no tendría sentido.
  let aviso: string | undefined
  if (status.spent === 0 && vigencia !== 'rango') {
    const monthMovements = movements.filter((m) => toMonthKey(m.date) === month)
    const delMes = monthMovements.filter((m) => m.categoryId === category.id && m.type === 'gasto')
    const enOtraMoneda = delMes.filter((m) => currencyOf(m, accountCurrency) !== currency)
    const enOtroMes = movements.filter(
      (m) => m.categoryId === category.id && m.type === 'gasto' && toMonthKey(m.date) !== month
    )
    if (enOtraMoneda.length > 0) aviso = `Hay ${enOtraMoneda.length} gasto(s) este mes en otra moneda`
    else if (enOtroMes.length > 0) aviso = `Sin gastos este mes · ${enOtroMes.length} en meses anteriores`
  }

  const subtitulo =
    vigencia === 'rango'
      ? `Disponible de ${formatAmount(budget.amount, currency)} en el periodo`
      : `Disponible de ${formatAmount(budget.amount, currency)} este mes`

  return (
    <WidgetShell
      icon={category.icon}
      label={category.name}
      value={formatAmount(status.available, currency)}
      sub={
        <>
          <div>{subtitulo}</div>
          {aviso && <div style={{ color: 'var(--color-warn)' }}>⚠ {aviso}</div>}
        </>
      }
      tone={status.overBudget ? 'expense' : undefined}
    />
  )
}
