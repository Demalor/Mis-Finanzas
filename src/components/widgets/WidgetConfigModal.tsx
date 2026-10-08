import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Field, SelectInput, TextInput, AmountInput, TypeToggle } from '../FormControls'
import { useData } from '../../context/useData'
import { CURRENCIES } from '../../types/models'
import type { Currency, DashboardWidgetConfig, DashboardWidgetType, MovementType } from '../../types/models'

const TITLES: Record<DashboardWidgetType, string> = {
  monthBalance: 'Balance del mes',
  accountBalance: 'Saldo de una cuenta',
  accountFlow: 'Movimiento de una cuenta',
  budgetStatus: 'Estado de un presupuesto',
  categoryTotal: 'Total de una categoría',
  currencyBreakdown: 'Balance por moneda',
  combinedTotal: 'Total combinado',
  quickPay: 'Pago rápido',
  savingsBox: 'Caja de ahorro',
}

// Sirve para crear y para editar: si llega `config`, cada campo arranca con
// su valor y al guardar se conserva el id (así el widget no cambia de sitio).
// El padre lo monta con key={config?.id ?? 'new'} para resetear el estado.
export function WidgetConfigModal({
  type,
  config,
  onClose,
  onSave,
}: {
  type: DashboardWidgetType
  config?: DashboardWidgetConfig
  onClose: () => void
  onSave: (config: DashboardWidgetConfig) => void
}) {
  const { accounts, categories, incomeSources, savingsBoxes } = useData()
  const navigate = useNavigate()
  const expenseCategories = categories.filter((c) => c.type === 'gasto')
  const incomeCategories = categories.filter((c) => c.type === 'ingreso')

  // Cada bloque lee de `config` solo cuando es de su propio tipo.
  const enModo = <T extends DashboardWidgetType>(t: T) =>
    config?.type === t ? (config as Extract<DashboardWidgetConfig, { type: T }>) : undefined
  const editando = !!config

  // monthBalance
  const [mbCurrency, setMbCurrency] = useState<Currency>(enModo('monthBalance')?.currency ?? 'COP')

  // accountBalance
  const [accountId, setAccountId] = useState(
    enModo('accountBalance')?.accountId ?? enModo('accountFlow')?.accountId ?? accounts[0]?.id ?? ''
  )

  // budgetStatus
  const [budgetCategoryId, setBudgetCategoryId] = useState(
    enModo('budgetStatus')?.categoryId ?? expenseCategories[0]?.id ?? ''
  )

  // categoryTotal
  const ctPrev = enModo('categoryTotal')
  const [ctMovementType, setCtMovementType] = useState<MovementType>(ctPrev?.movementType ?? 'gasto')
  const ctCategories = ctMovementType === 'gasto' ? expenseCategories : incomeCategories
  const [ctCategoryId, setCtCategoryId] = useState(ctPrev?.categoryId ?? ctCategories[0]?.id ?? '')

  // quickPay
  const qpPrev = enModo('quickPay')?.config
  const [qpDescription, setQpDescription] = useState(qpPrev?.description ?? '')
  const [qpAmount, setQpAmount] = useState(qpPrev?.amount ?? 0)
  const [qpMovementType, setQpMovementType] = useState<MovementType>(qpPrev?.type ?? 'gasto')
  const qpCategories = qpMovementType === 'gasto' ? expenseCategories : incomeCategories
  const [qpCategoryId, setQpCategoryId] = useState(qpPrev?.categoryId ?? qpCategories[0]?.id ?? '')
  const [qpAccountId, setQpAccountId] = useState(qpPrev?.accountId ?? accounts[0]?.id ?? '')
  const [qpSourceId, setQpSourceId] = useState(qpPrev?.sourceId ?? incomeSources[0]?.id ?? '')

  // savingsBox: el widget solo apunta a una caja que vive en Ahorros.
  const sbPrev = enModo('savingsBox')
  const [sbBoxId, setSbBoxId] = useState(sbPrev ? sbPrev.boxId ?? sbPrev.id : savingsBoxes[0]?.id ?? '')

  function handleSave() {
    const id = config?.id ?? crypto.randomUUID()
    if (type === 'monthBalance') {
      onSave({ id, type, currency: mbCurrency })
    } else if (type === 'accountBalance' || type === 'accountFlow') {
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
      if (!sbBoxId) return
      onSave({ id, type, boxId: sbBoxId })
    }
  }

  const canSave =
    type === 'monthBalance' ||
    ((type === 'accountBalance' || type === 'accountFlow') && !!accountId) ||
    (type === 'budgetStatus' && !!budgetCategoryId) ||
    (type === 'categoryTotal' && !!ctCategoryId) ||
    (type === 'quickPay' && qpDescription.trim() !== '' && qpAmount > 0 && !!qpCategoryId) ||
    (type === 'savingsBox' && !!sbBoxId)

  return (
    <Modal open onClose={onClose} title={`${editando ? 'Editar' : 'Nuevo'}: ${TITLES[type]}`}>
      {type === 'monthBalance' && (
        <Field label="Moneda" hint="Se suman solo los movimientos de las cuentas en esta moneda.">
          <SelectInput value={mbCurrency} onChange={(e) => setMbCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      {(type === 'accountBalance' || type === 'accountFlow') && (
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
            <AmountInput value={qpAmount} onChange={setQpAmount} currency={accounts.find((a) => a.id === qpAccountId)?.moneda ?? 'COP'} />
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
        <Field label="Caja" hint="Las cajas se crean y se manejan en la sección Ahorros.">
          {savingsBoxes.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">Todavía no tienes cajas de ahorro.</p>
              <Button variant="secondary" onClick={() => navigate('/ahorros')}>
                Crear una en Ahorros
              </Button>
            </div>
          ) : (
            <SelectInput value={sbBoxId} onChange={(e) => setSbBoxId(e.target.value)}>
              {savingsBoxes.map((b) => (
                <option key={b.id} value={b.id}>
                  🐷 {b.name} ({b.currency})
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      )}

      <Button className="w-full mt-2" size="lg" disabled={!canSave} onClick={handleSave}>
        {editando ? 'Guardar cambios' : 'Guardar widget'}
      </Button>
    </Modal>
  )
}
