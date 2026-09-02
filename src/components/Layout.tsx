import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { NoveltiesModal } from './NoveltiesModal'
import { Modal } from './Modal'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/movimientos', label: 'Movimientos', icon: '📋' },
  { to: '/agregar', label: 'Agregar', icon: '➕', highlight: true },
  { to: '/cuentas', label: 'Cuentas', icon: '👛' },
  { to: '/prestamos', label: 'Préstamos', icon: '🤝' },
  { to: '/categorias', label: 'Organización', icon: '🗂️' },
  { to: '/resumen', label: 'Resumen', icon: '🥧' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙️' },
]

// En la barra inferior (móvil) van 4 accesos directos + la burbuja de "Agregar".
// El resto de secciones vive en el menú "Más".
const MOBILE_PRIMARY = ['/', '/movimientos', '/agregar', '/resumen']

export function Layout() {
  const { profile } = useAuth()
  const isAdmin = profile?.rol === 'admin'
  const [moreOpen, setMoreOpen] = useState(false)

  const navItems = isAdmin ? [...NAV_ITEMS, { to: '/administracion', label: 'Administración', icon: '🛡️' }] : NAV_ITEMS
  const primaryItems = navItems.filter((i) => MOBILE_PRIMARY.includes(i.to))
  const moreItems = navItems.filter((i) => !MOBILE_PRIMARY.includes(i.to))

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <NoveltiesModal />
      {/* Sidebar - escritorio */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--sp-4)] py-[var(--sp-6)]">
        <div className="flex items-center gap-[var(--sp-2)] px-3 mb-[var(--sp-6)]">
          <div
            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-white font-bold text-[var(--fs-md)]"
            style={{ background: 'var(--color-accent)' }}
          >
            $
          </div>
          <span className="font-bold text-[var(--fs-lg)]">Mis Finanzas</span>
        </div>

        {profile && (
          <div className="px-3 mb-[var(--sp-4)] pb-[var(--sp-4)] border-b border-[var(--color-border)]">
            <div className="font-semibold text-[var(--fs-sm)] truncate">{profile.nombre}</div>
            <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] truncate">{profile.correo}</div>
          </div>
        )}

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-[var(--tap)] rounded-[var(--radius-md)] text-[var(--fs-md)] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-muted)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--color-accent)' } : undefined)}
            >
              <span className="text-[var(--fs-lg)]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full mx-auto max-w-[var(--container)] px-[var(--sp-4)] py-[var(--sp-6)] pb-28 md:px-[var(--sp-8)] md:py-[var(--sp-7)] md:pb-[var(--sp-7)]">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior - móvil */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around items-center px-1 py-2 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[56px]"
          >
            {({ isActive }) =>
              item.highlight ? (
                <div
                  className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center text-white text-[var(--fs-2xl)] shadow-lg"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {item.icon}
                </div>
              ) : (
                <>
                  <span className="text-[var(--fs-xl)]" style={{ opacity: isActive ? 1 : 0.55 }}>
                    {item.icon}
                  </span>
                  <span
                    className="text-[var(--fs-2xs)] font-semibold"
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                  >
                    {item.label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          aria-label="Más secciones"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[56px]"
        >
          <span className="text-[var(--fs-xl)]" style={{ opacity: moreOpen ? 1 : 0.55 }}>
            ☰
          </span>
          <span
            className="text-[var(--fs-2xs)] font-semibold"
            style={{ color: moreOpen ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
          >
            Más
          </span>
        </button>
      </nav>

      {/* Menú "Más" - solo móvil */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menú" maxWidth="26rem">
        <div className="flex flex-col gap-1">
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-[var(--tap)] rounded-[var(--radius-md)] text-[var(--fs-md)] font-medium ${
                  isActive ? 'text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-muted)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--color-accent)' } : undefined)}
            >
              <span className="text-[var(--fs-lg)]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </div>
  )
}
