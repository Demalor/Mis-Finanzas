import { useData } from '../../context/DataContext'
import { accountBalance } from '../../utils/calculations'
import { formatAmount } from '../../utils/currency'
import { WidgetShell } from './WidgetShell'

export function AccountBalanceWidget({ config }: { config: { accountId: string } }) {
  const { accounts, movements, transfers } = useData()
  const account = accounts.find((a) => a.id === config.accountId)

  if (!account) return <WidgetShell label="Cuenta" value="Cuenta eliminada" />

  const balance = accountBalance(account, movements, transfers)
  return (
    <WidgetShell
      icon="👛"
      label={account.nombre}
      value={formatAmount(balance, account.moneda)}
      tone={balance < 0 ? 'expense' : undefined}
    />
  )
}
