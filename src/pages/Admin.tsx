import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Loading } from '../components/Loading'
import { createInviteCode, getAllInviteCodes, getAllUsers, setUserActive } from '../firebase/admin'
import { useAuth } from '../firebase/AuthContext'
import type { InviteCode, UserProfile } from '../types/models'
import { formatDateReadable, toISODate } from '../utils/date'

export function Admin() {
  const { profile } = useAuth()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [c, u] = await Promise.all([getAllInviteCodes(), getAllUsers()])
    setCodes(c)
    setUsers(u)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreateCode() {
    if (!profile) return
    setCreating(true)
    await createInviteCode(profile.uid)
    await load()
    setCreating(false)
  }

  async function handleToggleActive(u: UserProfile) {
    await setUserActive(u.uid, !u.activo)
    await load()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  if (loading)
    return <Loading />

  const availableCodes = codes.filter((c) => !c.used)
  const usedCodes = codes.filter((c) => c.used)

  return (
    <div className="page">
      <div>
        <h1 className="t-h1">Administración</h1>
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mt-1">
          Gestiona los códigos de invitación y las cuentas de los usuarios. No puedes ver los movimientos ni montos de nadie.
        </p>
      </div>

      <Card padding="lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <h2 className="t-h3">Códigos de invitación</h2>
          <Button onClick={handleCreateCode} disabled={creating}>
            {creating ? 'Creando…' : '+ Generar código'}
          </Button>
        </div>

        {availableCodes.length === 0 ? (
          <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] mb-2">No hay códigos disponibles. Genera uno nuevo.</p>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {availableCodes.map((c) => (
              <div key={c.code} className="flex items-center justify-between bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] px-4 py-3">
                <span className="font-mono font-bold text-[var(--fs-lg)] tracking-widest" style={{ color: 'var(--color-accent)' }}>
                  {c.code}
                </span>
                <button
                  onClick={() => copyCode(c.code)}
                  className="text-[var(--fs-sm)] font-semibold px-3 py-1.5 rounded-full bg-[var(--color-surface)]"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {copiedCode === c.code ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            ))}
          </div>
        )}

        {usedCodes.length > 0 && (
          <details className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">
            <summary className="cursor-pointer font-medium">Ver códigos ya utilizados ({usedCodes.length})</summary>
            <div className="flex flex-col gap-1 mt-2">
              {usedCodes.map((c) => (
                <div key={c.code} className="flex justify-between py-1">
                  <span className="font-mono">{c.code}</span>
                  <span>usado</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="t-h3 mb-4">Usuarios registrados</h2>
        {users.length === 0 ? (
          <EmptyState icon="👥" title="Aún no hay cuentas registradas" />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {users.map((u) => (
              <div key={u.uid} className="flex items-center gap-3 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--fs-md)] truncate flex items-center gap-2">
                    {u.nombre}
                    {u.rol === 'admin' && (
                      <span
                        className="text-[var(--fs-2xs)] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                      >
                        ADMIN
                      </span>
                    )}
                    {!u.activo && (
                      <span className="text-[var(--fs-2xs)] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-expense-soft)', color: 'var(--color-expense)' }}>
                        DESACTIVADA
                      </span>
                    )}
                  </div>
                  <div className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">
                    {u.correo} · desde {formatDateReadable(toISODate(new Date(u.creadoEn)))}
                  </div>
                  <div className="text-[var(--fs-xs)]" style={{ color: isRecentlyOnline(u.ultimaConexion) ? 'var(--color-income)' : 'var(--color-text-secondary)' }}>
                    {formatLastSeen(u.ultimaConexion)}
                  </div>
                </div>
                {u.rol !== 'admin' && (
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="text-[var(--fs-sm)] font-semibold px-3 py-2 rounded-full border border-[var(--color-border)] shrink-0"
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function isRecentlyOnline(timestamp?: number): boolean {
  if (!timestamp) return false
  return Date.now() - timestamp < 5 * 60 * 1000 // últimos 5 minutos = "en línea ahora"
}

function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return 'Nunca se ha conectado'
  if (isRecentlyOnline(timestamp)) return '🟢 En línea ahora'

  const diffMs = Date.now() - timestamp
  const minutes = Math.floor(diffMs / (60 * 1000))
  const hours = Math.floor(diffMs / (60 * 60 * 1000))
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (minutes < 60) return `Última vez hace ${minutes} min`
  if (hours < 24) return `Última vez hace ${hours} h`
  if (days === 1) return 'Última vez ayer'
  if (days < 30) return `Última vez hace ${days} días`
  return `Última vez el ${new Date(timestamp).toLocaleDateString('es-CO')}`
}
