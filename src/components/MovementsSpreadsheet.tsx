import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { Card } from './Card'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { TextInput, SelectInput } from './FormControls'
import { EmptyState } from './EmptyState'
import { formatAmount } from '../utils/currency'
import { formatDateReadable } from '../utils/date'
import type { Movement } from '../types/models'

type SortKey = 'date' | 'type' | 'category' | 'description' | 'amount'

const PAGE_SIZE = 50

export function MovementsSpreadsheet() {
  const { movements, categories, accounts, deleteMovements } = useData()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sin categoría'
  const currencyFor = (m: Movement) => (m.accountId ? accounts.find((a) => a.id === m.accountId)?.moneda ?? 'COP' : 'COP')

  const filtered = useMemo(() => {
    let list = [...movements]
    if (typeFilter !== 'todos') list = list.filter((m) => m.type === typeFilter)
    if (categoryFilter !== 'todas') list = list.filter((m) => m.categoryId === categoryFilter)
    if (dateFrom) list = list.filter((m) => m.date >= dateFrom)
    if (dateTo) list = list.filter((m) => m.date <= dateTo)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((m) => m.description.toLowerCase().includes(q) || categoryName(m.categoryId).toLowerCase().includes(q))
    }

    const dir = sortDir === 'asc' ? 1 : -1
    list.sort((a, b) => {
      switch (sortKey) {
        case 'date':
          return dir * a.date.localeCompare(b.date)
        case 'type':
          return dir * a.type.localeCompare(b.type)
        case 'category':
          return dir * categoryName(a.categoryId).localeCompare(categoryName(b.categoryId))
        case 'description':
          return dir * a.description.localeCompare(b.description)
        case 'amount':
          return dir * (a.amount - b.amount)
        default:
          return 0
      }
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movements, typeFilter, categoryFilter, dateFrom, dateTo, search, sortKey, sortDir, categories])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = pageItems.every((m) => next.has(m.id))
      for (const m of pageItems) {
        if (allSelected) next.delete(m.id)
        else next.add(m.id)
      }
      return next
    })
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Fecha' },
    { key: 'type', label: 'Tipo' },
    { key: 'category', label: 'Categoría' },
    { key: 'description', label: 'Descripción' },
    { key: 'amount', label: 'Valor' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Card padding="sm" className="flex flex-col gap-3">
        <TextInput
          type="search"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <div className="flex flex-wrap gap-3">
          <SelectInput
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="w-auto"
          >
            <option value="todos">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
          </SelectInput>
          <SelectInput
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="w-auto"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </SelectInput>
          <TextInput type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="w-auto" aria-label="Desde" />
          <TextInput type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="w-auto" aria-label="Hasta" />
        </div>
      </Card>

      <div className="flex items-center justify-between text-[14px] px-1 flex-wrap gap-2">
        <span className="text-[var(--color-text-secondary)]">
          Mostrando {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} movimientos
          {filtered.length !== movements.length && ` (filtrado de ${movements.length})`}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[14px] px-4 py-3">
          <span className="text-[15px] font-medium">{selected.size} seleccionados</span>
          <Button variant="danger" size="md" onClick={() => setConfirmBulkDelete(true)}>
            Eliminar seleccionados
          </Button>
        </div>
      )}

      <Card padding="sm" className="overflow-x-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <EmptyState icon="📊" title="No hay movimientos que coincidan" message="Ajusta los filtros para ver resultados." />
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b-2 border-[var(--color-border)]">
                <th className="text-left py-3 px-2 w-10">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    checked={pageItems.length > 0 && pageItems.every((m) => selected.has(m.id))}
                    onChange={toggleSelectAllOnPage}
                    className="w-5 h-5"
                  />
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="text-left py-3 px-2 font-semibold text-[var(--color-text-secondary)]">
                    <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-[var(--color-text)]">
                      {col.label}
                      {sortKey === col.key && <span>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                    </button>
                  </th>
                ))}
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-secondary)]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m: Movement) => (
                <tr key={m.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]">
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar movimiento ${m.description}`}
                      checked={selected.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="w-5 h-5"
                    />
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">{formatDateReadable(m.date)}</td>
                  <td className="py-3 px-2">
                    <span
                      className="px-2.5 py-1 rounded-full text-[13px] font-semibold"
                      style={{
                        background: m.type === 'ingreso' ? 'var(--color-income-soft)' : 'var(--color-expense-soft)',
                        color: m.type === 'ingreso' ? 'var(--color-income)' : 'var(--color-expense)',
                      }}
                    >
                      {m.type === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                    </span>
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">{categoryName(m.categoryId)}</td>
                  <td className="py-3 px-2 max-w-[220px] truncate">{m.description || '—'}</td>
                  <td className="py-3 px-2 font-semibold whitespace-nowrap">{formatAmount(m.amount, currencyFor(m))}</td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => navigate(`/editar/${m.id}`)}
                      className="text-[14px] font-semibold"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="md" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ‹ Anterior
          </Button>
          <span className="text-[15px] font-medium">
            Página {page} de {totalPages}
          </span>
          <Button variant="secondary" size="md" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Siguiente ›
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Eliminar movimientos"
        message={`Vas a eliminar ${selected.size} movimientos. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar todos"
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={async () => {
          await deleteMovements(Array.from(selected))
          setSelected(new Set())
          setConfirmBulkDelete(false)
        }}
      />
    </div>
  )
}
