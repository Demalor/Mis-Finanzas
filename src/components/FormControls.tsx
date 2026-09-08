import { useEffect, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import { CURRENCIES, type Currency, type MovementType } from '../types/models'
import { currencyDecimals, formatAmountInput, parseAmountInput } from '../utils/currency'

// text-[1rem] (16px) fijo, no el fluido --fs-md: por debajo de 16px, iOS Safari
// hace zoom automático al enfocar el campo — con 16px nunca se dispara.
const controlBase =
  'w-full min-h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--sp-4)] py-[var(--sp-3)] text-[1rem] outline-none focus:border-[var(--color-accent)] transition-colors'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-[var(--sp-5)]">
      <span className="block text-[var(--fs-base)] font-semibold text-[var(--color-text)] mb-[var(--sp-2)]">{label}</span>
      {children}
      {hint && <span className="block text-[var(--fs-xs)] text-[var(--color-text-secondary)] mt-1.5">{hint}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlBase} ${props.className ?? ''}`} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlBase} ${props.className ?? ''}`} />
}

export function TypeToggle({ value, onChange }: { value: MovementType; onChange: (v: MovementType) => void }) {
  return (
    <div className="flex bg-[var(--color-muted)] rounded-[var(--radius-lg)] p-[0.3125rem] gap-[var(--sp-1)]">
      <button
        type="button"
        onClick={() => onChange('gasto')}
        aria-pressed={value === 'gasto'}
        className={`flex-1 min-h-[var(--tap)] rounded-[var(--radius-md)] text-[var(--fs-md)] font-semibold transition-colors ${
          value === 'gasto' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'
        }`}
        style={value === 'gasto' ? { color: 'var(--color-expense)' } : undefined}
      >
        ↓ Gasto
      </button>
      <button
        type="button"
        onClick={() => onChange('ingreso')}
        aria-pressed={value === 'ingreso'}
        className={`flex-1 min-h-[var(--tap)] rounded-[var(--radius-md)] text-[var(--fs-md)] font-semibold transition-colors ${
          value === 'ingreso' ? 'bg-[var(--color-surface)] shadow-sm' : 'text-[var(--color-text-secondary)]'
        }`}
        style={value === 'ingreso' ? { color: 'var(--color-income)' } : undefined}
      >
        ↑ Ingreso
      </button>
    </div>
  )
}

export function AmountInput({ value, onChange, currency = 'COP' }: { value: number; onChange: (v: number) => void; currency?: Currency }) {
  const decimals = currencyDecimals(currency)
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '$'
  const [text, setText] = useState(() => formatAmountInput(value, decimals))
  const [focused, setFocused] = useState(false)

  // Mientras se escribe se conserva el texto tal cual (para no perder el
  // separador decimal en cada tecla); solo se reformatea al perder el foco
  // o cuando el valor cambia desde afuera (ej. al limpiar el formulario).
  useEffect(() => {
    if (!focused) setText(formatAmountInput(value, decimals))
  }, [value, decimals, focused])

  return (
    <div className="flex items-stretch rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus-within:border-[var(--color-accent)] transition-colors">
      <span className="flex items-center pl-[var(--sp-4)] pr-1 text-[var(--fs-xl)] font-semibold text-[var(--color-text-secondary)] shrink-0">
        {symbol}
      </span>
      <input
        inputMode={decimals > 0 ? 'decimal' : 'numeric'}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseAmountInput(e.target.value, decimals))
        }}
        onBlur={() => {
          setFocused(false)
          setText(formatAmountInput(value, decimals))
        }}
        placeholder="0"
        aria-label="Valor"
        className="amount w-full min-w-0 min-h-[var(--tap)] bg-transparent pr-[var(--sp-4)] py-[var(--sp-4)] text-[var(--fs-3xl)] font-bold outline-none"
      />
    </div>
  )
}
