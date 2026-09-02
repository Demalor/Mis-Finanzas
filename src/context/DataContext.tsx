import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react'
import type { Movement, Category, Budget, RecurringMovement, Account, IncomeSource, Transfer, Loan } from '../types/models'
import { ensureSeeded } from '../firebase/repo'
import * as repo from '../firebase/repo'
import { pendingDatesFor } from '../utils/recurring'
import { todayISO } from '../utils/date'
import { useAuth } from '../firebase/AuthContext'

interface DataContextValue {
  loading: boolean
  movements: Movement[]
  categories: Category[]
  budgets: Budget[]
  recurring: RecurringMovement[]
  accounts: Account[]
  incomeSources: IncomeSource[]
  transfers: Transfer[]
  loans: Loan[]
  refresh: () => Promise<void>

  addMovement: (input: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateMovement: (id: string, changes: Partial<Movement>) => Promise<void>
  deleteMovement: (id: string) => Promise<void>
  deleteMovements: (ids: string[]) => Promise<void>

  addCategory: (input: Omit<Category, 'id' | 'isDefault'>) => Promise<void>
  updateCategory: (id: string, changes: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  upsertBudget: (input: Omit<Budget, 'id'> & { id?: string }) => Promise<void>
  deleteBudget: (id: string) => Promise<void>

  addRecurring: (input: Omit<RecurringMovement, 'id'>) => Promise<void>
  updateRecurring: (id: string, changes: Partial<RecurringMovement>) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>

  addAccount: (input: Omit<Account, 'id'>) => Promise<void>
  updateAccount: (id: string, changes: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>

  addIncomeSource: (input: Omit<IncomeSource, 'id'>) => Promise<void>
  updateIncomeSource: (id: string, changes: Partial<IncomeSource>) => Promise<void>
  deleteIncomeSource: (id: string) => Promise<void>

  addTransfer: (input: Omit<Transfer, 'id' | 'createdAt'>) => Promise<void>
  deleteTransfer: (id: string) => Promise<void>

  addLoan: (input: Omit<Loan, 'id'>) => Promise<void>
  updateLoan: (id: string, changes: Partial<Loan>) => Promise<void>
  deleteLoan: (id: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

// ---- Helpers de estado local: tras cada mutación actualizamos el array en
// memoria en vez de re-descargar las 8 colecciones de Firestore. ----
type Id = { id: string }
const addOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, item: T) =>
  set((prev) => [...prev, item])
const addMany = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, items: T[]) =>
  set((prev) => [...prev, ...items])
const upsertOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, item: T) =>
  set((prev) => (prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item]))
// Ignora las claves `undefined` para reflejar el `ignoreUndefinedProperties`
// de Firestore (un `undefined` en el merge deja el valor anterior intacto).
const patchOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, id: string, changes: Partial<T>) => {
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) as Partial<T>
  set((prev) => prev.map((x) => (x.id === id ? { ...x, ...clean } : x)))
}
const removeOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, id: string) =>
  set((prev) => prev.filter((x) => x.id !== id))
const removeMany = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, ids: string[]) => {
  const gone = new Set(ids)
  set((prev) => prev.filter((x) => !gone.has(x.id)))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.uid ?? null

  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<Movement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [recurring, setRecurring] = useState<RecurringMovement[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loans, setLoans] = useState<Loan[]>([])

  const loadAll = useCallback(async () => {
    if (!userId) return
    const [m, c, b, r, acc, src, trf, ln] = await Promise.all([
      repo.getAllMovements(userId),
      repo.getAllCategories(userId),
      repo.getAllBudgets(userId),
      repo.getAllRecurring(userId),
      repo.getAllAccounts(userId),
      repo.getAllIncomeSources(userId),
      repo.getAllTransfers(userId),
      repo.getAllLoans(userId),
    ])
    setMovements(m)
    setCategories(c)
    setBudgets(b)
    setRecurring(r)
    setAccounts(acc)
    setIncomeSources(src)
    setTransfers(trf)
    setLoans(ln)
  }, [userId])

  // Genera los movimientos pendientes de cada recurrencia y devuelve lo creado
  // para poder mezclarlo en el estado local sin recargar todo.
  const generateDueRecurring = useCallback(async (): Promise<{ created: Movement[]; touched: Map<string, string> }> => {
    const touched = new Map<string, string>()
    if (!userId) return { created: [], touched }
    const recs = await repo.getAllRecurring(userId)
    const today = todayISO()
    const toCreate: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>[] = []
    for (const r of recs) {
      const pending = pendingDatesFor(r, today)
      if (pending.length === 0) continue
      for (const date of pending) {
        toCreate.push({
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          date,
          description: r.description,
          recurringId: r.id,
          accountId: r.accountId,
          sourceId: r.type === 'ingreso' ? r.sourceId : undefined,
        })
      }
      touched.set(r.id, pending[pending.length - 1])
    }
    if (toCreate.length === 0) return { created: [], touched }
    const created = await repo.addMovements(userId, toCreate)
    await Promise.all(
      [...touched].map(([id, lastGeneratedDate]) => repo.updateRecurring(userId, id, { lastGeneratedDate }))
    )
    return { created, touched }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setMovements([])
      setCategories([])
      setBudgets([])
      setRecurring([])
      setAccounts([])
      setIncomeSources([])
      setTransfers([])
      setLoans([])
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      await ensureSeeded(userId)
      await generateDueRecurring()
      await loadAll()
      setLoading(false)
    })()
  }, [userId, generateDueRecurring, loadAll])

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      movements,
      categories,
      budgets,
      recurring,
      accounts,
      incomeSources,
      transfers,
      loans,
      refresh: loadAll,

      addMovement: async (input) => {
        if (!userId) return
        addOne(setMovements, await repo.addMovement(userId, input))
      },
      updateMovement: async (id, changes) => {
        if (!userId) return
        await repo.updateMovement(userId, id, changes)
        patchOne(setMovements, id, { ...changes, updatedAt: Date.now() })
      },
      deleteMovement: async (id) => {
        if (!userId) return
        await repo.deleteMovement(userId, id)
        removeOne(setMovements, id)
      },
      deleteMovements: async (ids) => {
        if (!userId) return
        await repo.deleteMovements(userId, ids)
        removeMany(setMovements, ids)
      },

      addCategory: async (input) => {
        if (!userId) return
        addOne(setCategories, await repo.addCategory(userId, input))
      },
      updateCategory: async (id, changes) => {
        if (!userId) return
        await repo.updateCategory(userId, id, changes)
        patchOne(setCategories, id, changes)
      },
      deleteCategory: async (id) => {
        if (!userId) return
        await repo.deleteCategory(userId, id)
        removeOne(setCategories, id)
      },

      upsertBudget: async (input) => {
        if (!userId) return
        upsertOne(setBudgets, await repo.upsertBudget(userId, input))
      },
      deleteBudget: async (id) => {
        if (!userId) return
        await repo.deleteBudget(userId, id)
        removeOne(setBudgets, id)
      },

      addRecurring: async (input) => {
        if (!userId) return
        const rec = await repo.addRecurring(userId, input)
        const { created, touched } = await generateDueRecurring()
        setRecurring((prev) =>
          [...prev, rec].map((r) => (touched.has(r.id) ? { ...r, lastGeneratedDate: touched.get(r.id) } : r))
        )
        if (created.length > 0) addMany(setMovements, created)
      },
      updateRecurring: async (id, changes) => {
        if (!userId) return
        await repo.updateRecurring(userId, id, changes)
        patchOne(setRecurring, id, changes)
      },
      deleteRecurring: async (id) => {
        if (!userId) return
        await repo.deleteRecurring(userId, id)
        removeOne(setRecurring, id)
      },

      addAccount: async (input) => {
        if (!userId) return
        addOne(setAccounts, await repo.addAccount(userId, input))
      },
      updateAccount: async (id, changes) => {
        if (!userId) return
        await repo.updateAccount(userId, id, changes)
        patchOne(setAccounts, id, changes)
      },
      deleteAccount: async (id) => {
        if (!userId) return
        await repo.deleteAccount(userId, id)
        removeOne(setAccounts, id)
      },

      addIncomeSource: async (input) => {
        if (!userId) return
        addOne(setIncomeSources, await repo.addIncomeSource(userId, input))
      },
      updateIncomeSource: async (id, changes) => {
        if (!userId) return
        await repo.updateIncomeSource(userId, id, changes)
        patchOne(setIncomeSources, id, changes)
      },
      deleteIncomeSource: async (id) => {
        if (!userId) return
        await repo.deleteIncomeSource(userId, id)
        removeOne(setIncomeSources, id)
      },

      addTransfer: async (input) => {
        if (!userId) return
        addOne(setTransfers, await repo.addTransfer(userId, input))
      },
      deleteTransfer: async (id) => {
        if (!userId) return
        await repo.deleteTransfer(userId, id)
        removeOne(setTransfers, id)
      },

      addLoan: async (input) => {
        if (!userId) return
        addOne(setLoans, await repo.addLoan(userId, input))
      },
      updateLoan: async (id, changes) => {
        if (!userId) return
        await repo.updateLoan(userId, id, changes)
        patchOne(setLoans, id, changes)
      },
      deleteLoan: async (id) => {
        if (!userId) return
        await repo.deleteLoan(userId, id)
        removeOne(setLoans, id)
      },
    }),
    [loading, movements, categories, budgets, recurring, accounts, incomeSources, transfers, loans, loadAll, generateDueRecurring, userId]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider')
  return ctx
}
