import { createContext, useContext } from 'react'
import type { User, AuthCredential } from 'firebase/auth'
import type { Currency, DashboardWidgetConfig, UserProfile } from '../types/models'

export interface PendingGoogleLink {
  email: string
  credential: AuthCredential
}

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string
  pendingGoogleLink: PendingGoogleLink | null
  signUp: (nombre: string, correo: string, password: string, inviteCode: string) => Promise<boolean>
  signIn: (correo: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  completeGoogleLink: (password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
  markNoveltiesSeen: (version: number) => Promise<void>
  updateDashboardWidgets: (widgets: DashboardWidgetConfig[]) => Promise<void>
  completeTour: () => Promise<void>
  updateResumenFijoOculto: (oculto: boolean) => Promise<void>
  updateMonedaPreferida: (moneda: Currency) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
