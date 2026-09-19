import { useMemo, useState } from 'react'
import { useData } from '../context/useData'
import { useAuth } from '../firebase/useAuth'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { EmptyState } from './EmptyState'
import { MonthSelector } from './MonthSelector'
import { Field, SelectInput, AmountInput, TextInput } from './FormControls'
import { formatAmount } from '../utils/currency'
import { currentMonthKey } from '../utils/date'
import { budgetStatusFor, budgetAplicaEnMes } from '../utils/calculations'
import { CURRENCIES } from '../types/models'
import { monthLabelShort } from '../utils/date'
import type { Budget, BudgetVigencia, Currency } from '../types/models'

// Texto corto de cómo aplica el presupuesto, para que no haya que adivinar
// si "100" es de este mes o se viene repitiendo.
function vigenciaLabel(b: Budget, month: string): string {
  const vigencia = b.vigencia ?? 'solo-este-mes'
  if (vigencia === 'solo-este-mes') return 'solo este mes'
  if (vigencia === 'cada-mes') return b.hasta ? `cada mes hasta ${monthLabelShort(b.hasta)}` : 'cada mes'
  // rango: acumulado, no por mes — vale la pena decir desde cuándo si no se está viendo el mes de inicio
  const desde = b.month !== month ? `desde ${monthLabelShort(b.month)} ` : ''
  return b.hasta ? `${desde}rango hasta ${monthLabelShort(b.hasta)}` : `${desde}rango abierto`
}

export function BudgetsTab() {
  const { budgets, categories, movements, accounts, upsertBudget, deleteBudget } = useData()
  const { profile } = useAuth()
  const [month, setMonth] = useState(currentMonthKey())
  // null = la persona no ha elegido moneda todavía; se deduce de su perfil o
  // de sus cuentas. Sembrarlo en 'COP' hacía que todo naciera en pesos aunque
  // no tuviera una sola cuenta en pesos.
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [toDelete, setToDelete] = useState<Budget | null>(null)

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

  const monedaSugerida: Currency = profile?.monedaPreferida ?? accounts[0]?.moneda ?? 'COP'
  // Moneda con la que nace un presupuesto nuevo si no se toca el campo.
  const activeCurrency: Currency = availableCurrencies.includes(monedaSugerida) ? monedaSugerida : availableCurrencies[0]

  const expenseCategories = categories.filter((c) => c.type === 'gasto')
  // Sin filtrar por moneda: si una categoría quedó con dos presupuestos en
  // monedas distintas, esconder uno hace que parezca que la app está mal.
  // Incluye los de vigencia 'cada-mes' y 'rango' que cubren este mes, aunque
  // hayan empezado antes.
  const monthBudgets = budgets.filter((b) => budgetAplicaEnMes(b, month))
  const categoriesWithoutBudget = expenseCategories.filter((c) => !monthBudgets.some((b) => b.categoryId === c.id))
  const duplicadas = monthBudgets.filter((b, i) => monthBudgets.findIndex((o) => o.categoryId === b.categoryId) !== i)

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)]">
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)]">Define un límite mensual por categoría</p>
        <div className="flex flex-wrap items-center gap-[var(--sp-3)]">
          <MonthSelector month={month} onChange={setMonth} className="flex-1 min-w-[11rem] md:flex-none md:w-fit" />
          <Button onClick={() => setCreating(true)} disabled={categoriesWithoutBudget.length === 0} className="shrink-0">
            + Nuevo
          </Button>
        </div>
      </div>

      {duplicadas.length > 0 && (
        <p className="px-[var(--sp-3)] py-[var(--sp-2)] rounded-[var(--radius-md)] text-[var(--fs-sm)] font-medium" style={{ background: 'var(--color-warn-soft)', color: 'var(--color-warn)' }}>
          ⚠️ Hay categorías con más de un presupuesto este mes, en monedas distintas. El widget del Inicio solo puede mostrar uno: borra el que no uses.
        </p>
      )}

      {monthBudgets.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Aún no tienes presupuestos este mes"
          message="Crea un presupuesto para controlar tus gastos por categoría."
          action={<Button onClick={() => setCreating(true)}>Crear presupuesto</Button>}
        />
      ) : (
        <div className="card-grid">
          {monthBudgets.map((b) => {
            const category = categories.find((c) => c.id === b.categoryId)
            const moneda = budgetCurrency(b)
            const { spent, available, pct, overBudget, nearLimit } = budgetStatusFor(b, movements, accountCurrency, moneda, month)

            return (
              <Card key={b.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-[var(--fs-md)] min-w-0 truncate">
                    {category?.icon} {category?.name ?? 'Categoría eliminada'}{' '}
                    <span className="font-normal text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
                      {moneda} · {vigenciaLabel(b, month)}
                    </span>
                  </span>
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => setEditing(b)}
                      aria-label="Editar presupuesto"
                      className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-md)]"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setToDelete(b)}
                      aria-label="Eliminar presupuesto"
                      className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]"
                      style={{ color: 'var(--color-expense)' }}
                    >
                      🗑️
                    </button>
                  </div>
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
                    <div className="font-semibold">{formatAmount(spent, moneda)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Presupuesto</div>
                    <div className="font-semibold">{formatAmount(b.amount, moneda)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-secondary)]">Disponible</div>
                    <div className="font-semibold" style={{ color: available < 0 ? 'var(--color-expense)' : 'var(--color-income)' }}>
                      {formatAmount(available, moneda)}
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

      <BudgetFormModal
        key={editing?.id ?? 'new'}
        open={creating || !!editing}
        month={month}
        currency={activeCurrency}
        availableCurrencies={availableCurrencies}
        budget={editing ?? undefined}
        categories={editing ? expenseCategories.filter((c) => c.id === editing.categoryId) : categoriesWithoutBudget}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSave={async (categoryId, amount, budgetCurrency, vigencia, hasta) => {
          await upsertBudget({
            id: editing?.id,
            categoryId,
            month: editing?.month ?? month,
            amount,
            currency: budgetCurrency,
            vigencia,
            hasta,
          })
          setCreating(false)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar presupuesto"
        message="Se borra el límite de esta categoría para este mes. Tus movimientos no se tocan."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteBudget(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function BudgetFormModal({
  open,
  month,
  currency,
  availableCurrencies,
  budget,
  categories,
  onClose,
  onSave,
}: {
  open: boolean
  month: string
  currency: Currency
  availableCurrencies: Currency[]
  budget?: Budget
  categories: { id: string; name: string; icon: string }[]
  onClose: () => void
  onSave: (categoryId: string, amount: number, currency: Currency, vigencia: BudgetVigencia, hasta?: string) => void
}) {
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '')
  const [amount, setAmount] = useState(budget?.amount ?? 0)
  // La moneda era un texto heredado del selector de arriba y se pasaba por
  // alto: un presupuesto en la moneda equivocada nunca cuenta ningún gasto.
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>(budget?.currency ?? currency)
  const [vigencia, setVigencia] = useState<BudgetVigencia>(budget?.vigencia ?? 'solo-este-mes')
  const [hasta, setHasta] = useState(budget?.hasta ?? '')

  const effectiveId = categoryId || categories[0]?.id || ''

  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-4">Mes: {month}</p>
      {categories.length === 0 ? (
        <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)]">Ya creaste un presupuesto para todas las categorías de gasto este mes.</p>
      ) : (
        <>
          <Field label="Categoría" hint={budget ? 'No se puede cambiar: sería otro presupuesto.' : undefined}>
            <SelectInput value={effectiveId} disabled={!!budget} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="Moneda"
            hint="Solo se cuentan los gastos de cuentas en esta moneda."
          >
            <SelectInput value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value as Currency)}>
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field
            label="¿Cómo se maneja este presupuesto?"
            hint={
              vigencia === 'solo-este-mes'
                ? 'Aplica solo a este mes; el que viene arranca sin presupuesto.'
                : vigencia === 'cada-mes'
                  ? 'Se repite cada mes con el mismo límite, hasta que lo edites o borres.'
                  : 'Un solo tope que se va gastando a lo largo del periodo (no se reinicia cada mes) — para un objetivo o un proyecto puntual.'
            }
          >
            <SelectInput value={vigencia} onChange={(e) => setVigencia(e.target.value as BudgetVigencia)}>
              <option value="solo-este-mes">Fijo, solo este mes</option>
              <option value="cada-mes">Fijo cada mes</option>
              <option value="rango">Un tope hasta terminar un periodo</option>
            </SelectInput>
          </Field>
          {(vigencia === 'cada-mes' || vigencia === 'rango') && (
            <Field
              label={vigencia === 'rango' ? 'Hasta qué mes (obligatorio)' : 'Hasta qué mes (opcional)'}
              hint={vigencia === 'cada-mes' ? 'Déjalo vacío para que se repita sin fecha de fin.' : undefined}
            >
              <TextInput type="month" value={hasta} onChange={(e) => setHasta(e.target.value)} min={month} />
            </Field>
          )}
          <Field
            label={vigencia === 'rango' ? 'Tope total del periodo' : 'Presupuesto mensual'}
            hint={vigencia === 'rango' ? 'Se acumula desde el inicio hasta el fin del rango, no se reinicia cada mes.' : undefined}
          >
            <AmountInput value={amount} onChange={setAmount} currency={budgetCurrency} />
          </Field>
          <Button
            className="w-full"
            size="lg"
            disabled={amount <= 0 || !effectiveId || (vigencia === 'rango' && !hasta)}
            onClick={() => onSave(effectiveId, amount, budgetCurrency, vigencia, hasta || undefined)}
          >
            {budget ? 'Guardar cambios' : 'Guardar presupuesto'}
          </Button>
        </>
      )}
    </Modal>
  )
}
