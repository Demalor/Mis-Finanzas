import { useEffect, useMemo, useState } from 'react'
import { Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { useData } from '../context/useData'
import { useAuth } from '../firebase/useAuth'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { Segmented } from '../components/Segmented'
import { MonthSelector } from '../components/MonthSelector'
import { MovementsSpreadsheet } from '../components/MovementsSpreadsheet'
import { SelectInput } from '../components/FormControls'
import { SavingsBoxesChart } from '../components/SavingsBoxesChart'
import { DonutBreakdown } from '../components/DonutBreakdown'
import type { DonutSlice } from '../components/DonutBreakdown'
import { formatAmount } from '../utils/currency'
import { currentMonthKey, lastMonths, monthLabelShort, toMonthKey } from '../utils/date'
import { movementsInMonth, categoryBreakdown, accountBreakdown, totalsFor, currencyOf, savingsBoxesOf } from '../utils/calculations'
import { colorAt } from '../utils/colors'
import { fetchExchangeRate } from '../utils/exchangeRate'
import { CURRENCIES } from '../types/models'
import type { Currency } from '../types/models'

type Tab = 'graficos' | 'tabla'
type TypeFilter = 'gasto' | 'ingreso' | 'ambos'
// "conjunto" junta todas las monedas convirtiéndolas a una sola: es un
// aproximado con la tasa del día, por eso se avisa siempre en pantalla.
type CurrencyFilter = Currency | 'conjunto'

// Etiqueta corta para los ejes: "1.2M" no cabe, así que mostramos "1200k";
// para montos pequeños (típico en EUR/CHF) dejamos el número tal cual.
const compactTick = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)

export function Summary() {
  const { movements, categories, accounts } = useData()
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('graficos')
  const [month, setMonth] = useState(currentMonthKey())
  const [type, setType] = useState<TypeFilter>('ambos')
  const [currency, setCurrency] = useState<CurrencyFilter>(profile?.monedaPreferida ?? 'COP')
  const [combinedIn, setCombinedIn] = useState<Currency>(profile?.monedaPreferida ?? 'COP')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [boxId, setBoxId] = useState('')

  // Cada movimiento hereda la moneda de su cuenta (COP si no tiene cuenta asignada).
  const accountCurrency = useMemo(() => new Map(accounts.map((a) => [a.id, a.moneda])), [accounts])

  // Monedas en las que la persona realmente tiene movimientos, en el orden oficial.
  const availableCurrencies = useMemo(() => {
    const present = new Set<Currency>()
    for (const m of movements) present.add(currencyOf(m, accountCurrency))
    return CURRENCIES.filter((c) => present.has(c.code)).map((c) => c.code)
  }, [movements, accountCurrency])

  const account = accounts.find((a) => a.id === accountId)

  // Al elegir una cuenta la moneda queda determinada por ella; si no, vale lo
  // elegido, con respaldo a la primera disponible si esa moneda se quedó sin datos.
  const currencyFilter: CurrencyFilter = account
    ? account.moneda
    : currency === 'conjunto' || availableCurrencies.includes(currency)
      ? currency
      : availableCurrencies[0] ?? 'COP'
  const conjunto = currencyFilter === 'conjunto'
  const displayCurrency: Currency = conjunto ? combinedIn : currencyFilter

  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [ratesLoading, setRatesLoading] = useState(false)
  const [sinTasa, setSinTasa] = useState<Currency[]>([])
  const currenciesKey = availableCurrencies.join(',')

  useEffect(() => {
    if (!conjunto) {
      setRates(null)
      setSinTasa([])
      return
    }
    let cancelled = false
    async function cargarTasas() {
      setRatesLoading(true)
      const next: Record<string, number> = {}
      const fallaron: Currency[] = []
      for (const code of availableCurrencies) {
        if (code === combinedIn) {
          next[code] = 1
          continue
        }
        const rate = await fetchExchangeRate(code, combinedIn)
        if (rate === null) fallaron.push(code)
        else next[code] = rate
      }
      if (!cancelled) {
        setRates(next)
        setSinTasa(fallaron)
        setRatesLoading(false)
      }
    }
    cargarTasas()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conjunto, combinedIn, currenciesKey])

  // Convierte un monto a la moneda de visualización; null si falta la tasa.
  const convert = useMemo(() => {
    return (value: number, from: Currency): number | null => {
      if (!conjunto) return from === displayCurrency ? value : null
      const rate = rates?.[from]
      return rate === undefined ? null : value * rate
    }
  }, [conjunto, rates, displayCurrency])

  const baseMovements = useMemo(() => {
    let list = movements
    if (accountId) list = list.filter((m) => m.accountId === accountId)
    if (categoryId) list = list.filter((m) => m.categoryId === categoryId)
    return list
  }, [movements, accountId, categoryId])

  // Punto único de filtrado: las tres gráficas cuelgan de aquí. En modo
  // conjunto se reescribe el monto ya convertido para que los cálculos de
  // siempre (categoryBreakdown, totalsFor) funcionen sin cambios.
  const filteredMovements = useMemo(() => {
    if (!conjunto) return baseMovements.filter((m) => currencyOf(m, accountCurrency) === displayCurrency)
    if (!rates) return []
    return baseMovements.flatMap((m) => {
      const rate = rates[currencyOf(m, accountCurrency)]
      return rate === undefined ? [] : [{ ...m, amount: m.amount * rate }]
    })
  }, [baseMovements, conjunto, rates, accountCurrency, displayCurrency])

  const monthMovements = useMemo(() => movementsInMonth(filteredMovements, month), [filteredMovements, month])
  const breakdownGasto = useMemo(() => categoryBreakdown(monthMovements, categories, 'gasto'), [monthMovements, categories])
  const breakdownIngreso = useMemo(() => categoryBreakdown(monthMovements, categories, 'ingreso'), [monthMovements, categories])

  const months = useMemo(() => lastMonths(6, month), [month])
  const evolutionData = useMemo(
    () =>
      months.map((m) => {
        const inMonth = filteredMovements.filter((mv) => toMonthKey(mv.date) === m)
        const { income, expense, balance } = totalsFor(inMonth)
        return { month: monthLabelShort(m), Ingresos: income, Gastos: expense, Balance: balance }
      }),
    [months, filteredMovements]
  )

  const boxes = useMemo(() => savingsBoxesOf(profile?.dashboardWidgets ?? []), [profile?.dashboardWidgets])

  const sufijoMoneda = conjunto ? ` · ${displayCurrency} aprox.` : availableCurrencies.length > 1 ? ` · ${displayCurrency}` : ''

  // Con una categoría concreta, repartir por categoría sería una sola porción
  // del 100%: ahí la pregunta útil pasa a ser de qué cuentas salió esa plata.
  const categoriaSel = categories.find((c) => c.id === categoryId)
  const slicesDe = (tipo: 'gasto' | 'ingreso'): DonutSlice[] => {
    if (categoriaSel) {
      return accountBreakdown(monthMovements, accounts, tipo).map((a, i) => ({
        id: a.id,
        label: a.label,
        color: colorAt(i),
        total: a.total,
      }))
    }
    const items = tipo === 'gasto' ? breakdownGasto : breakdownIngreso
    return items.map((i) => ({
      id: i.category.id,
      label: i.category.name,
      icon: i.category.icon,
      color: i.category.color,
      total: i.total,
    }))
  }
  const tituloTorta = categoriaSel ? `${categoriaSel.icon} ${categoriaSel.name} por cuenta` : 'Distribución por categoría'
  const lineKey = type === 'ambos' ? 'Balance' : type === 'gasto' ? 'Gastos' : 'Ingresos'
  const lineTitulo = type === 'ambos' ? 'Balance mensual' : type === 'gasto' ? 'Gastos por mes' : 'Ingresos por mes'

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
          <Card padding="sm">
            <div className="toolbar mb-[var(--sp-3)]">
              <SelectInput
                aria-label="Cuenta"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">Todas las cuentas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} ({a.moneda})
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                aria-label="Categoría"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </SelectInput>
              {conjunto && (
                <SelectInput
                  aria-label="Moneda en la que ver el conjunto"
                  value={combinedIn}
                  onChange={(e) => setCombinedIn(e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      Ver en {c.code}
                    </option>
                  ))}
                </SelectInput>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[var(--sp-3)]">
              <div className="flex flex-col md:flex-row md:items-center gap-[var(--sp-3)]">
                <Segmented
                  aria-label="Tipo de movimiento"
                  options={[
                    { value: 'ambos', label: 'Ambos' },
                    { value: 'gasto', label: 'Gastos' },
                    { value: 'ingreso', label: 'Ingresos' },
                  ]}
                  value={type}
                  onChange={setType}
                />
                {/* Con una cuenta elegida la moneda ya está fijada por ella. */}
                {!account && availableCurrencies.length > 1 && (
                  <Segmented
                    aria-label="Moneda"
                    options={[
                      ...availableCurrencies.map((code) => ({ value: code as CurrencyFilter, label: code })),
                      { value: 'conjunto' as CurrencyFilter, label: '≈ Conjunto' },
                    ]}
                    value={currencyFilter}
                    onChange={setCurrency}
                  />
                )}
              </div>
              <MonthSelector month={month} onChange={setMonth} className="w-full md:w-fit md:shrink-0" />
            </div>

            {conjunto && (
              <p className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-[var(--sp-3)]">
                ≈ Vista aproximada: se suman todas las monedas convertidas a {displayCurrency} con la tasa de hoy.
                {ratesLoading && ' Cargando tasas…'}
                {sinTasa.length > 0 && ` No se pudo convertir ${sinTasa.join(', ')}, quedó por fuera.`}
              </p>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="t-h3 mb-[var(--sp-4)]">
              {tituloTorta}
              {sufijoMoneda}
            </h2>
            {type === 'ambos' ? (
              <div className="flex flex-col lg:flex-row gap-[var(--sp-5)]">
                <div className="flex-1 min-w-0">
                  <DonutBreakdown titulo="Gastos" slices={slicesDe('gasto')} currency={displayCurrency} />
                </div>
                <div className="flex-1 min-w-0">
                  <DonutBreakdown titulo="Ingresos" slices={slicesDe('ingreso')} currency={displayCurrency} />
                </div>
              </div>
            ) : (
              <DonutBreakdown slices={slicesDe(type)} currency={displayCurrency} ancho />
            )}
          </Card>

          <Card padding="lg">
            <h2 className="t-h3 mb-1">Evolución financiera</h2>
            <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-[var(--sp-4)]">
              Últimos 6 meses{sufijoMoneda}
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={compactTick} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), displayCurrency)} />
                  <Legend />
                  {type !== 'gasto' && <Bar dataKey="Ingresos" fill="var(--color-income)" radius={[6, 6, 0, 0]} />}
                  {type !== 'ingreso' && <Bar dataKey="Gastos" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="t-h3 mb-1">
              {lineTitulo}
              {sufijoMoneda}
            </h2>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={compactTick} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(value) => formatAmount(Number(value), displayCurrency)} />
                  <Line type="monotone" dataKey={lineKey} stroke="var(--color-accent)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {boxes.length > 0 && (
            <SavingsBoxesChart
              boxes={boxes}
              accounts={accounts}
              months={months}
              displayCurrency={displayCurrency}
              convert={convert}
              selectedId={boxId}
              onSelect={setBoxId}
              compactTick={compactTick}
            />
          )}
        </>
      )}
    </div>
  )
}
