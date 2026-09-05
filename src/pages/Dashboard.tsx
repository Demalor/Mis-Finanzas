import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../firebase/AuthContext'
import { MovementRow } from '../components/MovementRow'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { WidgetsPanel } from '../components/WidgetsPanel'
import { formatAmount } from '../utils/currency'
import { currentMonthKey, nextMonthlyDate } from '../utils/date'
import { movementsInMonth, categoryBreakdown } from '../utils/calculations'
import { summarizeLoan, daysUntil } from '../utils/loanMath'
import { useTheme } from '../context/ThemeContext'
import type { Currency } from '../types/models'

export function Dashboard() {
  const { movements, categories, accounts, loans, loading } = useData()
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  // El Inicio siempre muestra el mes actual. Para navegar entre meses, Movimientos.
  const month = currentMonthKey()
  const preferredCurrency: Currency = profile?.monedaPreferida ?? 'COP'

  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

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
      {/* Móvil/tablet: Inicio a la izquierda, logo Nummi a la derecha — el botón
          de tema solo se muestra en escritorio (md+), junto al título. */}
      <div className="grid grid-cols-[1fr_auto_1fr] md:grid-cols-[1fr_auto] items-center gap-[var(--sp-3)]">
        <div className="min-w-0">
          <h1 className="t-h1">Inicio</h1>
          <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mt-1">Tu resumen financiero del mes</p>
        </div>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="hidden md:flex w-11 h-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--fs-lg)] hover:bg-[var(--color-muted)] md:order-last"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {/* col-start-3: cuando el botón está oculto (display:none) sale del
            flujo del grid; sin esto, "Nummi" caería a la columna del medio. */}
        <img
          src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'logo_V.png' : 'logo_N.png'}`}
          alt="Nummi"
          className="hidden min-[380px]:block md:hidden col-start-3 justify-self-end object-contain"
          style={{ height: '2.25rem', width: 'auto', maxWidth: 'none' }}
        />
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

      {/* Resumen del mes (una celda más) + panel de widgets, todo en una sola grilla */}
      <WidgetsPanel preferredCurrency={preferredCurrency} monthMovements={monthMovements} accountCurrency={accountCurrency} />

      {/* Resumen por categoría */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-[var(--sp-4)]">
          <h2 className="t-h3">Gastos por categoría ({preferredCurrency})</h2>
          <Link to="/resumen" className="text-[var(--fs-sm)] font-semibold shrink-0" style={{ color: 'var(--color-accent-ink)' }}>
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
          <Link to="/movimientos" className="text-[var(--fs-sm)] font-semibold shrink-0" style={{ color: 'var(--color-accent-ink)' }}>
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
