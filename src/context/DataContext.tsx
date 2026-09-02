import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

  const generateDueRecurring = useCallback(async () => {
    if (!userId) return
    const recs = await repo.getAllRecurring(userId)
    const today = todayISO()
    for (const r of recs) {
      const pending = pendingDatesFor(r, today)
      if (pending.length === 0) continue
      for (const date of pending) {
        await repo.addMovement(userId, {
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          date,
          description: r.description,
          recurringId: r.id,
        })
      }
      await repo.updateRecurring(userId, r.id, { lastGeneratedDate: pending[pending.length - 1] })
    }
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
        await repo.addMovement(userId, input)
        await loadAll()
      },
      updateMovement: async (id, changes) => {
        if (!userId) return
        await repo.updateMovement(userId, id, changes)
        await loadAll()
      },
      deleteMovement: async (id) => {
        if (!userId) return
        await repo.deleteMovement(userId, id)
        await loadAll()
      },
      deleteMovements: async (ids) => {
        if (!userId) return
        await repo.deleteMovements(userId, ids)
        await loadAll()
      },

      addCategory: async (input) => {
        if (!userId) return
        await repo.addCategory(userId, input)
        await loadAll()
      },
      updateCategory: async (id, changes) => {
        if (!userId) return
        await repo.updateCategory(userId, id, changes)
        await loadAll()
      },
      deleteCategory: async (id) => {
        if (!userId) return
        await repo.deleteCategory(userId, id)
        await loadAll()
      },

      upsertBudget: async (input) => {
        if (!userId) return
        await repo.upsertBudget(userId, input)
        await loadAll()
      },
      deleteBudget: async (id) => {
        if (!userId) return
        await repo.deleteBudget(userId, id)
        await loadAll()
      },

      addRecurring: async (input) => {
        if (!userId) return
        await repo.addRecurring(userId, input)
        await generateDueRecurring()
        await loadAll()
      },
      updateRecurring: async (id, changes) => {
        if (!userId) return
        await repo.updateRecurring(userId, id, changes)
        await loadAll()
      },
      deleteRecurring: async (id) => {
        if (!userId) return
        await repo.deleteRecurring(userId, id)
        await loadAll()
      },

      addAccount: async (input) => {
        if (!userId) return
        await repo.addAccount(userId, input)
        await loadAll()
      },
      updateAccount: async (id, changes) => {
        if (!userId) return
        await repo.updateAccount(userId, id, changes)
        await loadAll()
      },
      deleteAccount: async (id) => {
        if (!userId) return
        await repo.deleteAccount(userId, id)
        await loadAll()
      },

      addIncomeSource: async (input) => {
        if (!userId) return
        await repo.addIncomeSource(userId, input)
        await loadAll()
      },
      updateIncomeSource: async (id, changes) => {
        if (!userId) return
        await repo.updateIncomeSource(userId, id, changes)
        await loadAll()
      },
      deleteIncomeSource: async (id) => {
        if (!userId) return
        await repo.deleteIncomeSource(userId, id)
        await loadAll()
      },

      addTransfer: async (input) => {
        if (!userId) return
        await repo.addTransfer(userId, input)
        await loadAll()
      },
      deleteTransfer: async (id) => {
        if (!userId) return
        await repo.deleteTransfer(userId, id)
        await loadAll()
      },

      addLoan: async (input) => {
        if (!userId) return
        await repo.addLoan(userId, input)
        await loadAll()
      },
      updateLoan: async (id, changes) => {
        if (!userId) return
        await repo.updateLoan(userId, id, changes)
        await loadAll()
      },
      deleteLoan: async (id) => {
        if (!userId) return
        await repo.deleteLoan(userId, id)
        await loadAll()
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
