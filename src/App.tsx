import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './firebase/AuthContext'
import { DataProvider } from './context/DataContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loading } from './components/Loading'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'

// Carga perezosa: estas pantallas no se descargan hasta que la persona
// realmente las visita. "Resumen" en particular incluye la librería de
// gráficos (recharts), que pesa bastante y no hace falta antes de entrar ahí.
const AddMovement = lazy(() => import('./pages/AddMovement').then((m) => ({ default: m.AddMovement })))
const MovementsList = lazy(() => import('./pages/MovementsList').then((m) => ({ default: m.MovementsList })))
const Categories = lazy(() => import('./pages/Categories').then((m) => ({ default: m.Categories })))
const Summary = lazy(() => import('./pages/Summary').then((m) => ({ default: m.Summary })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const Accounts = lazy(() => import('./pages/Accounts').then((m) => ({ default: m.Accounts })))
const Loans = lazy(() => import('./pages/Loans').then((m) => ({ default: m.Loans })))

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Register />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/agregar" element={<AddMovement />} />
                <Route path="/editar/:id" element={<AddMovement />} />
                <Route path="/movimientos" element={<MovementsList />} />
                <Route path="/cuentas" element={<Accounts />} />
                <Route path="/prestamos" element={<Loans />} />
                <Route path="/categorias" element={<Categories />} />
                <Route path="/resumen" element={<Summary />} />
                <Route path="/configuracion" element={<Settings />} />
                <Route
                  path="/administracion"
                  element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  )
}

export default App
