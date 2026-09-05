import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext'
import { movementsInMonth } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey, todayISO } from '../../utils/date'
import { Card } from '../Card'
import type { QuickPayConfig } from '../../types/models'

export function QuickPayWidget({ config }: { config: { config: QuickPayConfig } }) {
  const { movements, accounts, categories, addMovement, deleteMovement } = useData()
  const { description, amount, categoryId, type, accountId, sourceId } = config.config
  const category = categories.find((c) => c.id === categoryId)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const month = currentMonthKey()
  const monthCount = useMemo(
    () => movementsInMonth(movements, month).filter((m) => m.categoryId === categoryId && m.description === description).length,
    [movements, month, categoryId, description]
  )
  const currency = accountId ? accountCurrency.get(accountId) ?? 'COP' : 'COP'

  async function handleTap() {
    setSaving(true)
    try {
      const movement = await addMovement({ type, amount, categoryId, date: todayISO(), description, accountId, sourceId })
      setLastCreatedId(movement.id)
      setTimeout(() => setLastCreatedId((id) => (id === movement.id ? null : id)), 6000)
    } finally {
      setSaving(false)
    }
  }

  async function handleUndo() {
    if (!lastCreatedId) return
    await deleteMovement(lastCreatedId)
    setLastCreatedId(null)
  }

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1.5">
      <div className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] truncate">
        {category?.icon} {description}
      </div>
      {lastCreatedId ? (
        <button
          onClick={handleUndo}
          className="min-h-[2rem] text-[var(--fs-xs)] font-semibold text-left"
          style={{ color: 'var(--color-accent-ink)' }}
        >
          ✓ Registrado — Deshacer
        </button>
      ) : (
        <button
          onClick={handleTap}
          disabled={saving}
          className="min-h-[2rem] rounded-[var(--radius-sm)] font-bold text-[var(--fs-md)] disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          {formatAmount(amount, currency)}
        </button>
      )}
      <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)]">{monthCount} este mes</div>
    </Card>
  )
}
