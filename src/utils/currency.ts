// Formato genérico para cualquiera de las 4 monedas soportadas
const formattersByCurrency: Record<string, Intl.NumberFormat> = {
  COP: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }),
  CHF: new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 2 }),
}

export function formatAmount(value: number, currency: string): string {
  const formatter = formattersByCurrency[currency] ?? formattersByCurrency.COP
  return formatter.format(value)
}

// El peso colombiano no usa centavos en la práctica; las demás sí.
export function currencyDecimals(currency: string): number {
  return currency === 'COP' ? 0 : 2
}

// Para inputs: solo separa miles, sin símbolo de moneda
export function formatAmountInput(value: number, decimals: number): string {
  if (!value || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}

// Se aceptan las dos convenciones (157,06 y 157.06) porque la moneda no dice
// cómo teclea la persona: el último separador seguido de 1-2 dígitos es el
// decimal, cualquier otro es separador de miles y se descarta.
export function parseAmountInput(text: string, decimals: number): number {
  let intPart = text
  let fracPart = ''
  if (decimals > 0) {
    const match = text.match(/[.,](\d{1,2})$/)
    if (match) {
      fracPart = match[1]
      intPart = text.slice(0, -match[0].length)
    }
  }
  const digits = intPart.replace(/\D/g, '')
  const units = digits ? parseInt(digits, 10) : 0
  if (!fracPart) return units
  return units + parseInt(fracPart.padEnd(decimals, '0'), 10) / 10 ** decimals
}
