import type { Account, Budget, Movement, Category, Currency, Transfer, DashboardWidgetConfig, SavingsBoxConfig } from '../types/models'
import { CURRENCIES } from '../types/models'
import { toMonthKey } from './date'

// Suma lo apartado en cajas de ahorro asociadas a una cuenta: es una reserva
// sobre su saldo, no un movimiento — no aparece en ingresos/gastos.
export function reservedForAccount(widgets: DashboardWidgetConfig[], accountId: string): number {
  return widgets
    .filter((w) => w.type === 'savingsBox' && w.box.accountId === accountId)
    .reduce((sum, w) => sum + (w.type === 'savingsBox' ? w.box.current : 0), 0)
}

export interface SavingsBoxItem {
  id: string
  box: SavingsBoxConfig
}

// Las cajas de ahorro no son una colección aparte: viven como widgets dentro
// del perfil. El id del widget es estable, así que sirve para seleccionarlas.
export function savingsBoxesOf(widgets: DashboardWidgetConfig[]): SavingsBoxItem[] {
  return widgets.flatMap((w) => (w.type === 'savingsBox' ? [{ id: w.id, box: w.box }] : []))
}

// Cuánto tenía la caja al cerrar ese mes. El historial empezó a registrarse
// después de que las cajas ya existían, así que se reconstruye hacia atrás
// desde el monto actual (que sí es real) restando los movimientos posteriores.
export function savingsBoxBalanceAt(box: SavingsBoxConfig, monthKey: string): number {
  const posteriores = (box.history ?? [])
    .filter((e) => toMonthKey(e.date) > monthKey)
    .reduce((sum, e) => sum + e.delta, 0)
  return box.current - posteriores
}

// La moneda de un movimiento es la de su cuenta. Los movimientos sin cuenta
// (datos anteriores a que existieran las cuentas) se asumen en COP.
export function currencyOf(movement: Movement, accountCurrency: Map<string, Currency>): Currency {
  return (movement.accountId ? accountCurrency.get(movement.accountId) : undefined) ?? 'COP'
}

// Neto (ingresos − gastos) desglosado por moneda, en el orden oficial de
// CURRENCIES. Solo incluye las monedas que realmente aparecen en la lista.
export function netByCurrency(
  movements: Movement[],
  accountCurrency: Map<string, Currency>
): { currency: Currency; net: number }[] {
  const totals = new Map<Currency, number>()
  for (const m of movements) {
    const c = currencyOf(m, accountCurrency)
    totals.set(c, (totals.get(c) ?? 0) + (m.type === 'ingreso' ? m.amount : -m.amount))
  }
  return CURRENCIES.filter((c) => totals.has(c.code)).map((c) => ({ currency: c.code, net: totals.get(c.code)! }))
}

export function movementsInMonth(movements: Movement[], monthKey: string): Movement[] {
  return movements.filter((m) => toMonthKey(m.date) === monthKey)
}

export function totalsFor(movements: Movement[]) {
  let income = 0
  let expense = 0
  for (const m of movements) {
    if (m.type === 'ingreso') income += m.amount
    else expense += m.amount
  }
  return { income, expense, balance: income - expense }
}

// Para tarjetas de crédito, el "balance" representa la deuda: gastos - pagos recibidos.
export function accountBalance(account: Account, movements: Movement[], transfers: Transfer[]): number {
  const gastos = movements.filter((m) => m.accountId === account.id && m.type === 'gasto').reduce((s, m) => s + m.amount, 0)
  const ingresos = movements.filter((m) => m.accountId === account.id && m.type === 'ingreso').reduce((s, m) => s + m.amount, 0)
  const salidas = transfers.filter((t) => t.fromAccountId === account.id).reduce((s, t) => s + t.fromAmount, 0)
  const entradas = transfers.filter((t) => t.toAccountId === account.id).reduce((s, t) => s + t.toAmount, 0)

  if (account.tipo === 'tarjeta_credito') {
    return gastos - entradas
  }
  return ingresos - gastos - salidas + entradas
}

// Si el presupuesto aplica al mes que se está viendo. 'solo-este-mes' (o sin
// vigencia, presupuestos viejos) es exacto; 'cada-mes' y 'rango' cubren desde
// su mes de inicio hasta `hasta` (o para siempre si no tiene).
export function budgetAplicaEnMes(budget: Budget, month: string): boolean {
  const vigencia = budget.vigencia ?? 'solo-este-mes'
  if (vigencia === 'solo-este-mes') return budget.month === month
  return budget.month <= month && (!budget.hasta || month <= budget.hasta)
}

// Todos los presupuestos de una categoría que aplican a este mes, en esta
// moneda — puede haber más de uno si además hay uno de otra moneda o si
// (por error) se solapan dos con la misma. `budgetForCategory` elige uno.
export function budgetsApplicableTo(budgets: Budget[], categoryId: string, month: string, currency: Currency): Budget[] {
  return budgets.filter(
    (b) => b.categoryId === categoryId && (b.currency ?? 'COP') === currency && budgetAplicaEnMes(b, month)
  )
}

// El más específico gana: uno de un solo mes manda sobre uno recurrente o de
// rango que también cubra ese mes; entre recurrentes/rango, el que empezó
// más tarde (el más reciente).
export function budgetForCategory(budgets: Budget[], categoryId: string, month: string, currency: Currency): Budget | undefined {
  const candidatos = budgetsApplicableTo(budgets, categoryId, month, currency)
  if (candidatos.length === 0) return undefined
  const exacto = candidatos.find((b) => (b.vigencia ?? 'solo-este-mes') === 'solo-este-mes')
  if (exacto) return exacto
  return [...candidatos].sort((a, b) => b.month.localeCompare(a.month))[0]
}

export interface BudgetStatus {
  spent: number
  available: number
  pct: number
  overBudget: boolean
  nearLimit: boolean
}

// `movements` va SIN filtrar por mes: un presupuesto de 'rango' necesita ver
// varios meses para acumular. `month` es el mes que se está mostrando.
export function budgetStatusFor(
  budget: Budget,
  movements: Movement[],
  accountCurrency: Map<string, Currency>,
  currency: Currency,
  month: string
): BudgetStatus {
  const esRango = (budget.vigencia ?? 'solo-este-mes') === 'rango'
  const desde = esRango ? budget.month : month
  const hasta = esRango && budget.hasta && budget.hasta < month ? budget.hasta : month
  const enVentana = movements.filter((m) => {
    const mk = toMonthKey(m.date)
    return mk >= desde && mk <= hasta
  })
  const spent = enVentana
    .filter((m) => m.categoryId === budget.categoryId && m.type === 'gasto' && currencyOf(m, accountCurrency) === currency)
    .reduce((s, m) => s + m.amount, 0)
  const available = budget.amount - spent
  const pct = budget.amount > 0 ? Math.min(100, (spent / budget.amount) * 100) : 0
  const overBudget = spent > budget.amount
  const nearLimit = !overBudget && pct >= 80
  return { spent, available, pct, overBudget, nearLimit }
}

// Un desglose genérico para las gráficas de torta: la entidad puede ser una
// cuenta, un origen, lo que sea. El color lo pone quien lo dibuja.
export interface AmountByKey {
  id: string
  label: string
  total: number
}

function ordenarDesc(map: Map<string, { label: string; total: number }>): AmountByKey[] {
  return Array.from(map.entries())
    .map(([id, v]) => ({ id, label: v.label, total: v.total }))
    .sort((a, b) => b.total - a.total)
}

// De qué cuentas salieron (o entraron) estos movimientos. Sirve cuando ya se
// filtró por una categoría concreta y la torta por categorías no aporta nada.
export function accountBreakdown(movements: Movement[], accounts: Account[], type: 'gasto' | 'ingreso'): AmountByKey[] {
  const map = new Map<string, { label: string; total: number }>()
  for (const m of movements) {
    if (m.type !== type) continue
    const id = m.accountId ?? 'sin-cuenta'
    const label = accounts.find((a) => a.id === m.accountId)?.nombre ?? 'Sin cuenta'
    const entry = map.get(id) ?? { label, total: 0 }
    entry.total += m.amount
    map.set(id, entry)
  }
  return ordenarDesc(map)
}

// De dónde llegó la plata que hay en una caja de ahorro. Solo cuentan los
// aportes (delta > 0); los aportes anteriores a que se registrara el origen
// quedan agrupados como "Sin registrar".
export function savingsOriginBreakdown(box: SavingsBoxConfig, accounts: Account[]): AmountByKey[] {
  const map = new Map<string, { label: string; total: number }>()
  for (const e of box.history ?? []) {
    if (e.delta <= 0) continue
    const id = e.accountId ?? 'sin-registrar'
    const label = accounts.find((a) => a.id === e.accountId)?.nombre ?? 'Sin registrar'
    const entry = map.get(id) ?? { label, total: 0 }
    entry.total += e.delta
    map.set(id, entry)
  }
  return ordenarDesc(map)
}

export interface CategoryBreakdownItem {
  category: Category
  total: number
  percentage: number
  count: number
}

export function categoryBreakdown(
  movements: Movement[],
  categories: Category[],
  type: 'gasto' | 'ingreso' = 'gasto'
): CategoryBreakdownItem[] {
  const filtered = movements.filter((m) => m.type === type)
  const total = filtered.reduce((sum, m) => sum + m.amount, 0)
  const byCategory = new Map<string, { total: number; count: number }>()

  for (const m of filtered) {
    const entry = byCategory.get(m.categoryId) ?? { total: 0, count: 0 }
    entry.total += m.amount
    entry.count += 1
    byCategory.set(m.categoryId, entry)
  }

  const items: CategoryBreakdownItem[] = []
  for (const [categoryId, entry] of byCategory.entries()) {
    const category = categories.find((c) => c.id === categoryId)
    if (!category) continue
    items.push({
      category,
      total: entry.total,
      count: entry.count,
      percentage: total > 0 ? (entry.total / total) * 100 : 0,
    })
  }

  return items.sort((a, b) => b.total - a.total)
}
