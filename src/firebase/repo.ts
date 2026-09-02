import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  setDoc,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore/lite'
import { db } from './config'
import type {
  Movement,
  Category,
  Budget,
  RecurringMovement,
  BackupData,
  Account,
  IncomeSource,
  Transfer,
  Loan,
} from '../types/models'
import { DEFAULT_CATEGORIES } from './defaultCategories'

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function col(userId: string, name: string) {
  return collection(db, 'usuarios', userId, name)
}

// Firestore rechaza los lotes de más de 500 operaciones. Troceamos por debajo
// de ese límite para que importar / borrar / generar en masa nunca falle.
const BATCH_LIMIT = 450

type WriteOp =
  | { op: 'set'; ref: DocumentReference; data: object }
  | { op: 'update'; ref: DocumentReference; data: object }
  | { op: 'delete'; ref: DocumentReference }

async function commitInBatches(ops: WriteOp[]) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const o of ops.slice(i, i + BATCH_LIMIT)) {
      if (o.op === 'set') batch.set(o.ref, o.data as DocumentData)
      else if (o.op === 'update') batch.update(o.ref, o.data as DocumentData)
      else batch.delete(o.ref)
    }
    await batch.commit()
  }
}

// Crea las categorías por defecto la primera vez que un usuario entra
export async function ensureSeeded(userId: string) {
  const catSnap = await getDocs(col(userId, 'categorias'))
  if (catSnap.empty) {
    const batch = writeBatch(db)
    for (const cat of DEFAULT_CATEGORIES) {
      batch.set(doc(col(userId, 'categorias'), cat.id), cat)
    }
    await batch.commit()
  }

  // Migración: si no hay cuentas creadas todavía, se crea una por defecto
  // y se le asignan los movimientos existentes que no tuvieran cuenta.
  const accSnap = await getDocs(col(userId, 'cuentas'))
  if (accSnap.empty) {
    const defaultAccount: Account = {
      id: 'acc-efectivo-cop-default',
      nombre: 'Efectivo',
      moneda: 'COP',
      tipo: 'efectivo',
      activa: true,
    }
    await setDoc(doc(col(userId, 'cuentas'), defaultAccount.id), defaultAccount)

    const movSnap = await getDocs(col(userId, 'movimientos'))
    const toMigrate = movSnap.docs.filter((d) => !d.data().accountId)
    if (toMigrate.length > 0) {
      const batch = writeBatch(db)
      for (const d of toMigrate) batch.update(d.ref, { accountId: defaultAccount.id })
      await batch.commit()
    }
  }
}

// ---------- Movimientos ----------

export async function getAllMovements(userId: string): Promise<Movement[]> {
  const snap = await getDocs(col(userId, 'movimientos'))
  return snap.docs.map((d) => d.data() as Movement)
}

export async function addMovement(userId: string, input: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now()
  const movement: Movement = { ...input, id: uid('mov'), createdAt: now, updatedAt: now }
  await setDoc(doc(col(userId, 'movimientos'), movement.id), movement)
  return movement
}

// Alta en masa (usado al generar movimientos recurrentes pendientes)
export async function addMovements(userId: string, inputs: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>[]) {
  const now = Date.now()
  const movements: Movement[] = inputs.map((input) => ({ ...input, id: uid('mov'), createdAt: now, updatedAt: now }))
  await commitInBatches(
    movements.map((m) => ({ op: 'set', ref: doc(col(userId, 'movimientos'), m.id), data: m }))
  )
  return movements
}

export async function updateMovement(userId: string, id: string, changes: Partial<Movement>) {
  await setDoc(doc(col(userId, 'movimientos'), id), { ...changes, updatedAt: Date.now() }, { merge: true })
}

export async function deleteMovement(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'movimientos'), id))
}

export async function deleteMovements(userId: string, ids: string[]) {
  await commitInBatches(ids.map((id) => ({ op: 'delete', ref: doc(col(userId, 'movimientos'), id) })))
}

// ---------- Categorías ----------

export async function getAllCategories(userId: string): Promise<Category[]> {
  const snap = await getDocs(col(userId, 'categorias'))
  return snap.docs.map((d) => d.data() as Category)
}

export async function addCategory(userId: string, input: Omit<Category, 'id' | 'isDefault'>) {
  const category: Category = { ...input, id: uid('cat'), isDefault: false }
  await setDoc(doc(col(userId, 'categorias'), category.id), category)
  return category
}

export async function updateCategory(userId: string, id: string, changes: Partial<Category>) {
  await setDoc(doc(col(userId, 'categorias'), id), changes, { merge: true })
}

export async function deleteCategory(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'categorias'), id))
}

// ---------- Presupuestos ----------

export async function getAllBudgets(userId: string): Promise<Budget[]> {
  const snap = await getDocs(col(userId, 'presupuestos'))
  return snap.docs.map((d) => d.data() as Budget)
}

export async function upsertBudget(userId: string, input: Omit<Budget, 'id'> & { id?: string }) {
  const budget: Budget = { ...input, id: input.id ?? uid('bud') }
  await setDoc(doc(col(userId, 'presupuestos'), budget.id), budget)
  return budget
}

export async function deleteBudget(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'presupuestos'), id))
}

// ---------- Movimientos recurrentes ----------

export async function getAllRecurring(userId: string): Promise<RecurringMovement[]> {
  const snap = await getDocs(col(userId, 'recurrentes'))
  return snap.docs.map((d) => d.data() as RecurringMovement)
}

export async function addRecurring(userId: string, input: Omit<RecurringMovement, 'id'>) {
  const recurring: RecurringMovement = { ...input, id: uid('rec') }
  await setDoc(doc(col(userId, 'recurrentes'), recurring.id), recurring)
  return recurring
}

export async function updateRecurring(userId: string, id: string, changes: Partial<RecurringMovement>) {
  await setDoc(doc(col(userId, 'recurrentes'), id), changes, { merge: true })
}

export async function deleteRecurring(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'recurrentes'), id))
}

// ---------- Cuentas ----------

export async function getAllAccounts(userId: string): Promise<Account[]> {
  const snap = await getDocs(col(userId, 'cuentas'))
  return snap.docs.map((d) => d.data() as Account)
}

export async function addAccount(userId: string, input: Omit<Account, 'id'>) {
  const account: Account = { ...input, id: uid('acc') }
  await setDoc(doc(col(userId, 'cuentas'), account.id), account)
  return account
}

export async function updateAccount(userId: string, id: string, changes: Partial<Account>) {
  await setDoc(doc(col(userId, 'cuentas'), id), changes, { merge: true })
}

export async function deleteAccount(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'cuentas'), id))
}

// ---------- Fuentes de ingreso ----------

export async function getAllIncomeSources(userId: string): Promise<IncomeSource[]> {
  const snap = await getDocs(col(userId, 'fuentesIngreso'))
  return snap.docs.map((d) => d.data() as IncomeSource)
}

export async function addIncomeSource(userId: string, input: Omit<IncomeSource, 'id'>) {
  const source: IncomeSource = { ...input, id: uid('src') }
  await setDoc(doc(col(userId, 'fuentesIngreso'), source.id), source)
  return source
}

export async function updateIncomeSource(userId: string, id: string, changes: Partial<IncomeSource>) {
  await setDoc(doc(col(userId, 'fuentesIngreso'), id), changes, { merge: true })
}

export async function deleteIncomeSource(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'fuentesIngreso'), id))
}

// ---------- Transferencias (cambio de moneda / pagos) ----------

export async function getAllTransfers(userId: string): Promise<Transfer[]> {
  const snap = await getDocs(col(userId, 'transferencias'))
  return snap.docs.map((d) => d.data() as Transfer)
}

export async function addTransfer(userId: string, input: Omit<Transfer, 'id' | 'createdAt'>) {
  const transfer: Transfer = { ...input, id: uid('trf'), createdAt: Date.now() }
  await setDoc(doc(col(userId, 'transferencias'), transfer.id), transfer)
  return transfer
}

export async function deleteTransfer(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'transferencias'), id))
}

// ---------- Préstamos ----------

export async function getAllLoans(userId: string): Promise<Loan[]> {
  const snap = await getDocs(col(userId, 'prestamos'))
  return snap.docs.map((d) => d.data() as Loan)
}

export async function addLoan(userId: string, input: Omit<Loan, 'id'>) {
  const loan: Loan = { ...input, id: uid('loan') }
  await setDoc(doc(col(userId, 'prestamos'), loan.id), loan)
  return loan
}

export async function updateLoan(userId: string, id: string, changes: Partial<Loan>) {
  await setDoc(doc(col(userId, 'prestamos'), id), changes, { merge: true })
}

export async function deleteLoan(userId: string, id: string) {
  await deleteDoc(doc(col(userId, 'prestamos'), id))
}

// ---------- Respaldo ----------

export async function exportBackup(userId: string): Promise<BackupData> {
  const [movements, categories, budgets, recurring, accounts, incomeSources, transfers, loans] = await Promise.all([
    getAllMovements(userId),
    getAllCategories(userId),
    getAllBudgets(userId),
    getAllRecurring(userId),
    getAllAccounts(userId),
    getAllIncomeSources(userId),
    getAllTransfers(userId),
    getAllLoans(userId),
  ])
  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    movements,
    categories,
    budgets,
    recurring,
    accounts,
    incomeSources,
    transfers,
    loans,
  }
}

export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.movements) && Array.isArray(d.categories) && Array.isArray(d.budgets) && Array.isArray(d.recurring)
}

const ALL_COLLECTIONS = [
  'movimientos',
  'categorias',
  'presupuestos',
  'recurrentes',
  'cuentas',
  'fuentesIngreso',
  'transferencias',
  'prestamos',
] as const

export async function restoreBackup(userId: string, data: BackupData) {
  const ops: WriteOp[] = []
  const push = (name: string, id: string, docData: object) =>
    ops.push({ op: 'set', ref: doc(col(userId, name), id), data: docData })

  for (const m of data.movements) push('movimientos', m.id, m)
  for (const c of data.categories) push('categorias', c.id, c)
  for (const b of data.budgets) push('presupuestos', b.id, b)
  for (const r of data.recurring) push('recurrentes', r.id, r)
  for (const a of data.accounts ?? []) push('cuentas', a.id, a)
  for (const s of data.incomeSources ?? []) push('fuentesIngreso', s.id, s)
  for (const t of data.transfers ?? []) push('transferencias', t.id, t)
  for (const l of data.loans ?? []) push('prestamos', l.id, l)

  await commitInBatches(ops)
}

export async function wipeAllData(userId: string) {
  for (const name of ALL_COLLECTIONS) {
    const snap = await getDocs(col(userId, name))
    await commitInBatches(snap.docs.map((d) => ({ op: 'delete', ref: d.ref })))
  }
}
