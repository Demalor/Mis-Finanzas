import { useData } from '../../context/DataContext'
import { useAuth } from '../../firebase/AuthContext'
import { accountBalance, reservedForAccount } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { WidgetShell } from './WidgetShell'

export function AccountBalanceWidget({ config }: { config: { accountId: string } }) {
  const { accounts, movements, transfers } = useData()
  const { profile } = useAuth()
  const account = accounts.find((a) => a.id === config.accountId)

  if (!account) return <WidgetShell label="Cuenta" value="Cuenta eliminada" />

  const balance = accountBalance(account, movements, transfers)
  const reserved = reservedForAccount(profile?.dashboardWidgets ?? [], account.id)
  const available = balance - reserved
  return (
    <WidgetShell
      icon="👛"
      label={account.nombre}
      value={formatAmount(available, account.moneda)}
      sub={reserved > 0 ? `Apartado: ${formatAmount(reserved, account.moneda)}` : undefined}
      tone={available < 0 ? 'expense' : undefined}
    />
  )
}
