import { useState } from 'react'
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
  const { accounts, categories, incomeSources } = useData()
  const savingsAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito')
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

  // savingsBox
  const sbPrev = enModo('savingsBox')?.box
  const [sbName, setSbName] = useState(sbPrev?.name ?? '')
  const [sbCurrency, setSbCurrency] = useState<Currency>(sbPrev?.currency ?? 'COP')
  const [sbTarget, setSbTarget] = useState(sbPrev?.target ?? 0)
  const [sbAccountId, setSbAccountId] = useState(sbPrev?.accountId ?? '')
  const sbAccount = accounts.find((a) => a.id === sbAccountId)
  const sbEffectiveCurrency = sbAccount?.moneda ?? sbCurrency
  // Cambiar la moneda de una caja que ya tiene plata reinterpretaría un monto
  // real apartado, así que se bloquea mientras tenga saldo.
  const sbMonedaBloqueada = !!sbPrev && sbPrev.current > 0

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
      if (!sbName.trim() || sbTarget <= 0) return
      onSave({
        id,
        type,
        box: {
          name: sbName.trim(),
          currency: sbMonedaBloqueada ? sbPrev.currency : sbEffectiveCurrency,
          target: sbTarget,
          accountId: sbAccountId || undefined,
          // Editar la caja cambia su configuración, nunca la plata que tiene
          // apartada ni el registro de cómo llegó ahí.
          current: sbPrev?.current ?? 0,
          history: sbPrev?.history,
        },
      })
    }
  }

  const canSave =
    type === 'monthBalance' ||
    ((type === 'accountBalance' || type === 'accountFlow') && !!accountId) ||
    (type === 'budgetStatus' && !!budgetCategoryId) ||
    (type === 'categoryTotal' && !!ctCategoryId) ||
    (type === 'quickPay' && qpDescription.trim() !== '' && qpAmount > 0 && !!qpCategoryId) ||
    (type === 'savingsBox' && sbName.trim() !== '' && sbTarget > 0)

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
        <>
          <Field label="Nombre de la caja" hint={sbAccountId ? 'Lo que apartes saldrá del disponible de esa cuenta.' : 'Es independiente de tus cuentas — no genera movimientos.'}>
            <TextInput value={sbName} onChange={(e) => setSbName(e.target.value)} placeholder="Ej: Viaje a Cartagena" />
          </Field>
          {savingsAccounts.length > 0 && (
            <Field label="Cuenta (opcional)" hint="Si eliges una, la caja usa su moneda y descuenta lo apartado de su disponible.">
              <SelectInput value={sbAccountId} onChange={(e) => setSbAccountId(e.target.value)}>
                <option value="">Ninguna — caja independiente</option>
                {savingsAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda})
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          {!sbAccountId && (
            <Field
              label="Moneda"
              hint={sbMonedaBloqueada ? 'No se puede cambiar: la caja ya tiene plata apartada en esta moneda.' : undefined}
            >
              <SelectInput
                value={sbMonedaBloqueada ? sbPrev.currency : sbCurrency}
                disabled={sbMonedaBloqueada}
                onChange={(e) => setSbCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}
          <Field label="Meta">
            <AmountInput value={sbTarget} onChange={setSbTarget} currency={sbEffectiveCurrency} />
          </Field>
        </>
      )}

      <Button className="w-full mt-2" size="lg" disabled={!canSave} onClick={handleSave}>
        {editando ? 'Guardar cambios' : 'Guardar widget'}
      </Button>
    </Modal>
  )
}
