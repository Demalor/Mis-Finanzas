import type { RecurringMovement, RecurringFrequency } from '../types/models'
import { todayISO, toISODate } from './date'

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
  return toISODate(d)
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

// La próxima fecha que falta confirmar: la más antigua ya vencida, o si no hay
// ninguna vencida, la siguiente que viene (para poder avisar unos días antes).
// No escribe nada — solo calcula, la confirmación real es una acción manual.
export function nextPendingDate(recurring: RecurringMovement, today: string = todayISO()): string | null {
  if (!recurring.active) return null
  const overdue = pendingDatesFor(recurring, today)
  if (overdue.length > 0) return overdue[0]
  return recurring.lastGeneratedDate ? nextDate(recurring.lastGeneratedDate, recurring.frequency) : recurring.startDate
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  mensual: 'Mensual',
  anual: 'Anual',
}
