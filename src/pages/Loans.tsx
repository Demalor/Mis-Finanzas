import { useState } from 'react'
import { useData } from '../context/useData'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Field, TextInput, SelectInput, AmountInput } from '../components/FormControls'
import { LoanPaymentModal } from '../components/LoanPaymentModal'
import type { Loan, LoanDirection, InterestRateType, Currency } from '../types/models'
import { CURRENCIES } from '../types/models'
import { formatAmount } from '../utils/currency'
import { buildAmortizationSchedule, loanStatus, loanTotals, nextInstallmentDate, daysUntil } from '../utils/loanMath'
import { todayISO, formatDateReadable } from '../utils/date'

type Vista = 'activos' | 'terminados'

export function Loans() {
  const { loans, addLoan, updateLoan, deleteLoan } = useData()
  const [tab, setTab] = useState<LoanDirection>('debo')
  const [vista, setVista] = useState<Vista>('activos')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [detail, setDetail] = useState<Loan | null>(null)
  const [paying, setPaying] = useState<Loan | null>(null)
  const [toDelete, setToDelete] = useState<Loan | null>(null)

  // El detalle se lee siempre del estado vivo: al registrar un pago debe
  // reflejarse de inmediato sin cerrar y volver a abrir el modal.
  const detailLoan = detail ? loans.find((l) => l.id === detail.id) ?? null : null

  const list = loans.filter((l) => {
    if (l.direction !== tab) return false
    const estado = loanStatus(l)
    return vista === 'terminados' ? estado === 'terminada' : estado !== 'terminada'
  })

  return (
    <div className="page">
      <PageHeader
        title="Préstamos"
        subtitle="Lo que debes y lo que te deben"
        action={<Button onClick={() => setCreating(true)} className="shrink-0">+ Nuevo</Button>}
      />

      <Segmented
        aria-label="Dirección del préstamo"
        options={[
          { value: 'debo', label: 'Yo debo' },
          { value: 'me_deben', label: 'Me deben' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Segmented
        aria-label="Estado"
        options={[
          { value: 'activos', label: 'En curso' },
          { value: 'terminados', label: '✅ Terminados' },
        ]}
        value={vista}
        onChange={setVista}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={vista === 'terminados' ? '✅' : '🤝'}
          title={
            vista === 'terminados'
              ? 'Todavía no has terminado de pagar ninguno'
              : tab === 'debo'
                ? 'No tienes deudas pendientes'
                : 'No has prestado dinero a nadie'
          }
          action={vista === 'activos' ? <Button onClick={() => setCreating(true)}>Crear préstamo</Button> : undefined}
        />
      ) : (
        <div className="card-grid">
          {list.map((loan) =>
            vista === 'terminados' ? (
              <FinishedLoanCard key={loan.id} loan={loan} onOpen={() => setDetail(loan)} />
            ) : (
              <LoanCard key={loan.id} loan={loan} onOpen={() => setDetail(loan)} onPay={() => setPaying(loan)} />
            )
          )}
        </div>
      )}

      {vista === 'terminados' && list.length > 0 && tab === 'me_deben' && (
        <Card padding="md">
          <h2 className="t-h3 mb-[var(--sp-2)]">Total ganado en intereses</h2>
          <div className="flex flex-wrap gap-x-[var(--sp-5)] gap-y-1">
            {CURRENCIES.filter((c) => list.some((l) => l.currency === c.code)).map((c) => {
              const ganado = list
                .filter((l) => l.currency === c.code)
                .reduce((s, l) => s + loanTotals(l).interesPagado, 0)
              return (
                <span key={c.code} className="amount font-bold text-[var(--fs-lg)]" style={{ color: 'var(--color-income)' }}>
                  {formatAmount(ganado, c.code)}
                </span>
              )
            })}
          </div>
        </Card>
      )}

      <LoanFormModal
        open={creating}
        defaultDirection={tab}
        onClose={() => setCreating(false)}
        onSave={async (data) => {
          await addLoan(data)
          setCreating(false)
        }}
      />

      <LoanFormModal
        open={!!editing}
        loan={editing ?? undefined}
        defaultDirection={tab}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          if (editing) await updateLoan(editing.id, data)
          setEditing(null)
        }}
      />

      {detailLoan && (
        <LoanDetailModal
          loan={detailLoan}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detailLoan)
            setDetail(null)
          }}
          onPay={() => {
            setPaying(detailLoan)
            setDetail(null)
          }}
          onDelete={() => {
            setToDelete(detailLoan)
            setDetail(null)
          }}
          onUpdateRate={async (rate) => {
            const history = [...(detailLoan.rateHistory ?? []), { date: todayISO(), rate }]
            await updateLoan(detailLoan.id, { rateHistory: history, interestRate: rate })
          }}
          onSetEstado={async (estado) => {
            await updateLoan(detailLoan.id, { estado })
          }}
        />
      )}

      {paying && <LoanPaymentModal loan={paying} onClose={() => setPaying(null)} />}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar préstamo"
        message="Esto elimina el registro del préstamo y su historial de pagos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteLoan(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function LoanCard({ loan, onOpen, onPay }: { loan: Loan; onOpen: () => void; onPay: () => void }) {
  const { saldo, capitalPagado } = loanTotals(loan)
  const estado = loanStatus(loan)
  const pct = loan.totalAmount > 0 ? Math.min(100, (capitalPagado / loan.totalAmount) * 100) : 0

  const proxima = estado === 'activa' ? nextInstallmentDate(loan) : null
  const dias = proxima ? daysUntil(proxima) : null
  const showAlert = dias !== null && dias <= loan.diasAvisoPago

  return (
    <Card padding="md">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-[var(--fs-md)] truncate min-w-0">{loan.counterpartyName}</span>
          {estado === 'pausada' ? (
            <span
              className="text-[var(--fs-2xs)] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'var(--color-muted)', color: 'var(--color-text-secondary)' }}
            >
              ⏸ En pausa
            </span>
          ) : (
            <span className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] shrink-0">
              {loan.payments?.length ?? 0} pago(s)
            </span>
          )}
        </div>

        <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
          {loan.direction === 'debo' ? 'Me falta pagar' : 'Me falta cobrar'}
        </div>
        <div className="amount font-bold text-[var(--fs-lg)] mb-2">{formatAmount(saldo, loan.currency)}</div>

        <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--color-accent)' }} />
        </div>
        <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
          Abonado {formatAmount(capitalPagado, loan.currency)} de {formatAmount(loan.totalAmount, loan.currency)}
        </div>

        {showAlert && (
          <p className="text-[var(--fs-xs)] font-semibold mt-2" style={{ color: dias! < 0 ? 'var(--color-expense)' : 'var(--color-warn)' }}>
            {dias! < 0 ? '⚠️ Cuota vencida' : `⏰ Próxima cuota en ${dias} día(s)`}
          </p>
        )}
      </button>

      {estado === 'activa' && (
        <Button className="w-full mt-3" variant="secondary" onClick={onPay}>
          Registrar pago
        </Button>
      )}
    </Card>
  )
}

function FinishedLoanCard({ loan, onOpen }: { loan: Loan; onOpen: () => void }) {
  const { capitalPagado, interesPagado, pagosOrdenados } = loanTotals(loan)
  const ultimaFecha = pagosOrdenados[0]?.date

  return (
    <Card padding="md">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-[var(--fs-md)] truncate min-w-0">{loan.counterpartyName}</span>
          <span className="text-[var(--fs-2xs)] shrink-0">✅</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[var(--fs-sm)]">
          <Info label="Monto" value={formatAmount(loan.totalAmount, loan.currency)} />
          <Info label="Tasa" value={loan.hasInterest ? `${loan.interestRate ?? 0}% mensual` : 'Sin interés'} />
          <Info label="Capital recuperado" value={formatAmount(capitalPagado, loan.currency)} />
          <Info
            label={loan.direction === 'debo' ? 'Intereses pagados' : 'Intereses ganados'}
            value={formatAmount(interesPagado, loan.currency)}
          />
        </div>
        <p className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-2">
          {formatDateReadable(loan.startDate)} → {ultimaFecha ? formatDateReadable(ultimaFecha) : '—'}
        </p>
      </button>
    </Card>
  )
}

function LoanDetailModal({
  loan,
  onClose,
  onEdit,
  onPay,
  onDelete,
  onUpdateRate,
  onSetEstado,
}: {
  loan: Loan
  onClose: () => void
  onEdit: () => void
  onPay: () => void
  onDelete: () => void
  onUpdateRate: (rate: number) => void
  onSetEstado: (estado: 'activa' | 'pausada' | 'terminada') => void
}) {
  const { accounts, deleteLoanPayment } = useData()
  const { saldo, capitalPagado, interesPagado, totalPagado, pagosOrdenados } = loanTotals(loan)
  const estado = loanStatus(loan)
  const [newRate, setNewRate] = useState(loan.interestRate ?? 0)
  const [verPlan, setVerPlan] = useState(false)

  return (
    <Modal open onClose={onClose} title={loan.counterpartyName}>
      <div className="grid grid-cols-2 gap-3 mb-5 text-[var(--fs-base)]">
        <Info label="Monto total" value={formatAmount(loan.totalAmount, loan.currency)} />
        <Info label={loan.direction === 'debo' ? 'Pendiente por pagar' : 'Pendiente por cobrar'} value={formatAmount(saldo, loan.currency)} />
        <Info label="Capital abonado" value={formatAmount(capitalPagado, loan.currency)} />
        <Info label={loan.direction === 'debo' ? 'Intereses pagados' : 'Intereses ganados'} value={formatAmount(interesPagado, loan.currency)} />
        <Info label="Total movido" value={formatAmount(totalPagado, loan.currency)} />
        <Info label="Estado" value={estado === 'activa' ? 'En curso' : estado === 'pausada' ? '⏸ En pausa' : '✅ Terminado'} />
      </div>

      {estado !== 'terminada' && (
        <Button className="w-full mb-3" size="lg" onClick={onPay}>
          Registrar pago
        </Button>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <Button variant="secondary" onClick={onEdit}>✏️ Editar</Button>
        {estado === 'activa' && <Button variant="secondary" onClick={() => onSetEstado('pausada')}>⏸ Pausar</Button>}
        {estado === 'pausada' && <Button variant="secondary" onClick={() => onSetEstado('activa')}>▶️ Reanudar</Button>}
        {estado !== 'terminada' ? (
          <Button variant="secondary" onClick={() => onSetEstado('terminada')}>✅ Marcar terminado</Button>
        ) : (
          <Button variant="secondary" onClick={() => onSetEstado('activa')}>↩️ Reabrir</Button>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] pt-4 mb-4">
        <h3 className="t-h3 mb-[var(--sp-3)]">Pagos registrados</h3>
        {pagosOrdenados.length === 0 ? (
          <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">
            Todavía no hay pagos. El saldo baja solo cuando registras uno.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {pagosOrdenados.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--fs-base)]">{formatAmount(p.amount, loan.currency)}</div>
                  <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] truncate">
                    {formatDateReadable(p.date)} · capital {formatAmount(p.capital, loan.currency)} · interés{' '}
                    {formatAmount(p.interest, loan.currency)}
                  </div>
                  {p.accountId && (
                    <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">
                      {accounts.find((a) => a.id === p.accountId)?.nombre ?? 'Cuenta eliminada'}
                      {p.sourceAmount != null &&
                        p.sourceCurrency &&
                        p.sourceCurrency !== loan.currency &&
                        ` · salieron ${formatAmount(p.sourceAmount, p.sourceCurrency)}`}
                    </div>
                  )}
                  {p.note && <div className="text-[var(--fs-2xs)] text-[var(--color-text-secondary)] truncate">{p.note}</div>}
                </div>
                <button
                  onClick={() => deleteLoanPayment(loan.id, p.id)}
                  aria-label="Eliminar pago"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)]"
                  style={{ color: 'var(--color-expense)' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loan.hasInterest && loan.interestRateType === 'variable' && (
        <div className="border-t border-[var(--color-border)] pt-4">
          <Field label="Actualizar tasa (afecta los pagos futuros)" hint={`Tasa actual: ${loan.interestRate}% mensual`}>
            <div className="flex gap-2">
              <TextInput type="number" step="0.01" value={newRate} onChange={(e) => setNewRate(Number(e.target.value))} className="flex-1" />
              <Button onClick={() => onUpdateRate(newRate)}>Actualizar</Button>
            </div>
          </Field>
        </div>
      )}

      {!!loan.installmentCount && (
        <div className="border-t border-[var(--color-border)] pt-4">
          <button onClick={() => setVerPlan((v) => !v)} className="text-[var(--fs-sm)] font-semibold" style={{ color: 'var(--color-accent-ink)' }}>
            {verPlan ? 'Ocultar' : 'Ver'} plan de cuotas sugerido ({loan.installmentCount} cuotas)
          </button>
          {verPlan && (
            <div className="mt-3 flex flex-col gap-1 max-h-64 overflow-y-auto">
              <p className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mb-1">
                Solo es una guía: el saldo real sale de los pagos que registres.
              </p>
              {buildAmortizationSchedule(loan).map((cuota) => (
                <div key={cuota.number} className="flex justify-between gap-2 text-[var(--fs-xs)]">
                  <span className="text-[var(--color-text-secondary)]">
                    #{cuota.number} · {formatDateReadable(cuota.date)}
                  </span>
                  <span className="amount">
                    {formatAmount(cuota.payment, loan.currency)}{' '}
                    <span className="text-[var(--color-text-secondary)]">
                      (cap. {formatAmount(cuota.principal, loan.currency)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loan.counterpartyContact && (
        <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mt-4">Contacto: {loan.counterpartyContact}</p>
      )}

      <button onClick={onDelete} className="text-[var(--fs-sm)] font-semibold mt-4" style={{ color: 'var(--color-expense)' }}>
        Eliminar préstamo
      </button>
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[var(--color-text-secondary)] text-[var(--fs-xs)]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  )
}

function LoanFormModal({
  open,
  loan,
  defaultDirection,
  onClose,
  onSave,
}: {
  open: boolean
  loan?: Loan
  defaultDirection: LoanDirection
  onClose: () => void
  onSave: (data: Omit<Loan, 'id'>) => void
}) {
  const [direction, setDirection] = useState<LoanDirection>(loan?.direction ?? defaultDirection)
  const [counterpartyName, setCounterpartyName] = useState(loan?.counterpartyName ?? '')
  const [counterpartyContact, setCounterpartyContact] = useState(loan?.counterpartyContact ?? '')
  const [currency, setCurrency] = useState<Currency>(loan?.currency ?? 'COP')
  const [totalAmount, setTotalAmount] = useState(loan?.totalAmount ?? 0)
  const [tieneCuotas, setTieneCuotas] = useState(!!loan?.installmentCount)
  const [installmentCount, setInstallmentCount] = useState(loan?.installmentCount ?? 12)
  const [paymentDay, setPaymentDay] = useState(loan?.paymentDay ?? 0)
  const [startDate, setStartDate] = useState(loan?.startDate ?? todayISO())
  const [hasInterest, setHasInterest] = useState(loan?.hasInterest ?? false)
  const [interestRateType, setInterestRateType] = useState<InterestRateType>(loan?.interestRateType ?? 'fija')
  const [interestRate, setInterestRate] = useState(loan?.interestRate ?? 1.5)
  const [diasAvisoPago, setDiasAvisoPago] = useState(loan?.diasAvisoPago ?? 5)

  return (
    <Modal open={open} onClose={onClose} title={loan ? 'Editar préstamo' : 'Nuevo préstamo'}>
      {/* key: fuerza el remount al cambiar de préstamo editado (o a creación). */}
      <div key={loan?.id ?? 'new'}>
        <Field label="¿Yo debo o me deben?">
          <div className="flex bg-[var(--color-muted)] rounded-[var(--radius-md)] p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setDirection('debo')}
              className={`flex-1 py-2.5 rounded-[var(--radius-sm)] text-[var(--fs-base)] font-semibold ${direction === 'debo' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
            >
              Yo debo
            </button>
            <button
              type="button"
              onClick={() => setDirection('me_deben')}
              className={`flex-1 py-2.5 rounded-[var(--radius-sm)] text-[var(--fs-base)] font-semibold ${direction === 'me_deben' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
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
          <AmountInput value={totalAmount} onChange={setTotalAmount} currency={currency} />
        </Field>
        <Field label="Fecha de inicio">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>

        <Field label="¿Tiene cuotas pactadas?" hint="Si los pagos son irregulares, déjalo en no: el saldo sale de los pagos que registres.">
          <button
            type="button"
            onClick={() => setTieneCuotas((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)]"
          >
            <span className="text-[var(--fs-base)] font-medium">{tieneCuotas ? 'Sí, hay un plan de cuotas' : 'No, pagos libres'}</span>
            <span className="text-[var(--fs-lg)]">{tieneCuotas ? '✅' : '⬜️'}</span>
          </button>
        </Field>

        {tieneCuotas && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número de cuotas">
              <TextInput type="number" min={1} value={installmentCount} onChange={(e) => setInstallmentCount(Number(e.target.value))} />
            </Field>
            <Field label="Día de pago" hint="0 si no aplica">
              <TextInput type="number" min={0} max={31} value={paymentDay} onChange={(e) => setPaymentDay(Number(e.target.value))} />
            </Field>
          </div>
        )}

        <Field label="¿Cobra intereses?">
          <button
            type="button"
            onClick={() => setHasInterest((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)]"
          >
            <span className="text-[var(--fs-base)] font-medium">{hasInterest ? 'Sí, con interés' : 'No, préstamo sin interés'}</span>
            <span className="text-[var(--fs-lg)]">{hasInterest ? '✅' : '⬜️'}</span>
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
            <Field label="Tasa de interés mensual (%)" hint="Se usa para sugerir cuánto de cada pago es interés; siempre puedes cambiarlo.">
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
          disabled={!counterpartyName.trim() || totalAmount <= 0}
          onClick={() =>
            onSave({
              direction,
              counterpartyName: counterpartyName.trim(),
              counterpartyContact: counterpartyContact.trim() || undefined,
              currency,
              totalAmount,
              installmentCount: tieneCuotas ? installmentCount : 0,
              paymentDay: tieneCuotas && paymentDay > 0 ? paymentDay : 0,
              startDate,
              hasInterest,
              interestRateType: hasInterest ? interestRateType : undefined,
              interestRate: hasInterest ? interestRate : undefined,
              rateHistory: loan?.rateHistory ?? [],
              diasAvisoPago,
              payments: loan?.payments ?? [],
              estado: loan?.estado ?? 'activa',
              active: true,
            })
          }
        >
          {loan ? 'Guardar cambios' : 'Guardar préstamo'}
        </Button>
      </div>
    </Modal>
  )
}
