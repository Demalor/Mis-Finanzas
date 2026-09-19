import { useMemo } from 'react'
import { useData } from '../../context/useData'
import { movementsInMonth, totalsFor, currencyOf } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'
import type { Currency } from '../../types/models'

// Ingresos menos gastos del mes en una moneda. Es el balance del MES, no el
// saldo de las cuentas: lo apartado en cajas de ahorro no entra aquí, porque
// apartar no genera un movimiento.
export function MonthBalanceWidget({ config }: { config: { currency: Currency } }) {
  const { movements, accounts } = useData()
  const month = currentMonthKey()
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const totals = useMemo(
    () => totalsFor(movementsInMonth(movements, month).filter((m) => currencyOf(m, accountCurrency) === config.currency)),
    [movements, month, accountCurrency, config.currency]
  )

  return (
    <WidgetShell
      icon="💰"
      label={`Balance en ${config.currency}`}
      value={formatAmount(totals.balance, config.currency)}
      sub={
        <>
          <div className="truncate">↑ {formatAmount(totals.income, config.currency)}</div>
          <div className="truncate">↓ {formatAmount(totals.expense, config.currency)}</div>
        </>
      }
      tone={totals.balance < 0 ? 'expense' : undefined}
    />
  )
}
