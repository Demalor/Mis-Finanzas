import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../firebase/AuthContext'
import { Card } from '../components/Card'
import { MonthSelector } from '../components/MonthSelector'
import { MovementRow } from '../components/MovementRow'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { Button } from '../components/Button'
import { formatAmount } from '../utils/currency'
import { currentMonthKey, nextMonthlyDate } from '../utils/date'
import { movementsInMonth, totalsFor, categoryBreakdown } from '../utils/calculations'
import { fetchExchangeRate } from '../utils/exchangeRate'
import { summarizeLoan, daysUntil } from '../utils/loanMath'
import { useTheme } from '../context/ThemeContext'
import { CURRENCIES } from '../types/models'
import type { Currency } from '../types/models'

export function Dashboard() {
  const { movements, categories, accounts, loans, loading } = useData()
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [month, setMonth] = useState(currentMonthKey())
  const preferredCurrency: Currency = profile?.monedaPreferida ?? 'COP'
  // Moneda en la que se muestra el "total estimado combinado". Arranca en la
  // preferida del perfil; si la persona elige otra en la tarjeta, esa manda.
  const [manualCurrency, setManualCurrency] = useState<Currency | null>(null)
  const displayCurrency: Currency = manualCurrency ?? preferredCurrency

  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  // Totales separados por moneda (nunca se mezclan directamente)
  const currenciesPresent = useMemo(() => {
    const set = new Set<Currency>()
    for (const m of monthMovements) {
      const currency = m.accountId ? accountCurrency.get(m.accountId) : undefined
      set.add(currency ?? 'COP')
    }
    if (set.size === 0) set.add('COP')
    return Array.from(set)
  }, [monthMovements, accountCurrency])

  const totalsByCurrency = useMemo(() => {
    const result: Record<string, { income: number; expense: number; balance: number }> = {}
    for (const currency of currenciesPresent) {
      const inCurrency = monthMovements.filter((m) => {
        const c = m.accountId ? accountCurrency.get(m.accountId) : undefined
        return (c ?? 'COP') === currency
      })
      result[currency] = totalsFor(inCurrency)
    }
    return result
  }, [currenciesPresent, monthMovements, accountCurrency])

  // Total estimado combinado (referencia, con tasa del día)
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

  const breakdown = useMemo(
    () => categoryBreakdown(monthMovements.filter((m) => (m.accountId ? accountCurrency.get(m.accountId) : 'COP') === preferredCurrency), categories, 'gasto').slice(0, 5),
    [monthMovements, categories, accountCurrency, preferredCurrency]
  )

  const recent = useMemo(
    () => [...movements].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 6),
    [movements]
  )

  // Alertas de pago próximo (tarjetas + préstamos)
  const alerts = useMemo(() => {
    const list: { id: string; label: string; days: number; amount: string; href: string }[] = []
    for (const acc of accounts.filter((a) => a.tipo === 'tarjeta_credito' && a.fechaPago)) {
      const days = daysUntil(nextMonthlyDate(acc.fechaPago!))
      if (days <= (acc.diasAvisoPago ?? 5)) {
        list.push({ id: acc.id, label: `Tarjeta ${acc.nombre}`, days, amount: '', href: '/cuentas' })
      }
    }
    for (const loan of loans.filter((l) => l.active)) {
      const summary = summarizeLoan(loan)
      if (!summary.nextPaymentDate) continue
      const days = daysUntil(summary.nextPaymentDate)
      if (days <= loan.diasAvisoPago) {
        list.push({
          id: loan.id,
          label: `Préstamo: ${loan.counterpartyName}`,
          days,
          amount: formatAmount(summary.nextPaymentAmount ?? 0, loan.currency),
          href: '/prestamos',
        })
      }
    }
    return list.sort((a, b) => a.days - b.days)
  }, [accounts, loans])

  if (loading)
    return <Loading />

  return (
    <div className="page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-4)]">
        <div className="flex items-center gap-[var(--sp-3)] min-w-0">
          <div className="min-w-0">
            <h1 className="t-h1">Inicio</h1>
            <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mt-1">Tu resumen financiero del mes</p>
          </div>
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--fs-lg)] hover:bg-[var(--color-muted)]"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
        <MonthSelector month={month} onChange={setMonth} className="w-full md:w-fit md:shrink-0" />
      </div>

      {alerts.length > 0 && (
        <div className="flex flex-col gap-[var(--sp-2)]">
          {alerts.map((a) => (
            <Link
              key={a.id}
              to={a.href}
              className="flex items-center justify-between gap-2 px-[var(--sp-4)] py-[var(--sp-3)] min-h-[var(--tap)] rounded-[var(--radius-md)] font-medium text-[var(--fs-sm)]"
              style={{
                background: a.days < 0 ? 'var(--color-expense-soft)' : 'var(--color-warn-soft)',
                color: a.days < 0 ? 'var(--color-expense)' : 'var(--color-warn)',
              }}
            >
              <span>
                {a.days < 0 ? '⚠️' : '⏰'} {a.label} {a.days < 0 ? 'vencida' : `vence en ${a.days} día(s)`} {a.amount && `· ${a.amount}`}
              </span>
              <span>›</span>
            </Link>
          ))}
        </div>
      )}

      {/* Totales por moneda */}
      <div className="card-grid-wide">
        {currenciesPresent.map((currency) => {
          const t = totalsByCurrency[currency]
          return (
            <Card key={currency} padding="lg">
              <div className="text-[var(--fs-sm)] font-medium text-[var(--color-text-secondary)] mb-1">Balance en {currency}</div>
              <div className="amount text-[var(--fs-3xl)] font-bold" style={{ color: t.balance >= 0 ? 'var(--color-text)' : 'var(--color-expense)' }}>
                {formatAmount(t.balance, currency)}
              </div>
              <div className="flex gap-[var(--sp-4)] mt-[var(--sp-2)] text-[var(--fs-xs)]">
                <span className="amount" style={{ color: 'var(--color-income)' }}>↑ {formatAmount(t.income, currency)}</span>
                <span className="amount" style={{ color: 'var(--color-expense)' }}>↓ {formatAmount(t.expense, currency)}</span>
              </div>
            </Card>
          )
        })}
      </div>

      {(currenciesPresent.length > 1 || currenciesPresent[0] !== displayCurrency) && (
        <Card padding="md" className="bg-[var(--color-accent-soft)] border-0">
          <div className="flex flex-wrap items-center justify-between gap-[var(--sp-3)]">
            <div className="text-[var(--fs-xs)] font-medium" style={{ color: 'var(--color-accent)' }}>
              Total estimado combinado (referencia)
            </div>
            <div className="flex gap-1 bg-[var(--color-surface)] rounded-full p-1">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setManualCurrency(c.code)}
                  aria-pressed={displayCurrency === c.code}
                  className="px-3 py-1.5 rounded-full text-[var(--fs-xs)] font-semibold transition-colors"
                  style={
                    displayCurrency === c.code
                      ? { background: 'var(--color-accent)', color: '#FFFFFF' }
                      : { color: 'var(--color-text-secondary)' }
                  }
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          <div className="amount text-[var(--fs-2xl)] font-bold mt-[var(--sp-2)]" style={{ color: 'var(--color-accent)' }}>
            {loadingEstimate ? 'Calculando…' : combinedEstimate !== null ? formatAmount(combinedEstimate, displayCurrency) : '—'}
          </div>
          <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-1">Usa la tasa de cambio del día — es solo un aproximado, no una suma exacta.</div>
        </Card>
      )}

      {/* Resumen por categoría */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-[var(--sp-4)]">
          <h2 className="t-h3">Gastos por categoría ({preferredCurrency})</h2>
          <Link to="/resumen" className="text-[var(--fs-sm)] font-semibold shrink-0" style={{ color: 'var(--color-accent)' }}>
            Ver todo
          </Link>
        </div>
        {breakdown.length === 0 ? (
          <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] py-[var(--sp-4)]">Aún no hay gastos registrados este mes.</p>
        ) : (
          <div className="flex flex-col gap-[var(--sp-3)]">
            {breakdown.map((item) => (
              <div key={item.category.id}>
                <div className="flex justify-between gap-2 text-[var(--fs-base)] mb-1.5">
                  <span className="font-medium truncate min-w-0">
                    {item.category.icon} {item.category.name}
                  </span>
                  <span className="amount font-semibold shrink-0">{formatAmount(item.total, preferredCurrency)}</span>
                </div>
                <div className="h-2.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percentage}%`, background: item.category.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Movimientos recientes */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-[var(--sp-2)]">
          <h2 className="t-h3">Movimientos recientes</h2>
          <Link to="/movimientos" className="text-[var(--fs-sm)] font-semibold shrink-0" style={{ color: 'var(--color-accent)' }}>
            Ver todos
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Todavía no tienes movimientos"
            message="Registra tu primer ingreso o gasto para empezar."
            action={
              <Link to="/agregar">
                <Button>Agregar movimiento</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {recent.map((m) => (
              <MovementRow
                key={m.id}
                movement={m}
                category={categories.find((c) => c.id === m.categoryId)}
                currency={m.accountId ? accountCurrency.get(m.accountId) ?? 'COP' : 'COP'}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
