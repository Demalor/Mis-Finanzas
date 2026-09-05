import { useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { movementsInMonth, totalsFor, currencyOf } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { Card } from '../Card'
import type { Currency } from '../../types/models'

export function CurrencyBreakdownWidget() {
  const { movements, accounts } = useData()
  const month = currentMonthKey()
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  const currenciesPresent = useMemo(() => {
    const set = new Set<Currency>()
    for (const m of monthMovements) set.add(currencyOf(m, accountCurrency))
    if (set.size === 0) set.add('COP')
    return Array.from(set)
  }, [monthMovements, accountCurrency])

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1">
      <div className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)]">Balance por moneda</div>
      {currenciesPresent.map((currency) => {
        const t = totalsFor(monthMovements.filter((m) => currencyOf(m, accountCurrency) === currency))
        return (
          <div key={currency} className="flex items-center justify-between text-[var(--fs-xs)]">
            <span className="text-[var(--color-text-secondary)]">{currency}</span>
            <span className="amount font-semibold truncate" style={{ color: t.balance >= 0 ? 'var(--color-text)' : 'var(--color-expense)' }}>
              {formatAmount(t.balance, currency)}
            </span>
          </div>
        )
      })}
    </Card>
  )
}
