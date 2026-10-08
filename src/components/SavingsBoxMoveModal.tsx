import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { AmountInput, SelectInput } from './FormControls'
import { useData } from '../context/useData'
import { accountBalance, reservedForAccount } from '../utils/calculations'
import { formatAmount } from '../utils/currency'
import type { SavingsBox } from '../types/models'

// Aportar o retirar de una caja. Si está asociada a una cuenta, aportar tiene
// tope en lo disponible de esa cuenta (saldo − todo lo ya apartado en ella).
export function SavingsBoxMoveModal({
  box,
  mode,
  onClose,
}: {
  box: SavingsBox
  mode: 'add' | 'withdraw'
  onClose: () => void
}) {
  const { accounts, movements, transfers, savingsBoxes, moveSavingsBox } = useData()
  const [amount, setAmount] = useState(0)
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const linked = box.accountId ? accounts.find((a) => a.id === box.accountId) : undefined
  const available = linked
    ? accountBalance(linked, movements, transfers) - reservedForAccount(savingsBoxes, linked.id)
    : undefined
  // Solo las cajas independientes necesitan decir de dónde salió la plata.
  const preguntarOrigen = !linked && mode === 'add'
  const opcionesOrigen = accounts.filter((a) => a.moneda === box.currency)

  async function confirm() {
    if (amount <= 0) return
    if (mode === 'add' && available !== undefined && amount > available) {
      setError(`Solo hay ${formatAmount(available, box.currency)} disponibles en ${linked?.nombre}.`)
      return
    }
    if (mode === 'withdraw' && amount > box.current) {
      setError(`La caja solo tiene ${formatAmount(box.current, box.currency)}.`)
      return
    }
    setSaving(true)
    try {
      await moveSavingsBox(box.id, mode === 'add' ? amount : -amount, origin || undefined)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar.')
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`${mode === 'add' ? 'Aportar a' : 'Retirar de'} ${box.name}`}>
      {mode === 'add' && available !== undefined && (
        <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-3">
          Disponible en {linked?.nombre}: {formatAmount(available, box.currency)}
        </p>
      )}
      {mode === 'withdraw' && (
        <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-3">
          En la caja: {formatAmount(box.current, box.currency)}
        </p>
      )}
      <AmountInput value={amount} onChange={setAmount} currency={box.currency} />
      {preguntarOrigen && opcionesOrigen.length > 0 && (
        <label className="block mt-3">
          <span className="block text-[var(--fs-sm)] font-semibold mb-[var(--sp-2)]">¿De qué cuenta salió?</span>
          <SelectInput value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Sin registrar</option>
            {opcionesOrigen.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </SelectInput>
        </label>
      )}
      {error && (
        <p className="text-[var(--fs-sm)] mt-2 font-medium" style={{ color: 'var(--color-expense)' }}>
          {error}
        </p>
      )}
      <Button className="w-full mt-4" size="lg" disabled={amount <= 0 || saving} onClick={confirm}>
        Confirmar
      </Button>
    </Modal>
  )
}
