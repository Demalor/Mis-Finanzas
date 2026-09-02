import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { EmptyState } from './EmptyState'
import { MonthSelector } from './MonthSelector'
import { Field, SelectInput, AmountInput } from './FormControls'
import { formatAmount } from '../utils/currency'
import { currentMonthKey } from '../utils/date'
import { movementsInMonth } from '../utils/calculations'

export function BudgetsTab() {
  const { budgets, categories, movements, upsertBudget, deleteBudget } = useData()
  const [month, setMonth] = useState(currentMonthKey())
  const [creating, setCreating] = useState(false)

  const expenseCategories = categories.filter((c) => c.type === 'gasto')
  const monthBudgets = budgets.filter((b) => b.month === month)
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  const spentByCategory = (categoryId: string) =>
    monthMovements.filter((m) => m.categoryId === categoryId && m.type === 'gasto').reduce((s, m) => s + m.amount, 0)

  const categoriesWithoutBudget = expenseCategories.filter((c) => !monthBudgets.some((b) => b.categoryId === c.id))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-[var(--color-text-secondary)] text-[15px]">Define un límite mensual por categoría</p>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={setMonth} />
          <Button onClick={() => setCreating(true)} disabled={categoriesWithoutBudget.length === 0}>
            + Nuevo
          </Button>
        </div>
      </div>

      {monthBudgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Aún no tienes presupuestos este mes"
          message="Crea un presupuesto para controlar tus gastos por categoría."
          action={<Button onClick={() => setCreating(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {monthBudgets.map((b) => {
            const category = categories.find((c) => c.id === b.categoryId)
            const spent = spentByCategory(b.categoryId)
            const available = b.amount - spent
            const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0
            const overBudget = spent > b.amount
            const nearLimit = !overBudget && pct >= 80

            return (
              <Card key={b.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-[16px]">
                    {category?.icon} {category?.name ?? 'Categoría eliminada'}
                  </span>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    aria-label="Eliminar presupuesto"
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-[16px]"
                    style={{ color: 'var(--color-expense)' }}
                  >
                    🗑️
                  </button>
                </div>
                <div className="h-3 bg-[var(--color-muted)] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: overBudget ? 'var(--color-expense)' : nearLimit ? '#FF9500' : 'var(--color-accent)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 text-center gap-2 text-[14px]">
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Gastado</div>
                    <div className="font-semibold">{formatAmount(spent, 'COP')}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Presupuesto</div>
                    <div className="font-semibold">{formatAmount(b.amount, 'COP')}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Disponible</div>
                    <div className="font-semibold" style={{ color: available < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                      {formatAmount(available, 'COP')}
                    </div>
                  </div>
                </div>
                {overBudget && (
                  <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                    ⚠️ Superaste el presupuesto de esta categoría.
                  </p>
                )}
                {nearLimit && (
                  <p className="mt-3 text-[14px] font-semibold" style={{ color: '#FF9500' }}>
                    ⚠️ Estás cerca del límite de esta categoría.
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <NewBudgetModal
        open={creating}
        month={month}
        categories={categoriesWithoutBudget}
        onClose={() => setCreating(false)}
        onSave={async (categoryId, amount) => {
          await upsertBudget({ categoryId, month, amount })
          setCreating(false)
        }}
      />
    </div>
  )
}

function NewBudgetModal({
  open,
  month,
  categories,
  onClose,
  onSave,
}: {
  open: boolean
  month: string
  categories: { id: string; name: string; icon: string }[]
  onClose: () => void
  onSave: (categoryId: string, amount: number) => void
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState(0)

  const effectiveId = categoryId || categories[0]?.id || ''

  return (
    <Modal open={open} onClose={onClose} title="Nuevo presupuesto">
      <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">Mes: {month}</p>
      {categories.length === 0 ? (
        <p className="text-[15px] text-[var(--color-text-secondary)]">Ya creaste un presupuesto para todas las categorías de gasto este mes.</p>
      ) : (
        <>
          <Field label="Categoría">
            <SelectInput value={effectiveId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Presupuesto mensual">
            <AmountInput value={amount} onChange={setAmount} />
          </Field>
          <Button
            className="w-full"
            size="lg"
            disabled={amount <= 0 || !effectiveId}
            onClick={() => onSave(effectiveId, amount)}
          >
            Guardar presupuesto
          </Button>
        </>
      )}
    </Modal>
  )
}
