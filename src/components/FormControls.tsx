import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import type { MovementType } from '../types/models'
import { formatNumberInput, parseNumberInput } from '../utils/currency'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block mb-5">
      <span className="block text-[15px] font-semibold text-[var(--color-text)] mb-2">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-[var(--color-text-secondary)] mt-1.5">{hint}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[17px] outline-none focus:border-[var(--color-accent)] transition-colors ${props.className ?? ''}`}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[17px] outline-none focus:border-[var(--color-accent)] transition-colors ${props.className ?? ''}`}
    />
  )
}

export function TypeToggle({ value, onChange }: { value: MovementType; onChange: (v: MovementType) => void }) {
  return (
    <div className="flex bg-[var(--color-muted)] rounded-[16px] p-1.5 gap-1">
      <button
        type="button"
        onClick={() => onChange('gasto')}
        aria-pressed={value === 'gasto'}
        className={`flex-1 py-3 rounded-[12px] text-[16px] font-semibold transition-colors ${
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
        className={`flex-1 py-3 rounded-[12px] text-[16px] font-semibold transition-colors ${
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
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[22px] font-semibold text-[var(--color-text-secondary)]">
        $
      </span>
      <input
        inputMode="numeric"
        value={display}
        onChange={(e) => onChange(parseNumberInput(e.target.value))}
        placeholder="0"
        aria-label="Valor"
        className="w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 py-4 text-[26px] font-bold outline-none focus:border-[var(--color-accent)] transition-colors"
      />
    </div>
  )
}
