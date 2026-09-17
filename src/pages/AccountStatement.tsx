import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { useAuth } from '../firebase/useAuth'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { MovementRow } from '../components/MovementRow'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageHeader } from '../components/PageHeader'
import { MonthSelector } from '../components/MonthSelector'
import { formatAmount } from '../utils/currency'
import { currentMonthKey } from '../utils/date'
import { accountBalance, reservedForAccount, movementsInMonth, totalsFor } from '../utils/calculations'

const TYPE_LABELS = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  banco: { label: 'Cuenta bancaria', icon: '🏦' },
  tarjeta_credito: { label: 'Tarjeta de crédito', icon: '💳' },
}

export function AccountStatement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { accounts, movements, transfers, categories, deleteMovement } = useData()
  const { profile } = useAuth()
  const [month, setMonth] = useState(currentMonthKey())
  const [toDelete, setToDelete] = useState<string | null>(null)

  const account = accounts.find((a) => a.id === id)

  const accountMovements = useMemo(
    () => (account ? movements.filter((m) => m.accountId === account.id) : []),
    [movements, account]
  )

  const monthMovements = useMemo(() => {
    const list = movementsInMonth(accountMovements, month)
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [accountMovements, month])

  const monthTotals = useMemo(() => totalsFor(monthMovements), [monthMovements])

  if (!account) {
    return (
      <div className="page">
        <PageHeader title="Cuenta no encontrada" subtitle="Puede que la hayas eliminado" />
        <Link to="/cuentas" className="font-semibold" style={{ color: 'var(--color-accent-ink)' }}>
          ‹ Volver a Cuentas
        </Link>
      </div>
    )
  }

  const balance = accountBalance(account, movements, transfers)
  const reserved = reservedForAccount(profile?.dashboardWidgets ?? [], account.id)
  const isCard = account.tipo === 'tarjeta_credito'
  const cupo = account.cupo ?? 0

  return (
    <div className="page">
      <Link to="/cuentas" className="text-[var(--fs-sm)] font-semibold w-fit" style={{ color: 'var(--color-accent-ink)' }}>
        ‹ Cuentas
      </Link>

      <PageHeader
        title={`${TYPE_LABELS[account.tipo].icon} ${account.nombre}`}
        subtitle={`${TYPE_LABELS[account.tipo].label} · ${account.moneda}`}
        aside={<MonthSelector month={month} onChange={setMonth} className="w-full md:w-fit md:shrink-0" />}
      />

      <Card padding="lg">
        <div className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">
          {isCard ? 'Deuda actual' : 'Disponible'}
        </div>
        <div
          className="amount text-[var(--fs-2xl)] font-bold"
          style={{ color: isCard || balance - reserved < 0 ? 'var(--color-expense)' : 'var(--color-text)' }}
        >
          {formatAmount(isCard ? balance : balance - reserved, account.moneda)}
        </div>
        {isCard ? (
          cupo > 0 && (
            <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-0.5">
              Cupo disponible: {formatAmount(cupo - balance, account.moneda)} de {formatAmount(cupo, account.moneda)}
            </div>
          )
        ) : (
          reserved > 0 && (
            <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-0.5">
              Apartado en cajas de ahorro: {formatAmount(reserved, account.moneda)}
            </div>
          )
        )}

        <div className="grid grid-cols-2 gap-[var(--sp-3)] mt-[var(--sp-4)] pt-[var(--sp-4)] border-t border-[var(--color-border)]">
          <div>
            <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">Ingresos del mes</div>
            <div className="amount font-bold text-[var(--fs-md)]" style={{ color: 'var(--color-income)' }}>
              ↑ {formatAmount(monthTotals.income, account.moneda)}
            </div>
          </div>
          <div>
            <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">Gastos del mes</div>
            <div className="amount font-bold text-[var(--fs-md)]" style={{ color: 'var(--color-expense)' }}>
              ↓ {formatAmount(monthTotals.expense, account.moneda)}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 text-[var(--fs-sm)] text-[var(--color-text-secondary)] px-1">
        <span>{monthMovements.length} movimiento(s) este mes</span>
        <span
          className="amount font-semibold"
          style={{ color: monthTotals.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
        >
          {formatAmount(monthTotals.balance, account.moneda)}
        </span>
      </div>

      <Card padding="sm">
        {monthMovements.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="Sin movimientos este mes"
            message="Cambia de mes o registra un movimiento en esta cuenta."
          />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {monthMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <MovementRow
                    movement={m}
                    category={categories.find((c) => c.id === m.categoryId)}
                    currency={account.moneda}
                    onClick={() => navigate(`/editar/${m.id}`)}
                  />
                </div>
                <button
                  onClick={() => setToDelete(m.id)}
                  aria-label="Eliminar movimiento"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-lg)]"
                  style={{ color: 'var(--color-expense)' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer. ¿Deseas eliminar este movimiento?"
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteMovement(toDelete)
          setToDelete(null)
        }}
      />

      <Button
        onClick={() => navigate('/agregar')}
        size="lg"
        className="fixed bottom-24 right-[var(--sp-5)] md:bottom-[var(--sp-6)] shadow-xl z-30"
      >
        + Agregar
      </Button>
    </div>
  )
}
