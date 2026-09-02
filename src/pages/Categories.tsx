import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Field, TextInput, TypeToggle } from '../components/FormControls'
import { BudgetsTab } from '../components/BudgetsTab'
import type { Category, IncomeSource, MovementType } from '../types/models'

const ICON_OPTIONS = ['🍽️', '🏠', '🚌', '💡', '🩺', '📚', '🎬', '🛍️', '💳', '📦', '💼', '🏦', '🧰', '📈', '🎁', '🐾', '✈️', '🎓']
const COLOR_OPTIONS = ['#7C3AED', '#FF9500', '#34C759', '#007AFF', '#FF3B30', '#5856D6', '#32ADE6', '#FF2D55', '#8E8E93', '#AF52DE']

type Tab = MovementType | 'fuentes' | 'presupuestos'

export function Categories() {
  const { categories, movements, addCategory, updateCategory, deleteCategory, incomeSources, addIncomeSource, updateIncomeSource, deleteIncomeSource } = useData()
  const [tab, setTab] = useState<Tab>('gasto')
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)

  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)
  const [creatingSource, setCreatingSource] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<IncomeSource | null>(null)

  const list = categories.filter((c) => c.type === tab)

  function usageCount(categoryId: string) {
    return movements.filter((m) => m.categoryId === categoryId).length
  }

  function sourceUsageCount(sourceId: string) {
    return movements.filter((m) => m.sourceId === sourceId).length
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold">Organización</h1>
          <p className="text-[var(--color-text-secondary)] text-[15px]">Categorías, fuentes de ingreso y presupuestos</p>
        </div>
        {tab === 'fuentes' ? (
          <Button onClick={() => setCreatingSource(true)}>+ Nueva</Button>
        ) : tab === 'presupuestos' ? null : (
          <Button onClick={() => setCreating(true)}>+ Nueva</Button>
        )}
      </div>

      <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 w-fit gap-1 flex-wrap">
        <button
          onClick={() => setTab('gasto')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'gasto' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          Gastos
        </button>
        <button
          onClick={() => setTab('ingreso')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'ingreso' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          Ingresos
        </button>
        <button
          onClick={() => setTab('fuentes')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'fuentes' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          Fuentes de ingreso
        </button>
        <button
          onClick={() => setTab('presupuestos')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'presupuestos' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          🎯 Presupuestos
        </button>
      </div>

      {tab === 'presupuestos' && <BudgetsTab />}

      {(tab === 'gasto' || tab === 'ingreso') ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((cat) => (
            <Card key={cat.id} padding="md" className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[22px] shrink-0"
                style={{ background: `${cat.color}22` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[16px] truncate">{cat.name}</div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">{usageCount(cat.id)} movimientos</div>
              </div>
              <button onClick={() => setEditing(cat)} aria-label={`Editar ${cat.name}`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[17px]">
                ✏️
              </button>
              <button
                onClick={() => setToDelete(cat)}
                aria-label={`Eliminar ${cat.name}`}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-[17px]"
                style={{ color: 'var(--color-expense)' }}
              >
                🗑️
              </button>
            </Card>
          ))}
        </div>
      ) : tab === 'fuentes' ? (
        <div className="flex flex-col gap-3">
          {incomeSources.length === 0 ? (
            <EmptyState icon="🏷️" title="Aún no tienes fuentes de ingreso" message="Ej. Empresa X, Cliente Juan, Remesa de mamá." />
          ) : (
            incomeSources.map((src) => (
              <Card key={src.id} padding="md" className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[18px] shrink-0 bg-[var(--color-accent-soft)]">💼</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[16px] truncate">{src.nombre}</div>
                  <div className="text-[13px] text-[var(--color-text-secondary)]">{sourceUsageCount(src.id)} ingresos</div>
                </div>
                <button onClick={() => setEditingSource(src)} aria-label={`Editar ${src.nombre}`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[17px]">✏️</button>
                <button onClick={() => setSourceToDelete(src)} aria-label={`Eliminar ${src.nombre}`} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-[17px]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
              </Card>
            ))
          )}
        </div>
      ) : null}

      <CategoryFormModal
        open={creating && (tab === 'gasto' || tab === 'ingreso')}
        defaultType={(tab === 'gasto' || tab === 'ingreso') ? tab : 'gasto'}
        onClose={() => setCreating(false)}
        onSave={async (data) => {
          await addCategory(data)
          setCreating(false)
        }}
      />

      <CategoryFormModal
        open={!!editing}
        category={editing ?? undefined}
        defaultType={(tab === 'gasto' || tab === 'ingreso') ? tab : 'gasto'}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          if (editing) await updateCategory(editing.id, data)
          setEditing(null)
        }}
      />

      <IncomeSourceFormModal
        open={creatingSource}
        onClose={() => setCreatingSource(false)}
        onSave={async (nombre) => { await addIncomeSource({ nombre }); setCreatingSource(false) }}
      />
      <IncomeSourceFormModal
        open={!!editingSource}
        source={editingSource ?? undefined}
        onClose={() => setEditingSource(null)}
        onSave={async (nombre) => { if (editingSource) await updateIncomeSource(editingSource.id, { nombre }); setEditingSource(null) }}
      />
      <ConfirmDialog
        open={!!sourceToDelete}
        title="Eliminar fuente de ingreso"
        message="Los ingresos ya registrados con esta fuente no se eliminarán, solo quedarán sin fuente asignada."
        confirmLabel="Eliminar"
        onCancel={() => setSourceToDelete(null)}
        onConfirm={async () => { if (sourceToDelete) await deleteIncomeSource(sourceToDelete.id); setSourceToDelete(null) }}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar categoría"
        message={
          toDelete && usageCount(toDelete.id) > 0
            ? `Esta categoría tiene ${usageCount(toDelete.id)} movimientos asociados. Los movimientos no se eliminarán, pero quedarán sin categoría asignada.`
            : '¿Deseas eliminar esta categoría?'
        }
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteCategory(toDelete.id)
          setToDelete(null)
        }}
      />
    </div>
  )
}

function CategoryFormModal({
  open,
  category,
  defaultType,
  onClose,
  onSave,
}: {
  open: boolean
  category?: Category
  defaultType: MovementType
  onClose: () => void
  onSave: (data: { name: string; type: MovementType; icon: string; color: string }) => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<MovementType>(category?.type ?? defaultType)
  const [icon, setIcon] = useState(category?.icon ?? ICON_OPTIONS[0])
  const [color, setColor] = useState(category?.color ?? COLOR_OPTIONS[0])

  // Reinicia el formulario cuando cambia la categoría a editar o se abre para crear
  const key = category?.id ?? 'new'

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <div key={key}>
        <Field label="Nombre">
          <TextInput
            value={name || category?.name || ''}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mascotas"
            autoFocus
          />
        </Field>
        <Field label="Tipo">
          <TypeToggle value={type} onChange={setType} />
        </Field>
        <Field label="Icono">
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[20px] border-2"
                style={{ borderColor: icon === i ? 'var(--color-accent)' : 'transparent', background: '#F5F5F7' }}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full border-2"
                style={{ background: c, borderColor: color === c ? '#1D1D1F' : 'transparent' }}
              />
            ))}
          </div>
        </Field>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            const finalName = name.trim() || category?.name || ''
            if (!finalName) return
            onSave({ name: finalName, type, icon, color })
            setName('')
          }}
        >
          Guardar categoría
        </Button>
      </div>
    </Modal>
  )
}

function IncomeSourceFormModal({
  open,
  source,
  onClose,
  onSave,
}: {
  open: boolean
  source?: IncomeSource
  onClose: () => void
  onSave: (nombre: string) => void
}) {
  const [nombre, setNombre] = useState(source?.nombre ?? '')
  const key = source?.id ?? 'new'

  return (
    <Modal open={open} onClose={onClose} title={source ? 'Editar fuente de ingreso' : 'Nueva fuente de ingreso'}>
      <div key={key}>
        <Field label="Nombre" hint="Ej. Empresa X, Cliente Juan, Remesa de mamá">
          <TextInput
            value={nombre || source?.nombre || ''}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Escribe el nombre"
            autoFocus
          />
        </Field>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            const finalName = nombre.trim() || source?.nombre || ''
            if (!finalName) return
            onSave(finalName)
            setNombre('')
          }}
        >
          Guardar fuente
        </Button>
      </div>
    </Modal>
  )
}
