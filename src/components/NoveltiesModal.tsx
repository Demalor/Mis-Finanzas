import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useAuth } from '../firebase/AuthContext'
import { CURRENT_NOVELTIES_VERSION, NOVELTIES } from '../constants/novelties'

export function NoveltiesModal() {
  const { profile, markNoveltiesSeen } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  const alreadySeen = (profile?.novedadesVistas ?? 0) >= CURRENT_NOVELTIES_VERSION
  if (!profile || alreadySeen || dismissed) return null

  return (
    <Modal open onClose={() => setDismissed(true)} title="✨ Novedades">
      <p className="text-[15px] mb-5">
        ¡Hola{profile.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''}! 👋 Soy Demalor, y quería contarte con mucho
        gusto todo lo nuevo que le acabo de agregar a la app:
      </p>
      <div className="flex flex-col gap-4 mb-6">
        {NOVELTIES.map((n) => (
          <div key={n.title} className="flex gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[20px] shrink-0 bg-[var(--color-accent-soft)]">
              {n.icon}
            </div>
            <div>
              <div className="font-semibold text-[16px]">{n.title}</div>
              <div className="text-[14px] text-[var(--color-text-secondary)]">{n.description}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[15px] text-[var(--color-text-secondary)] mb-6">
        Gracias de corazón por usar la app y confiar en ella para tus finanzas. ¡Espero que te sea de mucha ayuda! 💜
      </p>
      <Button
        className="w-full"
        size="lg"
        onClick={async () => {
          setDismissed(true)
          await markNoveltiesSeen(CURRENT_NOVELTIES_VERSION)
        }}
      >
        ¡Genial, gracias!
      </Button>
    </Modal>
  )
}
