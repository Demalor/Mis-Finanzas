import { useState } from 'react'
import { useAuth } from '../firebase/AuthContext'
import { useData } from '../context/DataContext'
import { WidgetShell } from './widgets/WidgetShell'
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
import { formatAmount } from '../utils/currency'
import { totalsFor, currencyOf, accountBalance, reservedForAccount } from '../utils/calculations'
import type { Currency, DashboardWidgetConfig, DashboardWidgetType, Movement } from '../types/models'

const MAX_WIDGETS = 8

const NEEDS_CONFIG: DashboardWidgetType[] = ['accountBalance', 'budgetStatus', 'categoryTotal', 'quickPay', 'savingsBox']

export function WidgetsPanel({
  preferredCurrency,
  monthMovements,
  accountCurrency,
}: {
  preferredCurrency: Currency
  monthMovements: Movement[]
  accountCurrency: Map<string, Currency>
}) {
  const { profile, updateDashboardWidgets, updateResumenFijoOculto } = useAuth()
  const { accounts, movements, transfers } = useData()
  const widgets = profile?.dashboardWidgets ?? []
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [configuring, setConfiguring] = useState<{ slot: number; type: DashboardWidgetType } | null>(null)
  const [removingSlot, setRemovingSlot] = useState<number | null>(null)

  async function saveAt(slot: number, config: DashboardWidgetConfig) {
    const next = [...widgets]
    next[slot] = config
    await updateDashboardWidgets(next)
    setPickerSlot(null)
    setConfiguring(null)
  }

  async function removeAt(slot: number) {
    await updateDashboardWidgets(widgets.filter((_, i) => i !== slot))
    setRemovingSlot(null)
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
    if (NEEDS_CONFIG.includes(type)) {
      setConfiguring({ slot: pickerSlot, type })
      setPickerSlot(null)
    } else {
      saveAt(pickerSlot, { id: crypto.randomUUID(), type } as DashboardWidgetConfig)
    }
  }

  const balanceTotals = totalsFor(monthMovements.filter((m) => currencyOf(m, accountCurrency) === preferredCurrency))

  return (
    <div>
      <h2 className="t-h3 mb-[var(--sp-3)]">Resumen y widgets</h2>
      <div className="grid grid-cols-2 gap-[var(--sp-3)]">
        {!profile?.resumenFijoOculto && (
          <div className="relative">
            <button
              onClick={() => updateResumenFijoOculto(true)}
              aria-label="Ocultar balance fijo"
              className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-expense-soft)] text-[var(--fs-2xs)]"
            >
              ✕
            </button>
            <WidgetShell
              icon="💰"
              label={`Balance en ${preferredCurrency}`}
              value={formatAmount(balanceTotals.balance, preferredCurrency)}
              sub={`↑${formatAmount(balanceTotals.income, preferredCurrency)} ↓${formatAmount(balanceTotals.expense, preferredCurrency)}`}
              tone={balanceTotals.balance < 0 ? 'expense' : undefined}
            />
          </div>
        )}

        {widgets.map((config, slot) => {
          return (
            <div key={config.id} className="relative">
              <button
                onClick={() => requestRemove(slot)}
                aria-label="Quitar widget"
                className="absolute top-1.5 right-1.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-muted)] hover:bg-[var(--color-expense-soft)] text-[var(--fs-2xs)]"
              >
                ✕
              </button>
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
                      onContribute={(delta) =>
                        saveAt(slot, { ...config, box: { ...config.box, current: Math.max(0, config.box.current + delta) } })
                      }
                    />
                  )
                })()}
            </div>
          )
        })}
      </div>

      {widgets.length < MAX_WIDGETS && (
        <button
          onClick={() => setPickerSlot(widgets.length)}
          className="w-full min-h-[2.5rem] mt-[var(--sp-3)] rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-[var(--fs-sm)] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-muted)] transition-colors"
        >
          + Agregar widget
        </button>
      )}

      <WidgetPickerModal open={pickerSlot !== null} onClose={() => setPickerSlot(null)} onPick={handlePick} />
      {configuring && (
        <WidgetConfigModal
          type={configuring.type}
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
