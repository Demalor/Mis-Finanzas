import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { MovementRow } from '../components/MovementRow'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'
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
    list.sort((a, b) => (sortDir === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
    return list
  }, [movements, typeFilter, categoryFilter, search, sortDir, categories])

  const total = filtered.reduce((sum, m) => sum + (m.type === 'ingreso' ? m.amount : -m.amount), 0)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-bold">Movimientos</h1>
        <p className="text-[var(--color-text-secondary)] text-[15px]">Consulta tus movimientos y los que se repiten automáticamente</p>
      </div>

      <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 w-fit gap-1">
        <button
          onClick={() => setTab('lista')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'lista' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          📋 Lista
        </button>
        <button
          onClick={() => setTab('recurrentes')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'recurrentes' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          🔁 Recurrentes
        </button>
      </div>

      {tab === 'recurrentes' ? (
        <RecurringTab />
      ) : (
        <>
          <Card padding="sm" className="flex flex-col gap-3">
        <TextInput
          type="search"
          placeholder="Buscar por descripción o categoría…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="w-auto">
            <option value="todos">Todos los tipos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="gasto">Solo gastos</option>
          </SelectInput>
          <SelectInput value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </SelectInput>
          <button
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            className="px-4 py-3.5 rounded-[14px] border border-[var(--color-border)] text-[15px] font-medium bg-[var(--color-surface)]"
          >
            Fecha {sortDir === 'desc' ? '↓ recientes primero' : '↑ antiguas primero'}
          </button>
        </div>
      </Card>

      <div className="flex items-center justify-between text-[14px] text-[var(--color-text-secondary)] px-1">
        <span>
          Mostrando {filtered.length} de {movements.length} movimientos
        </span>
        <span className="font-semibold" style={{ color: total >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
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
                <div className="flex-1">
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
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 text-[18px]"
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

      <Button onClick={() => navigate('/agregar')} size="lg" className="fixed bottom-24 md:bottom-8 right-6 shadow-xl z-30">
        + Agregar
      </Button>
        </>
      )}
    </div>
  )
}
