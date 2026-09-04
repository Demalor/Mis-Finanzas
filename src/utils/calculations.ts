import type { Movement, Category, Currency } from '../types/models'
import { CURRENCIES } from '../types/models'
import { toMonthKey } from './date'

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
