import { useEffect, useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Field, TextInput, SelectInput } from '../components/FormControls'
import { TransfersHistory } from '../components/TransfersHistory'
import type { Account, AccountType, Currency } from '../types/models'
import { CURRENCIES } from '../types/models'
import { formatAmount } from '../utils/currency'
import { daysUntil } from '../utils/loanMath'
import { fetchExchangeRate } from '../utils/exchangeRate'
import { todayISO } from '../utils/date'

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

  function accountBalance(account: Account): number {
    const gastos = movements
      .filter((m) => m.accountId === account.id && m.type === 'gasto')
      .reduce((s, m) => s + m.amount, 0)
    const ingresos = movements
      .filter((m) => m.accountId === account.id && m.type === 'ingreso')
      .reduce((s, m) => s + m.amount, 0)
    const salidas = transfers.filter((t) => t.fromAccountId === account.id).reduce((s, t) => s + t.fromAmount, 0)
    const entradas = transfers.filter((t) => t.toAccountId === account.id).reduce((s, t) => s + t.toAmount, 0)

    if (account.tipo === 'tarjeta_credito') {
      // Para tarjetas, el "balance" representa la deuda: gastos - pagos recibidos
      return gastos - entradas
    }
    return ingresos - gastos - salidas + entradas
  }

  const regularAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito')
  const creditCards = accounts.filter((a) => a.tipo === 'tarjeta_credito')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">Cuentas</h1>
          <p className="text-[var(--color-text-secondary)] text-[15px]">Efectivo, cuentas bancarias y tarjetas, en cualquier moneda</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setExchanging(true)} className="flex-1 sm:flex-none">💱 Cambiar moneda</Button>
          <Button onClick={() => setCreating(true)} className="flex-1 sm:flex-none">+ Nueva</Button>
        </div>
      </div>

      <div>
        <h2 className="text-[18px] font-bold mb-3">Efectivo y bancos</h2>
        {regularAccounts.length === 0 ? (
          <EmptyState icon="💰" title="Aún no tienes cuentas" message="Crea tu primera cuenta de efectivo o banco." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {regularAccounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                balance={accountBalance(a)}
                onEdit={() => setEditing(a)}
                onDelete={() => setToDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[18px] font-bold mb-3">Tarjetas de crédito</h2>
        {creditCards.length === 0 ? (
          <EmptyState icon="💳" title="No tienes tarjetas registradas" message="Agrégalas para llevar el control de tu cupo y fechas de pago." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creditCards.map((a) => (
              <CreditCardCard
                key={a.id}
                account={a}
                balance={accountBalance(a)}
                onEdit={() => setEditing(a)}
                onDelete={() => setToDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[18px] font-bold mb-3">Historial de cambios de moneda</h2>
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
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] shrink-0 bg-[var(--color-muted)]">
        {TYPE_LABELS[account.tipo].icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[16px] truncate">{account.nombre}</div>
        <div className="text-[13px] text-[var(--color-text-secondary)]">{TYPE_LABELS[account.tipo].label} · {account.moneda}</div>
        <div className="text-[17px] font-bold mt-1">{formatAmount(balance, account.moneda)}</div>
      </div>
      <button onClick={onEdit} aria-label="Editar cuenta" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[17px]">✏️</button>
      <button onClick={onDelete} aria-label="Eliminar cuenta" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-[17px]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
    </Card>
  )
}

function CreditCardCard({ account, balance, onEdit, onDelete }: { account: Account; balance: number; onEdit: () => void; onDelete: () => void }) {
  const cupo = account.cupo ?? 0
  const disponible = cupo - balance
  const pct = cupo > 0 ? Math.min(100, (balance / cupo) * 100) : 0

  const proximoPago = useMemo(() => {
    if (!account.fechaPago) return null
    const today = new Date()
    let d = new Date(today.getFullYear(), today.getMonth(), account.fechaPago)
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, account.fechaPago)
    return d.toISOString().slice(0, 10)
  }, [account.fechaPago])

  const dias = proximoPago ? daysUntil(proximoPago) : null
  const showAlert = dias !== null && dias <= (account.diasAvisoPago ?? 5)

  return (
    <Card padding="md">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] shrink-0 bg-[var(--color-muted)]">💳</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[16px] truncate">{account.nombre}</div>
          <div className="text-[13px] text-[var(--color-text-secondary)]">{account.moneda}</div>
        </div>
        <button onClick={onEdit} aria-label="Editar tarjeta" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[16px]">✏️</button>
        <button onClick={onDelete} aria-label="Eliminar tarjeta" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-[16px]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
      </div>

      <div className="h-2.5 bg-[var(--color-muted)] rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? 'var(--color-expense)' : 'var(--color-accent)' }} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[14px] mb-2">
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
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Pago: día {account.fechaPago} de cada mes {account.fechaCorte ? `· Corte: día ${account.fechaCorte}` : ''}
        </p>
      )}
      {showAlert && (
        <p className="mt-2 text-[14px] font-semibold" style={{ color: dias! < 0 ? 'var(--color-expense)' : '#FF9500' }}>
          {dias! < 0 ? '⚠️ Se venció el pago' : `⏰ Vence en ${dias} día(s)`}
        </p>
      )}
    </Card>
  )
}

function AccountFormModal({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean
  account?: Account
  onClose: () => void
  onSave: (data: Omit<Account, 'id'>) => void
}) {
  const [nombre, setNombre] = useState(account?.nombre ?? '')
  const [moneda, setMoneda] = useState<Currency>(account?.moneda ?? 'COP')
  const [tipo, setTipo] = useState<AccountType>(account?.tipo ?? 'efectivo')
  const [cupo, setCupo] = useState(account?.cupo ?? 0)
  const [fechaCorte, setFechaCorte] = useState(account?.fechaCorte ?? 1)
  const [fechaPago, setFechaPago] = useState(account?.fechaPago ?? 15)
  const [diasAviso, setDiasAviso] = useState(account?.diasAvisoPago ?? 5)

  return (
    <Modal open={open} onClose={onClose} title={account ? 'Editar cuenta' : 'Nueva cuenta'}>
      <Field label="Nombre">
        <TextInput value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Efectivo EUR, Cuenta Nequi" autoFocus />
      </Field>
      <Field label="Moneda">
        <SelectInput value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Tipo de cuenta">
        <SelectInput value={tipo} onChange={(e) => setTipo(e.target.value as AccountType)}>
          <option value="efectivo">💵 Efectivo</option>
          <option value="banco">🏦 Cuenta bancaria</option>
          <option value="tarjeta_credito">💳 Tarjeta de crédito</option>
        </SelectInput>
      </Field>

      {tipo === 'tarjeta_credito' && (
        <>
          <Field label="Cupo (límite de crédito)">
            <TextInput type="number" min={0} value={cupo} onChange={(e) => setCupo(Number(e.target.value))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de corte">
              <TextInput type="number" min={1} max={31} value={fechaCorte} onChange={(e) => setFechaCorte(Number(e.target.value))} />
            </Field>
            <Field label="Día de pago">
              <TextInput type="number" min={1} max={31} value={fechaPago} onChange={(e) => setFechaPago(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Avisar con cuántos días de anticipación" hint="Antes de la fecha de pago">
            <TextInput type="number" min={0} max={30} value={diasAviso} onChange={(e) => setDiasAviso(Number(e.target.value))} />
          </Field>
        </>
      )}

      <Button
        className="w-full"
        size="lg"
        disabled={!nombre.trim()}
        onClick={() =>
          onSave({
            nombre: nombre.trim(),
            moneda,
            tipo,
            activa: true,
            ...(tipo === 'tarjeta_credito' ? { cupo, fechaCorte, fechaPago, diasAvisoPago: diasAviso } : {}),
          })
        }
      >
        Guardar cuenta
      </Button>
    </Modal>
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
