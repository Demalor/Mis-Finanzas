import { useState } from 'react'
import { useAuth } from '../firebase/useAuth'
import { useData } from '../context/useData'
import { MonthBalanceWidget } from './widgets/MonthBalanceWidget'
import { AccountBalanceWidget } from './widgets/AccountBalanceWidget'
import { BudgetStatusWidget } from './widgets/BudgetStatusWidget'
import { CategoryTotalWidget } from './widgets/CategoryTotalWidget'
import { CurrencyBreakdownWidget } from './widgets/CurrencyBreakdownWidget'
import { CombinedTotalWidget } from './widgets/CombinedTotalWidget'
import { QuickPayWidget } from './widgets/QuickPayWidget'
import { SavingsBoxWidget } from './widgets/SavingsBoxWidget'
import { WidgetPickerModal } from './widgets/WidgetPickerModal'
import { WidgetConfigModal } from './widgets/WidgetConfigModal'
import { ConfirmDialog } from './ConfirmDialog'
import { accountBalance, reservedForAccount } from '../utils/calculations'
import { todayISO } from '../utils/date'
import type { Currency, DashboardWidgetConfig, DashboardWidgetType, SavingsBoxEntry } from '../types/models'

const MAX_WIDGETS = 16

const NEEDS_CONFIG: DashboardWidgetType[] = ['monthBalance', 'accountBalance', 'budgetStatus', 'categoryTotal', 'quickPay', 'savingsBox']

// Lo que ve alguien que todavía no ha configurado nada. Es solo el punto de
// partida: se puede quitar, cambiar de moneda o mover como cualquier otro.
function widgetsPorDefecto(currency: Currency): DashboardWidgetConfig[] {
  return [{ id: 'balance-inicial', type: 'monthBalance', currency }]
}

export function WidgetsPanel({ preferredCurrency }: { preferredCurrency: Currency }) {
  const { profile, updateDashboardWidgets } = useAuth()
  const { accounts, movements, transfers } = useData()
  const widgets = profile?.dashboardWidgets ?? widgetsPorDefecto(preferredCurrency)
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [configuring, setConfiguring] = useState<{ slot: number; type: DashboardWidgetType; config?: DashboardWidgetConfig } | null>(null)
  const [removingSlot, setRemovingSlot] = useState<number | null>(null)
  // Los controles de cada widget solo salen en modo organizar: con hasta 16
  // widgets en celdas pequeñas, tenerlos siempre encima tapa el contenido.
  const [organizando, setOrganizando] = useState(false)
  // Mover con ‹ › es inviable con 16 widgets (15 toques para llegar arriba):
  // se toma uno y se suelta donde sea, en dos toques.
  const [moviendo, setMoviendo] = useState<number | null>(null)
  // Sin esto, si Firestore rechaza la escritura no pasa absolutamente nada en
  // pantalla y parece que la app se trabó.
  const [error, setError] = useState('')

  async function guardar(next: DashboardWidgetConfig[]) {
    try {
      setError('')
      await updateDashboardWidgets(next)
    } catch (e) {
      setError(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar el cambio.')
    }
  }

  async function saveAt(slot: number, config: DashboardWidgetConfig) {
    const next = [...widgets]
    next[slot] = config
    setPickerSlot(null)
    setConfiguring(null)
    await guardar(next)
  }

  // El orden del array ES el orden en pantalla: sacar de un sitio e insertar
  // en el otro (no intercambiar, para que el resto conserve su orden).
  async function soltarEn(destino: number) {
    if (moviendo === null) return
    if (moviendo === destino) {
      setMoviendo(null)
      return
    }
    const next = [...widgets]
    const [tomado] = next.splice(moviendo, 1)
    next.splice(destino, 0, tomado)
    setMoviendo(null)
    await guardar(next)
  }

  async function removeAt(slot: number) {
    setRemovingSlot(null)
    setMoviendo(null)
    await guardar(widgets.filter((_, i) => i !== slot))
  }

  // Una caja de ahorro asociada a una cuenta representa plata real apartada:
  // quitarla no debe borrar esa reserva sin confirmar primero.
  function requestRemove(slot: number) {
    const config = widgets[slot]
    if (config.type === 'savingsBox' && config.box.accountId && config.box.current > 0) {
      setRemovingSlot(slot)
    } else {
      removeAt(slot)
    }
  }

  function handlePick(type: DashboardWidgetType) {
    if (pickerSlot === null) return
    if (widgets.length >= MAX_WIDGETS) {
      setPickerSlot(null)
      setError(`Ya tienes el máximo de ${MAX_WIDGETS} widgets. Quita alguno para agregar otro.`)
      return
    }
    if (NEEDS_CONFIG.includes(type)) {
      setConfiguring({ slot: pickerSlot, type })
      setPickerSlot(null)
    } else {
      saveAt(pickerSlot, { id: crypto.randomUUID(), type } as DashboardWidgetConfig)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-[var(--sp-3)]">
        <h2 className="t-h3">Resumen y widgets</h2>
        {widgets.length > 0 && (
          <button
            onClick={() => setOrganizando((v) => !v)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[var(--fs-xs)] font-semibold"
            style={
              organizando
                ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                : { background: 'var(--color-muted)', color: 'var(--color-text-secondary)' }
            }
          >
            {organizando ? 'Listo' : '✏️ Organizar'}
          </button>
        )}
      </div>
      {organizando && moviendo !== null && (
        <p className="mb-[var(--sp-3)] px-[var(--sp-3)] py-[var(--sp-2)] rounded-[var(--radius-md)] text-[var(--fs-xs)] font-medium" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent-ink)' }}>
          Tomaste un widget: toca «Aquí» en la posición donde lo quieres dejar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-[var(--sp-3)]">
        {widgets.map((config, slot) => {
          return (
            <div
              key={config.id}
              className="relative rounded-[var(--radius-lg)]"
              style={moviendo === slot ? { outline: '2px solid var(--color-accent)', outlineOffset: '2px' } : undefined}
            >
              {organizando && (
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-[var(--color-surface)] p-0.5 shadow-sm">
                  {moviendo === null ? (
                    <>
                      <button
                        onClick={() => setMoviendo(slot)}
                        aria-label="Mover este widget"
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] text-[var(--fs-2xs)]"
                      >
                        ✥
                      </button>
                      {NEEDS_CONFIG.includes(config.type) && (
                        <button
                          onClick={() => setConfiguring({ slot, type: config.type, config })}
                          aria-label="Editar widget"
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-accent-soft)] text-[var(--fs-2xs)]"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={() => requestRemove(slot)}
                        aria-label="Quitar widget"
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-expense-soft)] text-[var(--fs-2xs)]"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => soltarEn(slot)}
                      aria-label={moviendo === slot ? 'Cancelar movimiento' : 'Soltar aquí'}
                      className="px-2 h-6 flex items-center justify-center rounded-full text-[var(--fs-2xs)] font-semibold"
                      style={
                        moviendo === slot
                          ? { background: 'var(--color-muted)', color: 'var(--color-text-secondary)' }
                          : { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }
                      }
                    >
                      {moviendo === slot ? 'Cancelar' : 'Aquí'}
                    </button>
                  )}
                </div>
              )}
              {config.type === 'monthBalance' && <MonthBalanceWidget config={config} />}
              {config.type === 'accountBalance' && <AccountBalanceWidget config={config} />}
              {config.type === 'budgetStatus' && <BudgetStatusWidget config={config} />}
              {config.type === 'categoryTotal' && <CategoryTotalWidget config={config} />}
              {config.type === 'currencyBreakdown' && <CurrencyBreakdownWidget />}
              {config.type === 'combinedTotal' && <CombinedTotalWidget />}
              {config.type === 'quickPay' && <QuickPayWidget config={config} />}
              {config.type === 'savingsBox' &&
                (() => {
                  const linkedAccount = config.box.accountId ? accounts.find((a) => a.id === config.box.accountId) : undefined
                  // reservedForAccount ya cuenta lo que esta misma caja tiene
                  // reservado, así que lo disponible es justo lo no reservado.
                  const accountAvailable = linkedAccount
                    ? accountBalance(linkedAccount, movements, transfers) - reservedForAccount(widgets, linkedAccount.id)
                    : undefined
                  return (
                    <SavingsBoxWidget
                      box={config.box}
                      accountName={linkedAccount?.nombre}
                      accountAvailable={accountAvailable}
                      accounts={accounts}
                      onContribute={(delta, originAccountId) => {
                        // El monto guardado nunca baja de 0, así que el movimiento
                        // realmente aplicado puede ser menor al pedido al retirar.
                        const current = Math.max(0, config.box.current + delta)
                        const aplicado = current - config.box.current
                        const entry: SavingsBoxEntry = { date: todayISO(), delta: aplicado }
                        // En una caja atada a una cuenta el origen es esa cuenta;
                        // en una independiente, lo que haya dicho la persona.
                        const origen = config.box.accountId ?? originAccountId
                        if (origen && aplicado > 0) entry.accountId = origen
                        const history = [...(config.box.history ?? []), entry]
                        saveAt(slot, { ...config, box: { ...config.box, current, history } })
                      }}
                    />
                  )
                })()}
            </div>
          )
        })}
      </div>

      {error && (
        <p className="mt-[var(--sp-3)] px-[var(--sp-3)] py-[var(--sp-2)] rounded-[var(--radius-md)] text-[var(--fs-sm)] font-medium" style={{ background: 'var(--color-expense-soft)', color: 'var(--color-expense)' }}>
          {error}
        </p>
      )}

      {widgets.length < MAX_WIDGETS ? (
        <button
          onClick={() => setPickerSlot(widgets.length)}
          className="w-full min-h-[2.5rem] mt-[var(--sp-3)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--fs-sm)] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-muted)] transition-colors"
        >
          + Agregar widget
        </button>
      ) : (
        // Al llegar al tope, el botón de agregar desaparecía y aquí abajo —
        // que es donde está la persona tras crear el último— no quedaba ningún
        // control a la vista: parecía que la app no dejaba hacer nada.
        <div className="mt-[var(--sp-3)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-[var(--sp-3)] py-[var(--sp-2)] rounded-[var(--radius-md)] bg-[var(--color-muted)]">
          <span className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
            Llegaste al máximo de {MAX_WIDGETS} widgets.
          </span>
          <button
            onClick={() => setOrganizando(true)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[var(--fs-xs)] font-semibold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            ✏️ Organizar para quitar
          </button>
        </div>
      )}

      <WidgetPickerModal open={pickerSlot !== null} onClose={() => setPickerSlot(null)} onPick={handlePick} />
      {configuring && (
        <WidgetConfigModal
          key={configuring.config?.id ?? 'new'}
          type={configuring.type}
          config={configuring.config}
          onClose={() => setConfiguring(null)}
          onSave={(config) => saveAt(configuring.slot, config)}
        />
      )}

      <ConfirmDialog
        open={removingSlot !== null}
        title="Quitar caja de ahorro"
        message="Esta caja tiene plata apartada de una cuenta. Al quitarla, ese monto deja de estar reservado y vuelve a quedar disponible en la cuenta."
        confirmLabel="Quitar"
        onCancel={() => setRemovingSlot(null)}
        onConfirm={() => removingSlot !== null && removeAt(removingSlot)}
      />
    </div>
  )
}
