import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { MovementRow } from '../components/MovementRow'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { TextInput, SelectInput } from '../components/FormControls'
import { RecurringTab } from '../components/RecurringTab'

import { formatAmount } from '../utils/currency'

type Tab = 'lista' | 'recurrentes'

export function MovementsList() {
  const { movements, categories, accounts, deleteMovement } = useData()
  const navigate = useNavigate()
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const [tab, setTab] = useState<Tab>('lista')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingreso' | 'gasto'>('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [toDelete, setToDelete] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...movements]
    if (typeFilter !== 'todos') list = list.filter((m) => m.type === typeFilter)
    if (categoryFilter !== 'todas') list = list.filter((m) => m.categoryId === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.description.toLowerCase().includes(q) ||
          categories.find((c) => c.id === m.categoryId)?.name.toLowerCase().includes(q)
      )
    }
    // Orden por fecha; a igual fecha, desempata por hora de creación
    // (así los movimientos del mismo día quedan del más reciente al más antiguo).
    list.sort((a, b) => {
      const byDate = sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return sortDir === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    })
    return list
  }, [movements, typeFilter, categoryFilter, search, sortDir, categories])

  const total = filtered.reduce((sum, m) => sum + (m.type === 'ingreso' ? m.amount : -m.amount), 0)

  return (
    <div className="page">
      <PageHeader title="Movimientos" subtitle="Consulta tus movimientos y los que se repiten automáticamente" />

      <Segmented
        aria-label="Vista de movimientos"
        options={[
          { value: 'lista', label: '📋 Lista' },
          { value: 'recurrentes', label: '🔁 Recurrentes' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'recurrentes' ? (
        <RecurringTab />
      ) : (
        <>
          <Card padding="sm" className="flex flex-col gap-[var(--sp-3)]">
        <TextInput
          type="search"
          placeholder="Buscar por descripción o categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="toolbar">
          <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="todos">Todos los tipos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="gasto">Solo gastos</option>
          </SelectInput>
          <SelectInput value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </SelectInput>
          <button
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className="min-h-[var(--tap)] px-[var(--sp-4)] rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--fs-base)] font-medium bg-[var(--color-surface)]"
          >
            Fecha {sortDir === 'desc' ? '↓ recientes primero' : '↑ antiguas primero'}
          </button>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 text-[var(--fs-sm)] text-[var(--color-text-secondary)] px-1">
        <span>
          Mostrando {filtered.length} de {movements.length} movimientos
        </span>
        <span className="amount font-semibold shrink-0" style={{ color: total >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
          Total: {formatAmount(total, 'COP')}
        </span>
      </div>

      <Card padding="sm">
        {filtered.length === 0 ? (
          <EmptyState icon="🔍" title="Sin resultados" message="Ajusta los filtros o el texto de búsqueda." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <MovementRow
                    movement={m}
                    category={categories.find((c) => c.id === m.categoryId)}
                    currency={m.accountId ? accountCurrency.get(m.accountId) ?? 'COP' : 'COP'}
                    onClick={() => navigate(`/editar/${m.id}`)}
                  />
                </div>
                <button
                  onClick={() => setToDelete(m.id)}
                  aria-label="Eliminar movimiento"
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-expense-soft)] text-[var(--fs-lg)]"
                  style={{ color: 'var(--color-expense)' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar movimiento"
        message="Esta acción no se puede deshacer. ¿Deseas eliminar este movimiento?"
        confirmLabel="Eliminar"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await deleteMovement(toDelete)
          setToDelete(null)
        }}
      />

      <Button
        onClick={() => navigate('/agregar')}
        size="lg"
        className="fixed bottom-24 right-[var(--sp-5)] md:bottom-[var(--sp-6)] shadow-xl z-30"
      >
        + Agregar
      </Button>
        </>
      )}
    </div>
  )
}
