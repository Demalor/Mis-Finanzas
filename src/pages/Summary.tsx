import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { useData } from '../context/DataContext'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { MonthSelector } from '../components/MonthSelector'
import { MovementsSpreadsheet } from '../components/MovementsSpreadsheet'
import { formatAmount } from '../utils/currency'
import { currentMonthKey, lastMonths, monthLabelShort, toMonthKey } from '../utils/date'
import { movementsInMonth, categoryBreakdown, totalsFor } from '../utils/calculations'

type Tab = 'graficos' | 'tabla'

export function Summary() {
  const { movements, categories } = useData()
  const [tab, setTab] = useState<Tab>('graficos')
  const [month, setMonth] = useState(currentMonthKey())
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto')

  const monthMovements = useMemo(() => movementsInMonth(movements, month), [movements, month])
  const breakdown = useMemo(() => categoryBreakdown(monthMovements, categories, type), [monthMovements, categories, type])
  const total = breakdown.reduce((s, i) => s + i.total, 0)

  const months = useMemo(() => lastMonths(6, month), [month])
  const evolutionData = useMemo(
    () =>
      months.map((m) => {
        const inMonth = movements.filter((mv) => toMonthKey(mv.date) === m)
        const { income, expense, balance } = totalsFor(inMonth)
        return { month: monthLabelShort(m), Ingresos: income, Gastos: expense, Balance: balance }
      }),
    [months, movements]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold">Resumen</h1>
        <p className="text-[var(--color-text-secondary)] text-[15px]">Gráficos y tabla completa de tus movimientos</p>
      </div>

      <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 w-fit gap-1">
        <button
          onClick={() => setTab('graficos')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'graficos' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          📊 Gráficos
        </button>
        <button
          onClick={() => setTab('tabla')}
          className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${tab === 'tabla' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
        >
          📋 Tabla
        </button>
      </div>

      {tab === 'tabla' ? (
        <MovementsSpreadsheet />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 w-fit gap-1">
              <button
                onClick={() => setType('gasto')}
                className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${type === 'gasto' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
              >
                Gastos
              </button>
              <button
                onClick={() => setType('ingreso')}
                className={`px-5 py-2.5 rounded-[12px] text-[15px] font-semibold ${type === 'ingreso' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
              >
                Ingresos
              </button>
            </div>
            <MonthSelector month={month} onChange={setMonth} />
          </div>

          <Card padding="lg">
            <h2 className="text-[18px] font-bold mb-4">Distribución por categoría</h2>
            {breakdown.length === 0 ? (
              <EmptyState icon="🥧" title="No hay datos este mes" message="Registra movimientos para ver la distribución." />
            ) : (
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/2 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown} dataKey="total" nameKey="category.name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {breakdown.map((item) => (
                          <Cell key={item.category.id} fill={item.category.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatAmount(Number(value), 'COP')} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 flex flex-col gap-3">
                  {breakdown.map((item) => (
                    <div key={item.category.id} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.category.color }} />
                      <span className="flex-1 min-w-0 text-[15px] font-medium truncate">
                        {item.category.icon} {item.category.name}
                      </span>
                      <span className="text-[15px] font-semibold">{formatAmount(item.total, 'COP')}</span>
                      <span className="text-[13px] text-[var(--color-text-secondary)] w-12 text-right">{item.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] mt-1">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">{formatAmount(total, 'COP')}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="text-[18px] font-bold mb-1">Evolución financiera</h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-4">Últimos 6 meses</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), 'COP')} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#1F9254" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#D6432B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-[18px] font-bold mb-1">Balance mensual</h2>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), 'COP')} />
                  <Line type="monotone" dataKey="Balance" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
