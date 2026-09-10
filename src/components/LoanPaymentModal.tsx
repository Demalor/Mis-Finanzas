import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Modal } from './Modal'
import { Button } from './Button'
import { Field, TextInput, SelectInput, AmountInput } from './FormControls'
import type { Loan } from '../types/models'
import { formatAmount } from '../utils/currency'
import { loanTotals, suggestedInterest } from '../utils/loanMath'
import { todayISO } from '../utils/date'

// Registrar un pago real. El reparto capital/interés lo decide la persona:
// se sugiere el interés del saldo pero se puede dejar en cero (abono puro) o
// poner todo en interés (el mes en que solo se alcanzó a pagar eso).
export function LoanPaymentModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const { accounts, categories, registerLoanPayment } = useData()
  const { saldo } = loanTotals(loan)

  const [date, setDate] = useState(todayISO())
  const [interest, setInterest] = useState(() => Math.round(suggestedInterest(loan) * 100) / 100)
  const [capital, setCapital] = useState(0)
  const [accountId, setAccountId] = useState('')
  const [sourceAmount, setSourceAmount] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const total = capital + interest
  const account = accounts.find((a) => a.id === accountId)
  const otraMoneda = !!account && account.moneda !== loan.currency
  // Al cobrar un préstamo entra plata; al pagar una deuda, sale.
  const movementType = loan.direction === 'debo' ? 'gasto' : 'ingreso'
  const usableCategories = categories.filter((c) => c.type === movementType)
  const effectiveCategoryId = categoryId || usableCategories[0]?.id || ''

  const puedeGuardar = total > 0 && (!accountId || !otraMoneda || sourceAmount > 0)

  return (
    <Modal open onClose={onClose} title={loan.direction === 'debo' ? `Pagar a ${loan.counterpartyName}` : `Cobro de ${loan.counterpartyName}`}>
      <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-4">
        Saldo pendiente: <strong>{formatAmount(saldo, loan.currency)}</strong>
        {loan.hasInterest && ` · interés sugerido del mes: ${formatAmount(suggestedInterest(loan), loan.currency)}`}
      </p>

      <Field label="Fecha">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Abono a capital" hint="Lo que realmente baja la deuda. Déjalo en 0 si este mes solo pagas intereses.">
        <AmountInput value={capital} onChange={setCapital} currency={loan.currency} />
      </Field>

      {loan.hasInterest && (
        <Field label="Intereses">
          <AmountInput value={interest} onChange={setInterest} currency={loan.currency} />
        </Field>
      )}

      <div className="flex items-center justify-between gap-2 mb-[var(--sp-5)] px-1">
        <span className="text-[var(--fs-base)] font-semibold">Total del pago</span>
        <span className="amount text-[var(--fs-lg)] font-bold">{formatAmount(total, loan.currency)}</span>
      </div>

      <Field
        label="¿De dónde sale la plata?"
        hint="Si eliges una cuenta se crea el movimiento. Déjalo sin cuenta si fue en efectivo o si lo pagó alguien más directamente."
      >
        <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Sin registrar en cuentas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} ({a.moneda})
            </option>
          ))}
        </SelectInput>
      </Field>

      {otraMoneda && account && (
        <Field
          label={`¿Cuánto salió en ${account.moneda}?`}
          hint={`El préstamo está en ${loan.currency} y la cuenta en ${account.moneda}. El movimiento se registra por lo que salió de la cuenta.`}
        >
          <AmountInput value={sourceAmount} onChange={setSourceAmount} currency={account.moneda} />
        </Field>
      )}

      {accountId && usableCategories.length > 0 && (
        <Field label="Categoría del movimiento">
          <SelectInput value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {usableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      <Field label="Nota (opcional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. envío por Western Union" />
      </Field>

      <Button
        className="w-full"
        size="lg"
        disabled={!puedeGuardar || saving}
        onClick={async () => {
          setSaving(true)
          try {
            await registerLoanPayment(loan.id, {
              date,
              amount: total,
              capital,
              interest,
              accountId: accountId || undefined,
              sourceAmount: accountId ? (otraMoneda ? sourceAmount : total) : undefined,
              sourceCurrency: account?.moneda,
              categoryId: accountId ? effectiveCategoryId : undefined,
              note: note.trim() || undefined,
            })
            onClose()
          } finally {
            setSaving(false)
          }
        }}
      >
        {saving ? 'Guardando…' : 'Registrar pago'}
      </Button>
    </Modal>
  )
}
