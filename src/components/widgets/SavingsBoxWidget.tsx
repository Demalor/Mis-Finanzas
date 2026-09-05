import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Card } from '../Card'
import { AmountInput } from '../FormControls'
import { formatAmount } from '../../utils/currency'
import type { SavingsBoxConfig } from '../../types/models'

// Caja de ahorro independiente: no es una cuenta ni genera movimientos, así
// que su moneda y su saldo se manejan aparte, sin ninguna conversión.
export function SavingsBoxWidget({
  box,
  onContribute,
}: {
  box: SavingsBoxConfig
  onContribute: (delta: number) => void
}) {
  const [moving, setMoving] = useState<'add' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState(0)

  const pct = box.target > 0 ? Math.min(100, (box.current / box.target) * 100) : 0
  const reached = box.current >= box.target && box.target > 0

  function confirm() {
    if (amount <= 0 || !moving) return
    onContribute(moving === 'add' ? amount : -amount)
    setAmount(0)
    setMoving(null)
  }

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1.5">
      <div className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] truncate">🐷 {box.name}</div>
      <div className="amount text-[var(--fs-md)] font-bold truncate" style={{ color: reached ? 'var(--color-income)' : 'var(--color-text)' }}>
        {formatAmount(box.current, box.currency)}
      </div>
      <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">de {formatAmount(box.target, box.currency)}</div>
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

      <Modal open={moving !== null} onClose={() => setMoving(null)} title={moving === 'add' ? 'Agregar a la caja' : 'Retirar de la caja'}>
        <AmountInput value={amount} onChange={setAmount} />
        <Button className="w-full mt-4" size="lg" disabled={amount <= 0} onClick={confirm}>
          Confirmar
        </Button>
      </Modal>
    </Card>
  )
}
