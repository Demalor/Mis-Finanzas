import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from './Card'
import { Button } from './Button'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { EmptyState } from './EmptyState'
import { Field, SelectInput, TypeToggle, AmountInput, TextInput } from './FormControls'
import type { MovementType, RecurringFrequency, RecurringMovement } from '../types/models'
import { FREQUENCY_LABELS } from '../utils/recurring'
import { formatAmount } from '../utils/currency'
import { todayISO, formatDateReadable } from '../utils/date'

export function RecurringTab() {
  const { recurring, categories, accounts, addRecurring, updateRecurring, deleteRecurring } = useData()
  const accountCurrency = new Map(accounts.map((a) => [a.id, a.moneda]))
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<RecurringMovement | null>(null)

  return (
    <div className="flex flex-col gap-[var(--sp-5)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)]">
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)]">Arriendo, servicios, salario y otros pagos que se repiten</p>
        <Button onClick={() => setCreating(true)} className="shrink-0">+ Nuevo</Button>
      </div>

      {recurring.length === 0 ? (
        <EmptyState
          icon="🔁"
          title="No tienes movimientos recurrentes"
          message="Agrega pagos o ingresos que se repiten periódicamente, como el arriendo o el salario."
          action={<Button onClick={() => setCreating(true)}>Crear recurrencia</Button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {recurring.map((r) => {
            const category = categories.find((c) => c.id === r.categoryId)
            return (
              <Card key={r.id} padding="md">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--fs-lg)] shrink-0"
                    style={{ background: category ? `${category.color}22` : 'var(--color-muted)' }}
                  >
                    {category?.icon ?? '🔁'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--fs-md)] truncate">{r.description}</div>
                    <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] truncate">
                      {FREQUENCY_LABELS[r.frequency]} · desde {formatDateReadable(r.startDate)}
                      {!r.active && ' · pausada'}
                    </div>
                  </div>
                  <div
                    className="font-bold text-[var(--fs-md)] shrink-0"
                    style={{ color: r.type === 'ingreso' ? 'var(--color-income)' : 'var(--color-expense)' }}
                  >
                    {r.type === 'ingreso' ? '+' : '−'}{' '}
                    {formatAmount(r.amount, (r.accountId && accountCurrency.get(r.accountId)) || 'COP')}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={() => updateRecurring(r.id, { active: !r.active })}
                    className="text-[var(--fs-xs)] font-semibold px-3 py-2 rounded-full border border-[var(--color-border)]"
                  >
                    {r.active ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => setToDelete(r)}
                    aria-label="Eliminar recurrencia"
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]"
                    style={{ color: 'var(--color-expense)' }}
                  >
                    🗑️
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <NewRecurringModal open={creating} onClose={() => setCreating(false)} categories={categories} onSave={addRecurring} />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar recurrencia"
        message="Los movimientos ya generados no se eliminarán, pero no se crearán más en el futuro."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteRecurring(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function NewRecurringModal({
  open,
  onClose,
  categories,
  onSave,
}: {
  open: boolean
  onClose: () => void
  categories: { id: string; name: string; icon: string; type: MovementType }[]
  onSave: (input: Omit<RecurringMovement, 'id'>) => Promise<void>
}) {
  const { accounts, incomeSources } = useData()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [type, setType] = useState<MovementType>('gasto')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('mensual')
  const [startDate, setStartDate] = useState(todayISO())

  const filteredCategories = categories.filter((c) => c.type === type)
  const effectiveCategoryId = categoryId && filteredCategories.some((c) => c.id === categoryId) ? categoryId : filteredCategories[0]?.id ?? ''
  const usableAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito' || type === 'gasto')
  const effectiveAccountId = accountId && usableAccounts.some((a) => a.id === accountId) ? accountId : usableAccounts[0]?.id ?? ''

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento recurrente">
      <Field label="Descripción">
        <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Arriendo apartamento" autoFocus />
      </Field>
      <Field label="Tipo">
        <TypeToggle value={type} onChange={setType} />
      </Field>
      <Field label="Valor">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label="Categoría">
        <SelectInput value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      {usableAccounts.length > 0 && (
        <Field label="Cuenta">
          <SelectInput value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
            {usableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.moneda})
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
      {type === 'ingreso' && incomeSources.length > 0 && (
        <Field label="Fuente del ingreso (opcional)">
          <SelectInput value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">Sin especificar</option>
            {incomeSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
      <Field label="Frecuencia">
        <SelectInput value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
          {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Fecha de inicio">
        <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Button
        className="w-full"
        size="lg"
        disabled={amount <= 0 || !description.trim() || !effectiveCategoryId}
        onClick={async () => {
          await onSave({
            description: description.trim(),
            amount,
            type,
            categoryId: effectiveCategoryId,
            frequency,
            startDate,
            active: true,
            accountId: effectiveAccountId || undefined,
            sourceId: type === 'ingreso' && sourceId ? sourceId : undefined,
          })
          setDescription('')
          setAmount(0)
          onClose()
        }}
      >
        Guardar recurrencia
      </Button>
    </Modal>
  )
}
