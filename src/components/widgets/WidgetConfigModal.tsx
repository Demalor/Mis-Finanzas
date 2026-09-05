import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Field, SelectInput, TextInput, AmountInput, TypeToggle } from '../FormControls'
import { useData } from '../../context/DataContext'
import { CURRENCIES } from '../../types/models'
import type { Currency, DashboardWidgetConfig, DashboardWidgetType, MovementType } from '../../types/models'

const TITLES: Record<DashboardWidgetType, string> = {
  accountBalance: 'Saldo de una cuenta',
  budgetStatus: 'Estado de un presupuesto',
  categoryTotal: 'Total de una categoría',
  currencyBreakdown: 'Balance por moneda',
  combinedTotal: 'Total combinado',
  quickPay: 'Pago rápido',
  savingsBox: 'Caja de ahorro',
}

export function WidgetConfigModal({
  type,
  onClose,
  onSave,
}: {
  type: DashboardWidgetType
  onClose: () => void
  onSave: (config: DashboardWidgetConfig) => void
}) {
  const { accounts, categories, incomeSources } = useData()
  const expenseCategories = categories.filter((c) => c.type === 'gasto')
  const incomeCategories = categories.filter((c) => c.type === 'ingreso')

  // accountBalance
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  // budgetStatus
  const [budgetCategoryId, setBudgetCategoryId] = useState(expenseCategories[0]?.id ?? '')

  // categoryTotal
  const [ctMovementType, setCtMovementType] = useState<MovementType>('gasto')
  const ctCategories = ctMovementType === 'gasto' ? expenseCategories : incomeCategories
  const [ctCategoryId, setCtCategoryId] = useState(ctCategories[0]?.id ?? '')

  // quickPay
  const [qpDescription, setQpDescription] = useState('')
  const [qpAmount, setQpAmount] = useState(0)
  const [qpMovementType, setQpMovementType] = useState<MovementType>('gasto')
  const qpCategories = qpMovementType === 'gasto' ? expenseCategories : incomeCategories
  const [qpCategoryId, setQpCategoryId] = useState(qpCategories[0]?.id ?? '')
  const [qpAccountId, setQpAccountId] = useState(accounts[0]?.id ?? '')
  const [qpSourceId, setQpSourceId] = useState(incomeSources[0]?.id ?? '')

  // savingsBox
  const [sbName, setSbName] = useState('')
  const [sbCurrency, setSbCurrency] = useState<Currency>('COP')
  const [sbTarget, setSbTarget] = useState(0)

  function handleSave() {
    const id = crypto.randomUUID()
    if (type === 'accountBalance') {
      if (!accountId) return
      onSave({ id, type, accountId })
    } else if (type === 'budgetStatus') {
      if (!budgetCategoryId) return
      onSave({ id, type, categoryId: budgetCategoryId })
    } else if (type === 'categoryTotal') {
      if (!ctCategoryId) return
      onSave({ id, type, categoryId: ctCategoryId, movementType: ctMovementType })
    } else if (type === 'quickPay') {
      if (!qpDescription.trim() || qpAmount <= 0 || !qpCategoryId) return
      onSave({
        id,
        type,
        config: {
          description: qpDescription.trim(),
          amount: qpAmount,
          categoryId: qpCategoryId,
          type: qpMovementType,
          accountId: qpAccountId || undefined,
          sourceId: qpMovementType === 'ingreso' ? qpSourceId || undefined : undefined,
        },
      })
    } else if (type === 'savingsBox') {
      if (!sbName.trim() || sbTarget <= 0) return
      onSave({ id, type, box: { name: sbName.trim(), currency: sbCurrency, target: sbTarget, current: 0 } })
    }
  }

  const canSave =
    (type === 'accountBalance' && !!accountId) ||
    (type === 'budgetStatus' && !!budgetCategoryId) ||
    (type === 'categoryTotal' && !!ctCategoryId) ||
    (type === 'quickPay' && qpDescription.trim() !== '' && qpAmount > 0 && !!qpCategoryId) ||
    (type === 'savingsBox' && sbName.trim() !== '' && sbTarget > 0)

  return (
    <Modal open onClose={onClose} title={TITLES[type]}>
      {type === 'accountBalance' && (
        <Field label="Cuenta">
          {accounts.length === 0 ? (
            <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">Todavía no tienes cuentas creadas.</p>
          ) : (
            <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.moneda})
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}

      {type === 'budgetStatus' && (
        <Field label="Categoría">
          {expenseCategories.length === 0 ? (
            <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">No tienes categorías de gasto.</p>
          ) : (
            <SelectInput value={budgetCategoryId} onChange={(e) => setBudgetCategoryId(e.target.value)}>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}

      {type === 'categoryTotal' && (
        <>
          <Field label="Tipo">
            <TypeToggle
              value={ctMovementType}
              onChange={(v) => {
                setCtMovementType(v)
                const list = v === 'gasto' ? expenseCategories : incomeCategories
                setCtCategoryId(list[0]?.id ?? '')
              }}
            />
          </Field>
          <Field label="Categoría">
            {ctCategories.length === 0 ? (
              <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">No tienes categorías de este tipo.</p>
            ) : (
              <SelectInput value={ctCategoryId} onChange={(e) => setCtCategoryId(e.target.value)}>
                {ctCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </>
      )}

      {type === 'quickPay' && (
        <>
          <Field label="Descripción">
            <TextInput value={qpDescription} onChange={(e) => setQpDescription(e.target.value)} placeholder="Ej: Parqueadero U" />
          </Field>
          <Field label="Valor">
            <AmountInput value={qpAmount} onChange={setQpAmount} />
          </Field>
          <Field label="Tipo">
            <TypeToggle
              value={qpMovementType}
              onChange={(v) => {
                setQpMovementType(v)
                const list = v === 'gasto' ? expenseCategories : incomeCategories
                setQpCategoryId(list[0]?.id ?? '')
              }}
            />
          </Field>
          <Field label="Categoría">
            {qpCategories.length === 0 ? (
              <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">No tienes categorías de este tipo.</p>
            ) : (
              <SelectInput value={qpCategoryId} onChange={(e) => setQpCategoryId(e.target.value)}>
                {qpCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          {accounts.length > 0 && (
            <Field label="Cuenta (opcional)">
              <SelectInput value={qpAccountId} onChange={(e) => setQpAccountId(e.target.value)}>
                <option value="">Sin cuenta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda})
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          {qpMovementType === 'ingreso' && incomeSources.length > 0 && (
            <Field label="Fuente de ingreso (opcional)">
              <SelectInput value={qpSourceId} onChange={(e) => setQpSourceId(e.target.value)}>
                <option value="">Sin fuente</option>
                {incomeSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
        </>
      )}

      {type === 'savingsBox' && (
        <>
          <Field label="Nombre de la caja" hint="Es independiente de tus cuentas — no genera movimientos.">
            <TextInput value={sbName} onChange={(e) => setSbName(e.target.value)} placeholder="Ej: Viaje a Cartagena" />
          </Field>
          <Field label="Moneda">
            <SelectInput value={sbCurrency} onChange={(e) => setSbCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Meta">
            <AmountInput value={sbTarget} onChange={setSbTarget} />
          </Field>
        </>
      )}

      <Button className="w-full mt-2" size="lg" disabled={!canSave} onClick={handleSave}>
        Guardar widget
      </Button>
    </Modal>
  )
}
