import { useMemo } from 'react'
import { useData } from '../../context/useData'
import { useAuth } from '../../firebase/useAuth'
import { accountBalance, reservedForAccount, movementsInMonth, totalsFor } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { currentMonthKey } from '../../utils/date'
import { Card } from '../Card'

// Cuánto entró y cuánto salió de una cuenta este mes, más lo que le queda.
// La barra compara ingreso contra gasto (verde vs rojo): dice en qué se fue
// lo que se movió, no si estás ahorrando — para eso están los montos.
export function AccountFlowWidget({ config }: { config: { accountId: string } }) {
  const { accounts, movements, transfers } = useData()
  const { profile } = useAuth()
  const month = currentMonthKey()
  const account = accounts.find((a) => a.id === config.accountId)

  const totals = useMemo(() => {
    if (!account) return { income: 0, expense: 0 }
    return totalsFor(movementsInMonth(movements, month).filter((m) => m.accountId === account.id))
  }, [account, movements, month])

  if (!account) {
    return (
      <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1">
        <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">Cuenta</div>
        <div className="font-bold">Cuenta eliminada</div>
      </Card>
    )
  }

  const reserved = reservedForAccount(profile?.dashboardWidgets ?? [], account.id)
  const disponible = accountBalance(account, movements, transfers) - reserved
  const movido = totals.income + totals.expense
  const pctIngreso = movido > 0 ? (totals.income / movido) * 100 : 0

  return (
    <Card padding="sm" className="min-h-[6rem] flex flex-col justify-center gap-1.5">
      <div className="text-[var(--fs-xs)] font-medium text-[var(--color-text-secondary)] truncate">👛 {account.nombre}</div>
      <div
        className="amount text-[var(--fs-lg)] font-bold leading-tight break-words"
        style={{ color: disponible < 0 ? 'var(--color-expense)' : 'var(--color-text)' }}
      >
        {formatAmount(disponible, account.moneda)}
      </div>

      {movido === 0 ? (
        <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)]">Sin movimientos este mes</div>
      ) : (
        <>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--color-muted)]">
            <div style={{ width: `${pctIngreso}%`, background: 'var(--color-income)' }} />
            <div style={{ width: `${100 - pctIngreso}%`, background: 'var(--color-expense)' }} />
          </div>
          <div className="text-[var(--fs-2xs)] leading-tight">
            <div className="truncate" style={{ color: 'var(--color-income)' }}>
              ↑ {formatAmount(totals.income, account.moneda)}
            </div>
            <div className="truncate" style={{ color: 'var(--color-expense)' }}>
              ↓ {formatAmount(totals.expense, account.moneda)}
            </div>
          </div>
        </>
      )}

      {reserved > 0 && (
        <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">
          Apartado: {formatAmount(reserved, account.moneda)}
        </div>
      )}
    </Card>
  )
}
