import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { EmptyState } from './EmptyState'
import { formatAmount } from '../utils/currency'
import type { Currency } from '../types/models'

export interface DonutSlice {
  id: string
  label: string
  icon?: string
  color: string
  total: number
}

// Torta + leyenda con montos y porcentajes. Se usa para categorías, para
// cuentas y para el origen de una caja de ahorro: cada quien arma sus
// porciones y esto solo las dibuja.
export function DonutBreakdown({
  titulo,
  slices,
  currency,
  ancho,
  vacio,
}: {
  titulo?: string
  slices: DonutSlice[]
  currency: Currency
  // Coloca la leyenda al lado de la torta en pantallas grandes.
  ancho?: boolean
  vacio?: { title: string; message: string }
}) {
  const total = slices.reduce((s, i) => s + i.total, 0)

  if (slices.length === 0) {
    return (
      <div>
        {titulo && <h3 className="t-h3 text-center mb-[var(--sp-2)]">{titulo}</h3>}
        <EmptyState
          icon="🥧"
          title={vacio?.title ?? 'No hay datos este mes'}
          message={vacio?.message ?? 'Registra movimientos para ver la distribución.'}
        />
      </div>
    )
  }

  return (
    <div>
      {titulo && <h3 className="t-h3 text-center mb-[var(--sp-2)]">{titulo}</h3>}
      <div className={`flex flex-col gap-[var(--sp-5)] items-center ${ancho ? 'lg:flex-row' : ''}`}>
        <div className={`w-full h-[260px] ${ancho ? 'lg:w-1/2' : ''}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="total" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {slices.map((s) => (
                  <Cell key={s.id} fill={s.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatAmount(Number(value), currency)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={`w-full flex flex-col gap-[var(--sp-3)] ${ancho ? 'lg:w-1/2' : ''}`}>
          {slices.map((s) => (
            <div key={s.id} className="flex items-center gap-[var(--sp-3)]">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="flex-1 min-w-0 text-[var(--fs-base)] font-medium truncate">
                {s.icon ? `${s.icon} ` : ''}
                {s.label}
              </span>
              <span className="amount text-[var(--fs-base)] font-semibold shrink-0">{formatAmount(s.total, currency)}</span>
              <span className="amount text-[var(--fs-xs)] text-[var(--color-text-secondary)] w-10 text-right shrink-0">
                {total > 0 ? ((s.total / total) * 100).toFixed(0) : '0'}%
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-[var(--sp-3)] border-t border-[var(--color-border)] mt-1">
            <span className="font-bold">Total</span>
            <span className="amount font-bold">{formatAmount(total, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
