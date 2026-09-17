import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useData } from '../context/useData'
import { loanStatus, loanTotals, suggestedInterest } from '../utils/loanMath'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput, SelectInput, TypeToggle, AmountInput } from '../components/FormControls'
import { formatAmount } from '../utils/currency'
import type { MovementType } from '../types/models'
import { todayISO } from '../utils/date'

export function AddMovement() {
  const { categories, movements, accounts, incomeSources, loans, projects, addMovement, updateMovement, registerLoanPayment, addProjectEntry } = useData()
  const navigate = useNavigate()
  const { id } = useParams()
  const editing = useMemo(() => movements.find((m) => m.id === id), [movements, id])

  const [type, setType] = useState<MovementType>(editing?.type ?? 'gasto')
  const [amount, setAmount] = useState<number>(editing?.amount ?? 0)
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ?? '')
  const [accountId, setAccountId] = useState<string>(editing?.accountId ?? '')
  const [sourceId, setSourceId] = useState<string>(editing?.sourceId ?? '')
  const [date, setDate] = useState<string>(editing?.date ?? todayISO())
  const [description, setDescription] = useState<string>(editing?.description ?? '')
  const [esPagoPrestamo, setEsPagoPrestamo] = useState(false)
  const [loanId, setLoanId] = useState('')
  const [loanCapital, setLoanCapital] = useState(0)
  const [loanInterest, setLoanInterest] = useState(0)
  const [projectId, setProjectId] = useState('')
  const [projectAmount, setProjectAmount] = useState(0)
  const [projectDescription, setProjectDescription] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const usableAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito' || type === 'gasto')
  const filteredCategories = categories.filter((c) => c.type === type)
  const effectiveCategoryId = categoryId && filteredCategories.some((c) => c.id === categoryId) ? categoryId : filteredCategories[0]?.id ?? ''
  const effectiveAccountId = accountId && usableAccounts.some((a) => a.id === accountId) ? accountId : usableAccounts[0]?.id ?? ''

  // Préstamos en curso que encajan con el tipo elegido: pagar una deuda es un
  // gasto; recibir el abono de alguien que me debe es un ingreso.
  const payableLoans = loans.filter(
    (l) => loanStatus(l) === 'activa' && (type === 'gasto' ? l.direction === 'debo' : l.direction === 'me_deben')
  )
  const effectiveLoanId = loanId && payableLoans.some((l) => l.id === loanId) ? loanId : payableLoans[0]?.id ?? ''
  const selectedLoan = payableLoans.find((l) => l.id === effectiveLoanId)
  const modoPrestamo = esPagoPrestamo && !!selectedLoan

  const activeProjects = projects.filter((p) => p.active)
  const cuentaMonedaActual = accounts.find((a) => a.id === effectiveAccountId)?.moneda ?? 'COP'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError('')
    if (amount <= 0) {
      setError('Ingresa un valor mayor a cero.')
      return
    }
    if (modoPrestamo && loanCapital + loanInterest <= 0) {
      setError('Indica cuánto va a capital y cuánto a intereses.')
      return
    }
    if (!effectiveCategoryId) {
      setError('Selecciona una categoría.')
      return
    }
    const payload = {
      type,
      amount,
      categoryId: effectiveCategoryId,
      date,
      description,
      accountId: effectiveAccountId || undefined,
      sourceId: type === 'ingreso' && sourceId ? sourceId : undefined,
    }
    setSubmitting(true)
    try {
      if (modoPrestamo && selectedLoan && !editing) {
        // El pago crea su propio movimiento dentro de registerLoanPayment.
        const cuentaMoneda = accounts.find((a) => a.id === effectiveAccountId)?.moneda
        await registerLoanPayment(selectedLoan.id, {
          date,
          amount: loanCapital + loanInterest,
          capital: loanCapital,
          interest: loanInterest,
          accountId: effectiveAccountId || undefined,
          sourceAmount: effectiveAccountId ? amount : undefined,
          sourceCurrency: cuentaMoneda,
          categoryId: effectiveCategoryId,
          note: description.trim() || undefined,
        })
      } else if (editing) {
        await updateMovement(editing.id, payload)
      } else {
        const movement = await addMovement(payload)
        // El proyecto se lleva solo la parte que le toca del gasto real.
        if (projectId && projectAmount > 0) {
          await addProjectEntry({
            projectId,
            type,
            amount: projectAmount,
            currency: cuentaMonedaActual,
            description: projectDescription.trim() || description.trim() || 'Sin descripción',
            date,
            linkedMovementId: movement.id,
          })
        }
      }
    } catch {
      setError('No se pudo guardar el movimiento. Revisa tu conexión e inténtalo de nuevo.')
      setSubmitting(false)
      return
    }
    setSaved(true)
    setTimeout(() => navigate('/movimientos'), 700)
  }

  return (
    <div className="page max-w-lg mx-auto">
      <div>
        <h1 className="t-h1">{editing ? 'Editar movimiento' : 'Agregar movimiento'}</h1>
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mt-1">
          {type === 'gasto' ? 'Registra un gasto nuevo' : 'Registra un ingreso nuevo'}
        </p>
      </div>

      <Card padding="lg">
        <form onSubmit={handleSubmit}>
          <Field label="Tipo de movimiento">
            <TypeToggle value={type} onChange={setType} />
          </Field>

          {usableAccounts.length > 0 ? (
            <Field label="Cuenta">
              <SelectInput value={effectiveAccountId} onChange={(e) => setAccountId(e.target.value)}>
                {usableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda})
                  </option>
                ))}
              </SelectInput>
            </Field>
          ) : (
            <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-5">
              No tienes cuentas creadas.{' '}
              <Link to="/cuentas" className="font-semibold" style={{ color: 'var(--color-accent-ink)' }}>
                Crea una aquí
              </Link>
              .
            </p>
          )}

          <Field label="Valor">
            <AmountInput value={amount} onChange={setAmount} currency={accounts.find((a) => a.id === effectiveAccountId)?.moneda ?? 'COP'} />
          </Field>

          <Field label="Categoría">
            <SelectInput value={effectiveCategoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          {!editing && payableLoans.length > 0 && (
            <Field label={type === 'gasto' ? '¿Es el pago de una deuda?' : '¿Es el cobro de un préstamo?'}>
              <button
                type="button"
                onClick={() => {
                  const next = !esPagoPrestamo
                  setEsPagoPrestamo(next)
                  // Al activarlo se propone el reparto: intereses del mes y el
                  // resto a capital, pero ambos quedan editables.
                  if (next && selectedLoan) {
                    const interes = Math.min(amount, Math.round(suggestedInterest(selectedLoan) * 100) / 100)
                    setLoanInterest(interes)
                    setLoanCapital(Math.max(0, amount - interes))
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)]"
              >
                <span className="text-[var(--fs-base)] font-medium">{esPagoPrestamo ? 'Sí, descontarlo del préstamo' : 'No, movimiento normal'}</span>
                <span className="text-[var(--fs-lg)]">{esPagoPrestamo ? '✅' : '⬜️'}</span>
              </button>
            </Field>
          )}

          {esPagoPrestamo && payableLoans.length > 0 && (
            <>
              <Field label={type === 'gasto' ? 'Deuda a la que abono' : 'Préstamo que me pagan'}>
                <SelectInput
                  value={effectiveLoanId}
                  onChange={(e) => {
                    setLoanId(e.target.value)
                    const l = payableLoans.find((x) => x.id === e.target.value)
                    if (l) {
                      const interes = Math.min(amount, Math.round(suggestedInterest(l) * 100) / 100)
                      setLoanInterest(interes)
                      setLoanCapital(Math.max(0, amount - interes))
                    }
                  }}
                >
                  {payableLoans.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.counterpartyName} — falta {formatAmount(loanTotals(l).saldo, l.currency)}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {selectedLoan && (
                <>
                  <Field label={`Abono a capital (${selectedLoan.currency})`} hint="Déjalo en 0 si este pago es solo de intereses.">
                    <AmountInput value={loanCapital} onChange={setLoanCapital} currency={selectedLoan.currency} />
                  </Field>
                  {selectedLoan.hasInterest && (
                    <Field label={`Intereses (${selectedLoan.currency})`}>
                      <AmountInput value={loanInterest} onChange={setLoanInterest} currency={selectedLoan.currency} />
                    </Field>
                  )}
                  <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-[var(--sp-5)]">
                    Se descontarán {formatAmount(loanCapital + loanInterest, selectedLoan.currency)} del préstamo. Quedaría pendiente{' '}
                    <strong>{formatAmount(Math.max(0, loanTotals(selectedLoan).saldo - loanCapital), selectedLoan.currency)}</strong>.
                  </p>
                </>
              )}
            </>
          )}

          {type === 'ingreso' && (
            <Field label="Fuente del ingreso (opcional)">
              <SelectInput value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Sin especificar</option>
                {incomeSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </SelectInput>
            </Field>
          )}

          <Field label="Fecha">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </Field>

          <Field label="Descripción (opcional)" hint="Por ejemplo: mercado del mes, factura de luz…">
            <TextInput
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escribe una descripción"
            />
          </Field>

          {!editing && !modoPrestamo && activeProjects.length > 0 && (
            <>
              <Field
                label="¿Parte de esto es de un proyecto?"
                hint="El movimiento se registra completo en la cuenta; el proyecto solo se lleva la parte que le corresponde."
              >
                <SelectInput
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value)
                    if (e.target.value && projectAmount === 0) setProjectAmount(amount)
                  }}
                >
                  <option value="">No, movimiento normal</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon ?? '📦'} {p.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              {projectId && (
                <>
                  <Field label="¿Cuánto va al proyecto?">
                    <AmountInput value={projectAmount} onChange={setProjectAmount} currency={cuentaMonedaActual} />
                  </Field>
                  <Field label="Descripción para el proyecto">
                    <TextInput
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Ej. arroz, arvejas"
                    />
                  </Field>
                </>
              )}
            </>
          )}

          {error && (
            <p className="text-[var(--fs-base)] mb-4 font-medium" style={{ color: 'var(--color-expense)' }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || saved}
            style={submitting ? { backgroundColor: 'var(--color-muted)', color: 'var(--color-text-secondary)' } : undefined}
          >
            {submitting
              ? editing
                ? 'Guardando cambios…'
                : 'Movimiento en proceso…'
              : saved
                ? '✓ Guardado'
                : editing
                  ? 'Guardar cambios'
                  : 'Agregar movimiento'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
