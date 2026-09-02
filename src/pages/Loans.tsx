import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Field, TextInput, SelectInput } from '../components/FormControls'
import type { Loan, LoanDirection, InterestRateType, Currency } from '../types/models'
import { CURRENCIES } from '../types/models'
import { formatAmount } from '../utils/currency'
import { summarizeLoan, daysUntil } from '../utils/loanMath'
import { todayISO } from '../utils/date'

export function Loans() {
  const { loans, addLoan, updateLoan, deleteLoan } = useData()
  const [tab, setTab] = useState<LoanDirection>('debo')
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<Loan | null>(null)
  const [toDelete, setToDelete] = useState<Loan | null>(null)

  const list = loans.filter((l) => l.direction === tab && l.active)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">Préstamos</h1>
          <p className="text-[var(--color-text-secondary)] text-[15px]">Lo que debes y lo que te deben</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo</Button>
      </div>

      <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 w-fit gap-1">
        <button
          onClick={() => setTab('debo')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'debo' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          Yo debo
        </button>
        <button
          onClick={() => setTab('me_deben')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'me_deben' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          Me deben
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="🤝"
          title={tab === 'debo' ? 'No tienes préstamos pendientes' : 'No has prestado dinero a nadie'}
          action={<Button onClick={() => setCreating(true)}>Crear préstamo</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((loan) => (
            <LoanCard key={loan.id} loan={loan} onOpen={() => setDetail(loan)} onDelete={() => setToDelete(loan)} />
          ))}
        </div>
      )}

      <LoanFormModal open={creating} defaultDirection={tab} onClose={() => setCreating(false)} onSave={async (data) => { await addLoan(data); setCreating(false) }} />

      {detail && (
        <LoanDetailModal
          loan={detail}
          onClose={() => setDetail(null)}
          onUpdateRate={async (rate) => {
            const history = [...(detail.rateHistory ?? []), { date: todayISO(), rate }]
            await updateLoan(detail.id, { rateHistory: history })
            setDetail({ ...detail, rateHistory: history })
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar préstamo"
        message="Esto elimina el registro del préstamo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) await deleteLoan(toDelete.id); setToDelete(null) }}
      />
    </div>
  )
}

function LoanCard({ loan, onOpen, onDelete }: { loan: Loan; onOpen: () => void; onDelete: () => void }) {
  const summary = summarizeLoan(loan)
  const dias = summary.nextPaymentDate ? daysUntil(summary.nextPaymentDate) : null
  const showAlert = dias !== null && dias <= loan.diasAvisoPago

  return (
    <Card padding="md">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-[16px] truncate min-w-0">{loan.counterpartyName}</span>
          <span className="text-[13px] text-[var(--color-text-secondary)] shrink-0">
            {summary.installmentsPaid}/{loan.installmentCount} cuotas
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[14px] mb-2">
          <div>
            <div className="text-[var(--color-text-secondary)]">{loan.direction === 'debo' ? 'Me falta pagar' : 'Me falta cobrar'}</div>
            <div className="font-semibold">{formatAmount(summary.remainingCapital, loan.currency)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">Cuota</div>
            <div className="font-semibold">{formatAmount(summary.installmentAmount, loan.currency)}</div>
          </div>
        </div>
        {showAlert && (
          <p className="text-[13px] font-semibold" style={{ color: dias! < 0 ? 'var(--color-expense)' : '#FF9500' }}>
            {dias! < 0 ? '⚠️ Cuota vencida' : `⏰ Próxima cuota en ${dias} día(s)`}
          </p>
        )}
      </button>
      <button onClick={onDelete} className="text-[13px] font-semibold mt-2" style={{ color: 'var(--color-expense)' }}>
        Eliminar
      </button>
    </Card>
  )
}

function LoanDetailModal({ loan, onClose, onUpdateRate }: { loan: Loan; onClose: () => void; onUpdateRate: (rate: number) => void }) {
  const summary = summarizeLoan(loan)
  const [newRate, setNewRate] = useState(loan.interestRate ?? 0)

  return (
    <Modal open onClose={onClose} title={loan.counterpartyName}>
      <div className="grid grid-cols-2 gap-3 mb-5 text-[15px]">
        <Info label="Monto total" value={formatAmount(loan.totalAmount, loan.currency)} />
        <Info label="Cuota" value={formatAmount(summary.installmentAmount, loan.currency)} />
        <Info label="Cuotas pagadas" value={`${summary.installmentsPaid} / ${loan.installmentCount}`} />
        <Info label={loan.direction === 'debo' ? 'Pendiente por pagar' : 'Pendiente por cobrar'} value={formatAmount(summary.remainingCapital, loan.currency)} />
        {loan.hasInterest && (
          <>
            <Info label="Capital abonado" value={formatAmount(summary.totalPaidCapital, loan.currency)} />
            <Info label={loan.direction === 'debo' ? 'Interés pagado' : 'Interés ganado'} value={formatAmount(summary.totalPaidInterest, loan.currency)} />
          </>
        )}
      </div>

      {loan.hasInterest && loan.interestRateType === 'variable' && (
        <div className="border-t border-[var(--color-border)] pt-4">
          <Field label="Actualizar tasa (afecta solo cuotas futuras)" hint={`Tasa actual: ${loan.interestRate}% mensual`}>
            <div className="flex gap-2">
              <TextInput type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} className="flex-1" />
              <Button onClick={() => onUpdateRate(newRate)}>Actualizar</Button>
            </div>
          </Field>
        </div>
      )}

      {loan.counterpartyContact && (
        <p className="text-[14px] text-[var(--color-text-secondary)]">Contacto: {loan.counterpartyContact}</p>
      )}
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--color-text-secondary)] text-[13px]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function LoanFormModal({
  open,
  defaultDirection,
  onClose,
  onSave,
}: {
  open: boolean
  defaultDirection: LoanDirection
  onClose: () => void
  onSave: (data: Omit<Loan, 'id'>) => void
}) {
  const [direction, setDirection] = useState<LoanDirection>(defaultDirection)
  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyContact, setCounterpartyContact] = useState('')
  const [currency, setCurrency] = useState<Currency>('COP')
  const [totalAmount, setTotalAmount] = useState(0)
  const [installmentCount, setInstallmentCount] = useState(12)
  const [startDate, setStartDate] = useState(todayISO())
  const [hasInterest, setHasInterest] = useState(false)
  const [interestRateType, setInterestRateType] = useState<InterestRateType>('fija')
  const [interestRate, setInterestRate] = useState(1.5)
  const [diasAvisoPago, setDiasAvisoPago] = useState(5)

  return (
    <Modal open={open} onClose={onClose} title="Nuevo préstamo">
      <Field label="¿Yo debo o me deben?">
        <div className="flex bg-[var(--color-muted)] rounded-[14px] p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setDirection('debo')}
            className={`flex-1 py-2.5 rounded-[10px] text-[15px] font-semibold ${direction === 'debo' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
          >
            Yo debo
          </button>
          <button
            type="button"
            onClick={() => setDirection('me_deben')}
            className={`flex-1 py-2.5 rounded-[10px] text-[15px] font-semibold ${direction === 'me_deben' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
          >
            Me deben
          </button>
        </div>
      </Field>

      <Field label={direction === 'debo' ? 'Entidad o persona a quien le debo' : 'A quién le presté'}>
        <TextInput value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} placeholder="Ej. Banco X, Mamá, Juan Pérez" autoFocus />
      </Field>
      <Field label="Contacto (opcional)">
        <TextInput value={counterpartyContact} onChange={(e) => setCounterpartyContact(e.target.value)} placeholder="Teléfono o cómo ubicarlo" />
      </Field>
      <Field label="Moneda">
        <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Monto total">
        <TextInput type="number" min={0} value={totalAmount || ''} onChange={(e) => setTotalAmount(Number(e.target.value))} />
      </Field>
      <Field label="Número de cuotas">
        <TextInput type="number" min={1} value={installmentCount} onChange={(e) => setInstallmentCount(Number(e.target.value))} />
      </Field>
      <Field label="Fecha de inicio">
        <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>

      <Field label="¿Calcular interés vs. abono a capital?">
        <button
          type="button"
          onClick={() => setHasInterest((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[14px] border border-[var(--color-border)]"
        >
          <span className="text-[15px] font-medium">{hasInterest ? 'Sí, con interés' : 'No, préstamo sin interés'}</span>
          <span className="text-[20px]">{hasInterest ? '✅' : '⬜️'}</span>
        </button>
      </Field>

      {hasInterest && (
        <>
          <Field label="Tipo de tasa">
            <SelectInput value={interestRateType} onChange={(e) => setInterestRateType(e.target.value as InterestRateType)}>
              <option value="fija">Fija</option>
              <option value="variable">Variable (editable después)</option>
            </SelectInput>
          </Field>
          <Field label="Tasa de interés mensual (%)">
            <TextInput type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} />
          </Field>
        </>
      )}

      <Field label="Avisar con cuántos días de anticipación">
        <TextInput type="number" min={0} max={30} value={diasAvisoPago} onChange={(e) => setDiasAvisoPago(Number(e.target.value))} />
      </Field>

      <Button
        className="w-full"
        size="lg"
        disabled={!counterpartyName.trim() || totalAmount <= 0 || installmentCount <= 0}
        onClick={() =>
          onSave({
            direction,
            counterpartyName: counterpartyName.trim(),
            counterpartyContact: counterpartyContact.trim() || undefined,
            currency,
            totalAmount,
            installmentCount,
            startDate,
            hasInterest,
            interestRateType: hasInterest ? interestRateType : undefined,
            interestRate: hasInterest ? interestRate : undefined,
            rateHistory: [],
            diasAvisoPago,
            payments: [],
            active: true,
          })
        }
      >
        Guardar préstamo
      </Button>
    </Modal>
  )
}
