import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/FormControls'
import { GoogleSignInSection } from '../components/GoogleSignInSection'

export function Login() {
  const { signIn, error, clearError } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const ok = await signIn(correo, password)
    setLoading(false)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'isotipo_v.png' : 'isotipo_N.png'}`}
            alt="Nummi"
            className="block mx-auto object-contain mb-3"
            style={{ height: '3.5rem', width: 'auto', maxWidth: 'none' }}
          />
          <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)]">Inicia sesión para continuar</p>
        </div>

        <Card padding="lg">
          <GoogleSignInSection onSuccess={() => navigate('/')} />
          <form onSubmit={handleSubmit}>
            <Field label="Correo electrónico">
              <TextInput
                type="email"
                required
                autoFocus
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value)
                  clearError()
                }}
                placeholder="tucorreo@ejemplo.com"
              />
            </Field>
            <Field label="Contraseña">
              <TextInput
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearError()
                }}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="text-[var(--fs-base)] mb-4 font-medium" style={{ color: 'var(--color-expense)' }}>
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[var(--fs-base)] text-[var(--color-text-secondary)] mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold" style={{ color: 'var(--color-accent-ink)' }}>
            Regístrate con un código de invitación
          </Link>
        </p>
      </div>
    </div>
  )
}
