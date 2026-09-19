import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Card } from '../Card'
import { AmountInput, SelectInput } from '../FormControls'
import { formatAmount } from '../../utils/currency'
import type { Account, SavingsBoxConfig } from '../../types/models'

// Caja de ahorro: si no está asociada a una cuenta es independiente (no genera
// movimientos ni conversiones). Si sí, "current" es una reserva sobre el saldo
// de esa cuenta — agregar tiene tope en lo disponible, calculado afuera.
export function SavingsBoxWidget({
  box,
  accountName,
  accountAvailable,
  accounts,
  onContribute,
}: {
  box: SavingsBoxConfig
  accountName?: string
  accountAvailable?: number
  accounts: Account[]
  onContribute: (delta: number, originAccountId?: string) => void
}) {
  const [moving, setMoving] = useState<'add' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState(0)
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState('')

  // Si la caja está atada a una cuenta, el origen ya se sabe y no se pregunta.
  // Solo las cajas independientes necesitan decir de dónde salió la plata.
  const preguntarOrigen = !box.accountId && moving === 'add'
  const opcionesOrigen = accounts.filter((a) => a.moneda === box.currency)

  const pct = box.target > 0 ? Math.min(100, (box.current / box.target) * 100) : 0
  const reached = box.current >= box.target && box.target > 0

  function confirm() {
    if (amount <= 0 || !moving) return
    if (moving === 'add' && accountAvailable !== undefined && amount > accountAvailable) {
      setError(`Solo hay ${formatAmount(accountAvailable, box.currency)} disponibles en ${accountName ?? 'la cuenta'}.`)
      return
    }
    onContribute(moving === 'add' ? amount : -amount, origin || undefined)
    setAmount(0)
    setOrigin('')
    setError('')
    setMoving(null)
  }

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1.5">
      <div className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] truncate">🐷 {box.name}</div>
      <div className="amount text-[var(--fs-md)] font-bold truncate" style={{ color: reached ? 'var(--color-income)' : 'var(--color-text)' }}>
        {formatAmount(box.current, box.currency)}
      </div>
      <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">
        de {formatAmount(box.target, box.currency)}
        {accountName && ` · ${accountName}`}
      </div>
      <div className="h-1.5 bg-[var(--color-muted)] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: reached ? 'var(--color-income)' : 'var(--color-accent)' }} />
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => setMoving('add')}
          className="flex-1 min-h-[1.75rem] rounded-[var(--radius-sm)] text-[var(--fs-2xs)] font-semibold"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-ink)' }}
        >
          + Agregar
        </button>
        <button
          onClick={() => setMoving('withdraw')}
          disabled={box.current <= 0}
          className="flex-1 min-h-[1.75rem] rounded-[var(--radius-sm)] text-[var(--fs-2xs)] font-semibold disabled:opacity-40"
          style={{ background: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
        >
          − Retirar
        </button>
      </div>

      <Modal
        open={moving !== null}
        onClose={() => {
          setMoving(null)
          setError('')
        }}
        title={moving === 'add' ? 'Agregar a la caja' : 'Retirar de la caja'}
      >
        {moving === 'add' && accountAvailable !== undefined && (
          <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-3">
            Disponible en {accountName}: {formatAmount(accountAvailable, box.currency)}
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
        <Button className="w-full mt-4" size="lg" disabled={amount <= 0} onClick={confirm}>
          Confirmar
        </Button>
      </Modal>
    </Card>
  )
}
