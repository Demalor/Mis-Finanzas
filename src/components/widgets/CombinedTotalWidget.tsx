import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../firebase/AuthContext'
import { movementsInMonth, totalsFor, currencyOf } from '../../utils/calculations'
import { fetchExchangeRate } from '../../utils/exchangeRate'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { WidgetShell } from './WidgetShell'
import type { Currency } from '../../types/models'

// Extraído del antiguo "Total estimado combinado" de Dashboard.tsx: convierte
// con la tasa del día y se salta la llamada de red cuando no hace falta.
// Simplificado a la moneda preferida del perfil (sin selector) para que quepa
// cómodo en una celda del panel de widgets.
export function CombinedTotalWidget() {
  const { movements, accounts } = useData()
  const { profile } = useAuth()
  const displayCurrency: Currency = profile?.monedaPreferida ?? 'COP'

  const month = currentMonthKey()
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  const currenciesPresent = useMemo(() => {
    const set = new Set<Currency>()
    for (const m of monthMovements) set.add(currencyOf(m, accountCurrency))
    if (set.size === 0) set.add('COP')
    return Array.from(set)
  }, [monthMovements, accountCurrency])

  const totalsByCurrency = useMemo(() => {
    const result: Record<string, { income: number; expense: number; balance: number }> = {}
    for (const currency of currenciesPresent) {
      result[currency] = totalsFor(monthMovements.filter((m) => currencyOf(m, accountCurrency) === currency))
    }
    return result
  }, [currenciesPresent, monthMovements, accountCurrency])

  const [combinedEstimate, setCombinedEstimate] = useState<number | null>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function compute() {
      if (currenciesPresent.length <= 1 && currenciesPresent[0] === displayCurrency) {
        setCombinedEstimate(totalsByCurrency[displayCurrency]?.balance ?? 0)
        return
      }
      setLoadingEstimate(true)
      let total = 0
      for (const currency of currenciesPresent) {
        const balance = totalsByCurrency[currency]?.balance ?? 0
        if (currency === displayCurrency) {
          total += balance
        } else {
          const rate = await fetchExchangeRate(currency as Currency, displayCurrency)
          if (rate) total += balance * rate
        }
      }
      if (!cancelled) {
        setCombinedEstimate(total)
        setLoadingEstimate(false)
      }
    }
    compute()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(totalsByCurrency), displayCurrency])

  return (
    <WidgetShell
      icon="💱"
      label="Total combinado"
      value={loadingEstimate ? 'Calculando…' : combinedEstimate !== null ? formatAmount(combinedEstimate, displayCurrency) : '—'}
      sub="Con la tasa del día"
    />
  )
}
