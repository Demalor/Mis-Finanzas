import { addMonths, monthLabel } from '../utils/date'

export function MonthSelector({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[16px] px-2 py-1.5 w-fit">
      <button
        onClick={() => onChange(addMonths(month, -1))}
        aria-label="Mes anterior"
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[18px]"
      >
        ‹
      </button>
      <span className="text-[16px] font-semibold min-w-[140px] text-center capitalize">{monthLabel(month)}</span>
      <button
        onClick={() => onChange(addMonths(month, 1))}
        aria-label="Mes siguiente"
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-muted)] text-[18px]"
      >
        ›
      </button>
    </div>
  )
}
