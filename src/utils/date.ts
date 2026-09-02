const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Formato "YYYY-MM" a partir de una fecha ISO "YYYY-MM-DD"
export function toMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return `${MESES[month - 1]} ${year}`
}

export function monthLabelShort(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return `${MESES_CORTOS[month - 1]} ${String(year).slice(2)}`
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatDateReadable(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MESES_CORTOS[month - 1]} ${year}`
}

// Últimos N meses (incluyendo el actual), en orden cronológico ascendente
export function lastMonths(n: number, fromMonthKey?: string): string[] {
  const base = fromMonthKey ?? currentMonthKey()
  const result: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    result.push(addMonths(base, -i))
  }
  return result
}
