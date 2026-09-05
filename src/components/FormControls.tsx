import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import type { MovementType } from '../types/models'
import { formatNumberInput, parseNumberInput } from '../utils/currency'

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

export function AmountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const display = formatNumberInput(value)
  return (
    <div className="relative">
      <span className="absolute left-[var(--sp-4)] top-1/2 -translate-y-1/2 text-[var(--fs-xl)] font-semibold text-[var(--color-text-secondary)]">
        $
      </span>
      <input
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseNumberInput(e.target.value))}
        placeholder="0"
        aria-label="Valor"
        className="amount w-full min-h-[var(--tap)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-[var(--sp-4)] py-[var(--sp-4)] text-[var(--fs-3xl)] font-bold outline-none focus:border-[var(--color-accent)] transition-colors"
      />
    </div>
  )
}
