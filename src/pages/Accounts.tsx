import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Field, TextInput, SelectInput } from '../components/FormControls'
import { TransfersHistory } from '../components/TransfersHistory'
import { AccountFormModal } from '../components/AccountFormModal'
import type { Account, AccountType } from '../types/models'
import { formatAmount } from '../utils/currency'
import { accountBalance } from '../utils/calculations'
import { daysUntil } from '../utils/loanMath'
import { fetchExchangeRate } from '../utils/exchangeRate'
import { todayISO, nextMonthlyDate } from '../utils/date'

const TYPE_LABELS: Record<AccountType, { label: string; icon: string }> = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  banco: { label: 'Cuenta bancaria', icon: '🏦' },
  tarjeta_credito: { label: 'Tarjeta de crédito', icon: '💳' },
}

export function Accounts() {
  const { accounts, movements, transfers, addAccount, updateAccount, deleteAccount } = useData()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [toDelete, setToDelete] = useState<Account | null>(null)
  const [exchanging, setExchanging] = useState(false)

  const regularAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito')
  const creditCards = accounts.filter((a) => a.tipo === 'tarjeta_credito')

  return (
    <div className="page">
      <PageHeader
        title="Cuentas"
        subtitle="Efectivo, cuentas bancarias y tarjetas, en cualquier moneda"
        action={
          <>
            <Button variant="secondary" onClick={() => setExchanging(true)} className="flex-1 md:flex-none">💱 Cambiar moneda</Button>
            <Button onClick={() => setCreating(true)} className="flex-1 md:flex-none">+ Nueva</Button>
          </>
        }
      />

      <div>
        <h2 className="t-h2 mb-[var(--sp-3)]">Efectivo y bancos</h2>
        {regularAccounts.length === 0 ? (
          <EmptyState icon="💰" title="Aún no tienes cuentas" message="Crea tu primera cuenta de efectivo o banco." />
        ) : (
          <div className="card-grid">
            {regularAccounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                balance={accountBalance(a, movements, transfers)}
                onEdit={() => setEditing(a)}
                onDelete={() => setToDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="t-h2 mb-[var(--sp-3)]">Tarjetas de crédito</h2>
        {creditCards.length === 0 ? (
          <EmptyState icon="💳" title="No tienes tarjetas registradas" message="Agrégalas para llevar el control de tu cupo y fechas de pago." />
        ) : (
          <div className="card-grid">
            {creditCards.map((a) => (
              <CreditCardCard
                key={a.id}
                account={a}
                balance={accountBalance(a, movements, transfers)}
                onEdit={() => setEditing(a)}
                onDelete={() => setToDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="t-h2 mb-[var(--sp-3)]">Historial de cambios de moneda</h2>
        <Card padding="sm">
          <TransfersHistory />
        </Card>
      </div>

      <AccountFormModal open={creating} onClose={() => setCreating(false)} onSave={async (data) => { await addAccount(data); setCreating(false) }} />
      <AccountFormModal
        open={!!editing}
        account={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSave={async (data) => { if (editing) await updateAccount(editing.id, data); setEditing(null) }}
      />

      {exchanging && <CurrencyExchangeModal onClose={() => setExchanging(false)} />}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cuenta"
        message="Los movimientos ya registrados en esta cuenta no se eliminarán, pero quedarán sin cuenta asignada."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await deleteAccount(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}

function AccountCard({ account, balance, onEdit, onDelete }: { account: Account; balance: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card padding="md" className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--fs-xl)] shrink-0 bg-[var(--color-muted)]">
        {TYPE_LABELS[account.tipo].icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[var(--fs-md)] truncate">{account.nombre}</div>
        <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">{TYPE_LABELS[account.tipo].label} · {account.moneda}</div>
        <div className="text-[var(--fs-md)] font-bold mt-1">{formatAmount(balance, account.moneda)}</div>
      </div>
      <button onClick={onEdit} aria-label="Editar cuenta" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-md)]">✏️</button>
      <button onClick={onDelete} aria-label="Eliminar cuenta" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
    </Card>
  )
}

function CreditCardCard({ account, balance, onEdit, onDelete }: { account: Account; balance: number; onEdit: () => void; onDelete: () => void }) {
  const cupo = account.cupo ?? 0
  const disponible = cupo - balance
  const pct = cupo > 0 ? Math.min(100, (balance / cupo) * 100) : 0

  const proximoPago = useMemo(
    () => (account.fechaPago ? nextMonthlyDate(account.fechaPago) : null),
    [account.fechaPago]
  )

  const dias = proximoPago ? daysUntil(proximoPago) : null
  const showAlert = dias !== null && dias <= (account.diasAvisoPago ?? 5)

  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--fs-xl)] shrink-0 bg-[var(--color-muted)]">💳</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--fs-md)] truncate">{account.nombre}</div>
          <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">{account.moneda}</div>
        </div>
        <button onClick={onEdit} aria-label="Editar tarjeta" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-md)]">✏️</button>
        <button onClick={onDelete} aria-label="Eliminar tarjeta" className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
      </div>

      <div className="h-2.5 bg-[var(--color-muted)] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? 'var(--color-expense)' : 'var(--color-accent)' }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[var(--fs-sm)] mb-2">
        <div>
          <div className="text-[var(--color-text-secondary)]">Debes</div>
          <div className="font-semibold">{formatAmount(balance, account.moneda)}</div>
        </div>
        <div>
          <div className="text-[var(--color-text-secondary)]">Cupo disponible</div>
          <div className="font-semibold">{formatAmount(disponible, account.moneda)}</div>
        </div>
      </div>
      {account.fechaPago && (
        <p className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
          Pago: día {account.fechaPago} de cada mes {account.fechaCorte ? `· Corte: día ${account.fechaCorte}` : ''}
        </p>
      )}
      {showAlert && (
        <p className="mt-2 text-[var(--fs-sm)] font-semibold" style={{ color: dias! < 0 ? 'var(--color-expense)' : 'var(--color-warn)' }}>
          {dias! < 0 ? '⚠️ Se venció el pago' : `⏰ Vence en ${dias} día(s)`}
        </p>
      )}
    </Card>
  )
}

function CurrencyExchangeModal({ onClose }: { onClose: () => void }) {
  const { accounts, addTransfer } = useData()

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [fromAmount, setFromAmount] = useState(0)
  const [toAmount, setToAmount] = useState(0)
  const [rate, setRate] = useState(1)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [loadingRate, setLoadingRate] = useState(false)
  const [rateSource, setRateSource] = useState<'auto' | 'manual'>('auto')
  const [saved, setSaved] = useState(false)

  const usableAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito')
  const fromAccount = usableAccounts.find((a) => a.id === fromId)
  const toAccount = usableAccounts.find((a) => a.id === toId)

  useEffect(() => {
    if (usableAccounts.length >= 1 && !fromId) setFromId(usableAccounts[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!fromAccount || !toAccount || fromAccount.moneda === toAccount.moneda) return
    setLoadingRate(true)
    fetchExchangeRate(fromAccount.moneda, toAccount.moneda).then((r) => {
      setLoadingRate(false)
      if (r && rateSource === 'auto') {
        setRate(r)
        if (fromAmount > 0) setToAmount(Math.round(fromAmount * r * 100) / 100)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAccount?.moneda, toAccount?.moneda])

  function handleFromAmountChange(value: number) {
    setFromAmount(value)
    if (rate > 0) setToAmount(Math.round(value * rate * 100) / 100)
  }

  function handleRateChange(value: number) {
    setRate(value)
    setRateSource('manual')
    if (fromAmount > 0) setToAmount(Math.round(fromAmount * value * 100) / 100)
  }

  function handleToAmountChange(value: number) {
    setToAmount(value)
    if (fromAmount > 0) {
      setRate(Math.round((value / fromAmount) * 10000) / 10000)
      setRateSource('manual')
    }
  }

  async function handleSubmit() {
    if (!fromAccount || !toAccount || fromAmount <= 0 || toAmount <= 0) return
    await addTransfer({
      tipo: 'cambio_moneda',
      date,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      fromAmount,
      toAmount,
      rate,
      note: note.trim() || undefined,
    })
    setSaved(true)
    setTimeout(onClose, 700)
  }

  if (usableAccounts.length < 2) {
    return (
      <Modal open onClose={onClose} title="Cambio de moneda">
        <EmptyState
          icon="💱"
          title="Necesitas al menos 2 cuentas"
          message="Crea una cuenta de origen y otra de destino para poder hacer un cambio."
        />
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Cambio de moneda">
      <Field label="Desde">
        <SelectInput value={fromId} onChange={(e) => setFromId(e.target.value)}>
          {usableAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre} ({a.moneda})</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Monto que sale">
        <TextInput type="number" min={0} value={fromAmount || ''} onChange={(e) => handleFromAmountChange(Number(e.target.value))} />
      </Field>

      <Field label="Hacia">
        <SelectInput value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">Selecciona una cuenta</option>
          {usableAccounts.filter((a) => a.id !== fromId).map((a) => (
            <option key={a.id} value={a.id}>{a.nombre} ({a.moneda})</option>
          ))}
        </SelectInput>
      </Field>

      {fromAccount && toAccount && fromAccount.moneda !== toAccount.moneda && (
        <Field label="Tasa de cambio" hint={loadingRate ? 'Consultando tasa del día…' : `1 ${fromAccount.moneda} = ${rate} ${toAccount.moneda} (puedes editarla)`}>
          <TextInput type="number" step="0.0001" value={rate} onChange={(e) => handleRateChange(Number(e.target.value))} />
        </Field>
      )}

      <Field label="Monto que entra">
        <TextInput type="number" min={0} value={toAmount || ''} onChange={(e) => handleToAmountChange(Number(e.target.value))} />
      </Field>

      <Field label="Fecha">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
      </Field>

      <Field label="Nota (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Cambio en casa de cambio X" />
      </Field>

      <Button size="lg" className="w-full" disabled={!fromAccount || !toAccount || fromAmount <= 0 || toAmount <= 0} onClick={handleSubmit}>
        {saved ? '✓ Guardado' : 'Registrar cambio'}
      </Button>
    </Modal>
  )
}
