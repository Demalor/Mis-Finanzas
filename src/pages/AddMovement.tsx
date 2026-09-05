import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput, SelectInput, TypeToggle, AmountInput } from '../components/FormControls'
import type { MovementType } from '../types/models'
import { todayISO } from '../utils/date'

export function AddMovement() {
  const { categories, movements, accounts, incomeSources, addMovement, updateMovement } = useData()
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
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const usableAccounts = accounts.filter((a) => a.tipo !== 'tarjeta_credito' || type === 'gasto')
  const filteredCategories = categories.filter((c) => c.type === type)
  const effectiveCategoryId = categoryId && filteredCategories.some((c) => c.id === categoryId) ? categoryId : filteredCategories[0]?.id ?? ''
  const effectiveAccountId = accountId && usableAccounts.some((a) => a.id === accountId) ? accountId : usableAccounts[0]?.id ?? ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError('')
    if (amount <= 0) {
      setError('Ingresa un valor mayor a cero.')
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
      if (editing) {
        await updateMovement(editing.id, payload)
      } else {
        await addMovement(payload)
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

          <Field label="Valor">
            <AmountInput value={amount} onChange={setAmount} />
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
