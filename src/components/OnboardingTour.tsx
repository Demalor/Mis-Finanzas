import { useState } from 'react'
import { useAuth } from '../firebase/AuthContext'
import { useData } from '../context/DataContext'
import { useTheme } from '../context/ThemeContext'
import { Button } from './Button'
import { AccountFormModal } from './AccountFormModal'
import { CategoryFormModal } from './CategoryFormModal'
import type { Account, Category } from '../types/models'

const TOTAL_STEPS = 5

export function OnboardingTour() {
  const { profile, completeTour } = useAuth()
  const { accounts, categories, addAccount, addCategory } = useData()
  const { theme } = useTheme()
  const [step, setStep] = useState(0)
  const [addingAccount, setAddingAccount] = useState(false)
  const [addingCategory, setAddingCategory] = useState(false)

  const firstName = profile?.nombre?.split(' ')[0] ?? ''

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div className="flex-1 overflow-y-auto flex items-center justify-center px-[var(--sp-4)] py-[var(--sp-6)]">
        <div className="w-full max-w-sm">
          {step === 0 && <WelcomeStep firstName={firstName} theme={theme} />}
          {step === 1 && <AccountStep accounts={accounts} onAdd={() => setAddingAccount(true)} />}
          {step === 2 && <CategoryStep categories={categories} onAdd={() => setAddingCategory(true)} />}
          {step === 3 && <TipsStep />}
          {step === 4 && <FinishStep />}
        </div>
      </div>

      <div className="px-[var(--sp-4)] pt-[var(--sp-3)]" style={{ paddingBottom: 'calc(var(--sp-5) + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-center gap-1.5 mb-[var(--sp-4)]">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === step ? 'var(--color-accent)' : 'var(--color-border)' }} />
          ))}
        </div>
        <div className="max-w-sm mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Atrás
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          ) : (
            <Button className="flex-1" onClick={completeTour}>
              Empezar a usar Nummi
            </Button>
          )}
        </div>
        {step < TOTAL_STEPS - 1 && (
          <button onClick={completeTour} className="w-full text-center mt-3 min-h-[2rem] text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
            Omitir por ahora
          </button>
        )}
      </div>

      <AccountFormModal
        open={addingAccount}
        onClose={() => setAddingAccount(false)}
        onSave={async (data) => {
          await addAccount(data)
          setAddingAccount(false)
        }}
      />
      <CategoryFormModal
        open={addingCategory}
        defaultType="gasto"
        onClose={() => setAddingCategory(false)}
        onSave={async (data) => {
          await addCategory(data)
          setAddingCategory(false)
        }}
      />
    </div>
  )
}

function WelcomeStep({ firstName, theme }: { firstName: string; theme: 'light' | 'dark' }) {
  return (
    <div className="text-center">
      <img
        src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'isotipo_v.png' : 'isotipo_N.png'}`}
        alt="Nummi"
        className="block mx-auto object-contain mb-6"
        style={{ height: '4.5rem', width: 'auto', maxWidth: 'none' }}
      />
      <h1 className="t-h1 mb-2">¡Hola{firstName ? `, ${firstName}` : ''}! 👋</h1>
      <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)]">
        Bienvenido a Nummi. En un par de pasos te dejamos todo listo para controlar tus ingresos y gastos.
      </p>
    </div>
  )
}

function AccountStep({ accounts, onAdd }: { accounts: Account[]; onAdd: () => void }) {
  return (
    <div>
      <h2 className="t-h2 mb-2">Tu cuenta</h2>
      <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)] mb-4">
        Ya te creamos una cuenta de <strong>Efectivo (COP)</strong> para que puedas empezar de una. Si usas un banco o
        una tarjeta, agrégala ahora — puedes tener las que quieras, cada una en su propia moneda.
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-muted)]">
            <span className="text-[var(--fs-lg)]">{a.tipo === 'tarjeta_credito' ? '💳' : a.tipo === 'banco' ? '🏦' : '💵'}</span>
            <span className="font-medium text-[var(--fs-sm)]">
              {a.nombre} · {a.moneda}
            </span>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="w-full" onClick={onAdd}>
        + Agregar otra cuenta
      </Button>
    </div>
  )
}

function CategoryStep({ categories, onAdd }: { categories: Category[]; onAdd: () => void }) {
  const sample = categories.filter((c) => c.type === 'gasto').slice(0, 6)
  return (
    <div>
      <h2 className="t-h2 mb-2">Tus categorías</h2>
      <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)] mb-4">
        Ya vienen {categories.length} categorías listas para gastos e ingresos, como estas:
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {sample.map((c) => (
          <span
            key={c.id}
            className="px-3 py-1.5 rounded-full text-[var(--fs-sm)] font-medium"
            style={{ background: `${c.color}22`, color: c.color }}
          >
            {c.icon} {c.name}
          </span>
        ))}
      </div>
      <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mb-4">
        ¿Te falta alguna? Puedes agregar, editar o borrar categorías cuando quieras desde "Organización".
      </p>
      <Button variant="secondary" className="w-full" onClick={onAdd}>
        + Agregar una categoría
      </Button>
    </div>
  )
}

const TIPS = [
  { icon: '💱', text: 'Cada cuenta tiene su propia moneda — los totales nunca se mezclan entre monedas distintas.' },
  { icon: '🔁', text: 'Los movimientos que se repiten (arriendo, salario) se registran solos como "recurrentes".' },
  { icon: '🎯', text: 'Ponle un presupuesto mensual a cualquier categoría de gasto para no pasarte.' },
  { icon: '🧩', text: 'En Inicio puedes armar tu propio panel de widgets: saldos, presupuestos, y hasta una caja de ahorro.' },
  { icon: '🌙', text: 'Cambia entre modo claro y oscuro desde Inicio o Configuración.' },
]

function TipsStep() {
  return (
    <div>
      <h2 className="t-h2 mb-4">Cómo sacarle el jugo a Nummi</h2>
      <div className="flex flex-col gap-4">
        {TIPS.map((tip) => (
          <div key={tip.text} className="flex gap-3">
            <span className="text-[var(--fs-lg)] shrink-0">{tip.icon}</span>
            <p className="text-[var(--fs-sm)] text-[var(--color-text)]">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FinishStep() {
  return (
    <div className="text-center">
      <div className="text-[var(--fs-3xl)] mb-3">🎉</div>
      <h2 className="t-h2 mb-2">¡Listo!</h2>
      <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)]">
        Ya tienes todo lo necesario para empezar. Cualquier cosa que quieras ajustar, la encuentras en Configuración.
      </p>
    </div>
  )
}
