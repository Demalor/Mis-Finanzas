import { useTheme } from '../context/ThemeContext'

/** Splash de carga a pantalla completa, consistente en toda la app. */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  const { theme } = useTheme()
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
      style={{ background: 'var(--color-bg)' }}
    >
      <img
        src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'isotipo_v.png' : 'isotipo_N.png'}`}
        alt="Nummi"
        className="splash-logo object-contain"
        style={{ height: '5rem', width: 'auto', maxWidth: 'none' }}
      />
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="splash-dot w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)', animationDelay: '0s' }} />
        <span className="splash-dot w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)', animationDelay: '0.15s' }} />
        <span className="splash-dot w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)', animationDelay: '0.3s' }} />
      </div>
      <span className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">{label}</span>
    </div>
  )
}
