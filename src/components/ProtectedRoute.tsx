import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { Loading } from './Loading'

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <Loading />

  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.activo === false) return <Navigate to="/login" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
