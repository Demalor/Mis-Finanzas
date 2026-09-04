import { getApps, initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore/lite'

// Configuración del proyecto de Firebase de Nummi (proyecto "mis-finanzas-32a6e")
const firebaseConfig = {
  apiKey: 'AIzaSyDuXpM0O4mw9fTFRwEzwdjuYr3HWN8hhI8',
  authDomain: 'mis-finanzas-32a6e.firebaseapp.com',
  projectId: 'mis-finanzas-32a6e',
  storageBucket: 'mis-finanzas-32a6e.firebasestorage.app',
  messagingSenderId: '602683671873',
  appId: '1:602683671873:web:c6f9e633bf2a4634124dc0',
  measurementId: 'G-E2WRK4HB88',
}

// getApps()[0] evita re-inicializar la app en recargas en caliente (HMR).
export const app = getApps()[0] ?? initializeApp(firebaseConfig)
export const auth = getAuth(app)

// ignoreUndefinedProperties: evita que la app se rompa cuando un campo opcional
// (ej. sourceId, cupo, nota) queda como "undefined" en vez de tener un valor.
// initializeFirestore lanza si ya se llamó antes (HMR); en ese caso reusamos.
function initDb() {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true })
  } catch {
    return getFirestore(app)
  }
}
export const db = initDb()

// Solo en desarrollo y con VITE_USE_EMULATOR=1: apunta a los emuladores locales
// en vez de a producción. Para probar reglas y flujos sin tocar datos reales.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
