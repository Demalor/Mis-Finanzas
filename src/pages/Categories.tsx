import { useState } from 'react'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { Field, TextInput } from '../components/FormControls'
import { BudgetsTab } from '../components/BudgetsTab'
import { CategoryFormModal } from '../components/CategoryFormModal'
import type { Category, IncomeSource, MovementType } from '../types/models'

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
    <div className="page">
      <PageHeader
        title="Organización"
        subtitle="Categorías, fuentes de ingreso y presupuestos"
        action={
          tab === 'fuentes' ? (
            <Button onClick={() => setCreatingSource(true)} className="shrink-0">+ Nueva</Button>
          ) : tab === 'presupuestos' ? undefined : (
            <Button onClick={() => setCreating(true)} className="shrink-0">+ Nueva</Button>
          )
        }
      />

      <Segmented
        aria-label="Sección de organización"
        options={[
          { value: 'gasto', label: 'Gastos' },
          { value: 'ingreso', label: 'Ingresos' },
          { value: 'fuentes', label: 'Fuentes de ingreso' },
          { value: 'presupuestos', label: '🎯 Presupuestos' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'presupuestos' && <BudgetsTab />}

      {(tab === 'gasto' || tab === 'ingreso') ? (
        <div className="card-grid">
          {list.map((cat) => (
            <Card key={cat.id} padding="md" className="flex items-center gap-[var(--sp-3)]">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--fs-xl)] shrink-0"
                style={{ background: `${cat.color}22` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--fs-md)] truncate">{cat.name}</div>
                <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">{usageCount(cat.id)} movimientos</div>
              </div>
              <button onClick={() => setEditing(cat)} aria-label={`Editar ${cat.name}`} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-md)]">
                ✏️
              </button>
              <button
                onClick={() => setToDelete(cat)}
                aria-label={`Eliminar ${cat.name}`}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]"
                style={{ color: 'var(--color-expense)' }}
              >
                🗑️
              </button>
            </Card>
          ))}
        </div>
      ) : tab === 'fuentes' ? (
        <div className="flex flex-col gap-[var(--sp-3)]">
          {incomeSources.length === 0 ? (
            <EmptyState icon="🏷️" title="Aún no tienes fuentes de ingreso" message="Ej. Empresa X, Cliente Juan, Remesa de mamá." />
          ) : (
            incomeSources.map((src) => (
              <Card key={src.id} padding="md" className="flex items-center gap-[var(--sp-3)]">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--fs-lg)] shrink-0 bg-[var(--color-accent-soft)]">💼</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--fs-md)] truncate">{src.nombre}</div>
                  <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">{sourceUsageCount(src.id)} ingresos</div>
                </div>
                <button onClick={() => setEditingSource(src)} aria-label={`Editar ${src.nombre}`} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-md)]">✏️</button>
                <button onClick={() => setSourceToDelete(src)} aria-label={`Eliminar ${src.nombre}`} className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-md)]" style={{ color: 'var(--color-expense)' }}>🗑️</button>
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
