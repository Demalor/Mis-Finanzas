import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

// Configuración del proyecto de Firebase "Mis-Finanzas"
const firebaseConfig = {
  apiKey: 'AIzaSyDuXpM0O4mw9fTFRwEzwdjuYr3HWN8hhI8',
  authDomain: 'mis-finanzas-32a6e.firebaseapp.com',
  projectId: 'mis-finanzas-32a6e',
  storageBucket: 'mis-finanzas-32a6e.firebasestorage.app',
  messagingSenderId: '602683671873',
  appId: '1:602683671873:web:c6f9e633bf2a4634124dc0',
  measurementId: 'G-E2WRK4HB88',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// ignoreUndefinedProperties: evita que la app se rompa cuando un campo opcional
// (ej. sourceId, cupo, nota) queda como "undefined" en vez de tener un valor.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
