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
  type User,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore/lite'
import { auth, db } from './config'
import type { UserProfile } from '../types/models'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string
  signUp: (nombre: string, correo: string, password: string, inviteCode: string) => Promise<boolean>
  signIn: (correo: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
  markNoveltiesSeen: (version: number) => Promise<void>
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
    default:
      return 'Ocurrió un error. Inténtalo de nuevo.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
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

  async function signOut() {
    await firebaseSignOut(auth)
  }

  async function markNoveltiesSeen(version: number) {
    if (!user) return
    await updateDoc(doc(db, 'usuarios', user.uid), { novedadesVistas: version })
    setProfile((prev) => (prev ? { ...prev, novedadesVistas: version } : prev))
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, signUp, signIn, signOut, clearError: () => setError(''), markNoveltiesSeen }}
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
