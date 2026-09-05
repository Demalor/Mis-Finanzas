import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/FormControls'
import { GoogleSignInSection } from '../components/GoogleSignInSection'

export function Register() {
  const { signUp, error, clearError } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const ok = await signUp(nombre, correo, password, inviteCode)
    setLoading(false)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}${theme === 'dark' ? 'isotipo_v.png' : 'isotipo_N.png'}`}
            alt="Nummi"
            className="block mx-auto object-contain mb-3"
            style={{ height: '3.5rem', width: 'auto', maxWidth: 'none' }}
          />
          <h1 className="t-h1">Crear cuenta</h1>
          <p className="text-[var(--color-text-secondary)] text-[var(--fs-base)]">Necesitas un código de invitación para crear tu cuenta</p>
        </div>

        <Card padding="lg">
          <GoogleSignInSection onSuccess={() => navigate('/')} />
          <form onSubmit={handleSubmit}>
            <Field label="Código de invitación">
              <TextInput
                required
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase())
                  clearError()
                }}
                placeholder="Ej. AB3D9F2K"
                className="tracking-widest font-semibold uppercase"
              />
            </Field>
            <Field label="Nombre">
              <TextInput
                required
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  clearError()
                }}
                placeholder="Tu nombre"
              />
            </Field>
            <Field label="Correo electrónico">
              <TextInput
                type="email"
                required
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value)
                  clearError()
                }}
                placeholder="tucorreo@ejemplo.com"
              />
            </Field>
            <Field label="Contraseña" hint="Al menos 6 caracteres">
              <TextInput
                type="password"
                required
                minLength={6}
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
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[var(--fs-base)] text-[var(--color-text-secondary)] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold" style={{ color: 'var(--color-accent-ink)' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
