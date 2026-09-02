import type { Movement, Category } from '../types/models'
import { toMonthKey } from './date'

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
