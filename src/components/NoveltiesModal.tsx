import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useAuth } from '../firebase/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { CURRENT_NOVELTIES_VERSION, NOVELTIES } from '../constants/novelties'

export function NoveltiesModal() {
  const { profile, markNoveltiesSeen } = useAuth()
  const { theme } = useTheme()
  const [dismissed, setDismissed] = useState(false)

  const alreadySeen = (profile?.novedadesVistas ?? 0) >= CURRENT_NOVELTIES_VERSION
  if (!profile || alreadySeen || dismissed) return null

  return (
    <Modal open onClose={() => setDismissed(true)} title="✨ Novedades">
      <img
        src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'isotipo_v.png' : 'isotipo_N.png'}`}
        alt="Nummi"
        className="block mx-auto object-contain mb-5"
        style={{ height: '4.5rem', width: 'auto', maxWidth: 'none' }}
      />
      <p className="text-[var(--fs-base)] mb-5">
        ¡Hola{profile.nombre ? `, ${profile.nombre.split(' ')[0]}` : ''}! 👋 Soy Demalor. Antes que nada, quiero
        presentarte a <strong>Nummi</strong> — el nombre y la cara nueva de esta app que uso yo también todos los
        días. Le dediqué un buen rato a mejorarla, por dentro y por fuera, y quería contarte lo que cambió:
      </p>
      <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-5">
        Un gracias especial a <strong>@nath_villamil</strong>, que le puso el ojo y el talento al rebranding — el
        nombre, los colores y el logo que ves ahora son gracias a ella. 💜
      </p>
      <div className="flex flex-col gap-4 mb-6">
        {NOVELTIES.map((n) => (
          <div key={n.title} className="flex gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--fs-lg)] shrink-0 bg-[var(--color-accent-soft)]">
              {n.icon}
            </div>
            <div>
              <div className="font-semibold text-[var(--fs-md)]">{n.title}</div>
              <div className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">{n.description}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] mb-6">
        Gracias de corazón por usar la app y confiar en ella para tus finanzas. Cualquier cosa rara que veas, me
        avisas. ¡Espero que te sirva! 💜
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
