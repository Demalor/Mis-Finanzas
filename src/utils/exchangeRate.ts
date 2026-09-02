import type { Currency } from '../types/models'

// API gratuita, sin necesidad de registro ni API key: fawazahmed0/exchange-api
// Se actualiza una vez al día. Documentación: https://github.com/fawazahmed0/exchange-api
const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies'

export async function fetchExchangeRate(from: Currency, to: Currency): Promise<number | null> {
  if (from === to) return 1
  try {
    const res = await fetch(`${BASE_URL}/${from.toLowerCase()}.json`)
    if (!res.ok) return null
    const data = await res.json()
    const rate = data[from.toLowerCase()]?.[to.toLowerCase()]
    return typeof rate === 'number' ? rate : null
  } catch {
    return null
  }
}
