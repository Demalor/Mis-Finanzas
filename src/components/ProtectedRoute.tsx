import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { useData } from '../context/DataContext'
import { Loading } from './Loading'
import { OnboardingTour } from './OnboardingTour'

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth()
  const { loading: dataLoading } = useData()

  if (loading) return <Loading />

  if (!user) return <Navigate to="/login" replace />
  if (profile && profile.activo === false) return <Navigate to="/login" replace />
  if (adminOnly && profile?.rol !== 'admin') return <Navigate to="/" replace />

  // Solo las cuentas nuevas tienen este campo en false — a las existentes
  // (campo ausente) nunca se les impone el tour retroactivamente.
  if (profile?.tourCompletado === false) return dataLoading ? <Loading /> : <OnboardingTour />

  return <>{children}</>
}
