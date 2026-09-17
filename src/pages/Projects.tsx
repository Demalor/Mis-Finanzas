import { useMemo, useState } from 'react'
import { useData } from '../context/useData'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Field, TextInput, SelectInput, TypeToggle, AmountInput } from '../components/FormControls'
import { CURRENCIES } from '../types/models'
import type { Currency, MovementType, Project, ProjectEntry } from '../types/models'
import { formatAmount } from '../utils/currency'
import { todayISO, formatDateReadable } from '../utils/date'

interface CurrencyTotals {
  currency: Currency
  income: number
  expense: number
  balance: number
}

// Un proyecto puede mezclar monedas (compras en CHF, vende en COP), así que el
// resultado nunca se suma: se muestra un balance por cada moneda usada.
function totalsByCurrency(entries: ProjectEntry[]): CurrencyTotals[] {
  const map = new Map<Currency, { income: number; expense: number }>()
  for (const e of entries) {
    const acc = map.get(e.currency) ?? { income: 0, expense: 0 }
    if (e.type === 'ingreso') acc.income += e.amount
    else acc.expense += e.amount
    map.set(e.currency, acc)
  }
  return CURRENCIES.filter((c) => map.has(c.code)).map((c) => {
    const { income, expense } = map.get(c.code)!
    return { currency: c.code, income, expense, balance: income - expense }
  })
}

export function Projects() {
  const { projects, projectEntries, addProject, deleteProject } = useData()
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Project | null>(null)

  const open = openId ? projects.find((p) => p.id === openId) ?? null : null
  const ordered = useMemo(() => [...projects].sort((a, b) => b.createdAt - a.createdAt), [projects])

  return (
    <div className="page">
      <PageHeader
        title="Proyectos"
        subtitle="Negocios e inversiones puntuales, con sus propias cuentas"
        action={<Button onClick={() => setCreating(true)} className="shrink-0">+ Nuevo</Button>}
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon="🍲"
          title="Todavía no tienes proyectos"
          message="Sirve para saber si algo fue rentable: la venta de tamales, un viaje que cobras aparte, una inversión."
          action={<Button onClick={() => setCreating(true)}>Crear proyecto</Button>}
        />
      ) : (
        <div className="card-grid">
          {ordered.map((project) => {
            const entries = projectEntries.filter((e) => e.projectId === project.id)
            const totals = totalsByCurrency(entries)
            return (
              <Card key={project.id} padding="md">
                <button onClick={() => setOpenId(project.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-[var(--fs-md)] truncate min-w-0">
                      {project.icon ?? '📦'} {project.name}
                    </span>
                    <span className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] shrink-0">
                      {entries.length} registro(s)
                    </span>
                  </div>

                  {totals.length === 0 ? (
                    <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">Sin gastos ni ventas todavía.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {totals.map((t) => (
                        <div key={t.currency}>
                          <div
                            className="amount font-bold text-[var(--fs-lg)]"
                            style={{ color: t.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
                          >
                            {formatAmount(t.balance, t.currency)}
                          </div>
                          <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
                            ↑ {formatAmount(t.income, t.currency)} · ↓ {formatAmount(t.expense, t.currency)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              </Card>
            )
          })}
        </div>
      )}

      <ProjectFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSave={async (data) => {
          await addProject(data)
          setCreating(false)
        }}
      />

      {open && (
        <ProjectDetailModal
          project={open}
          onClose={() => setOpenId(null)}
          onDelete={() => {
            setToDelete(open)
            setOpenId(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar proyecto"
        message="Se borra el proyecto y todos sus gastos y ventas. Los movimientos de tus cuentas no se tocan."
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteProject(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function ProjectDetailModal({ project, onClose, onDelete }: { project: Project; onClose: () => void; onDelete: () => void }) {
  const { projectEntries, addProjectEntry, deleteProjectEntry } = useData()
  const entries = projectEntries
    .filter((e) => e.projectId === project.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const totals = totalsByCurrency(entries)

  const [type, setType] = useState<MovementType>('gasto')
  const [amount, setAmount] = useState(0)
  const [currency, setCurrency] = useState<Currency>(entries[0]?.currency ?? 'COP')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  return (
    <Modal open onClose={onClose} title={`${project.icon ?? '📦'} ${project.name}`}>
      {totals.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {totals.map((t) => (
            <div key={t.currency} className="flex items-center justify-between gap-2">
              <span className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">
                Resultado en {t.currency} · ↑ {formatAmount(t.income, t.currency)} ↓ {formatAmount(t.expense, t.currency)}
              </span>
              <span
                className="amount font-bold text-[var(--fs-md)] shrink-0"
                style={{ color: t.balance >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
              >
                {formatAmount(t.balance, t.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[var(--color-border)] pt-4 mb-5">
        <h3 className="t-h3 mb-[var(--sp-3)]">Agregar al proyecto</h3>
        <Field label="Tipo">
          <TypeToggle value={type} onChange={setType} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moneda">
            <SelectInput value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Fecha">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Valor">
          <AmountInput value={amount} onChange={setAmount} currency={currency} />
        </Field>
        <Field label="Descripción">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'gasto' ? 'Ej. arroz, arvejas' : 'Ej. venta del domingo'}
          />
        </Field>
        <Button
          className="w-full"
          disabled={amount <= 0 || !description.trim() || saving}
          onClick={async () => {
            setSaving(true)
            try {
              await addProjectEntry({
                projectId: project.id,
                type,
                amount,
                currency,
                description: description.trim(),
                date,
              })
              setAmount(0)
              setDescription('')
            } finally {
              setSaving(false)
            }
          }}
        >
          {saving ? 'Guardando…' : type === 'gasto' ? 'Agregar gasto' : 'Agregar venta'}
        </Button>
      </div>

      <div className="border-t border-[var(--color-border)] pt-4">
        <h3 className="t-h3 mb-[var(--sp-3)]">Movimientos del proyecto</h3>
        {entries.length === 0 ? (
          <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">Todavía no hay nada registrado.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-2 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--fs-base)] truncate">{e.description}</div>
                  <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
                    {formatDateReadable(e.date)}
                    {e.linkedMovementId && ' · desde un movimiento'}
                  </div>
                </div>
                <span
                  className="amount font-semibold shrink-0"
                  style={{ color: e.type === 'ingreso' ? 'var(--color-income)' : 'var(--color-expense)' }}
                >
                  {e.type === 'ingreso' ? '+' : '−'} {formatAmount(e.amount, e.currency)}
                </span>
                <button
                  onClick={() => deleteProjectEntry(e.id)}
                  aria-label="Eliminar registro"
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

      <button onClick={onDelete} className="text-[var(--fs-sm)] font-semibold mt-5" style={{ color: 'var(--color-expense)' }}>
        Eliminar proyecto
      </button>
    </Modal>
  )
}

function ProjectFormModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Project, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🍲')

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proyecto">
      <Field label="Nombre" hint="Ej. Venta de tamales, Viaje a Cartagena, Inversión en X">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="¿Qué proyecto es?" autoFocus />
      </Field>
      <Field label="Ícono">
        <div className="flex flex-wrap gap-2">
          {['🍲', '📦', '🛠️', '🚗', '💻', '🌱', '🎉', '📈'].map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setIcon(e)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--fs-lg)] border-2"
              style={{
                background: 'var(--color-muted)',
                borderColor: icon === e ? 'var(--color-accent)' : 'transparent',
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Button
        className="w-full mt-2"
        size="lg"
        disabled={!name.trim()}
        onClick={() => {
          onSave({ name: name.trim(), icon, active: true, createdAt: Date.now() })
          setName('')
        }}
      >
        Crear proyecto
      </Button>
    </Modal>
  )
}
