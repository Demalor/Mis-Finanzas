import type { RecurringMovement, RecurringFrequency } from '../types/models'
import { todayISO } from './date'

function nextDate(isoDate: string, frequency: RecurringFrequency): string {
  const d = new Date(isoDate + 'T00:00:00')
  switch (frequency) {
    case 'diaria':
      d.setDate(d.getDate() + 1)
      break
    case 'semanal':
      d.setDate(d.getDate() + 7)
      break
    case 'mensual':
      d.setMonth(d.getMonth() + 1)
      break
    case 'anual':
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().slice(0, 10)
}

// Calcula qué fechas de movimientos deben generarse para una recurrencia,
// desde la última generada (o la fecha de inicio) hasta hoy.
export function pendingDatesFor(recurring: RecurringMovement, today: string = todayISO()): string[] {
  if (!recurring.active) return []
  const dates: string[] = []
  let cursor = recurring.lastGeneratedDate
    ? nextDate(recurring.lastGeneratedDate, recurring.frequency)
    : recurring.startDate

  // Límite de seguridad para evitar bucles infinitos con datos corruptos
  let guard = 0
  while (cursor <= today && guard < 2000) {
    dates.push(cursor)
    cursor = nextDate(cursor, recurring.frequency)
    guard++
  }
  return dates
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  mensual: 'Mensual',
  anual: 'Anual',
}
