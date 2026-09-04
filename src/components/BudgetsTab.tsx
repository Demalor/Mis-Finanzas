import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../firebase/AuthContext'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { EmptyState } from './EmptyState'
import { MonthSelector } from './MonthSelector'
import { Segmented } from './Segmented'
import { Field, SelectInput, AmountInput } from './FormControls'
import { formatAmount } from '../utils/currency'
import { currentMonthKey } from '../utils/date'
import { movementsInMonth, currencyOf } from '../utils/calculations'
import { CURRENCIES } from '../types/models'
import type { Currency } from '../types/models'

export function BudgetsTab() {
  const { budgets, categories, movements, accounts, upsertBudget, deleteBudget } = useData()
  const { profile } = useAuth()
  const [month, setMonth] = useState(currentMonthKey())
  const [currency, setCurrency] = useState<Currency>(profile?.monedaPreferida ?? 'COP')
  const [creating, setCreating] = useState(false)

  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])

  // La moneda de un presupuesto viejo (sin campo) se asume COP.
  const budgetCurrency = (b: { currency?: Currency }): Currency => b.currency ?? 'COP'

  // Monedas entre las que se puede elegir: las de las cuentas + las ya usadas
  // por algún presupuesto. Si no hay nada, al menos COP.
  const availableCurrencies = useMemo(() => {
    const present = new Set<Currency>([...accounts.map((a) => a.moneda), ...budgets.map(budgetCurrency)])
    const list = CURRENCIES.map((c) => c.code).filter((c) => present.has(c))
    return list.length > 0 ? list : (['COP'] as Currency[])
  }, [accounts, budgets])

  const activeCurrency: Currency = availableCurrencies.includes(currency) ? currency : availableCurrencies[0]

  const expenseCategories = categories.filter((c) => c.type === 'gasto')
  const monthBudgets = budgets.filter((b) => b.month === month && budgetCurrency(b) === activeCurrency)
  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])

  const spentByCategory = (categoryId: string) =>
    monthMovements
      .filter((m) => m.categoryId === categoryId && m.type === 'gasto' && currencyOf(m, accountCurrency) === activeCurrency)
      .reduce((s, m) => s + m.amount, 0)

  const categoriesWithoutBudget = expenseCategories.filter((c) => !monthBudgets.some((b) => b.categoryId === c.id))

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)]">
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)]">Define un límite mensual por categoría</p>
        <div className="flex flex-wrap items-center gap-[var(--sp-3)]">
          {availableCurrencies.length > 1 && (
            <Segmented
              aria-label="Moneda del presupuesto"
              options={availableCurrencies.map((code) => ({ value: code, label: code }))}
              value={activeCurrency}
              onChange={setCurrency}
            />
          )}
          <MonthSelector month={month} onChange={setMonth} className="flex-1 min-w-[11rem] md:flex-none md:w-fit" />
          <Button onClick={() => setCreating(true)} disabled={categoriesWithoutBudget.length === 0} className="shrink-0">
            + Nuevo
          </Button>
        </div>
      </div>

      {monthBudgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title={availableCurrencies.length > 1 ? `Sin presupuestos en ${activeCurrency} este mes` : 'Aún no tienes presupuestos este mes'}
          message="Crea un presupuesto para controlar tus gastos por categoría."
          action={<Button onClick={() => setCreating(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <div className="card-grid">
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
                  <span className="font-semibold text-[var(--fs-md)]">
                    {category?.icon} {category?.name ?? 'Categoría eliminada'}
                  </span>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    aria-label="Eliminar presupuesto"
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]"
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
                      background: overBudget ? 'var(--color-expense)' : nearLimit ? 'var(--color-warn)' : 'var(--color-accent)',
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 text-center gap-2 text-[var(--fs-sm)]">
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Gastado</div>
                    <div className="font-semibold">{formatAmount(spent, activeCurrency)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Presupuesto</div>
                    <div className="font-semibold">{formatAmount(b.amount, activeCurrency)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Disponible</div>
                    <div className="font-semibold" style={{ color: available < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                      {formatAmount(available, activeCurrency)}
                    </div>
                  </div>
                </div>
                {overBudget && (
                  <p className="mt-3 text-[var(--fs-sm)] font-semibold" style={{ color: 'var(--color-expense)' }}>
                    ⚠️ Superaste el presupuesto de esta categoría.
                  </p>
                )}
                {nearLimit && (
                  <p className="mt-3 text-[var(--fs-sm)] font-semibold" style={{ color: 'var(--color-warn)' }}>
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
        currency={activeCurrency}
        categories={categoriesWithoutBudget}
        onClose={() => setCreating(false)}
        onSave={async (categoryId, amount) => {
          await upsertBudget({ categoryId, month, amount, currency: activeCurrency })
          setCreating(false)
        }}
      />
    </div>
  )
}

function NewBudgetModal({
  open,
  month,
  currency,
  categories,
  onClose,
  onSave,
}: {
  open: boolean
  month: string
  currency: Currency
  categories: { id: string; name: string; icon: string }[]
  onClose: () => void
  onSave: (categoryId: string, amount: number) => void
}) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState(0)

  const effectiveId = categoryId || categories[0]?.id || ''

  return (
    <Modal open={open} onClose={onClose} title="Nuevo presupuesto">
      <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-4">Mes: {month} · Moneda: {currency}</p>
      {categories.length === 0 ? (
        <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)]">Ya creaste un presupuesto para todas las categorías de gasto este mes.</p>
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
