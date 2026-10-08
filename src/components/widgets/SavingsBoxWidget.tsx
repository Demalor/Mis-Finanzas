import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../Card'
import { SavingsBoxMoveModal } from '../SavingsBoxMoveModal'
import { useData } from '../../context/useData'
import { formatAmount } from '../../utils/currency'
import { WidgetShell } from './WidgetShell'

// Acceso rápido a una caja de la sección Ahorros. Quitar el widget no toca la caja.
export function SavingsBoxWidget({ boxId }: { boxId: string }) {
  const { savingsBoxes, accounts } = useData()
  const navigate = useNavigate()
  const [moving, setMoving] = useState<'add' | 'withdraw' | null>(null)
  const box = savingsBoxes.find((b) => b.id === boxId)

  if (!box) return <WidgetShell icon="🐷" label="Caja de ahorro" value="Caja eliminada" sub="Quítala en Organizar" />

  const accountName = accounts.find((a) => a.id === box.accountId)?.nombre
  const pct = box.target > 0 ? Math.min(100, (box.current / box.target) * 100) : 0
  const reached = box.current >= box.target && box.target > 0

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1.5">
      <button onClick={() => navigate('/ahorros')} className="text-left flex flex-col gap-1.5 min-w-0">
        <span className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] truncate">🐷 {box.name}</span>
        <span className="amount text-[var(--fs-md)] font-bold truncate" style={{ color: reached ? 'var(--color-income)' : 'var(--color-text)' }}>
          {formatAmount(box.current, box.currency)}
        </span>
        <span className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">
          de {formatAmount(box.target, box.currency)}
          {accountName && ` · ${accountName}`}
        </span>
      </button>
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
      {moving && <SavingsBoxMoveModal box={box} mode={moving} onClose={() => setMoving(null)} />}
    </Card>
  )
}
