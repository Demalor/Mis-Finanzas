import { useMemo, useState } from 'react'
import { useData } from '../context/useData'
import { useAuth } from '../firebase/useAuth'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SavingsBoxFormModal } from '../components/SavingsBoxFormModal'
import { SavingsBoxMoveModal } from '../components/SavingsBoxMoveModal'
import { CURRENCIES } from '../types/models'
import type { SavingsBox } from '../types/models'
import { formatAmount } from '../utils/currency'
import { formatDateReadable } from '../utils/date'

export function Savings() {
  const { savingsBoxes, accounts, deleteSavingsBox } = useData()
  const { profile, updateDashboardWidgets } = useAuth()
  const [editing, setEditing] = useState<SavingsBox | 'new' | null>(null)
  const [moving, setMoving] = useState<{ box: SavingsBox; mode: 'add' | 'withdraw' } | null>(null)
  const [toDelete, setToDelete] = useState<SavingsBox | null>(null)
  const [openHistory, setOpenHistory] = useState<string | null>(null)

  const ordered = useMemo(() => [...savingsBoxes].sort((a, b) => a.createdAt - b.createdAt), [savingsBoxes])
  // Nunca se suman monedas distintas: un total por cada moneda usada.
  const totals = CURRENCIES.flatMap((c) => {
    const delaMoneda = savingsBoxes.filter((b) => b.currency === c.code)
    return delaMoneda.length === 0 ? [] : [{ code: c.code, total: delaMoneda.reduce((s, b) => s + b.current, 0) }]
  })

  async function confirmDelete() {
    if (!toDelete) return
    const box = toDelete
    setToDelete(null)
    await deleteSavingsBox(box.id)
    // Sus widgets del Inicio quedarían apuntando a la nada.
    const widgets = profile?.dashboardWidgets
    if (widgets?.some((w) => w.type === 'savingsBox' && (w.boxId ?? w.id) === box.id)) {
      await updateDashboardWidgets(widgets.filter((w) => !(w.type === 'savingsBox' && (w.boxId ?? w.id) === box.id)))
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Ahorros"
        subtitle="Tus cajas de ahorro y lo que llevas en cada una"
        action={<Button onClick={() => setEditing('new')} className="shrink-0">+ Nueva caja</Button>}
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon="🐷"
          title="Todavía no tienes cajas de ahorro"
          message="Una caja es una meta con su propio monto. Si la asocias a una cuenta, lo que apartes queda reservado dentro de esa cuenta y se descuenta de su disponible. Si no, es una libreta aparte."
          action={<Button onClick={() => setEditing('new')}>Crear caja</Button>}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-[var(--sp-3)]">
            {totals.map((t) => (
              <Card key={t.code} padding="sm" className="min-w-[9rem]">
                <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">Ahorrado en {t.code}</div>
                <div className="amount font-bold text-[var(--fs-md)]">{formatAmount(t.total, t.code)}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--sp-3)]">
            {ordered.map((box) => {
              const account = accounts.find((a) => a.id === box.accountId)
              const pct = box.target > 0 ? Math.min(100, (box.current / box.target) * 100) : 0
              const reached = box.target > 0 && box.current >= box.target
              const historyOpen = openHistory === box.id
              return (
                <Card key={box.id} padding="lg" className="flex flex-col gap-[var(--sp-3)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--fs-md)] truncate">🐷 {box.name}</div>
                      <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
                        {account ? `Apartado en ${account.nombre}` : 'Independiente'}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditing(box)}
                        aria-label="Editar caja"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)]"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setToDelete(box)}
                        aria-label="Eliminar caja"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)]"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="amount text-[var(--fs-lg)] font-bold" style={{ color: reached ? 'var(--color-income)' : 'var(--color-text)' }}>
                      {formatAmount(box.current, box.currency)}
                    </span>
                    <span className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]"> de {formatAmount(box.target, box.currency)}</span>
                  </div>
                  <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: reached ? 'var(--color-income)' : 'var(--color-accent)' }} />
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => setMoving({ box, mode: 'add' })}>
                      + Aportar
                    </Button>
                    <Button className="flex-1" variant="secondary" disabled={box.current <= 0} onClick={() => setMoving({ box, mode: 'withdraw' })}>
                      − Retirar
                    </Button>
                  </div>

                  <button
                    onClick={() => setOpenHistory(historyOpen ? null : box.id)}
                    className="text-left text-[var(--fs-sm)] font-medium text-[var(--color-text-secondary)]"
                  >
                    {historyOpen ? '▾' : '▸'} Historial ({box.history.length})
                  </button>
                  {historyOpen &&
                    (box.history.length === 0 ? (
                      <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">Sin aportes ni retiros registrados todavía.</p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                        {[...box.history].reverse().map((e, i) => {
                          const origen = accounts.find((a) => a.id === e.accountId)?.nombre
                          return (
                            <li key={i} className="flex justify-between gap-2 py-2 text-[var(--fs-sm)]">
                              <span className="min-w-0 truncate">
                                {formatDateReadable(e.date)}
                                {origen && <span className="text-[var(--color-text-secondary)]"> · desde {origen}</span>}
                              </span>
                              <span className="amount font-semibold shrink-0" style={{ color: e.delta > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                                {e.delta > 0 ? '+' : '−'}
                                {formatAmount(Math.abs(e.delta), box.currency)}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ))}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {editing && (
        <SavingsBoxFormModal
          key={editing === 'new' ? 'new' : editing.id}
          box={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {moving && <SavingsBoxMoveModal box={moving.box} mode={moving.mode} onClose={() => setMoving(null)} />}
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar caja de ahorro"
        message={
          toDelete?.accountId && toDelete.current > 0
            ? `"${toDelete.name}" tiene ${formatAmount(toDelete.current, toDelete.currency)} apartados. Al eliminarla, ese monto vuelve a quedar disponible en la cuenta y se pierde su historial.`
            : `Se eliminará "${toDelete?.name ?? ''}" con su historial. Esto no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
