// Pruebas de las reglas de Firestore (firestore.rules) contra el emulador.
// Se corren con:  npm run test:rules
//
// Cada prueba verifica un permiso concreto: que un usuario NO pueda tocar los
// datos de otro, que nadie se auto-ascienda a admin, y que los códigos de
// invitación solo se consuman una vez y por quien corresponde.

import { readFileSync } from 'node:fs'
import { test, before, after, beforeEach } from 'node:test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, setLogLevel } from 'firebase/firestore'

setLogLevel('error')

const PROJECT_ID = 'demo-misfinanzas'
const ADMIN = 'admin-uid'
const A = 'user-a'
const B = 'user-b'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  })
})

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'usuarios', ADMIN), { uid: ADMIN, nombre: 'Admin', correo: 'admin@x.com', rol: 'admin', activo: true, creadoEn: 1 })
    await setDoc(doc(db, 'usuarios', A), { uid: A, nombre: 'A', correo: 'a@x.com', rol: 'miembro', activo: true, creadoEn: 2 })
    await setDoc(doc(db, 'usuarios', B), { uid: B, nombre: 'B', correo: 'b@x.com', rol: 'miembro', activo: true, creadoEn: 3 })
    await setDoc(doc(db, 'usuarios', A, 'movimientos', 'm1'), { id: 'm1', amount: 100, type: 'gasto' })
    await setDoc(doc(db, 'codigosInvitacion', 'CODE1234'), { code: 'CODE1234', createdBy: ADMIN, createdAt: 1, used: false })
  })
})

const as = (uid) => (uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore())
const bypass = (fn) => testEnv.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()))

// ---------- Perfiles ----------

test('A puede leer su propio perfil', async () => {
  await assertSucceeds(getDoc(doc(as(A), 'usuarios', A)))
})

test('A NO puede leer el perfil de B', async () => {
  await assertFails(getDoc(doc(as(A), 'usuarios', B)))
})

test('admin puede leer el perfil de cualquiera', async () => {
  await assertSucceeds(getDoc(doc(as(ADMIN), 'usuarios', A)))
})

test('A NO puede listar la colección usuarios', async () => {
  await assertFails(getDocs(collection(as(A), 'usuarios')))
})

test('admin SÍ puede listar usuarios', async () => {
  await assertSucceeds(getDocs(collection(as(ADMIN), 'usuarios')))
})

test('A NO puede auto-ascender a admin', async () => {
  await assertFails(updateDoc(doc(as(A), 'usuarios', A), { rol: 'admin' }))
})

test('A NO puede cambiar su propio activo', async () => {
  await assertFails(updateDoc(doc(as(A), 'usuarios', A), { activo: false }))
})

test('A NO puede cambiar su nombre (solo 4 campos permitidos)', async () => {
  await assertFails(updateDoc(doc(as(A), 'usuarios', A), { nombre: 'Otro' }))
})

test('A SÍ puede actualizar ultimaConexion / novedadesVistas / dashboardWidgets / tourCompletado', async () => {
  await assertSucceeds(updateDoc(doc(as(A), 'usuarios', A), { ultimaConexion: 123 }))
  await assertSucceeds(updateDoc(doc(as(A), 'usuarios', A), { novedadesVistas: 3 }))
  await assertSucceeds(
    updateDoc(doc(as(A), 'usuarios', A), { dashboardWidgets: [{ id: 'w1', type: 'combinedTotal' }] })
  )
  await assertSucceeds(updateDoc(doc(as(A), 'usuarios', A), { tourCompletado: true }))
})

test('admin SÍ puede desactivar a un miembro', async () => {
  await assertSucceeds(updateDoc(doc(as(ADMIN), 'usuarios', A), { activo: false }))
})

test('admin NO puede promover a un miembro (solo puede tocar activo)', async () => {
  await assertFails(updateDoc(doc(as(ADMIN), 'usuarios', A), { rol: 'admin' }))
})

test('admin NO puede desactivar a otro admin', async () => {
  await bypass((db) => setDoc(doc(db, 'usuarios', 'admin2'), { uid: 'admin2', nombre: 'A2', correo: 'a2@x.com', rol: 'admin', activo: true, creadoEn: 4 }))
  await assertFails(updateDoc(doc(as(ADMIN), 'usuarios', 'admin2'), { activo: false }))
})

test('nadie puede borrar un perfil', async () => {
  await assertFails(deleteDoc(doc(as(ADMIN), 'usuarios', A)))
})

// ---------- Registro (create del perfil) ----------

test('registro: A puede crear su perfil como miembro/activo', async () => {
  await bypass((db) => deleteDoc(doc(db, 'usuarios', A)))
  await assertSucceeds(setDoc(doc(as(A), 'usuarios', A), { uid: A, nombre: 'A', correo: 'a@x.com', rol: 'miembro', activo: true, creadoEn: 9 }))
})

test('registro: A NO puede crearse ya como admin', async () => {
  await bypass((db) => deleteDoc(doc(db, 'usuarios', A)))
  await assertFails(setDoc(doc(as(A), 'usuarios', A), { uid: A, nombre: 'A', correo: 'a@x.com', rol: 'admin', activo: true, creadoEn: 9 }))
})

test('registro: A NO puede crear el perfil de otro uid', async () => {
  await bypass((db) => deleteDoc(doc(db, 'usuarios', B)))
  await assertFails(setDoc(doc(as(A), 'usuarios', B), { uid: B, nombre: 'B', correo: 'b@x.com', rol: 'miembro', activo: true, creadoEn: 9 }))
})

// ---------- Datos financieros ----------

test('A SÍ puede leer/escribir/borrar sus propios movimientos', async () => {
  await assertSucceeds(setDoc(doc(as(A), 'usuarios', A, 'movimientos', 'm2'), { id: 'm2', amount: 50, type: 'ingreso' }))
  await assertSucceeds(getDocs(collection(as(A), 'usuarios', A, 'movimientos')))
  await assertSucceeds(deleteDoc(doc(as(A), 'usuarios', A, 'movimientos', 'm1')))
})

test('B NO puede leer los movimientos de A', async () => {
  await assertFails(getDocs(collection(as(B), 'usuarios', A, 'movimientos')))
  await assertFails(getDoc(doc(as(B), 'usuarios', A, 'movimientos', 'm1')))
})

test('B NO puede escribir en los movimientos de A', async () => {
  await assertFails(setDoc(doc(as(B), 'usuarios', A, 'movimientos', 'x'), { id: 'x', amount: 1, type: 'gasto' }))
})

test('admin NO puede leer los movimientos de A', async () => {
  await assertFails(getDocs(collection(as(ADMIN), 'usuarios', A, 'movimientos')))
})

test('sin sesión NO puede leer movimientos de nadie', async () => {
  await assertFails(getDoc(doc(as(null), 'usuarios', A, 'movimientos', 'm1')))
})

// ---------- Códigos de invitación ----------

test('código: lectura puntual sin sesión permitida', async () => {
  await assertSucceeds(getDoc(doc(as(null), 'codigosInvitacion', 'CODE1234')))
})

test('código: listar sin ser admin falla (con o sin sesión)', async () => {
  await assertFails(getDocs(collection(as(A), 'codigosInvitacion')))
  await assertFails(getDocs(collection(as(null), 'codigosInvitacion')))
})

test('código: admin SÍ puede listar y crear', async () => {
  await assertSucceeds(getDocs(collection(as(ADMIN), 'codigosInvitacion')))
  await assertSucceeds(setDoc(doc(as(ADMIN), 'codigosInvitacion', 'NEW12345'), { code: 'NEW12345', createdBy: ADMIN, createdAt: 2, used: false }))
})

test('código: un miembro NO puede crear códigos', async () => {
  await assertFails(setDoc(doc(as(A), 'codigosInvitacion', 'NEW12345'), { code: 'NEW12345', createdBy: A, createdAt: 2, used: false }))
})

test('código: A SÍ puede consumir un código marcándose usedBy a sí mismo', async () => {
  await assertSucceeds(updateDoc(doc(as(A), 'codigosInvitacion', 'CODE1234'), { used: true, usedBy: A, usedAt: 123 }))
})

test('código: A NO puede marcar usedBy = otro', async () => {
  await assertFails(updateDoc(doc(as(A), 'codigosInvitacion', 'CODE1234'), { used: true, usedBy: B, usedAt: 123 }))
})

test('código: A NO puede tocar otros campos al consumirlo', async () => {
  await assertFails(updateDoc(doc(as(A), 'codigosInvitacion', 'CODE1234'), { used: true, usedBy: A, usedAt: 1, createdBy: A }))
})

test('código: uno ya usado NO se puede volver a consumir', async () => {
  await bypass((db) => updateDoc(doc(db, 'codigosInvitacion', 'CODE1234'), { used: true, usedBy: B, usedAt: 1 }))
  await assertFails(updateDoc(doc(as(A), 'codigosInvitacion', 'CODE1234'), { used: true, usedBy: A, usedAt: 2 }))
})

test('código: nadie puede borrar', async () => {
  await assertFails(deleteDoc(doc(as(ADMIN), 'codigosInvitacion', 'CODE1234')))
})
