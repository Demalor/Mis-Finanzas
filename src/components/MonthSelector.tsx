import { addMonths, monthLabel } from '../utils/date'

export function MonthSelector({
  month,
  onChange,
  className = 'w-fit',
}: {
  month: string
  onChange: (m: string) => void
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-[var(--sp-2)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] px-[var(--sp-2)] py-1 ${className}`}
    >
      <button
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mes anterior"
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-lg)]"
      >
        ‹
      </button>
      <span className="flex-1 text-[var(--fs-md)] font-semibold min-w-[7rem] text-center capitalize">
        {monthLabel(month)}
      </span>
      <button
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mes siguiente"
        className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[var(--fs-lg)]"
      >
        ›
      </button>
    </div>
  )
}
