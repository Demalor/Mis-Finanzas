import { Modal } from '../Modal'
import type { DashboardWidgetType } from '../../types/models'

const OPTIONS: { type: DashboardWidgetType; icon: string; label: string; description: string }[] = [
  { type: 'accountBalance', icon: '👛', label: 'Saldo de una cuenta', description: 'El balance de una cuenta específica.' },
  { type: 'budgetStatus', icon: '🎯', label: 'Estado de un presupuesto', description: 'Cuánto llevas gastado y disponible en una categoría.' },
  { type: 'categoryTotal', icon: '🗂️', label: 'Total de una categoría', description: 'Suma de ingresos o gastos de este mes en una categoría.' },
  { type: 'currencyBreakdown', icon: '🧮', label: 'Balance por moneda', description: 'Un total por cada moneda con movimientos este mes.' },
  { type: 'combinedTotal', icon: '💱', label: 'Total combinado', description: 'Convierte todo a una sola moneda con la tasa del día.' },
  { type: 'quickPay', icon: '⚡', label: 'Pago rápido', description: 'Un botón para registrar un movimiento frecuente de un toque.' },
  { type: 'savingsBox', icon: '🐷', label: 'Caja de ahorro', description: 'Una meta de ahorro aparte, con su propia moneda.' },
]

export function WidgetPickerModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (type: DashboardWidgetType) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Agregar widget">
      <div className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            onClick={() => onPick(o.type)}
            className="flex items-start gap-3 p-[var(--sp-3)] rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] text-left"
          >
            <span className="text-[var(--fs-xl)]">{o.icon}</span>
            <span>
              <span className="block font-semibold text-[var(--fs-md)]">{o.label}</span>
              <span className="block text-[var(--fs-sm)] text-[var(--color-text-secondary)]">{o.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
