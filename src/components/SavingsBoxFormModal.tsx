import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Field, SelectInput, TextInput, AmountInput } from './FormControls'
import { useData } from '../context/useData'
import { CURRENCIES } from '../types/models'
import type { Currency, SavingsBox } from '../types/models'

// Crear o editar una caja. El padre lo monta con key={box?.id ?? 'new'}.
// Editar cambia la configuración, nunca la plata apartada ni su historial.
export function SavingsBoxFormModal({ box, onClose }: { box?: SavingsBox; onClose: () => void }) {
  const { accounts, addSavingsBox, updateSavingsBox } = useData()
  const savingsAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito')

  const [name, setName] = useState(box?.name ?? '')
  const [currency, setCurrency] = useState<Currency>(box?.currency ?? 'COP')
  const [target, setTarget] = useState(box?.target ?? 0)
  const [accountId, setAccountId] = useState(
    box?.accountId && accounts.some((a) => a.id === box.accountId) ? box.accountId : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const account = accounts.find((a) => a.id === accountId)
  // Cambiar la moneda de una caja con plata reinterpretaría un monto real.
  const monedaBloqueada = !!box && box.current > 0
  const effectiveCurrency = monedaBloqueada ? box.currency : account?.moneda ?? currency
  const opcionesCuenta = monedaBloqueada ? savingsAccounts.filter((a) => a.moneda === box.currency) : savingsAccounts
  const canSave = name.trim() !== '' && target > 0 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const datos = { name: name.trim(), currency: effectiveCurrency, target, accountId: accountId || undefined }
      if (box) await updateSavingsBox({ ...box, ...datos })
      else await addSavingsBox(datos)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={box ? 'Editar caja de ahorro' : 'Nueva caja de ahorro'}>
      <Field label="Nombre">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Viaje a Cartagena" />
      </Field>
      {opcionesCuenta.length > 0 && (
        <Field
          label="Cuenta (opcional)"
          hint={
            accountId
              ? 'Lo que apartes queda reservado dentro de esa cuenta y se descuenta de su disponible.'
              : 'Sin cuenta, la caja es una libreta aparte: no toca el saldo de ninguna cuenta.'
          }
        >
          <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Ninguna — caja independiente</option>
            {opcionesCuenta.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({a.moneda})
              </option>
            ))}
          </SelectInput>
        </Field>
      )}
      {!accountId && (
        <Field
          label="Moneda"
          hint={monedaBloqueada ? 'No se puede cambiar: la caja ya tiene plata en esta moneda.' : undefined}
        >
          <SelectInput
            value={effectiveCurrency}
            disabled={monedaBloqueada}
            onChange={(e) => setCurrency(e.target.value as Currency)}
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
        <AmountInput value={target} onChange={setTarget} currency={effectiveCurrency} />
      </Field>
      {error && (
        <p className="text-[var(--fs-sm)] mb-2 font-medium" style={{ color: 'var(--color-expense)' }}>
          {error}
        </p>
      )}
      <Button className="w-full mt-2" size="lg" disabled={!canSave} onClick={handleSave}>
        {box ? 'Guardar cambios' : 'Crear caja'}
      </Button>
    </Modal>
  )
}
