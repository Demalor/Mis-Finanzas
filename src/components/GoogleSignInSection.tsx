import { useEffect, useState } from 'react'
import { useAuth } from '../firebase/AuthContext'
import { Button } from './Button'
import { Field, TextInput } from './FormControls'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  )
}

export function GoogleSignInSection({ onSuccess }: { onSuccess: () => void }) {
  const { user, profile, pendingGoogleLink, signInWithGoogle, completeGoogleLink, error, clearError } = useAuth()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && profile) onSuccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile])

  if (pendingGoogleLink) {
    return (
      <form
        className="mb-6"
        onSubmit={async (e) => {
          e.preventDefault()
          setLoading(true)
          await completeGoogleLink(password)
          setLoading(false)
        }}
      >
        <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-3">
          Ya existe una cuenta con <strong>{pendingGoogleLink.email}</strong>. Ingresa su contraseña una única vez
          para vincular Google — de ahí en adelante puedes entrar solo con Google, sin volver a pedirte la
          contraseña.
        </p>
        <Field label="Contraseña">
          <TextInput
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearError()
            }}
            placeholder="••••••••"
          />
        </Field>
        {error && (
          <p className="text-[var(--fs-sm)] mb-4 font-medium" style={{ color: 'var(--color-expense)' }}>
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Vinculando…' : 'Vincular y continuar'}
        </Button>
      </form>
    )
  }

  if (user && !profile) {
    return <p className="text-[var(--fs-sm)] text-[var(--color-text-secondary)] mb-6 text-center">Creando tu cuenta…</p>
  }

  return (
    <div className="mb-6">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        icon={<GoogleIcon />}
        onClick={() => signInWithGoogle()}
      >
        Continuar con Google
      </Button>
      {error && !pendingGoogleLink && (
        <p className="text-[var(--fs-sm)] mt-3 font-medium text-center" style={{ color: 'var(--color-expense)' }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-3 mt-6">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[var(--fs-xs)] text-[var(--color-text-secondary)]">o continúa con tu correo</span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>
    </div>
  )
}
