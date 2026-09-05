import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithCredential,
  type User,
  type AuthCredential,
} from 'firebase/auth'
import type { FirebaseError } from 'firebase/app'
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore/lite'
import { auth, db } from './config'
import type { DashboardWidgetConfig, UserProfile } from '../types/models'

const googleProvider = new GoogleAuthProvider()

interface PendingGoogleLink {
  email: string
  credential: AuthCredential
}

interface AuthContextValue {
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
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este correo.'
    case 'auth/invalid-email':
      return 'El correo no es válido.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'auth/credential-already-in-use':
      return 'Esta cuenta de Google ya está vinculada a otro usuario de Nummi.'
    default:
      return 'Ocurrió un error. Inténtalo de nuevo.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingGoogleLink, setPendingGoogleLink] = useState<PendingGoogleLink | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile)
        } else if (firebaseUser.providerData.some((p) => p.providerId === 'google.com')) {
          // Primer login con Google para este correo: se crea el perfil de una,
          // sin código de invitación (decisión explícita: Google se lo salta).
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            nombre: firebaseUser.displayName ?? '',
            correo: firebaseUser.email ?? '',
            rol: 'miembro',
            activo: true,
            creadoEn: Date.now(),
            tourCompletado: false,
          }
          await setDoc(doc(db, 'usuarios', firebaseUser.uid), newProfile)
          setProfile(newProfile)
        } else {
          setProfile(null)
        }
        // Registra "última conexión" sin bloquear la carga (no crítico si falla)
        updateDoc(doc(db, 'usuarios', firebaseUser.uid), { ultimaConexion: Date.now() }).catch(() => {})
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signUp(nombre: string, correo: string, password: string, inviteCode: string): Promise<boolean> {
    setError('')
    const normalizedCode = inviteCode.trim().toUpperCase()
    if (!normalizedCode) {
      setError('Ingresa el código de invitación.')
      return false
    }

    try {
      // Verifica y reserva el código de invitación de forma atómica ANTES de crear la cuenta,
      // para no dejar códigos "gastados" si algo falla después.
      const codeRef = doc(db, 'codigosInvitacion', normalizedCode)
      const codeSnap = await getDoc(codeRef)
      if (!codeSnap.exists()) {
        setError('El código de invitación no existe.')
        return false
      }
      if (codeSnap.data().used) {
        setError('Este código de invitación ya fue utilizado.')
        return false
      }

      const credential = await createUserWithEmailAndPassword(auth, correo, password)

      const newProfile: UserProfile = {
        uid: credential.user.uid,
        nombre: nombre.trim(),
        correo,
        rol: 'miembro',
        activo: true,
        creadoEn: Date.now(),
        tourCompletado: false,
      }

      try {
        await setDoc(doc(db, 'usuarios', credential.user.uid), newProfile)
        await runTransaction(db, async (tx) => {
          const freshCode = await tx.get(codeRef)
          if (!freshCode.exists() || freshCode.data().used) {
            throw new Error('code-already-used')
          }
          tx.update(codeRef, {
            used: true,
            usedBy: credential.user.uid,
            usedAt: serverTimestamp(),
          })
        })
      } catch {
        // Algo falló DESPUÉS de crear la cuenta (típicamente: alguien usó el
        // código entre la verificación y ahora). Deshacemos la cuenta a medias
        // para que se pueda reintentar sin dejar un usuario huérfano.
        await deleteDoc(doc(db, 'usuarios', credential.user.uid)).catch(() => {})
        await deleteUser(credential.user).catch(() => {})
        setError('No se pudo reservar el código de invitación (quizá alguien lo usó primero). Intenta con otro código.')
        return false
      }

      setProfile(newProfile)
      return true
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      setError(code ? mapAuthError(code) : 'No se pudo completar el registro. Intenta de nuevo.')
      return false
    }
  }

  async function signIn(correo: string, password: string): Promise<boolean> {
    setError('')
    try {
      const credential = await signInWithEmailAndPassword(auth, correo, password)
      const snap = await getDoc(doc(db, 'usuarios', credential.user.uid))
      if (snap.exists() && snap.data().activo === false) {
        await firebaseSignOut(auth)
        setError('Tu cuenta está desactivada. Contacta al administrador.')
        return false
      }
      return true
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      setError(code ? mapAuthError(code) : 'No se pudo iniciar sesión.')
      return false
    }
  }

  async function signInWithGoogle() {
    setError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/account-exists-with-different-credential') {
        const email = (err as { customData?: { email?: string } }).customData?.email
        const credential = GoogleAuthProvider.credentialFromError(err as FirebaseError)
        if (email && credential) {
          setPendingGoogleLink({ email, credential })
          return
        }
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      setError(code ? mapAuthError(code) : 'No se pudo iniciar sesión con Google.')
    }
  }

  async function completeGoogleLink(password: string): Promise<boolean> {
    if (!pendingGoogleLink) return false
    setError('')
    try {
      const result = await signInWithEmailAndPassword(auth, pendingGoogleLink.email, password)
      await linkWithCredential(result.user, pendingGoogleLink.credential)
      setPendingGoogleLink(null)
      return true
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      setError(code ? mapAuthError(code) : 'No se pudo vincular la cuenta.')
      return false
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  async function markNoveltiesSeen(version: number) {
    if (!user) return
    await updateDoc(doc(db, 'usuarios', user.uid), { novedadesVistas: version })
    setProfile((prev) => (prev ? { ...prev, novedadesVistas: version } : prev))
  }

  async function updateDashboardWidgets(widgets: DashboardWidgetConfig[]) {
    if (!user) return
    await updateDoc(doc(db, 'usuarios', user.uid), { dashboardWidgets: widgets })
    setProfile((prev) => (prev ? { ...prev, dashboardWidgets: widgets } : prev))
  }

  async function completeTour() {
    if (!user) return
    await updateDoc(doc(db, 'usuarios', user.uid), { tourCompletado: true })
    setProfile((prev) => (prev ? { ...prev, tourCompletado: true } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        pendingGoogleLink,
        signUp,
        signIn,
        signInWithGoogle,
        completeGoogleLink,
        signOut,
        clearError: () => setError(''),
        markNoveltiesSeen,
        updateDashboardWidgets,
        completeTour,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
