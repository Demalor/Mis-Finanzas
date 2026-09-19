import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { SelectInput } from './FormControls'
import { formatAmount } from '../utils/currency'
import { monthLabelShort } from '../utils/date'
import { savingsBoxBalanceAt, savingsOriginBreakdown } from '../utils/calculations'
import type { SavingsBoxItem } from '../utils/calculations'
import { colorAt } from '../utils/colors'
import { DonutBreakdown } from './DonutBreakdown'
import type { Account, Currency } from '../types/models'

// Las cajas de ahorro no generan movimientos, así que no pueden salir en las
// gráficas de ingresos/gastos: tienen su propia tarjeta con dos vistas —
// comparar todas contra su meta, o seguir la evolución de una sola.
export function SavingsBoxesChart({
  boxes,
  accounts,
  months,
  displayCurrency,
  convert,
  selectedId,
  onSelect,
  compactTick,
}: {
  boxes: SavingsBoxItem[]
  accounts: Account[]
  months: string[]
  displayCurrency: Currency
  // Devuelve null si no se pudo convertir (sin tasa disponible).
  convert: (value: number, from: Currency) => number | null
  selectedId: string
  onSelect: (id: string) => void
  compactTick: (v: number) => string
}) {
  const visibles = boxes.filter((b) => convert(b.box.current, b.box.currency) !== null)
  const selected = selectedId ? visibles.find((b) => b.id === selectedId) ?? null : null

  const comparison = visibles.map((b) => ({
    name: b.box.name,
    Actual: convert(b.box.current, b.box.currency) ?? 0,
    Meta: convert(b.box.target, b.box.currency) ?? 0,
  }))

  const evolution = selected
    ? months.map((m) => ({
        month: monthLabelShort(m),
        Ahorrado: convert(savingsBoxBalanceAt(selected.box, m), selected.box.currency) ?? 0,
      }))
    : []

  const sinHistorial = !!selected && (selected.box.history ?? []).length === 0

  // De dónde llegó la plata que hay hoy en la caja. Los aportes anteriores a
  // que se registrara el origen salen agrupados como "Sin registrar".
  const origen = selected
    ? savingsOriginBreakdown(selected.box, accounts).flatMap((o, i) => {
        const total = convert(o.total, selected.box.currency)
        return total === null ? [] : [{ id: o.id, label: o.label, color: colorAt(i), total }]
      })
    : []

  return (
    <Card padding="lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)] mb-[var(--sp-4)]">
        <h2 className="t-h3">🐷 Cajas de ahorro</h2>
        {visibles.length > 0 && (
          <SelectInput
            aria-label="Caja de ahorro"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
            className="md:w-64"
          >
            <option value="">Todas las cajas</option>
            {visibles.map((b) => (
              <option key={b.id} value={b.id}>
                {b.box.name}
              </option>
            ))}
          </SelectInput>
        )}
      </div>

      {visibles.length === 0 ? (
        <EmptyState
          icon="🐷"
          title="No hay cajas de ahorro que mostrar"
          message="Crea una caja desde el panel de Inicio, o cambia el filtro de moneda para ver las que ya tienes."
        />
      ) : selected ? (
        sinHistorial ? (
          <EmptyState
            icon="🕐"
            title={`"${selected.box.name}" todavía no tiene historial`}
            message="El historial se empezó a guardar hace poco: desde ahora, cada vez que agregues o retires de esta caja quedará registrado y podrás ver su evolución aquí."
          />
        ) : (
          <>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                <YAxis tickFormatter={compactTick} tick={{ fontSize: 12 }} width={45} />
                <Tooltip formatter={(value) => formatAmount(Number(value), displayCurrency)} />
                <Line type="monotone" dataKey="Ahorrado" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {origen.length > 0 && (
            <div className="border-t border-[var(--color-border)] mt-[var(--sp-5)] pt-[var(--sp-5)]">
              <DonutBreakdown titulo="¿De dónde llegó esta plata?" slices={origen} currency={displayCurrency} ancho />
            </div>
          )}
          </>
        )
      ) : (
        <div style={{ height: `${Math.max(220, comparison.length * 58)}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" tickFormatter={compactTick} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatAmount(Number(value), displayCurrency)} />
              <Legend />
              <Bar dataKey="Actual" fill="var(--color-accent)" radius={[0, 6, 6, 0]} />
              <Bar dataKey="Meta" fill="var(--color-border)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
