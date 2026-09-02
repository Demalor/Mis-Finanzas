import type { ReactNode } from 'react'

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** 'mobile' (por defecto): ancho completo en móvil, ajustado en `md`.
      'always': siempre ancho completo. 'fit': siempre ajustado al contenido. */
  fill?: 'mobile' | 'always' | 'fit'
  className?: string
  'aria-label'?: string
}

/**
 * Control de pestañas tipo píldora, unificado. Altura de área táctil,
 * tipografía fluida, y scroll horizontal si las opciones no caben
 * (en vez de aplastarse o envolver en dos filas).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  fill = 'mobile',
  className = '',
  'aria-label': ariaLabel,
}: SegmentedProps<T>) {
  const container =
    fill === 'always' ? 'w-full' : fill === 'fit' ? 'w-fit' : 'w-full md:w-fit'
  const btn =
    fill === 'always' ? 'flex-1' : fill === 'fit' ? 'flex-none' : 'flex-1 md:flex-none'

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-[var(--sp-1)] p-[0.3125rem] bg-[var(--color-muted)] rounded-[var(--radius-lg)] overflow-x-auto no-scrollbar ${container} ${className}`}
    >
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={`${btn} shrink-0 whitespace-nowrap min-h-[var(--tap)] px-[var(--sp-4)] rounded-[var(--radius-md)] text-[var(--fs-md)] font-semibold transition-colors ${
              selected
                ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
