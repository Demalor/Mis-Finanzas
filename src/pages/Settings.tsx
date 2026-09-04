import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useData } from '../context/DataContext'
import { useAuth } from '../firebase/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { exportBackup, restoreBackup, validateBackup, wipeAllData } from '../firebase/repo'
import { formatDateReadable, todayISO } from '../utils/date'

export function Settings() {
  const { movements, categories, refresh } = useData()
  const { user, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [confirmImport, setConfirmImport] = useState<File | null>(null)

  async function handleExportJSON() {
    if (!user) return
    const backup = await exportBackup(user.uid)
    downloadFile(JSON.stringify(backup, null, 2), `nummi-respaldo-${todayForFile()}.json`, 'application/json')
    setMessage({ text: 'Copia de seguridad exportada correctamente.' })
  }

  function handleExportCSV() {
    const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Valor']
    const rows = movements.map((m) => {
      const cat = categories.find((c) => c.id === m.categoryId)
      return [m.date, m.type === 'ingreso' ? 'Ingreso' : 'Gasto', cat?.name ?? 'Sin categoría', csvEscape(m.description), String(m.amount)]
    })
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    downloadFile('\uFEFF' + csv, `nummi-movimientos-${todayForFile()}.csv`, 'text/csv')
    setMessage({ text: 'Movimientos exportados a CSV correctamente.' })
  }

  async function handleImportConfirmed() {
    if (!confirmImport || !user) return
    try {
      const text = await confirmImport.text()
      const data = JSON.parse(text)
      if (!validateBackup(data)) {
        setMessage({ text: 'El archivo no tiene una estructura válida de copia de seguridad.', error: true })
        setConfirmImport(null)
        return
      }
      await restoreBackup(user.uid, data)
      await refresh()
      setMessage({ text: 'Datos restaurados correctamente.' })
    } catch {
      setMessage({ text: 'No se pudo leer el archivo. Asegúrate de que sea un JSON válido.', error: true })
    }
    setConfirmImport(null)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="page max-w-2xl">
      <div>
        <h1 className="t-h1">Configuración</h1>
        <p className="text-[var(--color-text-secondary)] text-[var(--fs-sm)] mt-1">Tu cuenta, datos y respaldo</p>
      </div>

      {profile && (
        <Card padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-[var(--fs-md)]">{profile.nombre}</div>
            <div className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">{profile.correo}</div>
          </div>
          <Button variant="secondary" onClick={handleSignOut}>
            Cerrar sesión
          </Button>
        </Card>
      )}

      <Card padding="lg" className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-[var(--fs-md)]">Apariencia</div>
          <div className="text-[var(--fs-sm)] text-[var(--color-text-secondary)]">{theme === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado'}</div>
        </div>
        <Button variant="secondary" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </Button>
      </Card>

      <Card padding="lg">
        <h2 className="t-h3 mb-1">Cuentas, préstamos y organización</h2>
        <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] mb-4">
          Cuentas en distintas monedas, préstamos, categorías, fuentes de ingreso y presupuestos.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/cuentas">
            <Button variant="secondary" className="w-full">👛 Ver mis cuentas</Button>
          </Link>
          <Link to="/prestamos">
            <Button variant="secondary" className="w-full">🤝 Ver préstamos</Button>
          </Link>
          <Link to="/categorias">
            <Button variant="secondary" className="w-full">🗂️ Ver organización (categorías, fuentes, presupuestos)</Button>
          </Link>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="t-h3 mb-1">Datos y respaldo</h2>
        <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] mb-5">
          Tu información se guarda de forma privada en la nube, asociada solo a tu cuenta. Crea copias de seguridad periódicamente.
        </p>

        {message && (
          <div
            className="mb-4 px-4 py-3 rounded-[var(--radius-md)] text-[var(--fs-base)] font-medium"
            style={{
              background: message.error ? 'var(--color-expense-soft)' : 'var(--color-income-soft)',
              color: message.error ? 'var(--color-expense)' : 'var(--color-income)',
            }}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={handleExportJSON}>
            📤 Exportar copia de seguridad (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            📥 Importar copia de seguridad (JSON)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setConfirmImport(file)
              e.target.value = ''
            }}
          />
          <Button variant="secondary" onClick={handleExportCSV}>
            📊 Exportar movimientos a CSV (Excel)
          </Button>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="t-h3 mb-1" style={{ color: 'var(--color-expense)' }}>
          Zona de peligro
        </h2>
        <p className="text-[var(--fs-base)] text-[var(--color-text-secondary)] mb-4">
          Esto eliminará permanentemente todos tus movimientos, categorías personalizadas, presupuestos y recurrencias.
        </p>
        <Button variant="danger" onClick={() => setConfirmWipe(true)}>
          Eliminar todos los datos
        </Button>
      </Card>

      <p className="text-[var(--fs-xs)] text-[var(--color-text-secondary)] text-center">
        {movements.length} movimientos guardados · {formatDateReadable(todayISO())}
      </p>

      <ConfirmDialog
        open={confirmWipe}
        title="Eliminar todos los datos"
        message="Esta acción eliminará TODA tu información financiera y no se puede deshacer. Te recomendamos exportar una copia de seguridad antes de continuar."
        confirmLabel="Eliminar todo"
        onCancel={() => setConfirmWipe(false)}
        onConfirm={async () => {
          if (!user) return
          await wipeAllData(user.uid)
          await refresh()
          setConfirmWipe(false)
          navigate('/')
        }}
      />

      <ConfirmDialog
        open={!!confirmImport}
        title="Importar copia de seguridad"
        message="Esto agregará los datos del archivo seleccionado a tu cuenta actual. ¿Deseas continuar?"
        confirmLabel="Importar"
        onCancel={() => setConfirmImport(null)}
        onConfirm={handleImportConfirmed}
      />
    </div>
  )
}

function csvEscape(text: string) {
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function todayForFile() {
  return todayISO()
}
