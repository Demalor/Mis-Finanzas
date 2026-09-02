// Formato genérico para cualquiera de las 4 monedas soportadas
const formattersByCurrency: Record<string, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
  CHF: new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 2 }),
}

export function formatAmount(value: number, currency: string): string {
  const formatter = formattersByCurrency[currency] ?? formattersByCurrency.COP
  return formatter.format(Math.round(value))
}

// Para inputs: solo separa miles, sin símbolo de moneda
const plainNumberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function formatNumberInput(value: number): string {
  if (!value || Number.isNaN(value)) return ''
  return plainNumberFormatter.format(value)
}

export function parseNumberInput(text: string): number {
  const clean = text.replace(/[^\d]/g, '')
  return clean ? parseInt(clean, 10) : 0
}
