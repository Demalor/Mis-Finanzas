import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { EmptyState } from './EmptyState'
import { formatAmount } from '../utils/currency'
import { formatDateReadable } from '../utils/date'

export function TransfersHistory() {
  const { transfers, accounts, deleteTransfer } = useData()

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.nombre ?? 'Cuenta eliminada'
  const sorted = useMemo(() => [...transfers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [transfers])

  if (sorted.length === 0) {
    return <EmptyState icon="💱" title="Aún no has hecho cambios de moneda" message="Los cambios que hagas entre tus cuentas aparecerán aquí." />
  }

  return (
    <div className="flex flex-col divide-y divide-[var(--color-border)]">
      {sorted.map((t) => {
        const fromAccount = accounts.find((a) => a.id === t.fromAccountId)
        const toAccount = accounts.find((a) => a.id === t.toAccountId)
        return (
          <div key={t.id} className="flex items-center gap-3 py-3.5">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[18px] shrink-0 bg-[var(--color-accent-soft)]">💱</div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium truncate">
                {accountName(t.fromAccountId)} → {accountName(t.toAccountId)}
              </div>
              <div className="text-[13px] text-[var(--color-text-secondary)]">
                {formatDateReadable(t.date)} · Tasa: {t.rate} {t.note ? `· ${t.note}` : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[14px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                − {formatAmount(t.fromAmount, fromAccount?.moneda ?? 'COP')}
              </div>
              <div className="text-[14px] font-semibold" style={{ color: 'var(--color-income)' }}>
                + {formatAmount(t.toAmount, toAccount?.moneda ?? 'COP')}
              </div>
            </div>
            <button
              onClick={() => deleteTransfer(t.id)}
              aria-label="Eliminar cambio"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 text-[16px]"
              style={{ color: 'var(--color-expense)' }}
            >
              🗑️
            </button>
          </div>
        )
      })}
    </div>
  )
}
