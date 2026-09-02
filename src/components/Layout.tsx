import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { NoveltiesModal } from './NoveltiesModal'

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

// En la barra inferior (móvil) mostramos solo los ítems más importantes
const MOBILE_TABS = ['/', '/movimientos', '/agregar', '/resumen', '/configuracion']

export function Layout() {
  const { profile } = useAuth()
  const isAdmin = profile?.rol === 'admin'

  const navItems = isAdmin ? [...NAV_ITEMS, { to: '/administracion', label: 'Administración', icon: '🛡️' }] : NAV_ITEMS

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      <NoveltiesModal />
      {/* Sidebar - escritorio */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6">
        <div className="flex items-center gap-2 px-3 mb-6">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[16px]"
            style={{ background: 'var(--color-accent)' }}
          >
            $
          </div>
          <span className="font-bold text-[18px]">Mis Finanzas</span>
        </div>

        {profile && (
          <div className="px-3 mb-4 pb-4 border-b border-[var(--color-border)]">
            <div className="font-semibold text-[15px] truncate">{profile.nombre}</div>
            <div className="text-[13px] text-[var(--color-text-secondary)] truncate">{profile.correo}</div>
          </div>
        )}

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-[14px] text-[16px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-muted)]'
                }`
              }
              style={({ isActive }) => (isActive ? { background: 'var(--color-accent)' } : undefined)}
            >
              <span className="text-[19px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 pb-28 md:pb-10 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior - móvil */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-around items-center px-1 py-2 z-40"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {NAV_ITEMS.filter((i) => MOBILE_TABS.includes(i.to)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[52px]"
          >
            {({ isActive }) =>
              item.highlight ? (
                <div
                  className="w-14 h-14 -mt-6 rounded-full flex items-center justify-center text-white text-[26px] shadow-lg"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {item.icon}
                </div>
              ) : (
                <>
                  <span className="text-[22px]" style={{ opacity: isActive ? 1 : 0.55 }}>
                    {item.icon}
                  </span>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                  >
                    {item.label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
