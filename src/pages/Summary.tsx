import { useCallback, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { useData } from '../context/DataContext'
import { useAuth } from '../firebase/AuthContext'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { MonthSelector } from '../components/MonthSelector'
import { MovementsSpreadsheet } from '../components/MovementsSpreadsheet'
import { formatAmount } from '../utils/currency'
import { currentMonthKey, lastMonths, monthLabelShort, toMonthKey } from '../utils/date'
import { movementsInMonth, categoryBreakdown, totalsFor } from '../utils/calculations'
import { CURRENCIES } from '../types/models'
import type { Currency, Movement } from '../types/models'

type Tab = 'graficos' | 'tabla'

// Etiqueta corta para los ejes: "1.2M" no cabe, así que mostramos "1200k";
// para montos pequeños (típico en EUR/CHF) dejamos el número tal cual.
const compactTick = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)

export function Summary() {
  const { movements, categories, accounts } = useData()
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('graficos')
  const [month, setMonth] = useState(currentMonthKey())
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto')
  const [currency, setCurrency] = useState<Currency>(profile?.monedaPreferida ?? 'COP')

  // Cada movimiento hereda la moneda de su cuenta (COP si no tiene cuenta asignada).
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])
  const currencyOf = useCallback(
    (m: Movement): Currency => (m.accountId ? accountCurrency.get(m.accountId) ?? 'COP' : 'COP'),
    [accountCurrency]
  )

  // Monedas en las que la persona realmente tiene movimientos, en el orden oficial.
  const availableCurrencies = useMemo(() => {
    const present = new Set<Currency>()
    for (const m of movements) present.add(currencyOf(m))
    return CURRENCIES.filter((c) => present.has(c.code)).map((c) => c.code)
  }, [movements, currencyOf])

  // Si la moneda elegida ya no tiene movimientos, caemos a la primera disponible.
  const activeCurrency: Currency = availableCurrencies.includes(currency)
    ? currency
    : availableCurrencies[0] ?? 'COP'

  const currencyMovements = useMemo(
    () => movements.filter((m) => currencyOf(m) === activeCurrency),
    [movements, currencyOf, activeCurrency]
  )

  const monthMovements = useMemo(() => movementsInMonth(currencyMovements, month), [currencyMovements, month])
  const breakdown = useMemo(() => categoryBreakdown(monthMovements, categories, type), [monthMovements, categories, type])
  const total = breakdown.reduce((s, i) => s + i.total, 0)

  const months = useMemo(() => lastMonths(6, month), [month])
  const evolutionData = useMemo(
    () =>
      months.map((m) => {
        const inMonth = currencyMovements.filter((mv) => toMonthKey(mv.date) === m)
        const { income, expense, balance } = totalsFor(inMonth)
        return { month: monthLabelShort(m), Ingresos: income, Gastos: expense, Balance: balance }
      }),
    [months, currencyMovements]
  )

  return (
    <div className="page">
      <PageHeader title="Resumen" subtitle="Gráficos y tabla completa de tus movimientos" />

      <Segmented
        aria-label="Vista del resumen"
        options={[
          { value: 'graficos', label: '📊 Gráficos' },
          { value: 'tabla', label: '📋 Tabla' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'tabla' ? (
        <MovementsSpreadsheet />
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)]">
            <div className="flex flex-col md:flex-row md:items-center gap-[var(--sp-3)]">
              <Segmented
                aria-label="Tipo de movimiento"
                options={[
                  { value: 'gasto', label: 'Gastos' },
                  { value: 'ingreso', label: 'Ingresos' },
                ]}
                value={type}
                onChange={setType}
              />
              {availableCurrencies.length > 1 && (
                <Segmented
                  aria-label="Moneda"
                  options={availableCurrencies.map((code) => ({ value: code, label: code }))}
                  value={activeCurrency}
                  onChange={setCurrency}
                />
              )}
            </div>
            <MonthSelector month={month} onChange={setMonth} className="w-full md:w-fit md:shrink-0" />
          </div>

          <Card padding="lg">
            <h2 className="t-h3 mb-[var(--sp-4)]">
              Distribución por categoría{availableCurrencies.length > 1 && ` · ${activeCurrency}`}
            </h2>
            {breakdown.length === 0 ? (
              <EmptyState icon="🥧" title="No hay datos este mes" message="Registra movimientos para ver la distribución." />
            ) : (
              <div className="flex flex-col lg:flex-row gap-[var(--sp-5)] items-center">
                <div className="w-full lg:w-1/2 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown} dataKey="total" nameKey="category.name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {breakdown.map((item) => (
                          <Cell key={item.category.id} fill={item.category.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatAmount(Number(value), activeCurrency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 flex flex-col gap-[var(--sp-3)]">
                  {breakdown.map((item) => (
                    <div key={item.category.id} className="flex items-center gap-[var(--sp-3)]">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.category.color }} />
                      <span className="flex-1 min-w-0 text-[var(--fs-base)] font-medium truncate">
                        {item.category.icon} {item.category.name}
                      </span>
                      <span className="amount text-[var(--fs-base)] font-semibold shrink-0">{formatAmount(item.total, activeCurrency)}</span>
                      <span className="amount text-[var(--fs-xs)] text-[var(--color-text-secondary)] w-10 text-right shrink-0">{item.percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 pt-[var(--sp-3)] border-t border-[var(--color-border)] mt-1">
                    <span className="font-bold">Total</span>
                    <span className="amount font-bold">{formatAmount(total, activeCurrency)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="t-h3 mb-1">Evolución financiera</h2>
            <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-[var(--sp-4)]">
              Últimos 6 meses{availableCurrencies.length > 1 && ` · ${activeCurrency}`}
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={compactTick} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), activeCurrency)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gastos" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="t-h3 mb-1">
              Balance mensual{availableCurrencies.length > 1 && ` · ${activeCurrency}`}
            </h2>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={compactTick} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), activeCurrency)} />
                  <Line type="monotone" dataKey="Balance" stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
